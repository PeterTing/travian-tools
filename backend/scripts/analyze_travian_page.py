#!/usr/bin/env python3
"""分析 Travian 頁面結構的腳本.

這個腳本會啟動瀏覽器，登入 Travian，並將頁面 HTML 儲存下來供分析。
"""

import asyncio
import os
import sys
from pathlib import Path

# 添加 backend 到路徑
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

import nodriver as uc


async def main():
    """主程式."""
    # 設定
    server_url = "https://nys.x1.asia.travian.com"
    login_email = os.environ.get("TRAVIAN_LOGIN_EMAIL", "a0917209079@gmail.com")
    login_password = os.environ.get("TRAVIAN_LOGIN_PASSWORD", "a8503100")
    output_dir = Path(__file__).parent / "travian_html"
    output_dir.mkdir(exist_ok=True)

    print(f"Server URL: {server_url}")
    print(f"Login email: {login_email}")
    print(f"Output dir: {output_dir}")

    # 啟動瀏覽器（headless 模式，適用於 Docker）
    print("\n啟動瀏覽器...")
    is_headless = os.environ.get("CHROME_HEADLESS", "true").lower() == "true"
    browser = await uc.start(
        headless=is_headless,
        sandbox=False,
        browser_args=[
            "--disable-dev-shm-usage",
            "--disable-gpu",
            "--disable-software-rasterizer",
        ],
    )
    print(f"瀏覽器已啟動 (headless={is_headless})")

    try:
        # 導航到首頁
        print(f"\n導航到: {server_url}/dorf1.php")
        page = await browser.get(f"{server_url}/dorf1.php")
        await asyncio.sleep(3)

        # 檢查是否需要登入
        password_input = await page.select('input[type="password"]')
        if password_input:
            print("偵測到登入頁面，正在登入...")

            # 輸入 email
            email_input = await page.select('input[name="name"]')
            if email_input:
                await email_input.clear_input()
                await asyncio.sleep(0.3)
                for char in login_email:
                    await email_input.send_keys(char)
                    await asyncio.sleep(0.05)
                print("已輸入 Email")

            await asyncio.sleep(0.5)

            # 輸入密碼
            if password_input:
                await password_input.clear_input()
                await asyncio.sleep(0.3)
                for char in login_password:
                    await password_input.send_keys(char)
                    await asyncio.sleep(0.05)
                print("已輸入密碼")

            await asyncio.sleep(0.5)

            # 點擊登入按鈕
            submit_btn = await page.select('button[type="submit"]')
            if submit_btn:
                await submit_btn.click()
                print("點擊登入按鈕")

            # 等待登入完成
            print("等待登入完成...")
            await asyncio.sleep(8)

        # 重新導航確保頁面已載入
        print(f"\n重新導航到: {server_url}/dorf1.php")
        page = await browser.get(f"{server_url}/dorf1.php")
        await asyncio.sleep(5)

        # 儲存首頁 HTML
        print("\n獲取頁面 HTML...")
        body = await page.select("body")
        if body:
            body_html = await body.get_html()
            html_path = output_dir / "dorf1_page.html"
            with open(html_path, "w", encoding="utf-8") as f:
                f.write(body_html)
            print(f"已儲存首頁 HTML: {html_path}")
            print(f"HTML 長度: {len(body_html)} 字元")

        # 分析頁面結構
        print("\n=== 頁面結構分析 ===")

        # 檢查重要元素
        elements_to_check = [
            ("#sidebarBoxVillageList", "村莊列表"),
            ("#sidebarBoxActiveVillage", "當前村莊"),
            (".listEntry", "列表項目"),
            (".listEntry.active", "選中的列表項目"),
            (".name", "名稱元素"),
            (".coordinateX", "X 座標"),
            (".coordinateY", "Y 座標"),
            (".coordinatesWrapper", "座標容器"),
            ("#villageName", "村莊名稱 ID"),
            (".villageNameWrapper", "村莊名稱容器"),
            (".sidebarBox", "側邊欄盒子"),
            ("#resourceFieldContainer", "資源田容器"),
            ("#l1", "木材數量"),
            ("#l2", "磚塊數量"),
            ("#l3", "鐵礦數量"),
            ("#l4", "糧食數量"),
            (".buildingList", "建築列表"),
        ]

        for selector, desc in elements_to_check:
            elem = await page.select(selector)
            if elem:
                try:
                    elem_html = await elem.get_html()
                    print(f"✓ {desc} ({selector}): 找到，長度 {len(elem_html)} 字元")
                    # 儲存元素 HTML
                    elem_path = (
                        output_dir
                        / f"element_{selector.replace('#', 'id_').replace('.', 'class_').replace(' ', '_')}.html"
                    )
                    with open(elem_path, "w", encoding="utf-8") as f:
                        f.write(elem_html)
                except Exception as e:
                    print(f"✓ {desc} ({selector}): 找到，但獲取 HTML 失敗: {e}")
            else:
                print(f"✗ {desc} ({selector}): 未找到")

        # 檢查所有 sidebarBox
        print("\n=== 所有 sidebarBox ===")
        sidebars = await page.select_all(".sidebarBox")
        print(f"找到 {len(sidebars)} 個 sidebarBox")
        for i, sb in enumerate(sidebars):
            try:
                sb_id = sb.attrs.get("id", "no-id")
                sb_html = await sb.get_html()
                print(f"  [{i}] id={sb_id}, 長度={len(sb_html)} 字元")
                # 儲存每個 sidebar
                sb_path = output_dir / f"sidebar_{i}_{sb_id}.html"
                with open(sb_path, "w", encoding="utf-8") as f:
                    f.write(sb_html)
            except Exception as e:
                print(f"  [{i}] 錯誤: {e}")

        # 檢查村莊列表項目
        print("\n=== 村莊列表項目 ===")
        list_entries = await page.select_all("#sidebarBoxVillageList .listEntry")
        if not list_entries:
            list_entries = await page.select_all(".villageList .listEntry")
        if not list_entries:
            list_entries = await page.select_all(".listEntry")

        print(f"找到 {len(list_entries)} 個列表項目")
        for i, entry in enumerate(list_entries[:10]):  # 只處理前 10 個
            try:
                entry_id = entry.attrs.get("data-did", "no-did")
                entry_html = await entry.get_html()
                print(f"  [{i}] data-did={entry_id}, 長度={len(entry_html)} 字元")
                # 儲存每個 entry
                entry_path = output_dir / f"listEntry_{i}_{entry_id}.html"
                with open(entry_path, "w", encoding="utf-8") as f:
                    f.write(entry_html)
            except Exception as e:
                print(f"  [{i}] 錯誤: {e}")

        print("\n=== 完成 ===")
        print(f"所有 HTML 檔案已儲存到: {output_dir}")
        print("請手動檢查這些檔案來分析頁面結構")

        # 在 headless 模式下自動繼續
        if not is_headless:
            print("\n瀏覽器仍然開啟，請手動檢視頁面...")
            print("按 Enter 鍵關閉瀏覽器...")
            input()
        else:
            print("\nHeadless 模式，自動結束...")

    except Exception as e:
        print(f"錯誤: {e}")
        import traceback

        traceback.print_exc()

    finally:
        browser.stop()
        print("瀏覽器已關閉")


if __name__ == "__main__":
    asyncio.run(main())
