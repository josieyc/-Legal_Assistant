"""測試公司內規查詢 API。"""

from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

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
    PolicyRiskEvent,
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
            policy.articles.append(
                FirmPolicyArticle(
                    chapter="第一章　總則",
                    article=1,
                    context="第一條內容",
                    embedding=b"secret-vector",
                )
            )
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
        self.assertEqual("第一條內容", payload[0]["articles"][0]["context"])
        self.assertNotIn("embedding", payload[0]["articles"][0])
        self.assertNotIn("secret-vector", response.text)

    def test_get_policy_returns_404_when_missing(self) -> None:
        response = self.client.get("/policy/firm-policies/999")

        self.assertEqual(404, response.status_code)
        self.assertEqual("找不到公司內規", response.json()["detail"])

    def test_get_policy_by_id_omits_embedding(self) -> None:
        response = self.client.get(f"/policy/firm-policies/{self.policy_id}")

        self.assertEqual(200, response.status_code)
        self.assertEqual(self.policy_id, response.json()["policy_id"])
        self.assertNotIn("embedding", response.json()["articles"][0])

    def test_health_returns_each_chapter_and_deduplicates_affected_articles(self) -> None:
        with Session(self.engine) as session:
            policy = session.get(FirmPolicy, self.policy_id)
            policy.articles.extend(
                [
                    FirmPolicyArticle(
                        chapter="第一章　總則",
                        article=2,
                        context="第一章未受影響條文",
                    ),
                    FirmPolicyArticle(
                        chapter="第二章　作業規範",
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
                select(FirmPolicyArticle.policy_article_id).where(
                    FirmPolicyArticle.policy_id == self.policy_id
                )
            )
            session.add_all(
                [
                    PolicyRiskEvent(
                        act_change_event_id=change_event.act_change_event_id,
                        policy_id=self.policy_id,
                        policy_article_id=affected_article_id,
                        state="待處理",
                    ),
                    PolicyRiskEvent(
                        act_change_event_id=change_event.act_change_event_id,
                        policy_id=self.policy_id,
                        policy_article_id=affected_article_id,
                        state="處理中",
                    ),
                ]
            )
            session.commit()

        response = self.client.get("/policy/health")

        self.assertEqual(200, response.status_code)
        self.assertEqual(2, len(response.json()))
        self.assertEqual(
            {
                "policy_id": self.policy_id,
                "policy_name": "測試內規",
                "chapter": "第一章　總則",
                "affected_article_count": 1,
                "total_article_count": 2,
                "health": 50.0,
            },
            response.json()[0],
        )
        self.assertEqual(100.0, response.json()[1]["health"])
        self.assertNotIn("one_minus_health", response.json()[1])

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
