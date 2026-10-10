import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { troopsApi } from '@/services/gameApi'
import PendingVerifyChip, { PendingRow } from '@/components/common/PendingVerifyChip'
import type { TroopListItem, TroopDetail, TroopTribe, TroopCategory } from '@/types/game'
import { CalcBar } from '@/components/autofill/CalcFrame'
import { isTribeCostVerified } from '@/data/unitCosts'
import { carryPendingTribe } from '@/data/unitSpeeds'
import type { PendingKind } from '@/lib/pendingNotes'
import { ingameTribeName, ingameUnitDisplay } from '@/lib/ingameNames'

const TRIBES: { value: TroopTribe | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'romans', label: ingameTribeName('romans') },
  { value: 'gauls', label: ingameTribeName('gauls') },
  { value: 'teutons', label: ingameTribeName('teutons') },
  { value: 'huns', label: ingameTribeName('huns') },
  { value: 'egyptians', label: ingameTribeName('egyptians') },
  { value: 'vikings', label: ingameTribeName('vikings') },
  { value: 'spartans', label: ingameTribeName('spartans') },
]

const CATEGORIES: { value: TroopCategory | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'infantry', label: '步兵' },
  { value: 'cavalry', label: '騎兵' },
  { value: 'siege', label: '攻城' },
  { value: 'scout', label: '偵查' },
  { value: 'special', label: '特殊' },
  { value: 'settler', label: '開拓者' },
]

/** 官方頁數字取自第三方計算器的出處說明（P0-15，斯巴達步兵、騎兵）：兩行（P0-23 PM） */
const OFFICIAL_PENDING_SOURCE_LINES = ['斯巴達的數字還沒核對', '出處：官方說明頁 S187，頁面上註明數字取自第三方'] as const

/** 速度出處說明（P0-15）：只給已核對的速度用（ts11 遊戲內說明／官方說明）；待驗證的看灰標 */
function speedSourceLabel(t: Pick<TroopDetail, 'speed_source' | 'speed_ref'>): string {
  if (t.speed_source === 'ts11') return 'ts11 遊戲內說明'
  if (t.speed_source === 'official') return '官方說明'
  return ''
}

/**
 * 兵種名稱（中文）：斯巴達、維京顯示「中文暫譯（官方英文名）」＋待驗證灰標（中文是暫譯）；
 * 其他族是 ts11 遊戲內名稱。英文畫面只顯示英文名，不標
 */
function TroopName({ troop, isZh }: { troop: Pick<TroopListItem, 'troop_id' | 'name_zh' | 'name_en'>; isZh: boolean }) {
  if (!isZh) return <>{troop.name_en}</>
  const d = ingameUnitDisplay(troop.troop_id)
  return (
    <>
      <span data-testid="troop-name">{d?.text ?? troop.name_zh}</span>
      {d?.zhPending && (
        <>
          {' '}
          <PendingVerifyChip kind="unitNameZhPending" />
        </>
      )}
    </>
  )
}

/** 速度沒有第一手出處（null 或官方頁標示取自第三方計算器）就標「待驗證」 */
function isSpeedPending(t: Pick<TroopListItem, 'speed' | 'speed_source'>): boolean {
  return t.speed === null || t.speed_source === 'official_pending' || t.speed_source === 'pending'
}

