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

// PRAZOS
//
// Em dia util, cada dia fecha as 13:30 da vespera — e quando a seção
// recolhe o papel para lancar na planilha entregue ao Rancho as 16h.
//
// Sabado, domingo e segunda sao a excecao: como a seção nao esta no
// batalhao no fim de semana, os tres sao entregues juntos na SEXTA, e por
// isso fecham as 10:00 daquela sexta.
export const HORA_LIMITE = 13 * 60 + 30;
export const HORA_LIMITE_FDS = 10 * 60;

export const LIMITE_ESCRITO = "13:30";
export const LIMITE_FDS_ESCRITO = "10:00";

const ENTREGUES_NA_SEXTA = ["sab", "dom", "seg"];
const SEXTA = 3; // dias depois da terça que abre o periodo

function deslocamento(diaKey) {
  return DIAS.findIndex((d) => d.key === diaKey);
}

// Quando um dia do periodo deixa de aceitar alteracao.
// Devolve a data do prazo e a hora (em minutos desde a meia-noite).
export function prazoDoDia(diaKey, inicio) {
  const d = new Date(inicio);
  if (ENTREGUES_NA_SEXTA.includes(diaKey)) {
    d.setDate(d.getDate() + SEXTA);
    return { data: d, minutos: HORA_LIMITE_FDS };
  }
  d.setDate(d.getDate() + deslocamento(diaKey) - 1); // a vespera
  return { data: d, minutos: HORA_LIMITE };
}

export function horaLimiteEscrita(diaKey) {
  return ENTREGUES_NA_SEXTA.includes(diaKey) ? LIMITE_FDS_ESCRITO : LIMITE_ESCRITO;
}

// Um dia ainda pode ser alterado?
// `inicio` e `hoje` sao datas na meia-noite; `minutos` sao os minutos
// desde a meia-noite de hoje.
export function diaEditavel(diaKey, inicio, hoje, minutos) {
  if (!inicio || !hoje) return false;
  const prazo = prazoDoDia(diaKey, inicio);
  const dias = Math.round((prazo.data - hoje) / 86400000);
  if (dias > 0) return true; // o prazo ainda nem chegou
  if (dias < 0) return false; // ja passou
  return minutos < prazo.minutos; // vence hoje: depende da hora
}

// O prazo desse dia vence hoje?
export function prazoVenceHoje(diaKey, inicio, hoje) {
  if (!inicio || !hoje) return false;
  const prazo = prazoDoDia(diaKey, inicio);
  return Math.round((prazo.data - hoje) / 86400000) === 0;
}

// Quais dias do periodo fecham hoje — ou seja, quais entram na planilha
// que a seção entrega hoje ao Rancho. Em geral e um so; na sexta sao tres
// (sabado, domingo e segunda saem juntos).
export function diasQueFechamHoje(inicio, hoje) {
  if (!inicio || !hoje) return [];
  return DIAS.filter((d) => prazoVenceHoje(d.key, inicio, hoje)).map((d) => d.key);
}

export function rotuloDoDia(diaKey) {
  return DIAS.find((d) => d.key === diaKey)?.label ?? diaKey;
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
