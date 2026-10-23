"""公司內規版本沿革的測試資料建立流程。"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from Backend.models.firm_policy import (
    FirmPolicy,
    FirmPolicyArticle,
    FirmPolicyChangeRecord,
    FirmPolicyVersion,
)


HISTORICAL_VERSION_NO = "1.0"
CURRENT_VERSION_NO = "1.2"
HISTORICAL_ARTICLE_COUNT = 20


def _history_result(
    policy: FirmPolicy,
    historical_version: FirmPolicyVersion,
    created: bool,
) -> dict[str, object]:
    """建立版本沿革測試資料的回應。

    輸入契約：
        policy 必須具有已持久化的目前版本；historical_version 必須是該內規
        的 1.0 版本；created 表示本次是否新增沿革資料。
    函式效果：
        只讀取 ORM 物件並建立回應字典，不修改資料庫。
    輸出結果：
        回傳內規、新舊版本主鍵、版本號及舊版條文數。
    """
    current_version = policy.current_version
    if current_version is None:
        raise LookupError("公司內規尚未設定目前版本")
    return {
        "status": "created" if created else "already_exists",
        "policy_id": policy.policy_id,
        "historical_version_id": historical_version.policy_version_id,
        "historical_version_no": historical_version.version_no,
        "historical_article_count": len(historical_version.articles),
        "current_version_id": current_version.policy_version_id,
        "current_version_no": current_version.version_no,
    }


def seed_firm_policy_version_history(db_session: Session) -> dict[str, object]:
    """為最新公司內規建立 1.0 至 1.2 的測試版本沿革。

    輸入契約：
        db_session 必須是可查詢及寫入的 SQLAlchemy Session；資料庫必須先有
        一筆含目前版本且至少二十條條文的公司內規。
    函式效果：
        將最新內規的目前版本設為 1.2；新增狀態為 Superseded 的 1.0
        版本並複製目前版本前二十條條文；將 1.2 的 based_on_version_id
        指向 1.0，並為 1.2 新增的其餘條文建立修改紀錄後提交。
        若 1.0 已存在，僅確保目前版本號為 1.2，不重複建立資料。
    輸出結果：
        回傳新舊版本及條文數摘要；無內規、無目前版本或條文不足時
        拋出 LookupError；資料庫寫入失敗時回滾並向外傳遞原始例外。
    """
    policy = db_session.scalar(
        select(FirmPolicy).order_by(FirmPolicy.policy_id.desc()).limit(1)
    )
    if policy is None or policy.current_version is None:
        raise LookupError("找不到含目前版本的公司內規")

    current_version = policy.current_version
    current_articles = sorted(
        current_version.articles,
        key=lambda article: (article.article or 0, article.policy_article_id or 0),
    )
    if len(current_articles) < HISTORICAL_ARTICLE_COUNT:
        raise LookupError("公司內規目前版本少於二十條，無法建立 1.0 測試資料")

    historical_version = db_session.scalar(
        select(FirmPolicyVersion).where(
            FirmPolicyVersion.policy_id == policy.policy_id,
            FirmPolicyVersion.version_no == HISTORICAL_VERSION_NO,
        )
    )
    if historical_version is not None:
        current_version.version_no = CURRENT_VERSION_NO
        db_session.commit()
        return _history_result(policy, historical_version, created=False)

    historical_version = FirmPolicyVersion(
        version_no=HISTORICAL_VERSION_NO,
        description="初版公司內規測試資料，共二十條。",
        status="Superseded",
        effective_at="2025-01-10",
    )
    historical_version.articles.extend(
        FirmPolicyArticle(
            article=article.article,
            paragraph=article.paragraph,
            subparagraph=article.subparagraph,
            item=article.item,
            article_key=article.article_key,
            context=article.context,
            embedding=article.embedding,
        )
        for article in current_articles[:HISTORICAL_ARTICLE_COUNT]
    )
    policy.versions.append(historical_version)
    current_version.version_no = CURRENT_VERSION_NO
    current_version.based_on_version = historical_version
    current_version.effective_at = "2026-10-01"
    current_version.change_records.extend(
        FirmPolicyChangeRecord(
            policy_article=article,
            old_context=None,
            new_context=article.context,
            change_reason="1.2 版新增條文測試資料",
        )
        for article in current_articles[HISTORICAL_ARTICLE_COUNT:]
    )

    try:
        db_session.commit()
    except Exception:
        db_session.rollback()
        raise
    return _history_result(policy, historical_version, created=True)
