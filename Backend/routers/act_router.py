"""法規相關 API 路由。"""

import xml.etree.ElementTree as ElementTree

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from Backend.controllers.act_change_controller import (
    compare_act_change_event_versions,
    trigger_act_change_events,
)
from Backend.controllers.firm_policy_import_controller import (
    parse_firm_policy_xml,
    stage_firm_policy_import,
)
from Backend.controllers.policy_risk_event_controller import (
    create_fixed_policy_risk_event,
    list_policy_risk_events,
)
from Backend.database.connect import get_db_session

app = APIRouter(tags=["legal"])
MAX_XML_SIZE_BYTES = 10 * 1024 * 1024


@app.get("/policy_risk_events")
def get_policy_risk_events(
    db_session: Session = Depends(get_db_session),
) -> list[dict[str, object]]:
    """取得法規政策風險事件列表。

    輸入契約：
        db_session 必須是 FastAPI dependency 提供且可查詢的 SQLAlchemy Session。
    函式效果：
        查詢風險事件編號、產業、法規名稱、主題、風險、受影響部門、發布日期及狀態；
        不修改資料庫。
    輸出結果：
        回傳風險事件列表；沒有資料時回傳空列表，資料庫錯誤則由 FastAPI 向外處理。
    """
    return list_policy_risk_events(db_session)


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


@app.get("/act_change_event/versions")
def get_act_change_event_versions() -> dict[str, object]:
    """取得測試法規資料的新舊版本比較結果。

    輸入契約：
        不接受請求參數；伺服器必須能讀取預設的「測試資料_前.xml」與
        「測試資料_後.xml」。
    函式效果：
        讀取兩份測試 XML 並比較沿革及條文；不新增或修改資料庫資料。
    輸出結果：
        回傳來源檔名、異動法規數、異動事件數及每筆事件的新舊版本內容；
        檔案或 XML 解析錯誤由 FastAPI 向外處理。
    """
    return compare_act_change_event_versions()


@app.post("/policy_risk_event", status_code=201)
def policy_risk_event(
    db_session: Session = Depends(get_db_session),
) -> dict[str, object]:
    """新增固定的測試政策風險事件。

    輸入契約：
        db_session 必須是 FastAPI dependency 提供且可寫入的 SQLAlchemy Session；
        資料庫應先完成法規異動測試資料建立及公司內規測試 XML 匯入。
    函式效果：
        新增一批 state 為 Pending 的固定 PolicyRiskEvent 並提交；每次呼叫皆新增完整一批。
    輸出結果：
        成功時回傳 HTTP 201、新增筆數與事件明細；缺少必要測試資料時拋出 HTTPException 409。
    """
    try:
        return create_fixed_policy_risk_event(db_session)
    except LookupError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@app.post("/firm-policy/import")
async def import_firm_policy(
    xml_file: UploadFile = File(...),
    db_session: Session = Depends(get_db_session),
) -> dict[str, object]:
    """接收公司內規 XML 並寫入資料庫。

    輸入契約：
        xml_file 必須是 multipart/form-data 的非空 .xml 檔案，大小不得超過 10 MiB，
        結構須與「測試資料_公司內規.xml」一致；db_session 由 dependency 提供。
    函式效果：
        讀取並解析上傳檔案，將 FirmPolicy 及其 FirmPolicyArticle 加入 Session；
        全部條文與 embedding 建立完成後提交交易並持久化資料。
    輸出結果：
        成功時回傳匯入狀態、內規名稱、條文數與 committed=true；副檔名、大小、
        XML 格式或內容不合法時拋出 HTTPException（400 或 413）。
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

