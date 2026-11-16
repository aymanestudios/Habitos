# App instalable (PWA)

Progress&Go se puede instalar como una app, con su icono de panda y sin la barra del navegador.

## Qué hay
- `public/manifest.webmanifest`: nombre, iconos, colores y modo "standalone".
- `public/sw.js`: service worker. Guarda la app para que abra rápido y también sin conexión.
- `src/lib/registerServiceWorker.ts`: lo activa **solo en la versión publicada** (no en `npm run dev`).

## Qué NO hace
- No toca nada de Supabase (otro dominio) ni peticiones que no sean GET: hábitos, XP y sesión siempre vienen del servidor.
- Sin conexión la app abre, pero no carga datos nuevos ni deja marcar hábitos (eso sería una fase futura: cola de acciones sin conexión).

## Cómo instalarla
- **iPhone (Safari):** Compartir → "Añadir a pantalla de inicio". En iOS solo se instala desde Safari.
- **Android (Chrome):** menú ⋮ → "Instalar aplicación".
- **Escritorio (Chrome/Edge):** icono de instalar en la barra de direcciones.
- Requiere HTTPS: funciona en la web publicada, no en `http://` de otro equipo de la red.

## Probarla en tu PC
`npm run build && npm run preview` y abre la dirección que salga (localhost sí vale). En DevTools → Application puedes ver el manifest y el service worker.

## Actualizar
Si cambias `public/sw.js`, sube `VERSION` (v1 → v2) para borrar la caché antigua. Los archivos de `/assets/` llevan hash, así que se renuevan solos en cada build.
