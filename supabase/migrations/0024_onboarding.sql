-- 0024_onboarding.sql
-- Tutorial de bienvenida: recuerda si cada persona ya lo ha visto (o saltado).
--   * Se guarda en su perfil, así vale en cualquier dispositivo y tras cerrar sesión.
--   * Los usuarios que YA existían se marcan como vistos: solo lo ven las cuentas nuevas.
--   * La app no puede escribir la columna directamente: solo con finish_onboarding(),
--     que marca únicamente el perfil de quien llama.
-- Se ejecuta UNA vez en el editor SQL de Supabase, después de 0001-0023.

alter table public.profiles add column if not exists onboarded_at timestamptz;

-- Cuentas existentes: ya conocen la app
update public.profiles set onboarded_at = now() where onboarded_at is null;

create or replace function public.finish_onboarding()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles
  set onboarded_at = coalesce(onboarded_at, now())
  where id = auth.uid();
$$;

revoke all on function public.finish_onboarding() from public, anon;
grant execute on function public.finish_onboarding() to authenticated;
