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
import { accountPlayerLabel, accountWorldLabel } from '@/lib/accountDisplay'
import { gameAccountApi } from '@/services/gameAccountApi'
import type { GameAccount } from '@/types/game'
import GameAccountForm from './GameAccountForm'
import WorldSettings from './WorldSettings'

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
  // null＝使用者還沒點過：全部都停用時預設展開，不然收起來
  const [inactiveToggle, setInactiveToggle] = useState<boolean | null>(null)
  const [reactivatingId, setReactivatingId] = useState<string | null>(null)
  const [reactivateError, setReactivateError] = useState<string | null>(null)

  // 管理頁列出全部；停用的收在下面「已停用（n）」。頂部切換和村莊頁只用啟用中的
  const activeAccounts = accounts.filter((a) => a.is_active)
  const inactiveAccounts = accounts.filter((a) => !a.is_active)
  const allInactive = activeAccounts.length === 0 && inactiveAccounts.length > 0
  const showInactive = inactiveToggle ?? allInactive

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

  /** 重新啟用：只把 is_active 改回 true，不刪任何資料；頂部切換馬上看得到 */
  const handleReactivate = async (account: GameAccount) => {
    setReactivateError(null)
    setReactivatingId(account.account_id)
    try {
      await gameAccountApi.update(account.account_id, { is_active: true })
      await loadAccounts()
      void reloadCurrentAccounts()
    } catch (error) {
      console.error('Failed to reactivate account:', error)
      setReactivateError(t('gameAccounts.reactivateError'))
    } finally {
      setReactivatingId(null)
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

      {allInactive ? (
        // 有帳號但全部停用：說明可以在下面重新啟用，或新增一個
        <Card data-testid="all-inactive">
          <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <p className="font-medium">{t('gameAccounts.allInactiveTitle')}</p>
            <p className="text-sm text-muted-foreground">{t('gameAccounts.allInactiveHint')}</p>
            <Button className="mt-2" onClick={handleCreate}>
              {t('gameAccounts.addAccount')}
            </Button>
          </CardContent>
        </Card>
      ) : activeAccounts.length === 0 ? (
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
          {activeAccounts.map((account) => (
            <Card key={account.account_id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{accountPlayerLabel(account, accountWorldLabel(account))}</span>
                </CardTitle>
                {/* 副標題是世界名稱（例如 ts3 亞洲服）；沒填就從網址取（ts3），完整網址放在 title */}
                <CardDescription data-testid="account-server" title={account.server_url}>
                  {accountWorldLabel(account)}
                </CardDescription>
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

      {inactiveAccounts.length > 0 && (
        <section className="mt-6 rounded-md border" data-testid="inactive-accounts">
          <button
            type="button"
            className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-muted-foreground"
            aria-expanded={showInactive}
            aria-controls="inactive-account-list"
            onClick={() => setInactiveToggle(!showInactive)}
          >
            <span>{t('gameAccounts.inactiveSection', { count: inactiveAccounts.length })}</span>
            <span aria-hidden="true">{showInactive ? '▾' : '▸'}</span>
          </button>
          <div id="inactive-account-list" hidden={!showInactive} className="border-t">
            <p className="px-4 pt-3 text-xs text-muted-foreground">{t('gameAccounts.inactiveNote')}</p>
            {reactivateError && (
              <p role="alert" className="px-4 pt-2 text-xs text-destructive">
                {reactivateError}
              </p>
            )}
            <ul className="divide-y">
              {inactiveAccounts.map((account) => (
                <li
                  key={account.account_id}
                  className="flex items-center justify-between gap-3 px-4 py-3 text-muted-foreground"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {accountPlayerLabel(account, accountWorldLabel(account))}
                    </p>
                    <p className="truncate text-xs">
                      {[
                        accountWorldLabel(account),
                        account.tribe ? t(`tribes.${account.tribe}`) : null,
                        t('accountSwitcher.villageCount', { count: account.village_count ?? 0 }),
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="shrink-0"
                    disabled={reactivatingId === account.account_id}
                    onClick={() => handleReactivate(account)}
                  >
                    {t('gameAccounts.reactivate')}
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <WorldSettings refreshKey={accounts.map((a) => `${a.account_id}:${a.world_id}`).join(',')} />

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
