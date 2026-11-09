# Identidad visual

Nombre: **Progress&Go** (se cambia en `src/lib/constants.ts` y en `index.html`).

Objetivo: moderna, premium, minimalista y juvenil. Transmite **productividad, progreso y motivación**, sin parecerse a Notion ni a Duolingo.

## Principios

1. **Mucho aire, pocas cosas.** Una idea por tarjeta.
2. **El color significa algo.** Violeta = tu progreso y acciones. Naranja = racha y XP. Verde = hecho. Rojo solo para errores.
3. **Movimiento con intención.** Barras y anillos se llenan con una transición suave (0,7 s). Se desactivan si el móvil tiene "reducir movimiento".
4. **Tono que anima.** Un mal día se responde con "mañana seguimos", nunca con un regaño.
5. **Pulgar primero.** La acción principal (crear o marcar) está abajo, al alcance.

## Colores (claro / oscuro)

Definidos una sola vez en `src/styles/index.css`. Cambiar un valor ahí cambia toda la app.

| Nombre (clase Tailwind) | Claro | Oscuro | Uso |
| --- | --- | --- | --- |
| `bg` | `#F6F5FB` | `#0E0D14` | Fondo de la app |
| `surface` | `#FFFFFF` | `#17151F` | Tarjetas |
| `surface-2` | `#EEEDF7` | `#1F1C2A` | Fondos suaves, carriles de barras |
| `ink` | `#15131F` | `#F2F1F8` | Texto principal |
| `muted` | `#6B6880` | `#9C98B3` | Texto secundario |
| `line` | `#E4E2EF` | `#2A2736` | Bordes y separadores |
| `brand` | `#6D5EF5` | `#8B7FFF` | Acción principal y progreso |
| `accent` | `#F26F1D` | `#FF9A57` | Racha y XP |
| `good` | `#16A864` | `#3CCB86` | Completado |
| `danger` | `#E5484D` | `#FF7A7F` | Errores |

Cada color de acento tiene su versión `-soft` para fondos (`brand-soft`, `accent-soft`, `good-soft`, `danger-soft`).

El modo oscuro sigue el ajuste del móvil o del ordenador (no hay interruptor todavía).

## Tipografía y formas

- Fuente: Inter si está instalada; si no, la del sistema (SF Pro en iPhone). Sin descargar fuentes externas, para que cargue rápido.
- Tarjetas con esquinas muy redondeadas (`rounded-3xl`) y sombra muy suave.
- Botones y chips redondeados; objetivos táctiles de al menos 44 px.

## Navegación

| Sección | Ruta | Móvil | Escritorio |
| --- | --- | --- | --- |
| Hoy | `/` | Pestaña | Barra lateral |
| Hábitos | `/habitos` | Pestaña | Barra lateral |
| Crear hábito | `/habitos/nuevo` | Botón "+" central | Botón "Nuevo hábito" |
| Amigos | `/amigos` | Pestaña | Barra lateral |
| Perfil | `/perfil` | Pestaña | Barra lateral |
| Diagnóstico | `/estado` | (por URL) | Enlace al pie de la barra |

- **Móvil (menos de 768 px):** barra inferior con 4 pestañas y el "+" elevado en el centro.
- **Escritorio (768 px o más):** barra lateral fija de 256 px y contenido centrado, con un máximo de 1024 px.

## Detalles pensados para iPhone

- `viewport-fit=cover` y márgenes de seguridad (`pt-safe`, `pb-safe`) para el notch y la barra de inicio.
- Altura con `100dvh`, no `100vh`, que en Safari salta al mostrar u ocultar la barra del navegador.
- Barra inferior translúcida con desenfoque.
- Sin vibración háptica en iOS web, así que la recompensa visual vive en las animaciones.

## Pantallas diseñadas en la Fase 0

Hoy, Hábitos, Amigos y Perfil existen como **diseño con datos ficticios** para validar el aspecto. Cada una lleva la etiqueta "Diseño de ejemplo" hasta que la conectemos a la base de datos en la Fase 1.
