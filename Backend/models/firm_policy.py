"""公司內規、版本、條文、關聯與修改紀錄 ORM 模型。"""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Index, LargeBinary, Text, UniqueConstraint, func
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
    created_at: Mapped[str] = mapped_column(Text, nullable=False, server_default=func.current_timestamp())
    current_version_id: Mapped[int | None] = mapped_column(
        ForeignKey("firm_policy_version.policy_version_id", onupdate="CASCADE", ondelete="SET NULL", use_alter=True),
        nullable=True,
    )

    versions: Mapped[list[FirmPolicyVersion]] = relationship(
        back_populates="policy", cascade="all, delete-orphan", foreign_keys="FirmPolicyVersion.policy_id"
    )
    current_version: Mapped[FirmPolicyVersion | None] = relationship(
        foreign_keys=[current_version_id], post_update=True
    )
    risk_events: Mapped[list[PolicyRiskEvent]] = relationship(back_populates="policy")
    relative_links: Mapped[list[FirmPolicyRelative]] = relationship(
        back_populates="policy", cascade="all, delete-orphan", foreign_keys="FirmPolicyRelative.policy_id"
    )
    referenced_by_links: Mapped[list[FirmPolicyRelative]] = relationship(
        back_populates="relative_policy", cascade="all, delete-orphan", foreign_keys="FirmPolicyRelative.relative_policy_id"
    )


class FirmPolicyVersion(Base):
    """公司內規的可追溯版本。"""

    __tablename__ = "firm_policy_version"
    __table_args__ = (
        UniqueConstraint("policy_id", "version_no", name="uq_policy_version_no"),
        Index("idx_firm_policy_version_policy_id", "policy_id"),
        Index("idx_firm_policy_version_based_on_version_id", "based_on_version_id"),
    )

    policy_version_id: Mapped[int] = mapped_column(primary_key=True)
    policy_id: Mapped[int] = mapped_column(
        ForeignKey("firm_policy.policy_id", onupdate="CASCADE", ondelete="CASCADE"), nullable=False
    )
    version_no: Mapped[str] = mapped_column(Text, nullable=False)
    based_on_version_id: Mapped[int | None] = mapped_column(
        ForeignKey("firm_policy_version.policy_version_id", onupdate="CASCADE", ondelete="SET NULL"), nullable=True
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(Text, nullable=False)
    effective_at: Mapped[str | None] = mapped_column(Text, nullable=True)

    policy: Mapped[FirmPolicy] = relationship(back_populates="versions", foreign_keys=[policy_id])
    based_on_version: Mapped[FirmPolicyVersion | None] = relationship(
        remote_side=[policy_version_id], back_populates="derived_versions"
    )
    derived_versions: Mapped[list[FirmPolicyVersion]] = relationship(back_populates="based_on_version")
    articles: Mapped[list[FirmPolicyArticle]] = relationship(
        back_populates="policy_version", cascade="all, delete-orphan"
    )
    change_records: Mapped[list[FirmPolicyChangeRecord]] = relationship(back_populates="policy_version")


class FirmPolicyArticle(Base):
    """隸屬特定內規版本的條文。"""

    __tablename__ = "firm_policy_article"
    __table_args__ = (
        Index("idx_firm_policy_article_policy_version_id", "policy_version_id"),
        UniqueConstraint("policy_version_id", "article_key", name="uq_policy_version_article_key"),
    )

    policy_article_id: Mapped[int] = mapped_column(primary_key=True)
    policy_version_id: Mapped[int] = mapped_column(
        ForeignKey("firm_policy_version.policy_version_id", onupdate="CASCADE", ondelete="CASCADE"), nullable=False
    )
    article: Mapped[int | None] = mapped_column(nullable=True)
    paragraph: Mapped[int | None] = mapped_column(nullable=True)
    subparagraph: Mapped[int | None] = mapped_column(nullable=True)
    item: Mapped[int | None] = mapped_column(nullable=True)
    article_key: Mapped[str] = mapped_column(Text, nullable=False)
    context: Mapped[str] = mapped_column(Text, nullable=False)
    embedding: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)

    policy_version: Mapped[FirmPolicyVersion] = relationship(back_populates="articles")
    change_records: Mapped[list[FirmPolicyChangeRecord]] = relationship(back_populates="policy_article")
    risk_events: Mapped[list[PolicyRiskEvent]] = relationship(back_populates="policy_article")


class FirmPolicyRelative(Base):
    """公司內規之間的有向多對多關聯。"""

    __tablename__ = "firm_policy_relative"

    policy_id: Mapped[int] = mapped_column(
        ForeignKey("firm_policy.policy_id", onupdate="CASCADE", ondelete="CASCADE"), primary_key=True
    )
    relative_policy_id: Mapped[int] = mapped_column(
        ForeignKey("firm_policy.policy_id", onupdate="CASCADE", ondelete="CASCADE"), primary_key=True
    )

    policy: Mapped[FirmPolicy] = relationship(back_populates="relative_links", foreign_keys=[policy_id])
    relative_policy: Mapped[FirmPolicy] = relationship(
        back_populates="referenced_by_links", foreign_keys=[relative_policy_id]
    )


class FirmPolicyChangeRecord(Base):
    """公司內規條文的修改紀錄。"""

    __tablename__ = "firm_policy_change_record"
    __table_args__ = (
        Index("idx_firm_policy_change_record_risk_event_id", "risk_event_id"),
        Index("idx_firm_policy_change_record_policy_version_id", "policy_version_id"),
        Index("idx_firm_policy_change_record_policy_article_id", "policy_article_id"),
    )

    policy_change_id: Mapped[int] = mapped_column(primary_key=True)
    risk_event_id: Mapped[int | None] = mapped_column(
        ForeignKey("policy_risk_event.risk_event_id", onupdate="CASCADE", ondelete="SET NULL"), nullable=True
    )
    policy_version_id: Mapped[int] = mapped_column(
        ForeignKey("firm_policy_version.policy_version_id", onupdate="CASCADE", ondelete="RESTRICT"), nullable=False
    )
    policy_article_id: Mapped[int | None] = mapped_column(
        ForeignKey("firm_policy_article.policy_article_id", onupdate="CASCADE", ondelete="SET NULL"), nullable=True
    )
    old_context: Mapped[str | None] = mapped_column(Text, nullable=True)
    new_context: Mapped[str | None] = mapped_column(Text, nullable=True)
    change_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    change_at: Mapped[str] = mapped_column(Text, nullable=False, server_default=func.current_timestamp())

    risk_event: Mapped[PolicyRiskEvent | None] = relationship(back_populates="policy_change_records")
    policy_version: Mapped[FirmPolicyVersion] = relationship(back_populates="change_records")
    policy_article: Mapped[FirmPolicyArticle | None] = relationship(back_populates="change_records")
