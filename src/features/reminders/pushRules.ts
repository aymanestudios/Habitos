// Reglas puras de los avisos al móvil (sin React ni Supabase).

export type PushStatus =
  | 'unsupported' // este navegador no tiene avisos push
  | 'ios-install' // iPhone/iPad: hay que añadir la app a la pantalla de inicio primero
  | 'not-configured' // falta VITE_VAPID_PUBLIC_KEY
  | 'dev' // npm run dev: el service worker no está activo
  | 'denied' // el usuario bloqueó los avisos
  | 'off'
  | 'on'

export type PushEnv = {
  supported: boolean
  ios: boolean
  standalone: boolean
  configured: boolean
  production: boolean
  permission: 'default' | 'granted' | 'denied'
  subscribed: boolean
}

export function pushStatus(env: PushEnv): PushStatus {
  if (env.ios && !env.standalone) return 'ios-install' // en Safari normal iOS no deja: antes de "unsupported"
  if (!env.supported) return 'unsupported'
  if (!env.configured) return 'not-configured'
  if (!env.production) return 'dev'
  if (env.permission === 'denied') return 'denied'
  return env.subscribed && env.permission === 'granted' ? 'on' : 'off'
}

export function isIosDevice(userAgent: string, maxTouchPoints: number): boolean {
  // Los iPad recientes dicen ser "Macintosh": se distinguen porque tienen pantalla táctil
  return /iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1)
}

export const STATUS_TEXT: Record<PushStatus, string> = {
  unsupported: 'Este navegador no permite avisos. Prueba con Chrome, Edge, Firefox o la app instalada.',
  'ios-install':
    'En iPhone, primero añade la app a tu pantalla de inicio: botón Compartir → "Añadir a pantalla de inicio". Luego ábrela desde el icono y activa los avisos aquí.',
  'not-configured': 'Los avisos aún no están configurados en esta versión de la app (falta la clave pública).',
  dev: 'En modo desarrollo (npm run dev) los avisos no funcionan. Pruébalos en la web publicada.',
  denied:
    'Bloqueaste los avisos para esta web. Actívalos en los ajustes del navegador (o del iPhone: Ajustes → Notificaciones → Progress&Go).',
  off: 'Recibe un aviso en este dispositivo cuando llegue la hora de un recordatorio, aunque la app esté cerrada.',
  on: 'Activados en este dispositivo. Te avisaremos a la hora de cada recordatorio.',
}

/** Convierte la clave VAPID (base64 "url-safe") en los bytes que pide el navegador. */
export function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const padded = (value + '='.repeat((4 - (value.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(padded)
  const bytes = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i)
  return bytes
}

export function friendlyPushError(message: string): string {
  if (message.includes('denied') || message.includes('NotAllowed')) return 'No diste permiso para los avisos.'
  if (message.includes('not_authenticated')) return 'Vuelve a iniciar sesión.'
  return 'No se pudieron activar los avisos. Inténtalo otra vez.'
}
