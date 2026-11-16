// Edge Function "send-reminders": envía los avisos push de los recordatorios que ya tocan.
// La llama pg_cron cada minuto (ver 0009_push.sql). Nadie más puede usarla: exige el secreto del cron.
//
// Claves VAPID: la primera vez las genera ella misma y las guarda cifradas en Vault (0010_vapid_vault.sql).
// Nadie las copia a mano. SUPABASE_URL y la clave de servicio las pone Supabase solo.

import webpush from 'npm:web-push@3.6.7'
import { createClient } from 'npm:@supabase/supabase-js@2'

const SUBJECT = 'https://habitosandatomicos.onrender.com'

type Due = { reminder_id: string; title: string; note: string | null; endpoint: string; p256dh: string; auth: string }

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

// Clave de servicio: la clásica, o la primera de las nuevas "secret keys" si el proyecto ya las usa.
function serviceKey(): string {
  const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (legacy) return legacy
  try {
    const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}') as Record<string, string>
    return Object.values(keys)[0] ?? ''
  } catch {
    return ''
  }
}

type Keys = { public_key: string; private_key: string }

// deno-lint-ignore no-explicit-any
async function readKeys(supabase: any): Promise<Keys | null> {
  const { data } = await supabase.rpc('get_vapid_keys')
  const row = (Array.isArray(data) ? data[0] : data) as Keys | undefined
  return row?.public_key && row?.private_key ? row : null
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey(), {
    auth: { persistSession: false },
  })

  // 1. ¿Es el cron de verdad?
  const { data: allowed } = await supabase.rpc('verify_push_cron', {
    p_secret: req.headers.get('x-cron-secret') ?? '',
  })
  if (allowed !== true) return json({ error: 'unauthorized' }, 401)

  // 2. Claves VAPID desde Vault; si aún no existen, se generan y se guardan (solo la primera vez).
  let keys = await readKeys(supabase)
  if (!keys) {
    const fresh = webpush.generateVAPIDKeys()
    await supabase.rpc('store_vapid_keys', { p_public: fresh.publicKey, p_private: fresh.privateKey })
    keys = await readKeys(supabase) // se relee: si otra ejecución ganó, se usan las suyas
  }
  if (!keys) return json({ error: 'missing_vapid_keys' }, 500)
  webpush.setVapidDetails(SUBJECT, keys.public_key, keys.private_key)

  // 3. Recordatorios que tocan (se marcan como avisados en el mismo paso).
  const { data, error } = await supabase.rpc('claim_due_reminders')
  if (error) return json({ error: error.message }, 500)
  const due = (data ?? []) as Due[]

  let sent = 0
  let failed = 0
  await Promise.all(
    due.map(async (row) => {
      const payload = JSON.stringify({
        title: row.title,
        body: row.note ?? 'Es la hora de tu recordatorio.',
        url: '/recordatorios',
        tag: row.reminder_id,
      })
      try {
        await webpush.sendNotification(
          { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
          payload,
          { TTL: 60 * 60 },
        )
        sent += 1
      } catch (caught) {
        failed += 1
        const status = (caught as { statusCode?: number }).statusCode
        // 404/410: el dispositivo ya no existe (desinstalada o avisos quitados). Se borra.
        if (status === 404 || status === 410) await supabase.rpc('forget_push_endpoint', { p_endpoint: row.endpoint })
      }
    }),
  )

  return json({ due: due.length, sent, failed })
})
