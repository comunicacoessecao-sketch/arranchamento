-- =====================================================================
-- ARRANCHAMENTO - Prazo de cada dia
--
-- Rode este arquivo no SQL Editor do Supabase depois dos anteriores.
--
-- Cada dia do periodo fecha as 13:30 da VESPERA — que e quando a seção
-- recolhe o papel para lancar na planilha entregue ao Rancho as 16h.
-- Disso decorre que hoje e o passado ja estao fechados, e que o dia de
-- amanha fecha hoje as 13:30.
--
-- A tela ja impede mexer em dia fechado. Isto aqui e a garantia de que a
-- regra vale mesmo se alguem tentar gravar por fora do site.
-- =====================================================================

-- Quantos dias depois da terça de abertura cai cada dia do periodo.
create or replace function deslocamento_do_dia(p_dia text)
returns integer
language sql
immutable
as $$
  select case p_dia
    when 'ter' then 0
    when 'qua' then 1
    when 'qui' then 2
    when 'sex' then 3
    when 'sab' then 4
    when 'dom' then 5
    when 'seg' then 6
  end;
$$;

-- Instante em que um dia do periodo deixa de aceitar alteracao.
create or replace function prazo_do_dia(p_semana date, p_dia text)
returns timestamptz
language sql
immutable
as $$
  select (
    ((p_semana + deslocamento_do_dia(p_dia) - 1) + time '13:30')
    at time zone 'America/Sao_Paulo'
  );
$$;

-- Recusa gravacao depois do prazo. O administrador escapa da regra, para
-- a seção conseguir corrigir algo a mao quando precisar.
create or replace function checar_prazo()
returns trigger
language plpgsql
as $$
begin
  if eh_admin() then
    return new;
  end if;
  if now() >= prazo_do_dia(new.semana, new.dia) then
    raise exception
      'O prazo de % (%) ja passou: cada dia fecha as 13:30 da vespera.',
      new.dia, new.semana + deslocamento_do_dia(new.dia)
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists arranchamentos_prazo on arranchamentos;
create trigger arranchamentos_prazo
  before insert or update on arranchamentos
  for each row execute function checar_prazo();
