/** P0-07 辨識中進度條（線框 ②'） */

/** 結果回來前最多到 90%（等待中不會跑滿） */
export const OCR_PROGRESS_CAP = 90
const OCR_PROGRESS_START = 5
/** 越來越慢地逼近上限：5 秒約 59%、10 秒約 78%、15 秒約 86%（上線實測冷啟動約 13 秒） */
const OCR_PROGRESS_TAU_MS = 5000

export function ocrProgress(elapsedMs: number): number {
  const t = Math.max(0, elapsedMs)
  const span = OCR_PROGRESS_CAP - OCR_PROGRESS_START
  const pct = OCR_PROGRESS_START + span * (1 - Math.exp(-t / OCR_PROGRESS_TAU_MS))
  return Math.min(OCR_PROGRESS_CAP, Math.round(pct))
}
