import { useState } from 'react'
import {
  DATA_UPDATE_PREF_KEY,
  DATA_UPDATE_TITLE,
  DATA_UPDATE_VISIBLE,
  dataUpdateItemsFor,
  shouldShowDataUpdate,
  type DataUpdateItem,
} from '@/lib/dataUpdate'
import { writePref } from '@/lib/localPrefs'

/** 舊值刪除線、新值粗體；「舊 → 新」整段不斷行（太長時整段換到下一行） */
function BeforeAfter({ before, after }: { before: string; after: string }) {
  return (
    <span className="whitespace-nowrap tabular-nums" data-testid="data-update-change">
      <span className="text-slate-500 line-through">{before}</span>
      <span aria-hidden="true"> → </span>
      <span className="sr-only">改成</span>
      <span className="font-semibold">{after}</span>
    </span>
  )
}

function Item({ it }: { it: DataUpdateItem }) {
  return (
    <li data-testid="data-update-item">
      <span className="flex flex-wrap gap-x-2">
        <span>{it.label}</span>
        {it.before !== undefined && it.after !== undefined && <BeforeAfter before={it.before} after={it.after} />}
      </span>
      {it.sub && (
        <span className="flex flex-wrap gap-x-2 pl-4" data-testid="data-update-sub">
          <span>{it.sub.label}</span>
          <BeforeAfter before={it.sub.before} after={it.sub.after} />
        </span>
      )}
      {it.note && (
        <span className="block text-[12px] leading-5 text-slate-500" data-testid="data-update-note">
          {it.note}
        </span>
      )}
    </li>
  )
}

/**
 * 首頁資料更新卡：淺灰資訊卡，前 3 項直接看到，超過 3 項時「再看 N 項」展開其餘。
 * 卡片最高半個螢幕（內容多就卡片裡捲動），有來襲時來襲卡在上面。
 */
/** serverSpeed：目前世界的倍速，決定 x3 以上才有的項目要不要顯示 */
export default function DataUpdateCard({ now, serverSpeed }: { now?: Date; serverSpeed?: number | null }) {
  const [show, setShow] = useState(() => shouldShowDataUpdate(now))
  const [expanded, setExpanded] = useState(false)
  if (!show) return null
  const items = dataUpdateItemsFor(serverSpeed)
  const first = items.slice(0, DATA_UPDATE_VISIBLE)
  const rest = items.slice(DATA_UPDATE_VISIBLE)
  return (
    <section
      className="max-h-[50vh] overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-800"
      data-testid="data-update-card"
      aria-labelledby="data-update-title"
    >
      <h2 id="data-update-title" className="text-base font-semibold">{DATA_UPDATE_TITLE}</h2>
      <p className="mt-1 text-sm">依官方說明頁和社群資料核對</p>
      <ul className="mt-2 space-y-1 text-sm" data-testid="data-update-items">
        {first.map((it) => <Item key={it.label} it={it} />)}
        {expanded && rest.map((it) => <Item key={it.label} it={it} />)}
      </ul>
      <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
        {rest.length > 0 && (
          <button
            type="button"
            className="min-h-[44px] rounded-md px-3 text-sm font-medium text-slate-700 underline-offset-2 hover:underline"
            aria-expanded={expanded}
            data-testid="data-update-more"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? '收起' : `再看 ${rest.length} 項`}
          </button>
        )}
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
