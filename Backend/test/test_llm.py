"""測試 LLM 法規風險分析模組的對外契約。"""

import asyncio
import unittest

from fastapi import HTTPException
from fastapi.testclient import TestClient

from Backend.llm import ScenarioRequest, analyze_legal_risk
from Backend.main import app


class LlmModuleTests(unittest.TestCase):
    """驗證 LLM 邏輯拆分後仍保持原有 API 行為。"""

    def test_scenario_request_uses_default_department(self) -> None:
        """未提供部門時應使用通用部門。"""
        request = ScenarioRequest(scenario="測試情境")

        self.assertEqual("通用部門", request.department)

    def test_llm_route_is_included_in_main_app(self) -> None:
        """應將 LLM 分析路由掛載回主應用。"""
        response = TestClient(app).post(
            "/api/analyze-scenario",
            json={"scenario": "測試情境"},
        )

        self.assertEqual(503, response.status_code)

    def test_analyze_legal_risk_reports_suspended_service(self) -> None:
        """服務暫停期間應維持 503 回應契約。"""
        request = ScenarioRequest(scenario="測試情境")

        with self.assertRaises(HTTPException) as raised:
            asyncio.run(analyze_legal_risk(request))

        self.assertEqual(503, raised.exception.status_code)


if __name__ == "__main__":
    unittest.main()
