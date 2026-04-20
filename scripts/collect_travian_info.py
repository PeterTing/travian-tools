"""Travian 頁面資訊收集腳本.

執行方式：
1. 執行此腳本：python scripts/collect_travian_info.py
2. 腳本會自動登入並收集各頁面的 HTML
3. 收集完成後，Claude 可以讀取 scripts/travian_html/ 目錄
"""

import asyncio
import os
from datetime import datetime
from pathlib import Path

import nodriver as uc


# 設定
SERVER_URL = "https://nys.x1.asia.travian.com"  # 修改為你的伺服器
OUTPUT_DIR = Path(__file__).parent / "travian_html"

# 登入資訊 (請修改為你的帳號)
LOGIN_EMAIL = "a0917209079@gmail.com"  # 填入你的 email
LOGIN_PASSWORD = "a8503100"  # 填入你的密碼


async def collect_page_info(browser, url: str, name: str) -> dict:
    """收集單一頁面的資訊."""
    page = await browser.get(url)
    await asyncio.sleep(2)  # 等待頁面載入

    # 取得頁面資訊
    html = await page.get_content()
    current_url = page.url

    # 儲存 HTML
    html_file = OUTPUT_DIR / f"{name}.html"
    html_file.write_text(html, encoding="utf-8")

    # 截圖
    screenshot_file = OUTPUT_DIR / f"{name}.png"
    await page.save_screenshot(str(screenshot_file))

    print(f"✓ {name}: {current_url}")
    print(f"  HTML: {html_file}")
    print(f"  Screenshot: {screenshot_file}")

    return {
        "name": name,
        "url": current_url,
        "html_file": str(html_file),
        "screenshot_file": str(screenshot_file),
    }


async def login(browser) -> bool:
    """登入 Travian."""
    print("正在登入...")

    # 前往登入頁面
    page = await browser.get(f"{SERVER_URL}")
    await asyncio.sleep(3)

    # 檢查是否需要登入（URL 包含登入相關路徑或有登入表單）
    current_url = page.url
    print(f"當前 URL: {current_url}")

    # 如果已經在遊戲頁面，不需要登入
    if "/dorf1.php" in current_url or "/dorf2.php" in current_url:
        print("已經登入！")
        return True

    # 檢查是否有遊戲元素（已登入）
    try:
        village_box = await page.select("#sidebarBoxActiveVillage")
        if village_box:
            print("已經登入！")
            return True
    except Exception:
        pass

    # 需要登入
    try:
        # 找到並填入 email
        email_input = await page.select('input[name="name"]')
        if email_input:
            await email_input.clear_input()
            await asyncio.sleep(0.3)
            await email_input.send_keys(LOGIN_EMAIL)
            print("已輸入 Email")

        await asyncio.sleep(0.5)

        # 找到並填入密碼
        password_input = await page.select('input[type="password"]')
        if password_input:
            await password_input.clear_input()
            await asyncio.sleep(0.3)
            await password_input.send_keys(LOGIN_PASSWORD)
            print("已輸入密碼")

        await asyncio.sleep(0.5)

        # 點擊登入按鈕
        login_button = await page.select('button[type="submit"]')
        if login_button:
            await login_button.click()
            print("點擊登入按鈕")

        # 等待登入完成
        await asyncio.sleep(5)

        # 檢查是否登入成功
        try:
            village_box = await page.select("#sidebarBoxActiveVillage")
            if village_box:
                print("登入成功！")
                return True
        except Exception:
            pass

        current_url = page.url
        print(f"登入後 URL: {current_url}")
        # 自動等待 10 秒讓使用者手動處理
        print("等待 10 秒讓頁面載入...")
        await asyncio.sleep(10)
        return True

    except Exception as e:
        print(f"自動登入失敗: {e}")
        print("等待 10 秒...")
        await asyncio.sleep(10)
        return True


