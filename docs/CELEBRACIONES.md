# Celebraciones (src/features/celebrations)

Un solo sitio (`CelebrationProvider`, montado en `AppLayout`) decide qué se celebra y cuándo. Las pantallas solo avisan.
Todo sale de datos del **servidor**: el XP que devuelve `add_habit_progress`, el nivel de `get_my_progress`, los logros de `get_my_rewards` y los retos de `get_my_team_challenges`. Nada se calcula en la pantalla.

## Tres intensidades
| | Qué | Cómo se ve |
|---|---|---|
| Pequeña | Completar un hábito, aportar a un reto | La fila rebota y brilla, y el "+15 XP" vuela hasta la barra de nivel, que destella al recibirlo (0,9 s). |
| Media | Día completo, logro común o especial | Tarjeta arriba con el panda o la insignia. Se cierra sola (el tiempo solo corre con la app a la vista) o con la X. |
| Grande | Subir de nivel, logro épico o legendario, reto en equipo cumplido | Pantalla completa con rayos, confeti y el panda. El número de nivel viejo se transforma en el nuevo. Se salta con el botón, tocando fuera o con Escape. |

## Cola
- Nunca hay dos ventanas a la vez: lo demás espera (`enqueue` en `celebrationRules.ts`).
- Varias subidas de nivel = una sola ("Has subido 2 niveles"). Varios logros = una tarjeta. Orden: nivel → reto → logros → día.
- Subida de nivel: se celebra una vez por dispositivo (`pg-level-seen:<usuario>`), aunque los datos lleguen tarde. La primera vez en un dispositivo no se celebra lo antiguo.
- Logros: lista vista por usuario (`pg-rewards-seen:<usuario>`), antes era una sola para todo el dispositivo.

## Rendimiento y accesibilidad
- Sin librerías nuevas (se descartó Motion: ~40 kB más y no hacía falta). CSS + Web Animations API, solo `transform` y `opacity`.
- Los chips de XP se dibujan fuera de React (no repintan la pantalla) y como mucho hay 3 a la vez.
- `prefers-reduced-motion`: sin vuelos, rayos ni confeti; el contenido se ve igual.
- Foco al botón principal y vuelta al sitio al cerrar; cada "+XP" se anuncia a los lectores de pantalla.
