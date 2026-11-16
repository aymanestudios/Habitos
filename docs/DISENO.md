# Identidad visual

Nombre: **Progress&Go** (se cambia en `src/lib/constants.ts` y en `index.html`).

Objetivo: moderna, premium, minimalista y juvenil. Transmite **productividad, progreso y motivación**, sin parecerse a Notion ni a Duolingo.

## Principios

1. **Mucho aire, pocas cosas.** Una idea por tarjeta.
2. **El color significa algo.** Naranja = tu identidad, acciones y progreso. Dorado = XP y estrellas. Verde = hecho. Rojo solo para errores.
3. **Movimiento con intención.** Barras y anillos se llenan con una transición suave (0,7 s). Se desactivan si el móvil tiene "reducir movimiento".
4. **Tono que anima.** Un mal día se responde con "mañana seguimos", nunca con un regaño.
5. **Pulgar primero.** La acción principal (crear o marcar) está abajo, al alcance.

## Colores (claro / oscuro)

Definidos una sola vez en `src/styles/index.css`. Cambiar un valor ahí cambia toda la app.
Paleta de la mascota: naranja energético `#F16B36`, crema `#FFF8EF`, marrón oscuro `#42251F` y verde `#65B98A`.

| Nombre (clase Tailwind) | Claro | Oscuro | Uso |
| --- | --- | --- | --- |
| `bg` | `#FFF8EF` | `#1F1310` | Fondo de la app (crema / marrón) |
| `surface` | `#FFFFFF` | `#2A1A16` | Tarjetas |
| `surface-2` | `#F7EBDD` | `#36231D` | Fondos suaves, carriles de barras |
| `ink` | `#42251F` | `#FFF3E6` | Texto principal |
| `muted` | `#7A5B52` | `#C9AFA3` | Texto secundario |
| `line` | `#EBDDCC` | `#473029` | Bordes y separadores |
| `brand` | `#F16B36` | `#F16B36` | **Relleno** naranja: botones, anillos, barras |
| `brand-ink` | `#B03F0F` | `#FF8F63` | **Texto** naranja (enlaces, pestaña activa) |
| `on-brand` | `#42251F` | `#42251F` | Texto encima de un relleno naranja |
| `accent` / `accent-ink` | `#F5A524` / `#8F5400` | `#FFC15A` | XP y estrellas (relleno / texto) |
| `good` / `good-ink` | `#65B98A` / `#2A7350` | `#65B98A` / `#86D3A7` | Completado (relleno / texto) |
| `danger` | `#BC2D32` | `#FF8A8E` | Errores |

Por qué hay pares "relleno" y "texto": el naranja puro `#F16B36` luce muy bien como fondo, pero como letra sobre crema
se lee mal (contraste 2,9). Para letras se usa su versión más oscura (`-ink`), que pasa el mínimo de legibilidad (4,5).
Por la misma razón, el texto de los botones naranjas es marrón y no blanco (4,55 frente a 3,05).

Cada color de acento tiene su versión `-soft` para fondos (`brand-soft`, `accent-soft`, `good-soft`, `danger-soft`).

El modo oscuro sigue el ajuste del móvil o del ordenador (no hay interruptor todavía).

## Mascota e iconos

- Mascota: panda rojo, `public/mascota.webp` (sin fondo, 600 px, 47 KB). Se pinta con `<Mascot />` en el login y en las pantallas vacías.
- Icono de la app: la cabeza del panda sobre azul marino, `public/icon-512.png` (y `icon-192.png`, `apple-touch-icon.png`, `favicon.png`).
- Los originales los aportó el autor; para cambiar la mascota basta con reemplazar `mascota.webp` por otra imagen con fondo transparente.

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
