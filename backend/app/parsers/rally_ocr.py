"""集結點截圖辨識（P0-07）：OCR 文字列＋位置 → 來襲清單，每個欄位帶狀態與原因代碼。

輸入是 tt-ocr 回傳的文字列（文字、分數、在原圖的框、放大重讀結果），可以一次好幾張
（集結點太長分兩張截）。輸出跟貼上文字的集結點同一個形狀（``incoming`` / ``movements``），
每筆多一個 ``ocr`` 區塊：

* 欄位狀態（PRD 3.3）：``ok``、``low``（低信心，必須確認才能存入）、``missing``（待補，
  讀不到，可以先存）。
* 原因代碼：多個原因時最嚴重的排第一（``REASON_SEVERITY``）。
* 每個座標欄位都附原圖上的框（前端裁出縮圖），讀不到時附整筆的框。

明確失敗（P0-05 規則：不會存空資料卻回成功）：
``OCR_NOT_RALLY``（認不出是集結點）、``OCR_NO_INCOMING``（沒有來襲）、
``OCR_ALL_MISSING``（有來襲但座標和時間全部讀不到）。

這個模組是純函式，不碰資料庫、不連網路；地圖比對（``COORD_MAP_MISMATCH``）由呼叫端
傳入 ``map_lookup``。
"""

from __future__ import annotations

import re
import unicodedata
from collections.abc import Callable, Sequence
from dataclasses import dataclass, field
from typing import Any

from app.parsers.numbers import strip_bidi

# 低信心原因：最嚴重的排前面。規則判定（格式、範圍）> 兩次讀法不一致 > 外部比對 > 分數類。
REASON_SEVERITY: tuple[str, ...] = (
    "COORD_OUT_OF_RANGE",
    "TIME_FORMAT_INVALID",
    "NUMBER_FORMAT_INVALID",
    "OVERLAP_MISMATCH",
    "CROP_RECHECK_MISMATCH",
    "COUNTDOWN_ARRIVAL_MISMATCH",
    "COORD_MAP_MISMATCH",
    "LAYOUT_AMBIGUOUS",
    "DUPLICATE_VALUE",
    "RESOURCE_OVER_CAPACITY",
    "OCR_LOW_SCORE",
    "TEXT_TOO_SMALL",
    "NO_CROSS_CHECK",
)
# 搭配「待補」使用
MISSING_SEVERITY: tuple[str, ...] = ("TRUNCATED_AT_EDGE", "PARSE_ERROR")

LOW_SCORE_BELOW = 0.80
MIN_TEXT_HEIGHT_PX = 10
ARRIVAL_TOLERANCE_S = 2
DEFAULT_MAP_RADIUS = 200

FAIL_NOT_RALLY = "OCR_NOT_RALLY"
FAIL_NO_INCOMING = "OCR_NO_INCOMING"
FAIL_ALL_MISSING = "OCR_ALL_MISSING"

FIELD_NAMES = ("coords", "countdown", "arrival")


# ------------------------------------------------------------------ input types
@dataclass(frozen=True)
class OcrTextLine:
    text: str
    score: float
    box: tuple[int, int, int, int]  # x0, y0, x1, y1（原圖像素）
    recheck_text: str | None = None
    recheck_score: float | None = None

    @property
    def height(self) -> int:
        return max(1, self.box[3] - self.box[1])

    @property
    def cy(self) -> float:
        return (self.box[1] + self.box[3]) / 2

    @property
    def cx(self) -> float:
        return (self.box[0] + self.box[2]) / 2


@dataclass
class OcrPage:
    index: int
    width: int
    height: int
    lines: list[OcrTextLine]

    @classmethod
    def from_service(cls, index: int, payload: dict[str, Any]) -> OcrPage:
        lines = []
        for raw in payload.get("lines") or []:
            box = raw.get("box") or [0, 0, 0, 0]
            recheck = raw.get("recheck") or {}
            lines.append(
                OcrTextLine(
                    text=str(raw.get("text") or ""),
                    score=float(raw.get("score") or 0.0),
                    box=(int(box[0]), int(box[1]), int(box[2]), int(box[3])),
                    recheck_text=recheck.get("text"),
                    recheck_score=recheck.get("score"),
                )
            )
        return cls(
            index=index,
            width=int(payload.get("width") or 0),
            height=int(payload.get("height") or 0),
            lines=lines,
        )


