import { useCallback, useContext, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ElementType, type HTMLAttributes, type MouseEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { pendingNoteKeys, type PendingKind } from '@/lib/pendingNotes'
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
        aria-controls={panelId}
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

/** 展開的灰色說明：第一行哪個數字還沒核對，第二行現在的數字從哪裡來 */
export function PendingNotePanel({ id, kind }: { id: string; kind: PendingKind }) {
  const { t } = useTranslation()
  const keys = pendingNoteKeys(kind)
  const ref = useRef<HTMLSpanElement>(null)
  // 左邊對齊灰標；灰標太靠右放不下時往左移，整塊不超出這一行
  useLayoutEffect(() => {
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
  }, [id])
  return (
    <span
      ref={ref}
      id={id}
      role="note"
      data-testid="pending-note-panel"
      className="mt-1 block w-fit max-w-full rounded-md bg-gray-100 px-2 py-1.5 text-left text-xs font-normal leading-5 text-gray-700"
    >
      <span className="block" data-testid="pending-note-what">{t(keys.what)}</span>
      <span className="block" data-testid="pending-note-source">{t(keys.source)}</span>
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
  children,
  ...rest
}: {
  as?: ElementType
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
            <PendingNotePanel id={chip.id} kind={chip.kind as PendingKind} />
          </td>
        </tr>
      ) : (
        <PendingNotePanel id={chip.id} kind={chip.kind as PendingKind} />
      ))}
    </>
  )
}
