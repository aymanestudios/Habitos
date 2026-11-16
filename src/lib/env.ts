// Lee las variables de entorno (archivo .env.local) en un único sitio.
// Así el resto del código no toca import.meta.env directamente.

export const env = {
  supabaseUrl: (import.meta.env.VITE_SUPABASE_URL ?? '').trim(),
  supabaseAnonKey: (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim(),
}

// Los valores de ejemplo de .env.example no cuentan como configurados.
const isExampleValue =
  env.supabaseUrl.includes('TU-PROYECTO') || env.supabaseAnonKey === 'tu-clave-publica'

// true solo si .env.local existe y tiene una URL y una clave reales
export const isSupabaseConfigured =
  env.supabaseUrl.startsWith('http') && env.supabaseAnonKey.length > 0 && !isExampleValue
