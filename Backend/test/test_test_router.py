"""測試測試資料 API 路由。"""

from types import SimpleNamespace
import unittest
from unittest.mock import MagicMock, patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

from Backend.database.connect import get_db_session
from Backend.routers.test_router import app as test_router


class TestRouterTests(unittest.TestCase):
    """驗證三個測試資料路徑。"""

    def setUp(self) -> None:
        """建立使用替代資料庫 Session 的測試 client。

        輸入契約：
            不接受參數，由 unittest 在每個測試前呼叫。
        函式效果：
            建立掛載 test router 的 FastAPI 應用，並以 MagicMock 取代資料庫 Session。
        輸出結果：
            無回傳值。
        """
        self.db_session = MagicMock()
        api = FastAPI()
        api.include_router(test_router, prefix="/test")

        def override_db_session():
            """提供測試用的替代 Session。"""
            yield self.db_session

        api.dependency_overrides[get_db_session] = override_db_session
        self.client = TestClient(api)

    @patch("Backend.routers.test_router.trigger_act_change_events")
    def test_act_change_event_uses_test_path(self, trigger_mock) -> None:
        """法規異動端點應位於 /test 並委派 controller。"""
        trigger_mock.return_value = {"status": "ok"}

        response = self.client.get("/test/act_change_event")

        self.assertEqual(200, response.status_code)
        self.assertEqual({"status": "ok"}, response.json())
        trigger_mock.assert_called_once_with(self.db_session)

    @patch("Backend.routers.test_router.stage_firm_policy_import")
    @patch("Backend.routers.test_router.parse_firm_policy_xml")
    def test_firm_policy_import_uses_test_path(
        self,
        parse_mock,
        stage_mock,
    ) -> None:
        """公司內規端點應位於 /test 並匯入上傳的 XML。"""
        parsed_policy = SimpleNamespace(name="測試內規", articles=(object(),))
        parse_mock.return_value = parsed_policy

        response = self.client.post(
            "/test/firm-policy/import",
            files={"xml_file": ("policy.xml", b"<LAWS />", "application/xml")},
        )

        self.assertEqual(200, response.status_code)
        self.assertEqual(1, response.json()["article_count"])
        parse_mock.assert_called_once_with(b"<LAWS />")
        stage_mock.assert_called_once_with(self.db_session, parsed_policy)

    @patch("Backend.routers.test_router.create_fixed_policy_risk_event")
    def test_policy_risk_event_uses_test_path(self, create_mock) -> None:
        """政策風險端點應位於 /test 並回傳 HTTP 201。"""
        create_mock.return_value = {"created": 3}

        response = self.client.post("/test/policy_risk_event")

        self.assertEqual(201, response.status_code)
        self.assertEqual({"created": 3}, response.json())
        create_mock.assert_called_once_with(self.db_session)

    @patch("Backend.routers.test_router.seed_firm_policy_version_history")
    def test_version_history_uses_test_path(self, seed_history_mock) -> None:
        """版本沿革端點應位於 /test 並回傳 HTTP 201。"""
        seed_history_mock.return_value = {
            "status": "created",
            "historical_version_no": "1.0",
            "current_version_no": "1.2",
        }

        response = self.client.post("/test/firm-policy/version-history")

        self.assertEqual(201, response.status_code)
        self.assertEqual("1.0", response.json()["historical_version_no"])
        self.assertEqual("1.2", response.json()["current_version_no"])
        seed_history_mock.assert_called_once_with(self.db_session)


if __name__ == "__main__":
    unittest.main()
