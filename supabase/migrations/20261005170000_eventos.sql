-- T-13 Evento del día: el dueño crea una fila en pack_events (desde el panel de Supabase)
-- y el sobre de ese día (UTC) cambia: 'boost' triplica épica/legendaria/icono,
-- 'country' y 'language' hacen que cada cromo prefiera ese país / lenguaje.

create table if not exists public.pack_events (
  day date primary key,
  kind text not null check (kind in ('boost', 'country', 'language')),
  value text,
  created_at timestamptz not null default now()
);

alter table public.pack_events enable row level security;

drop policy if exists "pack events are public" on public.pack_events;
create policy "pack events are public" on public.pack_events
  for select to anon, authenticated using (true);

grant select on public.pack_events to anon, authenticated;

create or replace function public.open_daily_pack()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_today date := (now() at time zone 'utc')::date;
  v_has_others boolean;
  v_pick bigint;
  v_target text;
  v_roll double precision;
  v_ids bigint[] := '{}';
  v_result jsonb := '[]'::jsonb;
  v_new boolean;
  v_kind text;
  v_value text;
  v_pref_country text;
  v_pref_lang text;
  i integer;
begin
  if v_uid is null then
    raise exception 'Necesitas entrar con GitHub' using errcode = '42501';
  end if;

  if not exists (select 1 from public.cards where user_id = v_uid) then
    raise exception 'Todavía no tienes cromo' using errcode = 'P0001';
  end if;

  insert into public.pack_openings (user_id, opened_on, card_ids)
  values (v_uid, v_today, '{}')
  on conflict do nothing;
  if not found then
    raise exception 'Ya abriste el sobre de hoy' using errcode = 'P0001';
  end if;

  select exists (select 1 from public.cards where user_id <> v_uid) into v_has_others;

  select e.kind, e.value into v_kind, v_value from public.pack_events e where e.day = v_today;
  if v_kind = 'country' then v_pref_country := upper(v_value); end if;
  if v_kind = 'language' then v_pref_lang := v_value; end if;

  for i in 1..5 loop
    v_roll := random();
    if v_kind = 'boost' then
      v_target := case
        when v_roll < 0.015 then 'icono'
        when v_roll < 0.075 then 'legendaria'
        when v_roll < 0.315 then 'epica'
        when v_roll < 0.5 then 'rara'
        else 'comun'
      end;
    else
      v_target := case
        when v_roll < 0.005 then 'icono'
        when v_roll < 0.025 then 'legendaria'
        when v_roll < 0.105 then 'epica'
        when v_roll < 0.325 then 'rara'
        else 'comun'
      end;
    end if;

    v_pick := null;
    -- Con evento de país o lenguaje, el primer intento prefiere esas cartas
    if v_pref_country is not null or v_pref_lang is not null then
      select c.id into v_pick
      from public.cards c
      where c.rarity = v_target and (not v_has_others or c.user_id <> v_uid)
        and not (c.id = any(v_ids))
        and ((v_pref_country is not null and c.country = v_pref_country)
          or (v_pref_lang is not null and c.top_language = v_pref_lang))
      order by random()
      limit 1;

      if v_pick is null then
        select c.id into v_pick
        from public.cards c
        where (not v_has_others or c.user_id <> v_uid) and not (c.id = any(v_ids))
          and ((v_pref_country is not null and c.country = v_pref_country)
            or (v_pref_lang is not null and c.top_language = v_pref_lang))
        order by random()
        limit 1;
      end if;
    end if;

    -- Primero un cromo de la rareza que tocó y que no haya salido ya en este sobre
    if v_pick is null then
      select c.id into v_pick
      from public.cards c
      where c.rarity = v_target and (not v_has_others or c.user_id <> v_uid)
        and not (c.id = any(v_ids))
      order by random()
      limit 1;
    end if;

    if v_pick is null then
      select c.id into v_pick
      from public.cards c
      where (not v_has_others or c.user_id <> v_uid) and not (c.id = any(v_ids))
      order by random()
      limit 1;
    end if;

    if v_pick is null then
      select c.id into v_pick
      from public.cards c
      where (not v_has_others or c.user_id <> v_uid)
      order by random()
      limit 1;
    end if;

    exit when v_pick is null;

    v_new := private.give_card(v_uid, v_pick);
    v_ids := v_ids || v_pick;
    v_result := v_result || jsonb_build_object('card_id', v_pick, 'is_new', v_new);
  end loop;

  update public.pack_openings set card_ids = v_ids
  where user_id = v_uid and opened_on = v_today;

  return v_result;
end;
$$;

revoke all on function public.open_daily_pack() from public, anon;
grant execute on function public.open_daily_pack() to authenticated;
