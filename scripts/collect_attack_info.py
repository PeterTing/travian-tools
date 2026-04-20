"""收集被攻擊村莊的詳細資訊.

執行方式：
    python scripts/collect_attack_info.py [village_id]

如果不提供 village_id，會收集當前村莊的資訊
"""

import asyncio
import os
import sys
from datetime import datetime
from pathlib import Path

import nodriver as uc


# 設定
SERVER_URL = "https://nys.x1.asia.travian.com"  # 修改為你的伺服器
OUTPUT_DIR = Path(__file__).parent / "travian_html"


async def collect_page(page, url: str, name: str):
    """收集單一頁面."""
    await page.get(url)
    await asyncio.sleep(2)

    html = await page.get_content()
    html_file = OUTPUT_DIR / f"{name}.html"
    html_file.write_text(html, encoding="utf-8")

    screenshot_file = OUTPUT_DIR / f"{name}.png"
    await page.save_screenshot(str(screenshot_file))

    print(f"✓ {name}")
    print(f"  URL: {page.url}")
    print(f"  HTML: {html_file}")


async def main():
    """主程式."""
    print("=" * 60)
    print("收集被攻擊村莊資訊")
    print("=" * 60)
    print()

    # 取得 village_id
    village_id = sys.argv[1] if len(sys.argv) > 1 else None

    if village_id:
        print(f"目標村莊 ID: {village_id}")
    else:
        print("使用當前村莊")
    print()

    OUTPUT_DIR.mkdir(exist_ok=True)

    # 啟動瀏覽器
    print("啟動瀏覽器...")
    browser = await uc.start(
        headless=False,
        user_data_dir=os.path.expanduser("~/.travian_chrome_profile"),
    )

    # 取得頁面
    page = await browser.get(f"{SERVER_URL}/dorf1.php")
    await asyncio.sleep(2)

    # 切換村莊 (如果有指定)
    village_suffix = f"&newdid={village_id}" if village_id else ""
    village_name = f"_village_{village_id}" if village_id else ""

    # 收集頁面
    pages = [
        # 村莊頁面
        (f"{SERVER_URL}/dorf1.php?{village_suffix}", f"attack_dorf1{village_name}"),

        # 集結點概覽 (顯示所有部隊移動)
        (f"{SERVER_URL}/build.php?id=39&gid=16&tt=1{village_suffix}", f"attack_rally_overview{village_name}"),

        # 集結點基本 (可能有更多攻擊詳情)
        (f"{SERVER_URL}/build.php?id=39&gid=16{village_suffix}", f"attack_rally_point{village_name}"),
    ]

    print()
    print("開始收集...")
    print("-" * 60)

    for url, name in pages:
        try:
            await collect_page(page, url, name)
        except Exception as e:
            print(f"✗ {name}: {e}")
        await asyncio.sleep(1)

    print("-" * 60)
    print()
    print("收集完成！")
    print(f"請查看: {OUTPUT_DIR}")
    print()

    # 等待用戶確認
    print("按 Enter 關閉瀏覽器...")
    input()

    browser.stop()


if __name__ == "__main__":
    asyncio.run(main())
