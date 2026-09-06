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

1. Abra o link do site, clique em **Criar acesso** e cadastre-se. Cabos e
   soldados entram pelo número de guerra; sargentos e acima, pelo nome de
   guerra (ver "Quem pode se cadastrar").
2. Volte ao Supabase → **SQL Editor** e rode, trocando `123` pela sua
   identificação — o número, ou o nome de guerra em minúsculas e sem acento
   (`borges`, `letica.rangel`):

```sql
update militares set admin = true where identificador = '123';
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

**Para o militar:** abre o link no celular, entra com a identificação (número
de guerra, ou nome de guerra para sargento e acima) e a senha, marca as
refeições e toca em *Enviar*. Pode alterar e reenviar quantas vezes quiser até
o prazo.

**Para a seção:** o administrador abre o *Painel*, escolhe o dia e vê os totais
por categoria (Café / Almoço / Janta separados = etapas reduzidas; a soma =
etapa completa). O botão **Baixar planilha da semana** gera um `.xlsx` com uma
aba por dia, contendo a tabela de totais e a relação nominal com X.

O painel também lista quem ainda não respondeu, para a seção cobrar antes de
fechar a semana.

---

## O período de arranchamento

O período vai de **terça a segunda**, e a seção monta um papel novo toda
**segunda-feira**. Esse papel fica em circulação o período inteiro: sai às 10h,
volta às 14h, a seção passa os dados para a planilha do Rancho e entrega até as
16h — e o papel volta para a mesa. Isso se repete todo dia até a segunda
seguinte, quando nasce o papel do período novo.

O site segue a mesma lógica: **vira na segunda-feira** e deixa o período aberto
para alteração enquanto ele corre.

| Se hoje é | O militar edita |
|---|---|
| domingo 06/09 | terça 01/09 a segunda 07/09 |
| **segunda 07/09** | terça 08/09 a segunda 14/09 ← período novo |
| terça 08/09 | terça 08/09 a segunda 14/09 |
| … até domingo 13/09 | terça 08/09 a segunda 14/09 |
| **segunda 14/09** | terça 15/09 a segunda 21/09 ← período novo |

**A data vem do servidor**, não do relógio do aparelho. Um celular com a data
errada mandaria o arranchamento para o período errado; por isso o site pergunta
a data ao servidor (em horário de Brasília) antes de decidir o que mostrar. Se
o servidor não responder, ele usa o relógio do aparelho e avisa na tela.

O administrador vê o mesmo período no Painel, com **← Anterior** e
**Próxima →** para consultar ou baixar a planilha de qualquer período, inclusive
os já passados. Como a seção exporta todo dia por volta das 14h, o botão de
baixar a planilha pode ser usado quantas vezes for preciso — ele sempre reflete
o que está marcado naquele momento.

Para mudar o dia da virada, mexa em `inicioPeriodo()` e na ordem de `DIAS`, em
`lib/semana.js`.

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

Só quem estiver na tabela `autorizados`. O militar informa como se identifica,
o site confere na relação e, se achar, mostra o nome e o posto e pede apenas
uma senha — ele não digita mais os próprios dados.

**Como cada um se identifica:**

| Quem | Digita |
|---|---|
| Cabos e soldados (EP e EV) | o **número de guerra** — 106, 231, 409… |
| Sargentos, subtenentes e oficiais | o **nome de guerra** — BORGES, GOESTEMEIER… |

Isso porque de sargento para cima não existe número de guerra. O que fica
gravado é uma forma reduzida do que foi digitado (minúsculas, sem acento,
espaços viram ponto), então "Letíca Rangel", "LETICA RANGEL" e "letica rangel"
dão todos em `letica.rangel` — o militar não precisa acertar a grafia exata.

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

O gerador avisa se dois militares dessem no mesmo identificador (dois BORGES
sem número, por exemplo). Nesse caso só o primeiro entra, e o outro fica
listado num comentário no fim do arquivo para você diferenciar à mão.

**Para incluir alguém depois** (militar novo na companhia), no SQL Editor:

```sql
insert into autorizados (identificador, numero_guerra, nome, posto_grad, categoria, bloco, ordem)
values ('borges', null, 'BORGES', '3º SGT', 'Subten/Sgt', 'subtenSgt', 20);
```

Para um soldado, o identificador é o próprio número:

```sql
insert into autorizados (identificador, numero_guerra, nome, posto_grad, categoria, bloco, ordem)
values ('231', '231', 'LEONAN', 'SD', 'Cabo/Sd', 'sdEp', 62);
```

O `bloco` diz em que parte da planilha a pessoa entra: `oficial`, `subtenSgt`,
`cabo`, `sdEp` ou `sdEv`. O `ordem` é a posição na relação nominal — é o que
mantém oficiais e graduados na precedência de posto, já que eles não têm
número para ordenar.

**Para tirar alguém** que saiu da companhia:

```sql
delete from autorizados where identificador = 'borges';
```

Isso impede novos cadastros, mas não apaga quem já tem acesso — para isso,
Supabase → **Authentication** → **Users** → **Delete user**.

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
