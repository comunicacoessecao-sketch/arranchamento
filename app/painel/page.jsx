"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  DIAS,
  PRIMEIRO_DIA,
  ULTIMO_DIA,
  inicioPeriodo,
  paraISO,
  datasDaSemana,
  nomeExibicao,
  diasQueFechamHoje,
  horaLimiteEscrita,
  rotuloDoDia,
} from "@/lib/semana";
import { relogioDoServidor } from "@/lib/hoje";
import { calcularTotais, baixarExcel } from "@/lib/exportar";
import { Cabecalho, LinkTopo, Carregando, Erro } from "@/components/ui";

export default function Painel() {
  const router = useRouter();
  const [autorizado, setAutorizado] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [militares, setMilitares] = useState([]);
  const [autorizados, setAutorizados] = useState([]);
  const [marcacoes, setMarcacoes] = useState({});
  const [diaAtivo, setDiaAtivo] = useState(PRIMEIRO_DIA);
  // 0 = o periodo que os militares estao preenchendo agora.
  const [deslocamento, setDeslocamento] = useState(0);
  const [hoje, setHoje] = useState(null);
  const [gerando, setGerando] = useState(false);
  const [erroExport, setErroExport] = useState("");
  const jaEscolheuDia = useRef(false);

  // A data vem do servidor, nao do relogio do aparelho.
  useEffect(() => {
    relogioDoServidor().then((relogio) => setHoje(relogio.hoje));
  }, []);

  let inicio = null;
  if (hoje) {
    inicio = inicioPeriodo(hoje);
    inicio.setDate(inicio.getDate() + deslocamento * 7);
  }
  const semanaISO = inicio ? paraISO(inicio) : null;
  const datas = inicio ? datasDaSemana(inicio) : null;

  // Os dias que entram na planilha entregue hoje. Em geral um; na sexta,
  // sábado, domingo e segunda saem juntos.
  const fechamHoje = deslocamento === 0 ? diasQueFechamHoje(inicio, hoje) : [];

  // Abre já no dia da entrega de hoje, que e o que a seção vai lancar.
  // Uma vez só: depois disso quem manda e a escolha do administrador.
  useEffect(() => {
    if (jaEscolheuDia.current || !semanaISO) return;
    jaEscolheuDia.current = true;
    if (fechamHoje.length) setDiaAtivo(fechamHoje[0]);
  }, [semanaISO, fechamHoje]);

  const carregar = useCallback(async () => {
    if (!semanaISO) return;
    setCarregando(true);
    const { data: sessao } = await supabase.auth.getSession();
    if (!sessao.session) {
      router.replace("/");
      return;
    }

    const { data: perfil } = await supabase
      .from("militares")
      .select("admin")
      .eq("id", sessao.session.user.id)
      .single();

    if (!perfil?.admin) {
      router.replace("/semana");
      return;
    }
    setAutorizado(true);

    const { data: lista } = await supabase.from("militares").select("*");
    setMilitares(lista || []);

    // A relação inteira: e contra ela que o acompanhamento faz sentido.
    // So o administrador consegue le-la (regra no banco).
    const { data: relacao, error: erroRelacao } = await supabase
      .from("autorizados")
      .select("identificador, numero_guerra, nome, posto_grad, categoria, ordem");
    if (erroRelacao) console.error("autorizados:", erroRelacao);
    setAutorizados(relacao || []);

    const { data: linhas } = await supabase
      .from("arranchamentos")
      .select("*")
      .eq("semana", semanaISO);

    const mapa = {};
    (linhas || []).forEach((l) => {
      if (!mapa[l.militar_id]) mapa[l.militar_id] = {};
      mapa[l.militar_id][l.dia] = { cafe: l.cafe, almoco: l.almoco, janta: l.janta };
    });
    setMarcacoes(mapa);
    setCarregando(false);
  }, [router, semanaISO]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function baixar(escolhidos) {
    setErroExport("");
    setGerando(true);
    try {
      await baixarExcel(militares, marcacoes, inicio, escolhidos);
    } catch (e) {
      console.error(e);
      setErroExport("Não foi possível gerar a planilha. Tente de novo ou avise o responsável.");
    } finally {
      setGerando(false);
    }
  }

  if (carregando || !autorizado || !datas) return <Carregando />;

  const { linhas, soma } = calcularTotais(militares, marcacoes, diaAtivo);
  // A conta certa e contra a RELAÇÃO da seção, nao contra quem ja criou
  // acesso — senao "18 de 20" parece otimo enquanto 165 pessoas nem entraram
  // no sistema. São dois problemas diferentes, e por isso duas listas.
  const idsComAcesso = new Set(militares.map((m) => m.identificador).filter(Boolean));
  const semAcesso = autorizados
    .filter((a) => !idsComAcesso.has(a.identificador))
    .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));

  const semResposta = militares.filter((m) => !marcacoes[m.id]);
  const responderam = militares.length - semResposta.length;
  // Se a relação ainda nao foi carregada, cai no que da para saber.
  const esperado = autorizados.length || militares.length;
  const percentual = esperado ? Math.round((responderam / esperado) * 100) : 0;

  const rotuloAutorizado = (a) =>
    [a.posto_grad, a.nome].filter(Boolean).join(" ") ||
    (a.numero_guerra ? `Nº ${a.numero_guerra}` : a.identificador);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-16 pt-7">
      <Cabecalho
        titulo="Painel da seção"
        subtitulo={`Período de ${datas[PRIMEIRO_DIA].curta} a ${datas[ULTIMO_DIA].curta}`}
        acoes={<LinkTopo href="/semana">Minha semana</LinkTopo>}
      />

      {/* Navegacao de semanas */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <button onClick={() => setDeslocamento((d) => d - 1)} className="botao-fantasma">
          ← Anterior
        </button>
        <p className="font-titulo text-sm uppercase tracking-[0.2em] text-noite-300">
          {deslocamento === 0
            ? "Período em preenchimento"
            : deslocamento < 0
              ? "Período anterior"
              : "Período futuro"}
        </p>
        <button onClick={() => setDeslocamento((d) => d + 1)} className="botao-fantasma">
          Próxima →
        </button>
      </div>

      {fechamHoje.length > 0 && (
        <div className="cartao mb-3 border-ouro-500/30 bg-ouro-500/[0.08] px-4 py-3">
          <p className="titulo-secao">Entrega de hoje</p>
          <p className="mt-1 font-titulo text-lg font-semibold uppercase tracking-wide text-ouro-200">
            {fechamHoje.map((k) => `${rotuloDoDia(k)} ${datas[k].curta}`).join(" · ")}
          </p>
          <p className="mt-0.5 text-xs text-noite-300">
            Fecha às {horaLimiteEscrita(fechamHoje[0])} — depois disso o militar
            não consegue mais alterar.
          </p>
        </div>
      )}

      {/* Dias */}
      <div className="rolagem-fina mb-4 flex gap-1.5 overflow-x-auto pb-1.5">
        {DIAS.map((d) => {
          const ativo = diaAtivo === d.key;
          return (
            <button
              key={d.key}
              onClick={() => setDiaAtivo(d.key)}
              className={
                "flex shrink-0 flex-col items-center rounded-xl border px-3.5 py-2 transition " +
                (ativo
                  ? "border-ouro-500/70 bg-ouro-500/15 text-ouro-200"
                  : "border-white/10 bg-white/[0.03] text-noite-300 hover:border-white/20")
              }
            >
              <span className="font-titulo text-sm font-semibold uppercase tracking-wider">
                {d.label.slice(0, 3)}
              </span>
              <span className="text-[11px] tabular-nums opacity-80">{datas[d.key].curta}</span>
            </button>
          );
        })}
      </div>

      {/* Resumo do dia */}
      <div className="mb-3 grid grid-cols-4 gap-2">
        <Indicador rotulo="Café" valor={soma.cafe} />
        <Indicador rotulo="Almoço" valor={soma.almoco} />
        <Indicador rotulo="Janta" valor={soma.janta} />
        <Indicador rotulo="Completa" valor={soma.completa} destaque />
      </div>

      {/* Tabela por categoria */}
      <div className="cartao overflow-hidden">
        <div className="border-b border-white/[0.07] px-4 py-3">
          <p className="titulo-secao">Etapas reduzidas por categoria</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-noite-300">
              <th className="px-4 py-2 font-medium">Categoria</th>
              <th className="px-2 py-2 text-right font-medium">Café</th>
              <th className="px-2 py-2 text-right font-medium">Almoço</th>
              <th className="px-2 py-2 text-right font-medium">Janta</th>
              <th className="px-4 py-2 text-right font-medium">Completa</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.categoria} className="border-t border-white/[0.06]">
                <td className="px-4 py-2.5 text-noite-100">{l.categoria}</td>
                <td className="px-2 py-2.5 text-right tabular-nums text-noite-200">{l.cafe}</td>
                <td className="px-2 py-2.5 text-right tabular-nums text-noite-200">{l.almoco}</td>
                <td className="px-2 py-2.5 text-right tabular-nums text-noite-200">{l.janta}</td>
                <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-ouro-300">
                  {l.completa}
                </td>
              </tr>
            ))}
            <tr className="border-t border-ouro-500/30 bg-ouro-500/[0.06]">
              <td className="px-4 py-2.5 font-titulo text-base font-semibold uppercase tracking-wider text-white">
                Soma
              </td>
              <td className="px-2 py-2.5 text-right font-semibold tabular-nums text-white">
                {soma.cafe}
              </td>
              <td className="px-2 py-2.5 text-right font-semibold tabular-nums text-white">
                {soma.almoco}
              </td>
              <td className="px-2 py-2.5 text-right font-semibold tabular-nums text-white">
                {soma.janta}
              </td>
              <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-ouro-300">
                {soma.completa}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* O dia é o que a seção entrega todo dia; o período inteiro serve
          para conferência e arquivo. */}
      <button
        onClick={() => baixar([diaAtivo])}
        disabled={gerando}
        className="botao-ouro mt-4"
      >
        {gerando
          ? "Gerando planilha…"
          : `Baixar ${rotuloDoDia(diaAtivo).toLowerCase()} ${datas[diaAtivo].curta}`}
      </button>
      <button
        onClick={() => baixar()}
        disabled={gerando}
        className="botao-fantasma mt-2 w-full"
      >
        Baixar o período inteiro (7 abas)
      </button>
      <div className="mt-2">
        <Erro texto={erroExport} />
      </div>

      {/* Situacao da relacao */}
      <section className="mt-8">
        <div className="mb-3 flex items-end justify-between">
          <h2 className="font-titulo text-lg font-semibold uppercase tracking-wide text-white">
            Situação da relação
          </h2>
          <span className="text-sm tabular-nums text-noite-300">
            {responderam} de {esperado}
          </span>
        </div>

        <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-ouro-500 to-ouro-300 transition-all"
            style={{ width: `${percentual}%` }}
          />
        </div>
        <p className="mb-4 text-[11px] text-noite-400">
          {autorizados.length
            ? `${responderam} enviaram · ${semResposta.length} com acesso não enviaram · ${semAcesso.length} nunca criaram acesso`
            : "Não consegui ler a relação de autorizados — os números abaixo contam só quem já criou acesso."}
        </p>

        <ListaDePendencia
          titulo="Não responderam"
          descricao="Já têm acesso, mas não enviaram nada neste período."
          vazio="Todos que têm acesso já enviaram."
          itens={semResposta.map((m) => ({
            chave: m.id,
            nome: nomeExibicao(m),
            etiqueta: m.categoria,
          }))}
        />

        {autorizados.length > 0 && (
          <ListaDePendencia
            titulo="Nunca criaram acesso"
            descricao="Estão na relação da seção mas ainda não entraram no site."
            vazio="Toda a relação já criou acesso."
            itens={semAcesso.map((a) => ({
              chave: a.identificador,
              nome: rotuloAutorizado(a),
              etiqueta: a.categoria,
            }))}
          />
        )}
      </section>
    </main>
  );
}

