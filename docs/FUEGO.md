# Fuego de las rachas compartidas

## Qué se guarda y qué se calcula
- **Se guarda** (tabla `shared_streaks`, 0013): quién forma la pareja y desde qué día (`started_on`).
- **Se calcula en el servidor** (`get_shared_streaks`): racha actual, récord y estado de hoy de cada uno,
  a partir de los hábitos reales (`day_stats_range`).
- **Se calcula en la app** (`src/features/streaks/fireRules.ts`): etapa, colores, tamaño, partículas.
  El color o nivel del fuego **nunca** se guarda, así no puede desincronizarse.

## Cuándo cuenta un día
Cada uno: "cumplido" si hace al menos el 70 % de sus hábitos diarios; "libre" si ese día no tenía ninguno.
- Suma si nadie falla y al menos uno cumple.
- Si alguno falla, la racha vuelve a 0 (el fuego vuelve a la etapa inicial). El **récord** se conserva.
- Si los dos estaban libres, ni suma ni rompe. Hoy solo suma cuando ya lo habéis logrado.
- Sin congelaciones (a diferencia de la racha individual).

## Etapas
| Días | Fuego |
|---|---|
| 0 | Por encender (brasa) |
| 1-25 | Inicial (naranja) |
| 26-50 | Intensificado |
| 51-100 | Rojo (chispas y lenguas laterales) |
| 101-150 | Rojo y morado |
| 151-200 | Morado |
| 201-250 | Morado y azul |
| 251-299 | Azul |
| 300+ | Legendario (aro de luz) |

Transición progresiva: en los últimos 5 días (etapas de 25) o 10 días (etapas de 50) el fuego mezcla poco a poco
el color de la siguiente etapa, hasta un 75 %; el resto llega al desbloquearla, con su animación de evolución.

## Animaciones
- Llama: parpadeo por capas, brasas que suben, chispas, resplandor y aro (solo transform/opacity).
- Encender (primera vez), "¡Racha mantenida!" (una vez al día) y "¡Nuevo fuego!" (al subir de etapa).
  El recuerdo de qué animación ya viste está en el navegador (localStorage); los datos reales, en Supabase.
- Con "reducir movimiento" del dispositivo, la llama se queda quieta.

## Probar
Necesitas dos cuentas amigas: Amigos → Rachas compartidas → Nueva → elegir amigo.
Marcad los dos vuestros hábitos de hoy → la tarjeta debe mostrar "¡Racha mantenida!" y 1 día.

## Que no se apague (0014_streak_nudges.sql)
- **En el inicio**: las rachas compartidas salen arriba del todo en "Hoy" (con "En peligro" si alguno no ha cumplido).
- **Dar un toque**: si tu amigo aún no ha cumplido, le mandas un aviso al móvil
  ("🔥 Aymane te da un toque · ¡Que se apaga vuestra racha!"). Uno al día por persona y racha.
  Si no tiene los avisos activados, lo verá en la tarjeta ("Aymane te ha dado un toque").
- **Aviso automático a las 20:00** (hora de cada uno): si hay racha (1+ días) y aún no has cumplido.
  Una comprobación al día por persona y racha.
- Los envía la Edge Function `send-reminders` (cada minuto) con `claim_push_queue`
  (recordatorios + toques + rachas en peligro). Cada aviso se marca como enviado al salir.
