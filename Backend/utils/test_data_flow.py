"""透過 FastAPI 端點建立開發環境所需的測試資料。"""

from pathlib import Path
from collections.abc import Callable

from fastapi.testclient import TestClient


BACKEND_DIR = Path(__file__).resolve().parent.parent
TEST_POLICY_XML_FILE = BACKEND_DIR / "legal_data" / "測試資料_公司內規.xml"
TEST_DATA_ENDPOINTS = (
    "GET /act/act_change_event",
    "POST /act/firm-policy/import",
    "POST /act/policy_risk_event",
)


def run_test_data_flow(
    client: TestClient,
    policy_xml_path: Path = TEST_POLICY_XML_FILE,
    progress_callback: Callable[[str], None] | None = None,
) -> list[dict[str, object]]:
    """依序透過 API 建立測試用法規與內規資料。

    輸入契約：
        client 必須是可呼叫後端 FastAPI app 的 TestClient；policy_xml_path
        必須指向可讀取的公司內規 XML 檔案；progress_callback
        可為接收單一進度文字的函式，未提供時不輸出進度。
    函式效果：
        依序呼叫 GET /act/act_change_event、POST /act/firm-policy/import
        與 POST /act/policy_risk_event；各請求可寫入測試資料庫。若有提供
        progress_callback，每個端點成功後會傳入一則進度文字。
    輸出結果：
        回傳三個 API 的 JSON 物件，順序與呼叫順序相同；檔案不存在時
        拋出 FileNotFoundError，API 回傳非成功狀態碼時拋出 httpx.HTTPStatusError。
    """
    responses = [client.get("/act/act_change_event")]
    responses[-1].raise_for_status()
    if progress_callback is not None:
        progress_callback(f"已觸發路徑：{TEST_DATA_ENDPOINTS[0]}")

    with policy_xml_path.open("rb") as policy_xml:
        responses.append(
            client.post(
                "/act/firm-policy/import",
                files={
                    "xml_file": (
                        policy_xml_path.name,
                        policy_xml,
                        "application/xml",
                    )
                },
            )
        )
    responses[-1].raise_for_status()
    if progress_callback is not None:
        progress_callback(f"已觸發路徑：{TEST_DATA_ENDPOINTS[1]}")

    responses.append(client.post("/act/policy_risk_event"))
    responses[-1].raise_for_status()
    if progress_callback is not None:
        progress_callback(f"已觸發路徑：{TEST_DATA_ENDPOINTS[2]}")
    return [response.json() for response in responses]
