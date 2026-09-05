-- =====================================================================
-- ARRANCHAMENTO - Fechar o cadastro
--
-- Rode este arquivo no SQL Editor do Supabase DEPOIS do schema.sql.
-- A partir daqui, so consegue criar acesso quem estiver na relacao.
--
-- IMPORTANTE - como cada um se identifica:
--   Cabos e soldados       -> numero de guerra (106, 231, 409...)
--   Sargentos e acima      -> nome de guerra (BORGES, GOESTEMEIER...)
-- porque de sargento para cima nao existe numero de guerra.
--
-- Por isso a chave da relacao e o "identificador", e nao o numero. Ele e
-- guardado em forma reduzida (minusculas, sem acento, espacos viram ponto):
-- "Letíca Rangel" e "LETICA RANGEL" viram os dois "letica.rangel".
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
--
-- "numero_guerra" fica vazio para sargentos e acima — eles nao tem.
-- ---------------------------------------------------------------------
create table if not exists autorizados (
  identificador text primary key,
  numero_guerra text,
  nome          text,
  posto_grad    text,
  categoria     text not null check (categoria in ('Oficial', 'Subten/Sgt', 'Cabo/Sd')),
  bloco         text not null check (bloco in ('oficial', 'subtenSgt', 'cabo', 'sdEp', 'sdEv')),
  -- Posicao na relacao do formulario: e o que mantem oficiais e graduados
  -- na ordem de precedencia, ja que eles nao tem numero para ordenar.
  ordem         integer,
  criado_em     timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Ajustes na tabela de militares
-- ---------------------------------------------------------------------

-- Como quem se identifica pelo nome de guerra nao tem numero, o numero
-- deixa de ser obrigatorio e entra o identificador no lugar dele.
alter table militares add column if not exists identificador text;
alter table militares add column if not exists bloco text;
alter table militares alter column numero_guerra drop not null;

-- Quem ja se cadastrou antes disso usou o numero como identificador.
update militares set identificador = numero_guerra where identificador is null;

create unique index if not exists militares_identificador_idx
  on militares (identificador);

alter table militares drop constraint if exists militares_bloco_check;
alter table militares
  add constraint militares_bloco_check
  check (bloco is null or bloco in ('oficial', 'subtenSgt', 'cabo', 'sdEp', 'sdEv'));

-- ---------------------------------------------------------------------
-- Seguranca
--
-- A relacao NAO e legivel: ninguem consegue baixar a lista de nomes da
-- companhia. O site so conversa com ela por duas funcoes, que respondem
-- sobre um identificador por vez.
-- ---------------------------------------------------------------------
alter table autorizados enable row level security;

drop policy if exists "admin le a relacao" on autorizados;
create policy "admin le a relacao"
  on autorizados for select
  using (eh_admin());

drop policy if exists "admin edita a relacao" on autorizados;
create policy "admin edita a relacao"
  on autorizados for all
  using (eh_admin())
  with check (eh_admin());

-- Diz se um identificador esta autorizado. Usada tambem pela regra de
-- insercao abaixo, para que a checagem valha mesmo se alguem tentar criar
-- o cadastro por fora do site.
create or replace function eh_autorizado(ident text)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from autorizados where identificador = btrim(ident)
  );
$$;

-- Devolve os dados de quem esta na relacao, para o site preencher a tela
-- de cadastro. Responde um por vez e nunca a lista inteira.
create or replace function dados_autorizado(ident text)
returns table (
  numero_guerra text,
  nome text,
  posto_grad text,
  categoria text,
  bloco text,
  ordem integer
)
language sql
security definer
stable
as $$
  select a.numero_guerra, a.nome, a.posto_grad, a.categoria, a.bloco, a.ordem
  from autorizados a
  where a.identificador = btrim(ident);
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
  with check (auth.uid() = id and eh_autorizado(identificador));

-- =====================================================================
-- Depois de rodar este arquivo, carregue a relacao. O comando
--
--     npm run autorizados
--
-- le o modelo em modelo/ e gera o arquivo supabase/autorizados.sql com os
-- INSERT prontos: e so abrir, conferir e colar aqui no SQL Editor.
--
-- Para virar administrador depois de criar seu acesso no site
-- (use o identificador: o numero, ou o nome de guerra em minusculas):
--
--     update militares set admin = true where identificador = 'borges';
-- =====================================================================
