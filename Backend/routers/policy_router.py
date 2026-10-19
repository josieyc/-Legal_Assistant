"""公司內規查詢 API 路由。"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from Backend.controllers.firm_policy_query_controller import (
    find_firm_policy,
    get_policy_health,
    list_firm_policies,
)
from Backend.database.connect import get_db_session

app = APIRouter(tags=["policy"])


@app.get("/health")
def get_health(
    db_session: Session = Depends(get_db_session),
) -> list[dict[str, object]]:
    """取得每個內規章節受影響條文占全部條文的健康度。

    輸入契約：
        db_session 必須由 FastAPI dependency 提供，且為可查詢的 SQLAlchemy Session。
    函式效果：
        將請求轉交 controller，依內規與章節計算去重後的受影響條文占比；
        不修改資料庫。
    輸出結果：
        回傳章節健康度陣列，其中 health 為 100 減去受影響條文占比；
        沒有任何內規條文時回傳空陣列。
    """
    return get_policy_health(db_session)


@app.get("/firm-policies")
def get_firm_policies(
    db_session: Session = Depends(get_db_session),
) -> list[dict[str, object]]:
    """取得全部公司內規及條文，不查詢或回傳向量資料。

    輸入契約：
        db_session 必須由 FastAPI dependency 提供，且為可查詢的 SQLAlchemy Session。
    函式效果：
        將請求轉交 controller 查詢全部公司內規；不修改資料庫。
    輸出結果：
        回傳不含 embedding 的公司內規列表；沒有資料時回傳空列表。
    """
    return list_firm_policies(db_session)


@app.get("/firm-policies/{policy_id}")
def get_firm_policy(
    policy_id: int,
    db_session: Session = Depends(get_db_session),
) -> dict[str, object]:
    """依 ID 取得單一公司內規及條文，不查詢或回傳向量資料。

    輸入契約：
        policy_id 必須是路徑提供的整數公司內規主鍵；db_session 必須由 FastAPI
        dependency 提供，且為可查詢的 SQLAlchemy Session。
    函式效果：
        將請求轉交 controller 查詢指定公司內規；不修改資料庫。
    輸出結果：
        找到時回傳不含 embedding 的公司內規；找不到時回傳 HTTP 404。
    """
    try:
        return find_firm_policy(db_session, policy_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
