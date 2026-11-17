# Fotos: perfil y logros de hábitos

## Dónde se guardan
Supabase Storage (nunca Base64 en la base de datos; en las tablas solo va la ruta):

| Bucket | Tipo | Ruta | Para qué |
|---|---|---|---|
| `avatars` | público | `avatars/<id usuario>/<aleatorio>.webp` | Foto de perfil |
| `evidence` | **privado** | `evidence/<id usuario>/<aleatorio>.webp` | Fotos de hábitos |

- Límite: 2 MB (perfil) y 3 MB (hábitos). Solo `image/jpeg`, `image/png`, `image/webp`.
- Cada usuario solo puede subir y borrar dentro de **su carpeta** (políticas de `storage.objects`).
- Antes de subir, el móvil/navegador **recomprime** la foto: perfil 512×512 recortada en círculo,
  hábitos lado largo 1600 px. Al recomprimir se pierden los datos **EXIF (incluida la ubicación GPS)**.
- Al cambiar o quitar una foto se borra la anterior.

## Privacidad de las fotos de hábitos
- Cada publicación es **Solo yo** o **Mis amigos** (se puede cambiar o borrar después desde el historial del hábito).
- "Público" no está activado a propósito: antes hace falta un sistema de denuncias/moderación.
- El bucket es privado: las fotos se ven con **enlaces firmados que caducan en 1 hora**.
- Cada petición pasa por `can_view_evidence`: dueño, o amigo aceptado si la publicación es "Mis amigos".
  Si la pasas a "Solo yo" o dejáis de ser amigos, deja de poder verla.
- Solo se puede publicar si el hábito **está hecho** ese día (lo comprueba el servidor en `publish_habit_post`).

## Tablas y funciones (0012_photos.sql)
- `profiles.avatar_path`
- `habit_posts` (una por hábito y día): foto, comentario (≤200), privacidad.
- `reactions.post_id`: reacciones a publicaciones (🔥 👏 💪 🎉).
- `publish_habit_post`, `react_to_post`, `can_view_evidence`.
- `get_friend_activity` y `get_friends_overview` devuelven ahora fotos de perfil y publicaciones.

## Cómo probar
**Foto de perfil** (ordenador y móvil): Perfil → toca tu avatar → "Hacer una foto" o "Elegir de la galería"
→ mueve/acerca → Guardar. Debe salir en Perfil, Amigos (ranking y solicitudes) y en la actividad de tus amigos.
Prueba también "Quitar foto".

**Foto de hábito**: Hoy → marca un hábito → aparece "¿Quieres compartir tu progreso?" (o el botón 📷 de la fila)
→ foto + comentario + "Mis amigos" → Publicar. Con una segunda cuenta amiga: Amigos → Actividad reciente
→ debe verse la foto y poder reaccionar. Cambia a "Solo yo" desde Hábitos → (hábito) → Tus fotos y comprueba
que el amigo deja de verla.

**Comprobar la seguridad** (SQL en Supabase):
`select id, public, file_size_limit, allowed_mime_types from storage.buckets;`

## Pendiente
- Comentarios en las publicaciones (necesitan tabla `post_comments` y moderación básica).
- Opción "Público" (necesita denuncias/moderación).
- Si se borra un hábito entero, sus publicaciones se borran pero los archivos quedan en Storage
  (privados, nadie más los ve). Limpiarlos requiere una función de servidor programada.

## Hábitos privados (0025)
Si compartes con "Mis amigos" la foto de un hábito "Solo yo", tus amigos ven la foto y el comentario, pero **no el nombre del hábito** (sale "Hábito privado" / "ha completado un hábito"). Al compartir, la app te lo avisa.
