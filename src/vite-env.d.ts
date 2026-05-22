/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string | undefined
  readonly VITE_APP_NAME: string | undefined
  readonly VITE_AUTH_STORAGE_KEY: string | undefined
  readonly VITE_CART_STORAGE_KEY: string | undefined
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
