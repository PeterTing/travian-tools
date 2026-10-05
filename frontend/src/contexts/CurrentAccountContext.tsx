import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { gameAccountApi } from '@/services/gameAccountApi'
import type { GameAccount } from '@/types/game'

interface CurrentAccountContextType {
  /** 這個使用者可以切換的帳號＋世界（只列啟用中的） */
  accounts: GameAccount[]
  /** 目前選的帳號＋世界；沒有任何帳號時是 null */
  currentAccount: GameAccount | null
  loading: boolean
  selectAccount: (accountId: string) => void
  /** 帳號新增、修改、刪除後重新讀一次清單 */
  reload: () => Promise<void>
}

const CurrentAccountContext = createContext<CurrentAccountContextType | undefined>(undefined)

/** 每個網站使用者各自記住上次選的帳號＋世界 */
// eslint-disable-next-line react-refresh/only-export-components
export function currentAccountStorageKey(userId: string): string {
  return `travian.currentAccount.${userId}`
}

function readStored(userId: string): string | null {
  try {
    return localStorage.getItem(currentAccountStorageKey(userId))
  } catch {
    return null
  }
}

function writeStored(userId: string, accountId: string): void {
  try {
    localStorage.setItem(currentAccountStorageKey(userId), accountId)
  } catch {
    // 無痕模式等情況存不了，就只在這次開啟期間記住
  }
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCurrentAccount() {
  const context = useContext(CurrentAccountContext)
  if (context === undefined) {
    throw new Error('useCurrentAccount must be used within a CurrentAccountProvider')
  }
  return context
}

export function CurrentAccountProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth()
  const userId = isAuthenticated && user ? user.user_id : null
  const [accounts, setAccounts] = useState<GameAccount[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    if (!userId) {
      setAccounts([])
      setSelectedId(null)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const response = await gameAccountApi.getAll(false)
      setAccounts(response.accounts)
      setSelectedId((previous) => previous ?? readStored(userId))
    } catch (error) {
      console.error('Failed to load accounts:', error)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    // 換了使用者就重新讀這個人記住的選擇
    setSelectedId(userId ? readStored(userId) : null)
    void reload()
  }, [userId, reload])

  // 記住的帳號已經刪掉或停用時，退回清單第一個
  const currentAccount = useMemo(
    () => accounts.find((a) => a.account_id === selectedId) ?? accounts[0] ?? null,
    [accounts, selectedId]
  )

  const selectAccount = useCallback(
    (accountId: string) => {
      setSelectedId(accountId)
      if (userId) writeStored(userId, accountId)
    },
    [userId]
  )

  const value = useMemo(
    () => ({ accounts, currentAccount, loading, selectAccount, reload }),
    [accounts, currentAccount, loading, selectAccount, reload]
  )

  return <CurrentAccountContext.Provider value={value}>{children}</CurrentAccountContext.Provider>
}
