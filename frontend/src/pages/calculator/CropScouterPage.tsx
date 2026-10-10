import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CalcBar } from '@/components/autofill/CalcFrame'
import { ingameBuildingName } from '@/lib/ingameNames'
import { RESOURCE_FIELD_TOTAL, classifyCropFields, type FieldCounts } from '@/lib/cropFields'

const FIELDS: { key: keyof FieldCounts; buildingId: string }[] = [
  { key: 'wood', buildingId: 'woodcutter' },
  { key: 'clay', buildingId: 'clay_pit' },
  { key: 'iron', buildingId: 'iron_mine' },
  { key: 'crop', buildingId: 'cropland' },
]

/**
 * 糧田判斷（稽核 2026-10-10，PM 決定）：輸入田地種類（四種田各幾塊）就標出幾糧田。
 * 地圖上點格子就看得到田地種類，所以直接選，不從產量反推。
 */
export default function CropScouterPage() {
  const { t } = useTranslation()
  const [counts, setCounts] = useState<Partial<FieldCounts>>({})
  const result = classifyCropFields(counts)
  const filled = FIELDS.every((f) => counts[f.key] != null)

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">{t('cropFieldsCalc.title')}</h1>
      <p className="text-muted-foreground mb-6">{t('cropFieldsCalc.intro')}</p>
      <CalcBar />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">{t('cropFieldsCalc.inputs', { n: RESOURCE_FIELD_TOTAL })}</h2>
          <div className="grid grid-cols-2 gap-4">
            {FIELDS.map((f) => (
              <label key={f.key} className="block text-sm font-medium">
                <span className="mb-2 block">{ingameBuildingName(f.buildingId)}</span>
                <select
                  data-testid={f.key}
                  value={counts[f.key] ?? ''}
                  onChange={(e) =>
                    setCounts((prev) => ({ ...prev, [f.key]: e.target.value === '' ? undefined : Number(e.target.value) }))
                  }
                  className="w-full p-2 border rounded bg-background"
                >
                  <option value="">{t('cropFieldsCalc.choose')}</option>
                  {Array.from({ length: RESOURCE_FIELD_TOTAL + 1 }, (_, n) => (
                    <option key={n} value={n}>{t('cropFieldsCalc.blocks', { n })}</option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          {filled && !result.ok && (
            <p role="alert" className="mt-2 text-xs text-red-600" data-testid="crop-fields-error">{result.error}</p>
          )}
        </div>

        <div className="border rounded-lg p-6" data-testid="result">
          <h2 className="text-xl font-semibold mb-4">{t('cropFieldsCalc.result')}</h2>
          {result.ok ? (
            <div className="p-4 bg-primary/10 rounded text-center">
              <p className="text-3xl font-bold text-primary" data-testid="crop-fields-label">{result.label}</p>
              <p className="mt-1 text-sm text-muted-foreground">{result.layout}</p>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">{t('cropFieldsCalc.empty')}</p>
          )}
        </div>
      </div>
    </div>
  )
}
