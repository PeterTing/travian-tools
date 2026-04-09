import { useState } from 'react'
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
import { gameAccountApi } from '@/services/gameAccountApi'
import type { GameAccount, GameAccountCreate, GameAccountUpdate, TroopTribe } from '@/types/game'

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

export default function GameAccountForm({
  account,
  onSuccess,
  onCancel,
}: GameAccountFormProps) {
  const { t } = useTranslation()
  const isEditing = !!account

  const [formData, setFormData] = useState({
    server_url: account?.server_url || '',
    server_name: account?.server_name || '',
    server_speed: account?.server_speed || 1,
    tribe: account?.tribe || '',
    player_name: account?.player_name || '',
    alliance_name: account?.alliance_name || '',
    server_start_date: account?.server_start_date || '',
    is_active: account?.is_active ?? true,
    login_email: account?.login_email || '',
    login_password: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validateServerUrl = (url: string): boolean => {
    return url.startsWith('http://') || url.startsWith('https://')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.server_url.trim()) {
      setError(t('gameAccounts.validation.serverUrlRequired'))
      return
    }

    if (!validateServerUrl(formData.server_url)) {
      setError(t('gameAccounts.validation.serverUrlFormat'))
      return
    }

    try {
      setLoading(true)

      if (isEditing && account) {
        const updateData: GameAccountUpdate = {
          server_url: formData.server_url,
          server_name: formData.server_name || undefined,
          server_speed: formData.server_speed,
          tribe: formData.tribe as TroopTribe || undefined,
          player_name: formData.player_name || undefined,
          alliance_name: formData.alliance_name || undefined,
          server_start_date: formData.server_start_date || undefined,
          is_active: formData.is_active,
          login_email: formData.login_email || undefined,
          login_password: formData.login_password || undefined,
        }
        await gameAccountApi.update(account.account_id, updateData)
      } else {
        const createData: GameAccountCreate = {
          server_url: formData.server_url,
          server_name: formData.server_name || undefined,
          server_speed: formData.server_speed,
          tribe: formData.tribe as TroopTribe || undefined,
          player_name: formData.player_name || undefined,
          alliance_name: formData.alliance_name || undefined,
          server_start_date: formData.server_start_date || undefined,
          login_email: formData.login_email || undefined,
          login_password: formData.login_password || undefined,
        }
        await gameAccountApi.create(createData)
      }

      onSuccess()
    } catch (err) {
      setError(
        isEditing
          ? t('gameAccounts.updateError')
          : t('gameAccounts.createError')
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isEditing ? t('gameAccounts.editAccount') : t('gameAccounts.addAccount')}
        </CardTitle>
        <CardDescription>{t('gameAccounts.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="server_url">{t('gameAccounts.serverUrl')} *</Label>
            <Input
              id="server_url"
              value={formData.server_url}
              onChange={(e) =>
                setFormData({ ...formData, server_url: e.target.value })
              }
              placeholder={t('gameAccounts.serverUrlPlaceholder')}
              required
            />
          </div>

          <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
            <div>
              <p className="text-sm font-medium mb-1">Travian 遊戲登入憑證</p>
              <p className="text-xs text-muted-foreground">用於自動同步村莊資料。不填則無法使用同步功能。</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="login_email">Travian 登入 Email</Label>
              <Input
                id="login_email"
                type="email"
                value={formData.login_email}
                onChange={(e) =>
                  setFormData({ ...formData, login_email: e.target.value })
                }
                placeholder="your-travian-email@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login_password">Travian 登入密碼</Label>
              <Input
                id="login_password"
                type="password"
                value={formData.login_password}
                onChange={(e) =>
                  setFormData({ ...formData, login_password: e.target.value })
                }
                placeholder={isEditing ? '留空表示不修改' : '輸入 Travian 遊戲密碼'}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="server_name">{t('gameAccounts.serverName')}</Label>
            <Input
              id="server_name"
              value={formData.server_name}
              onChange={(e) =>
                setFormData({ ...formData, server_name: e.target.value })
              }
              placeholder={t('gameAccounts.serverNamePlaceholder')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="server_speed">{t('gameAccounts.serverSpeed')}</Label>
            <select
              id="server_speed"
              value={formData.server_speed}
              onChange={(e) =>
                setFormData({ ...formData, server_speed: parseInt(e.target.value) })
              }
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value={1}>1x</option>
              <option value={2}>2x</option>
              <option value={3}>3x</option>
              <option value={5}>5x</option>
              <option value={10}>10x</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tribe">{t('gameAccounts.tribe')}</Label>
            <select
              id="tribe"
              value={formData.tribe}
              onChange={(e) =>
                setFormData({ ...formData, tribe: e.target.value })
              }
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
            <Label htmlFor="player_name">{t('gameAccounts.playerName')}</Label>
            <Input
              id="player_name"
              value={formData.player_name}
              onChange={(e) =>
                setFormData({ ...formData, player_name: e.target.value })
              }
              placeholder={t('gameAccounts.playerNamePlaceholder')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="alliance_name">{t('gameAccounts.allianceName')}</Label>
            <Input
              id="alliance_name"
              value={formData.alliance_name}
              onChange={(e) =>
                setFormData({ ...formData, alliance_name: e.target.value })
              }
              placeholder={t('gameAccounts.allianceNamePlaceholder')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="server_start_date">{t('gameAccounts.serverStartDate')}</Label>
            <Input
              id="server_start_date"
              type="date"
              value={formData.server_start_date}
              onChange={(e) =>
                setFormData({ ...formData, server_start_date: e.target.value })
              }
            />
            <p className="text-xs text-muted-foreground">
              {t('gameAccounts.serverStartDateHint')}
            </p>
          </div>

          {isEditing && (
            <div className="flex items-center space-x-2">
              <input
                id="is_active"
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) =>
                  setFormData({ ...formData, is_active: e.target.checked })
                }
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="is_active">{t('gameAccounts.isActive')}</Label>
            </div>
          )}

          <div className="flex gap-2 pt-4">
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
