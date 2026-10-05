/**
 * 擴充登入憑證（純函式，方便測試）。
 *
 * 憑證只會由工具網站透過 externally_connectable 交過來，格式：
 *   { access_token, expires_at (ISO 字串或毫秒), user?, accounts?, selected_account_id? }
 * accounts 是「存到哪個遊戲帳號」的選項（網站交過來；擴充 Token 只能上傳，
 * 不能自己去讀帳號列表）。selected_account_id 是網站目前選的帳號，popup 拿來
 * 當「存到」的預設值；popup 裡改選只影響那一次上傳，不會寫回這裡或網站。
 * 存在 chrome.storage.local 的 `credential` key。過期就視為登出，並在讀取時清掉。
 * popup 裡沒有任何輸入框，擴充自己不處理帳號密碼。
 */

export const CREDENTIAL_KEY = 'credential';
/** 舊版（popup 內輸入帳密）存的 key，讀取時順便清掉。 */
export const LEGACY_AUTH_KEY = 'auth';
/** 網站交過來的憑證最長可以活多久（防止被塞入超長效 token）。 */
export const MAX_LIFETIME_MS = 24 * 60 * 60 * 1000;
/** 判斷過期時預留的緩衝，避免送出去途中剛好過期。 */
export const EXPIRY_SKEW_MS = 30 * 1000;

/** 最多帶幾個遊戲帳號選項 */
export const MAX_ACCOUNTS = 50;

function normalizeAccounts(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((a) => a && typeof a.account_id === 'string' && a.account_id)
    .slice(0, MAX_ACCOUNTS)
    .map((a) => ({
      account_id: a.account_id.slice(0, 64),
      label: String(a.label ?? a.account_id).slice(0, 80),
    }));
}

export const SITE_MESSAGE = Object.freeze({
  SET: 'set_extension_token',
  CLEAR: 'clear_extension_token',
  PING: 'ping',
});

function toMillis(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value) {
    const ms = Date.parse(value);
    return Number.isNaN(ms) ? null : ms;
  }
  return null;
}

/**
 * 把網站傳來的資料整理成可儲存的憑證；格式不對或已過期回傳 null。
 */
export function normalizeCredential(input, now = Date.now()) {
  if (!input || typeof input !== 'object') return null;
  const token = input.access_token ?? input.token;
  if (typeof token !== 'string' || token.length < 10) return null;
  const expiresAt = toMillis(input.expires_at);
  if (expiresAt === null) return null;
  if (expiresAt - EXPIRY_SKEW_MS <= now) return null;
  if (expiresAt - now > MAX_LIFETIME_MS) return null;
  const user = input.user && typeof input.user === 'object'
    ? {
        username: typeof input.user.username === 'string' ? input.user.username : '',
        email: typeof input.user.email === 'string' ? input.user.email : '',
      }
    : null;
  const accounts = normalizeAccounts(input.accounts);
  const selected = input.selected_account_id;
  return {
    access_token: token,
    expires_at: expiresAt,
    user,
    accounts,
    // 只接受清單裡有的帳號
    selected_account_id: accounts.some((a) => a.account_id === selected) ? selected : null,
  };
}

export function isExpired(credential, now = Date.now()) {
  if (!credential || typeof credential.access_token !== 'string') return true;
  const expiresAt = toMillis(credential.expires_at);
  return expiresAt === null || expiresAt - EXPIRY_SKEW_MS <= now;
}

/**
 * 讀取憑證：沒有或已過期都回傳 null；過期的會順便從 storage 刪掉。
 * @param {{get: Function, remove: Function}} storage chrome.storage.local 相容物件
 */
export async function loadCredential(storage, now = Date.now()) {
  const stored = await storage.get([CREDENTIAL_KEY, LEGACY_AUTH_KEY]);
  if (stored[LEGACY_AUTH_KEY] !== undefined) {
    await storage.remove(LEGACY_AUTH_KEY);
  }
  const credential = stored[CREDENTIAL_KEY];
  if (!credential) return null;
  if (isExpired(credential, now)) {
    await storage.remove(CREDENTIAL_KEY);
    return null;
  }
  return credential;
}

/** 儲存網站交來的憑證；不合法時不存並回傳 null。 */
export async function saveCredential(storage, input, now = Date.now()) {
  const credential = normalizeCredential(input, now);
  if (!credential) return null;
  await storage.set({ [CREDENTIAL_KEY]: credential });
  return credential;
}

/** 登出：清掉憑證（包含舊版 key）。 */
export async function clearCredential(storage) {
  await storage.remove([CREDENTIAL_KEY, LEGACY_AUTH_KEY]);
}

/** sender 是否來自允許的工具網站。 */
export function isTrustedSender(sender, trustedOrigins) {
  if (!sender) return false;
  let origin = typeof sender.origin === 'string' ? sender.origin : null;
  if (!origin && typeof sender.url === 'string') {
    try {
      origin = new URL(sender.url).origin;
    } catch {
      return false;
    }
  }
  return Boolean(origin) && trustedOrigins.includes(origin);
}

/** popup 顯示用：剩下多久到期。 */
export function describeExpiry(credential, now = Date.now()) {
  const expiresAt = toMillis(credential?.expires_at);
  if (expiresAt === null) return '';
  const minutes = Math.max(0, Math.round((expiresAt - now) / 60000));
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest ? `${hours} 小時 ${rest} 分後到期` : `${hours} 小時後到期`;
  }
  return `${minutes} 分後到期`;
}
