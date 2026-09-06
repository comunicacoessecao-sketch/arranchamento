// O periodo de arranchamento da seção vai de TERÇA a SEGUNDA — e o mesmo
// que o papel entregue na segunda de manha cobre. Por isso a lista comeca
// na terça: e ela que abre o periodo.
export const DIAS = [
  { key: "ter", label: "Terça" },
  { key: "qua", label: "Quarta" },
  { key: "qui", label: "Quinta" },
  { key: "sex", label: "Sexta" },
  { key: "sab", label: "Sábado" },
  { key: "dom", label: "Domingo" },
  { key: "seg", label: "Segunda" },
];

export const PRIMEIRO_DIA = DIAS[0].key;
export const ULTIMO_DIA = DIAS[DIAS.length - 1].key;

export const REFEICOES = [
  { key: "cafe", label: "Café" },
  { key: "almoco", label: "Almoço" },
  { key: "janta", label: "Janta" },
];

export const CATEGORIAS = ["Oficial", "Subten/Sgt", "Cabo/Sd"];

// Cada dia fecha as 13:30 da vespera — e quando a seção recolhe o papel
// para lancar na planilha que vai para o Rancho as 16h.
export const HORA_LIMITE = 13 * 60 + 30;

export const LIMITE_ESCRITO = "13:30";

// Um dia ainda pode ser alterado?
//
//   hoje e o passado -> nao: ja foram entregues ao Rancho
//   amanha           -> so ate as 13:30 de hoje
//   depois de amanha -> sim
//
// `dataDoDia` e `hoje` sao datas na meia-noite; `minutos` sao os minutos
// desde a meia-noite de hoje.
export function diaEditavel(dataDoDia, hoje, minutos) {
  if (!dataDoDia || !hoje) return false;
  const dias = Math.round((dataDoDia - hoje) / 86400000);
  if (dias <= 0) return false;
  if (dias === 1) return minutos < HORA_LIMITE;
  return true;
}

// Terca-feira que abre o periodo de arranchamento em circulacao.
//
// A seção monta um papel novo toda segunda-feira, cobrindo de terca a
// segunda. Esse papel fica em circulacao o periodo inteiro — sai todo dia
// as 10h e volta as 14h —, entao o militar continua podendo alterar
// enquanto o periodo corre. So na segunda seguinte nasce o proximo.
//
// Por isso a virada e na SEGUNDA, e nao na terça: e a segunda-feira que
// abre um papel novo.
export function inicioPeriodo(data = new Date()) {
  const d = new Date(data);
  d.setHours(0, 0, 0, 0);
  const diaSemana = d.getDay(); // 0 = domingo
  // Recua ate a segunda desta semana e avanca um dia: a terça que abriu
  // (ou que abre hoje) o periodo.
  d.setDate(d.getDate() + (diaSemana === 0 ? -6 : 1 - diaSemana) + 1);
  return d;
}

// Converte "2026-09-08" numa data local, sem o deslocamento de fuso que
// `new Date("2026-09-08")` traria (essa forma e lida como UTC).
export function deISO(texto) {
  const [ano, mes, dia] = String(texto).split("-").map(Number);
  return new Date(ano, mes - 1, dia);
}

export function paraISO(d) {
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

export function formatarCurto(d) {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

// Mapa dia -> data formatada, a partir do dia que abre o periodo (a terça).
export function datasDaSemana(inicio) {
  const mapa = {};
  DIAS.forEach((dia, i) => {
    const d = new Date(inicio);
    d.setDate(d.getDate() + i);
    mapa[dia.key] = { curta: formatarCurto(d), data: d };
  });
  return mapa;
}

export function semanaVazia() {
  const obj = {};
  DIAS.forEach((d) => {
    obj[d.key] = { cafe: false, almoco: false, janta: false };
  });
  return obj;
}

export function nomeExibicao(militar) {
  if (!militar) return "";
  const partes = [militar.posto_grad, militar.nome].filter(Boolean);
  if (partes.length) return partes.join(" ");
  return `Nº ${militar.numero_guerra}`;
}
