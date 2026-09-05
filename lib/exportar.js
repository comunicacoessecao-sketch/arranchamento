import { DIAS, CATEGORIAS, datasDaSemana } from "./semana";
import {
  OM,
  MESES,
  DIAS_EXTENSO,
  COL,
  LINHA,
  LARGURA_COLUNAS,
  ALTURA_LINHAS,
  ALTURA_RELACAO,
  blocoDoMilitar,
  rotuloRelacao,
  porNumero,
} from "./modelo";

// =====================================================================
// Contagens
// =====================================================================

// Conta quantos militares de cada categoria marcaram cada refeicao em um dia.
// Etapa reduzida = contagem separada de cafe, almoco e janta.
// Etapa completa = soma das tres.
export function calcularTotais(militares, marcacoes, diaKey) {
  const linhas = CATEGORIAS.map((categoria) => {
    const daCategoria = militares.filter((m) => m.categoria === categoria);
    const total = { cafe: 0, almoco: 0, janta: 0 };
    daCategoria.forEach((m) => {
      const marca = marcacoes[m.id]?.[diaKey];
      if (!marca) return;
      if (marca.cafe) total.cafe += 1;
      if (marca.almoco) total.almoco += 1;
      if (marca.janta) total.janta += 1;
    });
    return {
      categoria,
      ...total,
      completa: total.cafe + total.almoco + total.janta,
    };
  });

  const soma = linhas.reduce(
    (acc, l) => ({
      cafe: acc.cafe + l.cafe,
      almoco: acc.almoco + l.almoco,
      janta: acc.janta + l.janta,
      completa: acc.completa + l.completa,
    }),
    { cafe: 0, almoco: 0, janta: 0, completa: 0 }
  );

  return { linhas, soma };
}

// =====================================================================
// Geracao da planilha no layout oficial do Rancho
// =====================================================================

const PRETO = "FF000000";

const FINA = { style: "thin", color: { argb: PRETO } };
const GROSSA = { style: "medium", color: { argb: PRETO } };

const CENTRO = { horizontal: "center", vertical: "middle" };
const ESQUERDA = { horizontal: "left", vertical: "middle" };
// Titulos estreitos do modelo (CAFÉ, ALMOÇO, TIPO...) sao escritos de baixo
// para cima, o que e o que permite a coluna ser tao fina.
const VERTICAL = { horizontal: "center", vertical: "middle", textRotation: 90 };

const FONTE = "Times New Roman";

// No modelo as contagens aparecem sempre com dois digitos: 01, 09, 27.
function dois(n) {
  return String(n ?? "").padStart(2, "0");
}

// O ExcelJS so roda no navegador pelo pacote pronto (dist). Carregado sob
// demanda para nao pesar no carregamento das paginas.
async function carregarExcelJS() {
  const mod = await import("exceljs/dist/exceljs.min.js");
  const candidatos = [mod, mod.default, mod.ExcelJS, mod.default?.ExcelJS];
  const achado = candidatos.find((c) => c && typeof c.Workbook === "function");
  if (!achado) throw new Error("ExcelJS não carregou.");
  return achado;
}

function escrever(aba, linha, coluna, valor, opcoes = {}) {
  const c = aba.getCell(linha, coluna);
  if (valor !== undefined && valor !== null && valor !== "") c.value = valor;
  const base = opcoes.vertical ? VERTICAL : opcoes.alinhamento || CENTRO;
  c.alignment = { ...base, wrapText: !!opcoes.quebra };
  c.font = {
    name: FONTE,
    size: opcoes.tamanho || 10,
    bold: !!opcoes.negrito,
    italic: !!opcoes.italico,
    underline: !!opcoes.sublinhado,
  };
  if (opcoes.borda !== false) {
    const b = opcoes.borda === "grossa" ? GROSSA : FINA;
    c.border = { top: b, left: b, bottom: b, right: b };
  } else if (opcoes.bordaBaixo) {
    c.border = { bottom: FINA };
  }
  return c;
}

function mesclar(aba, l1, c1, l2, c2) {
  if (l1 === l2 && c1 === c2) return;
  aba.mergeCells(l1, c1, l2, c2);
}

// Escreve um titulo ocupando varias celulas.
function faixa(aba, l1, c1, l2, c2, valor, opcoes = {}) {
  mesclar(aba, l1, c1, l2, c2);
  // A borda precisa ser aplicada em todas as celulas da mescla, senao o
  // Excel desenha so o contorno da primeira.
  for (let l = l1; l <= l2; l++) {
    for (let c = c1; c <= c2; c++) {
      escrever(aba, l, c, l === l1 && c === c1 ? valor : undefined, opcoes);
    }
  }
  return aba.getCell(l1, c1);
}

