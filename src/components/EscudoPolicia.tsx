import { useState } from "react";

export const ESCUDO_POLICIA_LOCAL = "/img/escudo-policia-rd.webp";
export const ESCUDO_POLICIA_URL =
  "https://www.policianacional.gob.do/wp-content/uploads/2026/05/logo_policia_rd_2026.png";

export default function EscudoPolicia({
  className = "w-5 h-5",
}: {
  className?: string;
}) {
  const [srcIndex, setSrcIndex] = useState(0);

  if (srcIndex >= 2) {
    return (
      <span
        className={`inline-flex items-center justify-center text-[#d4af37] leading-none select-none ${className}`}
        aria-hidden="true"
      >
        🛡️
      </span>
    );
  }

  return (
    <img
      src={srcIndex === 0 ? ESCUDO_POLICIA_LOCAL : ESCUDO_POLICIA_URL}
      alt="Escudo Policía Nacional RD"
      onError={() => setSrcIndex((i) => i + 1)}
      className={`object-contain select-none ${className}`}
      loading="eager"
    />
  );
}
