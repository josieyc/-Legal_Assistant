"""離線產生測試公司內規的預先計算語意向量。"""

from __future__ import annotations

import base64
import hashlib
import json
import struct
from pathlib import Path

from sentence_transformers import SentenceTransformer

from Backend.controllers.firm_policy_import_controller import parse_firm_policy_xml


MODEL_NAME = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
BACKEND_DIR = Path(__file__).resolve().parents[1]
SOURCE_XML_PATH = BACKEND_DIR / "legal_data" / "測試資料_公司內規.xml"
OUTPUT_PATH = BACKEND_DIR / "legal_data" / "測試資料_公司內規.embeddings.json"


def generate_precomputed_embeddings(
    source_path: Path = SOURCE_XML_PATH,
    output_path: Path = OUTPUT_PATH,
) -> int:
    """產生指定公司內規 XML 的預先計算向量資料檔。

    輸入契約：
        source_path 必須是符合公司內規格式的 XML；output_path 必須是可寫入的
        JSON 路徑，且父目錄必須存在。
    函式效果：
        載入 Sentence Transformer，將所有條文批次轉成正規化語意向量，並覆寫
        output_path。可能下載模型及寫入 Hugging Face 快取。
    輸出結果：
        回傳寫入的條文筆數；XML、模型載入、推論或檔案錯誤向外傳遞。
    """
    parsed_policy = parse_firm_policy_xml(Path(source_path).read_bytes())
    model = SentenceTransformer(MODEL_NAME)
    contexts = [article.context for article in parsed_policy.articles]
    vectors = model.encode(
        contexts,
        normalize_embeddings=True,
        convert_to_numpy=True,
    )

    entries: list[dict[str, object]] = []
    for article, vector in zip(parsed_policy.articles, vectors, strict=True):
        float_vector = tuple(float(value) for value in vector)
        embedding = struct.pack(f"<{len(float_vector)}f", *float_vector)
        entries.append(
            {
                "article": article.article,
                "context_sha256": hashlib.sha256(
                    article.context.strip().encode("utf-8")
                ).hexdigest(),
                "embedding_base64": base64.b64encode(embedding).decode("ascii"),
            }
        )

    payload = {
        "model": MODEL_NAME,
        "dimensions": len(vectors[0]),
        "policy_name": parsed_policy.name,
        "articles": entries,
    }
    Path(output_path).write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return len(entries)


def main() -> int:
    """執行預先計算向量資料檔的離線重建。

    輸入契約：
        不接受參數；使用模組常數指定的範例 XML 與輸出路徑。
    函式效果：
        呼叫 generate_precomputed_embeddings 並輸出完成摘要。
    輸出結果：
        成功時回傳 0；失敗時例外向外傳遞。
    """
    article_count = generate_precomputed_embeddings()
    print(f"已產生 {article_count} 筆條文向量：{OUTPUT_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
