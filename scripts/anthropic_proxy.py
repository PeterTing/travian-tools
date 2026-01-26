#!/usr/bin/env python3
"""
Anthropic API 代理服務

用於解決 Docker Desktop for Mac 無法連接 api.anthropic.com 的問題。
此代理在 macOS 主機上運行，接收來自 Docker 容器的請求並轉發到 Anthropic API。

使用方式：
1. 在主機上運行此腳本：python3 scripts/anthropic_proxy.py
2. 在 backend/.env 中設定：ANTHROPIC_BASE_URL=http://host.docker.internal:9090
3. 重啟 backend 容器

按 Ctrl+C 停止代理。
"""

import http.server
import ssl
import urllib.request
import urllib.error


class AnthropicProxyHandler(http.server.BaseHTTPRequestHandler):
    """HTTP 代理處理器，轉發請求到 Anthropic API。"""

    def do_request(self):
        """處理所有 HTTP 方法。"""
        # 構建目標 URL
        target_url = f"https://api.anthropic.com{self.path}"

        # 讀取請求體
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length) if content_length > 0 else None

        # 構建請求
        req = urllib.request.Request(target_url, data=body, method=self.command)

        # 複製標頭（排除 hop-by-hop 標頭）
        hop_by_hop = {
            "connection",
            "keep-alive",
            "proxy-authenticate",
            "proxy-authorization",
            "te",
            "trailers",
            "transfer-encoding",
            "upgrade",
            "host",
        }
        for key, value in self.headers.items():
            if key.lower() not in hop_by_hop:
                req.add_header(key, value)

        # 設定 Host 標頭
        req.add_header("Host", "api.anthropic.com")

        try:
            # 發送請求（使用系統證書）
            import certifi

            context = ssl.create_default_context(cafile=certifi.where())
            with urllib.request.urlopen(req, context=context, timeout=120) as response:
                # 發送回應狀態
                self.send_response(response.status)

                # 發送回應標頭
                for key, value in response.headers.items():
                    if key.lower() not in hop_by_hop:
                        self.send_header(key, value)
                self.end_headers()

                # 發送回應體
                self.wfile.write(response.read())

        except urllib.error.HTTPError as e:
            self.send_response(e.code)
            for key, value in e.headers.items():
                if key.lower() not in hop_by_hop:
                    self.send_header(key, value)
            self.end_headers()
            self.wfile.write(e.read())

        except Exception as e:
            self.send_error(502, f"Proxy Error: {e}")

    def do_GET(self):
        self.do_request()

    def do_POST(self):
        self.do_request()

    def do_PUT(self):
        self.do_request()

    def do_DELETE(self):
        self.do_request()

    def do_OPTIONS(self):
        self.do_request()

    def log_message(self, format, *args):
        """自訂日誌格式。"""
        print(f"[Proxy] {self.address_string()} - {format % args}")


def main():
    port = 9090
    server_address = ("0.0.0.0", port)
    httpd = http.server.HTTPServer(server_address, AnthropicProxyHandler)

    print(f"🚀 Anthropic API 代理已啟動")
    print(f"   監聽地址: http://0.0.0.0:{port}")
    print(f"   Docker 容器請使用: http://host.docker.internal:{port}")
    print()
    print("設定方式:")
    print(f"   在 backend/.env 中加入:")
    print(f"   ANTHROPIC_BASE_URL=http://host.docker.internal:{port}")
    print()
    print("按 Ctrl+C 停止代理...")

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n代理已停止")
        httpd.shutdown()


if __name__ == "__main__":
    main()
