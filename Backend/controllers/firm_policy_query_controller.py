"""公司內規查詢與 API 資料組裝。"""

from collections import OrderedDict

from sqlalchemy import select
from sqlalchemy.orm import Session

from Backend.models.firm_policy import FirmPolicy, FirmPolicyArticle
from Backend.models.policy_risk_event import PolicyRiskEvent


def get_policy_health(db_session: Session) -> list[dict[str, object]]:
    """逐章計算受法規異動影響的公司內規條文占比。

    輸入契約：
        db_session 必須是可查詢的 SQLAlchemy Session。
    函式效果：
        查詢所有內規條文及風險事件中不重複的條文主鍵，依內規與章節分組計算；
        僅讀取資料庫。
    輸出結果：
        回傳各章節健康度陣列；每項包含內規、章節、受影響條文數、全部條文數
        與百分比健康度。健康度為 100 減去受影響條文占比；沒有條文時回傳空陣列。
    """
    article_rows = db_session.execute(
        select(
            FirmPolicy.policy_id,
            FirmPolicy.policy_name,
            FirmPolicyArticle.policy_article_id,
            FirmPolicyArticle.chapter,
        )
        .join(FirmPolicyArticle, FirmPolicyArticle.policy_id == FirmPolicy.policy_id)
        .order_by(FirmPolicy.policy_id, FirmPolicyArticle.policy_article_id)
    ).all()
    affected_article_ids = set(
        db_session.scalars(
            select(PolicyRiskEvent.policy_article_id)
            .where(PolicyRiskEvent.policy_article_id.is_not(None))
            .distinct()
        ).all()
    )

    chapter_groups: OrderedDict[tuple[int, str], dict[str, object]] = OrderedDict()
    for row in article_rows:
        chapter = row.chapter or "未分類"
        group_key = (row.policy_id, chapter)
        group = chapter_groups.setdefault(
            group_key,
            {
                "policy_id": row.policy_id,
                "policy_name": row.policy_name,
                "chapter": chapter,
                "affected_article_count": 0,
                "total_article_count": 0,
                "health": 100.0,
            },
        )
        group["total_article_count"] += 1
        if row.policy_article_id in affected_article_ids:
            group["affected_article_count"] += 1

    for group in chapter_groups.values():
        affected_percentage = (
            group["affected_article_count"] / group["total_article_count"] * 100
        )
        group["health"] = round(
            100 - affected_percentage,
            2,
        )
    return list(chapter_groups.values())


def _article_to_dict(row: object) -> dict[str, object]:
    """將不含 embedding 的條文查詢結果轉成公開資料。

    輸入契約：
        row 必須包含 policy_article_id、article、paragraph、subparagraph、item
        chapter 與 context 屬性，且不得依賴 embedding 屬性。
    函式效果：
        讀取查詢結果欄位並建立新字典；不修改查詢結果或資料庫。
    輸出結果：
        回傳可供 API 序列化的條文字典，內容不包含 embedding。
    """
    return {
        "policy_article_id": row.policy_article_id,
        "chapter": row.chapter,
        "article": row.article,
        "paragraph": row.paragraph,
        "subparagraph": row.subparagraph,
        "item": row.item,
        "context": row.context,
    }


def _list_policy_articles(
    db_session: Session,
    policy_id: int,
) -> list[dict[str, object]]:
    """查詢指定內規條文；刻意不選取 embedding 欄位。

    輸入契約：
        db_session 必須是可查詢的 SQLAlchemy Session；policy_id 必須是公司內規主鍵。
    函式效果：
        僅查詢指定內規條文的公開欄位，並依條、項、款、目及條文主鍵排序；
        不讀取 embedding，亦不修改資料庫。
    輸出結果：
        回傳不含 embedding 的條文字典列表；沒有條文時回傳空列表。
    """
    rows = db_session.execute(
        select(
            FirmPolicyArticle.policy_article_id,
            FirmPolicyArticle.chapter,
            FirmPolicyArticle.article,
            FirmPolicyArticle.paragraph,
            FirmPolicyArticle.subparagraph,
            FirmPolicyArticle.item,
            FirmPolicyArticle.context,
        )
        .where(FirmPolicyArticle.policy_id == policy_id)
        .order_by(
            FirmPolicyArticle.article,
            FirmPolicyArticle.paragraph,
            FirmPolicyArticle.subparagraph,
            FirmPolicyArticle.item,
            FirmPolicyArticle.policy_article_id,
        )
    ).all()
    return [_article_to_dict(row) for row in rows]


def _policy_to_dict(row: object, articles: list[dict[str, object]]) -> dict[str, object]:
    """將內規主檔查詢結果及條文組成公開資料。

    輸入契約：
        row 必須包含公司內規主檔的公開欄位；articles 必須是已排除向量資料的條文列表。
    函式效果：
        將主檔欄位與條文列表組成新字典；不修改輸入資料或資料庫。
    輸出結果：
        回傳包含內規基本資料及 articles 的可序列化字典。
    """
    return {
        "policy_id": row.policy_id,
        "policy_name": row.policy_name,
        "description": row.description,
        "created_at": row.created_at,
        "updated_at": row.updated_at,
        "articles": articles,
    }


def list_firm_policies(db_session: Session) -> list[dict[str, object]]:
    """取得全部公司內規及條文，不讀取向量資料。

    輸入契約：
        db_session 必須是可查詢的 SQLAlchemy Session。
    函式效果：
        依 policy_id 查詢全部內規主檔及其條文公開欄位；不讀取 embedding，
        亦不修改資料庫。
    輸出結果：
        回傳公司內規字典列表；資料庫沒有內規時回傳空列表。
    """
    policy_rows = db_session.execute(
        select(
            FirmPolicy.policy_id,
            FirmPolicy.policy_name,
            FirmPolicy.description,
            FirmPolicy.created_at,
            FirmPolicy.updated_at,
        ).order_by(FirmPolicy.policy_id)
    ).all()

    return [
        _policy_to_dict(
            row,
            _list_policy_articles(db_session, row.policy_id),
        )
        for row in policy_rows
    ]


def find_firm_policy(db_session: Session, policy_id: int) -> dict[str, object]:
    """依 ID 取得公司內規及條文，找不到時拋出 LookupError。

    輸入契約：
        db_session 必須是可查詢的 SQLAlchemy Session；policy_id 必須是欲查詢的
        公司內規整數主鍵。
    函式效果：
        查詢指定內規主檔及其條文公開欄位；不讀取 embedding，亦不修改資料庫。
    輸出結果：
        找到時回傳公司內規字典；找不到時拋出 LookupError。
    """
    row = db_session.execute(
        select(
            FirmPolicy.policy_id,
            FirmPolicy.policy_name,
            FirmPolicy.description,
            FirmPolicy.created_at,
            FirmPolicy.updated_at,
        ).where(FirmPolicy.policy_id == policy_id)
    ).one_or_none()
    if row is None:
        raise LookupError("找不到公司內規")

    return _policy_to_dict(
        row,
        _list_policy_articles(db_session, row.policy_id),
    )
