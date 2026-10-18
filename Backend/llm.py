"""LLM 法規風險分析的請求模型、設定與 API 路由。"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel


router = APIRouter()


class ScenarioRequest(BaseModel):
    """前端送入的法規風險分析情境。"""

    scenario: str
    department: str = "通用部門"


SYSTEM_PROMPT = """
你是一位專精於台灣金融保險業與金管會裁罰規定的資深法遵顧問。
請依部門與情境提供初步法遵風險分析，並嚴格遵守以下格式與限制：
- 全文使用繁體中文，含標點不得超過250字；不寫開場白、廢話或免責聲明。
- 僅以條列式輸出以下四項分析及一句話總結，全部使用 bullet points。
- 觸犯法條：只列法規名稱、條號及核心違規點，不得貼法條全文；無法確認時標示「待確認」，不可捏造。
- 罰鍰預估：直接給最可能的金額區間，不解釋推估過程；資料不足時寫「無法估計」。
- 風險等級：直接列 Level 1 至 Level 4，並用一句話說明原因。
- 因應措施：只列1至3項最核心、可立即執行的具體行動；不得提供長篇或短中長期規劃。
- 最後以一個 bullet point 提供一句話總結。
""".strip()

GEMINI_MODEL_NAME = "gemini-3.8-flash"


@router.post("/api/analyze-scenario")
async def analyze_legal_risk(request: ScenarioRequest) -> dict[str, object]:
    """回報法規風險分析服務目前暫停。

    輸入契約：
        request 必須是通過 FastAPI 驗證的 ScenarioRequest；目前不會送往外部服務。
    函式效果：
        不呼叫 Gemini 或修改外部狀態。
    輸出結果：
        固定拋出 HTTPException（503），表示 Gemini 功能暫停使用。
    """
    raise HTTPException(
        status_code=503,
        detail="Gemini 法規風險分析功能暫停使用。",
    )
