# Copias de seguridad

Idea clave: **una copia que nunca has restaurado no es una copia.** Hazla y pruébala una vez antes de la beta.

## Qué hay que guardar y dónde está

| Qué | Dónde vive | Cómo se guarda |
| --- | --- | --- |
| Código y estructura (tablas, funciones, RLS) | GitHub (`supabase/migrations/`) | `git clone` |
| Datos de la app (hábitos, registros, XP, amigos, retos, skins…) | Base de datos, esquema `public` | `data.sql` (abajo) |
| Cuentas (email y contraseña cifrada) | Base de datos, esquema `auth` | `data.sql` (abajo) |
| Lista de fotos (rutas) | Base de datos, `storage.objects` | `data.sql` (abajo) |
| **Las fotos de verdad** (perfil y progreso) | Storage (fuera de la base de datos) | Paso 3 (abajo) |
| Claves de los avisos y secreto del cron | Vault | No se copian: se regeneran (ver "Restaurar") |
| Configuración del panel (Auth, Edge Function) | Panel de Supabase | Apuntada en `docs/BETA.md` |

Antes solo se guardaba `public` con `--data-only`: faltaban las cuentas, las fotos y los roles. Este procedimiento lo cubre todo.

## Hacer la copia (una vez por semana durante la beta, y siempre antes de aplicar una migración)

Necesitas el CLI de Supabase (`npx supabase`), **Docker abierto** (el CLI lo usa para el volcado) y la cadena de conexión
(panel de Supabase → botón **Connect**; si tu red no admite IPv6, usa la del "Session pooler").

```bash
D=backups/$(date +%F) && mkdir -p $D
DB="TU_CADENA_DE_CONEXION"

# 1. Base de datos completa: roles, estructura y datos (incluye las cuentas de auth y la lista de fotos)
npx supabase db dump --db-url "$DB" -f $D/roles.sql --role-only
npx supabase db dump --db-url "$DB" -f $D/schema.sql
npx supabase db dump --db-url "$DB" -f $D/data.sql --use-copy --data-only -x "storage.buckets_vectors" -x "storage.vector_indexes"

# 2. Comprobación rápida: el volcado debe tener tus usuarios
grep -c "auth.users" $D/data.sql

# 3. Fotos (Storage). Primero, una vez: npx supabase login && npx supabase link --project-ref gcuxnycrxunmrsbgfybi
npx supabase storage cp -r ss:///avatars $D/avatars --experimental
npx supabase storage cp -r ss:///evidence $D/evidence --experimental
```

- Si el paso 3 falla con tu versión del CLI, con 5-8 personas también vale descargar las carpetas desde el panel (Storage → bucket → descargar).
- `backups/` está en `.gitignore`: tiene datos personales y **nunca se sube a GitHub**. Guarda una copia fuera del ordenador (disco externo o nube privada) y bórrala cuando termine la beta.
- Las copias automáticas de Supabase dependen del plan; míralas en el panel, pero no dependas solo de ellas.

## Copia rápida dentro de la base de datos (antes de una migración)
El 18/11/2026, antes de aplicar 0025, se copiaron las 19 tablas de `public` al esquema `backup_20261118`
(no lo ve la app: no está expuesto y no tiene permisos para `anon` ni `authenticated`).
Sirve para deshacer un error de una migración, **no** sustituye a la copia completa (si se pierde el proyecto, se pierde también).
Cuando ya no haga falta: `drop schema backup_20261118 cascade;`

## Restaurar (en un proyecto NUEVO de Supabase)

1. Crea el proyecto nuevo y copia su cadena de conexión.
2. Restaura la base de datos:
   ```bash
   psql --single-transaction --variable ON_ERROR_STOP=1 \
     --file roles.sql --file schema.sql \
     --command 'SET session_replication_role = replica' \
     --file data.sql --dbname "CADENA_DEL_PROYECTO_NUEVO"
   ```
3. Sube las fotos a los mismos buckets y con las mismas rutas (`npx supabase storage cp -r ./avatars ss:///avatars --experimental`, igual con `evidence`).
4. Vault no viaja con la copia. En el proyecto nuevo:
   - Crea de nuevo el secreto del cron y la tarea programada: ejecuta las secciones de Vault y cron de `0009_push.sql` **cambiando la URL** por la del proyecto nuevo.
   - Las claves de los avisos se regeneran solas la primera vez que corre la Edge Function. Cada persona tendrá que **volver a activar los avisos** en su móvil.
5. Despliega la Edge Function `send-reminders` y repite la configuración manual de `docs/BETA.md`.
6. Cambia en Render `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` por las del proyecto nuevo y vuelve a publicar.
7. Comprueba: entras con una cuenta de prueba, ves tus hábitos, XP y racha, las fotos cargan y un amigo ve tu perfil.

## Prueba de restauración (una vez, ANTES de invitar a nadie)

Haz los pasos de "Restaurar" en un proyecto de pruebas, comprueba el paso 7 y borra ese proyecto. Apunta aquí la fecha y si todo fue bien:

- Fecha de la prueba: _pendiente_
