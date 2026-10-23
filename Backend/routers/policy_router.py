"""公司內規查詢 API 路由。"""

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from Backend.controllers.firm_policy_query_controller import (
    find_firm_policy,
    get_policy_health,
    list_firm_policy_versions,
    list_firm_policies,
)
from Backend.controllers.policy_risk_event_controller import (
    find_policy_risk_event,
    list_policy_risk_events,
    read_policy_risk_events,
    review_policy_risk_event_draft,
    submit_policy_risk_event_review,
)
from Backend.database.connect import get_db_session

app = APIRouter(tags=["policy"])
PolicyRiskEventState = Literal[
    "Pending",
    "InReview",
    "Reviewed",
    "ReanalysisRequired",
    "Closed",
]


@app.get("/policy_risk_event")
def get_policy_risk_event_records(
    db_session: Session = Depends(get_db_session),
) -> dict[str, object]:
    """讀取資料庫中既有的政策風險事件，不修改資料庫。"""
    return read_policy_risk_events(db_session)


class PolicyRiskEventReviewDraftRequest(BaseModel):
    """審查草稿的部分更新內容；明確傳入 null 可清除該欄位。"""

    model_config = ConfigDict(extra="forbid")

    actor_id: int
    department_id: int | None = None
    obligation_intensity: str | None = None
    deadline: str | None = None
    topic: str | None = None
    reason: str | None = None
    confidence_level: int | None = Field(default=None, ge=0, le=100)
    suggest_next_step: str | None = None
    suggest_due_date: str | None = None


class PolicyRiskEventReviewRequest(PolicyRiskEventReviewDraftRequest):
    """審核提交內容；除 actor_id 外的欄位均為選填修正。"""


class FirmPolicyArticleResponse(BaseModel):
    """公司內規版本條文的公開欄位。"""

    policy_article_id: int
    policy_version_id: int
    article: int | None
    paragraph: int | None
    subparagraph: int | None
    item: int | None
    article_key: str
    context: str


class FirmPolicyVersionResponse(BaseModel):
    """公司內規目前版本及其條文。"""

    policy_version_id: int
    policy_id: int
    version_no: str
    based_on_version_id: int | None
    description: str | None
    status: str
    effective_at: str | None
    articles: list[FirmPolicyArticleResponse]


class FirmPolicyResponse(BaseModel):
    """公司內規主檔與目前版本。"""

    policy_id: int
    policy_name: str
    description: str | None
    created_at: str
    current_version_id: int | None
    current_version: FirmPolicyVersionResponse | None


class PolicyHealthResponse(BaseModel):
    """公司內規目前版本的條文健康度。"""

    policy_id: int
    policy_name: str
    policy_version_id: int
    version_no: str
    affected_article_count: int
    total_article_count: int
    health: float


class FirmPolicyVersionSummaryResponse(BaseModel):
    """公司內規版本清單的單筆摘要。"""

    policy_version_id: int
    version_no: str
    based_on_version_id: int | None
    description: str | None
    status: str
    effective_at: str | None


class FirmPolicyVersionListResponse(BaseModel):
    """公司內規的版本總數與版本清單。"""

    policy_id: int
    policy_name: str
    version_count: int
    versions: list[FirmPolicyVersionSummaryResponse]


@app.get("/policy-risk-events")
def get_policy_risk_events_by_state(
    state: PolicyRiskEventState,
    db_session: Session = Depends(get_db_session),
) -> list[dict[str, object]]:
    """取得指定狀態的政策風險事件列表。

    輸入契約：
        state 為必填 query parameter，且必須是政策風險事件允許的狀態之一；
        db_session 由 FastAPI dependency 提供。
    函式效果：
        在資料庫查詢中依 state 篩選風險事件；不修改資料庫。
    輸出結果：
        回傳符合狀態的事件列表；沒有資料時回傳空列表，無效或缺少 state 時回傳 422。
    """
    return list_policy_risk_events(db_session, state=state)


@app.get("/policy-risk-events/{risk_event_id}")
def get_policy_risk_event(
    risk_event_id: int,
    db_session: Session = Depends(get_db_session),
) -> dict[str, object]:
    """依 ID 取得單一政策風險事件。

    輸入契約：
        risk_event_id 必須是路徑提供的整數政策風險事件主鍵；db_session 由
        FastAPI dependency 提供。
    函式效果：
        將請求轉交 controller 查詢指定事件；不修改資料庫。
    輸出結果：
        找到時回傳事件的全部非關聯欄位；找不到時回傳 HTTP 404。
    """
    try:
        return find_policy_risk_event(db_session, risk_event_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.patch("/policy-risk-events/{risk_event_id}/review-draft")
def patch_policy_risk_event_review_draft(
    risk_event_id: int,
    request: PolicyRiskEventReviewDraftRequest,
    db_session: Session = Depends(get_db_session),
) -> dict[str, object]:
    """部分更新可審查狀態的政策風險事件草稿，並保存操作紀錄。"""
    payload = request.model_dump(exclude_unset=True)
    actor_id = payload.pop("actor_id")
    try:
        return review_policy_risk_event_draft(
            db_session,
            risk_event_id,
            actor_id,
            payload,
        )
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@app.post("/policy-risk-events/{risk_event_id}/reviews")
def post_policy_risk_event_review(
    risk_event_id: int,
    request: PolicyRiskEventReviewRequest,
    db_session: Session = Depends(get_db_session),
) -> dict[str, object]:
    """提交政策風險事件審核，儲存修正後直接標記完成。

    輸入契約：
        risk_event_id 必須是路徑中的整數主鍵；request 必須提供
        actor_id，其餘審查欄位為選填修正；db_session 由 dependency 提供。
    函式效果：
        將請求交給 controller，在同一交易套用修正、將狀態設為
        Reviewed，並建立稽核 log。
    輸出結果：
        成功時回傳 completed 狀態、事件與 log；資源不存在時回傳
        HTTP 404，事件狀態不可提交時回傳 HTTP 409。
    """
    payload = request.model_dump(exclude_unset=True)
    actor_id = payload.pop("actor_id")
    try:
        return submit_policy_risk_event_review(
            db_session,
            risk_event_id,
            actor_id,
            payload,
        )
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@app.get("/health", response_model=list[PolicyHealthResponse])
def get_health(
    db_session: Session = Depends(get_db_session),
) -> list[dict[str, object]]:
    """取得每個內規目前版本受影響條文占全部條文的健康度。

    輸入契約：
        db_session 必須由 FastAPI dependency 提供，且為可查詢的 SQLAlchemy Session。
    函式效果：
        將請求轉交 controller，依內規目前版本計算去重後的受影響條文占比；
        不修改資料庫。
    輸出結果：
        回傳版本健康度陣列，其中 health 為 100 減去受影響條文占比；
        沒有任何內規條文時回傳空陣列。
    """
    return get_policy_health(db_session)


@app.get("/firm-policies", response_model=list[FirmPolicyResponse])
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


@app.get("/firm-policies/{policy_id}", response_model=FirmPolicyResponse)
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


@app.get(
    "/firm-policies/{policy_id}/versions",
    response_model=FirmPolicyVersionListResponse,
)
def get_firm_policy_versions(
    policy_id: int,
    db_session: Session = Depends(get_db_session),
) -> dict[str, object]:
    """取得指定公司內規的版本總數與各版本說明。"""
    try:
        return list_firm_policy_versions(db_session, policy_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
