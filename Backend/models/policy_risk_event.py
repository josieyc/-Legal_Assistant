"""政策風險事件 ORM 模型。"""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Index, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from Backend.models.base import Base

if TYPE_CHECKING:
    from Backend.models.act_change_event import ActChangeEvent
    from Backend.models.core import User


class PolicyRiskEvent(Base):
    """法規異動衍生的政策風險與處理狀態。"""

    __tablename__ = "policy_risk_event"
    __table_args__ = (
        Index("idx_policy_risk_event_act_change_event_id", "act_change_event_id"),
        Index("idx_policy_risk_event_policy_id", "policy_id"),
        Index("idx_policy_risk_event_person_in_charge", "person_in_charge"),
    )

    risk_event_id: Mapped[int] = mapped_column(primary_key=True)
    act_change_event_id: Mapped[int] = mapped_column(
        ForeignKey(
            "act_change_event.act_change_event_id",
            onupdate="CASCADE",
            ondelete="RESTRICT",
        ),
        nullable=False,
    )
    # firm_policy 尚未建置，因此只保留 nullable 欄位，暫不宣告外鍵與 relationship。
    policy_id: Mapped[int | None] = mapped_column(nullable=True)
    person_in_charge: Mapped[int | None] = mapped_column(
        ForeignKey("user.user_id", onupdate="CASCADE", ondelete="SET NULL"),
        nullable=True,
    )
    obligation_intensity: Mapped[str | None] = mapped_column(Text, nullable=True)
    deadline: Mapped[str | None] = mapped_column(Text, nullable=True)
    state: Mapped[str] = mapped_column(Text, nullable=False)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    suggest_next_step: Mapped[str | None] = mapped_column(Text, nullable=True)
    suggest_due_date: Mapped[str | None] = mapped_column(Text, nullable=True)
    create_at: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        server_default=func.current_timestamp(),
    )

    act_change_event: Mapped[ActChangeEvent] = relationship(
        back_populates="risk_events"
    )
    person_in_charge_user: Mapped[User | None] = relationship(
        back_populates="assigned_risk_events"
    )