// ---------------------------------------------------------------------
// Cabecalho: OM, dia e data
// ---------------------------------------------------------------------
function montarCabecalho(aba, diaKey, data) {
  // Os "=" sao os separadores que o formulario em papel ja traz.
  faixa(aba, 1, 1, 1, 4, "=", { borda: false });
  faixa(aba, 1, 5, 1, COL.ultima, "=", { borda: false });

  faixa(aba, 2, 1, 3, 4, OM.secao, { negrito: true, sublinhado: true, tamanho: 10 });
  faixa(aba, 2, 5, 2, COL.ultima, OM.companhia, { negrito: true, tamanho: 12 });
  faixa(aba, 3, 5, 3, COL.ultima, undefined, { borda: false });

  faixa(aba, 4, 1, 4, 4, "=", { borda: false });
  faixa(aba, 4, 5, 4, 15, DIAS_EXTENSO[diaKey], { negrito: true, tamanho: 11 });
  escrever(aba, 4, 16, String(data.getDate()).padStart(2, "0"), {
    negrito: true,
    tamanho: 11,
  });
  faixa(aba, 4, 17, 4, 19, mesCapitalizado(data), { negrito: true, tamanho: 11 });
  faixa(aba, 4, 20, 4, 21, data.getFullYear(), { negrito: true, tamanho: 11 });
}

// No cabecalho o modelo escreve "Setembro"; na linha da assinatura, "AGOSTO".
function mesCapitalizado(data) {
  const m = MESES[data.getMonth()];
  return m.charAt(0) + m.slice(1).toLowerCase();
}

// ---------------------------------------------------------------------
// Quadro de etapas (reduzidas por categoria + completas)
// ---------------------------------------------------------------------
function montarQuadroEtapas(aba, totais) {
  const { linhas, soma } = totais;

  faixa(aba, 5, 1, 6, 4, "ETAPAS  REDUZIDAS", { negrito: true, tamanho: 11 });
  faixa(aba, 5, 5, 6, 5, "CAFÉ", { negrito: true, vertical: true });
  faixa(aba, 5, 6, 6, 6, "ALMOÇO", { negrito: true, vertical: true });
  faixa(aba, 5, 7, 6, 7, "JANTAR", { negrito: true, vertical: true });

  faixa(aba, 5, 8, 6, 13, "ETAPAS COMPLETAS", { negrito: true, tamanho: 11 });
  faixa(aba, 5, 14, 5, 16, "À ALIMENTAR", { negrito: true, tamanho: 9 });
  escrever(aba, 6, 14, "SOMA", { negrito: true, tamanho: 8 });
  escrever(aba, 6, 15, "OUTRA OM", { negrito: true, tamanho: 8, vertical: true });
  escrever(aba, 6, 16, undefined);

  faixa(aba, 5, 17, 5, 18, "QTATIVOS", { negrito: true, tamanho: 9 });
  escrever(aba, 6, 17, "TIPO", { negrito: true, tamanho: 8, vertical: true });
  escrever(aba, 6, 18, "QUANTIDADE", { negrito: true, tamanho: 8, vertical: true });

  faixa(aba, 5, 19, 5, 21, "COMPLEMENTOS", { negrito: true, tamanho: 9 });
  escrever(aba, 6, 19, undefined);
  escrever(aba, 6, 20, "C ESC", { negrito: true, tamanho: 8, vertical: true });
  escrever(aba, 6, 21, "CF 60 %", { negrito: true, tamanho: 8, vertical: true });

  const rotulos = ["OFICIAIS", "SUBTEN/SGT", "CABOS/SD"];
  const rotulosCompletas = ["OFICIAIS", "SUBTEN/SGT", "CB/SD"];

  linhas.forEach((l, i) => {
    const linha = 7 + i;
    faixa(aba, linha, 1, linha, 4, rotulos[i], {
      negrito: true,
      sublinhado: true,
      alinhamento: ESQUERDA,
    });
    escrever(aba, linha, 5, dois(l.cafe));
    escrever(aba, linha, 6, dois(l.almoco));
    escrever(aba, linha, 7, dois(l.janta));

    faixa(aba, linha, 8, linha, 13, rotulosCompletas[i], {
      negrito: true,
      sublinhado: true,
      alinhamento: ESQUERDA,
    });
    escrever(aba, linha, 14, dois(l.completa));

    // Colunas de efetivo e complementos: preenchidas a mao pela seção.
    for (let c = 15; c <= 21; c++) escrever(aba, linha, c, undefined);
  });

  faixa(aba, 10, 1, 10, 4, "SOMA", {
    negrito: true,
    sublinhado: true,
    alinhamento: ESQUERDA,
  });
  escrever(aba, 10, 5, dois(soma.cafe), { negrito: true });
  escrever(aba, 10, 6, dois(soma.almoco), { negrito: true });
  escrever(aba, 10, 7, dois(soma.janta), { negrito: true });
  faixa(aba, 10, 8, 10, 13, undefined);
  for (let c = 14; c <= 21; c++) escrever(aba, 10, c, undefined);

  faixa(aba, 11, 1, 11, 13, undefined, { borda: false });
  escrever(aba, 11, 14, dois(soma.completa), { negrito: true });
  for (let c = 15; c <= 21; c++) escrever(aba, 11, c, undefined);
}

