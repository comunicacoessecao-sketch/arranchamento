# Arranchamento — Seção de Comunicações

Site para os militares informarem as refeições da semana e a seção gerar a
planilha do Rancho automaticamente.

> **Não é preciso instalar nada no seu computador.** São três contas gratuitas:
> Supabase guarda os dados, GitHub guarda o código e a Vercel põe o site no ar.
> Leva uns 20 minutos.

---

## Passo 1 — Criar o banco de dados (Supabase)

1. Entre em https://supabase.com e crie uma conta gratuita.
2. Clique em **New project**. Dê um nome (ex: `arranchamento`), escolha uma
   senha para o banco e a região **South America (São Paulo)**.
3. Espere o projeto ficar pronto (leva 1-2 minutos).
4. No menu lateral, abra **SQL Editor** → **New query**.
5. Abra o arquivo `supabase/schema.sql` deste projeto, copie tudo, cole no
   editor e clique em **Run**. Isso cria as tabelas e as regras de segurança.
   Depois repita com `supabase/02-cadastro-fechado.sql`, que fecha o cadastro
   à relação da seção — os detalhes estão em "Quem pode se cadastrar".
6. Ainda no Supabase, vá em **Authentication** → **Providers** → **Email** e
   **desligue** a opção *Confirm email*. Sem isso o militar precisaria confirmar
   um e-mail que não existe.
7. Vá em **Project Settings** → **API** e copie dois valores para um bloco de
   notas — você vai colar os dois no Passo 3:
   - **Project URL**
   - **anon public** key

## Passo 2 — Guardar o código no GitHub

1. Crie uma conta em https://github.com.
2. Clique em **New repository**. Nome: `arranchamento`. Marque **Private**.
   **Não** marque "Add a README file". Clique em **Create repository**.
3. Na tela seguinte, clique em **uploading an existing file**.
4. Abra a pasta `arranchamento` no Windows, selecione **tudo que está dentro
   dela** (Ctrl+A) e arraste para dentro da página do GitHub.

   ⚠️ Arraste o **conteúdo** da pasta, não a pasta. No fim, o `package.json`
   tem que aparecer na primeira tela do repositório. Se aparecer uma pasta
   `arranchamento` dentro do repositório, o Passo 3 não vai funcionar.
5. Clique em **Commit changes**.

## Passo 3 — Colocar no ar (Vercel)

1. Entre em https://vercel.com e clique em **Continue with GitHub**.
2. Clique em **Add New** → **Project** e escolha o repositório `arranchamento`.
3. Abra **Environment Variables** e cadastre as duas variáveis, copiando os
   nomes exatamente assim:

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | o *Project URL* do Passo 1 |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | a *anon public key* do Passo 1 |

4. Clique em **Deploy** e espere terminar (1-3 minutos). No fim a Vercel mostra
   um endereço do tipo `arranchamento.vercel.app` — **esse é o link do site**.

Daí em diante, toda alteração enviada ao GitHub republica o site sozinho.

## Passo 4 — Virar administrador

1. Abra o link do site, clique em **Criar acesso** e cadastre-se com o seu
   número de guerra.
2. Volte ao Supabase → **SQL Editor** e rode (trocando `123` pelo seu número):

```sql
update militares set admin = true where numero_guerra = '123';
```

3. Recarregue o site. O link **Painel** vai aparecer.

Pronto — agora é só repassar o link para a seção.

## Rodar no seu computador (opcional)

