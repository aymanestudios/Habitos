# Progress&Go

App web de hábitos con XP, rachas y amigos. Se instalará como PWA, pensada primero para iPhone y adaptada a escritorio.

**Estado: Fase 1 en curso.** Hecho: 1.1 login y perfiles, 1.2 hábitos (crear, editar y archivar), identidad visual nueva (paleta naranja/crema/marrón/verde y mascota panda), 1.3 marcar hábitos en la pantalla Hoy (con "ayer" y efectos), 1.4 XP, nivel y racha (ver `docs/XP-Y-RACHAS.md`). 1.5 app instalable (ver `docs/PWA.md`). recordatorios (crear, posponer, repetir, completar), logros en Perfil, estadísticas reales (calendario de actividad, 8 semanas y hábitos más constantes) y rediseño crema + turquesa con modo oscuro. Amigos: código, solicitudes y ranking semanal (0006). Pendiente: actividad y reacciones entre amigos, retos y avisos push. Amigos y la privacidad de Perfil llegan en la Fase 2 (la pantalla de Amigos dice "Muy pronto").

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
3. `npm run dev` y abre la web: ves Hoy, Hábitos, Amigos y Perfil, y puedes cambiar entre ellas con la barra inferior (móvil) o la lateral (escritorio).
4. Abre `/estado`: las tres primeras filas deben salir en **OK** (la de Supabase, tras rellenar `.env.local`).
5. Reduce la ventana del navegador por debajo de 768 px: la barra lateral pasa a barra inferior con el "+" central.
6. Cambia el modo claro/oscuro del sistema: los colores se adaptan.

## Estructura

```text
src/
├── app/          # arranque: rutas (routes.tsx), marco con navegación (AppLayout.tsx), proveedores (App.tsx)
├── components/   # piezas reutilizables sin lógica de negocio (Card, ProgressRing, HabitRow...)
├── features/     # una carpeta por funcionalidad
│   ├── dashboard/   # pantalla Hoy
│   ├── habits/      # pantalla Hábitos
│   ├── friends/     # pantalla Amigos
│   ├── profile/     # pantalla Perfil
│   └── system/      # página /estado (diagnóstico)
├── lib/          # utilidades: cliente de Supabase, variables de entorno, fechas, TanStack Query
└── styles/       # colores y estilos globales (index.css)
supabase/         # migraciones SQL (desde la Fase 1)
docs/             # AJUSTES.md, DISENO.md, COPIAS-SEGURIDAD.md
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
- [docs/COPIAS-SEGURIDAD.md](docs/COPIAS-SEGURIDAD.md): estrategia de copias.

## Siguiente

**Fase 1:** login, tabla de hábitos con RLS, marcar hábitos, XP y racha calculados en el servidor, PWA instalable.
