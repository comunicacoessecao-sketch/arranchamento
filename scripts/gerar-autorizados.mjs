// Le a planilha do Rancho em modelo/ e monta o SQL que carrega a relacao
// de quem pode se cadastrar no site.
//
//   npm run autorizados
//
// O arquivo gerado (supabase/autorizados.sql) tem nomes reais da companhia
// e por isso fica fora do Git. E so abrir, conferir e colar no SQL Editor
// do Supabase. Se precisar de novo, e so rodar o comando outra vez.

import ExcelJS from "exceljs";
import { readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const PASTA_MODELO = "modelo";
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

const pessoas = [];
const semNumero = [];

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
    const { numero, nome } = separarNumero(valor);
    const pessoa = { numero, nome, posto: "CB", categoria: "Cabo/Sd", bloco: "cabo" };
    (numero ? pessoas : semNumero).push(pessoa);
  } else {
    const { posto, nome } = separarPosto(valor);
    // Oficiais e graduados aparecem na planilha so pelo posto e nome de
    // guerra — o numero precisa ser preenchido a mao.
    semNumero.push({
      numero: null,
      nome,
      posto,
      categoria: grupo === "oficial" ? "Oficial" : "Subten/Sgt",
      bloco: grupo,
    });
  }
}

// --- Bloco 2: SD EP ---
for (let l = PRIMEIRA; l <= ULTIMA; l++) {
  const numero = texto(aba.getCell(l, COL_EP_NUMERO));
  const nome = texto(aba.getCell(l, COL_EP_NOME));
  if (!/^\d+$/.test(numero)) continue;
  pessoas.push({ numero, nome: nome || null, posto: "SD", categoria: "Cabo/Sd", bloco: "sdEp" });
}

// --- Blocos 3 a 5: SD EV ---
for (const col of COLS_EV) {
  for (let l = PRIMEIRA; l <= ULTIMA; l++) {
    const numero = texto(aba.getCell(l, col));
    if (!/^\d+$/.test(numero)) continue;
    pessoas.push({ numero, nome: null, posto: "SD", categoria: "Cabo/Sd", bloco: "sdEv" });
  }
}

// --- Monta o SQL ---
const aspas = (v) => (v === null || v === undefined || v === "" ? "null" : `'${String(v).replace(/'/g, "''")}'`);
const linhaSql = (p) =>
  `  (${aspas(p.numero)}, ${aspas(p.nome)}, ${aspas(p.posto)}, ${aspas(p.categoria)}, ${aspas(p.bloco)})`;

const vistos = new Set();
const unicas = pessoas.filter((p) => {
  if (vistos.has(p.numero)) return false;
  vistos.add(p.numero);
  return true;
});

let sql = `-- Relacao de quem pode se cadastrar no site.
-- Gerado por "npm run autorizados" a partir de ${caminho.replace(/\\/g, "/")}.
-- Confira antes de rodar: o modelo e uma foto de um dia, entao pode haver
-- quem ja saiu ou quem entrou depois.

insert into autorizados (numero_guerra, nome, posto_grad, categoria, bloco) values
${unicas.map(linhaSql).join(",\n")}
on conflict (numero_guerra) do update set
  nome       = excluded.nome,
  posto_grad = excluded.posto_grad,
  categoria  = excluded.categoria,
  bloco      = excluded.bloco;
`;

if (semNumero.length) {
  sql += `
-- ---------------------------------------------------------------------
-- FALTA O NUMERO DE GUERRA
--
-- Na planilha do Rancho, oficiais e graduados aparecem so pelo posto e
-- nome — o numero nao esta la. Preencha os numeros abaixo (no lugar de
-- 'NUMERO'), apague esta linha de comentario e rode este bloco tambem.
-- Sem isso, essas pessoas nao conseguem criar acesso.
-- ---------------------------------------------------------------------
-- insert into autorizados (numero_guerra, nome, posto_grad, categoria, bloco) values
${semNumero
  .map((p) => `--   ('NUMERO', ${aspas(p.nome)}, ${aspas(p.posto)}, ${aspas(p.categoria)}, ${aspas(p.bloco)})`)
  .join(",\n")}
-- on conflict (numero_guerra) do nothing;
`;
}

await writeFile(SAIDA, sql, "utf8");

console.log(`gerado: ${SAIDA}`);
console.log(`  com numero de guerra: ${unicas.length}`);
console.log(`  falta o numero:       ${semNumero.length} (oficiais e graduados)`);
