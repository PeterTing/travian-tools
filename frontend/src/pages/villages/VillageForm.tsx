import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Alert, AlertDescription } from '@/components/ui/alert'
import { villageApi } from '@/services/villageApi'
import type { Village, VillageCreate, VillageRole, VillageType, VillageUpdate } from '@/types/game'

interface VillageFormProps {
  accountId: string
  village: Village | null
  onSuccess: () => void
  onCancel: () => void
}

const VILLAGE_TYPES: VillageType[] = ['4-4-4-6', '3-4-5-6', '15c', '9c', '7c', '6c']
const VILLAGE_ROLES: VillageRole[] = ['capital', 'hammer', 'anvil', 'resource', 'mixed', 'ww']

export default function VillageForm({
  accountId,
  village,
  onSuccess,
  onCancel,
}: VillageFormProps) {
  const { t } = useTranslation()
  const isEditing = !!village

  const [formData, setFormData] = useState({
    name: village?.name || '',
    coordinate_x: village?.coordinate_x?.toString() || '',
    coordinate_y: village?.coordinate_y?.toString() || '',
    population: village?.population?.toString() || '0',
    village_type: village?.village_type || '',
    is_capital: village?.is_capital || false,
    role: village?.role || '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (isEditing) {
        const updateData: VillageUpdate = {
          name: formData.name || undefined,
          coordinate_x: formData.coordinate_x ? parseInt(formData.coordinate_x) : undefined,
          coordinate_y: formData.coordinate_y ? parseInt(formData.coordinate_y) : undefined,
          population: formData.population ? parseInt(formData.population) : undefined,
          village_type: formData.village_type as VillageType || undefined,
          is_capital: formData.is_capital,
          role: formData.role as VillageRole || undefined,
        }
        await villageApi.update(village!.village_id, updateData)
      } else {
        const createData: VillageCreate = {
          account_id: accountId,
          name: formData.name || undefined,
          coordinate_x: formData.coordinate_x ? parseInt(formData.coordinate_x) : undefined,
          coordinate_y: formData.coordinate_y ? parseInt(formData.coordinate_y) : undefined,
          population: formData.population ? parseInt(formData.population) : undefined,
          village_type: formData.village_type as VillageType || undefined,
          is_capital: formData.is_capital,
          role: formData.role as VillageRole || undefined,
        }
        await villageApi.create(createData)
      }
      onSuccess()
    } catch (err) {
      setError(t('villages.formError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isEditing ? t('villages.editVillage') : t('villages.addVillage')}
        </CardTitle>
        <CardDescription>
          {isEditing ? t('villages.editDescription') : t('villages.addDescription')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">{t('villages.name')}</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={t('villages.namePlaceholder')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="coordinate_x">{t('villages.coordinateX')}</Label>
              <Input
                id="coordinate_x"
                type="number"
                min="-400"
                max="400"
                value={formData.coordinate_x}
                onChange={(e) => setFormData({ ...formData, coordinate_x: e.target.value })}
                placeholder="-400 ~ 400"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="coordinate_y">{t('villages.coordinateY')}</Label>
              <Input
                id="coordinate_y"
                type="number"
                min="-400"
                max="400"
                value={formData.coordinate_y}
                onChange={(e) => setFormData({ ...formData, coordinate_y: e.target.value })}
                placeholder="-400 ~ 400"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="population">{t('villages.population')}</Label>
            <Input
              id="population"
              type="number"
              min="0"
              value={formData.population}
              onChange={(e) => setFormData({ ...formData, population: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="village_type">{t('villages.type')}</Label>
            <Select
              value={formData.village_type}
              onValueChange={(value) => setFormData({ ...formData, village_type: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('villages.selectType')} />
              </SelectTrigger>
              <SelectContent>
                {VILLAGE_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">{t('villages.role')}</Label>
            <Select
              value={formData.role}
              onValueChange={(value) => setFormData({ ...formData, role: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('villages.selectRole')} />
              </SelectTrigger>
              <SelectContent>
                {VILLAGE_ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {t(`villages.roles.${role}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="is_capital"
              checked={formData.is_capital}
              onChange={(e) => setFormData({ ...formData, is_capital: e.target.checked })}
              className="w-4 h-4"
            />
            <Label htmlFor="is_capital">{t('villages.isCapital')}</Label>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading
                ? t('common.loading')
                : isEditing
                  ? t('villages.save')
                  : t('villages.create')}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              {t('villages.cancel')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
