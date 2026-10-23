"""測試公司內規版本沿革假資料建立流程。"""

import unittest

from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session

from Backend.controllers.firm_policy_version_test_controller import (
    seed_firm_policy_version_history,
)
from Backend.models import Base
from Backend.models.firm_policy import (
    FirmPolicy,
    FirmPolicyArticle,
    FirmPolicyChangeRecord,
    FirmPolicyVersion,
)


class FirmPolicyVersionTestControllerTests(unittest.TestCase):
    """驗證 1.0 至 1.2 測試版本沿革。"""

    def setUp(self) -> None:
        """建立含三十一條目前版本的記憶體資料庫。

        輸入契約：
            不接受參數，由 unittest 在每個測試前呼叫。
        函式效果：
            建立 SQLite 記憶體資料庫，並寫入一筆版本號為 1 的內規及
            三十一條條文。
        輸出結果：
            無回傳值。
        """
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(self.engine)
        with Session(self.engine) as session:
            policy = FirmPolicy(policy_name="測試內規")
            current_version = FirmPolicyVersion(version_no="1", status="Effective")
            current_version.articles.extend(
                FirmPolicyArticle(
                    article=article_number,
                    article_key=f"第{article_number}條",
                    context=f"第{article_number}條新版內容",
                    embedding=b"vector",
                )
                for article_number in range(1, 32)
            )
            policy.versions.append(current_version)
            policy.current_version = current_version
            session.add(policy)
            session.commit()

    def tearDown(self) -> None:
        """釋放測試資料庫。

        輸入契約：
            不接受參數，由 unittest 在每個測試後呼叫。
        函式效果：
            關閉 engine 及其連線資源。
        輸出結果：
            無回傳值。
        """
        self.engine.dispose()

    def test_creates_historical_version_articles_and_change_records(self) -> None:
        """應建立 1.0 舊版並將現行版設為 1.2。"""
        with Session(self.engine) as session:
            result = seed_firm_policy_version_history(session)

        with Session(self.engine) as session:
            policy = session.scalar(select(FirmPolicy))
            versions = session.scalars(
                select(FirmPolicyVersion).order_by(FirmPolicyVersion.version_no)
            ).all()
            historical_version = versions[0]
            change_count = session.scalar(
                select(func.count()).select_from(FirmPolicyChangeRecord)
            )

            self.assertEqual("created", result["status"])
            self.assertEqual(["1.0", "1.2"], [version.version_no for version in versions])
            self.assertEqual(20, len(historical_version.articles))
            self.assertEqual("Superseded", historical_version.status)
            self.assertEqual("1.2", policy.current_version.version_no)
            self.assertEqual(
                historical_version.policy_version_id,
                policy.current_version.based_on_version_id,
            )
            self.assertEqual(11, change_count)

    def test_repeated_call_does_not_duplicate_history(self) -> None:
        """重複呼叫時不應新增第二組舊版與修改紀錄。"""
        with Session(self.engine) as session:
            seed_firm_policy_version_history(session)
            result = seed_firm_policy_version_history(session)

        with Session(self.engine) as session:
            version_count = session.scalar(
                select(func.count()).select_from(FirmPolicyVersion)
            )
            change_count = session.scalar(
                select(func.count()).select_from(FirmPolicyChangeRecord)
            )
            self.assertEqual("already_exists", result["status"])
            self.assertEqual(2, version_count)
            self.assertEqual(11, change_count)


if __name__ == "__main__":
    unittest.main()
