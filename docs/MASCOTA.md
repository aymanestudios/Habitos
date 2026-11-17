# Mascota: poses y dónde salen

Imágenes en `public/mascota/` (WebP sin fondo, 23-41 KB). Componente: `<Mascot pose="..." />`.

| Pose | Archivo | Dónde |
|---|---|---|
| default | `/mascota.webp` | Inicio de sesión, ánimo normal en Hoy |
| sleep (dormido) | `dormido.webp` | Hoy por la mañana (antes de las 9 sin empezar) y días libres · "Nada pendiente" en Recordatorios |
| gym (pesas) | `gimnasio.webp` | Hoy cuando ya has empezado o casi terminas · "Aún no tienes hábitos" (Hoy y Hábitos) |
| star (estrella) | `estrella.webp` | Tarjeta de Logros (Perfil) · aviso "¡Nivel N!" al subir de nivel · Estadísticas vacías |
| cheer (puño) | `celebra.webp` | Hoy con el día completo |
| laptop (portátil) | `portatil.webp` | Amigos cuando aún no tienes ninguno |

Las rachas compartidas (fuego) no llevan mascota, a propósito.

Aviso al móvil "☀️ Nuevo día para empezar" (0015_morning_ping.sql): a las 9:00 de cada uno,
una vez al día, solo si hoy tienes hábitos y no has hecho ninguno.

## Fase 4: el panda reacciona
- Al completar un hábito de hoy, el panda (pose gimnasio) dice algo durante unos segundos: "¡Primero hecho!", "¡Solo te queda uno!"… (`reactionFor` en mascotRules.ts). Con el día completo manda la celebración de siempre.
- Al volver tras 3+ días, la bienvenida propone un **plan fácil**: "Empezar por: <tu hábito pendiente más sencillo>" y lo marca con un toque (`easyStart` en homeRules.ts).
- Reto relámpago cumplido: tarjeta en Inicio con el panda celebrando y confeti, una sola vez por reto (`HomeChallenges`).
- El fuego sigue SIN mascota.
