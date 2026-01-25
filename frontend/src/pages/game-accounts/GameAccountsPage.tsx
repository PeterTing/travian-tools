import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
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
import { gameAccountApi } from '@/services/gameAccountApi'
import type { GameAccount } from '@/types/game'
import GameAccountForm from './GameAccountForm'

export default function GameAccountsPage() {
  const { t } = useTranslation()

  const [accounts, setAccounts] = useState<GameAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingAccount, setEditingAccount] = useState<GameAccount | null>(null)
  const [deleteAccountId, setDeleteAccountId] = useState<string | null>(null)

  useEffect(() => {
    loadAccounts()
  }, [])

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
  }

  const handleFormCancel = () => {
    setShowForm(false)
    setEditingAccount(null)
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
                    <span className="text-muted-foreground">{t('gameAccounts.accountAgeDays')}:</span>
                    <span>{account.account_age_days}</span>
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
