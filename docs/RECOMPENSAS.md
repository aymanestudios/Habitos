# Logros, recompensas y perfiles de amigos (0016_rewards_profiles.sql)

## Recompensas
- 31 recompensas en `reward_catalog`: 18 insignias, 5 marcos, 6 accesorios, 2 efectos.
- Rarezas: común, especial, épico, legendario (colores en `src/features/rewards/rewardRules.ts`).
- **Seguridad**: lo desbloqueado no se guarda. `get_my_rewards` lo calcula en el servidor con
  `get_reward_metrics` (hábitos hechos, mejor racha, nivel, hábitos por categoría, amigos, fotos,
  retos cumplidos, mejor racha compartida). El navegador no puede desbloquear nada.
- **Equipar**: `equip_rewards(marco, accesorio, efecto, insignias[])` comprueba que todo esté
  desbloqueado y sea del tipo correcto. Las columnas `equipped_*` y `showcase_badges` no se pueden
  editar directamente desde la app.
- Son solo cosméticas: no dan XP ni cambian ninguna regla.
- Dibujos: `src/features/rewards/RewardArt.tsx` (SVG propios). Avatar con lo equipado: `components/ProfileAvatar.tsx`.

## Perfil de un amigo (`/amigos/:id`)
`get_friend_profile` solo responde si sois amigos. Respeta su privacidad (servidor, no solo pantalla):
| Dato | Cuándo se ve |
|---|---|
| Nombre, usuario, foto, frase, nivel, XP, equipado | Siempre (a amigos) |
| Racha | Si `share_streak` |
| Logros | Si `share_achievements` |
| Estadísticas, hábitos y fotos | Si `share_stats`; solo hábitos "Mis amigos" y fotos "Mis amigos" |
Los hábitos privados y las fotos "Solo yo" nunca salen. El % de 30 días es un total, sin decir de qué hábitos.

## Navegación
Inicio · Hábitos (con Recordatorios dentro) · Amigos · Logros · Perfil (con Estadísticas dentro).
`/recordatorios` y `/estadisticas` redirigen a su sitio nuevo.

## Se quitó
- Selector de emojis del avatar (la columna `avatar_emoji` sigue en la base de datos: no se borró nada).
- Lista antigua de 10 logros calculados en el navegador (`achievements.ts`), sustituida por esto.
- Botón "+" central del móvil y enlace a "Estado del proyecto" del menú.

## Lo conseguido no se pierde (0025)
Algunas recompensas dependen de cosas que se pueden deshacer: la racha compartida (si la terminas), los amigos (si quitas uno) y las fotos (si las borras).
Antes de borrarse, el servidor guarda el récord en `reward_metric_peaks` y `get_reward_metrics` usa el mayor entre lo actual y lo guardado. Así una insignia o un marco no vuelven a bloquearse.
Las rachas compartidas terminadas ANTES de 0025 no guardaron su récord y no se pueden recuperar.
