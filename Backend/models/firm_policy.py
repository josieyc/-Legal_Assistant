"""公司內規、條文與修改紀錄 ORM 模型。"""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Index, LargeBinary, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from Backend.models.base import Base

if TYPE_CHECKING:
    from Backend.models.policy_risk_event import PolicyRiskEvent


class FirmPolicy(Base):
    """公司內規主檔。"""

    __tablename__ = "firm_policy"

    policy_id: Mapped[int] = mapped_column(primary_key=True)
    policy_name: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        server_default=func.current_timestamp(),
    )
    updated_at: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        server_default=func.current_timestamp(),
    )

    articles: Mapped[list[FirmPolicyArticle]] = relationship(
        back_populates="policy",
        cascade="all, delete-orphan",
    )
    change_records: Mapped[list[FirmPolicyChangeRecord]] = relationship(
        back_populates="policy",
    )
    risk_events: Mapped[list[PolicyRiskEvent]] = relationship(
        back_populates="policy",
    )


class FirmPolicyArticle(Base):
    """公司內規條文。"""

    __tablename__ = "firm_policy_article"
    __table_args__ = (Index("idx_firm_policy_article_policy_id", "policy_id"),)

    policy_article_id: Mapped[int] = mapped_column(primary_key=True)
    policy_id: Mapped[int] = mapped_column(
        ForeignKey("firm_policy.policy_id", onupdate="CASCADE", ondelete="CASCADE"),
        nullable=False,
    )
    article: Mapped[int | None] = mapped_column(nullable=True)
    paragraph: Mapped[int | None] = mapped_column(nullable=True)
    subparagraph: Mapped[int | None] = mapped_column(nullable=True)
    item: Mapped[int | None] = mapped_column(nullable=True)
    context: Mapped[str] = mapped_column(Text, nullable=False)
    embedding: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)

    policy: Mapped[FirmPolicy] = relationship(back_populates="articles")
    change_records: Mapped[list[FirmPolicyChangeRecord]] = relationship(
        back_populates="policy_article",
    )
    risk_events: Mapped[list[PolicyRiskEvent]] = relationship(
        back_populates="policy_article",
    )


class FirmPolicyChangeRecord(Base):
    """公司內規修改紀錄。"""

    __tablename__ = "firm_policy_change_record"
    __table_args__ = (
        Index("idx_firm_policy_change_record_risk_event_id", "risk_event_id"),
        Index("idx_firm_policy_change_record_policy_id", "policy_id"),
        Index(
            "idx_firm_policy_change_record_policy_article_id",
            "policy_article_id",
        ),
    )

    policy_change_id: Mapped[int] = mapped_column(primary_key=True)
    risk_event_id: Mapped[int | None] = mapped_column(
        ForeignKey(
            "policy_risk_event.risk_event_id",
            onupdate="CASCADE",
            ondelete="SET NULL",
        ),
        nullable=True,
    )
    policy_id: Mapped[int] = mapped_column(
        ForeignKey("firm_policy.policy_id", onupdate="CASCADE", ondelete="RESTRICT"),
        nullable=False,
    )
    policy_article_id: Mapped[int | None] = mapped_column(
        ForeignKey(
            "firm_policy_article.policy_article_id",
            onupdate="CASCADE",
            ondelete="SET NULL",
        ),
        nullable=True,
    )
    old_context: Mapped[str | None] = mapped_column(Text, nullable=True)
    new_context: Mapped[str | None] = mapped_column(Text, nullable=True)
    change_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    change_at: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        server_default=func.current_timestamp(),
    )

    risk_event: Mapped[PolicyRiskEvent | None] = relationship(
        back_populates="policy_change_records"
    )
    policy: Mapped[FirmPolicy] = relationship(back_populates="change_records")
    policy_article: Mapped[FirmPolicyArticle | None] = relationship(
        back_populates="change_records"
    )