Só é necessário se você quiser testar alterações antes de publicar. Exige o
Node.js instalado (https://nodejs.org, versão LTS).

```bash
npm install
cp .env.local.example .env.local
```

Abra o `.env.local`, cole os dois valores do Passo 1 e rode:

```bash
npm run dev
```

Acesse http://localhost:3000

---

## Como funciona no dia a dia

**Para o militar:** abre o link no celular, entra com número de guerra e senha,
marca as refeições e toca em *Enviar*. Pode alterar e reenviar quantas vezes
quiser até o prazo.

**Para a seção:** o administrador abre o *Painel*, escolhe o dia e vê os totais
por categoria (Café / Almoço / Janta separados = etapas reduzidas; a soma =
etapa completa). O botão **Baixar planilha da semana** gera um `.xlsx` com uma
aba por dia, contendo a tabela de totais e a relação nominal com X.

O painel também lista quem ainda não respondeu, para a seção cobrar antes de
fechar a semana.

---

## Identidade visual

O site usa azul-noite com detalhes em dourado e os motivos da Arma de
Comunicações (raios e ondas de rádio).

**Para colocar o distintivo oficial:** salve a imagem como `public/emblema.png`
(PNG quadrado, fundo transparente, 256x256 ou maior). Ela passa a aparecer
sozinha na tela de login e no cabeçalho — não é preciso mexer em código.
Sem esse arquivo, o site mostra um emblema desenhado como substituto.

Para mudar as cores, edite `tailwind.config.js` (paletas `noite` e `ouro`).

## A planilha do Rancho

O botão **Baixar planilha da semana** gera um `.xlsx` com **uma aba por dia**
(SEG a DOM), no mesmo desenho do formulário oficial (`modelo/04 ARR SETEMBRO.ods`):

- cabeçalho com a seção, a companhia, o dia da semana e a data;
- quadro de **etapas reduzidas** (Café / Almoço / Jantar por categoria) e
  **etapas completas**, com a soma;
- linha do "Quartel em ..." e as assinaturas do Furriel e do Cmt SU;
- relação nominal em cinco blocos, como no papel:
  coluna A = oficiais, subten/sgt e cabos; colunas E–I = SD EP (número e nome);
  colunas J–M, N–Q e R–U = SD EV (só o número). Linhas sem ninguém saem
  inutilizadas com `///////`.

Os dados da OM (seção, companhia, cidade, quem assina) ficam em `lib/modelo.js`
— é lá que se muda, não no código do export.

**Campos que o site não tem** e continuam para preencher à mão: *Outra OM*,
*QT Ativos*, *Complementos* e *C Esc*.

**Cabo ou soldado?** Quem é cabo e quem é SD EP fica em blocos diferentes da
planilha. Essa classificação vem pronta da relação de autorizados (coluna
`bloco`), gravada no militar no momento do cadastro — não é deduzida do que
ele digita.

## Quem pode se cadastrar

Só quem estiver na tabela `autorizados`. O militar informa o número de guerra,
o site confere na relação e, se achar, mostra o nome e o posto e pede apenas
uma senha — ele não digita mais os próprios dados.

**Para ligar isso** (uma vez só, num projeto que já rodou o `schema.sql`):

1. Supabase → **SQL Editor** → cole e rode o `supabase/02-cadastro-fechado.sql`.
2. No seu computador, gere a relação a partir do modelo do Rancho:

```bash
npm run autorizados
```

   Isso cria `supabase/autorizados.sql`. O arquivo **não vai para o GitHub** —
   tem os nomes reais da companhia, e não há motivo para eles ficarem gravados
   no histórico do repositório. Ele fica só na sua máquina; se precisar de
   novo, é só rodar o comando outra vez.

3. Abra o arquivo, confira a relação e cole no SQL Editor.

**Oficiais e graduados precisam de atenção.** A planilha do Rancho lista essa
turma só por posto e nome de guerra — o número não está lá. Eles saem num
bloco comentado no fim do arquivo, com `'NUMERO'` no lugar do número. Preencha,
descomente e rode. Enquanto isso não for feito, eles não conseguem criar acesso.

**Para incluir alguém depois** (militar novo na companhia), no SQL Editor:

```sql
insert into autorizados (numero_guerra, nome, posto_grad, categoria, bloco)
values ('231', 'BORGES', '3º SGT', 'Subten/Sgt', 'subtenSgt');
```

O `bloco` diz em que parte da planilha a pessoa entra: `oficial`, `subtenSgt`,
`cabo`, `sdEp` ou `sdEv`.

**Para tirar alguém** que saiu da companhia:

```sql
delete from autorizados where numero_guerra = '231';
```

Isso impede novos cadastros com esse número, mas não apaga quem já tem acesso —
para isso, Supabase → **Authentication** → **Users** → **Delete user**.

## Observações de segurança

- As senhas são gerenciadas pelo sistema de autenticação do Supabase, ou seja,
  ficam criptografadas — nem o administrador vê a senha de ninguém.
- As regras (RLS) no banco garantem que cada militar só enxerga o próprio
  arranchamento; apenas quem tem `admin = true` lê os dados de toda a seção.
- O cadastro é fechado: só cria acesso quem está na relação de autorizados.
  A regra vale no banco, não só na tela — nem por fora do site dá para burlar.
- A relação não é legível: ninguém consegue baixar a lista de nomes da
  companhia. O site pergunta por um número de guerra de cada vez, através de
  uma função. Quem chutar um número válido vê o nome correspondente; é o preço
  de o militar não precisar digitar os próprios dados.
