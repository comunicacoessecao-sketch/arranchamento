import { deISO } from "./semana";

// Pergunta ao servidor que dia e que horas sao.
//
// Devolve a data e os minutos desde a meia-noite (em Brasília), mais o
// instante em que a resposta chegou. Com esses tres valores a tela consegue
// acompanhar a passagem do tempo sem perguntar de novo a cada minuto.
//
// Se a resposta nao vier (rede caiu, servidor fora), cai no relogio do
// aparelho para nao travar o militar — mas avisa, para a tela poder dizer
// que a data nao foi confirmada.
export async function relogioDoServidor() {
  try {
    const resposta = await fetch("/api/hoje", { cache: "no-store" });
    if (!resposta.ok) throw new Error(`resposta ${resposta.status}`);
    const { hoje, minutos } = await resposta.json();
    return { hoje: deISO(hoje), minutos, medidoEm: Date.now(), doServidor: true };
  } catch (e) {
    console.error("relogio do servidor:", e);
    const agora = new Date();
    agora.setHours(0, 0, 0, 0);
    const local = new Date();
    return {
      hoje: agora,
      minutos: local.getHours() * 60 + local.getMinutes(),
      medidoEm: Date.now(),
      doServidor: false,
    };
  }
}

// Quantos minutos ja se passaram da meia-noite, contando o tempo que a tela
// ficou aberta desde a leitura do relogio.
export function minutosAgora(relogio, agoraMs = Date.now()) {
  if (!relogio) return 0;
  return relogio.minutos + Math.floor((agoraMs - relogio.medidoEm) / 60000);
}
