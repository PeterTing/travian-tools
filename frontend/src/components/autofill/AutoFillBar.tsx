import { useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import PendingVerifyChip, { PendingRow } from '@/components/common/PendingVerifyChip'
import { usesUnitData } from '@/components/layout/navItems'
import { ROUTES } from '@/constants/routes'
import { formatOffsetHours } from '@/lib/serverTime'
import type { TroopTribe, Village } from '@/types/game'
import { AUTOFILL_SPEEDS, useAutoFill, type AutoFillSpeed } from './AutoFillContext'

const TRIBES: TroopTribe[] = ['romans', 'teutons', 'gauls', 'huns', 'egyptians', 'spartans', 'vikings']

// eslint-disable-next-line react-refresh/only-export-components
export function villageLabel(v: Village): string {
  const coords = v.coordinate_x != null && v.coordinate_y != null ? ` (${v.coordinate_x}|${v.coordinate_y})` : ''
  return `${v.name || v.village_id}${coords}`
}

interface AutoFillBarProps {
  /** 用不到村莊的計算器只顯示帳號和世界 */
  usesVillage?: boolean
  /** 預設照網址判斷（navItems.UNIT_DATA_ROUTES） */
  unitData?: boolean
  /** 第二行：這頁用的假設 */
  assumption?: ReactNode
}

/**
 * 計算器最上面的「已帶入」列（IA v2.2）：
 *   已帶入：PeterT · ts11（x1・高盧）· 主村 (0|0)   更改
 *   時差 +6 小時（從貼上的頁面讀到）／時差：貼一頁就會自動設好
 *   〔待驗證〕兵種花費、糧耗、訓練時間尚未在 ts11 核對   ← 只在用到兵種資料的頁面
 *             斯巴達速度待驗證                          （兩行對齊灰標右邊）
 */
export default function AutoFillBar({ usesVillage = true, unitData, assumption }: AutoFillBarProps) {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const fill = useAutoFill()
  const [editing, setEditing] = useState(false)
  const showUnitLine = unitData ?? usesUnitData(pathname)
  const { account, village, villages, speed, tribe, offsetHours, overrides } = fill
  const overridden = overrides.speed != null || overrides.tribe != null

  const worldParts = [`x${speed}`, tribe ? t(`tribes.${tribe}`) : null].filter(Boolean).join('・')

  return (
    <div
      className="mb-4 space-y-1 rounded-lg border border-orange-200 bg-orange-50/60 px-3 py-2 text-sm"
      data-testid="autofill-bar"
    >
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="shrink-0 text-xs font-semibold text-orange-700">{t('autofill.label')}</span>
        {account ? (
          <span className="min-w-0 break-words" data-testid="autofill-summary">
            {account.player_name || account.server_name || account.server_url}
            {' · '}
            {account.server_name || account.server_url}（{worldParts}）
            {usesVillage && village && <> · {villageLabel(village)}</>}
            {overridden && <span className="ml-1 text-xs text-orange-700">{t('autofill.thisPageOnly')}</span>}
          </span>
        ) : (
          <span className="min-w-0 break-words text-muted-foreground" data-testid="autofill-summary">
            {t('autofill.noAccount')}{' '}
            <Link to={ROUTES.GAME_ACCOUNTS_NEW} className="text-orange-700 underline">
              {t('autofill.addAccount')}
            </Link>
          </span>
        )}
        {/* 點擊範圍 44×44；負邊距讓它不把這一行撐高、也不把摘要擠到下一行 */}
        <button
          type="button"
          className="-my-3 -mr-3 ml-auto inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center px-1 text-xs text-orange-700 underline"
          aria-expanded={editing}
          onClick={() => setEditing((v) => !v)}
          data-testid="autofill-edit"
        >
          {editing ? t('autofill.done') : t('autofill.change')}
        </button>
      </div>

      <p className="text-xs text-muted-foreground" data-testid="autofill-offset">
        {offsetHours == null
          ? t('autofill.offsetUnknown')
          : t('autofill.offsetKnown', { hours: formatOffsetHours(offsetHours) })}
      </p>

      {showUnitLine && (
        // 兩行都對齊灰標右邊的文字起點（懸掛縮排），不折到灰標底下；一個灰標管這兩行（autofillUnits）
        <PendingRow className="flex items-baseline gap-1 text-xs text-muted-foreground" data-testid="autofill-unit-pending">
          <PendingVerifyChip className="shrink-0" kind="autofillUnits" />
          <div className="min-w-0" data-testid="autofill-unit-pending-text">
            <p data-testid="autofill-unit-pending-line1">{t('autofill.unitPending')}</p>
            <p data-testid="autofill-unit-pending-line2">{t('autofill.unitPendingSpartan')}</p>
          </div>
        </PendingRow>
      )}

      {assumption && (
        <p className="text-xs text-muted-foreground" data-testid="autofill-assumption">
          {assumption}
        </p>
      )}

      {editing && (
        <div className="grid grid-cols-1 gap-2 border-t border-orange-200 pt-2 sm:grid-cols-3" data-testid="autofill-editor">
          <label className="flex flex-col gap-1 text-xs">
            {t('autofill.speed')}
            <select
              className="min-h-[44px] rounded border bg-background px-2 text-sm"
              value={speed}
              onChange={(e) => fill.setOverride({ speed: Number(e.target.value) as AutoFillSpeed })}
            >
              {AUTOFILL_SPEEDS.map((sp) => (
                <option key={sp} value={sp}>
                  x{sp}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs">
            {t('autofill.tribe')}
            <select
              className="min-h-[44px] rounded border bg-background px-2 text-sm"
              value={tribe ?? ''}
              onChange={(e) => e.target.value && fill.setOverride({ tribe: e.target.value as TroopTribe })}
            >
              {!tribe && <option value="">—</option>}
              {TRIBES.map((tr) => (
                <option key={tr} value={tr}>
                  {t(`tribes.${tr}`)}
                </option>
              ))}
            </select>
          </label>
          {usesVillage && villages.length > 0 && (
            <label className="flex flex-col gap-1 text-xs">
              {t('autofill.village')}
              <select
                className="min-h-[44px] rounded border bg-background px-2 text-sm"
                value={village?.village_id ?? ''}
                onChange={(e) => fill.selectVillage(e.target.value)}
              >
                {villages.map((v) => (
                  <option key={v.village_id} value={v.village_id}>
                    {villageLabel(v)}
                  </option>
                ))}
              </select>
            </label>
          )}
          <p className="text-xs text-muted-foreground sm:col-span-3">{t('autofill.editNote')}</p>
        </div>
      )}
    </div>
  )
}

/**
 * 欄位旁的小字：從帳號帶進來時寫來源（橘色），使用者改過就寫「已手動修改 · 還原」。
 */
export function AutoFillHint({
  source,
  manual,
  onRestore,
  testId,
}: {
  source: string
  manual: boolean
  onRestore: () => void
  testId?: string
}) {
  const { t } = useTranslation()
  if (manual) {
    return (
      <span className="text-xs text-muted-foreground" data-testid={testId}>
        {t('autofill.manual')} ·{' '}
        <button type="button" className="text-orange-700 underline" onClick={onRestore}>
          {t('autofill.restore')}
        </button>
      </span>
    )
  }
  return (
    <span className="text-xs text-orange-700" data-testid={testId}>
      {source}
    </span>
  )
}
