-- 0010_vapid_vault.sql
-- Claves VAPID de los avisos guardadas en Vault (cifradas), generadas por la propia Edge Function.
-- Así nadie tiene que copiar la clave privada a mano: no está en Render, ni en .env, ni en GitHub.
-- Se ejecuta UNA vez en el editor SQL de Supabase, después de 0001-0009.

-- 1. Guardar las claves (solo la primera vez). Solo la Edge Function (service_role).
create or replace function public.store_vapid_keys(p_public text, p_private text)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from vault.secrets where name = 'vapid_private_key') then
    return false; -- ya había claves: no se cambian (si cambiaran, los dispositivos dejarían de recibir avisos)
  end if;
  perform vault.create_secret(p_public, 'vapid_public_key', 'Clave pública VAPID (avisos)');
  perform vault.create_secret(p_private, 'vapid_private_key', 'Clave privada VAPID (avisos)');
  return true;
exception
  when unique_violation then
    return false; -- otra ejecución las guardó a la vez
end;
$$;

-- 2. Leer las dos claves. Solo la Edge Function (service_role).
create or replace function public.get_vapid_keys()
returns table (public_key text, private_key text)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select v.decrypted_secret from vault.decrypted_secrets v where v.name = 'vapid_public_key'),
    (select v.decrypted_secret from vault.decrypted_secrets v where v.name = 'vapid_private_key')
  where exists (select 1 from vault.secrets s where s.name = 'vapid_private_key');
$$;

-- 3. La clave PÚBLICA para la app (es pública por diseño: el navegador la necesita para apuntarse).
create or replace function public.get_vapid_public_key()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select v.decrypted_secret from vault.decrypted_secrets v where v.name = 'vapid_public_key';
$$;

-- 4. PERMISOS
revoke all on function public.store_vapid_keys(text, text) from public, anon, authenticated;
revoke all on function public.get_vapid_keys() from public, anon, authenticated;
revoke all on function public.get_vapid_public_key() from public, anon;
grant execute on function public.store_vapid_keys(text, text) to service_role;
grant execute on function public.get_vapid_keys() to service_role;
grant execute on function public.get_vapid_public_key() to authenticated;
