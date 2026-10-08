# OCR fixtures (P0-07)

tt-ocr (`ocr/`, RapidOCR 3.9.2 PP-OCRv6 small, 1 vCPU / 1 GiB container) output for
rally-point screenshots. Only the OCR JSON is stored (text, score, box, 2× recheck), no
images, cookies or session data.

| file | source |
|---|---|
| `ts11-rally-overview-1440.json` / `-390.json` | real ts11 (INTERNATIONAL 11) rally point overview, desktop 1440 wide / phone 390 wide (DPR 3). Beginner protection, so **no incoming** (→ `OCR_NO_INCOMING`). |
| `synthetic-attack3-1440.json` / `-390.json` | the real rally page HTML with an incoming-troops table filled from fixture data (fictional attacker “Raider”, villages 敵方村 (−45\|12), 敵方二村 (−48\|12)); rendered offline and screenshotted. |
| `synthetic-attack3-390-lowres-q35.json` | the 390 screenshot downscaled to DPR 1.5 + JPEG q35 (one coordinate gets a different 2× re-read → low confidence). |
| `synthetic-attack3-390-dpr1-q30.json` | DPR 1 + JPEG q30: verbs misread → must fail explicitly, never a silent wrong save. |
| `synthetic-attack3-390-cut.json` | screenshot cut through the 3rd incoming entry (→ 待補 `TRUNCATED_AT_EDGE`). |
| `synthetic-attack3-390-part2.json` | lower part of the phone screenshot (entries 2–3, no section header) for the two-screenshot overlap merge. |

A real screenshot with real incoming attacks is still missing (the account is under
beginner protection); replace/add one when available.
