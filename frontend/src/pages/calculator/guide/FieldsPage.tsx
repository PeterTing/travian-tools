import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import FieldRoiCalculator from '@/features/guideCalcs/components/FieldRoiCalculator'
import CropSimCalculator from '@/features/guideCalcs/components/CropSimCalculator'

type Mode = 'roi' | 'capital'

/**
 * 發展 › 資源田與首都規劃（IA v2.2）：田地 ROI 和首都產量模擬合在一頁，
 * 一般村與首都兩個入口；舊網址 /calculator/field-roi、/calculator/crop-sim 轉到這裡。
 */
export default function FieldsPage() {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const mode: Mode = params.get('mode') === 'capital' ? 'capital' : 'roi'
  const modes: { id: Mode; label: string }[] = [
    { id: 'roi', label: t('fields.modeRoi') },
    { id: 'capital', label: t('fields.modeCapital') },
  ]

  return (
    <div className="mx-auto w-full max-w-5xl min-w-0 overflow-x-clip px-3 py-4 sm:px-4">
      <h1 className="mb-3 text-xl font-bold">{t('nav.calcs.fields')}</h1>
      <div role="tablist" aria-label={t('nav.calcs.fields')} className="mb-4 grid max-w-md grid-cols-2 gap-1 rounded-lg bg-muted p-1">
        {modes.map((m) => (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={mode === m.id}
            data-testid={`fields-mode-${m.id}`}
            onClick={() => setParams(m.id === 'roi' ? {} : { mode: m.id }, { replace: true })}
            className={`min-h-[44px] rounded-md text-sm ${
              mode === m.id ? 'bg-background font-semibold text-orange-600 shadow-sm' : 'text-muted-foreground'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
      {mode === 'roi' ? <FieldRoiCalculator /> : <CropSimCalculator />}
    </div>
  )
}
