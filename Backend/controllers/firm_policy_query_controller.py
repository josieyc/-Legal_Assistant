"""公司內規查詢與 API 資料組裝。"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from Backend.models.firm_policy import FirmPolicy, FirmPolicyArticle, FirmPolicyVersion
from Backend.models.policy_risk_event import PolicyRiskEvent


def get_policy_health(db_session: Session) -> list[dict[str, object]]:
    """依目前版本計算公司內規受法規異動影響的條文占比。

    輸入契約：
        db_session 必須是可查詢的 SQLAlchemy Session。
    函式效果：
        查詢具有目前版本的內規、版本條文及風險事件中不重複的條文主鍵；
        僅讀取資料庫。
    輸出結果：
        回傳各內規目前版本的健康度陣列；每項直接使用資料庫的 policy_id、
        policy_version_id 與 version_no，並包含受影響條文數、全部條文數及健康度。
        沒有目前版本條文時回傳空陣列。
    """
    article_rows = db_session.execute(
        select(
            FirmPolicy.policy_id,
            FirmPolicy.policy_name,
            FirmPolicyVersion.policy_version_id,
            FirmPolicyVersion.version_no,
            FirmPolicyArticle.policy_article_id,
        )
        .join(FirmPolicyVersion, FirmPolicyVersion.policy_id == FirmPolicy.policy_id)
        .join(
            FirmPolicyArticle,
            FirmPolicyArticle.policy_version_id
            == FirmPolicyVersion.policy_version_id,
        )
        .where(FirmPolicy.current_version_id == FirmPolicyVersion.policy_version_id)
        .order_by(FirmPolicy.policy_id, FirmPolicyArticle.policy_article_id)
    ).all()
    affected_article_ids = set(
        db_session.scalars(
            select(PolicyRiskEvent.policy_article_id)
            .where(PolicyRiskEvent.policy_article_id.is_not(None))
            .distinct()
        ).all()
    )

    policies: dict[int, dict[str, object]] = {}
    for row in article_rows:
        policy = policies.setdefault(
            row.policy_id,
            {
                "policy_id": row.policy_id,
                "policy_name": row.policy_name,
                "policy_version_id": row.policy_version_id,
                "version_no": row.version_no,
                "affected_article_count": 0,
                "total_article_count": 0,
                "health": 100.0,
            },
        )
        policy["total_article_count"] += 1
        if row.policy_article_id in affected_article_ids:
            policy["affected_article_count"] += 1

    for policy in policies.values():
        affected_percentage = (
            policy["affected_article_count"]
            / policy["total_article_count"]
            * 100
        )
        policy["health"] = round(100 - affected_percentage, 2)
    return list(policies.values())


def _article_to_dict(row: object) -> dict[str, object]:
    """將不含 embedding 的條文查詢結果轉成公開資料。

    輸入契約：
        row 必須包含 firm_policy_article 除 embedding 外的全部資料欄位。
    函式效果：
        讀取查詢結果欄位並建立新字典；不修改查詢結果或資料庫。
    輸出結果：
        回傳與 firm_policy_article 結構一致且不含 embedding 的條文字典。
    """
    return {
        "policy_article_id": row.policy_article_id,
        "policy_version_id": row.policy_version_id,
        "article": row.article,
        "paragraph": row.paragraph,
        "subparagraph": row.subparagraph,
        "item": row.item,
        "article_key": row.article_key,
        "context": row.context,
    }


def _list_version_articles(
    db_session: Session,
    policy_version_id: int,
) -> list[dict[str, object]]:
    """查詢指定內規版本的條文公開欄位。

    輸入契約：
        db_session 必須可查詢；policy_version_id 必須是內規版本整數主鍵。
    函式效果：
        僅查詢指定版本條文，不讀取 embedding，亦不修改資料庫。
    輸出結果：
        回傳與 firm_policy_article 結構一致的條文字典列表；無資料時回傳空列表。
    """
    rows = db_session.execute(
        select(
            FirmPolicyArticle.policy_article_id,
            FirmPolicyArticle.policy_version_id,
            FirmPolicyArticle.article,
            FirmPolicyArticle.paragraph,
            FirmPolicyArticle.subparagraph,
            FirmPolicyArticle.item,
            FirmPolicyArticle.article_key,
            FirmPolicyArticle.context,
        )
        .where(FirmPolicyArticle.policy_version_id == policy_version_id)
        .order_by(
            FirmPolicyArticle.article,
            FirmPolicyArticle.paragraph,
            FirmPolicyArticle.subparagraph,
            FirmPolicyArticle.item,
            FirmPolicyArticle.policy_article_id,
        )
    ).all()
    return [_article_to_dict(row) for row in rows]


def _version_to_dict(
    row: object,
    articles: list[dict[str, object]],
) -> dict[str, object] | None:
    """將目前版本查詢結果組成版本資料。

    輸入契約：
        row 必須包含 firm_policy_version 欄位；articles 必須屬於該版本。
        尚未指定目前版本時 row.policy_version_id 為 None。
    函式效果：
        建立新字典；不修改輸入或資料庫。
    輸出結果：
        有目前版本時回傳版本及其 articles；沒有目前版本時回傳 None。
    """
    if row.policy_version_id is None:
        return None
    return {
        "policy_version_id": row.policy_version_id,
        "policy_id": row.policy_id,
        "version_no": row.version_no,
        "based_on_version_id": row.based_on_version_id,
        "description": row.version_description,
        "status": row.status,
        "effective_at": row.effective_at,
        "articles": articles,
    }


def _policy_statement():
    """建立公司內規與目前版本的共用查詢。

    輸入契約：
        不接受參數。
    函式效果：
        僅建立 SQLAlchemy 查詢物件，不查詢資料庫或修改外部狀態。
    輸出結果：
        回傳可再加入篩選及排序條件的 Select 查詢物件。
    """
    return (
        select(
            FirmPolicy.policy_id,
            FirmPolicy.policy_name,
            FirmPolicy.description.label("policy_description"),
            FirmPolicy.created_at,
            FirmPolicy.current_version_id,
            FirmPolicyVersion.policy_version_id,
            FirmPolicyVersion.version_no,
            FirmPolicyVersion.based_on_version_id,
            FirmPolicyVersion.description.label("version_description"),
            FirmPolicyVersion.status,
            FirmPolicyVersion.effective_at,
        )
        .select_from(FirmPolicy)
        .outerjoin(
            FirmPolicyVersion,
            FirmPolicy.current_version_id == FirmPolicyVersion.policy_version_id,
        )
    )


def _serialize_policy_row(
    db_session: Session,
    row: object,
) -> dict[str, object]:
    """序列化一筆內規與目前版本查詢結果。

    輸入契約：
        db_session 必須可查詢；row 必須來自 _policy_statement。
    函式效果：
        查詢目前版本條文並建立巢狀回應；不修改資料庫。
    輸出結果：
        回傳 firm_policy、current_version 與 articles 的巢狀字典。
    """
    articles = (
        _list_version_articles(db_session, row.policy_version_id)
        if row.policy_version_id is not None
        else []
    )
    return {
        "policy_id": row.policy_id,
        "policy_name": row.policy_name,
        "description": row.policy_description,
        "created_at": row.created_at,
        "current_version_id": row.current_version_id,
        "current_version": _version_to_dict(row, articles),
    }


def list_firm_policies(db_session: Session) -> list[dict[str, object]]:
    """取得全部公司內規及其目前版本。

    輸入契約：
        db_session 必須是可查詢的 SQLAlchemy Session。
    函式效果：
        查詢內規主檔、目前版本與條文公開欄位；不讀取 embedding 或修改資料庫。
    輸出結果：
        回傳依 policy_id 排序的巢狀公司內規字典列表。
    """
    rows = db_session.execute(
        _policy_statement().order_by(FirmPolicy.policy_id)
    ).all()
    return [_serialize_policy_row(db_session, row) for row in rows]


def find_firm_policy(db_session: Session, policy_id: int) -> dict[str, object]:
    """依 ID 取得公司內規及其目前版本。

    輸入契約：
        db_session 必須可查詢；policy_id 必須是公司內規整數主鍵。
    函式效果：
        查詢指定內規主檔、目前版本與條文；不讀取 embedding 或修改資料庫。
    輸出結果：
        找到時回傳巢狀公司內規字典；找不到時拋出 LookupError。
    """
    row = db_session.execute(
        _policy_statement().where(FirmPolicy.policy_id == policy_id)
    ).one_or_none()
    if row is None:
        raise LookupError("找不到公司內規")
    return _serialize_policy_row(db_session, row)


def list_firm_policy_versions(
    db_session: Session,
    policy_id: int,
) -> dict[str, object]:
    """取得指定公司內規的版本數量與版本摘要。

    輸入契約：
        db_session 必須可查詢；policy_id 必須是公司內規整數主鍵。
    函式效果：
        查詢內規主檔及其所有版本摘要；不查詢條文或修改資料庫。
    輸出結果：
        回傳內規識別資料、版本總數及依主鍵由新到舊排序的版本摘要；
        找不到內規時拋出 LookupError。
    """
    policy = db_session.execute(
        select(FirmPolicy.policy_id, FirmPolicy.policy_name).where(
            FirmPolicy.policy_id == policy_id
        )
    ).one_or_none()
    if policy is None:
        raise LookupError("找不到公司內規")

    version_rows = db_session.execute(
        select(
            FirmPolicyVersion.policy_version_id,
            FirmPolicyVersion.version_no,
            FirmPolicyVersion.based_on_version_id,
            FirmPolicyVersion.description,
            FirmPolicyVersion.status,
            FirmPolicyVersion.effective_at,
        )
        .where(FirmPolicyVersion.policy_id == policy_id)
        .order_by(FirmPolicyVersion.policy_version_id.desc())
    ).all()
    versions = [
        {
            "policy_version_id": row.policy_version_id,
            "version_no": row.version_no,
            "based_on_version_id": row.based_on_version_id,
            "description": row.description,
            "status": row.status,
            "effective_at": row.effective_at,
        }
        for row in version_rows
    ]
    return {
        "policy_id": policy.policy_id,
        "policy_name": policy.policy_name,
        "version_count": len(versions),
        "versions": versions,
    }
