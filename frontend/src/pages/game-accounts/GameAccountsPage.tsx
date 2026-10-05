import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ROUTES } from '@/constants/routes'
import { useCurrentAccount } from '@/contexts/CurrentAccountContext'
import { gameAccountApi } from '@/services/gameAccountApi'
import type { GameAccount } from '@/types/game'
import GameAccountForm from './GameAccountForm'

interface GameAccountsPageProps {
  /** /game-accounts/new：一進來就打開新增表單 */
  startWithCreate?: boolean
}

export default function GameAccountsPage({ startWithCreate = false }: GameAccountsPageProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { reload: reloadCurrentAccounts } = useCurrentAccount()

  const [accounts, setAccounts] = useState<GameAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(startWithCreate)
  const [editingAccount, setEditingAccount] = useState<GameAccount | null>(null)
  const [deleteAccountId, setDeleteAccountId] = useState<string | null>(null)

  useEffect(() => {
    loadAccounts()
  }, [])

  // 從 /game-accounts 換到 /game-accounts/new 時元件不會重建，所以要另外打開表單
  useEffect(() => {
    if (startWithCreate) {
      setEditingAccount(null)
      setShowForm(true)
    }
  }, [startWithCreate])

  /** 離開 /game-accounts/new，回到帳號清單 */
  const leaveCreateRoute = () => {
    if (startWithCreate) navigate(ROUTES.GAME_ACCOUNTS, { replace: true })
  }

  const loadAccounts = async () => {
    try {
      setLoading(true)
      const response = await gameAccountApi.getAll(true)
      setAccounts(response.accounts)
    } catch (error) {
      console.error('Failed to load accounts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingAccount(null)
    setShowForm(true)
  }

  const handleEdit = (account: GameAccount) => {
    setEditingAccount(account)
    setShowForm(true)
  }

  const handleDelete = async () => {
    if (!deleteAccountId) return

    try {
      await gameAccountApi.delete(deleteAccountId)
      await loadAccounts()
      void reloadCurrentAccounts()
    } catch (error) {
      console.error('Failed to delete account:', error)
    } finally {
      setDeleteAccountId(null)
    }
  }

  const handleFormSuccess = () => {
    setShowForm(false)
    setEditingAccount(null)
    loadAccounts()
    // 頂部的帳號和世界切換也要看到新的清單
    void reloadCurrentAccounts()
    leaveCreateRoute()
  }

  const handleFormCancel = () => {
    setShowForm(false)
    setEditingAccount(null)
    leaveCreateRoute()
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  if (showForm) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <GameAccountForm
          account={editingAccount}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{t('gameAccounts.title')}</h1>
          <p className="text-muted-foreground">{t('gameAccounts.description')}</p>
        </div>
        <Button onClick={handleCreate}>{t('gameAccounts.addAccount')}</Button>
      </div>

      {accounts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">
              {t('gameAccounts.noAccounts')}
            </p>
            <Button onClick={handleCreate}>{t('gameAccounts.addAccount')}</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => (
            <Card key={account.account_id} className={!account.is_active ? 'opacity-60' : ''}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{account.player_name || account.server_name || account.server_url}</span>
                  {!account.is_active && (
                    <span className="text-xs text-muted-foreground">
                      ({t('gameAccounts.isActive')}: ×)
                    </span>
                  )}
                </CardTitle>
                <CardDescription>{account.server_url}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {account.tribe && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('gameAccounts.tribe')}:</span>
                      <span>{t(`tribes.${account.tribe}`)}</span>
                    </div>
                  )}
                  {account.alliance_name && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('gameAccounts.allianceName')}:</span>
                      <span>{account.alliance_name}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('gameAccounts.serverSpeed')}:</span>
                    <span>{account.server_speed}x</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('gameAccounts.serverDay')}:</span>
                    <span>Day {account.current_server_day}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('gameAccounts.villageCount')}:</span>
                    <span>{account.village_count ?? 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('gameAccounts.timeDisplay')}:</span>
                    <span>
                      {account.time_display === 'server'
                        ? t('gameAccounts.timeDisplayServer')
                        : account.time_display === 'local'
                          ? t('gameAccounts.timeDisplayLocal', { tz: account.local_timezone ?? '' })
                          : t('gameAccounts.timeDisplayAsk')}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleEdit(account)}
                  >
                    {t('gameAccounts.editAccount')}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeleteAccountId(account.account_id)}
                  >
                    {t('gameAccounts.delete')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteAccountId} onOpenChange={() => setDeleteAccountId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('gameAccounts.deleteAccount')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('gameAccounts.deleteConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('gameAccounts.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              {t('gameAccounts.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
