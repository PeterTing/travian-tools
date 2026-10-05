"""世界（伺服器）網址：正規化與從網址看得出來的資訊.

使用者可以直接貼遊戲裡的完整網址（例如
``https://ts3.x1.asia.travian.com/dorf1.php?newdid=123``），這裡只留下
scheme + host，當作「世界」的識別。
Travian Legends 的主機名稱通常是 ``ts<N>.x<速度>.<區域>.travian.com``，
所以伺服器名稱和速度可以從網址推出來；看不出來就回傳 None。
"""

import re
from dataclasses import dataclass
from urllib.parse import urlsplit

_HOST_LABEL = re.compile(r"^[a-z0-9-]+$")
_SPEED_LABEL = re.compile(r"^x(\d{1,2})$")

# 區域代號 → 顯示名稱（沒列到的直接顯示代號）
REGION_NAMES = {
    "international": "國際服",
    "asia": "亞洲服",
    "europe": "歐洲服",
    "america": "美洲服",
    "arabics": "阿拉伯服",
}

ALLOWED_SPEEDS = (1, 2, 3, 5, 10)


def normalize_server_url(raw: str) -> str:
    """把使用者輸入的世界網址整理成 ``https://host``（保留 http 與 port）.

    沒寫 http(s):// 時補 https://；路徑、查詢字串都拿掉。
    主機名稱至少要有一個點（例如 ts3.travian.com），否則 ValueError。
    """
    text = (raw or "").strip()
    if not text:
        raise ValueError("請填世界（伺服器網址）")
    if "://" not in text:
        text = f"https://{text}"
    parts = urlsplit(text)
    if parts.scheme.lower() not in ("http", "https"):
        raise ValueError("世界網址必須是 http:// 或 https://")
    try:
        host = (parts.hostname or "").lower()
        port = parts.port
    except ValueError as exc:  # 例如 port 不是數字
        raise ValueError("世界網址格式不對") from exc
    labels = host.split(".")
    if len(labels) < 2 or not all(_HOST_LABEL.match(label) for label in labels):
        raise ValueError("世界網址格式不對，例如 https://ts3.x1.asia.travian.com")
    netloc = f"{host}:{port}" if port else host
    return f"{parts.scheme.lower()}://{netloc}"


@dataclass(frozen=True)
class WorldUrlInfo:
    """從網址推出來的世界資訊."""

    server_url: str
    server_name: str | None
    server_speed: int | None


def describe_server_url(raw: str) -> WorldUrlInfo:
    """正規化網址，並盡量推出伺服器名稱（例如「ts3 亞洲服」）與速度."""
    server_url = normalize_server_url(raw)
    host = urlsplit(server_url).hostname or ""
    labels = host.split(".")
    first = labels[0]
    name: str | None = None
    speed: int | None = None
    if re.match(r"^ts\d+$", first):
        region = None
        for label in labels[1:-2]:
            match = _SPEED_LABEL.match(label)
            if match:
                value = int(match.group(1))
                speed = value if value in ALLOWED_SPEEDS else None
            elif label != "travian":
                region = REGION_NAMES.get(label, label)
        name = f"{first} {region}" if region else first
    return WorldUrlInfo(server_url=server_url, server_name=name, server_speed=speed)
