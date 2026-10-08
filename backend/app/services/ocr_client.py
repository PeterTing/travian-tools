"""Backend → tt-ocr 的連線（P0-07）。

除了 ``map_sql_fetcher`` 以外，這是後端唯一會對外連線的模組（合規測試的白名單，
見 ``tests/unit/test_compliance.py``）。只會連到兩個地方：

1. 設定裡的 ``OCR_SERVICE_URL``（我們自己的 tt-ocr；網址不能含 ``travian``、不跟隨轉址）；
2. Cloud Run 的 metadata server，取得呼叫 tt-ocr 用的 ID token
   （``OCR_AUTH=id_token``；tt-ocr 部署時不開放匿名呼叫，只有 tt-api 的 service account
   有 ``roles/run.invoker``）。

只在使用者按下上傳截圖時呼叫，沒有排程、沒有背景掃描。
"""

from __future__ import annotations

import time
from typing import Any
from urllib.parse import urlsplit

import httpx

METADATA_IDENTITY_URL = (
    "http://metadata.google.internal/computeMetadata/v1/instance/"
    "service-accounts/default/identity"
)
_LOCAL_HOSTS = {"localhost", "127.0.0.1", "tt-ocr", "ocr", "host.docker.internal"}
_TOKEN_TTL_SECONDS = 45 * 60  # Google ID token 有效 1 小時，提早換
TIMEOUT_MESSAGE = "辨識太久了，請一次少傳幾張截圖再試"


class OcrServiceError(Exception):
    """tt-ocr 無法使用（沒設定、逾時、回錯誤）。"""

    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


def validate_service_url(url: str, auth: str) -> str:
    parts = urlsplit(url)
    host = (parts.hostname or "").lower()
    if not host or parts.username or parts.password or parts.query or parts.fragment:
        raise OcrServiceError("OCR_MISCONFIGURED", "OCR_SERVICE_URL 格式不對")
    if "travian" in host:
        raise OcrServiceError("OCR_MISCONFIGURED", "OCR_SERVICE_URL 不能指向遊戲網域")
    if parts.scheme == "https":
        return url.rstrip("/")
    if parts.scheme == "http" and auth == "none" and host in _LOCAL_HOSTS:
        return url.rstrip("/")
    raise OcrServiceError(
        "OCR_MISCONFIGURED", "OCR_SERVICE_URL 必須是 https（本機開發除外）"
    )


class OcrClient:
    def __init__(
        self,
        base_url: str,
        *,
        auth: str = "id_token",
        timeout_seconds: float = 30.0,
        transport: httpx.BaseTransport | None = None,
    ) -> None:
        if not base_url:
            raise OcrServiceError(
                "OCR_UNAVAILABLE", "截圖辨識還沒開放（伺服器沒有設定辨識服務）"
            )
        if auth not in ("id_token", "none"):
            raise OcrServiceError(
                "OCR_MISCONFIGURED", "OCR_AUTH 只能是 id_token 或 none"
            )
        self.base_url = validate_service_url(base_url, auth)
        self.auth = auth
        self.timeout = httpx.Timeout(timeout_seconds, connect=5.0)
        self._transport = transport
        self._token: str | None = None
        self._token_at = 0.0

    def _client(self, timeout: httpx.Timeout | None = None) -> httpx.Client:
        return httpx.Client(
            timeout=timeout or self.timeout,
            follow_redirects=False,
            transport=self._transport,
        )

    def _id_token(self, client: httpx.Client) -> str:
        if self._token and time.monotonic() - self._token_at < _TOKEN_TTL_SECONDS:
            return self._token
        try:
            res = client.get(
                METADATA_IDENTITY_URL,
                params={"audience": self.base_url},
                headers={"Metadata-Flavor": "Google"},
            )
        except httpx.HTTPError as exc:
            raise OcrServiceError("OCR_UNAVAILABLE", "辨識服務暫時連不上") from exc
        if res.status_code != 200 or not res.text.strip():
            raise OcrServiceError("OCR_UNAVAILABLE", "辨識服務暫時連不上")
        self._token = res.text.strip()
        self._token_at = time.monotonic()
        return self._token

    def recognize(
        self,
        image: bytes,
        content_type: str,
        *,
        timeout_seconds: float | None = None,
    ) -> dict[str, Any]:
        """把一張圖送去 tt-ocr，回傳文字列（含框與放大重讀）。圖不會被存下來。

        ``timeout_seconds``：這一張最多等幾秒（呼叫端用來套整批的總時限）；
        不給就用建構時的預設。
        """
        timeout: httpx.Timeout | None = None
        if timeout_seconds is not None:
            if timeout_seconds <= 0:
                raise OcrServiceError("OCR_TIMEOUT", TIMEOUT_MESSAGE)
            timeout = httpx.Timeout(timeout_seconds, connect=min(5.0, timeout_seconds))
        with self._client(timeout) as client:
            headers = {"content-type": content_type}
            if self.auth == "id_token":
                headers["authorization"] = f"Bearer {self._id_token(client)}"
            started = time.perf_counter()
            try:
                res = client.post(
                    f"{self.base_url}/v1/ocr", content=image, headers=headers
                )
            except httpx.TimeoutException as exc:
                raise OcrServiceError("OCR_TIMEOUT", TIMEOUT_MESSAGE) from exc
            except httpx.HTTPError as exc:
                raise OcrServiceError("OCR_UNAVAILABLE", "辨識服務暫時連不上") from exc
            elapsed_ms = int((time.perf_counter() - started) * 1000)
        if res.status_code == 413:
            # tt-ocr 從圖檔表頭就判定像素太多（解壓縮炸彈或超大長截圖）
            raise OcrServiceError(
                "OCR_IMAGE_TOO_LARGE", "圖片太大，請直接用手機截圖，不要放大或拼接"
            )
        if res.status_code in (400, 415):
            raise OcrServiceError("OCR_BAD_IMAGE", "這張圖讀不了（格式不支援）")
        if res.status_code != 200:
            raise OcrServiceError("OCR_UNAVAILABLE", "辨識服務暫時無法使用")
        try:
            payload = res.json()
        except ValueError as exc:
            raise OcrServiceError("OCR_UNAVAILABLE", "辨識服務回應格式不對") from exc
        if not isinstance(payload, dict) or not isinstance(payload.get("lines"), list):
            raise OcrServiceError("OCR_UNAVAILABLE", "辨識服務回應格式不對")
        payload["round_trip_ms"] = elapsed_ms
        return payload
