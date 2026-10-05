import type { ComponentType } from 'react'

/**
 * Thin route wrapper: max-width + horizontal padding so guide calcs
 * never cause 390px horizontal scroll.
 */
export default function GuideCalcPage({ Calc }: { Calc: ComponentType }) {
  return (
    <div className="mx-auto w-full max-w-5xl min-w-0 overflow-x-clip px-3 py-4 sm:px-4">
      <Calc />
    </div>
  )
}
