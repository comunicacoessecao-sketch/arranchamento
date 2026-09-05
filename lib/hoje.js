import { deISO } from "./semana";

// Pergunta ao servidor que dia e hoje.
//
// Se a resposta nao vier (rede caiu, servidor fora), cai no relogio do
// aparelho para nao travar o militar — mas avisa, para a tela poder dizer
// que a data nao foi confirmada.
export async function dataDeHoje() {
  try {
    const resposta = await fetch("/api/hoje", { cache: "no-store" });
    if (!resposta.ok) throw new Error(`resposta ${resposta.status}`);
    const { hoje } = await resposta.json();
    return { data: deISO(hoje), doServidor: true };
  } catch (e) {
    console.error("data do servidor:", e);
    return { data: new Date(), doServidor: false };
  }
}
