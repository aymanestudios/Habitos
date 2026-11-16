# Avisos al móvil (notificaciones push)

## Cómo funciona
1. En **Recordatorios → Activar avisos**, el dispositivo se apunta (tabla `push_subscriptions`).
2. Cada minuto, **pg_cron** (en Supabase) llama a la Edge Function **send-reminders**.
3. La función busca los recordatorios que ya tocan y manda un aviso a cada dispositivo.
Render no interviene: solo sirve la web.

## Claves VAPID (una sola vez)
Sirven para firmar los avisos. La **pública** puede ir en la app; la **privada** solo en Supabase.

1. Genera las dos claves en tu ordenador:
   `npx web-push generate-vapid-keys`
2. Supabase → Edge Functions → **Secrets** → añade:
   - `VAPID_PUBLIC_KEY` = la pública
   - `VAPID_PRIVATE_KEY` = la privada
3. En `.env.local` añade `VITE_VAPID_PUBLIC_KEY=` con la **pública**.
4. En Render → tu web → **Environment** → añade `VITE_VAPID_PUBLIC_KEY` con la **pública** y vuelve a desplegar.

La privada nunca va en `.env.local`, en Render ni en GitHub.

## iPhone
Solo funciona con la app instalada: Safari → Compartir → "Añadir a pantalla de inicio",
abrirla desde el icono y activar los avisos dentro (iOS 16.4 o superior).

## Comprobar
- "Probar aviso" en Recordatorios muestra un aviso local (comprueba el permiso).
- Para el envío real: crea un recordatorio para dentro de 2 minutos y cierra la app.
- Errores del envío: Supabase → SQL → `select status_code, content from net._http_response order by created desc limit 5;`
  `missing_vapid_keys` = faltan los secretos del paso 2.

## Límites
- Avisa una vez por cada hora programada (si lo pospones, vuelve a avisar).
- No avisa de recordatorios con más de 24 h de retraso.
- En `npm run dev` no funciona (el service worker solo se activa en la web publicada).
