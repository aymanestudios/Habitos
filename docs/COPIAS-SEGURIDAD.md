# Estrategia de copias de seguridad

Idea clave: **una copia que nunca has restaurado no es una copia.** Por eso la estrategia tiene tres capas y una prueba de restauración.

## Capa 1: el código (ya hecha)

Todo el código vive en GitHub. Para recuperarlo basta con `git clone`.

## Capa 2: la estructura de la base de datos

Cada cambio de tablas, funciones y políticas RLS es un archivo SQL numerado dentro de `supabase/migrations/`, y se sube a GitHub con el código. Con eso se puede recrear la estructura entera en un proyecto nuevo de Supabase.

Reglas:
- Nunca se edita una migración ya aplicada; se crea una nueva.
- Los cambios no se hacen a mano en el panel de Supabase sin guardarlos como migración.

## Capa 3: los datos (usuarios, hábitos, registros)

Se guardan con un volcado de la base de datos usando el CLI de Supabase:

```bash
# La cadena de conexión está en el panel de Supabase, en el botón "Connect".
# Si tu red no admite IPv6, usa la del "Session pooler".
npx supabase db dump --db-url "TU_CADENA_DE_CONEXION" --data-only -f backups/datos-AAAA-MM-DD.sql
```

- La carpeta `backups/` está en `.gitignore`: contiene datos de personas y **no se sube a GitHub**.
- Guarda una copia fuera del ordenador (disco externo o nube privada).
- Los usuarios de login viven en el esquema `auth`, que Supabase gestiona aparte. En la Fase 1 comprobaremos qué opciones del volcado hay que añadir para incluirlos y dejaremos el comando exacto aquí.

### Cuándo

| Momento | Frecuencia |
| --- | --- |
| Uso normal con amigos | Una vez a la semana |
| Antes de aplicar una migración que cambie o borre datos | Siempre |
| Antes de un cambio grande (por ejemplo, retos) | Siempre |

## Qué ofrece Supabase por su cuenta

Las copias automáticas dependen del plan. Mira en el panel de tu proyecto, en el apartado de copias de la base de datos, qué incluye el tuyo. **No dependas solo de eso**: la estrategia de arriba funciona en cualquier plan.

## Prueba de restauración (una vez, antes de tener usuarios reales)

1. Crea un proyecto de Supabase vacío solo para pruebas.
2. Aplica las migraciones y carga el volcado de datos.
3. Comprueba que puedes entrar y ver los datos.
4. Borra el proyecto de pruebas.

## Más adelante

Cuando haya usuarios fuera del grupo de amigos, automatizamos el volcado semanal con una tarea programada de GitHub Actions, guardando la conexión como secreto del repositorio.