// ---------------------------------------------------------------------
// Local, data e assinaturas
// ---------------------------------------------------------------------
function montarAssinaturas(aba, data) {
  // Linha de assinatura: um traco de verdade na base da celula fica mais
  // limpo do que uma fileira de underscores, que nunca casa com a largura.
  faixa(aba, 13, 9, 13, 12, undefined, { borda: false, bordaBaixo: true });
  faixa(aba, 13, 15, 13, 21, undefined, { borda: false, bordaBaixo: true });

  faixa(aba, 13, 1, 13, 3, `Quartel em ${OM.cidade},`, {
    alinhamento: ESQUERDA,
    borda: false,
    tamanho: 9,
  });
  escrever(aba, 13, 4, String(data.getDate()).padStart(2, "0"), {
    borda: false,
    tamanho: 9,
  });
  faixa(aba, 13, 5, 13, 6, MESES[data.getMonth()], { borda: false, tamanho: 9 });
  escrever(aba, 13, 7, data.getFullYear(), { borda: false, tamanho: 9 });

  faixa(aba, 14, 9, 15, 12, OM.assinaturaEsquerda, { negrito: true, borda: false });
  faixa(aba, 14, 15, 15, 21, OM.assinaturaDireita, { negrito: true, borda: false });
}

// ---------------------------------------------------------------------
// Cabecalho da relacao nominal (linhas 16 e 17)
// ---------------------------------------------------------------------
function montarCabecalhoRelacao(aba) {
  const l1 = LINHA.cabecalhoRelacao;
  const l2 = LINHA.subcabecalho;
  const opc = { negrito: true, borda: "grossa" };

  faixa(aba, l1, COL.nome, l2, COL.nome, "POSTO / GRAD / NOME", opc);
  faixa(aba, l1, COL.marcas[0], l1, COL.marcas[2], "REFEIÇÕES", opc);

  faixa(aba, l1, COL.epNumero, l2, COL.epNome, "SD EP", { ...opc, italico: true });
  faixa(aba, l1, COL.epMarcas[0], l1, COL.epMarcas[2], "REFEIÇÕES", opc);

  COL.ev.forEach((bloco) => {
    faixa(aba, l1, bloco.numero, l2, bloco.numero, "SD EV", opc);
    faixa(aba, l1, bloco.marcas[0], l1, bloco.marcas[2], "REFEIÇÕES", opc);
  });

  const letras = ["C", "A", "J"];
  [COL.marcas, COL.epMarcas, ...COL.ev.map((b) => b.marcas)].forEach((cols) => {
    cols.forEach((c, i) => escrever(aba, l2, c, letras[i], opc));
  });
}

