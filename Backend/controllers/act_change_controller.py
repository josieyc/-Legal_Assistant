"""法規沿革差異比對與異動事件保存流程。"""

from __future__ import annotations

import re
import xml.etree.ElementTree as ElementTree
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from Backend.models.act_change_event import ActChangeEvent
from Backend.models.associations import ActIndustry
from Backend.models.core import Act, Industry


LEGAL_DATA_DIR = Path(__file__).resolve().parents[1] / "legal_data"
DEFAULT_PREVIOUS_DATA_PATH = LEGAL_DATA_DIR / "測試資料_前.xml"
DEFAULT_CURRENT_DATA_PATH = LEGAL_DATA_DIR / "測試資料_後.xml"
ARTICLE_NUMBER_PATTERN = re.compile(r"\d+")

# TODO: 待正式產業分類規則或模型完成後，移除此測試資料專用固定對照。
TEST_ACT_INDUSTRIES: dict[str, tuple[str, ...]] = {
    "存款帳戶及其疑似不法或顯屬異常交易管理辦法": ("銀行業",),
    "保險業辦理國外投資管理辦法": ("保險業",),
    "發行人募集與發行有價證券處理準則": ("證券業",),
}


@dataclass(frozen=True)
class LawVersion:
    """單一法規版本中與異動比對有關的資料。"""

    name: str
    history: str
    version_id: str
    articles: dict[int, str]


@dataclass(frozen=True)
class ArticleChange:
    """單一條文在前後版本間的差異。"""

    article: int | None
    change_type: str


def build_change_event_response(
    previous: LawVersion,
    current: LawVersion,
    change: ArticleChange,
) -> dict[str, object]:
    """建立單筆法規異動的 API 回應資料。

    輸入契約：
        previous 與 current 必須為同一法規的前後版本；change 必須是兩版本的比對結果。
    函式效果：
        組合法規名稱、異動資訊及新舊條文內容；不修改檔案、版本資料或資料庫。
    輸出結果：
        回傳包含法規名稱、條號、異動類型、舊版本與新版本的字典；沿革異動沒有
        條號時，新舊條文內容皆為 None。
    """
    article = change.article
    return {
        "act_name": current.name,
        "article": article,
        "change_type": change.change_type,
        "last_version": {
            "version_id": previous.version_id,
            "content": previous.articles.get(article) if article is not None else None,
        },
        "new_version": {
            "version_id": current.version_id,
            "content": current.articles.get(article) if article is not None else None,
        },
    }


def compare_act_change_event_versions(
    previous_data_path: Path = DEFAULT_PREVIOUS_DATA_PATH,
    current_data_path: Path = DEFAULT_CURRENT_DATA_PATH,
) -> dict[str, object]:
    """比較 XML 法規前後版本並建立 API 回應。

    輸入契約：
        previous_data_path 與 current_data_path 必須指向可讀取且符合全國法規資料庫格式的
        前後版本 XML 檔案。
    函式效果：
        讀取兩份 XML，針對前後皆存在且沿革不同的法規比較條文；不修改檔案或資料庫。
    輸出結果：
        回傳 success 狀態、來源檔名、異動法規數、異動事件數，以及各事件的新舊版本；
        檔案、XML 或必要欄位錯誤時拋出對應例外。
    """
    previous_laws = load_law_versions(previous_data_path)
    current_laws = load_law_versions(current_data_path)
    events: list[dict[str, object]] = []

    for act_name in sorted(previous_laws.keys() & current_laws.keys()):
        previous = previous_laws[act_name]
        current = current_laws[act_name]
        events.extend(
            build_change_event_response(previous, current, change)
            for change in compare_law_versions(previous, current)
        )

    return {
        "status": "success",
        "previous_source": Path(previous_data_path).name,
        "current_source": Path(current_data_path).name,
        "changed_law_count": len({event["act_name"] for event in events}),
        "detected_event_count": len(events),
        "events": events,
    }


def _required_text(element: ElementTree.Element, tag: str) -> str:
    """讀取必要 XML 子元素文字。

    輸入契約：
        element 必須是已解析的 XML 元素；tag 為必要直接子元素名稱。
    函式效果：
        僅讀取 XML，不修改外部狀態。
    輸出結果：
        回傳去除首尾空白的文字；元素缺少或內容空白時拋出 ValueError。
    """
    value = element.findtext(tag)
    if value is None or not value.strip():
        raise ValueError(f"法規資料缺少必要欄位：{tag}")
    return value.strip()


