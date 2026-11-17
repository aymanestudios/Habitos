# Supabase

Aquí vivirá todo lo del servidor.

- `migrations/`: cambios de la base de datos en archivos SQL numerados. Se ejecutan **una vez cada uno y en orden**, pegándolos en el editor SQL de Supabase (SQL Editor → New query → Run):
  1. `0001_profiles.sql`: perfiles de usuario (se crean solos al registrarse).
  2. `0002_habits.sql`: tabla de hábitos.
  3. `0003_habit_logs.sql`: registro diario (marcar, desmarcar, progreso) y la función `add_habit_progress`.
  4. `0004_xp_streaks.sql`: XP, niveles y rachas (`xp_events`, `get_my_progress`; `add_habit_progress` ahora también calcula el XP).
  5. `0005_reminders.sql`: recordatorios personales (privados, con repetición diaria o semanal).
  6. `0006_friends.sql`: amigos (código de amigo, solicitudes y ranking semanal). De un amigo solo se comparte nivel, XP y racha.

Siguen `docs/AJUSTES.md`. Las fases siguientes (XP y racha, amigos) añadirán más archivos con el siguiente número.

En la Fase 0 solo creas el proyecto en supabase.com y copias su URL y su clave pública en `.env.local`.

- `0007_activity_categories.sql`: categorías de hábitos, actividad de amigos y reacciones (🔥 👏 💪 🎉). El nombre de un hábito solo se ve si tiene visibilidad "Mis amigos".
- `0008_challenges.sql`: retos cooperativos semanales (tú + un amigo, meta de XP conjunta). Solo se crean con amigos aceptados.
- `0009_push.sql`: avisos al móvil (suscripciones, cron cada minuto y secreto en Vault). Necesita la Edge Function `functions/send-reminders` y las claves VAPID: ver docs/AVISOS.md.
- `0010_vapid_vault.sql`: las claves de los avisos se generan solas y se guardan cifradas en Vault. La app solo lee la pública.
- `0011_profile_style.sql`: emoji, color y frase del perfil. Los amigos ven emoji y color en el ranking.
- `0012_photos.sql`: fotos de perfil (bucket público `avatars`) y fotos de hábitos (bucket privado `evidence`, tabla `habit_posts`, reacciones a publicaciones). Ver docs/FOTOS.md.
- `0013_shared_streaks.sql`: rachas compartidas entre dos amigos (solo pareja y fecha de inicio; la racha y el récord se calculan). Ver docs/FUEGO.md.
