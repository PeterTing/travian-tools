/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  /** 瀏覽器擴充 ID（逗號分隔），用來把登入憑證交給擴充；沒設定就不交。 */
  readonly VITE_EXTENSION_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
