"""版本識別碼與來源 XML 的對照模型。"""

from __future__ import annotations

from sqlalchemy import Text
from sqlalchemy.orm import Mapped, mapped_column

from Backend.models.base import Base

class ActVersion(Base):
    """以全域唯一的 version_id 定位 legal_data 中的來源 XML。"""

    __tablename__ = "act_version"

    version_id: Mapped[str] = mapped_column(Text, primary_key=True)
    source_xml: Mapped[str] = mapped_column(Text, nullable=False)
