# Retos en equipo (0026)

Dos amigos **suman** lo que hacen hasta una meta común: "20 km entre los dos", "100 páginas", "300 minutos de estudio".
Están en **Amigos → Retos en equipo** (y los que están en marcha también en Inicio).

## Cómo funciona
1. Eliges amigo, tipo, meta y duración (hoy, 3 días, 1 semana, 2 semanas o hasta una fecha, máx. 14 días).
2. Le llega la invitación (en la app y por aviso push). Acepta o dice "Ahora no". Sin respuesta, caduca a los 3 días.
3. Al aceptar, el reto **empieza ese día**. Cada uno apunta lo suyo ("Apuntar progreso"); los de hábitos cuentan solos.
4. **Cumplido** = entre los dos llegáis a la meta **y** cada uno aporta al menos el **20 %** (en 20 km, 4 km cada uno).
5. Los dos reciben XP (ver `docs/XP-Y-RACHAS.md`) y una celebración con los dos avatares.

| Tipo | Unidad | Meta | Máx. por aportación | Máx. por día |
|---|---|---|---|---|
| Caminar o correr | km | 2-500 | 60 | 100 |
| Lectura | páginas | 10-5000 | 300 | 600 |
| Estudio | min | 15-10000 | 300 | 720 |
| Ejercicio | sesiones | 2-60 | 3 | 4 |
| Hábitos | hábitos (automático) | 4-200 | — | — |
| Personalizado | la que elijáis | 1-100000 | 1000 | 2000 |

Los números se cambian en un solo sitio: `team_rule()` en el servidor (y `TEAM_KINDS` en `src/features/team/teamRules.ts` para la pantalla).

## Seguridad y anti-trampas (todo en el servidor)
- Solo entre amigos. Nadie puede apuntar por otro: la aportación siempre es de quien tiene la sesión.
- Sin negativos, sin cantidades absurdas (máximos de arriba) y nadie aporta más que la meta entera.
- Solo se aporta a retos en marcha y dentro de sus fechas (cada uno en su zona horaria).
- **Carreras**: cada aportación bloquea la fila del reto (`for update`); si los dos terminan a la vez, el segundo espera y ya lo ve cumplido. El XP tiene además clave única.
- Contra el "farmeo": 1 reto vivo por pareja, 3 por persona y como mucho 2 retos premiados por semana.
- Cancelar o abandonar: queda "cancelado", sin premio. Dejar de ser amigos cancela los que estaban en marcha; los cumplidos se quedan.
- Deshacer una aportación propia: 15 minutos, si el reto sigue en marcha.
- Es un reto de **confianza**: los km o páginas se apuntan a mano. La tabla `challenge_contributions` deja preparada una futura verificación (Apple Salud / Health Connect).

## Preparado para más adelante
- Modalidad "mínimo individual" (cada uno la mitad): columna `mode = 'min_each'` ya entendida por el servidor (`team_goal_reached`).
- `min_share` (0-50 %) por reto: hoy siempre 20.

## Retos relámpago (antiguos)
Ya no se pueden crear (`create_flash_challenge` responde `use_team_challenges`). Los que existían siguen contando y se ven hasta que terminan. No se ha borrado nada.

## Funciones
`create_team_challenge`, `respond_team_challenge`, `add_team_contribution`, `remove_team_contribution`, `cancel_challenge`, `get_my_team_challenges`, `get_duo`. Internas: `team_rule`, `team_totals`, `team_settle`, `team_goal_reached`, `team_xp_for`, `team_label`.

## Pruebas (19/11/2026, Postgres 16 local)
Validaciones al crear, invitación/aceptar/rechazar, cantidades malas, meta superada, cumplido con mínimo del 20 %, XP una sola vez, XP fuera del tope diario, tope semanal (50, 20 y 0), permisos y RLS, deshacer, caducidad de invitaciones y retos, dejar de ser amigos, tipo hábitos automático, cancelar, relámpago bloqueado, avisos push, borrado de cuenta (el récord se conserva) y **dos personas aportando a la vez** (dos sesiones reales: un solo cierre y un solo XP). Migración aplicada sobre una base con un reto relámpago activo y ejecutada dos veces sin error.
