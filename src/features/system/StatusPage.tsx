import { useQuery } from '@tanstack/react-query'
import { Card } from '@/components/Card'
import { PageHeader } from '@/components/PageHeader'
import { env, isSupabaseConfigured } from '@/lib/env'
import { getUserTimezone, localDateString } from '@/lib/dates'
import { supabase } from '@/lib/supabase'

// Página de diagnóstico (/estado): sirve para comprobar que todo está bien conectado.

type State = 'ok' | 'error' | 'loading' | 'skipped'

const badge: Record<State, string> = {
  ok: 'bg-good-soft text-good',
  error: 'bg-danger-soft text-danger',
  loading: 'bg-surface-2 text-muted',
  skipped: 'bg-surface-2 text-muted',
}

const badgeText: Record<State, string> = {
  ok: 'OK',
  error: 'Error',
  loading: '...',
  skipped: 'Pendiente',
}

function StatusRow({ label, detail, state }: { label: string; detail: string; state: State }) {
  return (
    <li className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="font-semibold">{label}</p>
        <p className="break-words text-sm text-muted">{detail}</p>
      </div>
      <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${badge[state]}`}>
        {badgeText[state]}
      </span>
    </li>
  )
}

// Comprueba que el cliente de Supabase funciona y que el servidor responde.
async function checkSupabase() {
  const { error } = await supabase.auth.getSession()
  if (error) throw error

  const response = await fetch(`${env.supabaseUrl}/auth/v1/health`, {
    headers: { apikey: env.supabaseAnonKey },
  })
  if (!response.ok) throw new Error(`Supabase respondió con el código ${response.status}`)
}

export function StatusPage() {
  const timeZone = getUserTimezone()
  const today = localDateString(new Date(), timeZone)

  const supabaseCheck = useQuery({
    queryKey: ['supabase-health'],
    queryFn: checkSupabase,
    enabled: isSupabaseConfigured,
    retry: false,
  })

  let supabaseState: State = 'skipped'
  let supabaseDetail = 'Crea el archivo .env.local (mira el README) y reinicia el servidor.'
  if (isSupabaseConfigured) {
    if (supabaseCheck.isPending) {
      supabaseState = 'loading'
      supabaseDetail = 'Comprobando...'
    } else if (supabaseCheck.isError) {
      supabaseState = 'error'
      supabaseDetail = `${supabaseCheck.error.message}. Revisa la URL y la clave de .env.local.`
    } else {
      supabaseState = 'ok'
      supabaseDetail = 'El servidor de Supabase responde correctamente.'
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Estado del proyecto" subtitle="Diagnóstico de la Fase 0" />
      <Card>
        <ul className="divide-y divide-line">
          <StatusRow label="Aplicación React" detail="La web se ha cargado correctamente." state="ok" />
          <StatusRow
            label="Variables de entorno"
            detail={
              isSupabaseConfigured
                ? 'VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY encontradas.'
                : 'Faltan VITE_SUPABASE_URL y/o VITE_SUPABASE_ANON_KEY, o siguen con los valores de ejemplo.'
            }
            state={isSupabaseConfigured ? 'ok' : 'skipped'}
          />
          <StatusRow label="Conexión con Supabase" detail={supabaseDetail} state={supabaseState} />
          <StatusRow
            label="Zona horaria detectada"
            detail={`${timeZone} · hoy es ${today}`}
            state="ok"
          />
        </ul>
      </Card>
    </div>
  )
}
