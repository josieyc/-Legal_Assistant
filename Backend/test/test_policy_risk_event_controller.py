"""測試固定政策風險事件新增流程。"""

from __future__ import annotations

from pathlib import Path
import tempfile
import unittest

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from Backend.controllers.policy_risk_event_controller import (
    create_fixed_policy_risk_event,
    find_policy_risk_event,
    list_policy_risk_events,
    load_policy_risk_event_seeds,
    read_policy_risk_events,
)
from Backend.models import (
    Act,
    ActChangeEvent,
    ActVersion,
    ActIndustry,
    Base,
    Department,
    FirmPolicy,
    FirmPolicyArticle,
    FirmPolicyVersion,
    Industry,
    PolicyRiskEvent,
)


class PolicyRiskEventControllerTests(unittest.TestCase):
    """驗證固定風險資料內容、外鍵關聯及整批交易。"""

    def setUp(self) -> None:
        """建立每個測試獨立使用的記憶體資料庫。"""
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(self.engine)

    def tearDown(self) -> None:
        """釋放測試資料庫資源。"""
        self.engine.dispose()

    @staticmethod
    def _stage_prerequisites(session: Session) -> None:
        """建立全部固定風險事件所需的最小前置資料。

        輸入契約：
            session 必須可寫入且已建立完整 ORM schema。
        函式效果：
            依固定定義加入法規異動、內規條文及部門後提交交易。
        輸出結果：
            成功時回傳 None；資料庫錯誤向外傳遞。
        """
        seeds = load_policy_risk_event_seeds()
        version_ids = {
            "金融機構防制洗錢作業準則": "20261012",
            "金融服務消費者保護作業規範": "20261011",
            "金融機構資訊安全管理要點": "20261010",
            "授信業務風險管理作業指引": "20261009",
            "金融機構個人資料保護規範": "20261008",
            "電子支付機構業務管理規則": "20261007",
            "金融機構客戶資料揭露指引": "20261005",
            "銀行業內部控制及稽核制度實施辦法": "20261003",
            "金融機構委外作業及監督辦法": "20261001",
        }
        acts: dict[str, Act] = {}
        versions: dict[str, ActVersion] = {}
        for seed in seeds:
            version_id = version_ids[seed.act_name]
            if seed.act_name not in acts:
                acts[seed.act_name] = Act(act_name=seed.act_name)
                versions[version_id] = ActVersion(
                    version_id=version_id, source_xml="測試資料_後.xml"
                )
            acts[seed.act_name].change_events.append(ActChangeEvent(
                article=seed.act_article, change_type=seed.change_type,
                last_version_id="20250601", new_version_id=version_id,
                event_date=f"{version_id[:4]}-{version_id[4:6]}-{version_id[6:]}",
            ))
        policy = FirmPolicy(policy_name="金融業務法令遵循作業規則")
        policy_version = FirmPolicyVersion(version_no="1", status="Effective")
        for number in sorted({seed.policy_article for seed in seeds}):
            policy_version.articles.append(FirmPolicyArticle(
                article=number, article_key=f"第{number}條", context=f"測試內規第 {number} 條"
            ))
        policy.versions.append(policy_version)
        policy.current_version = policy_version
        departments = [Department(department_name=name) for name in sorted(
            {seed.department_name for seed in seeds}
        )]
        session.add_all([*acts.values(), *versions.values(), policy, *departments])
        session.commit()

    def test_each_call_inserts_complete_pending_event_batch(self) -> None:
        """每次觸發都新增涵蓋前端 demo 法規的完整 Pending 事件批次。"""
        seeds = load_policy_risk_event_seeds()
        with Session(self.engine) as session:
            self._stage_prerequisites(session)
            first = create_fixed_policy_risk_event(session)
            second = create_fixed_policy_risk_event(session)
            events = session.scalars(select(PolicyRiskEvent)).all()

        batch_size = len(seeds)
        self.assertEqual(batch_size, first["created_count"])
        self.assertEqual(batch_size, second["created_count"])
        self.assertEqual(batch_size * 2, len(events))
        self.assertTrue(all(event.state == "Pending" for event in events))
        self.assertEqual(
            {seed.confidence_level for seed in seeds},
            {event.confidence_level for event in events},
        )
        self.assertTrue(all(0 <= event.confidence_level <= 100 for event in events))
        self.assertEqual({seed.topic for seed in seeds}, {event.topic for event in events})
        self.assertTrue(all(event.policy_id is not None and event.department_id is not None for event in events))
        aml_article_mappings = {
            (seed.act_article, seed.policy_article, seed.department_name)
            for seed in seeds
            if seed.act_name == "金融機構防制洗錢作業準則"
        }
        self.assertEqual(
            {(8, 6, "營運部"), (12, 8, "資訊部"), (16, 18, "法遵部")},
            aml_article_mappings,
        )

    def test_read_returns_persisted_events_with_ids_without_new_inserts(self) -> None:
        """讀取會回傳既有事件及真實 ID，但不新增額外資料。"""
        with Session(self.engine) as session:
            self._stage_prerequisites(session)
            created = create_fixed_policy_risk_event(session)
            result = read_policy_risk_events(session)
            events = session.scalars(select(PolicyRiskEvent)).all()

        self.assertEqual("created", result["status"])
        self.assertEqual(created["created_count"], result["created_count"])
        self.assertEqual(result["created_count"], len(result["events"]))
        self.assertEqual(result["created_count"], len(events))
        self.assertTrue(all(event["risk_event_id"] is not None for event in result["events"]))
        self.assertTrue(all(event["state"] == "Pending" for event in result["events"]))

    def test_seed_data_covers_frontend_demo_and_legal_data_changes(self) -> None:
        """固定資料須涵蓋 demo 九項法規及 XML 中全部實質異動條文。

        輸入契約：
            使用預設 JSON 測試資料路徑，檔案須可讀取。
        函式效果：
            載入固定測試資料並比對法規條文與權責部門；不修改外部狀態。
        輸出結果：
            驗證 12 個異動條文及前端六個部門均完整涵蓋，否則測試失敗。
        """
        seeds = load_policy_risk_event_seeds()
        expected_changes = {
            ("金融機構防制洗錢作業準則", 8),
            ("金融機構防制洗錢作業準則", 12),
            ("金融機構防制洗錢作業準則", 16),
            ("金融服務消費者保護作業規範", 7),
            ("金融機構資訊安全管理要點", 21),
            ("授信業務風險管理作業指引", 5),
            ("金融機構個人資料保護規範", 14),
            ("電子支付機構業務管理規則", 30),
            ("電子支付機構業務管理規則", 31),
            ("金融機構客戶資料揭露指引", 3),
            ("銀行業內部控制及稽核制度實施辦法", 11),
            ("金融機構委外作業及監督辦法", 16),
        }

        self.assertEqual(expected_changes, {(seed.act_name, seed.act_article) for seed in seeds})
        self.assertEqual(
            {"營運部", "法遵部", "資訊部", "風控部", "客服部", "授信部"},
            {seed.department_name for seed in seeds},
        )

    def test_fixed_seed_risk_factors_use_numeric_scores(self) -> None:
        """義務強度與期限使用風險評分表的數字分數。"""
        seeds = load_policy_risk_event_seeds()
        self.assertEqual({2, 3}, {seed.obligation_intensity for seed in seeds})
        self.assertEqual({2, 3}, {seed.deadline for seed in seeds})
        self.assertTrue(all(
            isinstance(seed.obligation_intensity, int) and isinstance(seed.deadline, int)
            for seed in seeds
        ))
        self.assertTrue(all(
            isinstance(seed.confidence_level, int) and 0 <= seed.confidence_level <= 100
            for seed in seeds
        ))

    def test_seed_loader_rejects_non_array_json(self) -> None:
        """測試資料最外層不是 JSON 陣列時拒絕載入。"""
        with tempfile.TemporaryDirectory() as temporary_directory:
            data_path = Path(temporary_directory) / "invalid.json"
            data_path.write_text('{"topic": "錯誤格式"}', encoding="utf-8")
            with self.assertRaisesRegex(TypeError, "JSON 陣列"):
                load_policy_risk_event_seeds(data_path)

    def test_missing_department_rolls_back_whole_batch(self) -> None:
        """SQL 部門主檔缺少必要部門時不寫入任何事件。"""
        with Session(self.engine) as session:
            self._stage_prerequisites(session)
            department = session.scalar(
                select(Department).where(Department.department_name == "授信部")
            )
            session.delete(department)
            session.commit()
            with self.assertRaisesRegex(LookupError, "授信部"):
                create_fixed_policy_risk_event(session)
            events = session.scalars(select(PolicyRiskEvent)).all()
        self.assertEqual([], events)

    def test_list_policy_risk_events_returns_requested_joined_fields(self) -> None:
        """列表查詢回傳指定欄位、彙整產業，並計算四構面風險總分。"""
        expected_act_name = "金融服務消費者保護作業規範"
        with Session(self.engine) as session:
            self._stage_prerequisites(session)
            create_fixed_policy_risk_event(session)
            act = session.scalar(
                select(Act).where(
                    Act.act_name == expected_act_name
                )
            )
            change = session.scalar(
                select(ActChangeEvent).where(
                    ActChangeEvent.act_id == act.act_id,
                    ActChangeEvent.article == 7,
                )
            )
            change.penalty = "2"
            industries = [Industry(industry_name="證券業"), Industry(industry_name="銀行業")]
            session.add_all(industries)
            session.flush()
            session.add_all(
                ActIndustry(act_id=act.act_id, industry_id=industry.industry_id)
                for industry in industries
            )
            session.commit()

            results = list_policy_risk_events(session)

        securities_event = next(
            event for event in results if event["act_name"] == expected_act_name
        )
        self.assertEqual(
            {
                "risk_event_id",
                "industry",
                "act_name",
                "topic",
                "risk",
                "affected_department",
                "event_date",
                "status",
            },
            set(securities_event),
        )
        self.assertIsInstance(securities_event["risk_event_id"], int)
        self.assertEqual(["證券業", "銀行業"], securities_event["industry"])
        self.assertEqual(
            1,
            sum(event["act_name"] == expected_act_name for event in results),
        )
        self.assertEqual("客服部", securities_event["affected_department"])
        self.assertEqual("2026-10-11", securities_event["event_date"])
        self.assertEqual("Pending", securities_event["status"])
        # 義務強度 3 + 罰則 2 + 期限 3 + 單一部門影響範圍 1。
        self.assertEqual(9, securities_event["risk"])
        self.assertIsInstance(securities_event["risk"], int)

    def test_risk_impact_scope_uses_events_for_the_same_provision(self) -> None:
        """同一指定條文的事件數依 1、2～3、4 筆以上分別計為 1、2、3 分。"""
        with Session(self.engine) as session:
            act = Act(act_name="測試法規")
            event_counts = {1: 1, 2: 2, 4: 4}
            expected_scores = {1: 5, 2: 6, 4: 7}
            for article, event_count in event_counts.items():
                change = ActChangeEvent(
                    article=article,
                    penalty="1",
                    change_type="修正",
                    event_date="2026-10-17",
                )
                act.change_events.append(change)
                for event_number in range(event_count):
                    change.risk_events.append(PolicyRiskEvent(
                        obligation_intensity="2",
                        deadline="1",
                        topic=f"第 {article} 條事件 {event_number + 1}",
                        state="Pending",
                    ))
            session.add(act)
            session.commit()

            results = list_policy_risk_events(session)

        scores_by_article = {
            int(event["topic"].split()[1]): event["risk"] for event in results
        }
        self.assertEqual(expected_scores, scores_by_article)

    def test_risk_normalizes_legacy_text_and_date_values(self) -> None:
        """舊式等級及日期不會被直接轉成年份加入風險分數。"""
        with Session(self.engine) as session:
            act = Act(act_name="舊資料測試法規")
            change = ActChangeEvent(
                article=1,
                penalty=None,
                change_type="修正",
                event_date="2026-10-12",
            )
            act.change_events.append(change)
            change.risk_events.append(PolicyRiskEvent(
                obligation_intensity="中",
                deadline="2026-11-12",
                topic="舊式資料",
                state="Pending",
            ))
            session.add(act)
            session.commit()

            result = list_policy_risk_events(session)[0]

        # 義務 2 + 無罰則 1 + 三個月內 3 + 單一部門 1。
        self.assertEqual(7, result["risk"])

    def test_list_policy_risk_events_keeps_event_without_optional_links(self) -> None:
        """風險事件缺少產業或部門關聯時仍會保留於列表。"""
        with Session(self.engine) as session:
            act = Act(act_name="測試法規")
            change = ActChangeEvent(
                article=1,
                change_type="修正",
                event_date="2026-10-17",
            )
            act.change_events.append(change)
            change.risk_events.append(
                PolicyRiskEvent(topic="測試主題", reason="測試風險", state="Pending")
            )
            session.add(act)
            session.commit()

            results = list_policy_risk_events(session)

        self.assertEqual(1, len(results))
        self.assertEqual([], results[0]["industry"])
        self.assertIsNone(results[0]["affected_department"])

    def test_list_policy_risk_events_filters_by_state(self) -> None:
        """指定 state 時只回傳完全符合該狀態的風險事件。"""
        with Session(self.engine) as session:
            act = Act(act_name="狀態篩選測試法規")
            change = ActChangeEvent(
                article=1,
                change_type="修正",
                event_date="2026-10-20",
            )
            act.change_events.append(change)
            change.risk_events.extend(
                [
                    PolicyRiskEvent(topic="待處理", state="Pending"),
                    PolicyRiskEvent(topic="審查中", state="InReview"),
                ]
            )
            session.add(act)
            session.commit()

            results = list_policy_risk_events(session, state="InReview")

        self.assertEqual(["審查中"], [event["topic"] for event in results])
        self.assertEqual({"InReview"}, {event["status"] for event in results})

    def test_find_policy_risk_event_returns_all_columns(self) -> None:
        """依 ID 查詢會回傳事件的全部資料欄位。"""
        with Session(self.engine) as session:
            act = Act(act_name="單筆查詢測試法規")
            change = ActChangeEvent(
                article=1,
                change_type="修正",
                event_date="2026-10-20",
            )
            act.change_events.append(change)
            event = PolicyRiskEvent(topic="單筆事件", state="Reviewed")
            change.risk_events.append(event)
            session.add(act)
            session.commit()
            event_id = event.risk_event_id

            result = find_policy_risk_event(session, event_id)

        self.assertEqual(event_id, result["risk_event_id"])
        self.assertEqual("單筆事件", result["topic"])
        self.assertEqual("Reviewed", result["state"])
        self.assertEqual(
            {column.name for column in PolicyRiskEvent.__table__.columns},
            set(result),
        )

    def test_find_policy_risk_event_raises_when_missing(self) -> None:
        """不存在的 ID 會明確回報找不到事件。"""
        with Session(self.engine) as session:
            with self.assertRaisesRegex(LookupError, "找不到政策風險事件"):
                find_policy_risk_event(session, 999)

if __name__ == "__main__":
    unittest.main()
