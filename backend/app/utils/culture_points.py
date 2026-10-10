"""文明點（CP）唯一資料來源：開村門檻、慶典上限、起始 CP.

資料檔 ``data/static/culture_points.json`` 由
``scripts/game_data/gen_game_data.py`` 產生，前端 ``frontend/src/data/gameData.gen.json``
是同一次產生的副本；不要手改。

規則（官方 Help Center）：
- 開村門檻：support.travian.com/en/articles/51-culture-points-cp
- 慶典：小慶典 CP＝該村每日 CP 產量、大慶典＝全帳號每日 CP 產量，
  各有上限（x1：500／2000），上限依伺服器速度而定：
  support.travian.com/en/articles/82-celebrations-and-town-hall 、
  support.travian.com/en/articles/20-game-versions-and-speed
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any, Literal

_DATA = Path(__file__).resolve().parents[2] / "data" / "static" / "culture_points.json"

CelebrationKind = Literal["small", "great"]


@lru_cache(maxsize=1)
def _data() -> dict[str, Any]:
    data: dict[str, Any] = json.loads(_DATA.read_text(encoding="utf-8"))
    return data


def supported_speeds() -> list[int]:
    return sorted(int(s) for s in _data()["village_requirements"])


def _speed_key(speed: float) -> str:
    key = str(int(speed))
    if key not in _data()["village_requirements"]:
        raise ValueError(f"unsupported server speed: {speed}")
    return key


def village_requirements(speed: float = 1) -> list[int]:
    """累積 CP 門檻；index 0 = 第 1 村（0）、index 1 = 第 2 村…."""
    return list(_data()["village_requirements"][_speed_key(speed)])


def start_cp(speed: float = 1) -> int:
    return int(_data()["start_cp"][_speed_key(speed)])


def celebration_cap(kind: CelebrationKind, speed: float = 1) -> int:
    return int(_data()["celebration_cap"][_speed_key(speed)][kind])


def celebration_cp(daily_cp: int, kind: CelebrationKind, speed: float = 1) -> int:
    """一場慶典拿到的 CP＝每日 CP 產量（小：本村；大：全帳號），不超過上限."""
    return max(0, min(int(daily_cp), celebration_cap(kind, speed)))


def is_verified(village: int, speed: float = 1) -> bool:
    """官方 S51 表（1–50 村 × x1/x2/x3/x5/x10）逐格比對過（P0-19）；表外的速度或村數才是待驗證."""
    v = _data()["verified"]
    return float(speed) in [float(s) for s in v["speeds"]] and village in v["villages"]
