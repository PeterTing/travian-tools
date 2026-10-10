import { createContext, useContext, type ReactNode } from 'react'
import AutoFillBar from './AutoFillBar'

type FrameValue = { usesVillage: boolean }

const CalcFrameContext = createContext<FrameValue | null>(null)

/**
 * 計算器頁的外框：只告訴頁面「這頁要放『已帶入』列」。
 * 列本身由頁面用 <CalcBar /> 放在標題下面、輸入區上面，跟「CP 與開村」一樣，
 * 所有計算器的位置才會一致。
 */
export default function CalcFrame({ children, usesVillage = true }: { children: ReactNode; usesVillage?: boolean }) {
  return <CalcFrameContext.Provider value={{ usesVillage }}>{children}</CalcFrameContext.Provider>
}

/**
 * 放在頁面標題（和說明）之後、第一個輸入區之前。
 * 頁面有自己的部族選單（兵種資料庫、盔甲廠升級、開局時間表、農場收益選的兵）要傳 tribe。
 * 不在 CalcFrame 裡（例如單頁測試、或頁面被別的地方重用）就什麼都不畫。
 */
export function CalcBar({ tribe }: { tribe?: string | null } = {}) {
  const frame = useContext(CalcFrameContext)
  if (!frame) return null
  // tribe：頁面有部族選單就傳選單的值，兵種待驗證那一行看它（P0-17 (k)）
  return <AutoFillBar usesVillage={frame.usesVillage} unitTribe={tribe} />
}