# ------------------------------------------------------------------ field model
@dataclass
class FieldResult:
    status: str  # ok | low | missing
    value: Any = None
    reasons: list[str] = field(default_factory=list)
    box: list[int] | None = None
    image_index: int | None = None
    raw: str | None = None
    score: float | None = None
    options: list[dict[str, Any]] = field(default_factory=list)

    def add_reason(self, code: str) -> None:
        if code not in self.reasons:
            self.reasons.append(code)
        if code in MISSING_SEVERITY:
            self.status = "missing"
        elif self.status == "ok":
            self.status = "low"
        order = REASON_SEVERITY + MISSING_SEVERITY
        self.reasons.sort(key=lambda c: order.index(c) if c in order else len(order))

    def add_option(self, value: Any, label: str, note: str | None = None) -> None:
        if value is None:
            return
        if any(o["value"] == value for o in self.options):
            return
        self.options.append({"value": value, "label": label, "note": note})

    def as_dict(self) -> dict[str, Any]:
        return {
            "status": self.status,
            "value": self.value,
            "reasons": list(self.reasons),
            "box": self.box,
            "image_index": self.image_index,
            "raw": self.raw,
            "score": None if self.score is None else round(self.score, 4),
            "options": list(self.options),
            "confirmed": False,
        }


def missing_field(code: str = "PARSE_ERROR") -> FieldResult:
    f = FieldResult(status="missing")
    f.add_reason(code)
    return f


# ------------------------------------------------------------------ text helpers
_MINUS = re.compile(r"[\u2212\u2010-\u2015\ufe63\uff0d~]")


def normalize(text: str) -> str:
    """全形轉半形、去方向控制字元、統一負號。"""
    t = unicodedata.normalize("NFKC", strip_bidi(text or ""))
    return _MINUS.sub("-", t)


def fmt_coords(x: int, y: int) -> str:
    def axis(v: int) -> str:
        return f"\u2212{abs(v)}" if v < 0 else str(v)

    return f"({axis(x)}|{axis(y)})"


def fmt_clock(seconds: int) -> str:
    seconds %= 86400
    return f"{seconds // 3600:02d}:{seconds % 3600 // 60:02d}:{seconds % 60:02d}"


def fmt_duration(seconds: int) -> str:
    return f"{seconds // 3600}:{seconds % 3600 // 60:02d}:{seconds % 60:02d}"


_COORD_STRICT = re.compile(r"\(?\s*(-?\s*\d{1,3})\s*\|\s*(-?\s*\d{1,3})\s*\)?")
_COORD_HINT = re.compile(r"[(|]")
_COORD_DIGITS = re.compile(r"\(\s*(-?)\s*(\d{2,7})\s*\)")


def parse_coords_text(text: str) -> tuple[dict[str, int] | None, list[dict[str, int]]]:
    """回傳 (值, 可能的選項)。值是 None 表示格式不對；選項是把誤讀成 1 / l 的分隔線拆開。"""
    t = normalize(text).replace("一", "-")
    t = re.sub(r"[lI!¦｜/]", "|", t) if "|" not in t else t
    m = _COORD_STRICT.search(t)
    if m and "|" in t:
        x = int(m.group(1).replace(" ", ""))
        y = int(m.group(2).replace(" ", ""))
        return {"x": x, "y": y}, []
    # 分隔線讀成 1：(−45112) → (−45|12) 或 (−451|2)…
    options: list[dict[str, int]] = []
    m2 = _COORD_DIGITS.search(t)
    if m2:
        sign = -1 if m2.group(1) else 1
        digits = m2.group(2)
        for i, ch in enumerate(digits):
            if ch != "1" or i == 0 or i == len(digits) - 1:
                continue
            left, right = digits[:i], digits[i + 1 :]
            for y_sign in (1, -1) if right.startswith("-") else (1,):
                options.append({"x": sign * int(left), "y": y_sign * int(right)})
    return None, options


_TIME = re.compile(r"(\d{1,3})\s*[:.]\s*(\d{2})\s*[:.]\s*(\d{2})(?!\d)")
_TIME_LOOSE = re.compile(r"\d\s*[:.]\s*\d")


def parse_time_text(text: str, *, clock: bool) -> tuple[int | None, bool]:
    """回傳 (秒數, 看起來像時間)。clock=True 時是時鐘（時 < 24），否則是倒數。"""
    t = normalize(text)
    m = _TIME.search(t)
    if m:
        h, mi, s = int(m.group(1)), int(m.group(2)), int(m.group(3))
        if mi < 60 and s < 60 and (not clock or h < 24):
            return h * 3600 + mi * 60 + s, True
        return None, True
    return None, bool(_TIME_LOOSE.search(t))


