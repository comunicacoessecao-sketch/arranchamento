// =====================================================================
// Dados fixos da OM e o desenho da planilha oficial do Rancho.
// Se algo mudar (nome da companhia, cidade, quem assina), e so alterar
// aqui — o resto do codigo se ajusta sozinho.
// =====================================================================

export const OM = {
  secao: "FISC ADM",
  companhia: "COMPANHIA DE COMANDO E APOIO",
  cidade: "Porto União-SC",
  assinaturaEsquerda: "FURRIEL",
  assinaturaDireita: "CMT SU",
};

export const MESES = [
  "JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO",
  "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO",
];

export const DIAS_EXTENSO = {
  seg: "SEGUNDA-FEIRA",
  ter: "TERÇA-FEIRA",
  qua: "QUARTA-FEIRA",
  qui: "QUINTA-FEIRA",
  sex: "SEXTA-FEIRA",
  sab: "SÁBADO",
  dom: "DOMINGO",
};

// ---------------------------------------------------------------------
// Colunas (numero da coluna no Excel: A=1, B=2, ... U=21)
// ---------------------------------------------------------------------
export const COL = {
  // Bloco 1 — oficiais, subtenentes/sargentos e cabos (nome na coluna A)
  nome: 1, // A
  marcas: [2, 3, 4], // B C D  = Cafe / Almoco / Janta

  // Bloco 2 — SD EP (numero + nome)
  epNumero: 5, // E
  epNome: 6, // F
  epMarcas: [7, 8, 9], // G H I

  // Blocos 3, 4 e 5 — SD EV (so o numero de guerra)
  ev: [
    { numero: 10, marcas: [11, 12, 13] }, // J | K L M
    { numero: 14, marcas: [15, 16, 17] }, // N | O P Q
    { numero: 18, marcas: [19, 20, 21] }, // R | S T U
  ],

  ultima: 21, // U
};

// ---------------------------------------------------------------------
// Linhas
// ---------------------------------------------------------------------
export const LINHA = {
  cabecalhoRelacao: 16, // "POSTO / GRAD / NOME" | "REFEIÇÕES"
  subcabecalho: 17, // C | A | J
  primeiraRelacao: 18,
  minimoRelacao: 58, // o formulario impresso tem 58 linhas (18 a 75)
};

// Larguras lidas diretamente do formulario oficial (colunas A a U).
export const LARGURA_COLUNAS = [
  26.98, 5.16, 4.83, 5, 8.64, 20.58, 6, 5.5, 5.5, 7.39, 5.24,
  5, 4.66, 6.72, 5, 5.82, 5, 6.82, 4.51, 5, 5.59,
].map((largura, i) => ({ col: i + 1, largura }));

// Alturas lidas do mesmo arquivo. A linha 6 e alta porque os titulos dela
// sao verticais; as linhas 12, 14 e 15 sao finas e formam o espaco das
// assinaturas. Da linha 18 em diante vale ALTURA_RELACAO.
export const ALTURA_LINHAS = {
  1: 12,
  2: 12,
  3: 18.85,
  4: 16.5,
  5: 12,
  6: 55.75,
  7: 12,
  8: 12,
  9: 12,
  10: 12,
  11: 12,
  12: 0.75,
  13: 18,
  14: 6,
  15: 9,
  16: 15.75,
  17: 9.75,
};

export const ALTURA_RELACAO = 12;

// ---------------------------------------------------------------------
// Em qual bloco da planilha cada militar entra.
//
// Desde que o cadastro passou a ser fechado, o bloco vem da relacao de
// autorizados e fica gravado no militar — sem adivinhacao. O caminho de
// baixo so atende quem se cadastrou antes disso: deduz pelo posto, ja que
// a categoria "Cabo/Sd" sozinha nao separa CABOS de SD EP.
// ---------------------------------------------------------------------
const BLOCOS = ["oficial", "subtenSgt", "cabo", "sdEp", "sdEv"];

export function blocoDoMilitar(militar) {
  if (BLOCOS.includes(militar.bloco)) return militar.bloco;
  if (militar.categoria === "Oficial") return "oficial";
  if (militar.categoria === "Subten/Sgt") return "subtenSgt";
  if (militar.tipo_sd === "EV") return "sdEv";
  return ehCabo(militar) ? "cabo" : "sdEp";
}

export function ehCabo(militar) {
  const pg = String(militar.posto_grad || "").trim().toUpperCase();
  return pg.startsWith("CB") || pg.startsWith("CAB");
}

// Como o militar aparece no bloco 1 da planilha.
// Oficiais e graduados: "CAP SIQUEIRA". Cabos: "106 CARVALHO".
export function rotuloRelacao(militar) {
  const nome = String(militar.nome || "").trim();
  const bloco = blocoDoMilitar(militar);
  if (bloco === "oficial" || bloco === "subtenSgt") {
    const pg = String(militar.posto_grad || "").trim();
    return [pg, nome].filter(Boolean).join(" ") || `Nº ${militar.numero_guerra}`;
  }
  return [militar.numero_guerra, nome].filter(Boolean).join(" ");
}

// Ordena pelo numero de guerra, tratando-o como numero quando possivel.
export function porNumero(a, b) {
  return String(a.numero_guerra).localeCompare(String(b.numero_guerra), "pt-BR", {
    numeric: true,
  });
}
