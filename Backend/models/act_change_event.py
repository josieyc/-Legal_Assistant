"""法規異動事件 ORM 模型。"""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Index, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from Backend.models.base import Base

if TYPE_CHECKING:
    from Backend.models.core import Act
    from Backend.models.policy_risk_event import PolicyRiskEvent


class ActChangeEvent(Base):
    """記錄法規條文與版本的異動事件。"""

    __tablename__ = "act_change_event"
    __table_args__ = (
        Index("idx_act_change_event_act_id", "act_id"),
        Index("idx_act_change_event_event_date", "event_date"),
    )

    act_change_event_id: Mapped[int] = mapped_column(primary_key=True)
    act_id: Mapped[int] = mapped_column(
        ForeignKey("act.act_id", onupdate="CASCADE", ondelete="RESTRICT"),
        nullable=False,
    )
    article: Mapped[int | None] = mapped_column(nullable=True)
    paragraph: Mapped[int | None] = mapped_column(nullable=True)
    subparagraph: Mapped[int | None] = mapped_column(nullable=True)
    item: Mapped[int | None] = mapped_column(nullable=True)
    penalty: Mapped[str | None] = mapped_column(Text, nullable=True)
    change_type: Mapped[str] = mapped_column(Text, nullable=False)
    last_version_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    new_version_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    event_date: Mapped[str] = mapped_column(Text, nullable=False)

    act: Mapped[Act] = relationship(back_populates="change_events")
    risk_events: Mapped[list[PolicyRiskEvent]] = relationship(
        back_populates="act_change_event",
    )
