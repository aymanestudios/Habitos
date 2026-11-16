# Ajustes de diseño antes de programar

Estas decisiones **no se programan en la Fase 0**: quedan fijadas aquí para que las tablas y funciones de la Fase 1 y 2 nazcan ya con ellas. Cada ajuste dice el problema, la solución y dónde se aplicará.

## 1. XP duplicada al completar y descompletar

**Problema:** si cada pulsación suma XP, marcar → desmarcar → marcar da XP infinita.

**Solución:**
- Cada XP se guarda en la tabla `xp_events` con una clave única: `(user_id, source, habit_id, local_date)`. Solo puede existir **un** evento de XP por hábito y día.
- Al completar se inserta con `on conflict do nothing`: si ya existe, no pasa nada.
- Al descompletar se **borra** ese evento (el XP se devuelve). Así marcar y desmarcar nunca suma ni resta de más, y una pulsación por error no regala XP.
- `xp_total` del perfil se recalcula en el servidor a partir de `xp_events`. El navegador **no puede** escribir ni en `xp_events` ni en `xp_total` (permisos revocados; solo funciones del servidor).
- El bonus de día completo usa la misma idea con clave `(user_id, 'daily_bonus', local_date)`, y el tope diario de XP se aplica en esa misma función.

**Se aplica en:** Fase 1 (migración de XP y función `complete_habit`).

## 2. Objetivos numéricos y progresos parciales

**Solución:**
- `habits.target_value` (número, vacío = hábito de sí/no) y `habits.unit` (vasos, km, páginas...).
- `habit_logs.value` guarda el **total acumulado del día**; hay una única fila por hábito y día.
- Una función del servidor `add_habit_progress(habit_id, delta, day_offset)` suma al total (ya creada en la migración 0003; `day_offset` es 0 = hoy o -1 = ayer). El hábito cuenta como completado cuando `value >= target_value`.
- El progreso parcial (5 de 8 vasos) se muestra con barra, pero **la XP solo se concede al alcanzar la meta**. Es simple y no se puede abusar.
- Los hábitos con meta semanal (30 km a la semana) usan la frecuencia `weekly_total`: suman los registros de toda la semana y la meta es obligatoria.

**Se aplica en:** Fase 1.

## 3. Frecuencias diarias y semanales

**Solución:**
- Cuatro tipos: `daily`, `days_of_week` (por ejemplo lunes a viernes), `weekly_count` (N veces por semana) y `weekly_total` (una cantidad total a la semana, como 30 km).
- La **semana va de lunes a domingo**, en la zona horaria del usuario (`weekStart()` ya existe en `src/lib/dates.ts`).
- La regla "¿toca este hábito hoy?" se escribe una vez como función pura y se prueba con casos límite (cambio de semana, mes, año y de hora). En el servidor existe su equivalente en SQL para que rachas y rankings no dependan del navegador.
- La racha cuenta un día si se cumple al menos el 70 % de lo programado. Los hábitos `weekly_count` cuentan al cerrar la semana, no por día.

**Se aplica en:** Fase 1 (con pruebas automáticas).

## 4 y 5. Privacidad con RLS y que nadie vea datos privados

**Regla base:** RLS (seguridad por filas) activado en **todas** las tablas. Una tabla con RLS y sin política no deja pasar a nadie, así que todo lo permitido se escribe de forma explícita.

**Solución:**
- Cada hábito es `private` por defecto. El dueño decide cuáles ve cada amigo (`visibility = 'friends'`).
- Ejemplo de política (se probará en la Fase 1):

```sql
alter table habits enable row level security;

create policy "habits: el dueño lo gestiona todo"
  on habits for all
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "habits: amigos ven los compartidos"
  on habits for select
  using (visibility = 'friends' and public.are_friends(user_id, (select auth.uid())));
```

- `are_friends()` es una función del servidor que solo mira amistades `accepted`.
- **No existe un "listar usuarios".** Para añadir amigos se busca por código exacto mediante una función que devuelve solo id, nombre de usuario y avatar.
- El feed de actividad solo recibe eventos de hábitos compartidos, y su política vuelve a comprobarlo.
- El ranking lo calcula una función que devuelve únicamente el XP semanal de tus amigos aceptados.
- Las vistas se crean con `security_invoker = true` para que respeten las políticas de quien consulta.
- La clave `service_role` **nunca** va en el navegador ni en `.env.local`.
- **Pruebas:** lista de comprobación con dos cuentas (A y B): sin relación, amigos, bloqueados y hábito privado. B nunca debe ver nada privado de A.

**Se aplica en:** cada migración, desde la Fase 1.

## 6. Zonas horarias

**Solución:**
- Cada perfil guarda su zona (`timezone`, por ejemplo `Europe/Madrid`), detectada con `Intl` al registrarse.
- Un "día" es una **fecha** (`local_date`, tipo `date`), no un instante en UTC. Así el cambio de hora no rompe nada.
- La fecha de hoy la calcula el **servidor** con la zona del usuario; el navegador no manda la fecha. Evita trampas y desajustes de reloj. Ya aplicado al inicio de cada hábito (`habits.start_date`, migración 0002).
- **Decidido:** se puede marcar hoy y ayer, nada más antiguo. El navegador no manda la fecha, manda `0` (hoy) o `-1` (ayer) y el servidor calcula el día real con la zona horaria del perfil (`add_habit_progress`, migración 0003).
- Si el usuario cambia de zona, el cambio vale desde ese momento; los días pasados no se recalculan.
- Ya incluido: `src/lib/dates.ts` con `getUserTimezone`, `localDateString`, `localHour` y `weekStart`.

**Se aplica en:** Fase 1.

## 7. Copias de seguridad

Ver [COPIAS-SEGURIDAD.md](./COPIAS-SEGURIDAD.md).
