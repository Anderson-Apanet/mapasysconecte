-- Função para buscar dados dos usuários do auth schema
create or replace function public.get_auth_users()
returns table (
  id uuid,
  email text,
  last_sign_in_at timestamptz,
  email_confirmed_at timestamptz,
  phone text,
  created_at timestamptz,
  updated_at timestamptz,
  is_super_admin boolean,
  raw_user_meta_data jsonb,
  banned_until timestamptz,
  deleted_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select 
    au.id,
    au.email,
    au.last_sign_in_at,
    au.email_confirmed_at,
    au.phone,
    au.created_at,
    au.updated_at,
    au.is_super_admin,
    au.raw_user_meta_data,
    au.banned_until,
    au.deleted_at
  from auth.users au;
end;
$$;
