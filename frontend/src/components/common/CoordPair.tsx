import { useId, useState, type ClipboardEvent } from 'react'
import {
  coordRangeMessage,
  parseCoordAxis,
  parseCoordPair,
  sanitizeCoordText,
  type CoordText,
} from '@/lib/coords'
import { useMapRadius } from '@/lib/mapRadius'

interface CoordPairProps {
  value: CoordText
  onChange: (value: CoordText) => void
  labelX?: string
  labelY?: string
  /** 範圍半徑；不給就用目前世界的地圖大小（沒有資料退回 ±200） */
  radius?: number
  /**
   * true（預設）：兩格都要填，空白算錯。
   * false：兩格都空白可以（例如村莊沒填座標），只填一格才算錯。
   */
  required?: boolean
  /** 按過「計算」：空白的格子也顯示紅字（還沒碰過的空白格平常不顯示） */
  showErrors?: boolean
  /** data-testid 前綴：輸入框是 `${testId}-x`／`${testId}-y`，錯誤字加 `-error` */
  testId?: string
  /** 外框（預設一列兩格）；放進別人的 grid 時用 'contents' */
  className?: string
  fieldClassName?: string
  labelClassName?: string
}

type Axis = 'x' | 'y'

/**
 * 座標 X／Y 一組（全站共用）。
 * - 預設空白，placeholder「X」「Y」，不會自己補 0。
 * - type="text"＋inputMode="text"：iOS 數字鍵盤打不出「-」，所以用全鍵盤，整數自己檢查。
 * - 打字和貼上都先清掉遊戲複製來的方向字元、把「−」換成「-」。
 * - 在任一格貼上「(33|-4)」「33|-4」會自動拆進 X 和 Y。
 * - 空白或超出範圍：欄位正下方 12px 紅字、框線變紅（跟 RangeNumberField 同一套）。
 * - 16px 字、高 44px（iOS 小於 16px 一點就會放大畫面）。
 */
export default function CoordPair({
  value,
  onChange,
  labelX = 'X',
  labelY = 'Y',
  radius: radiusProp,
  required = true,
  showErrors = false,
  testId,
  className = 'grid grid-cols-2 gap-3',
  fieldClassName = 'min-w-0',
  labelClassName = 'block text-sm font-medium mb-2',
}: CoordPairProps) {
  const worldRadius = useMapRadius()
  const radius = radiusProp ?? worldRadius
  const id = useId()
  const [touched, setTouched] = useState<Record<Axis, boolean>>({ x: false, y: false })

  const bothEmpty = value.x.trim() === '' && value.y.trim() === ''

  const errorFor = (axis: Axis): string | null => {
    const text = value[axis].trim()
    const pending = text === '-' || text === '+'
    if (text === '') {
      if (!required && bothEmpty) return null
      return touched[axis] || showErrors ? coordRangeMessage(radius) : null
    }
    if (parseCoordAxis(text, radius) != null) return null
    // 正在打負號（只有「-」）：離開欄位或按過計算才標紅
    if (pending && !touched[axis] && !showErrors) return null
    return coordRangeMessage(radius)
  }

  const setAxis = (axis: Axis, raw: string) => {
    const clean = sanitizeCoordText(raw)
    const pair = parseCoordPair(clean)
    if (pair) {
      onChange({ x: String(pair.x), y: String(pair.y) })
      return
    }
    onChange({ ...value, [axis]: clean.replace(/\s+/g, '') })
  }

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData?.getData('text') ?? ''
    const pair = parseCoordPair(text)
    if (!pair) return
    // 整段換掉（不跟格子裡原本的字接在一起）
    e.preventDefault()
    onChange({ x: String(pair.x), y: String(pair.y) })
  }

  const field = (axis: Axis, label: string) => {
    const inputId = `${id}-${axis}`
    const errId = `${inputId}-err`
    const err = errorFor(axis)
    return (
      <div className={fieldClassName}>
        <label htmlFor={inputId} className={labelClassName}>{label}</label>
        <input
          id={inputId}
          type="text"
          inputMode="text"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder={axis === 'x' ? 'X' : 'Y'}
          data-testid={testId ? `${testId}-${axis}` : undefined}
          aria-invalid={err ? true : undefined}
          aria-describedby={err ? errId : undefined}
          value={value[axis]}
          onChange={(e) => setAxis(axis, e.target.value)}
          onPaste={handlePaste}
          onBlur={() => setTouched((prev) => (prev[axis] ? prev : { ...prev, [axis]: true }))}
          className={`h-11 w-full min-w-0 rounded border bg-background px-3 text-base text-foreground ${err ? 'border-red-600 outline-red-600' : ''}`}
        />
        {err && (
          <p id={errId} role="alert" className="mt-1 text-xs text-red-600" data-testid={testId ? `${testId}-${axis}-error` : undefined}>
            {err}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className={className}>
      {field('x', labelX)}
      {field('y', labelY)}
    </div>
  )
}