export default function TroopsPage() {
  const { t, i18n } = useTranslation()
  const [troops, setTroops] = useState<TroopListItem[]>([])
  const [selectedTroop, setSelectedTroop] = useState<TroopDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tribe, setTribe] = useState<TroopTribe | 'all'>('all')
  const [category, setCategory] = useState<TroopCategory | 'all'>('all')
  const [search, setSearch] = useState('')

  const isZh = i18n.language.startsWith('zh')
  const carryPending = selectedTroop ? carryPendingTribe(selectedTroop.troop_id) : null
  const spartanCarry = (carryPending ?? selectedTroop?.tribe) === 'spartans'
  const carryKind: PendingKind = spartanCarry ? 'spartanCarry' : 'vikingCarry'

  useEffect(() => {
    const fetchTroops = async () => {
      try {
        setLoading(true)
        setError(null)
        const params: { tribe?: TroopTribe; category?: TroopCategory; search?: string } = {}
        if (tribe !== 'all') params.tribe = tribe
        if (category !== 'all') params.category = category
        if (search) params.search = search
        const response = await troopsApi.getTroops(params)
        setTroops(response.troops)
      } catch {
        setError('Failed to load troops')
      } finally {
        setLoading(false)
      }
    }

    fetchTroops()
  }, [tribe, category, search])

  const handleSelectTroop = async (troop: TroopListItem) => {
    try {
      const detail = await troopsApi.getTroop(troop.tribe, troop.troop_id)
      setSelectedTroop(detail)
    } catch {
      setError('Failed to load troop details')
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">兵種數據庫</h1>
      {/* 選「全部」也會列出斯巴達、維京 → 顯示待驗證那一行 */}
      <CalcBar tribe={tribe} />

      {/* 部族篩選 */}
      <div className="flex flex-wrap gap-2 mb-4">
        {TRIBES.map((t) => (
          <Button
            key={t.value}
            variant={tribe === t.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTribe(t.value)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {/* 類型篩選 */}
      <div className="flex flex-wrap gap-2 mb-4">
        {CATEGORIES.map((c) => (
          <Button
            key={c.value}
            variant={category === c.value ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setCategory(c.value)}
          >
            {c.label}
          </Button>
        ))}
      </div>

      {/* 搜尋 */}
      <input
        type="text"
        placeholder="搜尋兵種..."
        className="px-4 py-2 border rounded-md mb-6 w-full max-w-sm"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {loading && <p className="text-center py-8">Loading...</p>}
      {error && <p className="text-center py-8 text-red-500">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 兵種列表 */}
        <div className="md:col-span-1 border rounded-lg p-4 max-h-[600px] overflow-y-auto">
          <h2 className="text-lg font-semibold mb-4">
            兵種列表 ({troops.length})
          </h2>
          <div className="space-y-2">
            {troops.map((troop) => (
              <div
                key={troop.troop_id}
                className={`p-3 rounded cursor-pointer transition-colors ${
                  selectedTroop?.troop_id === troop.troop_id
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
                onClick={() => handleSelectTroop(troop)}
              >
                <p className="font-medium">
                  <TroopName troop={troop} isZh={isZh} />
                </p>
                <p className="text-sm opacity-70">
                  ATK: {troop.attack} | DEF: {troop.defense_infantry}/
                  {troop.defense_cavalry}
                </p>
                {isSpeedPending(troop) && (
                  <p className="text-sm opacity-70" data-testid="troop-list-speed">
                    速度 {troop.speed ?? '—'}{' '}
                    <PendingVerifyChip kind={troop.speed === null ? 'unitSpeedNoSource' : 'unitSpeedOfficialPending'} />
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 兵種詳情 */}
        <div className="md:col-span-2 border rounded-lg p-4">
          {selectedTroop ? (
            <>
              <h2 className="text-2xl font-bold mb-2">
                <TroopName troop={selectedTroop} isZh={isZh} />
              </h2>
              <p className="text-muted-foreground mb-4">
                {isZh
                  ? selectedTroop.description_zh
                  : selectedTroop.description_en}
              </p>

              {/* 戰鬥屬性 */}
              <div className="mb-6">
              {/* 速度的待驗證說明畫在四格下面（格子太窄，放格子裡會擠成好幾行） */}
              <PendingRow fill className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-red-50 dark:bg-red-950 rounded">
                  <p className="text-sm text-muted-foreground">攻擊力</p>
                  <p className="text-2xl font-bold text-red-600">
                    {selectedTroop.attack}
                  </p>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded">
                  <p className="text-sm text-muted-foreground">步兵防禦</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {selectedTroop.defense_infantry}
                  </p>
                </div>
                <div className="p-3 bg-green-50 dark:bg-green-950 rounded">
                  <p className="text-sm text-muted-foreground">騎兵防禦</p>
                  <p className="text-2xl font-bold text-green-600">
                    {selectedTroop.defense_cavalry}
                  </p>
                </div>
                <div className="p-3 bg-yellow-50 dark:bg-yellow-950 rounded">
                  <p className="text-sm text-muted-foreground">速度</p>
                  {selectedTroop.speed === null ? (
                    <p className="text-2xl font-bold text-yellow-600" data-testid="troop-speed">
                      —{' '}
                      <PendingVerifyChip kind="unitSpeedNoSource" />
                    </p>
                  ) : (
                    <p className="text-2xl font-bold text-yellow-600" data-testid="troop-speed">
                      {selectedTroop.speed}
                      {isSpeedPending(selectedTroop) && (
                        <>
                          {' '}
                          <PendingVerifyChip kind="unitSpeedOfficialPending" />
                        </>
                      )}
                    </p>
                  )}
                  {/* 待驗證的速度：出處寫在灰標說明和卡片下面那行，卡片裡不再重複「官方說明頁（待驗證）」 */}
                  {!isSpeedPending(selectedTroop) && (
                    <p className="text-xs text-muted-foreground" data-testid="troop-speed-source">
                      {speedSourceLabel(selectedTroop)}
                    </p>
                  )}
                </div>
              </PendingRow>
              {selectedTroop.speed_source === 'official_pending' && (
                <p className="mt-2 text-xs text-muted-foreground" data-testid="troop-speed-official-pending-source">
                  {OFFICIAL_PENDING_SOURCE_LINES[0]}
                  <br />
                  {OFFICIAL_PENDING_SOURCE_LINES[1]}
                </p>
              )}
              </div>

              {/* 詳細資訊 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-2">基本資訊</h3>
                  <table className="w-full text-sm">
                    <tbody>
                      <tr className="border-b">
                        <td className="py-2 text-muted-foreground">部族</td>
                        <td className="py-2 text-right">{t(`tribes.${selectedTroop.tribe}`, { defaultValue: selectedTroop.tribe })}</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 text-muted-foreground">類型</td>
                        <td className="py-2 text-right">{t(`database.troops.category.${selectedTroop.category}`, { defaultValue: selectedTroop.category })}</td>
                      </tr>
                      {/* 斯巴達、維京運載量：官方說明頁沒有 → 留空（null，P0-23 PM）：顯示「—」、灰標緊跟在後；說明畫在這一列下面 */}
                      <PendingRow as="tr" className="border-b" tableColSpan={2} data-testid="troop-carry-row">
                        <td className="py-2 text-muted-foreground">運載量</td>
                        <td className="py-2 text-right" data-testid="troop-carry">
                          {selectedTroop.carry_capacity === null ? (
                            <span aria-label="未提供" data-testid="troop-carry-empty">—</span>
                          ) : (
                            selectedTroop.carry_capacity
                          )}
                          {(carryPending || selectedTroop.carry_capacity === null) && <PendingVerifyChip kind={carryKind} className="ml-1" />}
                        </td>
                      </PendingRow>
                      <tr className="border-b">
                        <td className="py-2 text-muted-foreground">糧耗</td>
                        <td className="py-2 text-right">{selectedTroop.crop_consumption}/h</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 text-muted-foreground">訓練建築</td>
                        <td className="py-2 text-right">{t(`database.troops.trainingBuilding.${selectedTroop.training_building}`, { defaultValue: selectedTroop.training_building })}</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 text-muted-foreground">研究院需求</td>
                        <td className="py-2 text-right">Lv.{selectedTroop.academy_level_required}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div data-testid="troop-cost-section">
                  {/* 兵種花費／糧耗／訓練時間：整個部族一個灰標，放在「訓練成本」標題旁（P0-17；P0-18 核對完把
                      data/unitCostVerified.json 那個部族改 true 就會拿掉）；說明撐滿這一區 */}
                  {isTribeCostVerified(selectedTroop.tribe) ? (
                    <h3 className="font-semibold mb-2">訓練成本</h3>
                  ) : (
                    <PendingRow fill as="h3" className="font-semibold" data-testid="troop-cost-heading">
                      訓練成本 <PendingVerifyChip kind="units" />
                    </PendingRow>
                  )}
                  <table className={`w-full text-sm${isTribeCostVerified(selectedTroop.tribe) ? '' : ' mt-2'}`}>
                    <tbody>
                      <tr className="border-b">
                        <td className="py-2 text-muted-foreground">木材</td>
                        <td className="py-2 text-right">{selectedTroop.cost_wood}</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 text-muted-foreground">磚塊</td>
                        <td className="py-2 text-right">{selectedTroop.cost_clay}</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 text-muted-foreground">鐵礦</td>
                        <td className="py-2 text-right">{selectedTroop.cost_iron}</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 text-muted-foreground">糧食</td>
                        <td className="py-2 text-right">{selectedTroop.cost_crop}</td>
                      </tr>
                      <tr className="border-b font-semibold">
                        <td className="py-2">總計</td>
                        <td className="py-2 text-right">{selectedTroop.total_cost}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 效率指標 */}
              <div className="mt-6">
                <h3 className="font-semibold mb-2">效率指標</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-2 bg-muted rounded text-center">
                    <p className="text-xs text-muted-foreground">攻擊/糧耗</p>
                    <p className="font-bold">
                      {selectedTroop.attack_per_crop.toFixed(2)}
                    </p>
                  </div>
                  <div className="p-2 bg-muted rounded text-center">
                    <p className="text-xs text-muted-foreground">步防/糧耗</p>
                    <p className="font-bold">
                      {selectedTroop.defense_infantry_per_crop.toFixed(2)}
                    </p>
                  </div>
                  <div className="p-2 bg-muted rounded text-center">
                    <p className="text-xs text-muted-foreground">騎防/糧耗</p>
                    <p className="font-bold">
                      {selectedTroop.defense_cavalry_per_crop.toFixed(2)}
                    </p>
                  </div>
                  <div className="p-2 bg-muted rounded text-center">
                    <p className="text-xs text-muted-foreground">攻擊/成本</p>
                    <p className="font-bold">
                      {selectedTroop.attack_per_cost.toFixed(4)}
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <p className="text-center text-muted-foreground py-12">
              請選擇兵種以查看詳情
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