# ------------------------------------------------------------------ page analysis
_RALLY_MARK = re.compile(r"集結點|集结点|Rally\s*point", re.I)
_INCOMING_HEADER = re.compile(
    r"^\s*(?:來|来)村(?:軍|军)(?:團|团)|來犯|Incoming\s+troops", re.I
)
_OTHER_HEADER = re.compile(
    r"^\s*(?:在本村|在他村|出(?:擊|击)(?:軍|军)(?:團|团)|出擊|返回|Outgoing\s+troops|"
    r"Troops\s+in\s+(?:this|other)|Troops\s+on\s+their\s+way)",
    re.I,
)
_VERB = re.compile(
    r"^(?P<who>.*?)\s*(?P<verb>攻擊|攻击|搶奪|抢夺|掠奪|偵察|偵查|侦察|支援|"
    r"(?<![A-Za-z])(?:attacks?|raids?|scouts?|reinforces?|reinforcement)(?![A-Za-z]))"
    r"\s*(?P<target>.+)$",
    re.I,
)
_VERB_KIND = {
    "攻擊": "incoming_attack",
    "攻击": "incoming_attack",
    "attack": "incoming_attack",
    "attacks": "incoming_attack",
    "搶奪": "incoming_raid",
    "抢夺": "incoming_raid",
    "掠奪": "incoming_raid",
    "raid": "incoming_raid",
    "raids": "incoming_raid",
    "偵察": "incoming_spy",
    "偵查": "incoming_spy",
    "侦察": "incoming_spy",
    "scout": "incoming_spy",
    "scouts": "incoming_spy",
    "支援": "incoming_reinforcement",
    "reinforce": "incoming_reinforcement",
    "reinforces": "incoming_reinforcement",
    "reinforcement": "incoming_reinforcement",
}
_SERVER_CLOCK = re.compile(
    r"(\d{1,2}:\d{2}:\d{2})\s*\(?\s*UTC\s*([+-])\s*(\d{1,2})(?::?(\d{2}))?", re.I
)
_SERVER_LABEL = re.compile(r"伺服器(?:標準)?時間|服务器时间|Server\s*time", re.I)
_COUNTDOWN_MARK = re.compile(r"^\s*(?:在|in)\b|^\s*在|時\s*$|hrs?\.?\s*$", re.I)
_ARRIVAL_MARK = re.compile(r"^\s*(?:於|于|at)\b|^\s*於|^\s*于", re.I)
_FOOTER = re.compile(r"Discord|玩家守則|條款|法律聲明|Cookie|Privacy|Legal", re.I)


@dataclass
class ServerClock:
    seconds: int
    utc_offset_minutes: int | None
    image_index: int
    box: tuple[int, int, int, int]


def find_server_clock(page: OcrPage) -> ServerClock | None:
    for ln in page.lines:
        m = _SERVER_CLOCK.search(normalize(ln.text))
        if m:
            secs, _ = parse_time_text(m.group(1), clock=True)
            if secs is not None:
                offset = int(m.group(3)) * 60 + int(m.group(4) or 0)
                return ServerClock(
                    secs, -offset if m.group(2) == "-" else offset, page.index, ln.box
                )
    for i, ln in enumerate(page.lines):
        if _SERVER_LABEL.search(normalize(ln.text)):
            for nxt in page.lines[i : i + 3]:
                secs, _ = parse_time_text(nxt.text, clock=True)
                if secs is not None:
                    return ServerClock(secs, None, page.index, nxt.box)
    return None


@dataclass
class Section:
    kind: str  # incoming | other | unknown
    y0: float
    y1: float


def _sections(page: OcrPage) -> list[Section]:
    headers: list[tuple[float, str]] = []
    for ln in page.lines:
        t = normalize(ln.text)
        if _INCOMING_HEADER.search(t):
            headers.append((ln.box[1], "incoming"))
        elif _OTHER_HEADER.search(t):
            headers.append((ln.box[1], "other"))
    headers.sort()
    if not headers:
        return [Section("unknown", 0, float(page.height or 1e9))]
    out = [Section("unknown", 0, headers[0][0])]
    for i, (y, kind) in enumerate(headers):
        end = headers[i + 1][0] if i + 1 < len(headers) else float(page.height or 1e9)
        out.append(Section(kind, y, end))
    return out


def _section_at(sections: list[Section], y: float) -> Section:
    for s in sections:
        if s.y0 <= y < s.y1:
            return s
    return sections[-1]


