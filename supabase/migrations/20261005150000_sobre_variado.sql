-- Sobre más variado: un mismo sobre no repite cromo mientras haya otros disponibles.
-- Si hay menos devs que cromos en el sobre, se permiten repetidos como antes.

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

  for i in 1..5 loop
    v_roll := random();
    v_target := case
      when v_roll < 0.005 then 'icono'
      when v_roll < 0.025 then 'legendaria'
      when v_roll < 0.105 then 'epica'
      when v_roll < 0.325 then 'rara'
      else 'comun'
    end;

    -- Primero un cromo de la rareza que tocó y que no haya salido ya en este sobre
    select c.id into v_pick
    from public.cards c
    where c.rarity = v_target and (not v_has_others or c.user_id <> v_uid)
      and not (c.id = any(v_ids))
    order by random()
    limit 1;

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
