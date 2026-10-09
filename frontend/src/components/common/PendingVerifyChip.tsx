import { Fragment, useCallback, useContext, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ElementType, type HTMLAttributes, type MouseEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { pendingNoteKeys, splitClauses, type PendingKind } from '@/lib/pendingNotes'
import { PendingRowContext, usePendingNoteGroup } from './PendingNoteGroup'

interface PendingVerifyChipProps {
  /** 說明文字的種類（全站一張表：lib/pendingNotes.ts） */
  kind: PendingKind
  className?: string
}

/** 開關狀態：有 Provider 用整頁共用的（一次只開一個），沒有就自己記 */
function useOpenState(id: string) {
  const group = usePendingNoteGroup()
  const [localOpen, setLocalOpen] = useState(false)
  const open = group ? group.openId === id : localOpen
  const toggle = useCallback(() => {
    if (group) group.setOpenId(group.openId === id ? null : id)
    else setLocalOpen((v) => !v)
  }, [group, id])
  return { open, toggle }
}

/**
 * 「待驗證」小灰標（P0-17 設計師規格）：
 * - 整個灰標是按鈕，點一下在這一行正下方展開兩行說明，再點一下收起；電腦和手機一樣只靠點，不靠 hover
 * - 點擊範圍用透明延伸補到 44×44，外觀不變
 * - 一頁同時只開一個；沒有關閉鈕、點外面不會關
 *
 * 說明塊對齊規則（設計師）：以灰標所在容器的內容左緣為準——
 * - 一般文字行（灰標在句子裡或行首）：左邊跟灰標對齊；灰標太靠右放不下時往左移，整塊不超出這一行
 * - 窄格子、表格（兵種詳情四格、開村門檻表、慶典表）：撐滿整張卡／整列的寬度
 *   （PendingRow 加 fill；表格列 tableColSpan 自動 fill）
 */
export default function PendingVerifyChip({ kind, className = '' }: PendingVerifyChipProps) {
  const { t } = useTranslation()
  const id = useId()
  const panelId = `pending-note-${id.replace(/:/g, '')}`
  const { open, toggle } = useOpenState(panelId)
  const row = useContext(PendingRowContext)

  useEffect(() => {
    if (!row) return
    row.register({ id: panelId, kind, open })
  }, [row, panelId, kind, open])
  useEffect(() => {
    if (!row) return
    return () => row.register(null)
  }, [row])

  const onClick = (e: MouseEvent<HTMLButtonElement>) => {
    // 灰標常在可點的列表項目裡（兵種、建築）：只開說明，不要順便選到那一列
    e.stopPropagation()
    e.preventDefault()
    toggle()
  }

  return (
    <>
      <button
        type="button"
        id={`${panelId}-chip`}
        data-testid="pending-verify-chip"
        aria-expanded={open}
        // 收合時說明塊不在畫面上：只有展開才指向它，不指向不存在的 id
        aria-controls={open ? panelId : undefined}
        onClick={onClick}
        className={`relative inline-flex items-center gap-0.5 whitespace-nowrap rounded-full bg-gray-100 px-2 py-0.5 align-middle text-xs font-normal leading-4 text-gray-600 before:absolute before:left-1/2 before:top-1/2 before:h-11 before:w-full before:min-w-[44px] before:-translate-x-1/2 before:-translate-y-1/2 before:content-[''] ${className}`}
      >
        {t('common.pendingVerify')}
        <span aria-hidden="true" className="text-[1em] leading-none text-gray-500">
          {t('common.pendingVerifyHint')}
        </span>
      </button>
      {/* 不在「一行」裡（例如表格格子、標題）：面板直接接在灰標後面，自成一塊 */}
      {!row && open && <PendingNotePanel id={panelId} kind={kind} />}
    </>
  )
}

function clauses(text: string): ReactNode {
  const parts = splitClauses(text)
  if (parts.length < 2) return text
  // 段尾的空白（英文）放在 inline-block 外面，不然會被吃掉、兩段黏在一起
  return parts.map((p, i) => {
    const body = p.replace(/ +$/, '')
    return (
      <Fragment key={i}>
        <span className="inline-block" data-testid="pending-note-clause">{body}</span>
        {body !== p && ' '}
      </Fragment>
    )
  })
}

/** 展開的灰色說明：第一行哪個數字還沒核對，第二行現在的數字從哪裡來 */
export function PendingNotePanel({ id, kind, fill = false }: { id: string; kind: PendingKind; fill?: boolean }) {
  const { t } = useTranslation()
  const keys = pendingNoteKeys(kind)
  const ref = useRef<HTMLSpanElement>(null)
  // 文字行：左邊對齊灰標；灰標太靠右放不下時往左移，整塊不超出這一行。fill：撐滿、從容器內容左緣開始
  useLayoutEffect(() => {
    if (fill) return
    const el = ref.current
    const chip = document.getElementById(`${id}-chip`)
    const parent = el?.parentElement
    if (!el || !chip || !parent) return
    const place = () => {
      el.style.marginLeft = '0px'
      const base = el.getBoundingClientRect()
      const pr = parent.getBoundingClientRect()
      const right = pr.right - parseFloat(getComputedStyle(parent).paddingRight || '0')
      const want = chip.getBoundingClientRect().left - base.left
      const room = right - base.left - base.width
      el.style.marginLeft = `${Math.max(0, Math.min(want, room))}px`
    }
    place()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [id, fill])
  return (
    <span
      ref={ref}
      id={id}
      role="note"
      data-testid="pending-note-panel"
      data-fill={fill ? 'true' : undefined}
      className={`mt-1 block ${fill ? 'w-full' : 'w-fit max-w-full'} rounded-md bg-gray-100 px-2 py-1.5 text-left text-xs font-normal leading-5 text-gray-700`}
    >
      <span className="block" data-testid="pending-note-what">{clauses(t(keys.what))}</span>
      <span className="block" data-testid="pending-note-source">{clauses(t(keys.source))}</span>
    </span>
  )
}

/**
 * 灰標所在的那一行。灰標後面還有字（例如已帶入列）時用它包住那一行，
 * 說明就畫在整行下面、跟灰標左邊對齊，而不是插在灰標和後面的字中間。
 */
export function PendingRow({
  as: Tag = 'div',
  tableColSpan,
  fill,
  children,
  ...rest
}: {
  as?: ElementType
  /** 窄格子（例如兵種詳情四格）：說明撐滿整張卡的寬度，不跟灰標對齊 */
  fill?: boolean
  /** 這一行是表格列（as="tr"）時：說明放在下一列、橫跨整張表的欄數 */
  tableColSpan?: number
  children: ReactNode
} & HTMLAttributes<HTMLElement>) {
  const [chip, setChip] = useState<{ id: string; kind: string; open: boolean } | null>(null)
  const slot = useMemo(() => ({ register: setChip }), [])
  const open = chip?.open ?? false
  return (
    <>
      <PendingRowContext.Provider value={slot}>
        <Tag {...rest}>{children}</Tag>
      </PendingRowContext.Provider>
      {open && chip && (tableColSpan ? (
        <tr data-testid="pending-note-row">
          <td colSpan={tableColSpan}>
            <PendingNotePanel fill id={chip.id} kind={chip.kind as PendingKind} />
          </td>
        </tr>
      ) : (
        <PendingNotePanel fill={fill} id={chip.id} kind={chip.kind as PendingKind} />
      ))}
    </>
  )
}
