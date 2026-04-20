"""版本檢查服務."""

import logging
from pathlib import Path

import httpx

logger = logging.getLogger(__name__)

# GitHub 倉庫資訊（根據實際情況修改）
GITHUB_REPO = "your-username/travian-tools"
GITHUB_API_URL = f"https://api.github.com/repos/{GITHUB_REPO}/releases/latest"


def get_current_version() -> str:
    """取得當前版本號.

    從 pyproject.toml 讀取版本號。

    Returns:
        當前版本號
    """
    try:
        # 嘗試從 pyproject.toml 讀取
        pyproject_path = Path(__file__).parent.parent.parent / "pyproject.toml"
        if pyproject_path.exists():
            content = pyproject_path.read_text()
            for line in content.split("\n"):
                if line.startswith("version"):
                    # version = "0.1.0"
                    version = line.split("=")[1].strip().strip('"').strip("'")
                    return version
    except Exception as e:
        logger.warning(f"無法讀取 pyproject.toml 版本: {e}")

    # 預設版本
    return "0.1.0"


async def check_latest_version() -> dict:
    """檢查最新版本.

    從 GitHub releases 檢查最新版本。

    Returns:
        版本資訊 dict
    """
    current_version = get_current_version()

    result = {
        "current_version": current_version,
        "latest_version": current_version,
        "update_available": False,
        "release_notes": None,
        "download_url": None,
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                GITHUB_API_URL,
                headers={"Accept": "application/vnd.github.v3+json"},
            )

            if response.status_code == 200:
                data = response.json()
                latest_version = data.get("tag_name", "").lstrip("v")
                release_notes = data.get("body", "")
                download_url = data.get("html_url", "")

                result["latest_version"] = latest_version
                result["release_notes"] = release_notes
                result["download_url"] = download_url
                result["update_available"] = _compare_versions(
                    current_version, latest_version
                )
            elif response.status_code == 404:
                logger.info("GitHub 倉庫不存在或沒有 releases")
            else:
                logger.warning(f"GitHub API 回應: {response.status_code}")

    except httpx.TimeoutException:
        logger.warning("檢查版本超時")
    except Exception as e:
        logger.warning(f"檢查版本失敗: {e}")

    return result


def _compare_versions(current: str, latest: str) -> bool:
    """比較版本號.

    Args:
        current: 當前版本
        latest: 最新版本

    Returns:
        如果有更新則返回 True
    """
    try:
        current_parts = [int(x) for x in current.split(".")]
        latest_parts = [int(x) for x in latest.split(".")]

        # 補齊長度
        while len(current_parts) < len(latest_parts):
            current_parts.append(0)
        while len(latest_parts) < len(current_parts):
            latest_parts.append(0)

        for curr, latest in zip(current_parts, latest_parts, strict=False):
            if latest > curr:
                return True
            elif latest < curr:
                return False

        return False
    except (ValueError, AttributeError):
        return False
