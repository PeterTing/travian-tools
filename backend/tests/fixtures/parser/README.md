# Parser fixtures（P0-03）

- `statistics/*.html`：多村總覽四頁，給原本 skip 的 `test_statistics_page_parser` 用。
- `dorf1.html` / `dorf2.html` / `reports.html` / `troop_statistics.html` / `rally_point.html`：擴充上傳與集結點驗收。
- `golden/*.json`：舊版 content.js 在同一組 fixture 上產出的上傳 body，用來證明共用解析器結果不變。

樣本依真實 Travian: Legends 結構製作並匿名化；不含腳本、不含真實密碼。
