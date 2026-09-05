"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  DIAS,
  segundaDaSemana,
  paraISO,
  datasDaSemana,
  nomeExibicao,
} from "@/lib/semana";
import { calcularTotais, baixarExcel } from "@/lib/exportar";
import { Cabecalho, LinkTopo, Carregando, Erro } from "@/components/ui";

export default function Painel() {
  const router = useRouter();
  const [autorizado, setAutorizado] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [militares, setMilitares] = useState([]);
  const [marcacoes, setMarcacoes] = useState({});
  const [diaAtivo, setDiaAtivo] = useState("seg");
  const [deslocamento, setDeslocamento] = useState(1); // 1 = próxima semana
  const [gerando, setGerando] = useState(false);
  const [erroExport, setErroExport] = useState("");

  const base = segundaDaSemana();
  const segunda = new Date(base);
  segunda.setDate(segunda.getDate() + deslocamento * 7);
  const semanaISO = paraISO(segunda);
  const datas = datasDaSemana(segunda);

  const carregar = useCallback(async () => {
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

  async function baixar() {
    setErroExport("");
    setGerando(true);
    try {
      await baixarExcel(militares, marcacoes, segunda);
    } catch (e) {
      console.error(e);
      setErroExport("Não foi possível gerar a planilha. Tente de novo ou avise o responsável.");
    } finally {
      setGerando(false);
    }
  }

  if (carregando || !autorizado) return <Carregando />;

  const { linhas, soma } = calcularTotais(militares, marcacoes, diaAtivo);
  const semResposta = militares.filter((m) => !marcacoes[m.id]);
  const responderam = militares.length - semResposta.length;
  const percentual = militares.length
    ? Math.round((responderam / militares.length) * 100)
    : 0;

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-16 pt-7">
      <Cabecalho
        titulo="Painel da seção"
        subtitulo={`Semana de ${datas.seg.curta} a ${datas.dom.curta}`}
        acoes={<LinkTopo href="/semana">Minha semana</LinkTopo>}
      />

      {/* Navegacao de semanas */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <button onClick={() => setDeslocamento((d) => d - 1)} className="botao-fantasma">
          ← Anterior
        </button>
        <p className="font-titulo text-sm uppercase tracking-[0.2em] text-noite-300">
          {deslocamento === 1 ? "Próxima semana" : deslocamento === 0 ? "Semana atual" : "Outra semana"}
        </p>
        <button onClick={() => setDeslocamento((d) => d + 1)} className="botao-fantasma">
          Próxima →
        </button>
      </div>

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

      <button onClick={baixar} disabled={gerando} className="botao-ouro mt-4">
        {gerando ? "Gerando planilha…" : "Baixar planilha da semana"}
      </button>
      <div className="mt-2">
        <Erro texto={erroExport} />
      </div>

      {/* Quem falta responder */}
      <section className="mt-8">
        <div className="mb-3 flex items-end justify-between">
          <h2 className="font-titulo text-lg font-semibold uppercase tracking-wide text-white">
            Ainda não responderam
          </h2>
          <span className="text-sm tabular-nums text-noite-300">
            {responderam}/{militares.length}
          </span>
        </div>

        <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-ouro-500 to-ouro-300 transition-all"
            style={{ width: `${percentual}%` }}
          />
        </div>

        {semResposta.length === 0 ? (
          <p className="cartao px-4 py-3.5 text-sm text-ouro-200">
            Todos os militares cadastrados já enviaram.
          </p>
        ) : (
          <ul className="cartao divide-y divide-white/[0.06] overflow-hidden">
            {semResposta.map((m) => (
              <li key={m.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="text-noite-100">{nomeExibicao(m)}</span>
                <span className="rounded-md border border-white/10 px-2 py-0.5 text-[11px] uppercase tracking-wider text-noite-300">
                  {m.categoria}
                </span>
              </li>
            ))}
          </ul>
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
