/**
 * 把登入憑證交給「Travian Tools Helper」瀏覽器擴充。
 *
 * 擴充的 popup 不收帳號密碼；使用者在這個網站登入後，網站向後端換一個
 * 有到期時間的擴充專用 token，透過 externally_connectable 交給擴充。
 * 網站登出時也通知擴充一起清掉。
 *
 * 擴充 Token 只能上傳（後端 scope=extension_upload），不能自己讀帳號列表，
 * 所以「存到哪個遊戲帳號」的選項也由網站一起交過去。
 *
 * 擴充 ID 由 VITE_EXTENSION_ID 設定（預設是 manifest key 固定的 ID，可用逗號
 * 分隔多個）；設成空字串就什麼都不做。
 */
import api from './api'
import { resolveSelectedAccountId } from './currentAccountStore'
import type { GameAccountListResponse, UserResponse } from '@/types/game'

export interface ExtensionTokenResponse {
  access_token: string
  token_type: string
  expires_at: string
  expires_in: number
  user: UserResponse
}

interface ExtensionResponse {
  success?: boolean
  error?: string
}

interface ChromeRuntimeLike {
  sendMessage: (
    extensionId: string,
    message: unknown,
    callback: (response?: ExtensionResponse) => void
  ) => void
  lastError?: { message?: string }
}

export const EXTENSION_MESSAGE = {
  PING: 'ping',
  SET: 'set_extension_token',
  CLEAR: 'clear_extension_token',
} as const

export function getExtensionIds(raw: string | undefined = import.meta.env.VITE_EXTENSION_ID): string[] {
  return (raw ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter((id) => /^[a-p]{32}$/.test(id))
}

function getRuntime(): ChromeRuntimeLike | null {
  const runtime = (globalThis as { chrome?: { runtime?: ChromeRuntimeLike } }).chrome?.runtime
  return runtime && typeof runtime.sendMessage === 'function' ? runtime : null
}

function send(runtime: ChromeRuntimeLike, extensionId: string, message: unknown): Promise<ExtensionResponse | null> {
  return new Promise((resolve) => {
    try {
      runtime.sendMessage(extensionId, message, (response) => {
        // 沒安裝擴充時 lastError 會有值；讀一次避免 console 警告
        if (runtime.lastError) {
          resolve(null)
          return
        }
        resolve(response ?? null)
      })
    } catch {
      resolve(null)
    }
  })
}

async function installedExtensions(runtime: ChromeRuntimeLike, ids: string[]): Promise<string[]> {
  const pings = await Promise.all(
    ids.map(async (id) => ((await send(runtime, id, { type: EXTENSION_MESSAGE.PING }))?.success ? id : null))
  )
  return pings.filter((id): id is string => id !== null)
}

export interface ExtensionAccountChoice {
  account_id: string
  label: string
}

/** 給擴充「存到」下拉選單用的遊戲帳號（只帶 ID 與顯示名稱） */
export async function loadAccountChoices(): Promise<ExtensionAccountChoice[]> {
  try {
    const { data } = await api.get<GameAccountListResponse>('/game-accounts')
    return (data.accounts ?? []).map((a) => ({
      account_id: a.account_id,
      label: `${a.player_name || '未命名'} · ${a.server_name || a.server_url}`,
    }))
  } catch {
    return []
  }
}

/**
 * 登入後呼叫：有裝擴充才向後端換發 token，再交給擴充。失敗不影響網站登入。
 * @returns 成功交出去的擴充數量
 */
export async function shareLoginWithExtension(): Promise<number> {
  const runtime = getRuntime()
  const ids = getExtensionIds()
  if (!runtime || ids.length === 0) return 0
  try {
    const targets = await installedExtensions(runtime, ids)
    if (targets.length === 0) return 0
    const [{ data }, accounts] = await Promise.all([
      api.post<ExtensionTokenResponse>('/auth/extension-token'),
      loadAccountChoices(),
    ])
    // 「存到」預設選網站目前選的帳號；擴充那邊改選不會寫回網站
    const selected_account_id = resolveSelectedAccountId(
      data.user.user_id,
      accounts.map((a) => a.account_id)
    )
    const results = await Promise.all(
      targets.map((id) =>
        send(runtime, id, {
          type: EXTENSION_MESSAGE.SET,
          access_token: data.access_token,
          expires_at: data.expires_at,
          user: { username: data.user.username, email: data.user.email },
          accounts,
          selected_account_id,
        })
      )
    )
    return results.filter((r) => r?.success).length
  } catch {
    return 0
  }
}

/**
 * 網站新增、修改或刪除遊戲帳號後呼叫：重新把「存到」的帳號清單交給擴充。
 * 擴充只收完整憑證，所以這裡會一併換發新的擴充 Token（舊的到期就失效）。
 * 沒裝擴充或沒設 ID 時什麼都不做；失敗不影響帳號操作。
 */
export function resendAccountsToExtension(): Promise<number> {
  return shareLoginWithExtension()
}

/** 網站登出時呼叫：請擴充清掉憑證。 */
export async function clearExtensionLogin(): Promise<void> {
  const runtime = getRuntime()
  const ids = getExtensionIds()
  if (!runtime || ids.length === 0) return
  await Promise.all(ids.map((id) => send(runtime, id, { type: EXTENSION_MESSAGE.CLEAR })))
}
