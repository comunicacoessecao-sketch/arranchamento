// Le a planilha do Rancho em modelo/ e monta o SQL que carrega a relacao
// de quem pode se cadastrar no site.
//
//   npm run autorizados
//
// O arquivo gerado (supabase/autorizados.sql) tem nomes reais da companhia
// e por isso fica fora do Git. E so abrir, conferir e colar no SQL Editor
// do Supabase. Se precisar de novo, e so rodar o comando outra vez.

import ExcelJS from "exceljs";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const PASTA_MODELO = "modelo";
const NOMES_EV = path.join("modelo", "nomes-ev.txt");
const SAIDA = path.join("supabase", "autorizados.sql");

// Onde cada coisa esta na planilha (ver README).
const PRIMEIRA = 18;
const ULTIMA = 75;
const COL_NOME = 1;
const COL_EP_NUMERO = 5;
const COL_EP_NOME = 6;
const COLS_EV = [10, 14, 18];

const POSTOS = [
  "CEL", "TEN CEL", "MAJ", "CAP", "TEN", "ASP",
  "ST", "SUBTEN", "SGT", "CB", "CABO", "SD",
];

const texto = (celula) => String(celula?.text ?? celula?.value ?? "").trim();

// "3º SGT JUNIOR AMERICANO" -> { posto: "3º SGT", nome: "JUNIOR AMERICANO" }
function separarPosto(linha) {
  const partes = linha.split(/\s+/);
  const posto = [];
  while (partes.length) {
    const p = partes[0];
    const ordinal = /^\d+[°ºo]?$/.test(p);
    if (ordinal || POSTOS.includes(p.toUpperCase())) {
      posto.push(partes.shift());
      // "TEN CEL" tem duas palavras; deixa o laco continuar.
      continue;
    }
    break;
  }
  if (!posto.length) return { posto: null, nome: linha };
  return { posto: posto.join(" "), nome: partes.join(" ") };
}

// "106 CARVALHO" -> { numero: "106", nome: "CARVALHO" }
function separarNumero(linha) {
  const m = linha.match(/^(\d+)\s+(.*)$/);
  if (!m) return { numero: null, nome: linha };
  return { numero: m[1], nome: m[2].trim() };
}

async function acharModelo() {
  const arquivos = await readdir(PASTA_MODELO);
  const xlsx = arquivos.find((a) => a.toLowerCase().endsWith(".xlsx"));
  if (!xlsx) {
    throw new Error(
      `Nenhum .xlsx em ${PASTA_MODELO}/. Salve o modelo do Rancho como .xlsx ali.`
    );
  }
  return path.join(PASTA_MODELO, xlsx);
}

// Mesma regra do site (lib/supabase.js): minusculas, sem acento, espacos
// e sinais viram ponto. Repetida aqui porque este script roda sozinho.
function normalizarIdentificador(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
}

// Os SD EV aparecem na planilha so pelo numero. Os nomes vem de uma lista
// a parte, e servem apenas para identificacao dentro do site — a planilha
// do Rancho continua saindo so com o numero.
async function lerNomesEv() {
  try {
    const conteudo = await readFile(NOMES_EV, "utf8");
    const mapa = new Map();
    for (const linha of conteudo.split(/\r?\n/)) {
      const limpa = linha.trim();
      if (!limpa || limpa.startsWith("#")) continue;
      const m = limpa.match(/^(\d+)\s+(.+)$/);
      if (m) mapa.set(m[1], m[2].trim());
    }
    return mapa;
  } catch {
    console.warn(`(sem ${NOMES_EV}: os SD EV ficam só com o número)`);
    return new Map();
  }
}

const nomesEv = await lerNomesEv();

const pessoas = [];
const semNome = [];
let ordem = 0;

const caminho = await acharModelo();
const pasta = new ExcelJS.Workbook();
await pasta.xlsx.readFile(caminho);
const aba = pasta.worksheets[0];

// --- Bloco 1: oficiais, subten/sgt e cabos ---
let grupo = "oficial";
for (let l = PRIMEIRA; l <= ULTIMA; l++) {
  const valor = texto(aba.getCell(l, COL_NOME));
  if (!valor) continue;

  const chave = valor.toUpperCase().replace(/\s+/g, "");
  if (chave === "SUBTEN/SGT") { grupo = "subtenSgt"; continue; }
  if (chave === "CABOS" || chave === "CABO") { grupo = "cabo"; continue; }

  if (grupo === "cabo") {
    // Cabos aparecem como "106 CARVALHO": tem numero de guerra.
    const { numero, nome } = separarNumero(valor);
    pessoas.push({
      identificador: normalizarIdentificador(numero || nome),
      numero,
      nome,
      ordem: ++ordem,
      posto: "CB",
      categoria: "Cabo/Sd",
      bloco: "cabo",
    });
  } else {
    // De sargento para cima nao ha numero de guerra: a identificacao e o
    // proprio nome de guerra.
    const { posto, nome } = separarPosto(valor);
    const pessoa = {
      identificador: normalizarIdentificador(nome),
      numero: null,
      nome,
      ordem: ++ordem,
      posto,
      categoria: grupo === "oficial" ? "Oficial" : "Subten/Sgt",
      bloco: grupo,
    };
    (pessoa.identificador ? pessoas : semNome).push(pessoa);
  }
}

