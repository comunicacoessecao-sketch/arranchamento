// Testes das regras de período e prazo.
//
//   npm test
//
// Essas regras foram escritas errado duas vezes durante o desenvolvimento
// (primeiro semana de segunda a domingo, depois virando na terça), e nas
// duas o erro só apareceu quando alguém leu a tela. São funções puras, sem
// banco e sem navegador, então dá para travar o comportamento aqui.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  DIAS,
  PRIMEIRO_DIA,
  ULTIMO_DIA,
  inicioPeriodo,
  datasDaSemana,
  paraISO,
  deISO,
  prazoDoDia,
  prazoVenceHoje,
  diasQueFechamHoje,
  diaEditavel,
  horaLimiteEscrita,
  semanaVazia,
  nomeExibicao,
} from "../lib/semana.js";

// Semana de referência: terça 08/09/2026 a segunda 14/09/2026.
const TER = new Date(2026, 8, 8);
const d = (dia) => new Date(2026, 8, dia);
const hm = (h, m = 0) => h * 60 + m;

// ---------------------------------------------------------------------
test("o período vai de terça a segunda", () => {
  assert.deepEqual(
    DIAS.map((x) => x.key),
    ["ter", "qua", "qui", "sex", "sab", "dom", "seg"]
  );
  assert.equal(PRIMEIRO_DIA, "ter");
  assert.equal(ULTIMO_DIA, "seg");
});

test("as datas do período seguem a terça de abertura", () => {
  const datas = datasDaSemana(TER);
  assert.equal(datas.ter.curta, "08/09");
  assert.equal(datas.qua.curta, "09/09");
  assert.equal(datas.sab.curta, "12/09");
  assert.equal(datas.seg.curta, "14/09");
});

// ---------------------------------------------------------------------
// Virada do período
// ---------------------------------------------------------------------
test("o período vira na segunda, não na terça", () => {
  // Domingo 06/09 ainda está no período que começou em 01/09.
  assert.equal(paraISO(inicioPeriodo(d(6))), "2026-09-01");
  // Segunda 07/09: papel novo.
  assert.equal(paraISO(inicioPeriodo(d(7))), "2026-09-08");
});

test("o período NÃO troca no meio da semana", () => {
  // O papel fica em circulação o período inteiro: de terça a domingo o
  // militar continua no mesmo período aberto na segunda.
  for (const dia of [8, 9, 10, 11, 12, 13]) {
    assert.equal(
      paraISO(inicioPeriodo(d(dia))),
      "2026-09-08",
      `dia ${dia} deveria seguir no período de 08/09`
    );
  }
  // Só na segunda seguinte é que vira.
  assert.equal(paraISO(inicioPeriodo(d(14))), "2026-09-15");
});

test("inicioPeriodo sempre cai numa terça-feira", () => {
  for (let dia = 1; dia <= 30; dia++) {
    assert.equal(inicioPeriodo(d(dia)).getDay(), 2, `dia ${dia}`);
  }
});

// ---------------------------------------------------------------------
// Prazos
// ---------------------------------------------------------------------
test("dia útil fecha às 13:30 da véspera", () => {
  const casos = [
    ["ter", 7, hm(13, 30)],
    ["qua", 8, hm(13, 30)],
    ["qui", 9, hm(13, 30)],
    ["sex", 10, hm(13, 30)],
  ];
  for (const [dia, diaDoPrazo, minutos] of casos) {
    const prazo = prazoDoDia(dia, TER);
    assert.equal(paraISO(prazo.data), paraISO(d(diaDoPrazo)), dia);
    assert.equal(prazo.minutos, minutos, dia);
  }
});

test("sábado, domingo e segunda fecham juntos na sexta às 10:00", () => {
  for (const dia of ["sab", "dom", "seg"]) {
    const prazo = prazoDoDia(dia, TER);
    assert.equal(paraISO(prazo.data), "2026-09-11", `${dia}: sexta do período`);
    assert.equal(prazo.minutos, hm(10), dia);
    assert.equal(horaLimiteEscrita(dia), "10:00");
  }
  assert.equal(horaLimiteEscrita("qua"), "13:30");
});

// ---------------------------------------------------------------------
// Edição
// ---------------------------------------------------------------------
test("hoje e o passado estão fechados", () => {
  const quarta = d(9);
  assert.equal(diaEditavel("ter", TER, quarta, hm(8)), false, "ontem");
  assert.equal(diaEditavel("qua", TER, quarta, hm(8)), false, "hoje");
});

