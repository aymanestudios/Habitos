-- 0009_push.sql
-- Avisos al móvil (notificaciones push) de los recordatorios.
-- Se ejecuta UNA vez en el editor SQL de Supabase, después de 0001-0008.
--
-- Cómo funciona:
--   1. Cada dispositivo que activa los avisos guarda aquí su "suscripción" (una dirección a la que enviar).
--   2. Cada minuto, pg_cron llama a la función de servidor (Edge Function) send-reminders.
--   3. Esa función pide a la base de datos los recordatorios que ya tocan (claim_due_reminders)
--      y envía un aviso a cada dispositivo del usuario.
-- Las claves VAPID (para firmar los avisos) NO están aquí: van en los secretos de la Edge Function.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 1. SUSCRIPCIONES: una fila por dispositivo (móvil, ordenador...).
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  constraint push_endpoint_https check (endpoint like 'https://%' and char_length(endpoint) <= 1000),
  constraint push_keys_length check (char_length(p256dh) <= 200 and char_length(auth) <= 100)
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions: ver las propias"
  on public.push_subscriptions for select
  to authenticated
  using (user_id = (select auth.uid()));

-- Sin escritura directa: solo mediante las funciones de abajo.
revoke all on public.push_subscriptions from anon, authenticated;
grant select (id, endpoint, created_at) on public.push_subscriptions to authenticated;

-- 2. Guardar / quitar la suscripción de ESTE dispositivo.
create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if (select count(*) from public.push_subscriptions s where s.user_id = uid) >= 10 then
    -- Máximo 10 dispositivos: se borra el más antiguo
    delete from public.push_subscriptions s
    where s.id = (select s2.id from public.push_subscriptions s2 where s2.user_id = uid order by s2.created_at limit 1);
  end if;
  -- Si el mismo dispositivo ya estaba (por ejemplo con otra cuenta), pasa a ser de quien lo activa ahora
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
  values (uid, p_endpoint, p_p256dh, p_auth)
  on conflict (endpoint) do update
    set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth, created_at = now();
end;
$$;

create or replace function public.delete_push_subscription(p_endpoint text)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  delete from public.push_subscriptions s where s.endpoint = p_endpoint and s.user_id = auth.uid();
$$;

-- 3. Marca de "ya avisado" en cada recordatorio: guarda el due_at que se avisó.
--    Si el recordatorio se repite o lo pospones, due_at cambia y se volverá a avisar.
alter table public.reminders add column pushed_for timestamptz;

-- 4. RECORDATORIOS QUE YA TOCAN: los devuelve con las suscripciones de su dueño
--    y los marca como avisados en el mismo paso (así nunca se avisa dos veces).
--    Solo los de las últimas 24 h, para no mandar avisos viejos de golpe.
--    Solo la usa la Edge Function (con la clave de servicio).
create or replace function public.claim_due_reminders()
returns table (reminder_id uuid, title text, note text, endpoint text, p256dh text, auth text)
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  return query
  with due as (
    update public.reminders r
    set pushed_for = r.due_at
    where r.due_at <= now()
      and r.due_at > now() - interval '24 hours'
      and r.done_at is null
      and r.pushed_for is distinct from r.due_at
    returning r.id, r.user_id, r.title, r.note
  )
  select d.id, d.title, d.note, s.endpoint, s.p256dh, s.auth
  from due d
  join public.push_subscriptions s on s.user_id = d.user_id;
end;
$$;

-- La Edge Function borra los dispositivos que ya no existen (el navegador dio de baja la suscripción).
create or replace function public.forget_push_endpoint(p_endpoint text)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  delete from public.push_subscriptions s where s.endpoint = p_endpoint;
$$;

-- 5. SECRETO DEL CRON: una contraseña aleatoria guardada en Vault (cifrada).
--    pg_cron la envía a la Edge Function y esta la comprueba con verify_push_cron.
--    Nadie la escribe a mano ni sale en el código.
select vault.create_secret(encode(gen_random_bytes(32), 'hex'), 'push_cron_secret', 'Clave del cron de avisos')
where not exists (select 1 from vault.secrets where name = 'push_cron_secret');

create or replace function public.verify_push_cron(p_secret text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(p_secret, '') <> '' and exists (
    select 1 from vault.decrypted_secrets v where v.name = 'push_cron_secret' and v.decrypted_secret = p_secret
  );
$$;

-- 6. PERMISOS: la app solo puede guardar y quitar SU dispositivo.
--    Las funciones del envío solo las puede usar la clave de servicio (service_role).
revoke all on function public.save_push_subscription(text, text, text) from public, anon;
revoke all on function public.delete_push_subscription(text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text) to authenticated;
grant execute on function public.delete_push_subscription(text) to authenticated;

revoke all on function public.claim_due_reminders() from public, anon, authenticated;
revoke all on function public.forget_push_endpoint(text) from public, anon, authenticated;
revoke all on function public.verify_push_cron(text) from public, anon, authenticated;
grant execute on function public.claim_due_reminders() to service_role;
grant execute on function public.forget_push_endpoint(text) to service_role;
grant execute on function public.verify_push_cron(text) to service_role;

-- 7. CRON: cada minuto llama a la Edge Function send-reminders.
select cron.schedule(
  'send-reminders',
  '* * * * *',
  $cron$
  select net.http_post(
    url := 'https://gcuxnycrxunmrsbgfybi.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'push_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
  $cron$
);