// --- Bloco 2: SD EP (numero com o nome a direita) ---
for (let l = PRIMEIRA; l <= ULTIMA; l++) {
  const numero = texto(aba.getCell(l, COL_EP_NUMERO));
  const nome = texto(aba.getCell(l, COL_EP_NOME));
  if (!/^\d+$/.test(numero)) continue;
  pessoas.push({
    identificador: numero,
    numero,
    nome: nome || null,
    ordem: ++ordem,
    posto: "SD",
    categoria: "Cabo/Sd",
    bloco: "sdEp",
  });
}

// --- Blocos 3 a 5: SD EV (so o numero) ---
for (const col of COLS_EV) {
  for (let l = PRIMEIRA; l <= ULTIMA; l++) {
    const numero = texto(aba.getCell(l, col));
    if (!/^\d+$/.test(numero)) continue;
    pessoas.push({
      identificador: numero,
      numero,
      nome: nomesEv.get(numero) || null,
      ordem: ++ordem,
      posto: "SD",
      categoria: "Cabo/Sd",
      bloco: "sdEv",
    });
  }
}

// --- Monta o SQL ---
const aspas = (v) => (v === null || v === undefined || v === "" ? "null" : `'${String(v).replace(/'/g, "''")}'`);
const linhaSql = (p) =>
  `  (${aspas(p.identificador)}, ${aspas(p.numero)}, ${aspas(p.nome)}, ` +
  `${aspas(p.posto)}, ${aspas(p.categoria)}, ${aspas(p.bloco)}, ${p.ordem})`;

// Dois militares com o mesmo identificador se atropelariam no login, entao
// o repetido fica de fora e e avisado no fim.
const vistos = new Map();
const repetidos = [];
const unicas = [];
for (const p of pessoas) {
  const antes = vistos.get(p.identificador);
  if (antes) {
    repetidos.push([antes, p]);
    continue;
  }
  vistos.set(p.identificador, p);
  unicas.push(p);
}

let sql = `-- Relacao de quem pode se cadastrar no site.
-- Gerado por "npm run autorizados" a partir de ${caminho.replace(/\\/g, "/")}.
-- Confira antes de rodar: o modelo e uma foto de um dia, entao pode haver
-- quem ja saiu ou quem entrou depois.
--
-- O "identificador" e o que a pessoa digita para entrar: o numero de guerra
-- para cabos e soldados, o nome de guerra de sargento para cima.

insert into autorizados (identificador, numero_guerra, nome, posto_grad, categoria, bloco, ordem) values
${unicas.map(linhaSql).join(",\n")}
on conflict (identificador) do update set
  numero_guerra = excluded.numero_guerra,
  nome          = excluded.nome,
  posto_grad    = excluded.posto_grad,
  categoria     = excluded.categoria,
  bloco         = excluded.bloco,
  ordem         = excluded.ordem;

-- Quem ja criou acesso guardou uma copia dos proprios dados no momento do
-- cadastro. Esta linha traz de volta o que mudou na relacao — e o que faz
-- os nomes dos SD EV aparecerem para quem se cadastrou antes deles.
update militares m set
  numero_guerra = a.numero_guerra,
  nome          = a.nome,
  posto_grad    = a.posto_grad,
  categoria     = a.categoria,
  bloco         = a.bloco,
  ordem         = a.ordem
from autorizados a
where a.identificador = m.identificador;
`;

if (repetidos.length) {
  sql += `
-- ---------------------------------------------------------------------
-- IDENTIFICADORES REPETIDOS - resolva antes de liberar o site
--
-- As pessoas abaixo dariam no mesmo identificador, e so a primeira ficou
-- na relacao. Diferencie (por exemplo "BORGES" e "BORGES 2") e acrescente
-- a que faltou com um insert proprio.
-- ---------------------------------------------------------------------
${repetidos
  .map(([a, b]) => `--   ${a.identificador}: ${a.nome || a.numero} / ${b.nome || b.numero}`)
  .join("\n")}
`;
}

if (semNome.length) {
  sql += `
-- ---------------------------------------------------------------------
-- SEM NOME LEGIVEL - ${semNome.length} linha(s) do bloco 1 nao deram nome
-- aproveitavel e ficaram de fora. Acrescente a mao se fizer falta.
-- ---------------------------------------------------------------------
`;
}

await writeFile(SAIDA, sql, "utf8");

const porBloco = unicas.reduce((acc, p) => {
  acc[p.bloco] = (acc[p.bloco] || 0) + 1;
  return acc;
}, {});

console.log(`gerado: ${SAIDA}`);
console.log(`  total: ${unicas.length}`);
Object.entries(porBloco).forEach(([b, n]) => console.log(`    ${b.padEnd(10)} ${n}`));
if (repetidos.length) console.log(`  identificadores repetidos: ${repetidos.length} (veja o fim do arquivo)`);
if (semNome.length) console.log(`  sem nome legivel: ${semNome.length}`);
