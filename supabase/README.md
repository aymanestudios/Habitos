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
- `0014_streak_nudges.sql`: "dar un toque" al amigo de racha y aviso automático a las 20:00 si la racha peligra. La Edge Function usa ahora `claim_push_queue`.
- `0015_morning_ping.sql`: aviso "☀️ Nuevo día para empezar" a las 9:00 si hoy tienes hábitos sin empezar.
- `0016_rewards_profiles.sql`: recompensas cosméticas calculadas en el servidor, equipar con validación, privacidad y perfil de amigo. Ver docs/RECOMPENSAS.md.
- `0017_home_week.sql`: solo lectura. XP de hoy y días sin entrar (Inicio) y resumen de la última semana completa.
- `0018_flash_challenges.sql`: retos relámpago (tipos xp, hábitos, categoría, días; 3 o 7 días). Amplía `challenges` y recrea `get_my_challenges`. Ver docs/RETOS.md.
- `0019_challenge_pings.sql`: avisos de retos (te proponen un reto, último día, reto cumplido). Solo amplía `claim_push_queue`; no hay que redesplegar la Edge Function.
- `0020_lock_done.sql`: un hábito hecho ya no se puede cambiar (ni + ni −) y el progreso no pasa de la meta. Cambia solo `add_habit_progress`.
- `0021_polish.sql`: repaso. Cierra las funciones de los triggers y suaviza dos textos de avisos (toque y racha compartida).
