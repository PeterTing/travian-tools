import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { browserTimeZone } from '@/lib/accountDisplay'
import { ALLOWED_SPEEDS, describeServerUrl } from '@/lib/worldUrl'
import { gameAccountApi } from '@/services/gameAccountApi'
import type {
  GameAccount,
  GameAccountCreate,
  GameAccountUpdate,
  TimeDisplay,
  TroopTribe,
} from '@/types/game'

interface GameAccountFormProps {
  account?: GameAccount | null
  onSuccess: () => void
  onCancel: () => void
}

const TRIBES: TroopTribe[] = [
  'romans',
  'gauls',
  'teutons',
  'huns',
  'egyptians',
  'vikings',
  'spartans',
]

const selectClass =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

/**
 * 新增／編輯遊戲帳號。
 * 必填只有三個：世界（伺服器網址，可以直接貼遊戲網址）、部族、遊戲內名稱。
 * 伺服器名稱和速度從網址自動帶入；其他都收在「更多設定（選填）」，預設收起來。
 * 這個表單沒有任何密碼欄位。
 */
export default function GameAccountForm({
  account,
  onSuccess,
  onCancel,
}: GameAccountFormProps) {
  const { t } = useTranslation()
  const isEditing = !!account
  // 選「我的本地時間」時存目前瀏覽器的時區；編輯時沿用原本存的
  const localTimezone =
    account?.time_display === 'local' && account.local_timezone
      ? account.local_timezone
      : browserTimeZone()

  // 編輯時：存的名稱／速度就是從原網址推出來的，就當成「自動」（留空），
  // 之後改網址才會跟著新網址走
  const initialWorld = account ? describeServerUrl(account.server_url) : null
  const initialName =
    account?.server_name && account.server_name !== initialWorld?.serverName ? account.server_name : ''
  const initialSpeed =
    account && account.server_speed !== (initialWorld?.serverSpeed ?? 1) ? String(account.server_speed) : ''

  const [formData, setFormData] = useState({
    server_url: account?.server_url || '',
    tribe: account?.tribe || '',
    player_name: account?.player_name || '',
    // 以下在「更多設定（選填）」；'' 表示從網址自動判斷
    server_name: initialName,
    server_speed: initialSpeed,
    alliance_name: account?.alliance_name || '',
    server_start_date: account?.server_start_date || '',
    is_active: account?.is_active ?? true,
    // '' 表示第一次貼上時再問
    time_display: (account?.time_display ?? '') as TimeDisplay | '',
  })
  const [showMore, setShowMore] = useState(false)
  // 使用者自己改過名稱／速度就不再自動清掉
  const [touched, setTouched] = useState({ server_name: false, server_speed: false })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const world = useMemo(() => describeServerUrl(formData.server_url), [formData.server_url])

  /**
   * 改了世界網址：換到別的主機時，沒動過的名稱和速度改回「自動」，
   * 從新網址重新推（不然頂部的世界和擴充「存到」會顯示舊的世界）。
   */
  const changeServerUrl = (value: string) => {
    setFormData((prev) => {
      const before = describeServerUrl(prev.server_url)?.serverUrl
      const after = describeServerUrl(value)?.serverUrl
      const hostChanged = !!after && after !== before
      return {
        ...prev,
        server_url: value,
        server_name: hostChanged && !touched.server_name ? '' : prev.server_name,
        server_speed: hostChanged && !touched.server_speed ? '' : prev.server_speed,
      }
    })
  }
  const autoSpeed = world?.serverSpeed ?? null

  /** 時間顯示設定：沒選就送 null（之後第一次貼上再問） */
  const timeFields = (): Pick<GameAccountCreate, 'time_display' | 'local_timezone'> => {
    if (formData.time_display === 'local') {
      return { time_display: 'local', local_timezone: localTimezone }
    }
    if (formData.time_display === 'server') {
      return { time_display: 'server', local_timezone: null }
    }
    return { time_display: null, local_timezone: null }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.server_url.trim()) {
      setError(t('gameAccounts.validation.worldRequired'))
      return
    }
    if (!world) {
      setError(t('gameAccounts.validation.worldFormat'))
      return
    }
    if (!formData.tribe) {
      setError(t('gameAccounts.validation.tribeRequired'))
      return
    }
    if (!formData.player_name.trim()) {
      setError(t('gameAccounts.validation.playerNameRequired'))
      return
    }

    const common = {
      server_url: world.serverUrl,
      tribe: formData.tribe as TroopTribe,
      player_name: formData.player_name.trim(),
      // 沒填就交給後端從網址推
      server_name: formData.server_name.trim() || world.serverName || undefined,
      server_speed: formData.server_speed ? Number(formData.server_speed) : (autoSpeed ?? undefined),
      alliance_name: formData.alliance_name.trim() || undefined,
      server_start_date: formData.server_start_date || undefined,
      ...timeFields(),
    }

    try {
      setLoading(true)
      if (isEditing && account) {
        const updateData: GameAccountUpdate = { ...common, is_active: formData.is_active }
        await gameAccountApi.update(account.account_id, updateData)
      } else {
        const createData: GameAccountCreate = common
        await gameAccountApi.create(createData)
      }
      onSuccess()
    } catch {
      setError(isEditing ? t('gameAccounts.updateError') : t('gameAccounts.createError'))
    } finally {
      setLoading(false)
    }
  }

  const detected: string[] = []
  if (world?.serverName) detected.push(world.serverName)
  if (autoSpeed) detected.push(t('gameAccounts.worldSpeed', { speed: autoSpeed }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isEditing ? t('gameAccounts.editAccount') : t('gameAccounts.addAccount')}
        </CardTitle>
        <CardDescription>{t('gameAccounts.formIntro')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="server_url">{t('gameAccounts.world')} *</Label>
            <Input
              id="server_url"
              value={formData.server_url}
              onChange={(e) => changeServerUrl(e.target.value)}
              placeholder={t('gameAccounts.worldPlaceholder')}
              autoComplete="off"
              inputMode="url"
              aria-describedby="server_url_hint"
              required
            />
            <p id="server_url_hint" className="text-xs text-muted-foreground" data-testid="world-hint">
              {world
                ? [t('gameAccounts.worldSavedAs', { url: world.serverUrl }), ...detected].join(' · ')
                : formData.server_url.trim()
                  ? t('gameAccounts.validation.worldFormat')
                  : t('gameAccounts.worldHint')}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tribe">{t('gameAccounts.tribe')} *</Label>
            <select
              id="tribe"
              value={formData.tribe}
              onChange={(e) => setFormData({ ...formData, tribe: e.target.value })}
              className={selectClass}
              required
            >
              <option value="">{t('gameAccounts.selectTribe')}</option>
              {TRIBES.map((tribe) => (
                <option key={tribe} value={tribe}>
                  {t(`tribes.${tribe}`)}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="player_name">{t('gameAccounts.playerName')} *</Label>
            <Input
              id="player_name"
              value={formData.player_name}
              onChange={(e) => setFormData({ ...formData, player_name: e.target.value })}
              placeholder={t('gameAccounts.playerNamePlaceholder')}
              autoComplete="off"
              required
            />
          </div>

          <div className="rounded-md border">
            <button
              type="button"
              className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium"
              aria-expanded={showMore}
              aria-controls="more-settings"
              onClick={() => setShowMore((v) => !v)}
            >
              <span>{t('gameAccounts.moreSettings')}</span>
              <span aria-hidden="true">{showMore ? '▾' : '▸'}</span>
            </button>
            <div id="more-settings" hidden={!showMore} className="space-y-4 border-t px-3 py-3">
              <div className="space-y-2">
                <Label htmlFor="server_name">{t('gameAccounts.serverName')}</Label>
                <Input
                  id="server_name"
                  value={formData.server_name}
                  onChange={(e) => {
                    setTouched((prev) => ({ ...prev, server_name: true }))
                    setFormData({ ...formData, server_name: e.target.value })
                  }}
                  placeholder={
                    world?.serverName
                      ? t('gameAccounts.autoValue', { value: world.serverName })
                      : t('gameAccounts.serverNamePlaceholder')
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="server_speed">{t('gameAccounts.serverSpeed')}</Label>
                <select
                  id="server_speed"
                  value={formData.server_speed}
                  onChange={(e) => {
                    setTouched((prev) => ({ ...prev, server_speed: true }))
                    setFormData({ ...formData, server_speed: e.target.value })
                  }}
                  className={selectClass}
                >
                  <option value="">
                    {t('gameAccounts.autoValue', { value: `${autoSpeed ?? 1}x` })}
                  </option>
                  {ALLOWED_SPEEDS.map((speed) => (
                    <option key={speed} value={String(speed)}>
                      {speed}x
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="server_start_date">{t('gameAccounts.serverStartDate')}</Label>
                <Input
                  id="server_start_date"
                  type="date"
                  value={formData.server_start_date}
                  onChange={(e) => setFormData({ ...formData, server_start_date: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">{t('gameAccounts.serverStartDateHint')}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="alliance_name">{t('gameAccounts.allianceName')}</Label>
                <Input
                  id="alliance_name"
                  value={formData.alliance_name}
                  onChange={(e) => setFormData({ ...formData, alliance_name: e.target.value })}
                  placeholder={t('gameAccounts.allianceNamePlaceholder')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="time_display">{t('gameAccounts.timeDisplay')}</Label>
                <select
                  id="time_display"
                  value={formData.time_display}
                  onChange={(e) =>
                    setFormData({ ...formData, time_display: e.target.value as TimeDisplay | '' })
                  }
                  className={selectClass}
                >
                  <option value="">{t('gameAccounts.timeDisplayAsk')}</option>
                  <option value="server">{t('gameAccounts.timeDisplayServer')}</option>
                  <option value="local">{t('gameAccounts.timeDisplayLocal', { tz: localTimezone })}</option>
                </select>
                <p className="text-xs text-muted-foreground">{t('gameAccounts.timeDisplayHint')}</p>
              </div>

              {isEditing && (
                <div className="flex items-center space-x-2">
                  <input
                    id="is_active"
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="is_active">{t('gameAccounts.isActive')}</Label>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? t('common.loading') : t('gameAccounts.save')}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              {t('gameAccounts.cancel')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
