-- T-10 Invitaciones con recompensa: quien entra con tu enlace (?ref=<login>) te regala su cromo.

create table if not exists public.referrals (
  id bigint generated always as identity primary key,
  referrer_id uuid not null references auth.users (id) on delete cascade,
  invited_id uuid not null unique references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists referrals_referrer_idx on public.referrals (referrer_id);

alter table public.referrals enable row level security;
drop policy if exists referrals_read_own on public.referrals;
create policy referrals_read_own on public.referrals
  for select to authenticated using (referrer_id = (select auth.uid()));
revoke all on public.referrals from anon, authenticated;
grant select on public.referrals to authenticated;

-- Solo la service role la llama (desde el callback de login). Devuelve true si dio la recompensa.
create or replace function private.reward_referral(p_referrer_login text, p_new_user uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_referrer uuid;
  v_card bigint;
  v_rows int;
begin
  select user_id into v_referrer from public.cards where lower(login) = lower(p_referrer_login) limit 1;
  if v_referrer is null or v_referrer = p_new_user then return false; end if;

  select id into v_card from public.cards where user_id = p_new_user limit 1;
  if v_card is null then return false; end if;

  if (select count(*) from public.referrals where referrer_id = v_referrer) >= 50 then return false; end if;

  insert into public.referrals (referrer_id, invited_id) values (v_referrer, p_new_user)
  on conflict (invited_id) do nothing;
  get diagnostics v_rows = row_count;
  if v_rows = 0 then return false; end if;

  perform private.give_card(v_referrer, v_card);
  return true;
end;
$$;

revoke all on function private.reward_referral(text, uuid) from public, anon, authenticated;

-- PostgREST no expone el esquema private: envoltorio público que solo puede llamar la service role.
create or replace function public.reward_referral(p_referrer_login text, p_new_user uuid)
returns boolean
language sql
security definer
set search_path = ''
as $$ select private.reward_referral(p_referrer_login, p_new_user) $$;

revoke all on function public.reward_referral(text, uuid) from public, anon, authenticated;
grant execute on function public.reward_referral(text, uuid) to service_role;
