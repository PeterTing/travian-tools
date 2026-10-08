import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { movementKindLabel } from '@/lib/pasteFormat'
import {
  clockFromSeconds,
  formatFieldValue,
  needsConfirm,
  ocrMeta,
  OCR_FIELD_ORDER,
  parseCoordsInput,
  parseTimeInput,
  reasonKey,
} from '@/lib/ocrFields'
import type { OcrField, OcrFieldName } from '@/services/ocrApi'
import { CoordsCameraButton } from './CoordsCameraButton'
import { CropZoom } from './CropZoom'

export interface OcrImageRef {
  url: string
  width: number
  height: number
}

interface Props {
  movement: Record<string, unknown>
  index: number
  images: OcrImageRef[]
  onApply: (index: number, name: OcrFieldName, value: unknown) => void
  onConfirmed: (index: number, name: OcrFieldName, confirmed: boolean) => void
}

function Highlight({ field, children }: { field?: OcrField; children: React.ReactNode }) {
  if (!field || field.status !== 'low') return <>{children}</>
  return (
    <span
      className={`rounded px-0.5 ${field.confirmed ? 'border border-green-500' : 'border-[1.5px] border-amber-500'}`}
    >
      {children}
    </span>
  )
}

function FieldConfirm({
  name,
  field,
  image,
  onApply,
  onConfirmed,
}: {
  name: OcrFieldName
  field: OcrField
  image?: OcrImageRef
  onApply: (value: unknown) => void
  onConfirmed: (confirmed: boolean) => void
}) {
  const { t } = useTranslation()
  const [manual, setManual] = useState(false)
  const [draft, setDraft] = useState('')
  const [draftError, setDraftError] = useState('')
  const [first, ...rest] = field.reasons
  const label = t(`ocr.fields.${name}`)

  const submitManual = () => {
    let value: unknown = null
    if (name === 'coords') value = parseCoordsInput(draft)
    else {
      const secs = parseTimeInput(draft, name === 'arrival')
      value = secs == null ? null : name === 'arrival' ? clockFromSeconds(secs) : secs
    }
    if (value == null) {
      setDraftError(t(name === 'coords' ? 'ocr.confirm.badCoords' : 'ocr.confirm.badTime'))
      return
    }
    setDraftError('')
    setManual(false)
    onApply(value)
  }

  if (field.confirmed) {
    return (
      <div
        className="flex items-center gap-2 text-xs text-green-800"
        data-testid="ocr-low-field"
        data-field={name}
        data-confirmed="true"
      >
        <span>
          ✓ {t('ocr.confirm.confirmed', { field: label, value: formatFieldValue(name, field.value) })}
        </span>
        <button type="button" className="underline" onClick={() => onConfirmed(false)}>
          {t('ocr.confirm.change')}
        </button>
      </div>
    )
  }

  const options = field.options.length
    ? field.options
    : field.value != null
      ? [{ value: field.value, label: formatFieldValue(name, field.value), note: null }]
      : []

  return (
    <div
      className="space-y-1.5 rounded-md border border-amber-300 bg-amber-50/80 p-2"
      data-testid="ocr-low-field"
      data-field={name}
      data-confirmed="false"
    >
      <div className="text-xs">
        <b>{label}</b> · <span data-testid="ocr-reason">{t(reasonKey(first), { defaultValue: first })}</span>
      </div>
      {rest.length > 0 && (
        <details className="text-xs text-amber-900">
          <summary>{t('ocr.confirm.moreReasons', { count: rest.length })}</summary>
          <ul className="ml-4 list-disc">
            {rest.map((r) => (
              <li key={r}>{t(reasonKey(r), { defaultValue: r })}</li>
            ))}
          </ul>
        </details>
      )}
      <CropZoom
        src={image?.url}
        box={field.box}
        imageWidth={image?.width}
        imageHeight={image?.height}
        height={44}
        label={t('ocr.confirm.zoomAlt', { field: label })}
      />
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={JSON.stringify(o.value)}
            type="button"
            className="rounded-full border border-amber-400 bg-white px-2.5 py-1 text-left text-xs hover:bg-amber-100"
            onClick={() => onApply(o.value)}
            data-testid="ocr-option"
          >
            <span className="font-medium">
              {options.length === 1
                ? t('ocr.confirm.confirmValue', { value: o.label })
                : o.label}
            </span>
            {o.note ? <span className="block text-[11px] text-muted-foreground">{o.note}</span> : null}
          </button>
        ))}
        <button
          type="button"
          className="rounded-full border px-2.5 py-1 text-xs"
          onClick={() => setManual((v) => !v)}
          data-testid="ocr-manual"
        >
          {t('ocr.confirm.manual')}
        </button>
      </div>
      {manual && (
        <div className="flex flex-wrap items-start gap-2">
          <Input
            className="h-8 w-32 font-mono text-sm"
            value={draft}
            placeholder={name === 'coords' ? 'x|y' : 'H:MM:SS'}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                submitManual()
              }
            }}
            data-testid="ocr-manual-input"
            aria-label={label}
          />
          <Button type="button" size="sm" onClick={submitManual}>
            {t('ocr.confirm.ok')}
          </Button>
          {name === 'coords' && (
            <CoordsCameraButton onPick={(x, y) => onApply({ x, y })} />
          )}
          {draftError && <span className="w-full text-xs text-destructive">{draftError}</span>}
        </div>
      )}
    </div>
  )
}

