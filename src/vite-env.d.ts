/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BUILD_DATE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
