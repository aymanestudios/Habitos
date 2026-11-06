// Lee las variables de entorno (archivo .env.local) en un único sitio.
// Así el resto del código no toca import.meta.env directamente.

export const env = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL ?? '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
}

// true solo si el archivo .env.local existe y tiene una URL y una clave
export const isSupabaseConfigured =
  env.supabaseUrl.startsWith('http') && env.supabaseAnonKey.length > 0
