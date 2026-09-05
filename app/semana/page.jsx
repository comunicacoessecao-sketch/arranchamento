"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  DIAS,
  REFEICOES,
  PRIMEIRO_DIA,
  ULTIMO_DIA,
  inicioPeriodo,
  paraISO,
  datasDaSemana,
  semanaVazia,
  nomeExibicao,
} from "@/lib/semana";
import { dataDeHoje } from "@/lib/hoje";
import { Cabecalho, LinkTopo, Erro, Aviso, Carregando } from "@/components/ui";

export default function Semana() {
  const router = useRouter();
  const [militar, setMilitar] = useState(null);
  const [marcacoes, setMarcacoes] = useState(semanaVazia());
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState("");
  const [erro, setErro] = useState("");

  // A data vem do servidor, nao do relogio do aparelho.
  const [hoje, setHoje] = useState(null);
  const [dataConfirmada, setDataConfirmada] = useState(true);

  useEffect(() => {
    dataDeHoje().then(({ data, doServidor }) => {
      setHoje(data);
      setDataConfirmada(doServidor);
    });
  }, []);

  const inicio = hoje ? inicioPeriodo(hoje) : null;
  const semanaISO = inicio ? paraISO(inicio) : null;
  const datas = inicio ? datasDaSemana(inicio) : null;

  const carregar = useCallback(async () => {
    if (!semanaISO) return;
    const { data: sessao } = await supabase.auth.getSession();
    if (!sessao.session) {
      router.replace("/");
      return;
    }
    const uid = sessao.session.user.id;

    const { data: perfil } = await supabase
      .from("militares")
      .select("*")
      .eq("id", uid)
      .single();
    setMilitar(perfil);

    const { data: linhas } = await supabase
      .from("arranchamentos")
      .select("*")
      .eq("militar_id", uid)
      .eq("semana", semanaISO);

    const atual = semanaVazia();
    (linhas || []).forEach((l) => {
      atual[l.dia] = { cafe: l.cafe, almoco: l.almoco, janta: l.janta };
    });
    setMarcacoes(atual);
    setCarregando(false);
  }, [router, semanaISO]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  function alternar(diaKey, refeicaoKey) {
    setAviso("");
    setMarcacoes((prev) => ({
      ...prev,
      [diaKey]: { ...prev[diaKey], [refeicaoKey]: !prev[diaKey][refeicaoKey] },
    }));
  }

  function marcarTodas(diaKey) {
    const todasMarcadas = REFEICOES.every((r) => marcacoes[diaKey][r.key]);
    setAviso("");
    setMarcacoes((prev) => ({
      ...prev,
      [diaKey]: { cafe: !todasMarcadas, almoco: !todasMarcadas, janta: !todasMarcadas },
    }));
  }

  async function enviar() {
    setSalvando(true);
    setErro("");
    setAviso("");

    const registros = DIAS.map((d) => ({
      militar_id: militar.id,
      semana: semanaISO,
      dia: d.key,
      cafe: marcacoes[d.key].cafe,
      almoco: marcacoes[d.key].almoco,
      janta: marcacoes[d.key].janta,
      atualizado_em: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from("arranchamentos")
      .upsert(registros, { onConflict: "militar_id,semana,dia" });

    setSalvando(false);
    if (error) {
      setErro("Não foi possível enviar. Verifique a conexão e tente de novo.");
      return;
    }
    setAviso("Arranchamento enviado.");
  }

  async function sair() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  if (carregando || !datas) return <Carregando />;

  const totalMarcado = DIAS.reduce(
    (acc, d) => acc + REFEICOES.filter((r) => marcacoes[d.key][r.key]).length,
    0
  );

  return (
    <main className="mx-auto w-full max-w-md px-4 pb-40 pt-7">
      <Cabecalho
        titulo="Meu arranchamento"
        subtitulo={nomeExibicao(militar)}
        acoes={
          <>
            {militar?.admin && <LinkTopo href="/painel">Painel</LinkTopo>}
            <LinkTopo onClick={sair}>Sair</LinkTopo>
          </>
        }
      />

      <div className="cartao mb-4 flex items-center justify-between px-4 py-3">
        <div>
          <p className="titulo-secao">Período a arranchar</p>
          <p className="mt-1 font-titulo text-xl font-semibold tracking-wide text-white">
            {datas[PRIMEIRO_DIA].curta} — {datas[ULTIMO_DIA].curta}
          </p>
        </div>
        <div className="text-right">
          <p className="font-titulo text-3xl font-bold leading-none text-ouro-400">
            {totalMarcado}
          </p>
          <p className="text-[11px] uppercase tracking-wider text-noite-300">
            {totalMarcado === 1 ? "refeição" : "refeições"}
          </p>
        </div>
      </div>

      <div className="space-y-2.5">
        {DIAS.map((d, i) => {
          const fds = d.key === "sab" || d.key === "dom";
          const marcadasNoDia = REFEICOES.filter((r) => marcacoes[d.key][r.key]).length;

          return (
            <section
              key={d.key}
              className="cartao animate-surgir overflow-hidden"
              style={{ animationDelay: `${i * 35}ms` }}
            >
              <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-2.5">
                <div className="flex items-baseline gap-2.5">
                  <span
                    className={
                      "font-titulo text-lg font-semibold uppercase tracking-wide " +
                      (fds ? "text-ouro-300" : "text-white")
                    }
                  >
                    {d.label}
                  </span>
                  <span className="text-xs tabular-nums text-noite-300">
                    {datas[d.key].curta}
                  </span>
                  {marcadasNoDia > 0 && (
                    <span className="h-1.5 w-1.5 rounded-full bg-ouro-400" />
                  )}
                </div>
                <button
                  onClick={() => marcarTodas(d.key)}
                  className="rounded-lg px-2 py-1 text-[11px] font-medium uppercase tracking-wider text-noite-300 transition hover:bg-white/5 hover:text-ouro-300"
                >
                  Dia inteiro
                </button>
              </div>

              <div className="grid grid-cols-3 gap-px bg-white/[0.06]">
                {REFEICOES.map((r) => {
                  const ativo = marcacoes[d.key][r.key];
                  return (
                    <button
                      key={r.key}
                      onClick={() => alternar(d.key, r.key)}
                      aria-pressed={ativo}
                      className={
                        "flex flex-col items-center gap-1.5 py-3.5 transition " +
                        (ativo
                          ? "bg-ouro-500/[0.16] text-ouro-200"
                          : "bg-noite-900/40 text-noite-300 hover:bg-white/[0.04]")
                      }
                    >
                      <IconeRefeicao tipo={r.key} ativo={ativo} />
                      <span
                        className={
                          "text-xs uppercase tracking-wider " + (ativo ? "font-semibold" : "")
                        }
                      >
                        {r.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <div className="mt-4 space-y-2">
        {!dataConfirmada && (
          <p className="rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-xs text-noite-300">
            Não consegui confirmar a data no servidor — o período acima foi
            calculado pelo relógio deste aparelho. Se ele estiver errado, o
            arranchamento vai para a semana errada.
          </p>
        )}
        <Erro texto={erro} />
        <Aviso texto={aviso} />
      </div>

      {/* Barra fixa no rodape: fica sempre ao alcance do polegar no celular. */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-white/10 bg-noite-950/85 px-4 pb-5 pt-3 backdrop-blur-md">
        <div className="mx-auto max-w-md">
          <button onClick={enviar} disabled={salvando} className="botao-ouro">
            {salvando ? "Enviando…" : "Enviar arranchamento"}
          </button>
          <p className="mt-2 text-center text-[11px] text-noite-400">
            Pode alterar e reenviar quantas vezes quiser até o prazo da seção.
          </p>
        </div>
      </div>
    </main>
  );
}

function IconeRefeicao({ tipo, ativo }) {
  const cor = ativo ? "#e9cf7d" : "#8095bd";
  const comum = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: cor,
    strokeWidth: 1.6,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };

  if (tipo === "cafe") {
    return (
      <svg {...comum}>
        <path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9Z" />
        <path d="M17 10h1.5a2.5 2.5 0 0 1 0 5H17" />
        <path d="M8 3v2.5M12 3v2.5" />
      </svg>
    );
  }
  if (tipo === "almoco") {
    return (
      <svg {...comum}>
        <path d="M6 3v8M9 3v8M7.5 11v10" />
        <path d="M16.5 3c-1.5 1.5-1.5 6 0 7.5V21" />
      </svg>
    );
  }
  return (
    <svg {...comum}>
      <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />
    </svg>
  );
}
