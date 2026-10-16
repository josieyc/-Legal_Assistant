"""測試公司內規 XML 解析與 ORM 建立流程。"""

from __future__ import annotations

import unittest
import xml.etree.ElementTree as ElementTree
from pathlib import Path
import struct

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from Backend.controllers.firm_policy_import_controller import (
    build_firm_policy_orm,
    parse_firm_policy_xml,
    stage_firm_policy_import,
)
from Backend.controllers.firm_policy_embedding import vectorize_policy_article
from Backend.models import Base, FirmPolicy, FirmPolicyArticle


SAMPLE_XML_PATH = (
    Path(__file__).resolve().parents[1] / "legal_data" / "測試資料_公司內規.xml"
)


class FirmPolicyImportControllerTests(unittest.TestCase):
    """驗證公司內規 XML 解析及未提交 ORM 狀態。"""

    def test_parse_sample_xml_extracts_policy_and_articles(self) -> None:
        """確認範例 XML 可解析名稱、前言與全部二十條條文。"""
        parsed_policy = parse_firm_policy_xml(SAMPLE_XML_PATH.read_bytes())

        self.assertEqual("金融業務法令遵循作業規則", parsed_policy.name)
        self.assertIsNotNone(parsed_policy.description)
        self.assertEqual(20, len(parsed_policy.articles))
        self.assertEqual(1, parsed_policy.articles[0].article)
        self.assertIn("全體人員", parsed_policy.articles[0].context)

    def test_parse_rejects_malformed_xml(self) -> None:
        """確認格式錯誤的 XML 會回報解析例外。"""
        with self.assertRaises(ElementTree.ParseError):
            parse_firm_policy_xml(b"<LAWS><law></LAWS>")

    def test_parse_rejects_duplicate_article_numbers(self) -> None:
        """確認同一份內規不得出現重複條號。"""
        xml_content = """\
        <LAWS><法規><法規性質>公司內規</法規性質><法規名稱>測試內規</法規名稱>
        <法規內容>
          <條文><條號>第 1 條</條號><條文內容>甲</條文內容></條文>
          <條文><條號>第 1 條</條號><條文內容>乙</條文內容></條文>
        </法規內容></法規></LAWS>
        """.encode()

        with self.assertRaisesRegex(ValueError, "重複條號"):
            parse_firm_policy_xml(xml_content)

    def test_build_orm_creates_article_relationships(self) -> None:
        """確認解析結果會建立公司內規及條文 ORM 關聯。"""
        parsed_policy = parse_firm_policy_xml(SAMPLE_XML_PATH.read_bytes())
        policy = build_firm_policy_orm(parsed_policy)

        self.assertEqual(parsed_policy.name, policy.policy_name)
        self.assertEqual(20, len(policy.articles))
        self.assertIs(policy, policy.articles[0].policy)
        self.assertTrue(all(article.embedding for article in policy.articles))

    def test_vectorize_sample_article_returns_precomputed_embedding(self) -> None:
        """確認範例第一條會取得預先計算的 384 維語意向量。"""
        parsed_policy = parse_firm_policy_xml(SAMPLE_XML_PATH.read_bytes())
        first_article = parsed_policy.articles[0]

        embedding = vectorize_policy_article(
            first_article.article,
            first_article.context,
        )

        decoded_embedding = struct.unpack("<384f", embedding)
        self.assertEqual(384, len(decoded_embedding))
        vector_norm = sum(value * value for value in decoded_embedding) ** 0.5
        self.assertAlmostEqual(1.0, vector_norm, places=5)

    def test_vectorize_rejects_empty_article_content(self) -> None:
        """確認空白條文不會進行預先計算向量比對。"""
        with self.assertRaisesRegex(ValueError, "不可為空"):
            vectorize_policy_article(1, "   ")

    def test_vectorize_rejects_changed_article_content(self) -> None:
        """確認已修改的條文不會誤用原始條文向量。"""
        with self.assertRaisesRegex(ValueError, "沒有相符"):
            vectorize_policy_article(1, "這是已修改的第一條內容。")

    def test_stage_import_commits_policy_articles_and_embeddings(self) -> None:
        """確認匯入會提交主檔、條文及其 embedding。"""
        engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(engine)
        parsed_policy = parse_firm_policy_xml(SAMPLE_XML_PATH.read_bytes())

        with Session(engine) as session:
            policy = stage_firm_policy_import(session, parsed_policy)
            self.assertIsNotNone(policy.policy_id)
            self.assertNotIn(policy, session.new)

        with Session(engine) as verification_session:
            stored_policy = verification_session.scalar(select(FirmPolicy))
            stored_articles = verification_session.scalars(
                select(FirmPolicyArticle).order_by(FirmPolicyArticle.article)
            ).all()

            self.assertIsNotNone(stored_policy)
            self.assertEqual(20, len(stored_articles))
            self.assertTrue(all(article.embedding for article in stored_articles))
        engine.dispose()


if __name__ == "__main__":
    unittest.main()
