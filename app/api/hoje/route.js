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
  const hoje = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date()); // en-CA sai como "2026-09-08"

  return Response.json({ hoje }, { headers: { "Cache-Control": "no-store" } });
}
