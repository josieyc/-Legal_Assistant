"""測試 main 模組的測試資料 API 編排流程。"""

from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import MagicMock, call

from Backend.utils.test_data_flow import run_test_data_flow


class MainTestDataFlowTests(unittest.TestCase):
    """驗證測試資料端點的呼叫順序與上傳內容。"""

    def test_calls_all_endpoints_in_order_and_uploads_xml(self) -> None:
        """應依指定順序呼叫三個端點並以 xml_file 上傳檔案。"""
        with TemporaryDirectory() as temporary_directory:
            xml_path = Path(temporary_directory) / "公司內規.xml"
            xml_path.write_bytes(b"<LAWS />")
            client = MagicMock()
            responses = [MagicMock(), MagicMock(), MagicMock()]
            for index, response in enumerate(responses):
                response.json.return_value = {"step": index + 1}
            client.get.return_value = responses[0]
            client.post.side_effect = responses[1:]
            progress_messages: list[str] = []

            results = run_test_data_flow(client, xml_path, progress_messages.append)

            self.assertEqual([{"step": 1}, {"step": 2}, {"step": 3}], results)
            self.assertEqual([call("/act/act_change_event")], client.get.call_args_list)
            self.assertEqual("/act/firm-policy/import", client.post.call_args_list[0].args[0])
            uploaded_file = client.post.call_args_list[0].kwargs["files"]["xml_file"]
            self.assertEqual("公司內規.xml", uploaded_file[0])
            self.assertEqual("application/xml", uploaded_file[2])
            self.assertEqual(call("/act/policy_risk_event"), client.post.call_args_list[1])
            self.assertEqual(
                [
                    "已觸發路徑：GET /act/act_change_event",
                    "已觸發路徑：POST /act/firm-policy/import",
                    "已觸發路徑：POST /act/policy_risk_event",
                ],
                progress_messages,
            )
            for response in responses:
                response.raise_for_status.assert_called_once_with()

    def test_stops_when_first_request_fails(self) -> None:
        """第一個端點失敗時不應繼續呼叫後續端點。"""
        client = MagicMock()
        client.get.return_value.raise_for_status.side_effect = RuntimeError("failed")

        with self.assertRaisesRegex(RuntimeError, "failed"):
            run_test_data_flow(client)

        client.post.assert_not_called()


if __name__ == "__main__":
    unittest.main()
