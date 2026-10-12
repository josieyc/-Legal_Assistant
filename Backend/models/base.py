"""所有 ORM 模型共用的 SQLAlchemy declarative base。"""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """集中保存本專案 ORM 資料表的 metadata。"""

