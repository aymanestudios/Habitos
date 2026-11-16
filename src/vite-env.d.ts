/// <reference types="vite/client" />

// Le decimos a TypeScript qué variables de entorno existen (las del archivo .env.local)
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_VAPID_PUBLIC_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