export function OcrMovementRow({ movement, index, images, onApply, onConfirmed }: Props) {
  const { t } = useTranslation()
  const meta = ocrMeta(movement)
  if (!meta) return null
  const f = meta.fields
  const pending = OCR_FIELD_ORDER.filter((n) => needsConfirm(f[n]))
  const lows = OCR_FIELD_ORDER.filter((n) => f[n]?.status === 'low')
  const missing = OCR_FIELD_ORDER.filter((n) => f[n]?.status === 'missing')
  const imageFor = (field?: OcrField) =>
    field?.image_index != null ? images[field.image_index] : images[meta.image_index]
  const coordsBox = f.coords?.box || meta.block_box

  return (
    <li
      className={`space-y-1.5 px-3 py-2 text-sm ${pending.length ? 'bg-amber-50' : ''}`}
      data-testid="ocr-movement"
    >
      <div className="flex justify-between gap-2">
        <div className="min-w-0">
          <div className="font-medium">
            {movementKindLabel(String(movement.kind || ''))}{' '}
            <span className="font-normal text-muted-foreground">
              {t('ocr.row.from')} {String(movement.role || '？？？')}{' '}
              {f.coords?.status === 'missing' ? (
                <span className="text-amber-700">？？？</span>
              ) : (
                <Highlight field={f.coords}>{formatFieldValue('coords', f.coords?.value)}</Highlight>
              )}
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            {t('ocr.row.arrival')}{' '}
            {f.arrival?.status === 'missing' ? (
              '—'
            ) : (
              <Highlight field={f.arrival}>{formatFieldValue('arrival', f.arrival?.value)}</Highlight>
            )}
            {' · '}
            {t('ocr.row.countdown')}{' '}
            {f.countdown?.status === 'missing' ? (
              '—'
            ) : (
              <Highlight field={f.countdown}>
                {formatFieldValue('countdown', f.countdown?.value)}
              </Highlight>
            )}
          </div>
        </div>
        {pending.length ? (
          <span className="h-fit shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900">
            {t('ocr.row.needsConfirm')}
          </span>
        ) : missing.length ? (
          <span className="h-fit shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800" data-testid="ocr-missing-badge">
            {t('ocr.row.missing')}
          </span>
        ) : (
          <span className="h-fit shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800">
            {t('ocr.row.ok')}
          </span>
        )}
      </div>
      {/* 攻擊方座標不論信心高低都附縮圖 */}
      {!lows.includes('coords') && (
        <CropZoom
          src={imageFor(f.coords)?.url}
          box={coordsBox}
          imageWidth={imageFor(f.coords)?.width}
          imageHeight={imageFor(f.coords)?.height}
          height={26}
          maxWidth={200}
          label={t('ocr.row.thumbAlt')}
          testId="ocr-thumb"
          tone="neutral"
        />
      )}
      {missing.map((n) => (
        <div key={n} className="text-xs text-amber-800" data-testid="ocr-missing-field" data-field={n}>
          {t('ocr.row.missingField', { field: t(`ocr.fields.${n}`) })} ·{' '}
          {t(reasonKey(f[n].reasons[0] || 'PARSE_ERROR'))}
        </div>
      ))}
      {lows.map((n) => (
        <FieldConfirm
          key={n}
          name={n}
          field={f[n]}
          image={imageFor(f[n])}
          onApply={(v) => onApply(index, n, v)}
          onConfirmed={(c) => onConfirmed(index, n, c)}
        />
      ))}
    </li>
  )
}
