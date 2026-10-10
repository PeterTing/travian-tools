import { useId, useState, type MouseEvent } from 'react'
import { useTranslation } from 'react-i18next'
import PendingVerifyChip, { PendingNotePanel } from './PendingVerifyChip'
import { buildingSource, isBuildingEffectVerified, isBuildingVerified } from '@/data/gameData'

interface BuildingVerifyMarkProps {
  buildingId: string
  className?: string
  /** 放在深色底（列表選中的那一列 bg-primary）上：字改淺綠，對比 ≥ 4.5:1（TICKETS P0-17 (u)） */
  onDark?: boolean
}

/**
 * 建築名稱旁的標記：核對過的顯示小字「✓ 已核對」（不只一個圖示，P0-23 設計師），點一下在下面展開兩行說明（第一行哪些數字核對過，第二行出處：
 * 「ts11 遊戲內說明」／「官方知識庫」，P0-23）；其他給一個「待驗證」小灰標（不逐格標）。
 * 點擊範圍用透明延伸補到 44×44，外觀不變；只靠點，不靠 hover。
 */
export default function BuildingVerifyMark({ buildingId, className = '', onDark = false }: BuildingVerifyMarkProps) {
  const { t } = useTranslation()
  const id = useId()
  const panelId = `verified-note-${id.replace(/:/g, '')}`
  const [open, setOpen] = useState(false)
  if (isBuildingVerified(buildingId)) {
    const source = buildingSource(buildingId) ?? 'ts11L1Kb'
    const onClick = (e: MouseEvent<HTMLButtonElement>) => {
      // 在可點的列表項目裡：只開說明，不要順便選到那一棟
      e.stopPropagation()
      e.preventDefault()
      setOpen((v) => !v)
    }
    return (
      <>
        <button
          type="button"
          id={`${panelId}-chip`}
          data-testid="verified-mark"
          data-source={source}
          aria-label={t('common.verifiedTs11')}
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          onClick={onClick}
          className={`relative ml-1 whitespace-nowrap align-middle text-[12px] font-normal ${onDark ? 'text-green-300' : 'text-green-700'} before:absolute before:left-1/2 before:top-1/2 before:h-11 before:w-11 before:-translate-x-1/2 before:-translate-y-1/2 before:content-[''] ${className}`}
        >
          {t('common.verifiedShort')}
        </button>
        {/* 效果也照官方知識庫核對過：第一行加「效果」（P0-23）；沒核對的效果在詳情的效果欄另標待驗證 */}
        {open && <PendingNotePanel fill id={panelId} kinds={[source]} ns="verifiedNotes" whatKeys={[isBuildingEffectVerified(buildingId) ? 'verifiedNotes.whatWithEffect' : undefined]} />}
      </>
    )
  }
  return <PendingVerifyChip className={`ml-1 ${className}`} kind="building" />
}

/** 頁首一行灰字：除標「✓ 已核對」的建築外，數值皆未核對 */
export function BuildingVerifyLegend() {
  const { t } = useTranslation()
  return (
    <p className="mb-4 text-xs text-gray-500" data-testid="building-verify-legend">
      {t('common.buildingVerifyLegend')}
    </p>
  )
}
