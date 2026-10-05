"""共用解析器：擴充 HTML、貼上文字、截圖辨識結果都走這裡。"""

from app.parsers.api import parse_page
from app.parsers.types import PageInput, ParseResult, ParseWarning

__all__ = ["parse_page", "PageInput", "ParseResult", "ParseWarning"]
