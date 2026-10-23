"""測試公司內規查詢 API。"""

from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from Backend.database.connect import get_db_session
from Backend.models import (
    Act,
    ActChangeEvent,
    Base,
    FirmPolicy,
    FirmPolicyArticle,
    FirmPolicyVersion,
    PolicyRiskEvent,
    PolicyRiskEventLog,
    User,
)
from Backend.routers.policy_router import app as policy_router


class PolicyRouterTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary_directory = TemporaryDirectory()
        database_path = Path(self.temporary_directory.name) / "policy.db"
        self.engine = create_engine(
            f"sqlite:///{database_path.as_posix()}",
            connect_args={"check_same_thread": False},
        )
        Base.metadata.create_all(self.engine)
        with Session(self.engine) as session:
            policy = FirmPolicy(policy_name="測試內規", description="測試說明")
            version = FirmPolicyVersion(version_no="1", status="Effective")
            version.articles.append(
                FirmPolicyArticle(
                    article_key="第一章　總則::第1條",
                    article=1,
                    context="第一條內容",
                    embedding=b"secret-vector",
                )
            )
            policy.versions.append(version)
            policy.current_version = version
            session.add(policy)
            session.commit()
            self.policy_id = policy.policy_id

        api = FastAPI()
        api.include_router(policy_router, prefix="/policy")

        def override_db_session():
            with Session(self.engine) as session:
                yield session

        api.dependency_overrides[get_db_session] = override_db_session
        self.client = TestClient(api)

    def tearDown(self) -> None:
        self.engine.dispose()
        self.temporary_directory.cleanup()

    def test_list_policies_omits_embedding(self) -> None:
        response = self.client.get("/policy/firm-policies")

        self.assertEqual(200, response.status_code)
        payload = response.json()
        self.assertEqual("測試內規", payload[0]["policy_name"])
        current_version = payload[0]["current_version"]
        self.assertEqual("1", current_version["version_no"])
        self.assertEqual("Effective", current_version["status"])
        self.assertEqual("第一條內容", current_version["articles"][0]["context"])
        self.assertNotIn("embedding", current_version["articles"][0])
        self.assertNotIn("secret-vector", response.text)

    def test_get_policy_risk_events_filters_by_required_state(self) -> None:
        """風險事件列表位於 policy 路由，並將必填狀態交給 controller。"""
        with patch(
            "Backend.routers.policy_router.list_policy_risk_events",
            return_value=[],
        ) as list_events:
            response = self.client.get("/policy/policy-risk-events?state=Pending")

        self.assertEqual(200, response.status_code)
        list_events.assert_called_once()
        self.assertEqual("Pending", list_events.call_args.kwargs["state"])

    @patch("Backend.routers.policy_router.read_policy_risk_events")
    def test_read_policy_risk_events_uses_get_policy_path(self, read_mock) -> None:
        """既有風險事件由 policy GET 路由讀取。"""
        read_mock.return_value = {"status": "created", "created_count": 1}

        response = self.client.get("/policy/policy_risk_event")

        self.assertEqual(200, response.status_code)
        self.assertEqual("created", response.json()["status"])
        read_mock.assert_called_once()

    def test_get_policy_risk_events_requires_valid_state(self) -> None:
        """缺少或使用不支援的狀態時回傳 422。"""
        missing = self.client.get("/policy/policy-risk-events")
        invalid = self.client.get("/policy/policy-risk-events?state=Unknown")

        self.assertEqual(422, missing.status_code)
        self.assertEqual(422, invalid.status_code)

    def test_get_policy_risk_event_by_id(self) -> None:
        """單筆風險事件查詢位於 policy 路由。"""
        expected = {"risk_event_id": 12, "state": "Pending"}
        with patch(
            "Backend.routers.policy_router.find_policy_risk_event",
            return_value=expected,
        ) as find_event:
            response = self.client.get("/policy/policy-risk-events/12")

        self.assertEqual(200, response.status_code)
        self.assertEqual(expected, response.json())
        self.assertEqual(12, find_event.call_args.args[1])

    def test_get_policy_risk_event_returns_404_when_missing(self) -> None:
        """查無單筆風險事件時回傳 404。"""
        with patch(
            "Backend.routers.policy_router.find_policy_risk_event",
            side_effect=LookupError("找不到政策風險事件"),
        ):
            response = self.client.get("/policy/policy-risk-events/999")

        self.assertEqual(404, response.status_code)
        self.assertEqual("找不到政策風險事件", response.json()["detail"])

    def test_policy_risk_event_review_draft_updates_and_logs(self) -> None:
        """草稿可部分更新、以 null 清除欄位，並記錄 actor 與變更內容。"""
        with Session(self.engine) as session:
            actor = User(user_name="審查者")
            change_event = ActChangeEvent(
                act=Act(act_name="測試法規"),
                change_type="修正",
                event_date="2026-10-20",
            )
            event = PolicyRiskEvent(
                act_change_event=change_event,
                state="Pending",
                topic="原主題",
                reason="待清除",
            )
            session.add_all([actor, event])
            session.commit()
            actor_id = actor.user_id
            event_id = event.risk_event_id

        response = self.client.patch(
            f"/policy/policy-risk-events/{event_id}/review-draft",
            json={"actor_id": actor_id, "topic": "修訂主題", "reason": None},
        )

        self.assertEqual(200, response.status_code)
        self.assertEqual("InReview", response.json()["event"]["state"])
        self.assertEqual("修訂主題", response.json()["event"]["topic"])
        self.assertIsNone(response.json()["event"]["reason"])
        with Session(self.engine) as session:
            log = session.scalar(select(PolicyRiskEventLog))
            self.assertEqual(actor_id, log.actor_id)
            self.assertEqual("Pending", log.from_state)
            self.assertEqual("InReview", log.to_state)
            self.assertIn('"reason": {"from": "待清除", "to": null}', log.changes)

    def test_policy_risk_event_review_draft_rejects_closed_event(self) -> None:
        with Session(self.engine) as session:
            actor = User(user_name="審查者")
            event = PolicyRiskEvent(
                act_change_event=ActChangeEvent(
                    act=Act(act_name="測試法規"),
                    change_type="修正",
                    event_date="2026-10-20",
                ),
                state="Closed",
            )
            session.add_all([actor, event])
            session.commit()
            actor_id = actor.user_id
            event_id = event.risk_event_id

        response = self.client.patch(
            f"/policy/policy-risk-events/{event_id}/review-draft",
            json={"actor_id": actor_id, "topic": "不可修改"},
        )

        self.assertEqual(409, response.status_code)

    def test_policy_risk_event_review_submission_completes_and_logs_corrections(self) -> None:
        """提交審核會套用修正、轉為 Reviewed 並寫入稽核紀錄。"""
        with Session(self.engine) as session:
            actor = User(user_name="審核者")
            event = PolicyRiskEvent(
                act_change_event=ActChangeEvent(
                    act=Act(act_name="測試法規"),
                    change_type="修正",
                    event_date="2026-10-20",
                ),
                state="InReview",
                topic="原主題",
                reason="原因",
            )
            session.add_all([actor, event])
            session.commit()
            actor_id = actor.user_id
            event_id = event.risk_event_id

        response = self.client.post(
            f"/policy/policy-risk-events/{event_id}/reviews",
            json={"actor_id": actor_id, "topic": "完成修正", "reason": None},
        )

        self.assertEqual(200, response.status_code)
        self.assertEqual("completed", response.json()["status"])
        self.assertEqual("Reviewed", response.json()["event"]["state"])
        self.assertEqual("完成修正", response.json()["event"]["topic"])
        with Session(self.engine) as session:
            log = session.scalar(
                select(PolicyRiskEventLog).where(
                    PolicyRiskEventLog.risk_event_id == event_id
                )
            )
            self.assertEqual("review_submitted", log.action)
            self.assertEqual(actor_id, log.actor_id)
            self.assertEqual("InReview", log.from_state)
            self.assertEqual("Reviewed", log.to_state)
            self.assertIn('"topic": {"from": "原主題", "to": "完成修正"}', log.changes)
            self.assertIn('"reason": {"from": "原因", "to": null}', log.changes)

    def test_policy_risk_event_review_submission_allows_no_corrections(self) -> None:
        """無欄位修正時仍可提交，並在 log 保留狀態變更。"""
        with Session(self.engine) as session:
            actor = User(user_name="審核者")
            event = PolicyRiskEvent(
                act_change_event=ActChangeEvent(
                    act=Act(act_name="測試法規"),
                    change_type="修正",
                    event_date="2026-10-20",
                ),
                state="Pending",
            )
            session.add_all([actor, event])
            session.commit()
            actor_id = actor.user_id
            event_id = event.risk_event_id

        response = self.client.post(
            f"/policy/policy-risk-events/{event_id}/reviews",
            json={"actor_id": actor_id},
        )

        self.assertEqual(200, response.status_code)
        self.assertEqual("Reviewed", response.json()["event"]["state"])
        self.assertIn(
            '"state": {"from": "Pending", "to": "Reviewed"}',
            response.json()["log"]["changes"],
        )

    def test_get_policy_returns_404_when_missing(self) -> None:
        response = self.client.get("/policy/firm-policies/999")

        self.assertEqual(404, response.status_code)
        self.assertEqual("找不到公司內規", response.json()["detail"])

    def test_get_policy_by_id_omits_embedding(self) -> None:
        response = self.client.get(f"/policy/firm-policies/{self.policy_id}")

        self.assertEqual(200, response.status_code)
        self.assertEqual(self.policy_id, response.json()["policy_id"])
        article = response.json()["current_version"]["articles"][0]
        self.assertEqual(response.json()["current_version_id"], article["policy_version_id"])
        self.assertNotIn("embedding", article)

    def test_get_policy_versions_returns_count_and_descriptions(self) -> None:
        with Session(self.engine) as session:
            policy = session.get(FirmPolicy, self.policy_id)
            policy.current_version.description = "目前版本說明"
            policy.versions.append(
                FirmPolicyVersion(
                    version_no="0.9",
                    description="歷史版本說明",
                    status="Superseded",
                    effective_at="2025-01-01",
                )
            )
            session.commit()

        response = self.client.get(
            f"/policy/firm-policies/{self.policy_id}/versions"
        )

        self.assertEqual(200, response.status_code)
        payload = response.json()
        self.assertEqual(self.policy_id, payload["policy_id"])
        self.assertEqual("測試內規", payload["policy_name"])
        self.assertEqual(2, payload["version_count"])
        self.assertEqual(
            ["歷史版本說明", "目前版本說明"],
            [version["description"] for version in payload["versions"]],
        )

    def test_get_policy_versions_returns_404_when_policy_is_missing(self) -> None:
        response = self.client.get("/policy/firm-policies/999/versions")

        self.assertEqual(404, response.status_code)
        self.assertEqual("找不到公司內規", response.json()["detail"])

    def test_health_returns_current_version_and_deduplicates_affected_articles(self) -> None:
        with Session(self.engine) as session:
            policy = session.get(FirmPolicy, self.policy_id)
            policy.current_version.articles.extend(
                [
                    FirmPolicyArticle(
                        article_key="第一章　總則::第2條",
                        article=2,
                        context="第一章未受影響條文",
                    ),
                    FirmPolicyArticle(
                        article_key="第二章　作業規範::第3條",
                        article=3,
                        context="第二章未受影響條文",
                    ),
                ]
            )
            act = Act(act_name="測試法規")
            change_event = ActChangeEvent(
                act=act,
                change_type="修正",
                event_date="2026-10-19",
            )
            session.add(change_event)
            session.flush()
            affected_article_id = session.scalar(
                select(FirmPolicyArticle.policy_article_id)
                .join(FirmPolicyVersion)
                .where(FirmPolicyVersion.policy_id == self.policy_id)
            )
            session.add_all(
                [
                    PolicyRiskEvent(
                        act_change_event_id=change_event.act_change_event_id,
                        policy_id=self.policy_id,
                        policy_article_id=affected_article_id,
                        state="Pending",
                    ),
                    PolicyRiskEvent(
                        act_change_event_id=change_event.act_change_event_id,
                        policy_id=self.policy_id,
                        policy_article_id=affected_article_id,
                        state="InReview",
                    ),
                ]
            )
            session.commit()
            current_policy_version_id = policy.current_version_id

        response = self.client.get("/policy/health")

        self.assertEqual(200, response.status_code)
        self.assertEqual(1, len(response.json()))
        self.assertEqual(
            {
                "policy_id": self.policy_id,
                "policy_name": "測試內規",
                "policy_version_id": current_policy_version_id,
                "version_no": "1",
                "affected_article_count": 1,
                "total_article_count": 3,
                "health": 66.67,
            },
            response.json()[0],
        )
        self.assertNotIn("chapter", response.json()[0])

    def test_health_is_zero_when_there_are_no_chapters(self) -> None:
        with Session(self.engine) as session:
            session.query(FirmPolicyArticle).delete()
            session.query(FirmPolicy).delete()
            session.commit()

        response = self.client.get("/policy/health")

        self.assertEqual(200, response.status_code)
        self.assertEqual([], response.json())


if __name__ == "__main__":
    unittest.main()