// ---------------------------------------------------------------------
// Relacao nominal
// ---------------------------------------------------------------------
function montarRelacao(aba, militares, marcacoes, diaKey) {
  const por = { oficial: [], subtenSgt: [], cabo: [], sdEp: [], sdEv: [] };
  militares.forEach((m) => por[blocoDoMilitar(m)].push(m));
  Object.values(por).forEach((lista) => lista.sort(porNumero));

  // Bloco 1: oficiais, depois um subtitulo antes de cada grupo seguinte.
  const blocoNome = [];
  por.oficial.forEach((m) => blocoNome.push({ militar: m }));
  if (por.subtenSgt.length) {
    blocoNome.push({ subtitulo: "SUBTEN/SGT" });
    por.subtenSgt.forEach((m) => blocoNome.push({ militar: m }));
  }
  if (por.cabo.length) {
    blocoNome.push({ subtitulo: "CABOS" });
    por.cabo.forEach((m) => blocoNome.push({ militar: m }));
  }

  const evPorColuna = Math.ceil(por.sdEv.length / COL.ev.length);
  const altura = Math.max(
    LINHA.minimoRelacao,
    blocoNome.length,
    por.sdEp.length,
    evPorColuna
  );

  const marcaDe = (m) => marcacoes[m.id]?.[diaKey] || {};
  const xis = (marca, chave) => (marca[chave] ? "X" : undefined);

  for (let i = 0; i < altura; i++) {
    const linha = LINHA.primeiraRelacao + i;
    aba.getRow(linha).height = ALTURA_RELACAO;

    // --- Bloco 1 ---
    const item = blocoNome[i];
    if (item?.subtitulo) {
      escrever(aba, linha, COL.nome, item.subtitulo, {
        negrito: true,
        italico: true,
      });
      ["C", "A", "J"].forEach((letra, j) =>
        escrever(aba, linha, COL.marcas[j], letra, { negrito: true })
      );
    } else if (item?.militar) {
      const marca = marcaDe(item.militar);
      escrever(aba, linha, COL.nome, rotuloRelacao(item.militar), {
        sublinhado: true,
      });
      escrever(aba, linha, COL.marcas[0], xis(marca, "cafe"));
      escrever(aba, linha, COL.marcas[1], xis(marca, "almoco"));
      escrever(aba, linha, COL.marcas[2], xis(marca, "janta"));
    } else {
      escrever(aba, linha, COL.nome, undefined);
      COL.marcas.forEach((c) => escrever(aba, linha, c, undefined));
    }

    // --- Bloco 2: SD EP ---
    const ep = por.sdEp[i];
    if (ep) {
      const marca = marcaDe(ep);
      escrever(aba, linha, COL.epNumero, ep.numero_guerra);
      escrever(aba, linha, COL.epNome, String(ep.nome || "").trim(), {
        italico: true,
        sublinhado: true,
      });
      escrever(aba, linha, COL.epMarcas[0], xis(marca, "cafe"));
      escrever(aba, linha, COL.epMarcas[1], xis(marca, "almoco"));
      escrever(aba, linha, COL.epMarcas[2], xis(marca, "janta"));
    } else {
      escrever(aba, linha, COL.epNumero, undefined);
      escrever(aba, linha, COL.epNome, undefined);
      COL.epMarcas.forEach((c) => escrever(aba, linha, c, undefined));
    }

    // --- Blocos 3 a 5: SD EV (so o numero de guerra) ---
    COL.ev.forEach((bloco, b) => {
      const ev = por.sdEv[b * altura + i];
      if (ev) {
        const marca = marcaDe(ev);
        escrever(aba, linha, bloco.numero, ev.numero_guerra);
        escrever(aba, linha, bloco.marcas[0], xis(marca, "cafe"));
        escrever(aba, linha, bloco.marcas[1], xis(marca, "almoco"));
        escrever(aba, linha, bloco.marcas[2], xis(marca, "janta"));
      } else {
        // Linha sem militar: inutilizada, como no formulario em papel.
        escrever(aba, linha, bloco.numero, "///////");
        bloco.marcas.forEach((c) => escrever(aba, linha, c, undefined));
      }
    });
  }
}

// ---------------------------------------------------------------------
// Uma aba por dia
// ---------------------------------------------------------------------
function montarAba(pasta, dia, data, militares, marcacoes) {
  const aba = pasta.addWorksheet(dia.label.slice(0, 3).toUpperCase(), {
    pageSetup: {
      paperSize: 9, // A4
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 1,
      margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.3, header: 0.2, footer: 0.2 },
    },
  });

  LARGURA_COLUNAS.forEach(({ col, largura }) => {
    aba.getColumn(col).width = largura;
  });

  // Alturas exatas do formulario oficial.
  Object.entries(ALTURA_LINHAS).forEach(([linha, altura]) => {
    aba.getRow(Number(linha)).height = altura;
  });

  montarCabecalho(aba, dia.key, data);
  montarQuadroEtapas(aba, calcularTotais(militares, marcacoes, dia.key));
  montarAssinaturas(aba, data);
  montarCabecalhoRelacao(aba);
  montarRelacao(aba, militares, marcacoes, dia.key);
}

// ---------------------------------------------------------------------
// Gera o arquivo e dispara o download.
// ---------------------------------------------------------------------
export async function baixarExcel(militares, marcacoes, segunda) {
  const ExcelJS = await carregarExcelJS();
  const datas = datasDaSemana(segunda);

  const pasta = new ExcelJS.Workbook();
  pasta.creator = "Arranchamento — Seção de Comunicações";
  pasta.created = new Date();

  DIAS.forEach((dia) => {
    montarAba(pasta, dia, datas[dia.key].data, militares, marcacoes);
  });

  const buffer = await pasta.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `arranchamento_${datas.seg.curta.replace("/", "-")}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
