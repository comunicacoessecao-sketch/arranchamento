export const DIAS = [
  { key: "seg", label: "Segunda" },
  { key: "ter", label: "Terça" },
  { key: "qua", label: "Quarta" },
  { key: "qui", label: "Quinta" },
  { key: "sex", label: "Sexta" },
  { key: "sab", label: "Sábado" },
  { key: "dom", label: "Domingo" },
];

export const REFEICOES = [
  { key: "cafe", label: "Café" },
  { key: "almoco", label: "Almoço" },
  { key: "janta", label: "Janta" },
];

export const CATEGORIAS = ["Oficial", "Subten/Sgt", "Cabo/Sd"];

// Retorna a segunda-feira da semana de uma data qualquer.
export function segundaDaSemana(data = new Date()) {
  const d = new Date(data);
  const diaSemana = d.getDay(); // 0 = domingo
  d.setDate(d.getDate() + (diaSemana === 0 ? -6 : 1 - diaSemana));
  d.setHours(0, 0, 0, 0);
  return d;
}

// A semana seguinte, que e a que normalmente esta sendo arranchada.
export function proximaSegunda(data = new Date()) {
  const s = segundaDaSemana(data);
  s.setDate(s.getDate() + 7);
  return s;
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

// Mapa dia -> data formatada, a partir da segunda-feira daquela semana.
export function datasDaSemana(segunda) {
  const mapa = {};
  DIAS.forEach((dia, i) => {
    const d = new Date(segunda);
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