test("o dia seguinte fecha às 13:30 em ponto", () => {
  const quarta = d(9);
  assert.equal(diaEditavel("qui", TER, quarta, hm(13, 29)), true);
  assert.equal(diaEditavel("qui", TER, quarta, hm(13, 30)), false);
  assert.equal(diaEditavel("qui", TER, quarta, hm(14)), false);
});

test("na sexta às 10:00 o período inteiro se encerra", () => {
  const sexta = d(11);
  for (const dia of ["sab", "dom", "seg"]) {
    assert.equal(diaEditavel(dia, TER, sexta, hm(9, 59)), true, `${dia} às 9:59`);
    assert.equal(diaEditavel(dia, TER, sexta, hm(10)), false, `${dia} às 10:00`);
  }
  const abertos = DIAS.filter((x) => diaEditavel(x.key, TER, sexta, hm(10)));
  assert.equal(abertos.length, 0);
});

test("domingo não continua aberto depois da entrega de sexta", () => {
  // Era o furo da regra antiga (13:30 da véspera): domingo só fecharia no
  // sábado, quando a seção nem está no batalhão.
  assert.equal(diaEditavel("dom", TER, d(12), hm(9)), false, "sábado de manhã");
  assert.equal(diaEditavel("dom", TER, d(13), hm(9)), false, "domingo de manhã");
});

test("no fim de semana não sobra nenhum dia aberto", () => {
  for (const dia of [12, 13]) {
    const abertos = DIAS.filter((x) => diaEditavel(x.key, TER, d(dia), hm(11)));
    assert.equal(abertos.length, 0, `dia ${dia}`);
  }
});

test("na segunda que abre o período, tudo está aberto menos a terça", () => {
  // Segunda 07/09: o período 08/09-14/09 acabou de nascer. A terça fecha
  // hoje às 13:30; os demais seguem abertos.
  const segunda = d(7);
  assert.equal(diaEditavel("ter", TER, segunda, hm(10)), true);
  assert.equal(diaEditavel("ter", TER, segunda, hm(14)), false);
  for (const dia of ["qua", "qui", "sex", "sab", "dom", "seg"]) {
    assert.equal(diaEditavel(dia, TER, segunda, hm(14)), true, dia);
  }
});

test("prazoVenceHoje aponta o dia que fecha na data informada", () => {
  assert.equal(prazoVenceHoje("qui", TER, d(9)), true, "quinta fecha na quarta");
  assert.equal(prazoVenceHoje("qui", TER, d(8)), false);
  assert.equal(prazoVenceHoje("sab", TER, d(11)), true, "sábado fecha na sexta");
  assert.equal(prazoVenceHoje("dom", TER, d(11)), true);
  assert.equal(prazoVenceHoje("seg", TER, d(11)), true);
});

test("diasQueFechamHoje aponta o que entra na entrega do dia", () => {
  // Em dia útil, um só: na quarta fecha a quinta.
  assert.deepEqual(diasQueFechamHoje(TER, d(9)), ["qui"]);
  // Na sexta, os três do fim de semana saem juntos.
  assert.deepEqual(diasQueFechamHoje(TER, d(11)), ["sab", "dom", "seg"]);
  // No sábado não há entrega — a seção nem está no batalhão.
  assert.deepEqual(diasQueFechamHoje(TER, d(12)), []);
});

// ---------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------
test("paraISO e deISO não escorregam de fuso", () => {
  const texto = "2026-09-08";
  assert.equal(paraISO(deISO(texto)), texto);
  assert.equal(deISO(texto).getDate(), 8);
  assert.equal(deISO(texto).getMonth(), 8);
});

test("semanaVazia traz os sete dias sem nada marcado", () => {
  const vazia = semanaVazia();
  assert.deepEqual(Object.keys(vazia).sort(), DIAS.map((x) => x.key).sort());
  for (const dia of DIAS) {
    assert.deepEqual(vazia[dia.key], { cafe: false, almoco: false, janta: false });
  }
});

