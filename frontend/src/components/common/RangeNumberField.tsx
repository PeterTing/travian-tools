import { useId } from 'react'

interface RangeNumberFieldProps {
  label: string
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  testId?: string
  className?: string
  labelClassName?: string
}

/** 超出範圍？（空白或不是數字也算） */
// eslint-disable-next-line react-refresh/only-export-components
export function outOfRange(value: number, min: number, max: number): boolean {
  return !Number.isFinite(value) || value < min || value > max
}

/**
 * 有範圍的數字欄位（P0-17 (j)，設計師規格）：
 * 超出範圍時，錯誤訊息放在欄位正下方（12px 紅字「請輸入 0–75」），框線改紅色；
 * 不用 toast，也不只在結果區顯示「計算失敗」。按計算時由頁面呼叫 focusFirstInvalid() 捲到第一個出錯的欄位。
 */
export default function RangeNumberField({ label, value, onChange, min, max, testId, className = '', labelClassName = 'block text-sm font-medium mb-2' }: RangeNumberFieldProps) {
  const id = useId()
  const errId = `${id}-err`
  const bad = outOfRange(value, min, max)
  return (
    <div className={className}>
      <label htmlFor={id} className={labelClassName}>{label}</label>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        data-testid={testId}
        aria-invalid={bad || undefined}
        aria-describedby={bad ? errId : undefined}
        value={Number.isFinite(value) ? value : ''}
        onChange={(e) => onChange(e.target.value === '' ? NaN : Number(e.target.value))}
        className={`w-full rounded border bg-background p-2 ${bad ? 'border-red-600 outline-red-600' : ''}`}
      />
      {bad && (
        <p id={errId} role="alert" className="mt-1 text-xs text-red-600" data-testid={testId ? `${testId}-error` : undefined}>
          請輸入 {min}–{max}
        </p>
      )}
    </div>
  )
}

/** 按「計算」時：有出錯的欄位就捲到第一個並聚焦，回傳 true（頁面不要送出） */
// eslint-disable-next-line react-refresh/only-export-components
export function focusFirstInvalid(root: ParentNode | null | undefined): boolean {
  const el = root?.querySelector<HTMLInputElement>('input[aria-invalid="true"]')
  if (!el) return false
  el.scrollIntoView?.({ block: 'center', behavior: 'smooth' })
  el.focus({ preventScroll: true })
  return true
}