def _same_name(a: str | None, b: str | None) -> bool:
    if not a or not b:
        return False
    na = re.sub(r"\s+|\.{2,}|…", "", normalize(a)).casefold()
    nb = re.sub(r"\s+|\.{2,}|…", "", normalize(b)).casefold()
    return bool(na) and bool(nb) and (na == nb or na in nb or nb in na)


# ------------------------------------------------------------------ per block
@dataclass
class Block:
    page: OcrPage
    headline: OcrTextLine
    kind: str
    who: str
    target: str
    role: str | None
    lines: list[OcrTextLine]
    y0: float
    y1: float
    truncated_bottom: bool
    fields: dict[str, FieldResult] = field(default_factory=dict)

    @property
    def box(self) -> list[int]:
        xs = [ln.box[0] for ln in self.lines + [self.headline]]
        xe = [ln.box[2] for ln in self.lines + [self.headline]]
        return [
            min(xs),
            int(self.y0),
            max(xe),
            int(min(self.y1, self.page.height or self.y1)),
        ]


def _base_field(page: OcrPage, ln: OcrTextLine, value: Any) -> FieldResult:
    f = FieldResult(
        status="ok",
        value=value,
        box=list(ln.box),
        image_index=page.index,
        raw=ln.text,
        score=ln.score,
    )
    if ln.score < LOW_SCORE_BELOW:
        f.add_reason("OCR_LOW_SCORE")
    if ln.height < MIN_TEXT_HEIGHT_PX:
        f.add_reason("TEXT_TOO_SMALL")
    return f


def _touches_edge(page: OcrPage, ln: OcrTextLine) -> bool:
    x0, y0, x1, y1 = ln.box
    return bool(
        x0 <= 1
        or y0 <= 1
        or (page.width and x1 >= page.width - 1)
        or (page.height and y1 >= page.height - 1)
    )


def _coords_field(block: Block, radius: int) -> FieldResult:
    page = block.page
    cands = [
        ln
        for ln in block.lines
        if _COORD_HINT.search(normalize(ln.text)) and re.search(r"\d", ln.text)
    ]
    # 座標在左邊那一欄（來源村名下面）；頭一列的框右邊的不算
    left = [ln for ln in cands if ln.cx < block.headline.box[0]] or cands
    if not left:
        return missing_field(
            "TRUNCATED_AT_EDGE" if block.truncated_bottom else "PARSE_ERROR"
        )
    ln = min(left, key=lambda c: c.box[1])
    value, options = parse_coords_text(ln.text)
    f = _base_field(page, ln, value)
    if len({c.text for c in left}) > 1:
        f.add_reason("LAYOUT_AMBIGUOUS")
        for other in left:
            v, _ = parse_coords_text(other.text)
            if v:
                f.add_option(v, fmt_coords(v["x"], v["y"]))
    if ln.recheck_text is not None:
        rv, _ = parse_coords_text(ln.recheck_text)
        if rv is not None and rv != value:
            f.add_reason("CROP_RECHECK_MISMATCH")
            if value is not None:
                f.add_option(value, fmt_coords(value["x"], value["y"]))
            f.add_option(rv, fmt_coords(rv["x"], rv["y"]))
            if value is None:
                f.value = rv
                value = rv
    if value is None:
        if options:
            f.add_reason("NUMBER_FORMAT_INVALID")
            for o in options:
                if abs(o["x"]) <= radius and abs(o["y"]) <= radius:
                    f.add_option(o, fmt_coords(o["x"], o["y"]))
            if not f.options:
                f.status = "missing"
                f.add_reason("PARSE_ERROR")
        else:
            f.status = "missing"
            f.add_reason(
                "TRUNCATED_AT_EDGE" if _touches_edge(page, ln) else "PARSE_ERROR"
            )
        return f
    if abs(value["x"]) > radius or abs(value["y"]) > radius:
        f.add_reason("COORD_OUT_OF_RANGE")
    return f


