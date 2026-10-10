"""法規與風險情報助手的 FastAPI 後端入口。"""

import os
from pathlib import Path
from typing import Any

import google.generativeai as genai
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


# 從與本程式同一個資料夾載入 .env，確保從不同工作目錄啟動也能正確讀取。
ENV_FILE = Path(__file__).resolve().with_name(".env")
load_dotenv(dotenv_path=ENV_FILE)

# 讀取 Gemini API Key，並在設定完成後交由 Google Generative AI SDK 使用。
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY and GEMINI_API_KEY != "your_api_key_here":
    genai.configure(api_key=GEMINI_API_KEY)
else:
    # 開發時若尚未設定有效金鑰，先提供清楚提示；呼叫分析 API 時會回傳服務錯誤。
    print("警告：尚未設定有效的 GEMINI_API_KEY，請在 Backend/.env 填入 Gemini API Key。")


# 建立 FastAPI 應用程式，並允許前端從任意來源跨網域呼叫。
app = FastAPI(
    title="法規與風險情報助手 API",
    description="接收情境文字並透過 Gemini 產生法規風險分析。",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 定義前端送入的情境資料格式；department 未提供時使用通用部門。
class ScenarioRequest(BaseModel):
    scenario: str
    department: str = "通用部門"


# 明確描述 AI 的顧問角色、分析項目與回覆原則，作為每次請求的系統提示。
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

# 使用目前仍可用的 Flash 模型；舊版 gemini-1.5-flash 已不適合作為現行 API 模型。
GEMINI_MODEL_NAME = "gemini-3.8-flash"


# 接收情境後組合部門資訊與系統提示，呼叫 Gemini 並以 JSON 回傳分析結果。
@app.post("/api/analyze-scenario")
async def analyze_legal_risk(request: ScenarioRequest) -> dict[str, Any]:
    if not GEMINI_API_KEY or GEMINI_API_KEY == "your_api_key_here":
        raise HTTPException(
            status_code=503,
            detail="Gemini API 尚未設定，請在 Backend/.env 設定有效的 GEMINI_API_KEY。",
        )

    full_prompt = (
        f"{SYSTEM_PROMPT}\n\n"
        f"部門：{request.department}\n"
        f"待分析情境：\n{request.scenario}"
    )

    try:
        # 使用指定的 Gemini 模型產生分析文字。
        model = genai.GenerativeModel(GEMINI_MODEL_NAME)
        response = await model.generate_content_async(full_prompt)
        ai_analysis = response.text

        if not ai_analysis:
            raise ValueError("Gemini API 未回傳可用的文字內容。")

        return {
            "status": "success",
            "department": request.department,
            "scenario_analyzed": request.scenario,
            "ai_analysis": ai_analysis,
        }
    except Exception as exc:
        # 將模型呼叫或回應解析錯誤轉為標準 HTTP 錯誤，方便前端處理。
        raise HTTPException(
            status_code=502,
            detail=f"Gemini 法規風險分析失敗：{exc}",
        ) from exc


# 提供簡單的健康檢查端點，確認 API 伺服器可正常回應。
@app.get("/")
async def health_check() -> dict[str, str]:
    return {"status": "success", "message": "法規與風險情報助手後端運作正常。"}
