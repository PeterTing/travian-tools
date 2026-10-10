import { BUILDING_ICONS, FIELD_TONE, resolveBuildingIconId } from './icons/buildingIcons'

interface BuildingIconProps {
  /** 建築 id（buildings.json）、'building_15'、'wood_field'、'wood'、遊戲內中文名都可以 */
  id: string | null | undefined
  /** px；清單 20、詳情標題 32 */
  size?: number
  className?: string
}

/**
 * 建築／資源田圖示（藝途自己畫的線條圖示）。純裝飾：aria-hidden，名稱一定另外用文字寫出來。
 * 建築跟文字同色（currentColor）；資源田用四種資源色；「待驗證」「✓ 已核對」不改圖示顏色。
 */
export default function BuildingIcon({ id, size = 20, className = '' }: BuildingIconProps) {
  const key = resolveBuildingIconId(id)
  if (!key) return null
  const tone = FIELD_TONE[key] ?? ''
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      data-building-icon={key}
      className={`shrink-0 ${tone} ${className}`.trim()}
    >
      {BUILDING_ICONS[key]}
    </svg>
  )
}

/** 圖示＋名稱：圖示在名稱左邊、間隔 8px、垂直置中 */
export function BuildingLabel({ id, name, size = 20, className = '' }: { id: string | null | undefined; name: string; size?: number; className?: string }) {
  return (
    <span className={`inline-flex min-w-0 items-center gap-2 ${className}`.trim()}>
      <BuildingIcon id={id} size={size} />
      <span className="min-w-0">{name}</span>
    </span>
  )
}
