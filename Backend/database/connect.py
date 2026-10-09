"""SQLAlchemy 的 SQLite 連線與 FastAPI session dependency。"""

from __future__ import annotations

from collections.abc import Generator
from pathlib import Path

from sqlalchemy import Engine, create_engine
from sqlalchemy.engine import URL
from sqlalchemy.orm import Session, sessionmaker

from Backend.database.init_db import DEFAULT_DB_PATH


def create_database_engine(
    db_path: Path = DEFAULT_DB_PATH,
    *,
    require_exists: bool = True,
) -> Engine:
    """建立連向 SQLite 檔案的 SQLAlchemy Engine。

    輸入契約：
        db_path 必須是 SQLite 資料庫檔案路徑；require_exists 為 True 時檔案必須已存在。
    函式效果：
        建立可重用的 SQLAlchemy Engine，不會在此階段實際開啟資料庫連線。
        SQLite 連線可跨執行緒使用，以相容 FastAPI 的 request 處理方式。
    輸出結果：
        回傳 sqlalchemy.Engine；路徑不是檔案或必要檔案不存在時拋出 FileNotFoundError。
    """
    resolved_path = Path(db_path).resolve()
    if require_exists and not resolved_path.is_file():
        raise FileNotFoundError(f"SQLite 資料庫不存在：{resolved_path}")
    if resolved_path.exists() and not resolved_path.is_file():
        raise FileNotFoundError(f"SQLite 資料庫路徑不是檔案：{resolved_path}")

    database_url = URL.create("sqlite", database=resolved_path.as_posix())
    return create_engine(
        database_url,
        connect_args={"check_same_thread": False},
    )


def create_session_factory(engine: Engine) -> sessionmaker[Session]:
    """建立綁定指定 Engine 的 SQLAlchemy session factory。

    輸入契約：
        engine 必須是已建立的 SQLAlchemy Engine。
    函式效果：
        建立 sessionmaker；不會開啟連線、交易或修改資料庫。
    輸出結果：
        回傳產生 SQLAlchemy Session 的 sessionmaker。
    """
    return sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


# Engine 與 factory 應在應用程序內重用；Engine 建立本身不會連線或建立 SQLite 檔案。
engine = create_database_engine(DEFAULT_DB_PATH, require_exists=False)
SessionLocal = create_session_factory(engine)


def get_db_session() -> Generator[Session, None, None]:
    """提供一個 request 專用的 SQLAlchemy Session。

    輸入契約：
        不接受參數；預設 SQLite 資料庫應先由 init_db.py 建立。
    函式效果：
        建立並 yield 一個 Session。request 發生例外時回滾未完成交易，
        無論成功或失敗都會關閉 Session；成功時不會自動 commit。
    輸出結果：
        yield SQLAlchemy Session，可直接用於 FastAPI Depends(get_db_session)；
        request 內發生的例外會在回滾後繼續向外傳遞。
    """
    session = SessionLocal()
    try:
        yield session
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
