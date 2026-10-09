import { useId } from 'react'
import { useTranslation } from 'react-i18next'

interface StepperProps {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  testId?: string
}

/**
 * 等級輸入：− 數字 ＋（IA v2.2「等級輸入一律用加減鈕」）。
 * 加減鈕是真的 <button>，aria-label「減少」「增加」，點擊範圍 44×44；中間仍可直接打字。
 */
export default function Stepper({ label, value, onChange, min = 0, max = 20, step = 1, testId }: StepperProps) {
  const { t } = useTranslation()
  const id = useId()
  const clamp = (v: number) => Math.max(min, Math.min(max, Number.isFinite(v) ? v : min))
  return (
    <div className="flex min-w-0 flex-col gap-1" data-testid={testId}>
      <label htmlFor={id} className="truncate text-xs text-muted-foreground">
        {label}
      </label>
      <div role="group" aria-label={label} className="flex items-center">
        <button
          type="button"
          aria-label={t('common.decrease')}
          disabled={value <= min}
          onClick={() => onChange(clamp(value - step))}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-l-md border bg-background text-lg disabled:opacity-40"
        >
          −
        </button>
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(clamp(Number(e.target.value)))}
          className="h-11 w-full min-w-[2.75rem] border-y bg-background text-center text-sm tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <button
          type="button"
          aria-label={t('common.increase')}
          disabled={value >= max}
          onClick={() => onChange(clamp(value + step))}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-r-md border bg-background text-lg disabled:opacity-40"
        >
          ＋
        </button>
      </div>
    </div>
  )
}