def _time_fields(block: Block) -> tuple[FieldResult, FieldResult]:
    page = block.page
    timed = [
        ln
        for ln in block.lines
        if _TIME.search(normalize(ln.text)) or _TIME_LOOSE.search(normalize(ln.text))
    ]
    countdown_ln: OcrTextLine | None = None
    arrival_ln: OcrTextLine | None = None
    unmarked: list[OcrTextLine] = []
    for ln in timed:
        t = normalize(ln.text)
        if _ARRIVAL_MARK.search(t):
            arrival_ln = arrival_ln or ln
        elif _COUNTDOWN_MARK.search(t):
            countdown_ln = countdown_ln or ln
        else:
            unmarked.append(ln)
    for ln in sorted(unmarked, key=lambda c: c.box[0]):
        if countdown_ln is None:
            countdown_ln = ln
        elif arrival_ln is None:
            arrival_ln = ln

    def build(ln: OcrTextLine | None, clock: bool) -> FieldResult:
        if ln is None:
            return missing_field(
                "TRUNCATED_AT_EDGE" if block.truncated_bottom else "PARSE_ERROR"
            )
        secs, looks = parse_time_text(ln.text, clock=clock)
        value: Any = fmt_clock(secs) if (clock and secs is not None) else secs
        f = _base_field(page, ln, value)
        if ln.recheck_text is not None:
            rsecs, _ = parse_time_text(ln.recheck_text, clock=clock)
            if rsecs is not None and rsecs != secs:
                f.add_reason("CROP_RECHECK_MISMATCH")
                for s in (secs, rsecs):
                    if s is not None:
                        f.add_option(
                            fmt_clock(s) if clock else s,
                            fmt_clock(s) if clock else fmt_duration(s),
                        )
                if secs is None:
                    secs = rsecs
                    f.value = fmt_clock(rsecs) if clock else rsecs
        if secs is None:
            if looks:
                f.add_reason("TIME_FORMAT_INVALID")
            else:
                f.status = "missing"
                f.add_reason(
                    "TRUNCATED_AT_EDGE" if _touches_edge(page, ln) else "PARSE_ERROR"
                )
        return f

    return build(countdown_ln, clock=False), build(arrival_ln, clock=True)


def _clock_seconds(value: Any) -> int | None:
    if isinstance(value, str):
        secs, _ = parse_time_text(value, clock=True)
        return secs
    return None


def _cross_check_times(block: Block, clock: ServerClock | None) -> None:
    cd, ar = block.fields["countdown"], block.fields["arrival"]
    if clock is None or clock.image_index != block.page.index:
        return
    cd_v = cd.value if isinstance(cd.value, int) and cd.status != "missing" else None
    ar_v = _clock_seconds(ar.value) if ar.status != "missing" else None
    if cd_v is not None and ar_v is not None:
        expected = (clock.seconds + cd_v) % 86400
        diff = abs(expected - ar_v)
        diff = min(diff, 86400 - diff)
        if diff > ARRIVAL_TOLERANCE_S:
            cd.add_reason("COUNTDOWN_ARRIVAL_MISMATCH")
            ar.add_reason("COUNTDOWN_ARRIVAL_MISMATCH")
            alt_cd = (ar_v - clock.seconds) % 86400
            cd.add_option(cd_v, fmt_duration(cd_v))
            cd.add_option(alt_cd, fmt_duration(alt_cd), "用抵達時間和伺服器時鐘推算")
            ar.add_option(ar.value, str(ar.value))
            ar.add_option(
                fmt_clock(expected), fmt_clock(expected), "用倒數和伺服器時鐘推算"
            )
    elif (
        cd_v is not None and ar.status == "low" and "TIME_FORMAT_INVALID" in ar.reasons
    ):
        expected = (clock.seconds + cd_v) % 86400
        ar.add_option(
            fmt_clock(expected), fmt_clock(expected), "用倒數和伺服器時鐘推算"
        )
    elif (
        ar_v is not None and cd.status == "low" and "TIME_FORMAT_INVALID" in cd.reasons
    ):
        alt = (ar_v - clock.seconds) % 86400
        cd.add_option(alt, fmt_duration(alt), "用抵達時間和伺服器時鐘推算")


