import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ExternalLink as ExternalIcon } from 'lucide-react'
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
import { EXTERNAL_LINKS, type ExternalLink } from './externalLinks'

/** 外部連結清單：每列一個連結，點了先問「即將離開 Travian Tools」，確定才開新分頁 */
export default function ExternalLinkList({ links = EXTERNAL_LINKS }: { links?: ExternalLink[] }) {
  const { t } = useTranslation()
  const [pending, setPending] = useState<ExternalLink | null>(null)

  const go = () => {
    if (pending) window.open(pending.url, '_blank', 'noopener,noreferrer')
    setPending(null)
  }

  return (
    <>
      <ul className="divide-y overflow-hidden rounded-lg border bg-background" data-testid="external-links">
        {links.map((link) => (
          <li key={link.id}>
            <button
              type="button"
              onClick={() => setPending(link)}
              className="flex min-h-[44px] w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
              data-testid={`external-${link.id}`}
            >
              <span className="min-w-0">
                <span className="break-words">{t(link.labelKey)}</span>
                <span className="ml-2 text-xs text-muted-foreground">{link.site}</span>
                {link.noteKey && <span className="block text-xs text-muted-foreground">{t(link.noteKey)}</span>}
              </span>
              <ExternalIcon className="h-4 w-4 shrink-0 text-muted-foreground" aria-label={t('external.opensNewTab')} />
            </button>
          </li>
        ))}
      </ul>
      <AlertDialog open={pending != null} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent data-testid="leave-site-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('external.leaveTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('external.leaveBody', { site: pending?.site ?? '' })}
              <span className="mt-2 block break-all text-xs">{pending?.url}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={go} data-testid="leave-site-go">
              {t('external.leaveGo')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
