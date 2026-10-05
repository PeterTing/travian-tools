import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { useCurrentAccount } from '@/contexts/CurrentAccountContext'
import { accountPlayerLabel, accountWorldLabel, updatedAgo } from '@/lib/accountDisplay'
import type { GameAccount } from '@/types/game'

const chipBase =
  'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs whitespace-nowrap bg-background hover:bg-muted'

/** 頂部的「▾ 暱稱」「▾ 世界」兩顆按鈕，點任一個打開「切換帳號和世界」 */
export default function AccountWorldSwitcher() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { accounts, currentAccount, selectAccount } = useCurrentAccount()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const goAdd = () => {
    setOpen(false)
    navigate(ROUTES.GAME_ACCOUNTS_NEW)
  }

  if (!currentAccount) {
    return (
      <button type="button" className={chipBase} onClick={goAdd} data-testid="switcher-add-first">
        {t('accountSwitcher.noAccount')}
      </button>
    )
  }

  const unnamed = t('accountSwitcher.unnamedPlayer')
  const player = accountPlayerLabel(currentAccount, unnamed)
  const world = accountWorldLabel(currentAccount)

  const detail = (account: GameAccount) => {
    const parts: string[] = []
    if (account.tribe) parts.push(t(`tribes.${account.tribe}`))
    parts.push(t('accountSwitcher.villageCount', { count: account.village_count ?? 0 }))
    const ago = updatedAgo(account.last_updated)
    parts.push('count' in ago ? t(`accountSwitcher.${ago.key}`, { count: ago.count }) : t(`accountSwitcher.${ago.key}`))
    return parts.join(' · ')
  }

  return (
    <>
      <div className="flex items-center gap-1">
        <button
          type="button"
          className={`${chipBase} border-orange-500 text-orange-600 bg-orange-50`}
          aria-label={t('accountSwitcher.accountChip', { name: player })}
          aria-haspopup="dialog"
          onClick={() => setOpen(true)}
        >
          ▾ {player}
        </button>
        <button
          type="button"
          className={chipBase}
          aria-label={t('accountSwitcher.worldChip', { name: world })}
          aria-haspopup="dialog"
          onClick={() => setOpen(true)}
        >
          ▾ {world}
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-[60]">
          <div
            className="absolute inset-0 bg-black/30"
            data-testid="switcher-backdrop"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="account-switcher-title"
            className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-background p-4 pb-5 shadow-[0_-6px_20px_rgba(0,0,0,0.12)] md:inset-x-auto md:left-1/2 md:bottom-auto md:top-24 md:w-[420px] md:-translate-x-1/2 md:rounded-2xl"
          >
            <div className="flex items-start justify-between">
              <h2 id="account-switcher-title" className="text-[15px] font-bold">
                {t('accountSwitcher.title')}
              </h2>
              <button
                type="button"
                className="text-muted-foreground px-1"
                aria-label={t('accountSwitcher.close')}
                onClick={() => setOpen(false)}
              >
                ×
              </button>
            </div>
            <p className="text-xs text-muted-foreground mb-2">{t('accountSwitcher.separateNote')}</p>
            <ul className="divide-y rounded-lg border">
              {accounts.map((account) => {
                const isCurrent = account.account_id === currentAccount.account_id
                return (
                  <li key={account.account_id}>
                    <button
                      type="button"
                      className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${
                        isCurrent ? 'bg-orange-50' : 'hover:bg-muted'
                      }`}
                      aria-current={isCurrent ? 'true' : undefined}
                      onClick={() => {
                        selectAccount(account.account_id)
                        setOpen(false)
                      }}
                    >
                      <span>
                        <b>{accountPlayerLabel(account, unnamed)}</b> · {accountWorldLabel(account)}
                        <br />
                        <span className="text-xs text-muted-foreground">{detail(account)}</span>
                      </span>
                      {isCurrent && (
                        <span className="text-orange-600" aria-label={t('accountSwitcher.current')}>
                          ✓
                        </span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
            <button
              type="button"
              className="mt-2 w-full rounded-lg border py-2 text-sm hover:bg-muted"
              onClick={goAdd}
            >
              {t('accountSwitcher.addAccountOrWorld')}
            </button>
            <p className="mt-1.5 text-xs text-muted-foreground">{t('accountSwitcher.noPasswordNote')}</p>
          </div>
        </div>
      )}
    </>
  )
}
