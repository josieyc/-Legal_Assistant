"""測試資料 API 路由。"""

import xml.etree.ElementTree as ElementTree

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from Backend.controllers.act_change_controller import trigger_act_change_events
from Backend.controllers.firm_policy_import_controller import (
    parse_firm_policy_xml,
    stage_firm_policy_import,
)
from Backend.controllers.firm_policy_version_test_controller import (
    seed_firm_policy_version_history,
)
from Backend.controllers.policy_risk_event_controller import (
    create_fixed_policy_risk_event,
)
from Backend.database.connect import get_db_session


app = APIRouter(tags=["test"])
MAX_XML_SIZE_BYTES = 10 * 1024 * 1024


@app.get("/act_change_event")
def act_change_event(
    db_session: Session = Depends(get_db_session),
) -> dict[str, object]:
    """觸發測試法規資料的異動比對。

    輸入契約：
        db_session 必須是 FastAPI dependency 提供且可寫入的 SQLAlchemy Session。
    函式效果：
        將請求轉交 controller，比對測試 XML 並儲存尚未存在的法規異動事件。
    輸出結果：
        回傳包含比對狀態、差異筆數及新增資料筆數的字典。
    """
    return trigger_act_change_events(db_session)


@app.post("/firm-policy/import")
async def import_firm_policy(
    xml_file: UploadFile = File(...),
    db_session: Session = Depends(get_db_session),
) -> dict[str, object]:
    """接收測試公司內規 XML 並寫入資料庫。

    輸入契約：
        xml_file 必須是 multipart/form-data 的非空 .xml 檔案，大小不得超過
        10 MiB；db_session 必須由 FastAPI dependency 提供。
    函式效果：
        解析上傳檔案，並將公司內規、版本及條文寫入資料庫。
    輸出結果：
        成功時回傳匯入狀態與條文數；檔案類型、大小或 XML 內容不合法時
        拋出 HTTPException 400 或 413。
    """
    filename = xml_file.filename or ""
    if not filename.lower().endswith(".xml"):
        raise HTTPException(status_code=400, detail="僅接受 .xml 檔案")

    xml_content = await xml_file.read(MAX_XML_SIZE_BYTES + 1)
    if len(xml_content) > MAX_XML_SIZE_BYTES:
        raise HTTPException(status_code=413, detail="XML 檔案不得超過 10 MiB")

    try:
        parsed_policy = parse_firm_policy_xml(xml_content)
    except (ElementTree.ParseError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    stage_firm_policy_import(db_session, parsed_policy)
    return {
        "status": "imported",
        "policy_name": parsed_policy.name,
        "article_count": len(parsed_policy.articles),
        "committed": True,
    }


@app.post("/policy_risk_event", status_code=201)
def policy_risk_event(
    db_session: Session = Depends(get_db_session),
) -> dict[str, object]:
    """新增固定的測試政策風險事件。

    輸入契約：
        db_session 必須由 FastAPI dependency 提供且可寫入，並已建立法規異動與
        公司內規測試資料。
    函式效果：
        新增一批 state 為 Pending 的固定政策風險事件並提交。
    輸出結果：
        成功時回傳 HTTP 201 與新增結果；缺少必要測試資料時拋出
        HTTPException 409。
    """
    try:
        return create_fixed_policy_risk_event(db_session)
    except LookupError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@app.post("/firm-policy/version-history", status_code=201)
def create_firm_policy_version_history(
    db_session: Session = Depends(get_db_session),
) -> dict[str, object]:
    """建立公司內規 1.0 至 1.2 的測試版本沿革。

    輸入契約：
        db_session 必須由 FastAPI dependency 提供；資料庫必須先透過
        /test/firm-policy/import 匯入公司內規。
    函式效果：
        委派 controller 將最新內規的目前版本設為 1.2，並建立 1.0
        版本、歷史條文及新增條文的修改紀錄。
    輸出結果：
        成功時回傳 HTTP 201 與版本摘要；缺少前置內規資料時拋出
        HTTPException 409。
    """
    try:
        return seed_firm_policy_version_history(db_session)
    except LookupError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
