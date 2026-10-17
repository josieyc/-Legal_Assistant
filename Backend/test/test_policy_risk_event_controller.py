"""測試固定政策風險事件新增流程。"""

from __future__ import annotations

import unittest

from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session

from Backend.controllers.policy_risk_event_controller import (
    FIXED_RISK_EVENT_SEEDS,
    create_fixed_policy_risk_event,
    list_policy_risk_events,
)
from Backend.models import (
    Act,
    ActChangeEvent,
    ActIndustry,
    Base,
    Department,
    FirmPolicy,
    FirmPolicyArticle,
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
        acts: dict[str, Act] = {}
        for seed in FIXED_RISK_EVENT_SEEDS:
            if seed.act_name not in acts:
                acts[seed.act_name] = Act(act_name=seed.act_name)
            acts[seed.act_name].change_events.append(ActChangeEvent(
                article=seed.act_article, change_type=seed.change_type,
                last_version_id="20260601", new_version_id="20261012", event_date="2026-10-12",
            ))
        policy = FirmPolicy(policy_name="金融業務法令遵循作業規則")
        for number in sorted({seed.policy_article for seed in FIXED_RISK_EVENT_SEEDS}):
            policy.articles.append(FirmPolicyArticle(article=number, context=f"測試內規第 {number} 條"))
        departments = [Department(department_name=name) for name in sorted(
            {seed.department_name for seed in FIXED_RISK_EVENT_SEEDS}
        )]
        session.add_all([*acts.values(), policy, *departments])
        session.commit()

    def test_each_call_inserts_complete_pending_event_batch(self) -> None:
        """每次觸發都新增涵蓋三類法規的完整 Pending 事件批次。"""
        with Session(self.engine) as session:
            self._stage_prerequisites(session)
            first = create_fixed_policy_risk_event(session)
            second = create_fixed_policy_risk_event(session)
            events = session.scalars(select(PolicyRiskEvent)).all()

        batch_size = len(FIXED_RISK_EVENT_SEEDS)
        self.assertEqual(batch_size, first["created_count"])
        self.assertEqual(batch_size, second["created_count"])
        self.assertEqual(batch_size * 2, len(events))
        self.assertTrue(all(event.state == "Pending" for event in events))
        self.assertEqual({seed.topic for seed in FIXED_RISK_EVENT_SEEDS}, {event.topic for event in events})
        self.assertTrue(all(event.policy_id is not None and event.department_id is not None for event in events))
        deposit_act_department_names = {
            seed.department_name
            for seed in FIXED_RISK_EVENT_SEEDS
            if seed.act_name == "存款帳戶及其疑似不法或顯屬異常交易管理辦法"
        }
        self.assertEqual(
            {"銀行業務部", "法令遵循部", "風險管理部"},
            deposit_act_department_names,
        )

    def test_fixed_seed_risk_factors_use_numeric_scores(self) -> None:
        """義務強度與期限使用風險評分表的數字分數。"""
        self.assertEqual({2, 3}, {seed.obligation_intensity for seed in FIXED_RISK_EVENT_SEEDS})
        self.assertEqual({3}, {seed.deadline for seed in FIXED_RISK_EVENT_SEEDS})
        self.assertTrue(all(
            isinstance(seed.obligation_intensity, int) and isinstance(seed.deadline, int)
            for seed in FIXED_RISK_EVENT_SEEDS
        ))

    def test_missing_later_prerequisite_rolls_back_whole_batch(self) -> None:
        """批次中任一前置資料缺失時不寫入任何事件。"""
        with Session(self.engine) as session:
            self._stage_prerequisites(session)
            department = session.scalar(select(Department).where(Department.department_name == "財務部"))
            session.delete(department)
            session.commit()
            with self.assertRaisesRegex(LookupError, "財務部"):
                create_fixed_policy_risk_event(session)
            count = session.scalar(select(func.count()).select_from(PolicyRiskEvent))
        self.assertEqual(0, count)

    def test_list_policy_risk_events_returns_requested_joined_fields(self) -> None:
        """列表查詢回傳指定欄位、展開產業，並計算四構面風險總分。"""
        expected_act_name = "發行人募集與發行有價證券處理準則"
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
                    ActChangeEvent.article == 5,
                )
            )
            change.penalty = "2"
            industry = Industry(industry_name="證券業")
            session.add(industry)
            session.flush()
            session.add(ActIndustry(act_id=act.act_id, industry_id=industry.industry_id))
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
        self.assertEqual("證券業", securities_event["industry"])
        self.assertEqual("財務部", securities_event["affected_department"])
        self.assertEqual("2026-10-12", securities_event["event_date"])
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
        self.assertIsNone(results[0]["industry"])
        self.assertIsNone(results[0]["affected_department"])


if __name__ == "__main__":
    unittest.main()
