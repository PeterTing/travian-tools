"""P0-07 backend → tt-ocr client：只連自己的服務、ID token、不跟隨轉址。"""

from __future__ import annotations

import httpx
import pytest

from app.services.ocr_client import METADATA_IDENTITY_URL, OcrClient, OcrServiceError

URL = "https://tt-ocr-138672009807.asia-east1.run.app"
OK = {"engine": "rapidocr", "width": 10, "height": 10, "elapsed_ms": 5, "lines": []}


@pytest.mark.parametrize(
    "url",
    [
        "https://ocr.travian.com",
        "https://ts11.x1.international.travian.com",
        "http://tt-ocr.example.run.app",
        "https://user:pw@tt-ocr.example.run.app",
        "ftp://tt-ocr.example.run.app",
    ],
)
def test_rejects_bad_urls(url: str) -> None:
    with pytest.raises(OcrServiceError) as exc:
        OcrClient(url)
    assert exc.value.code == "OCR_MISCONFIGURED"


def test_empty_url_means_unavailable() -> None:
    with pytest.raises(OcrServiceError) as exc:
        OcrClient("")
    assert exc.value.code == "OCR_UNAVAILABLE"


def test_plain_http_only_for_local_dev_without_auth() -> None:
    assert (
        OcrClient("http://localhost:18080", auth="none").base_url
        == "http://localhost:18080"
    )
    with pytest.raises(OcrServiceError):
        OcrClient("http://localhost:18080", auth="id_token")


def test_id_token_from_metadata_and_cached() -> None:
    seen: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        if str(request.url).startswith(METADATA_IDENTITY_URL):
            assert request.headers["Metadata-Flavor"] == "Google"
            assert request.url.params["audience"] == URL
            return httpx.Response(200, text="id-token-123")
        assert request.url.host == "tt-ocr-138672009807.asia-east1.run.app"
        assert request.url.path == "/v1/ocr"
        assert request.headers["authorization"] == "Bearer id-token-123"
        assert request.headers["content-type"] == "image/png"
        assert "cookie" not in request.headers
        return httpx.Response(200, json=OK)

    client = OcrClient(URL, transport=httpx.MockTransport(handler))
    assert client.recognize(b"img", "image/png")["lines"] == []
    assert client.recognize(b"img", "image/png")["round_trip_ms"] >= 0
    metadata_calls = [r for r in seen if r.url.host == "metadata.google.internal"]
    assert len(metadata_calls) == 1  # token 快取


def test_no_auth_mode_sends_no_token() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert "authorization" not in request.headers
        return httpx.Response(200, json=OK)

    client = OcrClient(
        "http://localhost:18080", auth="none", transport=httpx.MockTransport(handler)
    )
    assert client.recognize(b"img", "image/jpeg")["engine"] == "rapidocr"


@pytest.mark.parametrize(
    ("response", "code"),
    [
        (
            httpx.Response(302, headers={"location": "https://evil.example"}),
            "OCR_UNAVAILABLE",
        ),
        (httpx.Response(500), "OCR_UNAVAILABLE"),
        (httpx.Response(403), "OCR_UNAVAILABLE"),
        (httpx.Response(413), "OCR_IMAGE_TOO_LARGE"),
        (httpx.Response(400), "OCR_BAD_IMAGE"),
        (httpx.Response(415), "OCR_BAD_IMAGE"),
        (httpx.Response(200, text="not json"), "OCR_UNAVAILABLE"),
        (httpx.Response(200, json={"no": "lines"}), "OCR_UNAVAILABLE"),
    ],
)
def test_error_responses(response: httpx.Response, code: str) -> None:
    calls: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(str(request.url))
        return response

    client = OcrClient(
        "http://localhost:1", auth="none", transport=httpx.MockTransport(handler)
    )
    with pytest.raises(OcrServiceError) as exc:
        client.recognize(b"img", "image/png")
    assert exc.value.code == code
    assert len(calls) == 1  # 不跟隨轉址


def test_timeout_and_metadata_failure() -> None:
    def slow(request: httpx.Request) -> httpx.Response:
        raise httpx.ReadTimeout("slow", request=request)

    client = OcrClient(
        "http://localhost:1", auth="none", transport=httpx.MockTransport(slow)
    )
    with pytest.raises(OcrServiceError) as exc:
        client.recognize(b"img", "image/png")
    assert exc.value.code == "OCR_TIMEOUT"

    def no_metadata(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("no metadata server", request=request)

    client = OcrClient(URL, transport=httpx.MockTransport(no_metadata))
    with pytest.raises(OcrServiceError) as exc:
        client.recognize(b"img", "image/png")
    assert exc.value.code == "OCR_UNAVAILABLE"


def test_per_call_timeout_overrides_default() -> None:
    seen: list[dict[str, float | None]] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request.extensions["timeout"])
        return httpx.Response(200, json=OK)

    client = OcrClient(
        "http://localhost:1",
        auth="none",
        timeout_seconds=30.0,
        transport=httpx.MockTransport(handler),
    )
    client.recognize(b"img", "image/png")
    client.recognize(b"img", "image/png", timeout_seconds=7.5)
    client.recognize(b"img", "image/png", timeout_seconds=2.0)
    assert seen[0]["read"] == 30.0 and seen[0]["connect"] == 5.0
    assert seen[1]["read"] == 7.5 and seen[1]["connect"] == 5.0
    assert seen[2]["read"] == 2.0 and seen[2]["connect"] == 2.0


def test_no_time_left_is_timeout_without_calling() -> None:
    calls: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(str(request.url))
        return httpx.Response(200, json=OK)

    client = OcrClient(
        "http://localhost:1", auth="none", transport=httpx.MockTransport(handler)
    )
    with pytest.raises(OcrServiceError) as exc:
        client.recognize(b"img", "image/png", timeout_seconds=0)
    assert exc.value.code == "OCR_TIMEOUT"
    assert calls == []
