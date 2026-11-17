# Lista de comprobación: beta privada (5-8 personas)

Marca cada punto antes de invitar a nadie. Lo que está ✅ se comprobó el 18/11/2026.

## 1. Código
- [ ] `npm ci` funciona (necesita `package-lock.json` subido: `git ls-files package-lock.json` debe mostrarlo).
- [ ] `npm run typecheck` y `npm run build` terminan sin errores.
- [ ] `npm audit`: revisar las vulnerabilidades altas (si son de herramientas de desarrollo como Vite, no llegan a la web publicada).

## 2. Base de datos (Supabase → SQL Editor)
- [ ] Aplicar `0025_beta_hardening.sql` (hacer antes una copia: `docs/COPIAS-SEGURIDAD.md`).
- ✅ Modo prueba de tickets apagado (`app_flags.infinite_tickets = false`).
- ✅ Ninguna zona horaria inválida.

## 3. Supabase Auth (panel)
- ✅ Site URL: `https://habitosandatomicos.onrender.com`.
- ✅ Redirect URLs: la de arriba y `https://habitosandatomicos.onrender.com/nueva-contrasena` (recuperar contraseña).
- ✅ "Confirm email" activado.
- ✅ Contraseña mínima de 8 caracteres y "Secure password change" activado.
- [ ] **Correo propio (SMTP) + plantillas en español**: pasos en `docs/EMAILS.md`. Sin él, los testers **no recibirían**
  ni la confirmación de cuenta ni el enlace de recuperar contraseña.
- [ ] Probar con un email que NO sea del equipo: registrarse, confirmar, entrar, cerrar sesión y recuperar contraseña.
- [ ] (Recomendado) Attack Protection: protección de contraseñas filtradas, si tu plan la incluye.
- [ ] Activar la verificación en dos pasos (2FA) en tus cuentas de Supabase, GitHub y Render.

## 4. Avisos al móvil
- ✅ Edge Function `send-reminders` desplegada con **Verify JWT desactivado** (el cron usa su propio secreto).
- ✅ Cron cada minuto funcionando (60 de 60 ejecuciones correctas en la última hora, respuesta 200).
- [ ] Probar en un iPhone (app instalada desde Safari) y en un Android: activar avisos y crear un recordatorio para dentro de 2 minutos.

## 5. Render (web publicada)
- [ ] Regla de reescritura: `/*` → `/index.html` (Rewrite). Sin ella, recargar en `/amigos` o abrir el enlace de recuperar contraseña da 404.
- [ ] Variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` puestas (solo la clave pública).
- [ ] Tras publicar: abrir la web, recargar en `/perfil` y comprobar que el icono nuevo sale en la pestaña.
- [ ] Cabeceras de seguridad (Render → tu sitio → Headers, ruta `/*`):
  `X-Frame-Options: DENY` · `X-Content-Type-Options: nosniff` · `Referrer-Policy: strict-origin-when-cross-origin` ·
  `Permissions-Policy: camera=(self), microphone=(), geolocation=()`. Impiden que otra web meta la tuya dentro (clickjacking).

## 6. Copias
- [ ] Copia completa hecha (`docs/COPIAS-SEGURIDAD.md`).
- [ ] Prueba de restauración hecha una vez.

## 7. Con los testers
- Diles cómo instalarla (`docs/PWA.md`) y un canal para avisarte de fallos (por ejemplo un grupo).
- Si algo se rompe, la app muestra "Algo se ha torcido" con un botón de recargar; pídeles una captura y la hora.
- Borrar la cuenta de alguien: Supabase → Authentication → Users → borrar. Sus datos se borran solos; sus fotos
  quedan en Storage (bórralas a mano en `avatars/<id>` y `evidence/<id>`).

## Límites conocidos (aceptados para la beta)
- Un enlace a una foto de progreso caduca en 1 hora; si dejáis de ser amigos, el que ya estaba abierto puede verse hasta entonces.
- La foto de perfil es pública para quien tenga el enlace (se ve en solicitudes de amistad). El nombre del archivo es aleatorio.
- Cambiar la categoría de un hábito cambia a qué insignia de categoría cuentan sus días (solo cosmético).
- Si un compañero de reto borra su cuenta, ese reto desaparece (y puede contar uno menos en "retos cumplidos").
