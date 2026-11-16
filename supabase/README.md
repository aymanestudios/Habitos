# Supabase

Aquí vivirá todo lo del servidor.

- `migrations/`: cambios de la base de datos en archivos SQL numerados. Se ejecutan **una vez cada uno y en orden**, pegándolos en el editor SQL de Supabase (SQL Editor → New query → Run):
  1. `0001_profiles.sql`: perfiles de usuario (se crean solos al registrarse).
  2. `0002_habits.sql`: tabla de hábitos.
  3. `0003_habit_logs.sql`: registro diario (marcar, desmarcar, progreso) y la función `add_habit_progress`.
  4. `0004_xp_streaks.sql`: XP, niveles y rachas (`xp_events`, `get_my_progress`; `add_habit_progress` ahora también calcula el XP).

Siguen `docs/AJUSTES.md`. Las fases siguientes (XP y racha, amigos) añadirán más archivos con el siguiente número.

En la Fase 0 solo creas el proyecto en supabase.com y copias su URL y su clave pública en `.env.local`.
