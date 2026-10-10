import { AUTOFILL_SPEEDS } from '@/components/autofill/AutoFillContext'

interface ServerSpeedSelectProps {
  value: number
  onChange: (speed: number) => void
  label?: string
  className?: string
  labelClassName?: string
  selectClassName?: string
  testId?: string
}

/**
 * 伺服器速度下拉（只能選，不能打）：官方只有 x1／x2／x3／x5／x10（S20）。
 * 預設值由頁面從「已帶入」列（useAutoFill().speed，含這頁的「更改」）帶進來。
 */
export default function ServerSpeedSelect({
  value,
  onChange,
  label = '伺服器速度',
  className = 'block text-sm font-medium',
  labelClassName = 'mb-2 block',
  selectClassName = 'w-full rounded border bg-background p-2',
  testId = 'server-speed-select',
}: ServerSpeedSelectProps) {
  return (
    <label className={className}>
      <span className={labelClassName}>{label}</span>
      <select
        data-testid={testId}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={selectClassName}
      >
        {AUTOFILL_SPEEDS.map((s) => (
          <option key={s} value={s}>{`${s}x`}</option>
        ))}
      </select>
    </label>
  )
}
