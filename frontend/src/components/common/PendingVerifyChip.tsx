import { Fragment, useCallback, useContext, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ElementType, type HTMLAttributes, type MouseEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { pendingNoteKeys, splitClauses, type PendingKind } from '@/lib/pendingNotes'
import { PendingFillContext, PendingRowContext, usePendingNoteGroup } from './PendingNoteGroup'

type PendingVerifyChipProps = {
  className?: string
} & (
  /** 說明文字的種類（全站一張表：lib/pendingNotes.ts） */
  | { kind: PendingKind; kinds?: never }
  /**
   * 同一行有好幾個數字用到不同的待驗證資料（設計師）：一行只放一個灰標，
   * 點開依數字在這一行出現的順序列出每一種說明，每種兩行，種類之間隔 8px
   */
  | { kinds: readonly PendingKind[]; kind?: never; labels?: readonly string[] }
)

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
 * - 結果面板（CalcResultPanel，手機固定在底部、電腦黏在右邊）裡：一律撐滿面板內容寬度，
 *   左緣＝面板內容左緣（PendingFillContext，面板自己設）
 * - 一行只放一個灰標：同一行有好幾種待驗證資料時傳 kinds，點開依數字在這一行出現的順序
 *   列出每一種（每種兩行，種類之間隔 8px）
 */
export default function PendingVerifyChip(props: PendingVerifyChipProps) {
  const { kind, kinds: kindList, className = '' } = props
  // labels：每一種說明前面加的字（例如攔截發送卡「攻方：」「攔截方：」），跟 kinds 一一對應；
  // 有 labels 時同一種可以出現兩次（兩方都列出來）
  const labelList = 'labels' in props ? props.labels : undefined
  const kinds = useMemo<readonly PendingKind[]>(() => kindList ?? (kind ? [kind] : []), [kind, kindList])
  const labels = useMemo<readonly string[] | undefined>(() => labelList, [labelList])
  const kindsKey = kinds.join(' ')
  const labelsKey = labels?.join('\u0000') ?? ''
  const { t } = useTranslation()
  const id = useId()
  const panelId = `pending-note-${id.replace(/:/g, '')}`
  const { open, toggle } = useOpenState(panelId)
  const row = useContext(PendingRowContext)
  const fillDefault = useContext(PendingFillContext)

  useEffect(() => {
    if (!row) return
    row.register({ id: panelId, kinds, labels, open })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row, panelId, kindsKey, labelsKey, open])
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
        data-kind={kindsKey}
        aria-expanded={open}
        // 收合時說明塊不在畫面上：只有展開才指向它，不指向不存在的 id
        aria-controls={open ? panelId : undefined}
        onClick={onClick}
        className={`relative inline-flex items-center gap-0.5 whitespace-nowrap rounded-full bg-gray-100 px-2 py-0.5 align-middle text-xs font-normal normal-case leading-4 tracking-normal text-gray-600 before:absolute before:left-1/2 before:top-1/2 before:h-11 before:w-full before:min-w-[44px] before:-translate-x-1/2 before:-translate-y-1/2 before:content-[''] ${className}`}
      >
        {t('common.pendingVerify')}
        <span aria-hidden="true" className="text-[1em] leading-none text-gray-500">
          {t('common.pendingVerifyHint')}
        </span>
      </button>
      {/* 不在「一行」裡（例如表格格子、標題）：面板直接接在灰標後面，自成一塊 */}
      {!row && open && <PendingNotePanel fill={fillDefault} id={panelId} kinds={kinds} labels={labels} />}
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
export function PendingNotePanel({ id, kinds, labels, fill = false, ns = 'pendingNotes', whatKeys }: { id: string; kinds: readonly string[]; labels?: readonly string[]; fill?: boolean; ns?: 'pendingNotes' | 'verifiedNotes'; /** 第一行換成別的 i18n key（跟 kinds 一一對應；✓ 依效果有沒有核對換第一行） */ whatKeys?: readonly (string | undefined)[] }) {
  const { t } = useTranslation()
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
      {kinds.map((k, i) => {
        const base = ns === 'pendingNotes' ? pendingNoteKeys(k as PendingKind) : { what: `${ns}.${k}.what`, source: `${ns}.${k}.source` }
        const keys = whatKeys?.[i] ? { ...base, what: whatKeys[i]! } : base
        // 好幾種：依數字在那一行出現的順序，每種兩行，種類之間隔 8px
        return (
          <span key={`${i}-${k}`} className={`block ${i > 0 ? 'mt-2' : ''}`} data-testid="pending-note-entry" data-kind={k}>
            <span className="block" data-testid="pending-note-what">
              {labels?.[i] && <span className="font-medium" data-testid="pending-note-label">{labels[i]}</span>}
              {clauses(t(keys.what))}
            </span>
            <span className="block" data-testid="pending-note-source">{clauses(t(keys.source))}</span>
          </span>
        )
      })}
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
  const [chip, setChip] = useState<{ id: string; kinds: readonly string[]; labels?: readonly string[]; open: boolean } | null>(null)
  const slot = useMemo(() => ({ register: setChip }), [])
  const open = chip?.open ?? false
  // 在結果面板裡：沒指定就撐滿面板內容寬度
  const fillDefault = useContext(PendingFillContext)
  const fillPanel = fill ?? fillDefault
  return (
    <>
      <PendingRowContext.Provider value={slot}>
        <Tag {...rest}>{children}</Tag>
      </PendingRowContext.Provider>
      {open && chip && (tableColSpan ? (
        <tr data-testid="pending-note-row">
          <td colSpan={tableColSpan}>
            <StickyTableNote>
              <PendingNotePanel fill id={chip.id} kinds={chip.kinds as readonly PendingKind[]} labels={chip.labels} />
            </StickyTableNote>
          </td>
        </tr>
      ) : (
        <PendingNotePanel fill={fillPanel} id={chip.id} kinds={chip.kinds as readonly PendingKind[]} labels={chip.labels} />
      ))}
    </>
  )
}

/** 往上找會橫向捲動的容器（overflow-x auto／scroll）；沒有就回 null */
function scrollParent(el: HTMLElement | null): HTMLElement | null {
  for (let p = el?.parentElement ?? null; p; p = p.parentElement) {
    if (/(auto|scroll)/.test(getComputedStyle(p).overflowX)) return p
  }
  return null
}

/**
 * 可以橫向捲動的表格（設計師，P0-23）：說明畫在那一列下面，但不跟著整張表撐寬——
 * position: sticky; left: 0，寬度＝捲動容器看得到的寬度（扣掉左右內距），表格捲到哪裡說明都整塊看得到。
 * 不在捲動容器裡就照舊撐滿那一格。
 */
export function StickyTableNote({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState<number | null>(null)
  useLayoutEffect(() => {
    const el = ref.current
    const sc = scrollParent(el)
    if (!el || !sc) return
    const measure = () => {
      const cs = getComputedStyle(sc)
      const td = el.parentElement
      const tdPad = td ? parseFloat(getComputedStyle(td).paddingLeft || '0') + parseFloat(getComputedStyle(td).paddingRight || '0') : 0
      setWidth(Math.max(0, sc.clientWidth - parseFloat(cs.paddingLeft || '0') - parseFloat(cs.paddingRight || '0') - tdPad))
    }
    measure()
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    ro?.observe(sc)
    window.addEventListener('resize', measure)
    return () => {
      ro?.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [])
  return (
    <div
      ref={ref}
      data-testid="pending-note-sticky"
      className="sticky left-0"
      style={width === null ? undefined : { width: `${width}px`, maxWidth: `${width}px` }}
    >
      {children}
    </div>
  )
}
