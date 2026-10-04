-- Cromos de devs: esquema inicial.
-- Cartas (una por persona registrada), colección, sobres diarios y cambios.

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

create table public.cards (
  id bigint generated always as identity primary key,
  user_id uuid not null unique references auth.users (id) on delete cascade,
  github_id bigint not null unique,
  login text not null unique,
  name text,
  avatar_url text,
  bio text,
  country text check (country is null or country ~ '^[A-Z]{2}$'),
  top_language text,
  stars integer not null default 0 check (stars >= 0),
  followers integer not null default 0 check (followers >= 0),
  public_repos integer not null default 0 check (public_repos >= 0),
  commits integer not null default 0 check (commits >= 0),
  top_repos jsonb not null default '[]'::jsonb,
  github_created_at timestamptz,
  rarity text not null default 'comun'
    check (rarity in ('comun', 'rara', 'epica', 'legendaria')),
  owners integer not null default 0 check (owners >= 0),
  refreshed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index cards_rarity_idx on public.cards (rarity);
create index cards_top_language_idx on public.cards (top_language);
create index cards_country_idx on public.cards (country);

create table public.collection (
  user_id uuid not null references auth.users (id) on delete cascade,
  card_id bigint not null references public.cards (id) on delete cascade,
  quantity integer not null default 1 check (quantity >= 1),
  first_at timestamptz not null default now(),
  primary key (user_id, card_id)
);

create index collection_card_idx on public.collection (card_id);

create table public.pack_openings (
  user_id uuid not null references auth.users (id) on delete cascade,
  opened_on date not null default (now() at time zone 'utc')::date,
  card_ids bigint[] not null,
  created_at timestamptz not null default now(),
  primary key (user_id, opened_on)
);

create table public.trades (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  from_user uuid not null references auth.users (id) on delete cascade,
  offer_card_id bigint not null references public.cards (id) on delete cascade,
  want_card_id bigint not null references public.cards (id) on delete cascade,
  status text not null default 'abierto'
    check (status in ('abierto', 'hecho', 'cancelado')),
  accepted_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  check (offer_card_id <> want_card_id)
);

create index trades_from_user_idx on public.trades (from_user);
create index trades_open_idx on public.trades (status, created_at desc);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.cards enable row level security;
alter table public.collection enable row level security;
alter table public.pack_openings enable row level security;
alter table public.trades enable row level security;

-- Las cartas son públicas: solo existen las de quien se registró.
create policy "cards are public" on public.cards
  for select to anon, authenticated using (true);

-- Cada persona solo puede cambiar el país de su propia carta (ver GRANT).
create policy "own card country" on public.cards
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "own collection" on public.collection
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "own pack openings" on public.pack_openings
  for select to authenticated using ((select auth.uid()) = user_id);

-- Los cambios son ofertas públicas: cualquiera con sesión puede aceptarlas.
create policy "trades are public" on public.trades
  for select to anon, authenticated using (true);

-- Permisos explícitos por si la API de datos no expone tablas nuevas.
revoke all on public.cards, public.collection, public.pack_openings, public.trades from anon, authenticated;
grant select on public.cards, public.trades to anon, authenticated;
grant select on public.collection, public.pack_openings to authenticated;
grant update (country) on public.cards to authenticated;

-- ---------------------------------------------------------------------------
-- Funciones internas (no expuestas)
-- ---------------------------------------------------------------------------

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.give_card(p_user uuid, p_card bigint)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_new boolean;
begin
  insert into public.collection (user_id, card_id, quantity)
  values (p_user, p_card, 1)
  on conflict (user_id, card_id)
    do update set quantity = public.collection.quantity + 1
  returning (xmax = 0) into v_new;

  if v_new then
    update public.cards set owners = owners + 1 where id = p_card;
  end if;
  return v_new;
end;
$$;

create or replace function private.take_card(p_user uuid, p_card bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_qty integer;
begin
  select quantity into v_qty
  from public.collection
  where user_id = p_user and card_id = p_card
  for update;

  if v_qty is null then
    raise exception 'No tienes ese cromo' using errcode = 'P0001';
  elsif v_qty > 1 then
    update public.collection set quantity = quantity - 1
    where user_id = p_user and card_id = p_card;
  else
    delete from public.collection where user_id = p_user and card_id = p_card;
    update public.cards set owners = greatest(owners - 1, 0) where id = p_card;
  end if;
end;
$$;

revoke all on function private.give_card(uuid, bigint) from public, anon, authenticated;
revoke all on function private.take_card(uuid, bigint) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Acciones del juego (llamables con sesión iniciada)
-- ---------------------------------------------------------------------------

-- Abre el sobre del día: 5 cromos al azar ponderados por rareza.
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

  -- Bloquea un segundo sobre el mismo día (también ante peticiones simultáneas).
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
      when v_roll < 0.02 then 'legendaria'
      when v_roll < 0.10 then 'epica'
      when v_roll < 0.32 then 'rara'
      else 'comun'
    end;

    select c.id into v_pick
    from public.cards c
    where c.rarity = v_target and (not v_has_others or c.user_id <> v_uid)
    order by random()
    limit 1;

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

-- Crea una oferta de cambio: das un repetido y pides otro cromo.
create or replace function public.create_trade(p_offer bigint, p_want bigint)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_qty integer;
  v_code text;
  v_open integer;
begin
  if v_uid is null then
    raise exception 'Necesitas entrar con GitHub' using errcode = '42501';
  end if;
  if p_offer = p_want then
    raise exception 'Elige dos cromos distintos' using errcode = 'P0001';
  end if;

  select quantity into v_qty from public.collection
  where user_id = v_uid and card_id = p_offer;
  if coalesce(v_qty, 0) < 2 then
    raise exception 'Solo puedes ofrecer cromos repetidos' using errcode = 'P0001';
  end if;

  if not exists (select 1 from public.cards where id = p_want) then
    raise exception 'Ese cromo no existe' using errcode = 'P0001';
  end if;

  select count(*) into v_open from public.trades
  where from_user = v_uid and status = 'abierto';
  if v_open >= 20 then
    raise exception 'Tienes demasiados cambios abiertos' using errcode = 'P0001';
  end if;

  v_code := substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
  insert into public.trades (code, from_user, offer_card_id, want_card_id)
  values (v_code, v_uid, p_offer, p_want);
  return v_code;
end;
$$;

-- Acepta un cambio: recibes el cromo ofrecido y entregas el pedido.
create or replace function public.accept_trade(p_code text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_trade public.trades%rowtype;
begin
  if v_uid is null then
    raise exception 'Necesitas entrar con GitHub' using errcode = '42501';
  end if;

  select * into v_trade from public.trades where code = p_code for update;
  if v_trade.id is null then
    raise exception 'Ese cambio no existe' using errcode = 'P0001';
  end if;
  if v_trade.status <> 'abierto' then
    raise exception 'Ese cambio ya no está disponible' using errcode = 'P0001';
  end if;
  if v_trade.from_user = v_uid then
    raise exception 'No puedes aceptar tu propio cambio' using errcode = 'P0001';
  end if;

  -- take_card lanza un error si alguien ya no tiene el cromo.
  perform private.take_card(v_trade.from_user, v_trade.offer_card_id);
  perform private.take_card(v_uid, v_trade.want_card_id);
  perform private.give_card(v_uid, v_trade.offer_card_id);
  perform private.give_card(v_trade.from_user, v_trade.want_card_id);

  update public.trades
  set status = 'hecho', accepted_by = v_uid, closed_at = now()
  where id = v_trade.id;
end;
$$;

create or replace function public.cancel_trade(p_code text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Necesitas entrar con GitHub' using errcode = '42501';
  end if;
  update public.trades
  set status = 'cancelado', closed_at = now()
  where code = p_code and from_user = auth.uid() and status = 'abierto';
end;
$$;

revoke all on function public.open_daily_pack() from public, anon;
revoke all on function public.create_trade(bigint, bigint) from public, anon;
revoke all on function public.accept_trade(text) from public, anon;
revoke all on function public.cancel_trade(text) from public, anon;
grant execute on function public.open_daily_pack() to authenticated;
grant execute on function public.create_trade(bigint, bigint) to authenticated;
grant execute on function public.accept_trade(text) to authenticated;
grant execute on function public.cancel_trade(text) to authenticated;
