import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { errorMessage } from '@/features/habits/habitRules'
import { base64UrlToBytes, friendlyPushError, isIosDevice, pushStatus } from './pushRules'
import type { PushStatus } from './pushRules'

function supported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

function standalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

async function currentSubscription(): Promise<PushSubscription | null> {
  if (!supported()) return null
  const registration = await navigator.serviceWorker.getRegistration()
  return registration ? registration.pushManager.getSubscription() : null
}

// Clave pública de los avisos: la genera y guarda Supabase (0010_vapid_vault.sql). null = aún no existe.
async function fetchPublicKey(): Promise<string | null> {
  const { data, error } = await supabase.rpc('get_vapid_public_key')
  if (error || typeof data !== 'string' || data.length === 0) return null
  return data
}

async function saveSubscription(subscription: PushSubscription) {
  const data = subscription.toJSON()
  const { error } = await supabase.rpc('save_push_subscription', {
    p_endpoint: data.endpoint ?? subscription.endpoint,
    p_p256dh: data.keys?.p256dh ?? '',
    p_auth: data.keys?.auth ?? '',
  })
  if (error) throw error
}

// Estado y acciones de los avisos push en ESTE dispositivo.
export function usePush() {
  const [status, setStatus] = useState<PushStatus | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [publicKey, setPublicKey] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const subscription = await currentSubscription().catch(() => null)
    const key = await fetchPublicKey()
    setPublicKey(key)
    setStatus(
      pushStatus({
        supported: supported(),
        ios: isIosDevice(navigator.userAgent, navigator.maxTouchPoints ?? 0),
        standalone: standalone(),
        configured: key !== null,
        production: import.meta.env.PROD,
        permission: 'Notification' in window ? Notification.permission : 'default',
        subscribed: subscription !== null,
      }),
    )
    // Si ya estaba activado, lo volvemos a guardar por si cambiaste de cuenta en este dispositivo
    if (subscription && 'Notification' in window && Notification.permission === 'granted') {
      saveSubscription(subscription).catch(() => {})
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function enable() {
    setBusy(true)
    setError(null)
    try {
      if (!publicKey) throw new Error('not_configured')
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        await refresh()
        return
      }
      const registration = await navigator.serviceWorker.ready
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: base64UrlToBytes(publicKey),
        }))
      await saveSubscription(subscription)
      await refresh()
    } catch (caught) {
      setError(friendlyPushError(errorMessage(caught)))
    } finally {
      setBusy(false)
    }
  }

  async function disable() {
    setBusy(true)
    setError(null)
    try {
      const subscription = await currentSubscription()
      if (subscription) {
        await supabase.rpc('delete_push_subscription', { p_endpoint: subscription.endpoint })
        await subscription.unsubscribe()
      }
      await refresh()
    } catch (caught) {
      setError(friendlyPushError(errorMessage(caught)))
    } finally {
      setBusy(false)
    }
  }

  // Aviso de prueba local: comprueba que el dispositivo muestra avisos (no pasa por el servidor)
  async function test() {
    const registration = await navigator.serviceWorker.ready
    await registration.showNotification('Progress&Go', {
      body: '¡Así te llegarán los recordatorios!',
      icon: '/icon-192.png',
      data: { url: '/recordatorios' },
    })
  }

  return { status, busy, error, enable, disable, test }
}
