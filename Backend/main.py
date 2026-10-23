"""法規與風險情報助手的 FastAPI 後端入口。"""

import sys
from pathlib import Path
import uvicorn

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.testclient import TestClient

# 直接執行此檔案時，將專案根目錄加入模組搜尋路徑，讓 Backend 套件可被匯入。
if __package__ in {None, ""}:
    project_root = Path(__file__).resolve().parent.parent
    if str(project_root) not in sys.path:
        sys.path.insert(0, str(project_root))

from Backend.routers.act_router import app as legal_router
from Backend.routers.policy_router import app as policy_router
from Backend.routers.test_router import app as test_router
from Backend.llm import router as llm_router
from Backend.database.init_db import main as init_db
from Backend.utils.test_data_flow import run_test_data_flow


# 從與本程式同一個資料夾載入 .env，確保從不同工作目錄啟動也能正確讀取。
ENV_FILE = Path(__file__).resolve().with_name(".env")
load_dotenv(dotenv_path=ENV_FILE)

#  讀取 Gemini API Key，並在設定完成後交由 Google Generative AI SDK 使用。
# GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
# if GEMINI_API_KEY and GEMINI_API_KEY != "your_api_key_here":
#     genai.configure(api_key=GEMINI_API_KEY)
# else:
#     # 開發時若尚未設定有效金鑰，先提供清楚提示；呼叫分析 API 時會回傳服務錯誤。
#     print("警告：尚未設定有效的 GEMINI_API_KEY，請在 Backend/.env 填入 Gemini API Key。")



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
app.include_router(legal_router,prefix="/act")
app.include_router(policy_router, prefix="/policy")
app.include_router(llm_router)
app.include_router(test_router, prefix="/test")


# 提供簡單的健康檢查端點，確認 API 伺服器可正常回應。
@app.get("/")
async def health_check() -> dict[str, str]:
    return {"status": "success", "message": "法規與風險情報助手後端運作正常。"}

if __name__ == "__main__":
    initialization_status = init_db([])
    if initialization_status != 0:
        raise SystemExit(initialization_status)

    with TestClient(app) as test_client:
        run_test_data_flow(test_client, progress_callback=print)

    uvicorn.run(app, host="127.0.0.1", port=8000)
