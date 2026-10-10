import { useState } from 'react'
import { DATA_UPDATE_ITEMS, DATA_UPDATE_PREF_KEY, shouldShowDataUpdate } from '@/lib/dataUpdate'
import { writePref } from '@/lib/localPrefs'

export default function DataUpdateCard({ now }: { now?: Date }) {
  const [show, setShow] = useState(() => shouldShowDataUpdate(now))
  if (!show) return null
  return (
    <section
      className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-800"
      data-testid="data-update-card"
      aria-labelledby="data-update-title"
    >
      <h2 id="data-update-title" className="text-base font-semibold">10/10 資料更新</h2>
      <p className="mt-1 text-sm">兵種、建築和資源田數值已對照 ts11 遊戲內說明頁更正</p>
      <ul className="mt-2 space-y-1 text-sm" data-testid="data-update-items">
        {DATA_UPDATE_ITEMS.map((it) => (
          <li key={it.label} className="flex flex-wrap gap-x-2">
            <span>{it.label}</span>
            <span className="tabular-nums">
              <span className="text-slate-500 line-through">{it.before}</span>
              <span aria-hidden="true"> → </span>
              <span className="sr-only">改成</span>
              <span className="font-semibold">{it.after}</span>
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          className="min-h-[44px] rounded-md border border-slate-300 bg-white px-4 text-sm font-medium hover:bg-slate-100"
          onClick={() => {
            writePref(DATA_UPDATE_PREF_KEY, 'dismissed')
            setShow(false)
          }}
        >
          知道了
        </button>
      </div>
    </section>
  )
}
