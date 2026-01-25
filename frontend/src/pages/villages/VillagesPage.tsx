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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { villageApi } from '@/services/villageApi'
import type { GameAccount, Village } from '@/types/game'
import VillageForm from './VillageForm'

export default function VillagesPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [accounts, setAccounts] = useState<GameAccount[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<string>('')
  const [villages, setVillages] = useState<Village[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingVillage, setEditingVillage] = useState<Village | null>(null)
  const [deleteVillageId, setDeleteVillageId] = useState<string | null>(null)

  useEffect(() => {
    loadAccounts()
  }, [])

  useEffect(() => {
    if (selectedAccountId) {
      loadVillages(selectedAccountId)
    } else {
      setVillages([])
    }
  }, [selectedAccountId])

  const loadAccounts = async () => {
    try {
      setLoading(true)
      const response = await gameAccountApi.getAll(true)
      setAccounts(response.accounts)
      if (response.accounts.length > 0) {
        setSelectedAccountId(response.accounts[0].account_id)
      }
    } catch (error) {
      console.error('Failed to load accounts:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadVillages = async (accountId: string) => {
    try {
      setLoading(true)
      const response = await villageApi.getAll(accountId)
      setVillages(response.villages)
    } catch (error) {
      console.error('Failed to load villages:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingVillage(null)
    setShowForm(true)
  }

  const handleEdit = (village: Village) => {
    setEditingVillage(village)
    setShowForm(true)
  }

  const handleViewDetail = (villageId: string) => {
    navigate(`/villages/${villageId}`)
  }

  const handleDelete = async () => {
    if (!deleteVillageId) return

    try {
      await villageApi.delete(deleteVillageId)
      if (selectedAccountId) {
        await loadVillages(selectedAccountId)
      }
    } catch (error) {
      console.error('Failed to delete village:', error)
    } finally {
      setDeleteVillageId(null)
    }
  }

  const handleFormSuccess = () => {
    setShowForm(false)
    setEditingVillage(null)
    if (selectedAccountId) {
      loadVillages(selectedAccountId)
    }
  }

  const handleFormCancel = () => {
    setShowForm(false)
    setEditingVillage(null)
  }

  const getRoleBadgeColor = (role: string | null) => {
    switch (role) {
      case 'capital':
        return 'bg-yellow-100 text-yellow-800'
      case 'hammer':
        return 'bg-red-100 text-red-800'
      case 'anvil':
        return 'bg-blue-100 text-blue-800'
      case 'resource':
        return 'bg-green-100 text-green-800'
      case 'ww':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading && accounts.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  if (accounts.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">
              {t('villages.noAccounts')}
            </p>
            <Button onClick={() => navigate('/game-accounts')}>
              {t('villages.goToAccounts')}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (showForm) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <VillageForm
          accountId={selectedAccountId}
          village={editingVillage}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">{t('villages.title')}</h1>
          <p className="text-muted-foreground">{t('villages.description')}</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder={t('villages.selectAccount')} />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((account) => (
                <SelectItem key={account.account_id} value={account.account_id}>
                  {account.player_name || account.server_name || account.server_url}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleCreate}>{t('villages.addVillage')}</Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </div>
      ) : villages.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">
              {t('villages.noVillages')}
            </p>
            <Button onClick={handleCreate}>{t('villages.addVillage')}</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {villages.map((village) => (
            <Card key={village.village_id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{village.name || t('villages.unnamed')}</span>
                  {village.is_capital && (
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                      {t('villages.capital')}
                    </span>
                  )}
                </CardTitle>
                <CardDescription>
                  ({village.coordinate_x ?? '?'}, {village.coordinate_y ?? '?'})
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('villages.population')}:</span>
                    <span>{village.population}</span>
                  </div>
                  {village.village_type && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('villages.type')}:</span>
                      <span>{village.village_type}</span>
                    </div>
                  )}
                  {village.role && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('villages.role')}:</span>
                      <span className={`px-2 py-0.5 rounded text-xs ${getRoleBadgeColor(village.role)}`}>
                        {t(`villages.roles.${village.role}`)}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleViewDetail(village.village_id)}
                  >
                    {t('villages.viewDetail')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(village)}
                  >
                    {t('villages.edit')}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeleteVillageId(village.village_id)}
                  >
                    {t('villages.delete')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteVillageId} onOpenChange={() => setDeleteVillageId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('villages.deleteVillage')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('villages.deleteConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('villages.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              {t('villages.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
