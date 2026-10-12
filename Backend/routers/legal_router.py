"""法規相關 API 路由。"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from Backend.controllers.act_change_controller import trigger_act_change_events
from Backend.database.connect import get_db_session

app = APIRouter(tags=["legal"])


@app.get("/act_change_event")
def act_change_event(db_session: Session = Depends(get_db_session)) -> dict[str, object]:
    """觸發測試法規資料的異動比對。

    輸入契約：
        db_session 必須是 FastAPI dependency 提供且可寫入的 SQLAlchemy Session。
    函式效果：
        將請求轉交 controller，比對測試 XML 並保存尚未存在的法規異動事件。
    輸出結果：
        回傳包含比對狀態、差異筆數及新增資料筆數的字典；解析或資料庫錯誤向外傳遞。
    """
    return trigger_act_change_events(db_session)

