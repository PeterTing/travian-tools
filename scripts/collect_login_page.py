"""收集登入頁面的 HTML."""

import asyncio
import os
from pathlib import Path

import nodriver as uc

SERVER_URL = "https://nys.x1.asia.travian.com"
OUTPUT_DIR = Path(__file__).parent / "travian_html"


async def main():
    OUTPUT_DIR.mkdir(exist_ok=True)

    browser = await uc.start(
        headless=False,
        user_data_dir=os.path.expanduser("~/.travian_chrome_profile"),
    )

    page = await browser.get(SERVER_URL)
    await asyncio.sleep(3)

    html = await page.get_content()
    html_file = OUTPUT_DIR / "login_page.html"
    html_file.write_text(html, encoding="utf-8")

    await page.save_screenshot(str(OUTPUT_DIR / "login_page.png"))

    print(f"已儲存: {html_file}")
    print("按 Enter 關閉...")
    input()
    browser.stop()


if __name__ == "__main__":
    asyncio.run(main())
