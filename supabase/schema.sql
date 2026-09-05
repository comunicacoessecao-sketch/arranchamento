-- =====================================================================
-- ARRANCHAMENTO - Estrutura do banco de dados
-- Cole este arquivo inteiro no SQL Editor do Supabase e clique em RUN.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tabela de militares
-- Cada militar cadastrado no sistema. O id e o mesmo do usuario criado
-- pelo sistema de login do Supabase (auth.users).
-- ---------------------------------------------------------------------
create table if not exists militares (
  id            uuid primary key references auth.users(id) on delete cascade,
  numero_guerra text unique not null,
  nome          text,
  posto_grad    text,
  categoria     text not null check (categoria in ('Oficial', 'Subten/Sgt', 'Cabo/Sd')),
  tipo_sd       text check (tipo_sd in ('EP', 'EV')),
  admin         boolean not null default false,
  ordem         integer,
  criado_em     timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Tabela de arranchamentos
-- Uma linha por militar / semana / dia.
-- "semana" guarda sempre a data da SEGUNDA-FEIRA daquela semana.
-- ---------------------------------------------------------------------
create table if not exists arranchamentos (
  id          uuid primary key default gen_random_uuid(),
  militar_id  uuid not null references militares(id) on delete cascade,
  semana      date not null,
  dia         text not null check (dia in ('seg','ter','qua','qui','sex','sab','dom')),
  cafe        boolean not null default false,
  almoco      boolean not null default false,
  janta       boolean not null default false,
  atualizado_em timestamptz not null default now(),
  unique (militar_id, semana, dia)
);

create index if not exists idx_arranchamentos_semana on arranchamentos (semana);

-- ---------------------------------------------------------------------
-- Seguranca (Row Level Security)
-- Sem isso, qualquer pessoa com o link conseguiria ler todos os dados.
-- ---------------------------------------------------------------------
alter table militares      enable row level security;
alter table arranchamentos enable row level security;

-- Funcao auxiliar: o usuario logado e administrador?
create or replace function eh_admin()
returns boolean
language sql
security definer
stable
as $$
  select coalesce((select admin from militares where id = auth.uid()), false);
$$;

-- --- Politicas da tabela militares ---

drop policy if exists "militar le o proprio cadastro" on militares;
create policy "militar le o proprio cadastro"
  on militares for select
  using (auth.uid() = id or eh_admin());

drop policy if exists "militar cria o proprio cadastro" on militares;
create policy "militar cria o proprio cadastro"
  on militares for insert
  with check (auth.uid() = id);

drop policy if exists "militar edita o proprio cadastro" on militares;
create policy "militar edita o proprio cadastro"
  on militares for update
  using (auth.uid() = id or eh_admin());

-- --- Politicas da tabela arranchamentos ---

drop policy if exists "le o proprio arranchamento" on arranchamentos;
create policy "le o proprio arranchamento"
  on arranchamentos for select
  using (auth.uid() = militar_id or eh_admin());

drop policy if exists "grava o proprio arranchamento" on arranchamentos;
create policy "grava o proprio arranchamento"
  on arranchamentos for insert
  with check (auth.uid() = militar_id);

drop policy if exists "atualiza o proprio arranchamento" on arranchamentos;
create policy "atualiza o proprio arranchamento"
  on arranchamentos for update
  using (auth.uid() = militar_id);

-- =====================================================================
-- DEPOIS DE CRIAR SEU PROPRIO CADASTRO NO SITE, rode o comando abaixo
-- trocando 123 pelo seu numero de guerra, para virar administrador:
--
--   update militares set admin = true where numero_guerra = '123';
-- =====================================================================
