# Progress&Go

App web de hábitos con XP, rachas y amigos. Se instalará como PWA, pensada primero para iPhone y adaptada a escritorio.

**Estado: lista para beta privada (5-8 personas).** Publicada en https://habitosandatomicos.onrender.com (Render, sitio estático) con Supabase como servidor.

Qué hay:
- **Cuenta:** registro, login, recuperar contraseña (`/nueva-contrasena`) y tutorial de bienvenida con el panda (una sola vez). Ver `docs/BIENVENIDA.md`.
- **Hábitos:** diarios, ciertos días, X veces por semana o total semanal; con meta de número, dificultad, categoría y privacidad ("Solo yo" / "Mis amigos"). Un hábito hecho queda cerrado ese día. Recordatorios con repetición.
- **XP, niveles y rachas:** calculados en el servidor (`docs/XP-Y-RACHAS.md`), con congelaciones y bonus de día completo.
- **Amigos:** código de amigo, solicitudes, ranking semanal, actividad con reacciones, perfil de amigo con privacidad, fotos de progreso (`docs/FOTOS.md`).
- **Rachas compartidas** con fuego que evoluciona (`docs/FUEGO.md`) y **retos relámpago** (`docs/RETOS.md`).
- **Logros:** 31 recompensas cosméticas (`docs/RECOMPENSAS.md`) y **skins del panda** con cápsula sorpresa cada 7 días cumplidos (`docs/SKINS.md`).
- **Avisos al móvil** (recordatorios, toques, racha en peligro, retos, buenos días): `docs/AVISOS.md`.
- **PWA instalable** con modo oscuro (`docs/PWA.md`).

Antes de invitar a alguien: `docs/BETA.md` (configuración manual de Supabase y Render, y comprobaciones).

## Qué usamos y para qué

| Herramienta | Para qué sirve |
| --- | --- |
| React | Construir la interfaz con componentes reutilizables |
| TypeScript | JavaScript con tipos: te avisa de errores antes de ejecutar |
| Vite | Arranca la web en desarrollo y la empaqueta para publicarla |
| Tailwind CSS | Estilos escribiendo clases (`rounded-3xl`, `text-muted`) directamente en el componente |
| React Router | Cambiar de pantalla según la URL (`/habitos`, `/amigos`...) |
| TanStack Query | Pedir datos al servidor y guardarlos en memoria sin repetir peticiones |
| Supabase | Base de datos, login y permisos (RLS) |

## Requisitos

- Node.js 20.19 o superior (o 22.12+). Comprueba con `node -v`. Si usas nvm: `nvm install 22 && nvm use`.
- Git y VS Code.

## Primera vez

```bash
npm install                  # descarga las dependencias (tarda un minuto)
cp .env.example .env.local   # crea tu archivo de variables
```

Después abre `.env.local` en VS Code y rellena:

- `VITE_SUPABASE_URL`: la URL de tu proyecto de Supabase.
- `VITE_SUPABASE_ANON_KEY`: la clave pública (anon / publishable).

Los dos valores están en el panel de tu proyecto en supabase.com, en la sección de claves de la API. Si todavía no tienes proyecto, créalo ahí (el plan gratuito basta).

## Cómo ejecutarlo

```bash
npm run dev          # abre http://localhost:5173
npm run dev:movil    # igual, pero visible desde tu iPhone en la misma red Wi-Fi
```

Con `dev:movil`, Vite muestra una dirección `Network` (por ejemplo `http://192.168.1.20:5173`). Ábrela en Safari desde el iPhone.

## Cómo comprobar que todo funciona

1. `npm run typecheck`: no debe mostrar errores.
2. `npm run build`: debe terminar con "built in ...".
3. `npm run dev` y abre la web: ves Inicio, Hábitos, Amigos, Logros y Perfil, y puedes cambiar entre ellas con la barra inferior (móvil) o la lateral (escritorio).
4. Abre `/estado`: las tres primeras filas deben salir en **OK** (la de Supabase, tras rellenar `.env.local`).
5. Reduce la ventana del navegador por debajo de 768 px: la barra lateral pasa a barra inferior de 5 pestañas.
6. Cambia el modo claro/oscuro del sistema: los colores se adaptan.

## Estructura

```text
src/
├── app/          # arranque: rutas (routes.tsx), marco con navegación (AppLayout.tsx), proveedores (App.tsx)
├── components/   # piezas reutilizables sin lógica de negocio (Card, ProgressRing, HabitRow...)
├── features/     # una carpeta por funcionalidad
│   ├── auth/        # login, registro, recuperar contraseña
│   ├── dashboard/   # pantalla Inicio
│   ├── habits/      # pantalla Hábitos (y recordatorios en reminders/)
│   ├── friends/     # pantalla Amigos y perfil de amigo
│   ├── challenges/  # retos relámpago
│   ├── streaks/     # rachas compartidas (fuego)
│   ├── posts/       # fotos de progreso
│   ├── rewards/     # pantalla Logros
│   ├── skins/       # skins del panda y cápsulas
│   ├── onboarding/  # tutorial de bienvenida
│   ├── profile/     # pantalla Perfil
│   ├── stats/       # estadísticas
│   └── system/      # página /estado (diagnóstico)
├── lib/          # utilidades: cliente de Supabase, variables de entorno, fechas, TanStack Query
└── styles/       # colores y estilos globales (index.css)
supabase/         # migraciones SQL (0001-0025) y Edge Function send-reminders
docs/             # una guía por funcionalidad (ver abajo)
tools/            # scripts para preparar imágenes (skins, icono)
```

## Reglas del proyecto

- Una carpeta de `features/` no importa de otra `feature`, salvo de `auth` (la sesión la necesita todo el mundo). Si algo más se comparte, sube a `components/` o `lib/`. Única excepción: `dashboard` (la pantalla Hoy), que junta hábitos y perfil.
- Las llamadas a Supabase van en `features/<nombre>/`, nunca dentro de componentes visuales.
- El XP, las rachas y los permisos los decide el servidor, no el navegador.
- Cada cambio de base de datos es una migración nueva en `supabase/migrations/`.
- Los secretos solo en `.env.local`. Nunca la clave `service_role` en el navegador.

## Subir cambios a GitHub

Con el botón de control de código fuente de VS Code (Commit y Sync). `.env.local`, `node_modules/` y `backups/` ya están en `.gitignore` y no se suben.

## Documentación

- [docs/AJUSTES.md](docs/AJUSTES.md): decisiones sobre XP, hábitos numéricos, frecuencias, RLS y zonas horarias.
- [docs/BIENVENIDA.md](docs/BIENVENIDA.md): tutorial de bienvenida con el panda (una sola vez) e icono de la app.
- [docs/DISENO.md](docs/DISENO.md): identidad visual y navegación.
- [docs/COPIAS-SEGURIDAD.md](docs/COPIAS-SEGURIDAD.md): copias completas (base de datos, cuentas y fotos) y cómo restaurar.
- [docs/BETA.md](docs/BETA.md): lista de comprobación antes de la beta privada.
- Por funcionalidad: XP-Y-RACHAS, AVISOS, FOTOS, FUEGO, RETOS, RECOMPENSAS, SKINS, MASCOTA, PWA.

## Siguiente

Beta privada con 5-8 personas. Antes: `docs/BETA.md`. Después: recoger opiniones y corregir.