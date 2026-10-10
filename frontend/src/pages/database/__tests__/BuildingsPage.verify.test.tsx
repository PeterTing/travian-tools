import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, within, fireEvent } from '@testing-library/react'
import i18n from '@/i18n/i18n'
import BuildingsPage from '../BuildingsPage'
import * as gameData from '@/data/gameData'
import { isBuildingFullyVerified } from '@/lib/buildingVerify'

const list = [
  { building_id: 'main_building', name_zh: '村莊大樓', name_en: 'Main Building', category: 'infrastructure', max_level: 20 },
  { building_id: 'stable', name_zh: '馬廄', name_en: 'Stable', category: 'military', max_level: 20 },
]

vi.mock('@/services/gameApi', () => ({
  buildingsApi: {
    getBuildings: vi.fn(async () => ({ buildings: list, total: list.length })),
    getBuilding: vi.fn(async (id: string) => ({
      ...list.find(b => b.building_id === id),
      description_zh: '', description_en: '', prerequisites: [],
      levels: [{ level: 1, cost_wood: 1, cost_clay: 1, cost_iron: 1, cost_crop: 1, build_time_base: 1, population: 1, culture_points: 1, cp_per_day: 1 }],
    })),
  },
}))

describe('BuildingsPage ts11 verification marks', () => {
  // P0-23：全部建築都核對過了；這裡模擬「馬廄還沒核對」，確認灰標機制還在
  beforeEach(async () => {
    await i18n.changeLanguage('zh-TW')
    vi.spyOn(gameData, 'isBuildingVerified').mockImplementation((id: string) => id !== 'stable')
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('real data: every building is verified (official knowledge base, P0-23)', () => {
    vi.restoreAllMocks()
    for (const b of list) expect(gameData.isBuildingVerified(b.building_id), b.building_id).toBe(true)
  })

  it('shows one grey legend line at the top', async () => {
    render(<BuildingsPage />)
    expect(screen.getByTestId('building-verify-legend')).toHaveTextContent('除標「✓ 已核對」的建築外，數值皆未核對')
  })

  it('ts11-measured buildings get ✓, others get ONE 待驗證 chip by the name', async () => {
    render(<BuildingsPage />)
    const mb = (await screen.findByText('村莊大樓')).closest('p')!
    const st = screen.getByText('馬廄').closest('p')!
    expect(within(mb).getByTestId('verified-mark')).toBeInTheDocument()
    // 小字「✓ 已核對」，不只一個圖示（P0-23 設計師）
    expect(within(mb).getByTestId('verified-mark')).toHaveTextContent(/^✓ 已核對$/)
    expect(within(mb).getByTestId('verified-mark').className).toContain('text-[12px]')
    expect(within(mb).queryByTestId('pending-verify-chip')).toBeNull()
    expect(within(st).getAllByTestId('pending-verify-chip')).toHaveLength(1)
    expect(within(st).queryByTestId('verified-mark')).toBeNull()
  })

  it('list: every name line is at least 44px and vertically centred (chip hit area stays on its own line), with or without a chip', async () => {
    render(<BuildingsPage />)
    await screen.findByText('馬廄')
    const lines = screen.getAllByTestId('building-list-name')
    expect(lines).toHaveLength(2)
    for (const l of lines) expect(l).toHaveClass('min-h-11', 'flex', 'items-center')
  })

  it('the ✓ mark has no hover-only title', async () => {
    render(<BuildingsPage />)
    expect(await screen.findByTestId('verified-mark')).not.toHaveAttribute('title')
  })

  it('detail view: one chip next to the name, none inside the level table', async () => {
    render(<BuildingsPage />)
    fireEvent.click(await screen.findByText('馬廄'))
    const name = await screen.findByTestId('building-detail-name')
    expect(within(name).getAllByTestId('pending-verify-chip')).toHaveLength(1)
    const table = screen.getByRole('table')
    expect(within(table).queryByTestId('pending-verify-chip')).toBeNull()
  })

  it('tap ✓: two lines, the source named per building (stable: ts11 in-game help + official knowledge base)', async () => {
    render(<BuildingsPage />)
    const mb = (await screen.findByText('村莊大樓')).closest('p')!
    const mark = within(mb).getByTestId('verified-mark')
    expect(mark.tagName).toBe('BUTTON')
    expect(mark).toHaveAttribute('data-source', 'mainTs11')
    fireEvent.click(mark)
    expect(mark).toHaveAttribute('aria-expanded', 'true')
    // 效果也照官方知識庫核對過：第一行加「效果」
    expect(screen.getByTestId('pending-note-what')).toHaveTextContent('花費、時間、人口、CP、效果已核對。')
    // 第二行：知識庫沒錯，時間有乘村莊大樓加速（1 級 10000 = 2000 × 5），這裡列基本時間
    const src = screen.getByTestId('pending-note-source')
    expect(src).toHaveTextContent('1 級取自 ts11 遊戲內說明，2 級以上取自官方知識庫。')
    expect(src).toHaveTextContent('知識庫的時間有乘上村莊大樓加速（村莊大樓 1 級寫 10000 秒＝2000 × 5），這裡列的是沒加速的基本時間。')
    expect(src).not.toHaveTextContent('不同')
    fireEvent.click(mark)
    expect(screen.queryByTestId('pending-note-panel')).toBeNull()
  })
})

describe('BuildingsPage ✓ source notes (real data, P0-23)', () => {
  beforeEach(async () => { await i18n.changeLanguage('zh-TW') })
  it('every building names its source; only the main building uses ts11 build times', () => {
    expect(gameData.buildingSource('main_building')).toBe('mainTs11')
    expect(gameData.buildingSource('stable')).toBe('ts11L1Kb')
    expect(gameData.buildingSource('heros_mansion')).toBe('ts11L1Kb')
  })
  it('stable ✓ opens 「1 級取自 ts11 遊戲內說明，2 級以上取自官方知識庫。」 and does not select the building', async () => {
    render(<BuildingsPage />)
    const st = (await screen.findByText('馬廄')).closest('p')!
    fireEvent.click(within(st).getByTestId('verified-mark'))
    expect(screen.getByTestId('pending-note-source')).toHaveTextContent('1 級取自 ts11 遊戲內說明，2 級以上取自官方知識庫。')
    expect(screen.queryByTestId('building-detail-name')).toBeNull()
  })
})


describe('BuildingsPage effect column (official knowledge base, P0-23)', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('zh-TW')
    list.push({ building_id: 'academy', name_zh: '研究院', name_en: 'Academy', category: 'research', max_level: 20 })
    list.push({ building_id: 'rally_point', name_zh: '集結點', name_en: 'Rally Point', category: 'military', max_level: 20 })
  })
  afterEach(() => {
    list.splice(2)
    vi.restoreAllMocks()
  })

  it('real data: only buildings without a comparable knowledge base effect column are pending', () => {
    // 2026-10-11：大使館、寶物庫、集結點改照遊戲內說明＋官方說明頁核對；研究院、盔甲廠照 PM 決定改用官方寫法
    // （evidence/pending_crosscheck_2026-10-11.json）→ 效果待驗證的建築沒有了，下面的灰標測試用 mock 模擬
    for (const id of ['academy', 'blacksmith', 'embassy', 'rally_point', 'treasury']) expect(gameData.isBuildingEffectVerified(id), id).toBe(true)
    for (const id of ['main_building', 'warehouse', 'great_warehouse', 'stonemasons_lodge', 'horse_drinking_trough', 'trade_office', 'woodcutter']) expect(gameData.isBuildingEffectVerified(id), id).toBe(true)
  })

  // 2026-10-11 起沒有效果待驗證的建築：模擬「研究院效果還沒核對」，確認灰標機制還在
  const mockAcademyEffectPending = () =>
    vi.spyOn(gameData, 'isBuildingEffectVerified').mockImplementation((id: string) => id !== 'academy')

  it('effect not verified: chip by the 效果 heading (note under the header row) and chip by the title, same two lines', async () => {
    mockAcademyEffectPending()
    render(<BuildingsPage />)
    fireEvent.click(await screen.findByText('研究院'))
    const heading = await screen.findByTestId('building-effect-heading')
    const chip = within(heading).getByTestId('pending-verify-chip')
    expect(chip).toHaveAttribute('data-kind', 'buildingEffect')
    // 效果欄一個、標題旁一個（#34 設計師）
    const effectChips = screen.getAllByTestId('pending-verify-chip').filter((c) => c.getAttribute('data-kind') === 'buildingEffect')
    expect(effectChips).toHaveLength(2)
    fireEvent.click(chip)
    const row = screen.getByTestId('pending-note-row')
    expect(row.querySelector('td')).toHaveAttribute('colspan', '9')
    expect(within(row).getByTestId('pending-note-what')).toHaveTextContent('這棟建築的效果還沒核對。')
    expect(within(row).getByTestId('pending-note-source')).toHaveTextContent('官方知識庫沒有可以對照的效果數字；目前的文字來源還在查。')
    fireEvent.click(chip)
    // 標題旁的灰標：點得開，兩行跟效果欄一模一樣
    const title = screen.getByTestId('building-detail-name')
    const titleChip = within(title).getByTestId('pending-verify-chip')
    expect(titleChip.tagName).toBe('BUTTON')
    fireEvent.click(titleChip)
    expect(screen.getByTestId('pending-note-what')).toHaveTextContent('這棟建築的效果還沒核對。')
    expect(screen.getByTestId('pending-note-source')).toHaveTextContent('官方知識庫沒有可以對照的效果數字；目前的文字來源還在查。')
  })

  // #34 幕僚長／PM：效果待驗證的建築不能有 ✓（2026-10-11 起沒有這種建築，用 mock 模擬研究院）
  it('effect not verified: no ✓ anywhere (list or title); list shows a non-clickable 待驗證 label, row aria-label says 效果待驗證', async () => {
    mockAcademyEffectPending()
    render(<BuildingsPage />)
    const name = (await screen.findByText('研究院')).closest('p')!
    expect(within(name).queryByTestId('verified-mark')).toBeNull()
    expect(name.textContent).not.toContain('✓')
    const label = within(name).getByTestId('pending-verify-label')
    expect(label).toHaveTextContent('待驗證')
    expect(label.tagName).toBe('SPAN')
    expect(label).toHaveAttribute('aria-hidden', 'true')
    expect(label).toHaveClass('rounded-full', 'bg-gray-100', 'text-xs', 'text-gray-600')
    expect(within(name).queryByRole('button')).toBeNull()
    const row = name.closest('[data-testid=building-list-row]')!
    expect(row).toHaveAttribute('role', 'listitem')
    expect(row).toHaveAttribute('aria-label', '研究院，效果待驗證')
    // 點字樣＝點這一列（選到這棟建築），不會打開說明
    fireEvent.click(label)
    const title = await screen.findByTestId('building-detail-name')
    expect(title.textContent).not.toContain('✓')
    expect(within(title).queryByTestId('verified-mark')).toBeNull()
    // 數字和效果都核對過的建築，列表照舊是 ✓、aria-label 只有名稱
    const mb = screen.getByText('村莊大樓').closest('[data-testid=building-list-row]')!
    expect(mb).toHaveAttribute('aria-label', '村莊大樓')
    expect(within(mb as HTMLElement).getByTestId('verified-mark')).toBeInTheDocument()
  })

  it('real data: academy, smithy, embassy, treasury, rally point are fully verified (2026-10-11, PM decision for academy / smithy)', () => {
    vi.restoreAllMocks()
    for (const id of ['academy', 'blacksmith', 'embassy', 'rally_point', 'treasury']) {
      expect(isBuildingFullyVerified(id), id).toBe(true)
      expect(gameData.isBuildingVerified(id), id).toBe(true)
    }
    expect(gameData.effectSource('academy')).toBe('effectAcademy')
    expect(gameData.effectSource('blacksmith')).toBe('effectBlacksmith')
    expect(gameData.effectSource('embassy')).toBe('effectEmbassy')
    expect(gameData.effectSource('treasury')).toBe('effectTreasury')
    expect(gameData.effectSource('rally_point')).toBe('effectRallyPoint')
    expect(gameData.effectSource('main_building')).toBeNull()
    expect(isBuildingFullyVerified('main_building')).toBe(true)
  })

  it('rally point ✓: the note has two parts — numbers (ts11 + knowledge base) and effect (official S65、S181)', async () => {
    render(<BuildingsPage />)
    const name = (await screen.findByText('集結點')).closest('p')!
    expect(within(name).queryByTestId('pending-verify-label')).toBeNull()
    fireEvent.click(within(name).getByTestId('verified-mark'))
    const entries = screen.getAllByTestId('pending-note-entry')
    expect(entries.map((e) => e.getAttribute('data-kind'))).toEqual(['ts11L1Kb', 'effectRallyPoint'])
    expect(within(entries[0]!).getByTestId('pending-note-what')).toHaveTextContent('花費、時間、人口、CP已核對。')
    expect(within(entries[1]!).getByTestId('pending-note-what')).toHaveTextContent('效果已核對。')
    expect(within(entries[1]!).getByTestId('pending-note-source')).toHaveTextContent('官方說明頁 S65、S181')
    // 列表那一列：效果核對過，aria-label 只有名稱
    expect(name.closest('[data-testid=building-list-row]')).toHaveAttribute('aria-label', '集結點')
  })

  it('academy ✓ (PM 2026-10-11): no 待驗證, note names the in-game help, effect column has no chip', async () => {
    render(<BuildingsPage />)
    const name = (await screen.findByText('研究院')).closest('p')!
    expect(within(name).queryByTestId('pending-verify-label')).toBeNull()
    expect(name.closest('[data-testid=building-list-row]')).toHaveAttribute('aria-label', '研究院')
    fireEvent.click(within(name).getByTestId('verified-mark'))
    const entries = screen.getAllByTestId('pending-note-entry')
    expect(entries.map((e) => e.getAttribute('data-kind'))).toEqual(['ts11L1Kb', 'effectAcademy'])
    expect(within(entries[1]!).getByTestId('pending-note-source')).toHaveTextContent('遊戲內說明')
    fireEvent.click(screen.getByText('研究院', { selector: 'p *, p' }))
    const heading = await screen.findByTestId('building-effect-heading')
    expect(within(heading).queryByTestId('pending-verify-chip')).toBeNull()
  })

  it('verified effect (main building): no chip by the 效果 heading', async () => {
    render(<BuildingsPage />)
    fireEvent.click(await screen.findByText('村莊大樓'))
    const heading = await screen.findByTestId('building-effect-heading')
    expect(within(heading).queryByTestId('pending-verify-chip')).toBeNull()
  })

  // TICKETS P0-17 (u)：選中的那一列底色是 bg-primary（深藍），✓ 字要淺綠，對比 ≥ 4.5:1
  it('selected list row: ✓ 已核對 switches to light green with contrast ≥ 4.5:1 on bg-primary', async () => {
    render(<BuildingsPage />)
    const name = await screen.findByText('村莊大樓')
    const before = within(name.closest('p')!).getByTestId('verified-mark')
    expect(before).toHaveClass('text-green-700')
    fireEvent.click(name)
    const row = (await screen.findAllByText('村莊大樓'))[0]!.closest('div.rounded')!
    expect(row).toHaveClass('bg-primary')
    const mark = within(row as HTMLElement).getByTestId('verified-mark')
    expect(mark).toHaveClass('text-green-300')
    expect(mark).not.toHaveClass('text-green-700')
    // index.css --primary: hsl(222.2 47.4% 11.2%) ≈ #0f172a；tailwind green-300 = #86efac
    const lum = (hex: string) => {
      const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
      return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!
    }
    const ratio = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x! + 0.05) / (y! + 0.05) }
    expect(ratio('#86efac', '#0f172a')).toBeGreaterThanOrEqual(4.5)
    // 原本的 green-700 在深藍底上不到 4.5:1（這就是要修的）
    expect(ratio('#15803d', '#0f172a')).toBeLessThan(4.5)
  })
})
