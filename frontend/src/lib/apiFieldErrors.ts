/**
 * 後端 422 的欄位錯誤（FastAPI／pydantic：detail = [{ loc: [..., 欄位], msg }]）→ { 欄位: 訊息 }。
 * 錯誤訊息照網站規則顯示在欄位正下方，不用「計算失敗」帶過。
 * pydantic 的 ValueError 訊息前面會加「Value error, 」，拿掉。
 */
export function apiFieldErrors(err: unknown): Record<string, string> {
  const detail = (err as { response?: { status?: number; data?: { detail?: unknown } } })?.response?.data?.detail
  if (!Array.isArray(detail)) return {}
  const out: Record<string, string> = {}
  for (const d of detail as { loc?: unknown[]; msg?: string }[]) {
    const field = Array.isArray(d.loc) ? d.loc[d.loc.length - 1] : undefined
    if (typeof field === 'string' && d.msg && !out[field]) out[field] = d.msg.replace(/^Value error,\s*/, '')
  }
  return out
}

/** 後端回的單一錯誤訊息（detail 是字串時）；沒有就 null */
export function apiErrorMessage(err: unknown): string | null {
  const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail
  return typeof detail === 'string' ? detail : null
}
