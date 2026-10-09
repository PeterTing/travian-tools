import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useCurrentAccount } from '@/contexts/CurrentAccountContext'
import { PREF_KEYS, readPref, writePref } from '@/lib/localPrefs'
import { gameWorldApi } from '@/services/gameWorldApi'
import { pasteApi, type Movement } from '@/services/pasteApi'
import { villageApi } from '@/services/villageApi'
import type { GameWorld, Village } from '@/types/game'

/**
 * 目前帳號的資料（IA v2.2）：世界（時差）、村莊、來襲。
 * 首頁的卡、底部分頁的紅點、計算器的「已帶入」列都從這裡讀，只抓一次。
 */
interface AccountDataContextType {
  world: GameWorld | null
  villages: Village[]
  /** 「已帶入」用的村莊：上次選的村，沒有的話用首都 */
  selectedVillage: Village | null
  selectVillage: (villageId: string) => void
  incoming: Movement[]
  /** 還沒抵達的來襲（底部「首頁」分頁和左側「防守」的紅點） */
  unarrivedIncoming: Movement[]
  loaded: boolean
  reload: () => Promise<void>
}

const EMPTY: AccountDataContextType = {
  world: null,
  villages: [],
  selectedVillage: null,
  selectVillage: () => undefined,
  incoming: [],
  unarrivedIncoming: [],
  loaded: false,
  reload: async () => undefined,
}

const AccountDataContext = createContext<AccountDataContextType | undefined>(undefined)

/** 沒有 Provider 時（單頁測試）回傳空資料，不丟錯 */
// eslint-disable-next-line react-refresh/only-export-components
export function useAccountData(): AccountDataContextType {
  return useContext(AccountDataContext) ?? EMPTY
}

/** 選村規則：記住的村還在就用它，不然首都，再不然第一個 */
// eslint-disable-next-line react-refresh/only-export-components
export function pickVillage(villages: readonly Village[], rememberedId: string | null): Village | null {
  return (
    villages.find((v) => v.village_id === rememberedId) ??
    villages.find((v) => v.is_capital) ??
    villages[0] ??
    null
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function isUnarrived(m: Movement, now: Date): boolean {
  if (!m.arrival_at) return false
  const t = new Date(m.arrival_at).getTime()
  return !Number.isNaN(t) && t > now.getTime()
}

export function AccountDataProvider({ children }: { children: ReactNode }) {
  const { currentAccount } = useCurrentAccount()
  const accountId = currentAccount?.account_id ?? null
  const worldId = currentAccount?.world_id ?? null
  const [world, setWorld] = useState<GameWorld | null>(null)
  const [villages, setVillages] = useState<Village[]>([])
  const [incoming, setIncoming] = useState<Movement[]>([])
  const [remembered, setRemembered] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [now, setNow] = useState(() => new Date())

  const reload = useCallback(async () => {
    if (!accountId) {
      setWorld(null)
      setVillages([])
      setIncoming([])
      setLoaded(true)
      return
    }
    const [w, v, m] = await Promise.allSettled([
      worldId ? gameWorldApi.getAll() : Promise.resolve(null),
      villageApi.getAll(accountId),
      pasteApi.listMovements(accountId),
    ])
    setWorld(
      w.status === 'fulfilled' && w.value ? (w.value.worlds.find((x) => x.world_id === worldId) ?? null) : null,
    )
    setVillages(v.status === 'fulfilled' ? (v.value.villages ?? []) : [])
    setIncoming(m.status === 'fulfilled' ? (m.value.movements ?? []) : [])
    setLoaded(true)
  }, [accountId, worldId])

  useEffect(() => {
    setLoaded(false)
    setRemembered(accountId ? readPref(PREF_KEYS.lastVillage(accountId)) : null)
    void reload()
  }, [accountId, reload])

  // 每 30 秒重算一次「還沒抵達」，最後一筆抵達後紅點自己消失
  useEffect(() => {
    if (!incoming.length) return
    const id = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(id)
  }, [incoming.length])

  const selectVillage = useCallback(
    (villageId: string) => {
      setRemembered(villageId)
      if (accountId) writePref(PREF_KEYS.lastVillage(accountId), villageId)
    },
    [accountId],
  )

  const value = useMemo<AccountDataContextType>(() => {
    const unarrivedIncoming = incoming.filter((m) => isUnarrived(m, now))
    return {
      world,
      villages,
      selectedVillage: pickVillage(villages, remembered),
      selectVillage,
      incoming,
      unarrivedIncoming,
      loaded,
      reload,
    }
  }, [world, villages, remembered, selectVillage, incoming, now, loaded, reload])

  return <AccountDataContext.Provider value={value}>{children}</AccountDataContext.Provider>
}
