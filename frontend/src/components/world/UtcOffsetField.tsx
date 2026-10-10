import { useEffect, useId, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Label } from '@/components/ui/label'
import { formatUtcOffset, UTC_OFFSET_CHOICES } from '@/lib/worldUrl'

export interface UtcOffsetFieldProps {
  /** Saved/known offset in minutes; null = unset */
  value: number | null
  /** Controlled draft as string minutes ('' = unset) */
  draft: string
  onDraftChange: (draft: string) => void
  /** Optional id for the <select>; auto-generated if omitted */
  id?: string
  /** data-testid prefix, e.g. "utc-offset" or "confirm-utc" */
  testIdPrefix?: string
  /**
   * When true, always show the editor (used while parent forces expand).
   * When false/undefined, collapse automatically if value is set.
   */
  editing?: boolean
  onEditingChange?: (editing: boolean) => void
  /** Extra controls under the editor (e.g. WorldSettings save button) */
  footer?: ReactNode
  className?: string
}

/**
 * Shared UTC offset control: collapsed one-liner when set,
 * 「伺服器時差 UTC+1 · 更改」; expands to the select editor.
 * Unset (null) always shows the editor.
 */
export function UtcOffsetField({
  value,
  draft,
  onDraftChange,
  id,
  testIdPrefix = 'utc-offset',
  editing: editingProp,
  onEditingChange,
  footer,
  className,
}: UtcOffsetFieldProps) {
  const { t } = useTranslation()
  const autoId = useId()
  const selectId = id ?? autoId
  const isSet = value != null
  const [internalEditing, setInternalEditing] = useState(!isSet)
  const editing = editingProp ?? internalEditing

  const setEditing = (next: boolean) => {
    onEditingChange?.(next)
    if (editingProp === undefined) setInternalEditing(next)
  }

  useEffect(() => {
    if (editingProp !== undefined) return
    setInternalEditing(!isSet)
  }, [isSet, editingProp])

  if (isSet && !editing) {
    return (
      <div
        className={`flex flex-wrap items-center gap-2 text-sm ${className ?? ''}`}
        data-testid={`${testIdPrefix}-summary`}
      >
        <span>
          {t('worldSettings.summary', { offset: formatUtcOffset(value) })}
        </span>
        <span className="text-muted-foreground">·</span>
        <button
          type="button"
          className="underline text-sm"
          data-testid={`${testIdPrefix}-change`}
          onClick={() => setEditing(true)}
        >
          {t('worldSettings.change')}
        </button>
      </div>
    )
  }

  return (
    <div className={`space-y-2 ${className ?? ''}`} data-testid={`${testIdPrefix}-editor`}>
      <div className="space-y-1">
        <Label htmlFor={selectId}>{t('worldSettings.utcOffset')}</Label>
        <select
          id={selectId}
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base"
          data-testid={`${testIdPrefix}-select`}
        >
          <option value="">{t('worldSettings.unset')}</option>
          {UTC_OFFSET_CHOICES.map((minutes) => (
            <option key={minutes} value={String(minutes)}>
              {formatUtcOffset(minutes)}
            </option>
          ))}
        </select>
      </div>
      {footer}
    </div>
  )
}

