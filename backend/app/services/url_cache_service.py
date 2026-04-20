"""URL 快取服務.

提供 URL 內容的快取功能，減少重複請求。
"""

import hashlib
import logging
import time
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger(__name__)


@dataclass
class CacheEntry:
    """快取項目."""

    content: Any
    created_at: float
    ttl_seconds: int
    hit_count: int = 0

    @property
    def is_expired(self) -> bool:
        """檢查是否過期."""
        return time.time() - self.created_at > self.ttl_seconds


@dataclass
class URLCacheService:
    """URL 快取服務.

    提供簡單的記憶體快取功能。
    """

    default_ttl_seconds: int = 60
    max_entries: int = 1000
    _cache: dict[str, CacheEntry] = field(default_factory=dict)

    def _get_cache_key(self, url: str) -> str:
        """產生快取鍵值.

        Args:
            url: URL

        Returns:
            快取鍵值
        """
        return hashlib.md5(url.encode()).hexdigest()

    def get(self, url: str) -> Any | None:
        """取得快取內容.

        Args:
            url: URL

        Returns:
            快取內容，如果不存在或已過期則返回 None
        """
        key = self._get_cache_key(url)
        entry = self._cache.get(key)

        if entry is None:
            return None

        if entry.is_expired:
            del self._cache[key]
            return None

        entry.hit_count += 1
        return entry.content

    def set(self, url: str, content: Any, ttl_seconds: int | None = None) -> None:
        """設定快取內容.

        Args:
            url: URL
            content: 內容
            ttl_seconds: 快取有效期（秒），如果未指定則使用預設值
        """
        # 如果快取已滿，清理過期項目
        if len(self._cache) >= self.max_entries:
            self._cleanup_expired()

        # 如果還是滿的，刪除最舊的項目
        if len(self._cache) >= self.max_entries:
            oldest_key = min(
                self._cache.keys(),
                key=lambda k: self._cache[k].created_at,
            )
            del self._cache[oldest_key]

        key = self._get_cache_key(url)
        self._cache[key] = CacheEntry(
            content=content,
            created_at=time.time(),
            ttl_seconds=ttl_seconds or self.default_ttl_seconds,
        )

    def invalidate(self, url: str) -> bool:
        """使快取無效.

        Args:
            url: URL

        Returns:
            如果找到並刪除則返回 True
        """
        key = self._get_cache_key(url)
        if key in self._cache:
            del self._cache[key]
            return True
        return False

    def clear(self) -> int:
        """清空所有快取.

        Returns:
            清除的項目數量
        """
        count = len(self._cache)
        self._cache.clear()
        return count

    def _cleanup_expired(self) -> int:
        """清理過期項目.

        Returns:
            清除的項目數量
        """
        expired_keys = [key for key, entry in self._cache.items() if entry.is_expired]
        for key in expired_keys:
            del self._cache[key]
        return len(expired_keys)

    def get_stats(self) -> dict:
        """取得快取統計.

        Returns:
            統計資訊
        """
        total_entries = len(self._cache)
        expired_entries = sum(1 for entry in self._cache.values() if entry.is_expired)
        total_hits = sum(entry.hit_count for entry in self._cache.values())

        return {
            "total_entries": total_entries,
            "expired_entries": expired_entries,
            "active_entries": total_entries - expired_entries,
            "total_hits": total_hits,
            "max_entries": self.max_entries,
        }


# 全域快取實例
url_cache = URLCacheService()
