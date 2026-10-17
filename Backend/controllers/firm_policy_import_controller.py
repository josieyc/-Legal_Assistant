"""公司內規 XML 解析與 ORM 建立流程。"""

from __future__ import annotations

import re
import xml.etree.ElementTree as ElementTree
from dataclasses import dataclass

from sqlalchemy.orm import Session

from Backend.controllers.firm_policy_embedding import vectorize_policy_article
from Backend.models.firm_policy import FirmPolicy, FirmPolicyArticle


ARTICLE_NUMBER_PATTERN = re.compile(r"\d+")


@dataclass(frozen=True)
class ParsedPolicyArticle:
    """從 XML 解析出的單一公司內規條文。"""

    article: int
    context: str


@dataclass(frozen=True)
class ParsedFirmPolicy:
    """從 XML 解析出的公司內規及條文。"""

    name: str
    description: str | None
    articles: tuple[ParsedPolicyArticle, ...]


def _required_text(element: ElementTree.Element, tag: str) -> str:
    """讀取必要 XML 子元素文字。

    輸入契約：
        element 必須是已解析的 XML 元素；tag 為必要直接子元素名稱。
    函式效果：
        僅讀取 XML 元素，不修改外部狀態。
    輸出結果：
        回傳去除首尾空白的文字；欄位缺少或空白時拋出 ValueError。
    """
    value = element.findtext(tag)
    if value is None or not value.strip():
        raise ValueError(f"公司內規 XML 缺少必要欄位：{tag}")
    return value.strip()


def _parse_article_number(article_label: str) -> int:
    """將條號標籤轉成整數。

    輸入契約：
        article_label 必須包含至少一組阿拉伯數字，例如「第 3 條」。
    函式效果：
        僅解析文字，不修改外部狀態。
    輸出結果：
        回傳條號整數；無法找到數字時拋出 ValueError。
    """
    match = ARTICLE_NUMBER_PATTERN.search(article_label)
    if match is None:
        raise ValueError(f"無法解析公司內規條號：{article_label}")
    return int(match.group())


def parse_firm_policy_xml(xml_content: bytes) -> ParsedFirmPolicy:
    """解析公司內規 XML 內容。

    輸入契約：
        xml_content 必須是非空、符合「測試資料_公司內規.xml」結構的 XML bytes，
        且只能包含一筆法規。
    函式效果：
        在記憶體解析 XML，不讀寫檔案或資料庫。
    輸出結果：
        回傳包含內規名稱、前言與條文的 ParsedFirmPolicy；XML 格式、筆數或必要
        欄位不合法時拋出 ElementTree.ParseError 或 ValueError。
    """
    if not xml_content.strip():
        raise ValueError("上傳的公司內規 XML 不可為空")

    root = ElementTree.fromstring(xml_content)
    law_elements = root.findall("法規")
    if len(law_elements) != 1:
        raise ValueError("公司內規 XML 必須且只能包含一筆法規")

    law_element = law_elements[0]
    law_nature = _required_text(law_element, "法規性質")
    if law_nature != "公司內規":
        raise ValueError("上傳的 XML 法規性質必須是「公司內規」")

    parsed_articles: list[ParsedPolicyArticle] = []
    seen_article_numbers: set[int] = set()
    for article_element in law_element.findall("./法規內容/條文"):
        article_number = _parse_article_number(
            _required_text(article_element, "條號")
        )
        if article_number in seen_article_numbers:
            raise ValueError(f"公司內規 XML 包含重複條號：第 {article_number} 條")
        seen_article_numbers.add(article_number)
        parsed_articles.append(
            ParsedPolicyArticle(
                article=article_number,
                context=_required_text(article_element, "條文內容"),
            )
        )

    if not parsed_articles:
        raise ValueError("公司內規 XML 至少必須包含一筆條文")

    description = (law_element.findtext("前言") or "").strip() or None
    return ParsedFirmPolicy(
        name=_required_text(law_element, "法規名稱"),
        description=description,
        articles=tuple(parsed_articles),
    )


def build_firm_policy_orm(parsed_policy: ParsedFirmPolicy) -> FirmPolicy:
    """將已解析公司內規轉成 ORM 關聯物件。

    輸入契約：
        parsed_policy 必須包含非空名稱及至少一筆已驗證條文。
    函式效果：
        僅在記憶體建立 FirmPolicy 與 FirmPolicyArticle，不操作 Session 或資料庫。
    輸出結果：
        回傳已建立條文關聯、尚未持久化的 FirmPolicy ORM 物件。
    """
    policy = FirmPolicy(
        policy_name=parsed_policy.name,
        description=parsed_policy.description,
    )
    policy.articles.extend(
        FirmPolicyArticle(
            article=article.article,
            context=article.context,
            embedding=vectorize_policy_article(article.article, article.context), #TODO: 目前僅限使用「測試資料_公司法規」
        )
        for article in parsed_policy.articles
    )
    return policy


def stage_firm_policy_import(
    db_session: Session,
    parsed_policy: ParsedFirmPolicy,
) -> FirmPolicy:
    """將公司內規 ORM 物件寫入資料庫。

    輸入契約：
        db_session 必須是有效 SQLAlchemy Session；parsed_policy 必須通過解析驗證。
    函式效果：
        建立 ORM 關聯物件、加入 Session 並提交交易；提交失敗時回滾交易。
    輸出結果：
        回傳已持久化的 FirmPolicy ORM 物件；ORM 錯誤向外傳遞。
    """
    policy = build_firm_policy_orm(parsed_policy)
    try:
        db_session.add(policy)
        db_session.commit()
    except Exception:
        db_session.rollback()
        raise
    return policy
