import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { describeServerUrl, formatUtcOffset, UTC_OFFSET_CHOICES } from '@/lib/worldUrl'
import { gameWorldApi } from '@/services/gameWorldApi'
import type { GameWorld } from '@/types/game'

interface WorldSettingsProps {
  /** 帳號清單變了就重新讀（新增帳號會自動建世界） */
  refreshKey?: string
}

type RowStatus = 'idle' | 'saving' | 'saved' | 'error'

/**
 * 世界設定：手動改伺服器的 UTC 時差。
 * 沒設定（null）= 時間照伺服器顯示，不換算。從貼上的頁面自動算是 P0-05 的事。
 */
export default function WorldSettings({ refreshKey = '' }: WorldSettingsProps) {
  const { t } = useTranslation()
  const [worlds, setWorlds] = useState<GameWorld[]>([])
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [status, setStatus] = useState<Record<string, RowStatus>>({})

  const load = useCallback(async () => {
    try {
      const response = await gameWorldApi.getAll()
      setWorlds(response.worlds)
      setDrafts(
        Object.fromEntries(
          response.worlds.map((w) => [w.world_id, w.utc_offset === null ? '' : String(w.utc_offset)])
        )
      )
    } catch (error) {
      console.error('Failed to load worlds:', error)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load, refreshKey])

  const save = async (world: GameWorld) => {
    const draft = drafts[world.world_id] ?? ''
    setStatus((s) => ({ ...s, [world.world_id]: 'saving' }))
    try {
      const updated = await gameWorldApi.update(world.world_id, {
        utc_offset: draft === '' ? null : Number(draft),
      })
      setWorlds((list) => list.map((w) => (w.world_id === updated.world_id ? updated : w)))
      setStatus((s) => ({ ...s, [world.world_id]: 'saved' }))
    } catch {
      setStatus((s) => ({ ...s, [world.world_id]: 'error' }))
    }
  }

  return (
    <Card className="mt-8" data-testid="world-settings">
      <CardHeader>
        <CardTitle>{t('worldSettings.title')}</CardTitle>
        <CardDescription>{t('worldSettings.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        {worlds.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('worldSettings.empty')}</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {worlds.map((world) => {
              const info = describeServerUrl(world.server_url)
              const selectId = `utc-offset-${world.world_id}`
              const saved = world.utc_offset === null ? '' : String(world.utc_offset)
              const draft = drafts[world.world_id] ?? saved
              const rowStatus = status[world.world_id] ?? 'idle'
              return (
                <li key={world.world_id} className="flex flex-col gap-2 p-3 md:flex-row md:items-end">
                  <div className="md:w-64">
                    <b>{info?.serverName ?? world.server_url}</b>
                    <p className="text-xs text-muted-foreground break-all">
                      {world.server_url} · {t('worldSettings.accountCount', { count: world.account_count })}
                    </p>
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label htmlFor={selectId}>{t('worldSettings.utcOffset')}</Label>
                    <select
                      id={selectId}
                      value={draft}
                      onChange={(e) => {
                        const value = e.target.value
                        setDrafts((d) => ({ ...d, [world.world_id]: value }))
                        setStatus((s) => ({ ...s, [world.world_id]: 'idle' }))
                      }}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">{t('worldSettings.unset')}</option>
                      {UTC_OFFSET_CHOICES.map((minutes) => (
                        <option key={minutes} value={String(minutes)}>
                          {formatUtcOffset(minutes)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={draft === saved || rowStatus === 'saving'}
                      onClick={() => void save(world)}
                    >
                      {t('worldSettings.save')}
                    </Button>
                    <span className="text-xs text-muted-foreground" role="status">
                      {rowStatus === 'saved'
                        ? t('worldSettings.saved')
                        : rowStatus === 'error'
                          ? t('worldSettings.saveError')
                          : ''}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
