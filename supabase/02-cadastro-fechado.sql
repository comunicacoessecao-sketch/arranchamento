-- =====================================================================
-- ARRANCHAMENTO - Fechar o cadastro
--
-- Rode este arquivo no SQL Editor do Supabase DEPOIS do schema.sql.
-- A partir daqui, so consegue criar acesso quem estiver na relacao de
-- numeros de guerra autorizados.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Relacao de quem pode se cadastrar.
--
-- "bloco" diz em que parte da planilha do Rancho a pessoa entra. E o que
-- separa CABOS de SD EP, coisa que a categoria sozinha nao distingue:
--   oficial    -> bloco 1 da relacao nominal
--   subtenSgt  -> bloco 1, depois do subtitulo SUBTEN/SGT
--   cabo       -> bloco 1, depois do subtitulo CABOS
--   sdEp       -> colunas SD EP (numero e nome)
--   sdEv       -> colunas SD EV (so o numero)
-- ---------------------------------------------------------------------
create table if not exists autorizados (
  numero_guerra text primary key,
  nome          text,
  posto_grad    text,
  categoria     text not null check (categoria in ('Oficial', 'Subten/Sgt', 'Cabo/Sd')),
  bloco         text not null check (bloco in ('oficial', 'subtenSgt', 'cabo', 'sdEp', 'sdEv')),
  criado_em     timestamptz not null default now()
);

-- O militar passa a guardar o bloco vindo da relacao, em vez de o sistema
-- tentar deduzir pelo posto.
alter table militares add column if not exists bloco text;

alter table militares
  drop constraint if exists militares_bloco_check;
alter table militares
  add constraint militares_bloco_check
  check (bloco is null or bloco in ('oficial', 'subtenSgt', 'cabo', 'sdEp', 'sdEv'));

-- ---------------------------------------------------------------------
-- Seguranca
--
-- A relacao NAO e legivel diretamente: ninguem consegue baixar a lista de
-- nomes da companhia. O site so conversa com ela por duas funcoes, que
-- respondem sobre um numero de guerra por vez.
-- ---------------------------------------------------------------------
alter table autorizados enable row level security;

-- Só o administrador enxerga e edita a relação.
drop policy if exists "admin le a relacao" on autorizados;
create policy "admin le a relacao"
  on autorizados for select
  using (eh_admin());

drop policy if exists "admin edita a relacao" on autorizados;
create policy "admin edita a relacao"
  on autorizados for all
  using (eh_admin())
  with check (eh_admin());

-- Diz se um numero de guerra esta autorizado. Usada tambem pela regra de
-- insercao abaixo, para que a checagem valha mesmo se alguem tentar criar
-- o cadastro por fora do site.
create or replace function eh_autorizado(numero text)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from autorizados where numero_guerra = btrim(numero)
  );
$$;

-- Devolve os dados de quem esta na relacao, para o site preencher a tela
-- de cadastro. Responde um numero por vez e nunca a lista inteira.
create or replace function dados_autorizado(numero text)
returns table (nome text, posto_grad text, categoria text, bloco text)
language sql
security definer
stable
as $$
  select a.nome, a.posto_grad, a.categoria, a.bloco
  from autorizados a
  where a.numero_guerra = btrim(numero);
$$;

revoke all on function eh_autorizado(text) from public;
revoke all on function dados_autorizado(text) from public;
grant execute on function eh_autorizado(text) to anon, authenticated;
grant execute on function dados_autorizado(text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- A regra que efetivamente fecha o cadastro.
-- ---------------------------------------------------------------------
drop policy if exists "militar cria o proprio cadastro" on militares;
create policy "militar cria o proprio cadastro"
  on militares for insert
  with check (auth.uid() = id and eh_autorizado(numero_guerra));

-- =====================================================================
-- Depois de rodar este arquivo, carregue a relacao. O comando
--
--     npm run autorizados
--
-- le o modelo em modelo/ e gera o arquivo supabase/autorizados.sql com os
-- INSERT prontos: e so abrir, conferir e colar aqui no SQL Editor.
-- =====================================================================
