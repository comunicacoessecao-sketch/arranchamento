import "./globals.css";
import { Inter, Barlow_Condensed } from "next/font/google";

const corpo = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--fonte-corpo",
});

const titulo = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
  variable: "--fonte-titulo",
});

export const metadata = {
  title: "Arranchamento — Seção de Comunicações",
  description: "Arranchamento semanal da Seção de Comunicações",
  // Faz o iPhone abrir em tela cheia quando o site esta na tela inicial.
  appleWebApp: {
    capable: true,
    title: "Arranchamento",
    statusBarStyle: "black-translucent",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0a1020",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" className={`${corpo.variable} ${titulo.variable}`}>
      <body className="min-h-screen font-sans antialiased">
        {/* Ondas de radio decorativas no topo — motivo da Arma de Comunicacoes. */}
        <svg
          aria-hidden="true"
          className="pointer-events-none fixed left-1/2 top-0 -z-10 h-[420px] w-[820px] -translate-x-1/2 opacity-[0.13]"
          viewBox="0 0 820 420"
          fill="none"
        >
          {[70, 140, 210, 280, 350].map((r) => (
            <circle
              key={r}
              cx="410"
              cy="30"
              r={r}
              stroke="#dcb845"
              strokeWidth="1"
              strokeDasharray="3 7"
            />
          ))}
        </svg>

        {children}

        <footer className="pb-8 pt-10 text-center text-[11px] uppercase tracking-[0.2em] text-noite-400">
          Seção de Comunicações
        </footer>
      </body>
    </html>
  );
}
