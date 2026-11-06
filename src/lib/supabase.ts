import { createClient } from '@supabase/supabase-js'
import { env, isSupabaseConfigured } from './env'

// Cliente de Supabase: el "mando" desde el que la app habla con la base de datos y el login.
// Si todavía no has creado .env.local, usamos valores falsos para que la app no se rompa
// y la página /estado te explique qué falta.
export const supabase = createClient(
  isSupabaseConfigured ? env.supabaseUrl : 'http://localhost:54321',
  isSupabaseConfigured ? env.supabaseAnonKey : 'sin-configurar',
  {
    auth: {
      persistSession: true, // recuerda la sesión al cerrar y abrir la app
      autoRefreshToken: true,
    },
  },
)
