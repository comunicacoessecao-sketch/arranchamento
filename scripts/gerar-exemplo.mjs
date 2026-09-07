// Gera uma planilha de exemplo com um efetivo parecido com o real, para
// conferir o layout sem precisar abrir o site.
import ExcelJS from "exceljs";
import { montarPasta, efetivoParaPlanilha } from "../lib/exportar.js";

const OFICIAIS = [
  ["CAP", "SIQUEIRA", "101"],
  ["1° TEN", "MEIRELLES", "102"],
  ["1° TEN", "CAMPOS", "103"],
];

const GRADUADOS = [
  ["ST", "ARLEI"], ["ST", "TRINDADE"], ["ST", "GOESTEMEIER"],
  ["1° SGT", "ALVARENGA"], ["2º SGT", "BUOGO"], ["2º SGT", "SCHONS"],
  ["2º SGT", "ALEX"], ["2º SGT", "HEWERTON"], ["3º SGT", "BORGES"],
  ["3º SGT", "TURINO"], ["3º SGT", "J MOURA"], ["3º SGT", "SAMPAIO"],
  ["3º SGT", "PEREIRA"], ["3º SGT", "MARTINS"], ["3º SGT", "JUNIOR AMERICANO"],
  ["3º SGT", "SPECART"], ["3º SGT", "FABIANA"], ["3º SGT", "AQUINO"],
  ["3º SGT", "ROBERTA"], ["3º SGT", "LETÍCA RANGEL"], ["3º SGT", "VEIGA"],
  ["3º SGT", "ALESSANDRA"], ["3º SGT", "GUIMARÃES"],
];

const CABOS = [
  ["106", "CARVALHO"], ["108", "DIAS"], ["109", "WEISSHAAR"],
  ["113", "FERNANDES"], ["114", "VERGUTZ"], ["120", "GELSON"],
  ["121", "VEZARO"], ["122", "ALMEIDA"], ["123", "RODRIGUES"],
  ["124", "GURSKI"], ["125", "ANDERSON SILVA"], ["130", "MARAFIGO"],
  ["131", "BUCK"], ["132", "NAGURNIAK"], ["137", "ROSIN"],
  ["140", "CALISTRO"], ["141", "STECIUK"], ["144", "BORUCK"],
  ["145", "MORIEU ORTIZ"], ["147", "SANTOS"], ["149", "PADILHA"],
];

const SD_EP = [
  ["201", "BADLHUK"], ["204", "MORESCHI"], ["207", "ALEX EDUARDO"],
  ["208", "ANDRE"], ["211", "EDUARDO JUNIOR"], ["218", "KOZIELSKI"],
  ["219", "ERIEL"], ["220", "GUYSS"], ["221", "PATRIK"],
  ["223", "GROSSKLAUS"], ["224", "NICOLAS"], ["226", "KULIBABA"],
  ["227", "KREKNICKI"], ["228", "BUENO"], ["231", "LEONAN"],
  ["234", "ZAREMBA"], ["236", "GEDEÃO"], ["239", "LUIS"],
  ["240", "LODI"], ["241", "ISAQUE"], ["242", "LEANDRO SILVA"],
  ["243", "ALENILSO"], ["245", "TERLESKI"], ["251", "OLIVEIRA"],
  ["253", "LEOMAM"], ["254", "DOLINSKI"], ["256", "JOÃO"],
  ["257", "BARRETTI"], ["259", "GOLANOVSKI"], ["261", "ANDERSON"],
  ["262", "MORAIS"], ["264", "CARLOS"], ["266", "PEDROLLI"],
  ["268", "CHRISOSTOMO"], ["271", "BRUSCHI"], ["275", "PAULO"],
];

// A relação inteira da seção — é ela que vai para a planilha, com todos os
// nomes sempre, tenham ou não criado acesso no site.
const autorizados = [];
let n = 0;
const novo = (extra) => {
  n += 1;
  // "ordem" imita a posicao na relacao do formulario, que e o que ordena
  // oficiais e graduados — eles nao tem numero de guerra.
  autorizados.push({ identificador: `i${n}`, ordem: n, ...extra });
};

// De sargento para cima nao ha numero de guerra — so nome de guerra.
OFICIAIS.forEach(([pg, nome]) =>
  novo({ numero_guerra: null, posto_grad: pg, nome, categoria: "Oficial", tipo_sd: null, bloco: "oficial" })
);
GRADUADOS.forEach(([pg, nome]) =>
  novo({
    numero_guerra: null,
    posto_grad: pg,
    nome,
    categoria: "Subten/Sgt",
    tipo_sd: null,
    bloco: "subtenSgt",
  })
);
CABOS.forEach(([num, nome]) =>
  novo({ numero_guerra: num, posto_grad: "CB", nome, categoria: "Cabo/Sd", tipo_sd: "EP", bloco: "cabo" })
);
SD_EP.forEach(([num, nome]) =>
  novo({ numero_guerra: num, posto_grad: "SD", nome, categoria: "Cabo/Sd", tipo_sd: "EP", bloco: "sdEp" })
);
// 120 soldados do efetivo variavel, so numero de guerra.
for (let i = 0; i < 120; i++) {
  novo({
    numero_guerra: String(401 + i),
    posto_grad: null,
    nome: null,
    categoria: "Cabo/Sd",
    tipo_sd: "EV",
    bloco: "sdEv",
  });
}

// Marcacoes pseudoaleatorias mas estaveis, para o resultado nao mudar a cada
// execucao e dar para comparar duas geracoes.
const DIAS = ["seg", "ter", "qua", "qui", "sex", "sab", "dom"];
let semente = 7;
const sorteio = () => {
  semente = (semente * 1103515245 + 12345) % 2147483648;
  return semente / 2147483648;
};

// Só uma parte do efetivo criou acesso no site. O resto tem que aparecer
// na planilha assim mesmo, com a linha em branco — é o caso que mais
// importa conferir aqui.
const militares = [];
const marcacoes = {};
autorizados.forEach((a, i) => {
  if (i % 3 !== 0) return; // um em cada três
  const id = `uuid-${i}`;
  militares.push({ id, identificador: a.identificador });
  marcacoes[id] = {};
  DIAS.forEach((d) => {
    marcacoes[id][d] = {
      cafe: sorteio() > 0.45,
      almoco: sorteio() > 0.3,
      janta: sorteio() > 0.6,
    };
  });
});

const inicio = new Date(2026, 8, 8); // terça 08/09/2026, abre o período
const { pessoas, marcas } = efetivoParaPlanilha(autorizados, militares, marcacoes);
const { pasta } = montarPasta(ExcelJS, pessoas, marcas, inicio);

const destino = process.argv[2];
await pasta.xlsx.writeFile(destino);
console.log(`gerado: ${destino}`);
console.log(`relação: ${autorizados.length} · com acesso: ${militares.length}`);