function Indicador({ rotulo, valor, destaque }) {
  return (
    <div
      className={
        "cartao px-3 py-3 text-center " + (destaque ? "border-ouro-500/40 bg-ouro-500/[0.08]" : "")
      }
    >
      <p
        className={
          "font-titulo text-2xl font-bold leading-none tabular-nums " +
          (destaque ? "text-ouro-300" : "text-white")
        }
      >
        {valor}
      </p>
      <p className="mt-1 text-[10px] uppercase tracking-wider text-noite-300">{rotulo}</p>
    </div>
  );
}

// Lista de pendencia com altura limitada: a de "nunca criaram acesso" pode
// ter mais de cem nomes no comeco, e nao pode empurrar a pagina inteira.
function ListaDePendencia({ titulo, descricao, vazio, itens }) {
  return (
    <div className="mb-4">
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <h3 className="font-titulo text-sm font-semibold uppercase tracking-wider text-ouro-400">
          {titulo}
        </h3>
        <span className="text-sm font-semibold tabular-nums text-noite-200">
          {itens.length}
        </span>
      </div>
      <p className="mb-2 text-[11px] leading-snug text-noite-400">{descricao}</p>

      {itens.length === 0 ? (
        <p className="cartao px-4 py-3 text-sm text-ouro-200">{vazio}</p>
      ) : (
        <ul className="rolagem-fina cartao max-h-72 divide-y divide-white/[0.06] overflow-y-auto">
          {itens.map((i) => (
            <li key={i.chave} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="text-noite-100">{i.nome}</span>
              <span className="shrink-0 rounded-md border border-white/10 px-2 py-0.5 text-[11px] uppercase tracking-wider text-noite-300">
                {i.etiqueta}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
