"""查找公司內規條文預先計算的語意向量。"""

from __future__ import annotations

import base64
import hashlib
import json
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path


PRECOMPUTED_EMBEDDINGS_PATH = (
    Path(__file__).resolve().parents[1]
    / "legal_data"
    / "測試資料_公司內規.embeddings.json"
)


@dataclass(frozen=True)
class PrecomputedEmbedding:
    """一筆條文與預先計算向量的比對資料。"""

    article: int
    context_sha256: str
    embedding: bytes


@lru_cache(maxsize=1)
def load_precomputed_embeddings() -> tuple[PrecomputedEmbedding, ...]:
    """載入測試公司內規的預先計算向量。

    輸入契約：
        不接受參數；PRECOMPUTED_EMBEDDINGS_PATH 必須是有效的 UTF-8 JSON，且
        每筆條文包含條號、內文摘要及 base64 編碼向量。
    函式效果：
        首次呼叫讀取資料檔並快取結果；不執行模型推論或修改檔案。
    輸出結果：
        回傳不可變的 PrecomputedEmbedding tuple；檔案或資料格式錯誤時拋出
        FileNotFoundError、JSONDecodeError、KeyError、TypeError 或 ValueError。
    """
    payload = json.loads(PRECOMPUTED_EMBEDDINGS_PATH.read_text(encoding="utf-8"))
    dimensions = int(payload["dimensions"])
    entries: list[PrecomputedEmbedding] = []
    for item in payload["articles"]:
        embedding = base64.b64decode(item["embedding_base64"], validate=True)
        if len(embedding) != dimensions * 4:
            raise ValueError(f"第 {item['article']} 條的預先計算向量長度不正確")
        entries.append(
            PrecomputedEmbedding(
                article=int(item["article"]),
                context_sha256=str(item["context_sha256"]),
                embedding=embedding,
            )
        )
    return tuple(entries)


def vectorize_policy_article(article: int, context: str) -> bytes:
    """比對並回傳公司內規條文預先計算的語意向量。

    輸入契約：
        article 必須是正整數條號；context 必須是非空條文，且內容須與
        「測試資料_公司內規.xml」的相同條號一致（忽略首尾空白）。
    函式效果：
        逐筆比對條號與內文 SHA-256，只讀取已計算的固定資料；不載入模型、
        不執行向量推論，也不修改外部狀態。
    輸出結果：
        命中時回傳預先計算的 384 維 float32 BLOB；輸入不合法或找不到完全
        相符的條文時拋出 ValueError。
    """
    normalized_context = context.strip()
    if article <= 0 or not normalized_context:
        raise ValueError("條號必須是正整數，且條文內容不可為空")

    context_digest = hashlib.sha256(normalized_context.encode("utf-8")).hexdigest()
    for precomputed in load_precomputed_embeddings():
        if (
            article == precomputed.article
            and context_digest == precomputed.context_sha256
        ):
            return precomputed.embedding

    raise ValueError(f"第 {article} 條沒有相符的預先計算向量")
