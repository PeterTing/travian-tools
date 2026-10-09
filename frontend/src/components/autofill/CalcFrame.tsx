import type { ReactNode } from 'react'
import AutoFillBar from './AutoFillBar'

/**
 * 計算器頁的外框：最上面放「已帶入」列，下面是原本的頁面。
 * 有些頁面自己放（例如 CP 與開村要把假設寫在列上），就不用包這個。
 */
export default function CalcFrame({ children, usesVillage = true }: { children: ReactNode; usesVillage?: boolean }) {
  return (
    <>
      <div className="mx-auto w-full max-w-5xl min-w-0 px-3 pt-4 sm:px-4" data-testid="calc-frame">
        <AutoFillBar usesVillage={usesVillage} />
      </div>
      <div className="-mt-4">{children}</div>
    </>
  )
}