async def main():
    """主程式."""
    print("=" * 60)
    print("Travian 頁面資訊收集工具")
    print("=" * 60)
    print()

    # 建立輸出目錄
    OUTPUT_DIR.mkdir(exist_ok=True)

    # 啟動瀏覽器（使用現有的 Chrome profile 以保持登入狀態）
    print("啟動瀏覽器...")
    browser = await uc.start(
        headless=False,
        user_data_dir=os.path.expanduser("~/.travian_chrome_profile"),
    )

    # 嘗試登入
    await login(browser)

    # 要收集的頁面
    pages_to_collect = [
        # 基本頁面
        (f"{SERVER_URL}/dorf1.php", "dorf1_resources"),  # 資源田
        (f"{SERVER_URL}/dorf2.php", "dorf2_village"),    # 村莊中心

        # 市場運送
        (f"{SERVER_URL}/build.php?id=35&gid=17&t=5", "market_transport"),

        # 建築頁面（需要有建築的格子 ID）
        # 嘗試幾個常見的建築位置
        (f"{SERVER_URL}/build.php?id=19", "building_main"),      # 主建築通常在 19
        (f"{SERVER_URL}/build.php?id=25", "building_residence"),  # 行宮/皇宮
        (f"{SERVER_URL}/build.php?id=26", "building_barracks"),   # 兵營
        (f"{SERVER_URL}/build.php?id=27", "building_stable"),     # 馬廄
        (f"{SERVER_URL}/build.php?id=28", "building_workshop"),   # 工坊

        # 集結點（部隊概覽）
        (f"{SERVER_URL}/build.php?id=39&gid=16", "rally_point"),
        (f"{SERVER_URL}/build.php?id=39&gid=16&tt=1", "rally_point_overview"),

        # 集結點 - 發兵相關頁面 (用於搶羊和定時發兵)
        (f"{SERVER_URL}/build.php?id=39&gid=16&tt=2", "rally_point_send_troops"),  # 發兵頁面
        # (f"{SERVER_URL}/build.php?id=39&tt=2&eventType=4", "rally_point_raid"),  # 搶奪模式

        # 農場清單 (如果有使用農場清單功能)
        (f"{SERVER_URL}/build.php?id=39&gid=16&tt=99", "rally_point_farmlist"),  # 農場清單

        # 地圖頁面 (用於選擇目標)
        (f"{SERVER_URL}/karte.php", "map"),

        # 英雄
        (f"{SERVER_URL}/hero", "hero"),
        (f"{SERVER_URL}/hero/adventures", "hero_adventures"),
    ]

    results = []

    print()
    print("開始收集頁面資訊...")
    print("-" * 60)

    for url, name in pages_to_collect:
        try:
            result = await collect_page_info(browser, url, name)
            results.append(result)
        except Exception as e:
            print(f"✗ {name}: 錯誤 - {e}")

        await asyncio.sleep(1)  # 避免太快

    print("-" * 60)
    print()

    # 產生摘要報告
    report_file = OUTPUT_DIR / "collection_report.txt"
    with open(report_file, "w", encoding="utf-8") as f:
        f.write(f"Travian 頁面收集報告\n")
        f.write(f"收集時間: {datetime.now().isoformat()}\n")
        f.write(f"伺服器: {SERVER_URL}\n")
        f.write("=" * 60 + "\n\n")

        for r in results:
            f.write(f"頁面: {r['name']}\n")
            f.write(f"URL: {r['url']}\n")
            f.write(f"HTML: {r['html_file']}\n")
            f.write(f"Screenshot: {r['screenshot_file']}\n")
            f.write("-" * 40 + "\n")

    print(f"報告已儲存: {report_file}")
    print()
    print("收集完成！請將以下檔案提供給 Claude：")
    print(f"  目錄: {OUTPUT_DIR}")
    print()

    # 保持瀏覽器開啟讓使用者檢視
    input("按 Enter 關閉瀏覽器...")
    browser.stop()


if __name__ == "__main__":
    asyncio.run(main())