def _parse_article_number(article_label: str) -> int:
    """從條號標籤解析阿拉伯數字條號。

    輸入契約：
        article_label 必須含至少一組阿拉伯數字，例如「第 3 條」。
    函式效果：
        不修改外部狀態。
    輸出結果：
        回傳條號整數；找不到數字時拋出 ValueError。
    """
    match = ARTICLE_NUMBER_PATTERN.search(article_label)
    if match is None:
        raise ValueError(f"無法解析條號：{article_label}")
    return int(match.group())


def load_law_versions(xml_path: Path) -> dict[str, LawVersion]:
    """載入 XML 內所有法規版本。

    輸入契約：
        xml_path 必須指向可讀取且符合全國法規資料庫格式的 XML 檔案。
    函式效果：
        讀取並解析指定檔案，不修改檔案或資料庫。
    輸出結果：
        回傳以法規名稱索引的 LawVersion；檔案、XML 或必要欄位錯誤時拋出對應例外。
    """
    root = ElementTree.parse(Path(xml_path)).getroot()
    laws: dict[str, LawVersion] = {}
    for law_element in root.findall("法規"):
        name = _required_text(law_element, "法規名稱")
        history = _required_text(law_element, "沿革內容")
        version_id = _required_text(law_element, "最新異動日期")
        articles: dict[int, str] = {}
        for article_element in law_element.findall("./法規內容/條文"):
            label = _required_text(article_element, "條號")
            articles[_parse_article_number(label)] = (
                article_element.findtext("條文內容") or ""
            ).strip()
        laws[name] = LawVersion(name, history, version_id, articles)
    return laws


def compare_law_versions(previous: LawVersion, current: LawVersion) -> list[ArticleChange]:
    """依沿革是否改變，比對同一法規的條文差異。

    輸入契約：
        previous 與 current 必須代表名稱相同的前後版本法規。
    函式效果：
        僅計算差異，不修改外部狀態；沿革相同時不進行條文異動判定。
    輸出結果：
        回傳新增、修正或刪除的條文差異；沿革改變但條文未變時回傳一筆條號為 None 的沿革異動。
    """
    if previous.name != current.name:
        raise ValueError("只能比較名稱相同的法規版本")
    if previous.history.strip() == current.history.strip():
        return []

    changes: list[ArticleChange] = []
    for article in sorted(previous.articles.keys() | current.articles.keys()):
        old_content = previous.articles.get(article)
        new_content = current.articles.get(article)
        if old_content == new_content:
            continue
        if old_content is None:
            change_type = "新增"
        elif new_content is None or new_content == "（刪除）":
            change_type = "刪除"
        else:
            change_type = "修正"
        changes.append(ArticleChange(article, change_type))
    return changes or [ArticleChange(None, "沿革異動")]


def _format_event_date(version_id: str) -> str:
    """將資料集版本日期轉為 ISO 日期。

    輸入契約：
        version_id 必須是 YYYYMMDD 格式且為有效日期。
    函式效果：
        不修改外部狀態。
    輸出結果：
        回傳 YYYY-MM-DD 字串；格式或日期不合法時拋出 ValueError。
    """
    return datetime.strptime(version_id, "%Y%m%d").date().isoformat()


def _get_or_create_act(db_session: Session, act_name: str) -> Act:
    """取得或建立法規主檔。

    輸入契約：
        db_session 必須可查詢及新增資料；act_name 必須是非空白法規名稱。
    函式效果：
        查無同名法規時加入一筆 Act 至目前交易，但不自行提交。
    輸出結果：
        回傳既有或新建的 Act；資料庫錯誤向外傳遞。
    """
    act = db_session.scalar(select(Act).where(Act.act_name == act_name))
    if act is None:
        act = Act(act_name=act_name)
        db_session.add(act)
        db_session.flush()
    return act


def _get_or_create_industry(db_session: Session, industry_name: str) -> Industry:
    """取得或建立產業主檔。

    輸入契約：
        db_session 必須可查詢及新增資料；industry_name 必須是非空白產業名稱。
    函式效果：
        查無同名產業時加入一筆 Industry 至目前交易並 flush，但不自行提交。
    輸出結果：
        回傳既有或新建的 Industry；資料庫錯誤向外傳遞。
    """
    industry = db_session.scalar(
        select(Industry).where(Industry.industry_name == industry_name)
    )
    if industry is None:
        industry = Industry(industry_name=industry_name)
        db_session.add(industry)
        db_session.flush()
    return industry