// ---------------------------------------------------------------------
// A planilha do Rancho
// ---------------------------------------------------------------------
test("a planilha nunca escreve o nome dos SD EV", async () => {
  // Os SD EV passaram a ter nome no site, para dar para identificar quem é
  // nas listas. Na planilha do Rancho eles continuam só com o número — e
  // isso não pode se perder numa alteração futura.
  const ExcelJS = (await import("exceljs")).default;
  const { montarPasta } = await import("../lib/exportar.js");

  const militares = [
    {
      id: "a",
      identificador: "409",
      numero_guerra: "409",
      nome: "SUTIL",
      posto_grad: "SD",
      categoria: "Cabo/Sd",
      tipo_sd: "EV",
      bloco: "sdEv",
      ordem: 1,
    },
  ];
  const marcacoes = { a: { ter: { cafe: true, almoco: false, janta: false } } };

  const { pasta } = montarPasta(ExcelJS, militares, marcacoes, TER, ["ter"]);
  const aba = pasta.worksheets[0];

  // Coluna J: número do primeiro bloco de SD EV.
  assert.equal(aba.getCell(18, 10).text, "409");

  let vazou = false;
  aba.eachRow((linha) =>
    linha.eachCell((celula) => {
      // Célula mesclada sem valor faz o ExcelJS estourar ao ler `.text`.
      let conteudo = "";
      try {
        conteudo = String(celula.text ?? "");
      } catch {
        conteudo = "";
      }
      if (conteudo.toUpperCase().includes("SUTIL")) vazou = true;
    })
  );
  assert.equal(vazou, false, "o nome do SD EV apareceu na planilha");
});

test("no site, todo militar sai identificável", () => {
  // Era o problema: sem o número, os soldados viravam todos "SD" nas
  // listas do painel e não dava para saber de quem se tratava.
  const casos = [
    [{ posto_grad: "CAP", numero_guerra: null, nome: "SIQUEIRA" }, "CAP SIQUEIRA"],
    [{ posto_grad: "3º SGT", numero_guerra: null, nome: "BORGES" }, "3º SGT BORGES"],
    [{ posto_grad: "CB", numero_guerra: "106", nome: "CARVALHO" }, "CB 106 CARVALHO"],
    [{ posto_grad: "SD", numero_guerra: "231", nome: "LEONAN" }, "SD 231 LEONAN"],
    [{ posto_grad: "SD", numero_guerra: "409", nome: "SUTIL" }, "SD 409 SUTIL"],
    // Soldado que ainda não tem nome na relação: pelo menos o número sai.
    [{ posto_grad: "SD", numero_guerra: "442", nome: null }, "SD 442"],
  ];
  for (const [militar, esperado] of casos) {
    assert.equal(nomeExibicao(militar), esperado);
  }
  assert.equal(nomeExibicao(null), "");
});

test("a planilha traz todo o efetivo, mesmo quem não se arranchou", async () => {
  // A relação nominal do Rancho é fixa: aparecem todos, e o que muda de um
  // dia para o outro são só os X. Antes a planilha saía com as linhas de
  // quem tinha conta no site, e o resto em branco.
  const ExcelJS = (await import("exceljs")).default;
  const { montarPasta, efetivoParaPlanilha } = await import("../lib/exportar.js");

  const autorizados = [
    { identificador: "borges", numero_guerra: null, nome: "BORGES", posto_grad: "3º SGT", categoria: "Subten/Sgt", bloco: "subtenSgt", ordem: 1 },
    { identificador: "106", numero_guerra: "106", nome: "CARVALHO", posto_grad: "CB", categoria: "Cabo/Sd", bloco: "cabo", ordem: 2 },
    { identificador: "231", numero_guerra: "231", nome: "LEONAN", posto_grad: "SD", categoria: "Cabo/Sd", bloco: "sdEp", ordem: 3 },
    { identificador: "409", numero_guerra: "409", nome: "SUTIL", posto_grad: "SD", categoria: "Cabo/Sd", bloco: "sdEv", ordem: 4 },
  ];
  // Só um deles criou acesso, e só ele marcou alguma coisa.
  const militares = [{ id: "uuid-1", identificador: "231" }];
  const marcacoes = { "uuid-1": { ter: { cafe: true, almoco: false, janta: false } } };

  const { pessoas, marcas } = efetivoParaPlanilha(autorizados, militares, marcacoes);
  assert.equal(pessoas.length, 4, "todos entram na planilha");

  const { pasta } = montarPasta(ExcelJS, pessoas, marcas, TER, ["ter"]);
  const aba = pasta.worksheets[0];

  const conteudo = [];
  aba.eachRow((linha) =>
    linha.eachCell((celula) => {
      try {
        conteudo.push(String(celula.text ?? ""));
      } catch {
        /* célula mesclada vazia */
      }
    })
  );
  const texto = conteudo.join("|");

  // Aparecem os quatro, mesmo os três que nunca tocaram no site.
  assert.ok(texto.includes("3º SGT BORGES"), "graduado sem acesso");
  assert.ok(texto.includes("106 CARVALHO"), "cabo sem acesso");
  assert.ok(texto.includes("LEONAN"), "SD EP que marcou");
  assert.ok(conteudo.includes("409"), "SD EV sem acesso, pelo número");

  // E só quem marcou tem X: um único X na aba inteira.
  assert.equal(conteudo.filter((c) => c === "X").length, 1);
});
