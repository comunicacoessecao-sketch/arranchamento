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
  diaEditavel,
  prazoVenceHoje,
  horaLimiteEscrita,
  LIMITE_ESCRITO,
  LIMITE_FDS_ESCRITO,
} from "@/lib/semana";
import { relogioDoServidor, minutosAgora } from "@/lib/hoje";
import { Cabecalho, LinkTopo, Erro, Aviso, Carregando } from "@/components/ui";

export default function Semana() {
  const router = useRouter();
  const [militar, setMilitar] = useState(null);
  const [marcacoes, setMarcacoes] = useState(semanaVazia());
  // O que esta gravado no banco. Comparado com `marcacoes`, diz se ha
  // alteracao que o militar ainda nao enviou.
  const [salvo, setSalvo] = useState(semanaVazia());
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState("");
  const [erro, setErro] = useState("");

  // A data e a hora vem do servidor, nao do relogio do aparelho.
  const [relogio, setRelogio] = useState(null);
  const [agoraMs, setAgoraMs] = useState(() => Date.now());

  useEffect(() => {
    relogioDoServidor().then(setRelogio);
    // Faz o corte das 13:30 valer mesmo com a tela aberta ha horas.
    const t = setInterval(() => setAgoraMs(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const hoje = relogio?.hoje ?? null;
  const dataConfirmada = relogio ? relogio.doServidor : true;
  const minutos = minutosAgora(relogio, agoraMs);
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
    setSalvo(atual);
    setCarregando(false);
  }, [router, semanaISO]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const alterado = JSON.stringify(marcacoes) !== JSON.stringify(salvo);

  // Segunda linha de defesa: se o militar fechar a aba com marcacao nao
  // enviada, o navegador pergunta antes de deixar sair.
  useEffect(() => {
    if (!alterado) return;
    const avisar = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [alterado]);

  // Um dia so pode ser mexido enquanto o prazo dele nao passou.
  function editavel(diaKey) {
    return diaEditavel(diaKey, inicio, hoje, minutos);
  }

  function alternar(diaKey, refeicaoKey) {
    if (!editavel(diaKey)) return;
    setAviso("");
    setMarcacoes((prev) => ({
      ...prev,
      [diaKey]: { ...prev[diaKey], [refeicaoKey]: !prev[diaKey][refeicaoKey] },
    }));
  }

  function marcarTodas(diaKey) {
    if (!editavel(diaKey)) return;
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

    // Dias fechados nao vao no envio: ja foram entregues ao Rancho, e o
    // banco recusaria a gravacao de qualquer forma.
    const abertos = DIAS.filter((d) => editavel(d.key));

    if (!abertos.length) {
      setSalvando(false);
      setErro("Todos os dias deste período já fecharam. Nada a enviar.");
      return;
    }

    // Foto do que esta sendo enviado, para nao confundir com alteracao que
    // o militar faca enquanto a gravacao acontece.
    const enviado = marcacoes;

    const registros = abertos.map((d) => ({
      militar_id: militar.id,
      semana: semanaISO,
      dia: d.key,
      cafe: enviado[d.key].cafe,
      almoco: enviado[d.key].almoco,
      janta: enviado[d.key].janta,
      atualizado_em: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from("arranchamentos")
      .upsert(registros, { onConflict: "militar_id,semana,dia" });

    setSalvando(false);
    if (error) {
      console.error("envio:", error);
      setErro("Não foi possível enviar. Verifique a conexão e tente de novo.");
      return;
    }
    setSalvo(enviado);
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

  // No fim de semana o periodo em circulacao ja fechou inteiro e o proximo
  // so nasce na segunda — nao ha nada a fazer, e a tela precisa dizer isso.
  const diasAbertos = DIAS.filter((d) => editavel(d.key)).length;
  const proximoInicio = new Date(inicio);
  proximoInicio.setDate(proximoInicio.getDate() + 7);
  const proximoFim = new Date(proximoInicio);
  proximoFim.setDate(proximoFim.getDate() + 6);
  const abreNaSegunda = new Date(inicio);
  abreNaSegunda.setDate(abreNaSegunda.getDate() + 6);
  const curta = (d) => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

  // O que fecha hoje. Em geral um dia; na sexta, os três do fim de semana.
  const fechamHoje = DIAS.filter((d) => editavel(d.key) && prazoVenceHoje(d.key, inicio, hoje));
  const avisoDoDia = fechamHoje.length
    ? `${fechamHoje.map((d) => `${d.label} ${datas[d.key].curta}`).join(", ")} ${
        fechamHoje.length > 1 ? "fecham" : "fecha"
      } hoje às ${horaLimiteEscrita(fechamHoje[0].key)}.`
    : null;

  return (
    <main className="mx-auto w-full max-w-md px-4 pb-52 pt-5">
      <Cabecalho
        titulo="Minha semana"
        subtitulo={nomeExibicao(militar)}
        acoes={
          <>
            {militar?.admin && <LinkTopo href="/painel">Painel</LinkTopo>}
            <LinkTopo onClick={sair}>Sair</LinkTopo>
          </>
        }
      />

      <div className="cartao mb-3 flex items-center justify-between px-4 py-2.5">
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

      {diasAbertos === 0 && (
        <div className="cartao mb-4 border-ouro-500/30 bg-ouro-500/[0.07] px-4 py-3.5">
          <p className="font-titulo text-base font-semibold uppercase tracking-wide text-ouro-200">
            Este período já fechou
          </p>
          <p className="mt-1 text-sm leading-snug text-noite-200">
            Todos os prazos venceram — abaixo fica o que você marcou, só para
            conferência. O próximo período ({curta(proximoInicio)} a{" "}
            {curta(proximoFim)}) abre na segunda-feira {curta(abreNaSegunda)}.
          </p>
        </div>
      )}

      {/* Aviso do que fecha hoje: fica uma vez aqui em cima, em vez de
          repetido em cada dia. */}
      {avisoDoDia && (
        <p className="mb-3 flex items-center gap-2 rounded-xl border border-ouro-500/30 bg-ouro-500/[0.08] px-3.5 py-2 text-[12px] text-ouro-200">
          <Relogio /> {avisoDoDia}
        </p>
      )}

      {/* Grade compacta: os nomes das refeições aparecem uma vez no topo,
          em vez de 21 vezes. Cabe na tela sem rolar. */}
      <div className="cartao overflow-hidden">
        <div className="grid grid-cols-[1fr_repeat(3,3.25rem)] border-b border-white/[0.07] bg-white/[0.02] px-3 py-1.5">
          <span />
          {REFEICOES.map((r) => (
            <span
              key={r.key}
              className="text-center text-[10px] font-semibold uppercase tracking-wider text-noite-300"
            >
              {r.label}
            </span>
          ))}
        </div>

        <div className="divide-y divide-white/[0.06]">
          {DIAS.map((d, i) => {
            const fds = d.key === "sab" || d.key === "dom";
            const aberto = editavel(d.key);
            const marcadasNoDia = REFEICOES.filter((r) => marcacoes[d.key][r.key]).length;

            return (
              <div
                key={d.key}
                className={
                  "grid animate-surgir grid-cols-[1fr_repeat(3,3.25rem)] items-stretch " +
                  (aberto ? "" : "opacity-45")
                }
                style={{ animationDelay: `${i * 30}ms` }}
              >
                {/* O nome do dia marca as três de uma vez. */}
                <button
                  onClick={() => marcarTodas(d.key)}
                  disabled={!aberto}
                  className={
                    "flex flex-col justify-center px-3.5 py-2 text-left transition " +
                    (aberto ? "hover:bg-white/[0.04]" : "cursor-not-allowed")
                  }
                >
                  <span className="flex items-center gap-1.5">
                    <span
                      className={
                        "font-titulo text-[15px] font-semibold uppercase leading-none tracking-wide " +
                        (!aberto ? "text-noite-300" : fds ? "text-ouro-300" : "text-white")
                      }
                    >
                      {d.label}
                    </span>
                    {!aberto && <Cadeado />}
                  </span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-[11px] tabular-nums text-noite-400">
                    {datas[d.key].curta}
                    {marcadasNoDia > 0 && (
                      <span
                        className={
                          "inline-block h-1 w-1 rounded-full " +
                          (aberto ? "bg-ouro-400" : "bg-noite-400")
                        }
                      />
                    )}
                  </span>
                </button>

                {REFEICOES.map((r) => {
                  const ativo = marcacoes[d.key][r.key];
                  return (
                    <button
                      key={r.key}
                      onClick={() => alternar(d.key, r.key)}
                      disabled={!aberto}
                      aria-pressed={ativo}
                      aria-label={`${d.label} ${datas[d.key].curta}, ${r.label}`}
                      className={
                        "flex items-center justify-center border-l border-white/[0.06] transition " +
                        (ativo
                          ? "bg-ouro-500/[0.16] shadow-[inset_0_0_0_1px_rgba(220,184,69,0.35)]"
                          : "bg-noite-950/30") +
                        (aberto ? " hover:bg-white/[0.05]" : " cursor-not-allowed")
                      }
                    >
                      <IconeRefeicao tipo={r.key} ativo={ativo} />
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <p className="mt-2 px-1 text-[11px] text-noite-400">
        Toque no nome do dia para marcar as três refeições de uma vez.
      </p>

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
          {alterado && (
            <p className="mb-2 flex items-center justify-center gap-1.5 rounded-lg border border-ouro-500/40 bg-ouro-500/[0.12] py-1.5 text-[12px] font-medium text-ouro-200">
              <Alerta /> Alterações não enviadas
            </p>
          )}

          <button
            onClick={enviar}
            disabled={salvando || diasAbertos === 0}
            className={"botao-ouro" + (alterado ? " animate-pulsar-leve" : "")}
          >
            {salvando
              ? "Enviando…"
              : diasAbertos === 0
                ? "Período fechado"
                : alterado
                  ? "Enviar alterações"
                  : "Enviar arranchamento"}
          </button>

          <p className="mt-2 text-center text-[11px] text-noite-400">
            {diasAbertos === 0
              ? `O próximo período abre na segunda-feira ${curta(abreNaSegunda)}.`
              : alterado
                ? "Nada é gravado até você tocar em Enviar."
                : `Cada dia fecha às ${LIMITE_ESCRITO} da véspera. Sábado, domingo e segunda fecham juntos na sexta às ${LIMITE_FDS_ESCRITO}.`}
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

function Cadeado() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function Alerta() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3 2 20h20L12 3Z" />
      <path d="M12 10v4M12 17.5v.01" />
    </svg>
  );
}

function Relogio() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
