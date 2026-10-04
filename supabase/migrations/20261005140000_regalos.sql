-- Regalar repetidas: un cambio sin cromo pedido (want_card_id nulo).
-- Lo acepta la primera persona que no tenga ese cromo. Quien regala no recibe nada.

alter table public.trades alter column want_card_id drop not null;

-- Crea un regalo con una repetida tuya y devuelve el código del enlace.
create or replace function public.create_gift(p_offer bigint)
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

  select quantity into v_qty from public.collection
  where user_id = v_uid and card_id = p_offer;
  if coalesce(v_qty, 0) < 2 then
    raise exception 'Solo puedes ofrecer cromos repetidos' using errcode = 'P0001';
  end if;

  select count(*) into v_open from public.trades
  where from_user = v_uid and status = 'abierto';
  if v_open >= 20 then
    raise exception 'Tienes demasiados cambios abiertos' using errcode = 'P0001';
  end if;

  v_code := substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
  insert into public.trades (code, from_user, offer_card_id, want_card_id)
  values (v_code, v_uid, p_offer, null);
  return v_code;
end;
$$;

-- Aceptar: igual que antes para cambios; para regalos solo pasa el cromo.
create or replace function public.accept_trade(p_code text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_trade public.trades%rowtype;
  v_qty integer;
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

  if v_trade.want_card_id is null then
    -- Regalo: solo para quien no lo tiene, y quien regala debe seguir teniéndolo repetido
    if exists (select 1 from public.collection where user_id = v_uid and card_id = v_trade.offer_card_id) then
      raise exception 'Ya tienes ese cromo' using errcode = 'P0001';
    end if;
    select quantity into v_qty from public.collection
    where user_id = v_trade.from_user and card_id = v_trade.offer_card_id;
    if coalesce(v_qty, 0) < 2 then
      raise exception 'Ese cambio ya no está disponible' using errcode = 'P0001';
    end if;
    perform private.take_card(v_trade.from_user, v_trade.offer_card_id);
    perform private.give_card(v_uid, v_trade.offer_card_id);
  else
    -- take_card lanza un error si alguien ya no tiene el cromo.
    perform private.take_card(v_trade.from_user, v_trade.offer_card_id);
    perform private.take_card(v_uid, v_trade.want_card_id);
    perform private.give_card(v_uid, v_trade.offer_card_id);
    perform private.give_card(v_trade.from_user, v_trade.want_card_id);
  end if;

  update public.trades
  set status = 'hecho', accepted_by = v_uid, closed_at = now()
  where id = v_trade.id;
end;
$$;

revoke all on function public.create_gift(bigint) from public, anon;
grant execute on function public.create_gift(bigint) to authenticated;
revoke all on function public.accept_trade(text) from public, anon;
grant execute on function public.accept_trade(text) to authenticated;

-- El dueño del proyecto (@joelnbl) tiene la carta Icono. Necesita la migración de Icono antes.
update public.cards set rarity = 'icono' where lower(login) = 'joelnbl';
