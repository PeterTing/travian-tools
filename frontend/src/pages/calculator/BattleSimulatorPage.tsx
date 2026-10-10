import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { troopsApi, calculatorApi } from '@/services/gameApi'
import type {
  TroopListItem,
  BattleSimulateRequest,
  BattleSimulateResponse,
  TroopTribe,
} from '@/types/game'

interface TroopUnit {
  troop_id: string
  count: number
}

export default function BattleSimulatorPage() {
  const { t, i18n } = useTranslation()
  const [troops, setTroops] = useState<TroopListItem[]>([])
  const [attackerTribe, setAttackerTribe] = useState<TroopTribe>('romans')
  const [defenderTribe, setDefenderTribe] = useState<TroopTribe>('gauls')
  const [attackerTroops, setAttackerTroops] = useState<TroopUnit[]>([
    { troop_id: '', count: 100 },
  ])
  const [defenderTroops, setDefenderTroops] = useState<TroopUnit[]>([
    { troop_id: '', count: 100 },
  ])
  const [wallLevel, setWallLevel] = useState(0)
  const [result, setResult] = useState<BattleSimulateResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isZh = i18n.language.startsWith('zh')
  const TRIBES: TroopTribe[] = ['romans', 'gauls', 'teutons', 'huns', 'egyptians', 'vikings', 'spartans']

  useEffect(() => {
    const fetchTroops = async () => {
      try {
        const response = await troopsApi.getTroops()
        setTroops(response.troops)
      } catch {
        setError('Failed to load troops')
      }
    }
    fetchTroops()
  }, [])

  const getFilteredTroops = (tribe: TroopTribe) => {
    return troops.filter((trp) => trp.tribe === tribe)
  }

  const handleSimulate = async () => {
    try {
      setLoading(true)
      setError(null)

      const request: BattleSimulateRequest = {
        attacker_troops: attackerTroops.filter((trp) => trp.troop_id && trp.count > 0),
        defender_troops: defenderTroops.filter((trp) => trp.troop_id && trp.count > 0),
        wall_level: wallLevel,
        defender_tribe: defenderTribe,
      }

      const response = await calculatorApi.simulateBattle(request)
      setResult(response)
    } catch {
      setError('Failed to simulate battle')
    } finally {
      setLoading(false)
    }
  }

  const handleTroopChange = (
    side: 'attacker' | 'defender',
    index: number,
    key: keyof TroopUnit,
    value: string | number
  ) => {
    const setter = side === 'attacker' ? setAttackerTroops : setDefenderTroops
    const list = side === 'attacker' ? attackerTroops : defenderTroops

    const newList = [...list]
    if (key === 'troop_id') {
      newList[index].troop_id = value as string
    } else {
      newList[index].count = Number(value)
    }
    setter(newList)
  }

  const addTroop = (side: 'attacker' | 'defender') => {
    const setter = side === 'attacker' ? setAttackerTroops : setDefenderTroops
    const list = side === 'attacker' ? attackerTroops : defenderTroops
    setter([...list, { troop_id: '', count: 100 }])
  }

  const removeTroop = (side: 'attacker' | 'defender', index: number) => {
    const setter = side === 'attacker' ? setAttackerTroops : setDefenderTroops
    const list = side === 'attacker' ? attackerTroops : defenderTroops
    if (list.length > 1) {
      setter(list.filter((_, i) => i !== index))
    }
  }

  const TroopSelector = ({
    side,
    tribe,
    setTribe,
    troopsList,
  }: {
    side: 'attacker' | 'defender'
    tribe: TroopTribe
    setTribe: (trb: TroopTribe) => void
    troopsList: TroopUnit[]
  }) => (
    <div className="border rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold">
          {side === 'attacker' ? t('calculator.battle.attacker') : t('calculator.battle.defender')}
        </h3>
        <select
          value={tribe}
          onChange={(e) => setTribe(e.target.value as TroopTribe)}
          className="p-2 border rounded bg-background"
        >
          {TRIBES.map((trb) => (
            <option key={trb} value={trb}>
              {t(`tribes.${trb}`)}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        {troopsList.map((trp, index) => (
          <div key={index} className="flex items-center gap-2">
            <select
              value={trp.troop_id}
              onChange={(e) =>
                handleTroopChange(side, index, 'troop_id', e.target.value)
              }
              className="flex-1 p-2 border rounded bg-background text-base"
            >
              <option value="">{t('calculator.battle.selectTroop')}</option>
              {getFilteredTroops(tribe).map((trpItem) => (
                <option key={trpItem.troop_id} value={trpItem.troop_id}>
                  {isZh ? trpItem.name_zh : trpItem.name_en}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={0}
              value={trp.count}
              onChange={(e) =>
                handleTroopChange(side, index, 'count', e.target.value)
              }
              className="w-24 p-2 border rounded bg-background text-center"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeTroop(side, index)}
              disabled={troopsList.length <= 1}
            >
              {t('calculator.battle.remove')}
            </Button>
          </div>
        ))}
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={() => addTroop(side)}
        className="mt-3 w-full"
      >
        {t('calculator.battle.addTroop')}
      </Button>

      {side === 'defender' && (
        <div className="mt-4 pt-4 border-t">
          <label className="block text-sm font-medium mb-2">{t('calculator.battle.wallLevel')}</label>
          <input
            type="number"
            min={0}
            max={20}
            value={wallLevel}
            onChange={(e) => setWallLevel(Number(e.target.value))}
            className="w-full p-2 border rounded bg-background"
          />
          <p className="text-xs text-muted-foreground mt-1">
            {t('calculator.battle.wallNote')}
          </p>
        </div>
      )}
    </div>
  )

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">{t('calculator.battle.title')}</h1>
      <p className="text-muted-foreground mb-2">{t('calculator.battle.description')}</p>
      <p className="text-sm text-amber-700 dark:text-amber-400 mb-6 border border-amber-300 dark:border-amber-700 rounded p-3 bg-amber-50 dark:bg-amber-950/40">
        {t('calculator.battle.unreliableNote')}
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attacker */}
        <TroopSelector
          side="attacker"
          tribe={attackerTribe}
          setTribe={setAttackerTribe}
          troopsList={attackerTroops}
        />

        {/* Center control */}
        <div className="flex flex-col justify-center items-center gap-4">
          <div className="text-4xl">{t('calculator.battle.vs')}</div>

          <Button
            onClick={handleSimulate}
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? t('common.simulate') : t('calculator.battle.simulate')}
          </Button>

          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>

        {/* Defender */}
        <TroopSelector
          side="defender"
          tribe={defenderTribe}
          setTribe={setDefenderTribe}
          troopsList={defenderTroops}
        />
      </div>

      {/* Result */}
      {result && (
        <div className="mt-8 border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-6 text-center">{t('calculator.battle.result')}</h2>

          {/* Win/Lose display */}
          <div
            className={`text-center p-6 rounded-lg mb-6 ${
              result.result === 'attacker_wins'
                ? 'bg-green-100 dark:bg-green-900'
                : result.result === 'defender_wins'
                  ? 'bg-red-100 dark:bg-red-900'
                  : 'bg-yellow-100 dark:bg-yellow-900'
            }`}
          >
            <p className="text-2xl font-bold">
              {result.result === 'attacker_wins'
                ? t('calculator.battle.attackerWin')
                : result.result === 'defender_wins'
                  ? t('calculator.battle.defenderWin')
                  : t('calculator.battle.draw')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Attacker result */}
            <div className="border rounded p-4">
              <h3 className="font-semibold mb-4 text-center">{t('calculator.battle.attacker')}</h3>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 bg-muted rounded text-center">
                  <p className="text-sm text-muted-foreground">{t('calculator.battle.casualtyRate')}</p>
                  <p className="text-xl font-bold text-red-600">
                    {((1 - result.attacker_survival_rate) * 100).toFixed(1)}{t('common.percent')}
                  </p>
                </div>
                <div className="p-3 bg-green-50 dark:bg-green-950 rounded text-center">
                  <p className="text-sm text-muted-foreground">{t('calculator.battle.survivalRate')}</p>
                  <p className="text-xl font-bold text-green-600">
                    {(result.attacker_survival_rate * 100).toFixed(1)}{t('common.percent')}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {Object.entries(result.attacker_losses).map(([troopId, losses]) => {
                  const troopData = troops.find((trp) => trp.troop_id === troopId)
                  const original = attackerTroops.find((trp) => trp.troop_id === troopId)?.count || 0
                  return (
                    <div
                      key={troopId}
                      className="flex justify-between items-center p-2 bg-muted rounded text-sm"
                    >
                      <span>
                        {troopData
                          ? isZh
                            ? troopData.name_zh
                            : troopData.name_en
                          : troopId}
                      </span>
                      <span>
                        {t('calculator.battle.lossFormat', { losses, original })}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Defender result */}
            <div className="border rounded p-4">
              <h3 className="font-semibold mb-4 text-center">{t('calculator.battle.defender')}</h3>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 bg-muted rounded text-center">
                  <p className="text-sm text-muted-foreground">{t('calculator.battle.casualtyRate')}</p>
                  <p className="text-xl font-bold text-red-600">
                    {((1 - result.defender_survival_rate) * 100).toFixed(1)}{t('common.percent')}
                  </p>
                </div>
                <div className="p-3 bg-green-50 dark:bg-green-950 rounded text-center">
                  <p className="text-sm text-muted-foreground">{t('calculator.battle.survivalRate')}</p>
                  <p className="text-xl font-bold text-green-600">
                    {(result.defender_survival_rate * 100).toFixed(1)}{t('common.percent')}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {Object.entries(result.defender_losses).map(([troopId, losses]) => {
                  const troopData = troops.find((trp) => trp.troop_id === troopId)
                  const original = defenderTroops.find((trp) => trp.troop_id === troopId)?.count || 0
                  return (
                    <div
                      key={troopId}
                      className="flex justify-between items-center p-2 bg-muted rounded text-sm"
                    >
                      <span>
                        {troopData
                          ? isZh
                            ? troopData.name_zh
                            : troopData.name_en
                          : troopId}
                      </span>
                      <span>
                        {t('calculator.battle.lossFormat', { losses, original })}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
