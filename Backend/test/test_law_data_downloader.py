import tempfile
import unittest
import zipfile
from datetime import datetime
from pathlib import Path

from Backend.utils.law_data_downloader import (
    LAW_DATASET_URL,
    REGULAR_DATASET_URL,
    build_output_filename,
    download_all_legal_data,
    extract_zip,
    find_dataset_file,
    find_falv_file,
    parse_metadata_updated_at,
    parse_zip_url,
)


class LawDataDownloaderTest(unittest.TestCase):
    def test_parse_dataset_page(self):
        page = """
        <strong>詮釋資料更新時間</strong></div><div>2026-06-05 14:29</div>
        <a href="https://example.test/file?DType=XML&amp;AuData=CF"
           title="ZIP下載檔案">ZIP</a>
        """
        self.assertEqual(
            parse_metadata_updated_at(page), datetime(2026, 6, 5, 14, 29)
        )
        self.assertEqual(
            parse_zip_url(page, LAW_DATASET_URL),
            "https://example.test/file?DType=XML&AuData=CF",
        )

    def test_extract_find_and_name_falv(self):
        with tempfile.TemporaryDirectory() as temp_name:
            temp = Path(temp_name)
            archive_path = temp / "laws.zip"
            with zipfile.ZipFile(archive_path, "w") as archive:
                archive.writestr("nested/FalV.xml", "<laws />")

            extracted = extract_zip(archive_path, temp / "out")
            source = find_falv_file(extracted)
            self.assertEqual(source.name, "FalV.xml")
            self.assertEqual(
                build_output_filename(
                    datetime(2026, 6, 5, 14, 29), source, "法律"
                ),
                "2026-06-05 14-29法律.xml",
            )

    def test_find_command_dataset_file(self):
        with tempfile.TemporaryDirectory() as temp_name:
            command_file = Path(temp_name) / "MingLing.xml"
            command_file.write_text("<commands />", encoding="utf-8")
            self.assertEqual(
                find_dataset_file(Path(temp_name), "MingLing"), command_file
            )

    def test_main_entry_processes_both_datasets(self):
        from unittest.mock import patch

        law_path = Path("legal_data/law.xml")
        regular_path = Path("legal_data/regular.xml")
        with patch(
            "Backend.util.law_data_downloader.download_dataset",
            side_effect=(law_path, regular_path),
        ) as download:
            result = download_all_legal_data(output_dir="target", timeout=60)

        self.assertEqual(result, {"法律": law_path, "命令": regular_path})
        self.assertEqual(
            download.call_args_list[0].args,
            (LAW_DATASET_URL, "法律", "FalV", "target", 60),
        )
        self.assertEqual(
            download.call_args_list[1].args,
            (REGULAR_DATASET_URL, "命令", "MingLing", "target", 60),
        )

    def test_extract_rejects_path_traversal(self):
        with tempfile.TemporaryDirectory() as temp_name:
            temp = Path(temp_name)
            archive_path = temp / "unsafe.zip"
            with zipfile.ZipFile(archive_path, "w") as archive:
                archive.writestr("../FalV.xml", "bad")
            with self.assertRaises(ValueError):
                extract_zip(archive_path, temp / "out")


if __name__ == "__main__":
    unittest.main()
