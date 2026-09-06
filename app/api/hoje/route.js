// Devolve a data de hoje segundo o servidor, no fuso de Brasília.
//
// O site precisa disso para decidir qual período de arranchamento mostrar.
// Se essa conta fosse feita pelo relógio do aparelho, um celular com a data
// errada mandaria o arranchamento para a semana errada.
//
// O servidor da Vercel roda em UTC, que de madrugada já está no dia
// seguinte ao daqui — por isso a data é formatada explicitamente em
// America/Sao_Paulo, e não tirada direto do relógio da máquina.

export const dynamic = "force-dynamic";
export const revalidate = 0;

export function GET() {
  const agora = new Date();

  const hoje = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(agora); // en-CA sai como "2026-09-08"

  // Minutos desde a meia-noite, tambem em Brasília. Vai como numero para o
  // site nao precisar converter fuso nenhum na hora de fechar os prazos.
  const [hora, minuto] = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(agora)
    .split(":")
    .map(Number);

  return Response.json(
    { hoje, minutos: hora * 60 + minuto },
    { headers: { "Cache-Control": "no-store" } }
  );
}
