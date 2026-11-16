# Avisos al móvil (notificaciones push)

## Cómo funciona
1. En **Recordatorios → Activar avisos**, el dispositivo se apunta (tabla `push_subscriptions`).
2. Cada minuto, **pg_cron** (en Supabase) llama a la Edge Function **send-reminders**.
3. La función busca los recordatorios que ya tocan y manda un aviso a cada dispositivo.
Render no interviene: solo sirve la web.

## Claves VAPID (automáticas)
Sirven para firmar los avisos. **No hay que hacer nada**: la primera vez que se ejecuta,
la Edge Function las genera y las guarda cifradas en **Vault** de Supabase (`0010_vapid_vault.sql`).
- La app pide la clave **pública** a Supabase (`get_vapid_public_key`).
- La **privada** solo la puede leer la Edge Function. No está en Render, ni en `.env.local`, ni en GitHub.
- No borres los secretos `vapid_*` de Vault: si cambian, cada dispositivo tendría que volver a activar los avisos.

## iPhone
Solo funciona con la app instalada: Safari → Compartir → "Añadir a pantalla de inicio",
abrirla desde el icono y activar los avisos dentro (iOS 16.4 o superior).

## Comprobar
- "Probar aviso" en Recordatorios muestra un aviso local (comprueba el permiso).
- Para el envío real: crea un recordatorio para dentro de 2 minutos y cierra la app.
- Errores del envío: Supabase → SQL → `select status_code, content from net._http_response order by created desc limit 5;`
  Lo normal es `200` con `{"due":0,...}`.

## Límites
- Avisa una vez por cada hora programada (si lo pospones, vuelve a avisar).
- No avisa de recordatorios con más de 24 h de retraso.
- En `npm run dev` no funciona (el service worker solo se activa en la web publicada).
