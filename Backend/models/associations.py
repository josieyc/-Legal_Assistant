"""法規、使用者與產業之間的多對多關聯模型。"""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from Backend.models.base import Base

if TYPE_CHECKING:
    from Backend.models.core import Act, Industry, User


class ActIndustry(Base):
    """法規與產業的複合主鍵關聯。"""

    __tablename__ = "act_industry"
    __table_args__ = (Index("idx_act_industry_industry_id", "industry_id"),)

    act_id: Mapped[int] = mapped_column(
        ForeignKey("act.act_id", onupdate="CASCADE", ondelete="CASCADE"),
        primary_key=True,
    )
    industry_id: Mapped[int] = mapped_column(
        ForeignKey(
            "industry.industry_id",
            onupdate="CASCADE",
            ondelete="CASCADE",
        ),
        primary_key=True,
    )

    act: Mapped[Act] = relationship(back_populates="industry_links")
    industry: Mapped[Industry] = relationship(back_populates="act_links")


class UserIndustry(Base):
    """使用者與產業的複合主鍵關聯。"""

    __tablename__ = "user_industry"
    __table_args__ = (Index("idx_user_industry_user_id", "user_id"),)

    industry_id: Mapped[int] = mapped_column(
        ForeignKey(
            "industry.industry_id",
            onupdate="CASCADE",
            ondelete="CASCADE",
        ),
        primary_key=True,
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("user.user_id", onupdate="CASCADE", ondelete="CASCADE"),
        primary_key=True,
    )

    industry: Mapped[Industry] = relationship(back_populates="user_links")
    user: Mapped[User] = relationship(back_populates="industry_links")
