"use client";

import Emblema from "./Emblema";

/* Faixa superior com o emblema e o nome do sistema. O lado direito recebe
   os links da pagina (Painel, Sair, etc.) atraves de `acoes`. */
export function Cabecalho({ titulo, subtitulo, acoes }) {
  return (
    <header className="mb-6 animate-surgir">
      <div className="flex items-center gap-3.5">
        <div className="shrink-0 rounded-2xl border border-ouro-500/25 bg-noite-950/50 p-1.5">
          <Emblema tamanho={48} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-titulo text-[11px] font-semibold uppercase tracking-[0.3em] text-ouro-400">
            Arranchamento
          </p>
          <h1 className="truncate font-titulo text-2xl font-semibold uppercase leading-tight tracking-wide text-white">
            {titulo}
          </h1>
          {subtitulo && (
            <p className="mt-0.5 truncate text-sm text-noite-300">{subtitulo}</p>
          )}
        </div>

        {acoes && <div className="flex shrink-0 flex-col items-end gap-1.5">{acoes}</div>}
      </div>

      <div className="mt-4 h-px bg-gradient-to-r from-ouro-500/60 via-white/10 to-transparent" />
    </header>
  );
}

export function LinkTopo({ href, onClick, children }) {
  const classe =
    "rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs font-medium " +
    "text-noite-200 transition hover:border-ouro-500/40 hover:text-ouro-300";
  if (href) {
    return (
      <a href={href} className={classe}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={classe}>
      {children}
    </button>
  );
}

export function Campo({ label, value, onChange, type = "text", dica, ...resto }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-noite-300">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="campo"
        {...resto}
      />
      {dica && <p className="mt-1 text-[11px] leading-snug text-noite-400">{dica}</p>}
    </div>
  );
}

export function Botao({ children, carregando, ...resto }) {
  return (
    <button type="submit" disabled={carregando} className="botao-ouro" {...resto}>
      {carregando ? "Aguarde…" : children}
    </button>
  );
}

export function Erro({ texto }) {
  if (!texto) return null;
  return (
    <p className="animate-surgir rounded-xl border border-red-400/25 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-200">
      {texto}
    </p>
  );
}

export function Aviso({ texto }) {
  if (!texto) return null;
  return (
    <p className="animate-surgir rounded-xl border border-ouro-500/30 bg-ouro-500/10 px-3.5 py-2.5 text-sm text-ouro-200">
      {texto}
    </p>
  );
}

export function Carregando({ texto = "Carregando" }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="flex flex-col items-center gap-4">
        <Emblema tamanho={56} className="animate-pulsar" />
        <p className="font-titulo text-sm uppercase tracking-[0.3em] text-noite-300">
          {texto}…
        </p>
      </div>
    </main>
  );
}
