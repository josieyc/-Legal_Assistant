"""政策風險事件操作歷程 ORM 模型。"""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, ForeignKey, Index, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from Backend.models.base import Base

if TYPE_CHECKING:
    from Backend.models.core import User
    from Backend.models.policy_risk_event import PolicyRiskEvent


class PolicyRiskEventLog(Base):
    """政策風險事件的狀態變更與操作稽核紀錄。"""

    __tablename__ = "policy_risk_event_log"
    __table_args__ = (
        Index("idx_policy_risk_event_log_risk_event_id", "risk_event_id"),
        Index("idx_policy_risk_event_log_actor_id", "actor_id"),
        CheckConstraint(
            "from_state IN ('Pending', 'InReview', 'Reviewed', "
            "'ReanalysisRequired', 'Closed')",
            name="ck_policy_risk_event_log_from_state",
        ),
        CheckConstraint(
            "to_state IN ('Pending', 'InReview', 'Reviewed', "
            "'ReanalysisRequired', 'Closed')",
            name="ck_policy_risk_event_log_to_state",
        ),
    )

    risk_event_log_id: Mapped[int] = mapped_column(primary_key=True)
    risk_event_id: Mapped[int] = mapped_column(
        ForeignKey(
            "policy_risk_event.risk_event_id",
            onupdate="CASCADE",
            ondelete="CASCADE",
        ),
        nullable=False,
    )
    action: Mapped[str] = mapped_column(Text, nullable=False)
    actor_id: Mapped[int | None] = mapped_column(
        ForeignKey("user.user_id", onupdate="CASCADE", ondelete="SET NULL"),
        nullable=True,
    )
    from_state: Mapped[str | None] = mapped_column(Text, nullable=True)
    to_state: Mapped[str | None] = mapped_column(Text, nullable=True)
    detail: Mapped[str | None] = mapped_column(Text, nullable=True)
    changes: Mapped[str | None] = mapped_column(Text, nullable=True)
    create_at: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        server_default=func.current_timestamp(),
    )

    risk_event: Mapped[PolicyRiskEvent] = relationship(back_populates="logs")
    actor: Mapped[User | None] = relationship(back_populates="risk_event_logs")
