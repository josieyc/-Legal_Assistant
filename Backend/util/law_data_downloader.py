from __future__ import annotations

import html
import re
import shutil
import tempfile
import urllib.parse
import urllib.request
import zipfile
from datetime import datetime
from pathlib import Path


DEFAULT_OUTPUT_DIR = Path(__file__).resolve().parents[1] / "legal_data"
LAW_DATASET_URL = "https://data.gov.tw/dataset/18289"
REGULAR_DATASET_URL = "https://data.gov.tw/dataset/18290"
DATASETS = (
    (LAW_DATASET_URL, "法律", "FalV"),
    (REGULAR_DATASET_URL, "命令", "MingLing"),
)

USER_AGENT = "Legal-Assistant/1.0"

def fetch_dataset_page(dataset_url: str, timeout: int = 30) -> str:
    """Fetch and decode the dataset web page."""
    request = urllib.request.Request(dataset_url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=timeout) as response:
        charset = response.headers.get_content_charset() or "utf-8"
        return response.read().decode(charset, errors="replace")


def parse_metadata_updated_at(page_html: str) -> datetime:
    """Extract the displayed '詮釋資料更新時間' from the dataset page."""
    match = re.search(
        r"詮釋資料更新時間.*?(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})",
        page_html,
        flags=re.DOTALL,
    )
    if not match:
        raise ValueError("找不到詮釋資料更新時間")
    return datetime.strptime(match.group(1), "%Y-%m-%d %H:%M")


def parse_zip_url(page_html: str, dataset_url: str) -> str:
    """Extract the ZIP resource URL from the dataset page."""
    patterns = (
        r'<a[^>]+href=["\']([^"\']+)["\'][^>]+title=["\'][^"\']*ZIP[^"\']*["\']',
        r'"encodingFormat"\s*:\s*"ZIP".*?"contentUrl"\s*:\s*"([^"]+)"',
    )
    for pattern in patterns:
        match = re.search(pattern, page_html, flags=re.IGNORECASE | re.DOTALL)
        if match:
            return urllib.parse.urljoin(dataset_url, html.unescape(match.group(1)))
    raise ValueError("找不到 ZIP 下載網址")


def download_zip(zip_url: str, destination: Path, timeout: int = 120) -> Path:
    """Download the ZIP resource to ``destination``."""
    destination.parent.mkdir(parents=True, exist_ok=True)
    request = urllib.request.Request(zip_url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=timeout) as response:
        with destination.open("wb") as output:
            shutil.copyfileobj(response, output)

    if not zipfile.is_zipfile(destination):
        raise ValueError("下載內容不是有效的 ZIP 檔案")
    return destination


def extract_zip(zip_path: Path, destination: Path) -> Path:
    """Safely extract a ZIP archive and return the extraction directory."""
    destination.mkdir(parents=True, exist_ok=True)
    destination_root = destination.resolve()
    with zipfile.ZipFile(zip_path) as archive:
        for member in archive.infolist():
            member_path = (destination / member.filename).resolve()
            if destination_root != member_path and destination_root not in member_path.parents:
                raise ValueError(f"ZIP 包含不安全的路徑：{member.filename}")
        archive.extractall(destination)
    return destination


def find_dataset_file(extracted_dir: Path, target_stem: str) -> Path:
    """Find a dataset file by stem, ignoring case and directory depth."""
    matches = sorted(
        path for path in extracted_dir.rglob("*")
        if path.is_file() and path.stem.casefold() == target_stem.casefold()
    )
    if not matches:
        raise FileNotFoundError(f"ZIP 內找不到 {target_stem} 檔案")
    if len(matches) > 1:
        raise ValueError(f"ZIP 內找到多個 {target_stem} 檔案：{matches}")
    return matches[0]


def find_falv_file(extracted_dir: Path) -> Path:
    """Backward-compatible helper for finding the law dataset file."""
    return find_dataset_file(extracted_dir, "FalV")


def build_output_filename(
    updated_at: datetime,
    source_file: Path,
    category: str,
) -> str:
    """Build a Windows-safe filename from update time plus its category."""
    return f"{updated_at:%Y-%m-%d %H-%M}{category}{source_file.suffix}"


def save_legal_file(source_file: Path, output_dir: Path, filename: str) -> Path:
    """Copy the selected file into legal_data using the requested name."""
    output_dir.mkdir(parents=True, exist_ok=True)
    destination = output_dir / filename
    shutil.copy2(source_file, destination)
    return destination


def download_dataset(
    dataset_url: str,
    category: str,
    target_stem: str,
    output_dir: Path | str = DEFAULT_OUTPUT_DIR,
    timeout: int = 120,
) -> Path:
    """Download, extract, and save FalV from one dataset."""
    page_html = fetch_dataset_page(dataset_url, timeout=min(timeout, 30))
    updated_at = parse_metadata_updated_at(page_html)
    zip_url = parse_zip_url(page_html, dataset_url)

    with tempfile.TemporaryDirectory(prefix="law_data_") as temp_dir_name:
        temp_dir = Path(temp_dir_name)
        zip_path = download_zip(zip_url, temp_dir / "dataset.zip", timeout=timeout)
        extracted_dir = extract_zip(zip_path, temp_dir / "extracted")
        dataset_file = find_dataset_file(extracted_dir, target_stem)
        filename = build_output_filename(updated_at, dataset_file, category)
        return save_legal_file(dataset_file, Path(output_dir), filename)


def download_all_legal_data(
    output_dir: Path | str = DEFAULT_OUTPUT_DIR,
    timeout: int = 120,
) -> dict[str, Path]:
    """Main entry point: process both the law and regulation datasets."""
    return {
        category: download_dataset(
            dataset_url, category, target_stem, output_dir, timeout
        )
        for dataset_url, category, target_stem in DATASETS
    }


def download_law_data(
    output_dir: Path | str = DEFAULT_OUTPUT_DIR,
    timeout: int = 120,
) -> Path:
    """Backward-compatible entry point for the law-only dataset."""
    return download_dataset(LAW_DATASET_URL, "法律", "FalV", output_dir, timeout)


if __name__ == "__main__":
    for category, saved_path in download_all_legal_data().items():
        print(f"{category}: {saved_path}")
