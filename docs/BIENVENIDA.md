# Tutorial de bienvenida

La primera vez que alguien entra (tras registrarse), el panda le enseña la app: bienvenida → 6 pasos → final con confeti.

## Pasos (solo funciones que existen)
1. Tus hábitos (pestaña Hábitos) · 2. XP y niveles · 3. Rachas y fuego compartido · 4. Amigos y retos relámpago · 5. Logros y cápsulas de skins · 6. Tu perfil (con tu avatar real).
Textos en `src/features/onboarding/onboardingRules.ts`; escenas animadas en `TourScenes.tsx` (marcadas "Ejemplo": no son datos tuyos).

## Que salga una sola vez
- Servidor (`0024_onboarding.sql`): `profiles.onboarded_at`. Solo se marca con `finish_onboarding()` (la columna no se puede escribir desde la app). Vale para cualquier dispositivo y tras cerrar sesión.
- Dispositivo: `localStorage['pg-onboarded:<id>']` = `done` o `pending` (si no había conexión, se reintenta al volver). Así no pregunta en cada recarga.
- Mientras se comprueba, no sale nada: nunca bloquea la entrada. Si el código del tutorial no se pudiese descargar, la app sigue normal.
- Saltar también cuenta como visto.

## Volver a verlo
Perfil → al final, "Ver tutorial de bienvenida". Al terminar te deja donde estabas.

## Navegación y accesibilidad
Botones, flechas del teclado, deslizar con el dedo, Escape para salir. Foco al título de cada pantalla y aviso para lectores de pantalla.
Con "reducir movimiento" del sistema no hay animaciones ni confeti.
Al terminar la primera vez lleva a Inicio y, si aún no hay hábitos, "Crear mi primer hábito" late unos segundos.

## Probarlo
- Cuenta nueva: lo verá solo.
- Tu cuenta: Perfil → "Ver tutorial de bienvenida".
- Forzarlo de nuevo en una cuenta (SQL): `update public.profiles set onboarded_at = null where id = '<id>';` y borrar `pg-onboarded:<id>` del navegador.

## Icono de la app
Panda rojo redibujado en vectorial (`public/favicon.svg`) a partir de la imagen original (`tools/vectorize_icon.py`).
PNG generados desde ese SVG: `favicon.png` (64), `apple-touch-icon.png` (180), `icon-192.png`, `icon-512.png` y `icon-maskable-512.png` (Android, con margen de seguridad).
El service worker pasó a `v4` para que los móviles cojan los iconos nuevos.
