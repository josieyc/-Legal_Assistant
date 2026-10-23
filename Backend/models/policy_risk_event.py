"""政策風險事件 ORM 模型。"""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, ForeignKey, Index, Integer, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from Backend.models.base import Base

if TYPE_CHECKING:
    from Backend.models.act_change_event import ActChangeEvent
    from Backend.models.core import Department
    from Backend.models.firm_policy import (
        FirmPolicy,
        FirmPolicyArticle,
        FirmPolicyChangeRecord,
    )
    from Backend.models.policy_risk_event_log import PolicyRiskEventLog


class PolicyRiskEvent(Base):
    """法規異動衍生的政策風險與處理狀態。"""

    __tablename__ = "policy_risk_event"
    __table_args__ = (
        Index("idx_policy_risk_event_act_change_event_id", "act_change_event_id"),
        Index("idx_policy_risk_event_policy_id", "policy_id"),
        Index("idx_policy_risk_event_policy_article_id", "policy_article_id"),
        Index("idx_policy_risk_event_department_id", "department_id"),
        CheckConstraint(
            "confidence_level BETWEEN 0 AND 100",
            name="ck_policy_risk_event_confidence_level_percentage",
        ),
        CheckConstraint(
            "state IN ('Pending', 'InReview', 'Reviewed', "
            "'ReanalysisRequired', 'Closed')",
            name="ck_policy_risk_event_state",
        ),
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
    policy_id: Mapped[int | None] = mapped_column(
        ForeignKey("firm_policy.policy_id", onupdate="CASCADE", ondelete="SET NULL"),
        nullable=True,
    )
    policy_article_id: Mapped[int | None] = mapped_column(
        ForeignKey(
            "firm_policy_article.policy_article_id",
            onupdate="CASCADE",
            ondelete="SET NULL",
        ),
        nullable=True,
    )
    department_id: Mapped[int | None] = mapped_column(
        ForeignKey("department.department_id", onupdate="CASCADE", ondelete="SET NULL"),
        nullable=True,
    )
    obligation_intensity: Mapped[str | None] = mapped_column(Text, nullable=True)
    deadline: Mapped[str | None] = mapped_column(Text, nullable=True)
    topic: Mapped[str | None] = mapped_column(Text, nullable=True)
    state: Mapped[str] = mapped_column(Text, nullable=False)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    confidence_level: Mapped[int | None] = mapped_column(Integer, nullable=True)
    suggest_next_step: Mapped[str | None] = mapped_column(Text, nullable=True)
    suggest_due_date: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        server_default=func.current_timestamp(),
    )

    act_change_event: Mapped[ActChangeEvent] = relationship(
        back_populates="risk_events"
    )
    policy: Mapped[FirmPolicy | None] = relationship(back_populates="risk_events")
    policy_article: Mapped[FirmPolicyArticle | None] = relationship(
        back_populates="risk_events"
    )
    department: Mapped[Department | None] = relationship(
        back_populates="risk_events"
    )
    policy_change_records: Mapped[list[FirmPolicyChangeRecord]] = relationship(
        back_populates="risk_event"
    )
    logs: Mapped[list[PolicyRiskEventLog]] = relationship(
        back_populates="risk_event",
        cascade="all, delete-orphan",
    )
