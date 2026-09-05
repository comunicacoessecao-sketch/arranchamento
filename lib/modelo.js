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

export const LARGURA_COLUNAS = [
  { col: 1, largura: 26 },
  { col: 2, largura: 4.5 },
  { col: 3, largura: 4.5 },
  { col: 4, largura: 4.5 },
  { col: 5, largura: 6 },
  { col: 6, largura: 17 },
  { col: 7, largura: 4.5 },
  { col: 8, largura: 4.5 },
  { col: 9, largura: 4.5 },
  { col: 10, largura: 6 },
  { col: 11, largura: 4.5 },
  { col: 12, largura: 4.5 },
  { col: 13, largura: 4.5 },
  { col: 14, largura: 6 },
  { col: 15, largura: 4.5 },
  { col: 16, largura: 4.5 },
  { col: 17, largura: 4.5 },
  { col: 18, largura: 6 },
  { col: 19, largura: 4.5 },
  { col: 20, largura: 4.5 },
  { col: 21, largura: 4.5 },
];

// ---------------------------------------------------------------------
// Em qual bloco da planilha cada militar entra.
//
// O cadastro do site tem categoria (Oficial / Subten-Sgt / Cabo/Sd) e,
// para Cabo/Sd, o tipo (EP ou EV). A planilha, porem, separa CABOS de
// SD EP. Como o banco nao guarda essa diferenca, ela e deduzida do
// posto/graduacao: quem escreveu "CB" (ou "CABO") entra no bloco dos
// cabos; os demais EP entram no bloco SD EP.
// ---------------------------------------------------------------------
export function blocoDoMilitar(militar) {
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
  if (militar.categoria === "Oficial" || militar.categoria === "Subten/Sgt") {
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
