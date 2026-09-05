"use client";

import { useState } from "react";

/**
 * Emblema da Arma de Comunicacoes.
 *
 * COMO COLOCAR O SIMBOLO OFICIAL: salve a imagem como `public/emblema.png`
 * (pode ser .png com fundo transparente). O site passa a usar ela sozinho,
 * sem mexer em codigo. Enquanto o arquivo nao existir, aparece o desenho
 * abaixo (raios cruzados e ondas de radio), que e so uma marca do site.
 */
export default function Emblema({ tamanho = 64, className = "" }) {
  const [semImagem, setSemImagem] = useState(false);

  if (!semImagem) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src="/emblema.png"
        alt="Emblema da Arma de Comunicações"
        width={tamanho}
        height={tamanho}
        onError={() => setSemImagem(true)}
        className={`object-contain ${className}`}
        style={{ width: tamanho, height: tamanho }}
      />
    );
  }

  return <EmblemaDesenhado tamanho={tamanho} className={className} />;
}

export function EmblemaDesenhado({ tamanho = 64, className = "" }) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={tamanho}
      height={tamanho}
      role="img"
      aria-label="Emblema da Arma de Comunicações"
      className={className}
      style={{ width: tamanho, height: tamanho }}
    >
      <defs>
        <linearGradient id="emblema-ouro" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f3e3af" />
          <stop offset="45%" stopColor="#dcb845" />
          <stop offset="100%" stopColor="#a8851b" />
        </linearGradient>
      </defs>

      {/* Anel externo */}
      <circle cx="50" cy="50" r="46" fill="rgba(6,10,19,0.55)" />
      <circle cx="50" cy="50" r="46" fill="none" stroke="url(#emblema-ouro)" strokeWidth="2.5" />
      <circle cx="50" cy="50" r="40" fill="none" stroke="url(#emblema-ouro)" strokeWidth="0.9" opacity="0.55" />

      {/* Ondas de radio saindo do centro */}
      <g fill="none" stroke="url(#emblema-ouro)" strokeLinecap="round" opacity="0.85">
        <path d="M30 34a28 28 0 0 1 40 0" strokeWidth="2" />
        <path d="M36 26a38 38 0 0 1 28 0" strokeWidth="1.6" opacity="0.7" />
      </g>

      {/* Raios cruzados */}
      <g fill="url(#emblema-ouro)">
        <path d="M44 40 L30 62 L40 62 L34 80 L52 56 L42 56 Z" />
        <path d="M56 40 L70 62 L60 62 L66 80 L48 56 L58 56 Z" opacity="0.92" />
      </g>

      {/* Base */}
      <path d="M32 84h36" stroke="url(#emblema-ouro)" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