def _blocks(page: OcrPage, own_names: Sequence[str]) -> tuple[list[Block], bool, bool]:
    """回傳 (來襲區塊, 有沒有集結點標記, 有沒有看到任何部隊區塊)。"""
    sections = _sections(page)
    lines = [ln for ln in page.lines if not _FOOTER.search(ln.text)]
    is_rally = any(_RALLY_MARK.search(ln.text) for ln in lines) or any(
        s.kind != "unknown" for s in sections
    )
    heads: list[tuple[OcrTextLine, re.Match[str], Section]] = []
    any_troops = False
    for ln in lines:
        t = normalize(ln.text)
        if _INCOMING_HEADER.search(t) or _OTHER_HEADER.search(t):
            any_troops = True
            continue
        m = _VERB.match(t)
        if not m or not m.group("target").strip():
            continue
        sec = _section_at(sections, ln.cy)
        any_troops = True
        heads.append((ln, m, sec))
    heads.sort(key=lambda h: h[0].box[1])

    incoming_x0 = min(
        (ln.box[0] for ln in lines if _INCOMING_HEADER.search(normalize(ln.text))),
        default=None,
    )
    blocks: list[Block] = []
    for i, (ln, m, sec) in enumerate(heads):
        verb = m.group("verb").lower()
        kind = _VERB_KIND.get(verb, _VERB_KIND.get(m.group("verb"), "incoming_attack"))
        target = m.group("target").strip()
        if sec.kind == "other":
            continue
        if sec.kind == "unknown" and not any(_same_name(target, n) for n in own_names):
            # 沒有區塊標題時，只收「目標是自己村莊」的那幾筆，免得把出擊算成來襲
            continue
        if incoming_x0 is not None and ln.box[0] < incoming_x0 - ln.height:
            continue  # 側欄的字，不在部隊表格那一欄
        y0 = ln.box[1] - ln.height * 0.6
        nxt = (
            heads[i + 1][0].box[1] - heads[i + 1][0].height * 0.6
            if i + 1 < len(heads)
            else None
        )
        page_bottom = float(page.height or 1e9)
        y1 = min(nxt if nxt is not None else page_bottom, sec.y1)
        in_rows = [
            o
            for o in lines
            if o is not ln and y0 <= o.cy < y1 and not _VERB.match(normalize(o.text))
        ]
        same_row = [
            o
            for o in in_rows
            if abs(o.cy - ln.cy) < ln.height * 0.7 and o.box[2] <= ln.box[0] + 4
        ]
        # 來源村名：同一列、在標題左邊、離標題最近的那一個
        role_ln = max(same_row, key=lambda o: o.box[2]) if same_row else None
        left = (
            role_ln.box[0] if role_ln else ln.box[0] - (ln.box[2] - ln.box[0])
        ) - ln.height
        right = ln.cx + (ln.cx - left)
        body = [o for o in in_rows if o is not role_ln and left <= o.cx <= right]
        truncated = (
            nxt is None
            and sec.y1 >= page_bottom - 1
            and page.height > 0
            and (page.height - ln.box[3]) < ln.height * 6
        )
        blocks.append(
            Block(
                page=page,
                headline=ln,
                kind=kind,
                who=m.group("who").strip(),
                target=target,
                role=role_ln.text.strip() if role_ln else None,
                lines=body,
                y0=y0,
                y1=y1,
                truncated_bottom=bool(truncated),
            )
        )
    return blocks, is_rally, any_troops


# ------------------------------------------------------------------ merging pages
def _arrival_key(block: Block) -> int | None:
    ar = block.fields.get("arrival")
    if ar and ar.status != "missing":
        return _clock_seconds(ar.value)
    return None


def _same_entry(a: Block, b: Block) -> bool:
    if a.kind != b.kind:
        return False
    ka, kb = _arrival_key(a), _arrival_key(b)
    if ka is not None and kb is not None:
        return abs(ka - kb) <= ARRIVAL_TOLERANCE_S
    ca, cb = a.fields["countdown"].value, b.fields["countdown"].value
    if isinstance(ca, int) and isinstance(cb, int):
        # 第二張晚一點截，倒數只會變小，最多差 5 分鐘
        return 0 <= ca - cb <= 300 and _same_name(a.who, b.who)
    return False


def _merge_field(
    a: FieldResult, b: FieldResult, label: Callable[[Any], str]
) -> FieldResult:
    if a.status == "missing":
        return b
    if b.status == "missing":
        return a
    if a.value != b.value and a.value is not None and b.value is not None:
        keep = a if (a.score or 0) >= (b.score or 0) else b
        keep.add_reason("OVERLAP_MISMATCH")
        keep.add_option(
            a.value, label(a.value), f"第 {(a.image_index or 0) + 1} 張截圖"
        )
        keep.add_option(
            b.value, label(b.value), f"第 {(b.image_index or 0) + 1} 張截圖"
        )
        return keep
    rank = {"ok": 0, "low": 1, "missing": 2}
    return (
        a
        if (rank[a.status], -(a.score or 0)) <= (rank[b.status], -(b.score or 0))
        else b
    )


def _label(name: str) -> Callable[[Any], str]:
    if name == "coords":
        return lambda v: fmt_coords(v["x"], v["y"]) if isinstance(v, dict) else str(v)
    if name == "countdown":
        return lambda v: fmt_duration(v) if isinstance(v, int) else str(v)
    return lambda v: str(v)


