"""法規、產業、部門與使用者等核心主檔模型。"""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Index, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from Backend.models.base import Base

if TYPE_CHECKING:
    from Backend.models.act_change_event import ActChangeEvent
    from Backend.models.associations import ActIndustry, UserIndustry
    from Backend.models.policy_risk_event import PolicyRiskEvent
    from Backend.models.policy_risk_event_log import PolicyRiskEventLog


class Act(Base):
    """法規主檔。"""

    __tablename__ = "act"

    act_id: Mapped[int] = mapped_column(primary_key=True)
    act_name: Mapped[str] = mapped_column(Text, nullable=False)

    industry_links: Mapped[list[ActIndustry]] = relationship(
        back_populates="act",
        cascade="all, delete-orphan",
    )
    change_events: Mapped[list[ActChangeEvent]] = relationship(
        back_populates="act",
    )


class Industry(Base):
    """產業主檔。"""

    __tablename__ = "industry"

    industry_id: Mapped[int] = mapped_column(primary_key=True)
    industry_name: Mapped[str] = mapped_column(Text, nullable=False)

    act_links: Mapped[list[ActIndustry]] = relationship(
        back_populates="industry",
        cascade="all, delete-orphan",
    )
    user_links: Mapped[list[UserIndustry]] = relationship(
        back_populates="industry",
        cascade="all, delete-orphan",
    )


class Department(Base):
    """部門主檔。"""

    __tablename__ = "department"

    department_id: Mapped[int] = mapped_column(primary_key=True)
    department_name: Mapped[str] = mapped_column(Text, nullable=False)

    users: Mapped[list[User]] = relationship(back_populates="department")
    risk_events: Mapped[list[PolicyRiskEvent]] = relationship(
        back_populates="department"
    )


class User(Base):
    """系統使用者。"""

    __tablename__ = "user"
    __table_args__ = (Index("idx_user_department_id", "department_id"),)

    user_id: Mapped[int] = mapped_column(primary_key=True)
    user_name: Mapped[str] = mapped_column(Text, nullable=False)
    department_id: Mapped[int | None] = mapped_column(
        ForeignKey(
            "department.department_id",
            onupdate="CASCADE",
            ondelete="SET NULL",
        ),
        nullable=True,
    )

    department: Mapped[Department | None] = relationship(back_populates="users")
    industry_links: Mapped[list[UserIndustry]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    risk_event_logs: Mapped[list[PolicyRiskEventLog]] = relationship(
        back_populates="actor"
    )
