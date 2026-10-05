"""全站統一用「部族」，不用「種族」（設計決定，2026-10-05）.

唯一例外：rag_service 的搜尋關鍵字保留「種族」當同義詞（使用者可能還是這樣問）。
"""

from pathlib import Path

BACKEND = Path(__file__).resolve().parents[2]
SCANNED = ("app", "data", "alembic")
SUFFIXES = {".py", ".json", ".md", ".txt", ".yaml", ".yml"}
# 檔案 → 允許出現「種族」的行（只能是搜尋同義詞）
ALLOWED = {
    "app/knowledge_base/rag_service.py": ('"種族",', '"選擇種族",'),
}


def _offenders() -> list[str]:
    found = []
    for top in SCANNED:
        for path in sorted((BACKEND / top).rglob("*")):
            if not path.is_file() or path.suffix not in SUFFIXES:
                continue
            rel = path.relative_to(BACKEND).as_posix()
            allowed = ALLOWED.get(rel, ())
            for n, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
                if "種族" in line and not line.strip().startswith(allowed or ("\0",)):
                    found.append(f"{rel}:{n}: {line.strip()}")
    return found


def test_scans_the_backend_sources() -> None:
    assert len(list((BACKEND / "app").rglob("*.py"))) > 50


def test_uses_buzu_not_zhongzu() -> None:
    assert _offenders() == []


def test_the_rag_synonym_is_the_only_exception() -> None:
    text = (BACKEND / "app/knowledge_base/rag_service.py").read_text(encoding="utf-8")
    assert "部族" in text
