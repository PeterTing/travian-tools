import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

/**
 * 一頁只開一個「待驗證」說明（P0-17）：打開另一個就關掉上一個。
 * AppShell 用網址當 key 包一層，換頁就全部收起來。
 */
interface PendingNoteGroupValue {
  openId: string | null
  setOpenId: (id: string | null) => void
}

const PendingNoteGroupContext = createContext<PendingNoteGroupValue | null>(null)

export function PendingNoteGroupProvider({ children }: { children: ReactNode }) {
  const [openId, setOpenId] = useState<string | null>(null)
  const value = useMemo(() => ({ openId, setOpenId }), [openId])
  return <PendingNoteGroupContext.Provider value={value}>{children}</PendingNoteGroupContext.Provider>
}

/** 沒有 Provider（單一元件測試）時回 null，灰標自己記開關 */
// eslint-disable-next-line react-refresh/only-export-components
export function usePendingNoteGroup(): PendingNoteGroupValue | null {
  return useContext(PendingNoteGroupContext)
}

/** 灰標所在的那一行：說明面板畫在這一行的正下方（在版面裡，不浮在內容上） */
export interface PendingRowSlot {
  register: (chip: { id: string; kind: string; open: boolean } | null) => void
}

// eslint-disable-next-line react-refresh/only-export-components
export const PendingRowContext = createContext<PendingRowSlot | null>(null)
