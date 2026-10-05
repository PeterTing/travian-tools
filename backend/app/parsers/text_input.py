"""文字／OCR 輸入正規化。"""

from __future__ import annotations

from app.parsers.types import OcrLine, ParseWarning


def ocr_lines_to_text(lines: list[OcrLine]) -> tuple[str, list[ParseWarning]]:
    warnings: list[ParseWarning] = []
    parts: list[str] = []
    for line in lines:
        parts.append(line.text)
        if line.confidence < 0.5:
            warnings.append(
                ParseWarning(
                    code="OCR_LOW_SCORE",
                    message=f"低信心列（{line.confidence:.2f}）：{line.text[:40]}",
                )
            )
    return "\n".join(parts), warnings