def merge_pages(per_page: list[list[Block]]) -> tuple[list[Block], int]:
    """依上傳順序合併；前一張最後 k 筆＝下一張前 k 筆時算重疊，去掉重複。回傳 (清單, 去掉幾筆)。"""
    merged: list[Block] = []
    dropped = 0
    for blocks in per_page:
        if not merged:
            merged = list(blocks)
            continue
        best = 0
        for k in range(min(len(merged), len(blocks)), 0, -1):
            if all(_same_entry(merged[-k + i], blocks[i]) for i in range(k)):
                best = k
                break
        for i in range(best):
            a, b = merged[-best + i], blocks[i]
            for name in FIELD_NAMES:
                a.fields[name] = _merge_field(
                    a.fields[name], b.fields[name], _label(name)
                )
        dropped += best
        merged.extend(blocks[best:])
    return merged, dropped


# ------------------------------------------------------------------ main entry
MapLookup = Callable[[int, int], dict[str, Any] | None]
MapSearch = Callable[[str | None, str | None], list[dict[str, Any]]]


@dataclass
class RallyOcrResult:
    ok: bool
    error_code: str | None = None
    message: str = ""
    data: dict[str, Any] = field(default_factory=dict)
    server_clock: ServerClock | None = None
    low_count: int = 0
    missing_count: int = 0
    dropped_unreadable: int = 0
    overlap_removed: int = 0


def _apply_map(
    f: FieldResult,
    block: Block,
    lookup: MapLookup | None,
    search: MapSearch | None = None,
) -> None:
    if lookup is None or not isinstance(f.value, dict) or f.status == "missing":
        return
    hit = lookup(int(f.value["x"]), int(f.value["y"]))
    if hit is None:  # 沒有地圖資料：不比對
        return

    def note_for(h: dict[str, Any] | None) -> str:
        if not h or not h.get("found"):
            return "地圖上這個座標沒有村莊"
        return f"地圖上是「{h.get('village_name') or '？'}」（{h.get('player_name') or '？'}）"

    if not hit.get("found"):
        f.add_reason("COORD_MAP_MISMATCH")
    elif not (
        _same_name(block.role, hit.get("village_name"))
        or _same_name(block.who, hit.get("player_name"))
    ):
        f.add_reason("COORD_MAP_MISMATCH")
    f.add_option(f.value, fmt_coords(f.value["x"], f.value["y"]), note_for(hit))
    if "COORD_MAP_MISMATCH" in f.reasons and search is not None:
        for cand in search(block.role, block.who)[:3]:
            f.add_option(
                {"x": int(cand["x"]), "y": int(cand["y"])},
                fmt_coords(int(cand["x"]), int(cand["y"])),
                f"地圖上「{cand.get('village_name') or '？'}」（{cand.get('player_name') or '？'}）在這裡",
            )
    for opt in f.options:
        if opt.get("note") is None or opt["value"] == f.value:
            v = opt["value"]
            opt["note"] = note_for(lookup(int(v["x"]), int(v["y"])))
    if f.status == "ok":
        f.options = []  # 對得上就不必給選項


