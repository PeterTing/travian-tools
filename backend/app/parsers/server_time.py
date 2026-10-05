"""讀取頁面上的 #servertime。"""

from __future__ import annotations

import re

from bs4 import BeautifulSoup


def parse_server_time(html: str) -> str | None:
    soup = BeautifulSoup(html, "html.parser")
    el = soup.select_one("#servertime #tp1, #servertime .timer, #tp1")
    if el is not None:
        text = el.get_text(strip=True)
        if re.match(r"\d{1,2}:\d{2}:\d{2}", text):
            return text
    # fallback: any HH:MM:SS inside #servertime
    box = soup.select_one("#servertime")
    if box is not None:
        m = re.search(r"(\d{1,2}:\d{2}:\d{2})", box.get_text())
        if m:
            return m.group(1)
    return None
