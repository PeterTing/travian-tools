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
 * 不在 CalcFrame 裡（例如單頁測試、或頁面被別的地方重用）就什麼都不畫。
 */
export function CalcBar() {
  const frame = useContext(CalcFrameContext)
  if (!frame) return null
  return <AutoFillBar usesVillage={frame.usesVillage} />
}