def parse_rally_ocr(
    pages: Sequence[OcrPage],
    *,
    own_village_names: Sequence[str] = (),
    map_lookup: MapLookup | None = None,
    map_search: MapSearch | None = None,
    map_radius: int = DEFAULT_MAP_RADIUS,
) -> RallyOcrResult:
    clock: ServerClock | None = None
    per_page: list[list[Block]] = []
    any_rally = False
    any_troops = False
    for page in pages:
        clock = clock or find_server_clock(page)
        blocks, is_rally, troops = _blocks(page, own_village_names)
        any_rally = any_rally or is_rally
        any_troops = any_troops or troops
        page_clock = find_server_clock(page)
        for b in blocks:
            b.fields["coords"] = _coords_field(b, map_radius)
            b.fields["countdown"], b.fields["arrival"] = _time_fields(b)
            _cross_check_times(b, page_clock)
        per_page.append(blocks)

    if not any_rally and not any(per_page):
        return RallyOcrResult(
            ok=False,
            error_code=FAIL_NOT_RALLY,
            message="認不出這是集結點的截圖。請截集結點「概況」那一頁，把來襲部隊那一段截進去。",
            server_clock=clock,
        )

    merged, overlap_removed = merge_pages(per_page)
    incoming_blocks = [
        b
        for b in merged
        if b.kind in ("incoming_attack", "incoming_raid", "incoming_spy")
    ]
    if not incoming_blocks:
        return RallyOcrResult(
            ok=False,
            error_code=FAIL_NO_INCOMING,
            message="這張集結點截圖裡沒有辨識到來襲（攻擊、搶奪、偵察）。"
            "如果確定有來襲，請把「來村軍團」那一段截進去再試一次；沒有來襲就不用存。",
            server_clock=clock,
        )

    readable = [
        b
        for b in incoming_blocks
        if any(b.fields[n].status != "missing" for n in FIELD_NAMES)
    ]
    dropped = len(incoming_blocks) - len(readable)
    if not readable:
        return RallyOcrResult(
            ok=False,
            error_code=FAIL_ALL_MISSING,
            message=f"辨識到 {len(incoming_blocks)} 筆來襲，但座標和時間全部讀不到。"
            "請把畫面放大、截清楚一點再試，或改用貼上文字。",
            server_clock=clock,
            dropped_unreadable=dropped,
        )

    movements: list[dict[str, Any]] = []
    low = missing = 0
    for b in readable:
        _apply_map(b.fields["coords"], b, map_lookup, map_search)
        coords = b.fields["coords"]
        cd = b.fields["countdown"]
        ar = b.fields["arrival"]
        for f in (coords, cd, ar):
            low += f.status == "low"
            missing += f.status == "missing"
        cv = (
            coords.value
            if coords.status != "missing" and isinstance(coords.value, dict)
            else None
        )
        movements.append(
            {
                "kind": b.kind,
                "role": b.role or b.who,
                "headline": normalize(b.headline.text),
                "coordinate_x": cv["x"] if cv else None,
                "coordinate_y": cv["y"] if cv else None,
                "timer_seconds": cd.value
                if cd.status != "missing" and isinstance(cd.value, int)
                else None,
                "arrival_time": ar.value
                if ar.status != "missing" and isinstance(ar.value, str)
                else None,
                "troops": [],
                "section": "incoming",
                "ocr": {
                    "image_index": b.page.index,
                    "block_box": b.box,
                    "fields": {n: b.fields[n].as_dict() for n in FIELD_NAMES},
                },
            }
        )

    targets = [b.target for b in readable if b.target]
    village_name = max(set(targets), key=targets.count) if targets else None
    data = {
        "village_id": None,
        "village_name": village_name,
        "server_time": fmt_clock(clock.seconds) if clock else None,
        "incoming": movements,
        "incoming_reinforcements": [],
        "outgoing": [],
        "returning": [],
        "garrison_own": [],
        "garrison_stationed": [],
        "reinforcing_others": [],
        "movements": movements,
    }
    return RallyOcrResult(
        ok=True,
        data=data,
        server_clock=clock,
        low_count=low,
        missing_count=missing,
        dropped_unreadable=dropped,
        overlap_removed=overlap_removed,
    )


def find_coordinate_candidates(
    page: OcrPage, radius: int = DEFAULT_MAP_RADIUS
) -> list[dict[str, Any]]:
    """座標欄位旁的相機按鈕：找出截圖裡所有像座標的字。"""
    out: list[dict[str, Any]] = []
    seen: set[tuple[int, int]] = set()
    for ln in page.lines:
        if not (_COORD_HINT.search(normalize(ln.text)) and re.search(r"\d", ln.text)):
            continue
        value, options = parse_coords_text(ln.text)
        vals = (
            [value]
            if value
            else [o for o in options if abs(o["x"]) <= radius and abs(o["y"]) <= radius]
        )
        for v in vals:
            key = (v["x"], v["y"])
            if key in seen or abs(v["x"]) > radius or abs(v["y"]) > radius:
                continue
            seen.add(key)
            f = _base_field(page, ln, v)
            if value is None:
                f.add_reason("NUMBER_FORMAT_INVALID")
            if ln.recheck_text is not None:
                rv, _ = parse_coords_text(ln.recheck_text)
                if rv is not None and rv != v:
                    f.add_reason("CROP_RECHECK_MISMATCH")
            out.append(
                {
                    "x": v["x"],
                    "y": v["y"],
                    "label": fmt_coords(v["x"], v["y"]),
                    "status": f.status,
                    "reasons": f.reasons,
                    "score": round(ln.score, 4),
                    "box": list(ln.box),
                }
            )
    out.sort(key=lambda c: (c["status"] != "ok", -c["score"]))
    return out
