import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import BuildingIcon from './BuildingIcon'
import { buildingMaxLevel, levelOptions } from '@/lib/buildingLevels'

interface LevelSelectProps {
  label: string
  value: number
  onChange: (value: number) => void
  /** 建築 id：決定最高等級，也決定下拉選單左邊的圖示 */
  buildingId?: string | null
  /** 資源田：首都可到 20 級，一般村 10 級 */
  capital?: boolean
  min?: number
  /** 不給就照建築資料的最高等級 */
  max?: number
  testId?: string
  /**
   * 欄位名稱的樣式跟同一頁其他欄位一樣：
   * - 'calc'（預設）：攻略計算器，12px 灰字
   * - 'form'：表單頁，14px
   * - 'hidden'：畫面不顯示（螢幕閱讀器仍唸得到）
   */
  labelStyle?: 'calc' | 'form' | 'hidden'
  /** 直接指定欄位名稱的 class（例如攻擊計畫 ≥640 才藏起來）；有給就不看 labelStyle */
  labelClassName?: string
  /** 選項文字的語言；不給就跟介面語言 */
  lang?: 'zh' | 'en'
  /** 不放圖示（例如欄位本身不是某一棟建築） */
  noIcon?: boolean
  className?: string
}

/**
 * 等級下拉選單（Peter 10/10：建築、資源田等級一律用下拉選單選）。
 * 原生 <select>：高 44px、字 16px（iOS 不會放大）；圖示放在選單左邊（option 放不了 SVG）。
 * 目前的值不在範圍內（例如舊的 localStorage）時，照樣列出來，不偷偷改掉使用者的值。
 */
export default function LevelSelect({
  label, value, onChange, buildingId, capital, min = 0, max, testId, labelStyle = 'calc', labelClassName, lang, noIcon, className = '',
}: LevelSelectProps) {
  const { i18n } = useTranslation()
  const id = useId()
  const en = (lang ?? (i18n.language?.startsWith('en') ? 'en' : 'zh')) === 'en'
  const top = max ?? (buildingId ? buildingMaxLevel(buildingId, { capital }) : 20)
  const opts = levelOptions(min, top)
  if (Number.isFinite(value) && !opts.includes(value)) {
    opts.push(value)
    opts.sort((a, b) => a - b)
  }
  const labelCls = labelClassName ??
    (labelStyle === 'form' ? 'text-sm font-medium' : labelStyle === 'hidden' ? 'sr-only' : 'text-xs text-muted-foreground')
  return (
    <div className={`flex min-w-0 flex-col ${labelStyle === 'form' ? 'gap-2' : 'gap-1'} ${className}`.trim()} data-testid={testId}>
      <label htmlFor={id} className={labelCls}>{label}</label>
      <div className="flex min-w-0 items-center gap-2">
        {!noIcon && buildingId ? <BuildingIcon id={buildingId} size={20} /> : null}
        <select
          id={id}
          value={Number.isFinite(value) ? value : ''}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-11 min-h-11 w-full min-w-0 rounded-md border bg-background px-2 text-base tabular-nums"
        >
          {opts.map((l) => (
            <option key={l} value={l}>{en ? `Lv ${l}` : `${l} 級`}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