def _create_missing_act_industries(
    db_session: Session,
    act: Act,
    industry_names: tuple[str, ...],
) -> int:
    """建立法規缺少的產業關聯。

    輸入契約：
        db_session 必須可讀寫；act 必須已持久化並具有 act_id；industry_names 可為空，
        且可包含同一法規所屬的複數產業名稱。
    函式效果：
        取得或建立產業主檔，並將尚不存在的 ActIndustry 加入目前交易；不自行提交。
    輸出結果：
        回傳實際新增的法規產業關聯數；資料庫錯誤向外傳遞。
    """
    created_count = 0
    for industry_name in dict.fromkeys(industry_names):
        industry = _get_or_create_industry(db_session, industry_name)
        relation_exists = db_session.scalar(
            select(ActIndustry.act_id).where(
                ActIndustry.act_id == act.act_id,
                ActIndustry.industry_id == industry.industry_id,
            )
        )
        if relation_exists is not None:
            continue
        db_session.add(ActIndustry(act_id=act.act_id, industry_id=industry.industry_id))
        created_count += 1
    return created_count


def _event_exists(
    db_session: Session,
    act_id: int,
    change: ArticleChange,
    previous_version_id: str,
    current_version_id: str,
) -> bool:
    """判斷相同法規版本差異是否已保存。

    輸入契約：
        db_session 必須可查詢；其餘參數須完整描述一筆候選事件。
    函式效果：
        僅查詢資料庫，不修改資料。
    輸出結果：
        已有相同法規、條號、類型及前後版本事件時回傳 True，否則回傳 False。
    """
    statement = select(ActChangeEvent.act_change_event_id).where(
        ActChangeEvent.act_id == act_id,
        ActChangeEvent.article == change.article,
        ActChangeEvent.change_type == change.change_type,
        ActChangeEvent.last_version_id == previous_version_id,
        ActChangeEvent.new_version_id == current_version_id,
    )
    return db_session.scalar(statement) is not None


def trigger_act_change_events(
    db_session: Session,
    previous_data_path: Path = DEFAULT_PREVIOUS_DATA_PATH,
    current_data_path: Path = DEFAULT_CURRENT_DATA_PATH,
) -> dict[str, object]:
    """比對測試資料的沿革差異並保存法規異動事件。

    輸入契約：
        db_session 必須為可寫入的 SQLAlchemy Session；兩個路徑必須是前後版本 XML。
    函式效果：
        僅針對前後皆存在且沿革內容不同的法規比較條文，建立法規主檔與未重複的
        ActChangeEvent，並依測試資料固定對照建立可為複數的 ActIndustry；所有資料在
        同一交易提交，失敗時回滾。
    輸出結果：
        回傳 success 狀態、沿革異動法規數、偵測事件數、實際新增事件數及新增產業
        關聯數；
        檔案、XML、日期或資料庫錯誤會在回滾後向外傳遞。
    """
    try:
        previous_laws = load_law_versions(previous_data_path)
        current_laws = load_law_versions(current_data_path)
        changed_law_count = 0
        detected_event_count = 0
        created_event_count = 0
        created_industry_relation_count = 0

        for act_name in sorted(previous_laws.keys() & current_laws.keys()):
            previous = previous_laws[act_name]
            current = current_laws[act_name]
            changes = compare_law_versions(previous, current)
            if not changes:
                continue
            changed_law_count += 1
            detected_event_count += len(changes)
            act = _get_or_create_act(db_session, act_name)
            created_industry_relation_count += _create_missing_act_industries(
                db_session,
                act,
                TEST_ACT_INDUSTRIES.get(act_name, ()),
            )
            for change in changes:
                if _event_exists(
                    db_session,
                    act.act_id,
                    change,
                    previous.version_id,
                    current.version_id,
                ):
                    continue
                db_session.add(
                    ActChangeEvent(
                        act_id=act.act_id,
                        article=change.article,
                        change_type=change.change_type,
                        last_version_id=previous.version_id,
                        new_version_id=current.version_id,
                        event_date=_format_event_date(current.version_id),
                    )
                )
                created_event_count += 1
        db_session.commit()
    except Exception:
        db_session.rollback()
        raise

    return {
        "status": "success",
        "changed_law_count": changed_law_count,
        "detected_event_count": detected_event_count,
        "created_event_count": created_event_count,
        "created_industry_relation_count": created_industry_relation_count,
    }
