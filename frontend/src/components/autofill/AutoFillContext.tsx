import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { useCurrentAccount } from '@/contexts/CurrentAccountContext'
import { useAccountData } from '@/contexts/AccountDataContext'
import { displayOffsetHours } from '@/lib/serverTime'
import { birthTribeOf, isMultiTribeWorld, villageTribeOf } from '@/lib/villageTribe'
import type { GameAccount, TroopTribe, Village } from '@/types/game'

export const AUTOFILL_SPEEDS = [1, 2, 3, 5, 10] as const
export type AutoFillSpeed = (typeof AUTOFILL_SPEEDS)[number]

export interface AutoFillOverrides {
  speed?: AutoFillSpeed
  tribe?: TroopTribe
}

export interface AutoFillValue {
  account: GameAccount | null
  village: Village | null
  villages: Village[]
  /** 伺服器速度：這頁改過就用改過的，不然帳號的 */
  speed: AutoFillSpeed
  /**
   * 部族（兵種、建築、商人用）：這頁改過就用改過的，不然是目前村莊的部族
   * （一般伺服器 = 帳號的出生部族）；帳號沒填是 null
   */
  tribe: TroopTribe | null
  /** 帳號原本的值（「還原」用）；accountTribe 是目前村莊的部族 */
  accountSpeed: AutoFillSpeed
  accountTribe: TroopTribe | null
  /** 出生部族（註冊時選的）：英雄相關的計算用它，不跟著村莊換（P0-25） */
  birthTribe: TroopTribe | null
  /** 「征服保留部族」的世界：村莊可以是不同部族 */
  multiTribe: boolean
  /** 時差（本地 − 伺服器，小時）；還沒貼過頁面是 null */
  offsetHours: number | null
  overrides: AutoFillOverrides
  setOverride: (o: AutoFillOverrides) => void
  clearOverride: (key: keyof AutoFillOverrides) => void
  selectVillage: (villageId: string) => void
}

function toSpeed(n: number | null | undefined): AutoFillSpeed {
  return (AUTOFILL_SPEEDS as readonly number[]).includes(Number(n)) ? (Number(n) as AutoFillSpeed) : 1
}

const AutoFillContext = createContext<AutoFillValue | null>(null)

/**
 * 「已帶入」的值（IA v2.2）。帳號、世界、村莊、時差自動帶入；
 * 這頁按「更改」只改這一頁，換頁就回到帳號的值，不會動到帳號設定。
 */
export function AutoFillProvider({ children }: { children: ReactNode }) {
  const { currentAccount } = useCurrentAccount()
  const { world, villages, selectedVillage, selectVillage } = useAccountData()
  const { pathname } = useLocation()
  const [overrides, setOverrides] = useState<AutoFillOverrides>({})

  // 換頁就丟掉暫時的修改
  useEffect(() => {
    setOverrides({})
  }, [pathname, currentAccount?.account_id])

  const setOverride = useCallback((o: AutoFillOverrides) => setOverrides((prev) => ({ ...prev, ...o })), [])
  const clearOverride = useCallback(
    (key: keyof AutoFillOverrides) =>
      setOverrides((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      }),
    [],
  )

  const value = useMemo<AutoFillValue>(() => {
    const accountSpeed = toSpeed(currentAccount?.server_speed)
    const birthTribe = birthTribeOf(currentAccount)
    const accountTribe = villageTribeOf(selectedVillage, currentAccount, world)
    return {
      account: currentAccount,
      village: selectedVillage,
      villages,
      speed: overrides.speed ?? accountSpeed,
      tribe: overrides.tribe ?? accountTribe,
      accountSpeed,
      accountTribe,
      birthTribe,
      multiTribe: isMultiTribeWorld(world),
      offsetHours: displayOffsetHours(world?.utc_offset),
      overrides,
      setOverride,
      clearOverride,
      selectVillage,
    }
  }, [currentAccount, selectedVillage, villages, world, overrides, setOverride, clearOverride, selectVillage])

  return <AutoFillContext.Provider value={value}>{children}</AutoFillContext.Provider>
}

const FALLBACK: AutoFillValue = {
  account: null,
  village: null,
  villages: [],
  speed: 1,
  tribe: null,
  accountSpeed: 1,
  accountTribe: null,
  birthTribe: null,
  multiTribe: false,
  offsetHours: null,
  overrides: {},
  setOverride: () => undefined,
  clearOverride: () => undefined,
  selectVillage: () => undefined,
}

/** 沒有 Provider（單頁測試）時回傳預設值：x1、沒有帳號 */
// eslint-disable-next-line react-refresh/only-export-components
export function useAutoFill(): AutoFillValue {
  return useContext(AutoFillContext) ?? FALLBACK
}
