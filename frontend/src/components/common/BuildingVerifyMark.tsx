import { useTranslation } from 'react-i18next'
import PendingVerifyChip from './PendingVerifyChip'
import { isBuildingVerified } from '@/data/gameData'

interface BuildingVerifyMarkProps {
  buildingId: string
  className?: string
}

/** 建築名稱旁的標記：核對過的（ts11 遊戲內說明＋官方知識庫，P0-23）打 ✓，其他給一個「待驗證」小灰標（不逐格標）。 */
export default function BuildingVerifyMark({ buildingId, className = '' }: BuildingVerifyMarkProps) {
  const { t } = useTranslation()
  if (isBuildingVerified(buildingId)) {
    return (
      <span
        data-testid="verified-mark"
        className={`ml-1 align-middle text-sm text-green-600 ${className}`}
        aria-label={t('common.verifiedTs11')}
      >
        ✓
      </span>
    )
  }
  return <PendingVerifyChip className={`ml-1 ${className}`} kind="building" />
}

/** 頁首一行灰字：除標 ✓ 的建築外，數值皆未核對 */
export function BuildingVerifyLegend() {
  const { t } = useTranslation()
  return (
    <p className="mb-4 text-xs text-gray-500" data-testid="building-verify-legend">
      {t('common.buildingVerifyLegend')}
    </p>
  )
}
