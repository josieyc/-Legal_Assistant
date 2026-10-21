"""測試用政策風險事件新增流程。"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
import json
from pathlib import Path
import re

from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from Backend.models.act_change_event import ActChangeEvent
from Backend.models.act_version import ActVersion
from Backend.models.associations import ActIndustry
from Backend.models.core import Act, Department, Industry, User
from Backend.models.firm_policy import FirmPolicy, FirmPolicyArticle
from Backend.models.policy_risk_event import PolicyRiskEvent
from Backend.models.policy_risk_event_log import PolicyRiskEventLog


TEST_POLICY_NAME = "金融業務法令遵循作業規則"
POLICY_RISK_TEST_DATA_PATH = (
    Path(__file__).resolve().parent.parent / "legal_data" / "policy_risk_event_test_data.json"
)
REVIEW_DRAFT_EDITABLE_STATES = {"Pending", "InReview", "ReanalysisRequired"}
REVIEW_SUBMITTABLE_STATES = {"Pending", "InReview", "ReanalysisRequired"}
REVIEW_DRAFT_FIELDS = {
    "department_id",
    "obligation_intensity",
    "deadline",
    "topic",
    "reason",
    "confidence_level",
    "suggest_next_step",
    "suggest_due_date",
}


def _category_score(value: object, labels: dict[str, int]) -> int:
    """將新式數字分數或舊式文字等級正規化為 1～3 分。"""
    text = "" if value is None else str(value).strip()
    if text in {"1", "2", "3"}:
        return int(text)
    return labels.get(text, 1)


def _deadline_score(value: object, event_date: object) -> int:
    """依事件日至期限的距離，將數字、日期或舊式期限文字轉為分數。"""
    text = "" if value is None else str(value).strip()
    if text in {"1", "2", "3"}:
        return int(text)

    try:
        due_date = date.fromisoformat(text)
        published_date = date.fromisoformat(str(event_date))
    except (TypeError, ValueError):
        due_date = published_date = None
    if due_date is not None and published_date is not None:
        days = (due_date - published_date).days
        if days > 183:
            return 1
        if days >= 92:
            return 2
        return 3

    month_match = re.search(r"(\d+)\s*(?:個)?月", text)
    if month_match:
        months = int(month_match.group(1))
        if months > 6:
            return 1
        if months >= 3:
            return 2
        return 3
    if "半年" in text:
        return 2
    if "日" in text or "天" in text:
        return 3
    return 1


@dataclass(frozen=True)
class PolicyRiskEventSeed:
    """一筆固定政策風險事件的測試資料定義。"""

    act_name: str
    act_article: int
    change_type: str
    policy_article: int
    department_name: str
    obligation_intensity: int
    deadline: int
    topic: str
    reason: str
    confidence_level: int
    suggest_next_step: str
    suggest_due_date: str


def load_policy_risk_event_seeds(
    data_path: Path = POLICY_RISK_TEST_DATA_PATH,
) -> tuple[PolicyRiskEventSeed, ...]:
    """從獨立 JSON 檔載入固定政策風險事件測試資料。

    輸入契約：
        data_path 必須指向 UTF-8 編碼的 JSON 陣列；每筆物件須包含
        PolicyRiskEventSeed 的全部欄位，且不得包含額外欄位。
    函式效果：
        讀取並解析指定檔案，不修改檔案或資料庫。
    輸出結果：
        回傳不可變的 PolicyRiskEventSeed tuple；檔案不存在、JSON 格式錯誤或
        欄位不符時，分別向外傳遞 OSError、JSONDecodeError 或 TypeError。
    """
    with data_path.open(encoding="utf-8") as data_file:
        records = json.load(data_file)
    if not isinstance(records, list):
        raise TypeError("政策風險事件測試資料必須是 JSON 陣列")
    return tuple(PolicyRiskEventSeed(**record) for record in records)


def _find_act_change_event(db_session: Session, seed: PolicyRiskEventSeed) -> ActChangeEvent:
    """取得測試定義所對應的法規異動事件。

    輸入契約：
        db_session 必須可查詢；seed 必須描述測試 XML 中唯一的法規條文異動。
    函式效果：
        依法規名稱、條號及異動類型查詢資料；不修改資料庫。
    輸出結果：
        回傳 ActChangeEvent；找不到時拋出 LookupError。
    """
    event = db_session.scalar(
        select(ActChangeEvent)
        .join(Act)
        .join(
            ActVersion,
            ActVersion.version_id == ActChangeEvent.new_version_id,
        )
        .where(
            Act.act_name == seed.act_name,
            ActChangeEvent.article == seed.act_article,
            ActChangeEvent.change_type == seed.change_type,
            ActVersion.source_xml == "測試資料_後.xml",
        ).order_by(ActChangeEvent.act_change_event_id)
    )
    if event is None:
        raise LookupError(f"找不到測試法規「{seed.act_name}」第 {seed.act_article} 條異動事件")
    return event


def _find_policy_article(db_session: Session, article_number: int) -> FirmPolicyArticle:
    """取得指定條號的測試公司內規條文。

    輸入契約：
        db_session 必須可查詢；article_number 必須是已匯入測試內規的正整數條號。
    函式效果：
        查詢固定測試公司內規的指定條文；不修改資料庫。
    輸出結果：
        回傳 FirmPolicyArticle；找不到時拋出 LookupError。
    """
    article = db_session.scalar(
        select(FirmPolicyArticle).join(FirmPolicy).where(
            FirmPolicy.policy_name == TEST_POLICY_NAME,
            FirmPolicyArticle.article == article_number,
        ).order_by(FirmPolicyArticle.policy_article_id)
    )
    if article is None:
        raise LookupError(f"找不到測試公司內規第 {article_number} 條")
    return article


def _find_department(db_session: Session, department_name: str) -> Department:
    """取得指定名稱的測試權責部門。

    輸入契約：
        db_session 必須可查詢；department_name 必須是 SQL 測試資料中的非空部門名稱。
    函式效果：
        依名稱查詢部門；不修改資料庫。
    輸出結果：
        回傳 Department；找不到時拋出 LookupError。
    """
    department = db_session.scalar(
        select(Department).where(Department.department_name == department_name)
        .order_by(Department.department_id)
    )
    if department is None:
        raise LookupError(f"找不到測試資料對應的部門：{department_name}")
    return department


def _build_risk_event(db_session: Session, seed: PolicyRiskEventSeed) -> PolicyRiskEvent:
    """依固定定義建立尚未提交的政策風險事件。

    輸入契約：
        db_session 必須包含 seed 所需的法規異動、內規條文及部門；seed 欄位必須完整。
    函式效果：
        查詢三個外鍵並建立 PolicyRiskEvent；不加入 Session 且不提交交易。
    輸出結果：
        回傳 state 固定為 Pending 的 PolicyRiskEvent；缺少前置資料時拋出 LookupError。
    """
    change = _find_act_change_event(db_session, seed)
    article = _find_policy_article(db_session, seed.policy_article)
    department = _find_department(db_session, seed.department_name)
    return PolicyRiskEvent(
        act_change_event_id=change.act_change_event_id,
        policy_id=article.policy_id,
        policy_article_id=article.policy_article_id,
        department_id=department.department_id,
        obligation_intensity=seed.obligation_intensity,
        deadline=seed.deadline,
        topic=seed.topic,
        state="Pending",
        reason=seed.reason,
        confidence_level=seed.confidence_level,
        suggest_next_step=seed.suggest_next_step,
        suggest_due_date=seed.suggest_due_date,
    )


def _serialize_risk_event(risk_event: PolicyRiskEvent) -> dict[str, object]:
    """將已保存的政策風險事件轉為 API 回應字典。

    輸入契約：
        risk_event 必須已提交並具有主鍵與 create_at。
    函式效果：
        僅讀取 ORM 欄位，不修改資料庫或物件。
    輸出結果：
        回傳包含所有非關聯欄位的字典。
    """
    return {column.name: getattr(risk_event, column.name) for column in PolicyRiskEvent.__table__.columns}


def find_policy_risk_event(
    db_session: Session,
    risk_event_id: int,
) -> dict[str, object]:
    """依主鍵取得單一政策風險事件。

    輸入契約：
        db_session 必須是可查詢的 SQLAlchemy Session；risk_event_id 必須是政策
        風險事件的整數主鍵。
    函式效果：
        依主鍵查詢 PolicyRiskEvent；不修改資料庫。
    輸出結果：
        找到時回傳事件的全部非關聯欄位；找不到時拋出 LookupError。
    """
    risk_event = db_session.get(PolicyRiskEvent, risk_event_id)
    if risk_event is None:
        raise LookupError("找不到政策風險事件")
    return _serialize_risk_event(risk_event)


def review_policy_risk_event_draft(
    db_session: Session,
    risk_event_id: int,
    actor_id: int,
    updates: dict[str, object],
) -> dict[str, object]:
    """更新政策風險事件草稿並建立稽核紀錄。

    僅 Pending、InReview 與 ReanalysisRequired 狀態可更新。updates 只接受
    REVIEW_DRAFT_FIELDS，且值可為 None 以清除欄位；成功後事件狀態為 InReview。
    主表與 log 在同一交易提交，任何錯誤都會回滾。
    """
    try:
        risk_event = db_session.get(PolicyRiskEvent, risk_event_id)
        if risk_event is None:
            raise LookupError("找不到政策風險事件")
        if db_session.get(User, actor_id) is None:
            raise LookupError("找不到操作使用者")
        if risk_event.state not in REVIEW_DRAFT_EDITABLE_STATES:
            raise ValueError(f"狀態 {risk_event.state} 不允許編輯審查草稿")

        unknown_fields = set(updates) - REVIEW_DRAFT_FIELDS
        if unknown_fields:
            raise ValueError(f"不允許更新欄位：{', '.join(sorted(unknown_fields))}")
        if not updates:
            raise ValueError("至少需要提供一個草稿欄位")

        department_id = updates.get("department_id")
        if department_id is not None and "department_id" in updates:
            if db_session.get(Department, department_id) is None:
                raise LookupError("找不到權責部門")

        from_state = risk_event.state
        changes: dict[str, dict[str, object]] = {}
        for field, new_value in updates.items():
            old_value = getattr(risk_event, field)
            if old_value != new_value:
                changes[field] = {"from": old_value, "to": new_value}
                setattr(risk_event, field, new_value)

        if from_state != "InReview":
            changes["state"] = {"from": from_state, "to": "InReview"}
        risk_event.state = "InReview"

        log = PolicyRiskEventLog(
            risk_event=risk_event,
            action="review_draft_updated",
            actor_id=actor_id,
            from_state=from_state,
            to_state="InReview",
            changes=json.dumps(changes, ensure_ascii=False, sort_keys=True),
        )
        db_session.add(log)
        db_session.commit()
        db_session.refresh(risk_event)
        db_session.refresh(log)
    except Exception:
        db_session.rollback()
        raise

    return {
        "status": "updated",
        "event": _serialize_risk_event(risk_event),
        "log": {
            column.name: getattr(log, column.name)
            for column in PolicyRiskEventLog.__table__.columns
        },
    }


def submit_policy_risk_event_review(
    db_session: Session,
    risk_event_id: int,
    actor_id: int,
    corrections: dict[str, object],
) -> dict[str, object]:
    """提交政策風險事件審核、套用修正並完成審核。

    輸入契約：
        db_session 必須是可讀寫的 SQLAlchemy Session；risk_event_id 與
        actor_id 必須對應已存在的風險事件及使用者；corrections 只能
        包含 REVIEW_DRAFT_FIELDS，可為空字典，且明確的 None 表示清除欄位。
    函式效果：
        將修正套用到 Pending、InReview 或 ReanalysisRequired 事件，
        將狀態設為 Reviewed，並在同一交易新增包含欄位與狀態修正的
        PolicyRiskEventLog；失敗時回滾全部變更。
    輸出結果：
        回傳 status 為 completed 的事件與 log 字典；找不到事件、
        使用者或部門時拋出 LookupError，狀態或修正欄位不允許時拋出
        ValueError。
    """
    try:
        risk_event = db_session.get(PolicyRiskEvent, risk_event_id)
        if risk_event is None:
            raise LookupError("找不到政策風險事件")
        if db_session.get(User, actor_id) is None:
            raise LookupError("找不到操作使用者")
        if risk_event.state not in REVIEW_SUBMITTABLE_STATES:
            raise ValueError(f"狀態 {risk_event.state} 不允許提交審核")

        unknown_fields = set(corrections) - REVIEW_DRAFT_FIELDS
        if unknown_fields:
            raise ValueError(f"不允許修正欄位：{', '.join(sorted(unknown_fields))}")

        department_id = corrections.get("department_id")
        if department_id is not None and "department_id" in corrections:
            if db_session.get(Department, department_id) is None:
                raise LookupError("找不到權責部門")

        from_state = risk_event.state
        changes: dict[str, dict[str, object]] = {}
        for field, new_value in corrections.items():
            old_value = getattr(risk_event, field)
            if old_value != new_value:
                changes[field] = {"from": old_value, "to": new_value}
                setattr(risk_event, field, new_value)

        changes["state"] = {"from": from_state, "to": "Reviewed"}
        risk_event.state = "Reviewed"
        log = PolicyRiskEventLog(
            risk_event=risk_event,
            action="review_submitted",
            actor_id=actor_id,
            from_state=from_state,
            to_state="Reviewed",
            changes=json.dumps(changes, ensure_ascii=False, sort_keys=True),
        )
        db_session.add(log)
        db_session.commit()
        db_session.refresh(risk_event)
        db_session.refresh(log)
    except Exception:
        db_session.rollback()
        raise

    return {
        "status": "completed",
        "event": _serialize_risk_event(risk_event),
        "log": {
            column.name: getattr(log, column.name)
            for column in PolicyRiskEventLog.__table__.columns
        },
    }


def list_policy_risk_events(
    db_session: Session,
    state: str | None = None,
) -> list[dict[str, object]]:
    """查詢供風險事件列表使用的法規與產業資訊。

    輸入契約：
        db_session 必須是可查詢且已建立完整 ORM schema 的 SQLAlchemy Session；
        state 若有提供，僅查詢狀態完全相符的事件。
    函式效果：
        從政策風險事件連結法規異動、法規、部門及產業資料；僅讀取資料庫，
        不提交交易或修改任何資料。同一法規連結的產業會彙整於 industry 陣列。
    輸出結果：
        回傳包含風險事件編號，並依發布日期新到舊及風險事件編號排序的字典列表；
        部門未建立關聯時為 None，產業未建立關聯時為空陣列。資料庫查詢錯誤會向外傳遞。
    """
    affected_event_counts = (
        select(
            PolicyRiskEvent.act_change_event_id.label("act_change_event_id"),
            func.count(PolicyRiskEvent.risk_event_id).label("event_count"),
        )
        .group_by(PolicyRiskEvent.act_change_event_id)
        .subquery()
    )
    impact_scope_score = case(
        (affected_event_counts.c.event_count >= 4, 3),
        (affected_event_counts.c.event_count >= 2, 2),
        else_=1,
    )
    statement = (
        select(
            PolicyRiskEvent.risk_event_id.label("risk_event_id"),
            Act.act_id.label("_act_id"),
            Act.act_name.label("act_name"),
            PolicyRiskEvent.topic.label("topic"),
            PolicyRiskEvent.obligation_intensity.label("_obligation_intensity"),
            ActChangeEvent.penalty.label("_penalty"),
            PolicyRiskEvent.deadline.label("_deadline"),
            impact_scope_score.label("_impact_scope"),
            Department.department_name.label("affected_department"),
            ActChangeEvent.event_date.label("event_date"),
            PolicyRiskEvent.state.label("status"),
        )
        .select_from(PolicyRiskEvent)
        .join(ActChangeEvent, PolicyRiskEvent.act_change_event_id == ActChangeEvent.act_change_event_id)
        .join(
            affected_event_counts,
            PolicyRiskEvent.act_change_event_id
            == affected_event_counts.c.act_change_event_id,
        )
        .join(Act, ActChangeEvent.act_id == Act.act_id)
        .outerjoin(Department, PolicyRiskEvent.department_id == Department.department_id)
    )
    if state is not None:
        statement = statement.where(PolicyRiskEvent.state == state)
    statement = statement.order_by(
        ActChangeEvent.event_date.desc(),
        PolicyRiskEvent.risk_event_id,
    )
    rows = list(db_session.execute(statement).mappings())
    act_ids = {row["_act_id"] for row in rows}
    industries_by_act: dict[int, list[str]] = {act_id: [] for act_id in act_ids}
    if act_ids:
        industry_statement = (
            select(ActIndustry.act_id, Industry.industry_name)
            .join(Industry, ActIndustry.industry_id == Industry.industry_id)
            .where(ActIndustry.act_id.in_(act_ids))
            .order_by(ActIndustry.act_id, Industry.industry_name)
        )
        for act_id, industry_name in db_session.execute(industry_statement):
            industries_by_act[act_id].append(industry_name)

    results = []
    for row in rows:
        event = dict(row)
        event["industry"] = industries_by_act[event.pop("_act_id")]
        event["risk"] = (
            _category_score(
                event.pop("_obligation_intensity"),
                {"建議性": 1, "低": 1, "應為": 2, "中": 2, "禁止或強制": 3, "高": 3},
            )
            + _category_score(
                event.pop("_penalty"),
                {"無": 1, "輕": 1, "無或輕": 1, "中": 2, "重": 3},
            )
            + _deadline_score(event.pop("_deadline"), event["event_date"])
            + event.pop("_impact_scope")
        )
        results.append(event)
    return results


def create_fixed_policy_risk_event(db_session: Session) -> dict[str, object]:
    """新增一批內容固定的政策風險事件。

    輸入契約：
        db_session 必須可讀寫；資料庫須先建立測試 XML 的全部法規異動、匯入公司內規，
        並具備 SQL 測試資料中前端 demo 使用的權責部門。
    函式效果：
        一次新增固定定義的 Pending 事件並提交；每次呼叫皆新增完整一批。
        任一前置資料缺失或資料庫操作失敗時回滾整批交易。
    輸出結果：
        回傳 created 狀態、新增筆數及事件明細；缺少前置資料時拋出 LookupError，
        其他資料庫錯誤在回滾後向外傳遞。
    """
    try:
        seeds = load_policy_risk_event_seeds()
        risk_events = [_build_risk_event(db_session, seed) for seed in seeds]
        db_session.add_all(risk_events)
        db_session.commit()
        for risk_event in risk_events:
            db_session.refresh(risk_event)
    except Exception:
        db_session.rollback()
        raise
    return {
        "status": "created",
        "created_count": len(risk_events),
        "events": [_serialize_risk_event(event) for event in risk_events],
    }
