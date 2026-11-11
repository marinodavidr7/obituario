// Generadores de SVG (portados del HTML original)
export function crearVelaRealistaSVG(indice = 0) {
  const alturas = [46, 54, 42, 50, 44, 52];
  const hCuerpo = alturas[indice % alturas.length];
  const delay = ((indice * 0.43) % 2.8).toFixed(2);
  const uid = `c-${indice}-${"s"}`;

  return `
    <div class="real-candle group" title="Vela encendida en su memoria">
      <span class="real-candle__halo" style="animation-delay:${delay}s"></span>
      <svg class="real-candle__flame" style="animation-delay:${delay}s" viewBox="0 0 24 38" aria-hidden="true">
        <defs>
          <radialGradient id="fg-${uid}" cx="50%" cy="72%" r="60%">
            <stop offset="0%" stop-color="#ffffff"/>
            <stop offset="28%" stop-color="#ffe89e"/>
            <stop offset="68%" stop-color="#ff9424"/>
            <stop offset="100%" stop-color="#d93800" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <!-- Halo exterior de la llama -->
        <path d="M12 2 C15.5 10, 21 15.5, 21 24 C21 31.2, 16.8 36, 12 36 C7.2 36, 3 31.2, 3 24 C3 15.5, 8.5 10, 12 2 Z" fill="url(#fg-${uid})"/>
        <!-- Núcleo incandescente -->
        <path d="M12 11 C14 16, 16.8 19.5, 16.8 25 C16.8 29.5, 14.6 32.8, 12 32.8 C9.4 32.8, 7.2 29.5, 7.2 25 C7.2 19.5, 10 16, 12 11 Z" fill="#fff6d6"/>
        <!-- Base azulada de oxígeno -->
        <ellipse cx="12" cy="33.2" rx="2.6" ry="1.6" fill="#60a5fa" opacity="0.65"/>
      </svg>
      <!-- Pabilo / Mecha -->
      <span class="w-[1.5px] h-1.5 bg-stone-800 block relative z-[1]"></span>
      <!-- Cuerpo cilíndrico de cera marfil con lágrimas de cera y base dorada -->
      <svg width="26" height="${hCuerpo}" viewBox="0 0 26 ${hCuerpo}" class="overflow-visible block">
        <defs>
          <linearGradient id="wax-${uid}" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#d8ccb8"/>
            <stop offset="32%" stop-color="#fbf6ec"/>
            <stop offset="70%" stop-color="#eadec9"/>
            <stop offset="100%" stop-color="#b5a48b"/>
          </linearGradient>
          <linearGradient id="waxtop-${uid}" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#ffdf9a"/>
            <stop offset="100%" stop-color="#e7d6bd"/>
          </linearGradient>
        </defs>
        <!-- Sombra en la piedra -->
        <ellipse cx="13" cy="${hCuerpo - 1}" rx="12" ry="3" fill="rgba(0,0,0,0.65)"/>
        <!-- Cuerpo de la vela -->
        <rect x="3" y="4" width="20" height="${hCuerpo - 6}" rx="3" fill="url(#wax-${uid})" stroke="rgba(255,245,220,0.35)" stroke-width="0.5"/>
        <!-- Resplandor superior traslúcido por el calor de la llama -->
        <rect x="3" y="4" width="20" height="12" rx="2" fill="rgba(255,175,60,0.28)"/>
        <!-- Cuenca superior de cera derretida -->
        <ellipse cx="13" cy="4.5" rx="10" ry="2.6" fill="url(#waxtop-${uid})"/>
        <!-- Gotas de cera derretida -->
        <path d="M6 5 Q6 15 7.2 19 Q8.2 15 8 5 Z" fill="#f7efe0" opacity="0.9"/>
        <path d="M18 5.5 Q18.5 19 19.3 25 Q20.3 19 20 5.5 Z" fill="#efe3ce" opacity="0.85"/>
        <!-- Platillo / Base de bronce -->
        <ellipse cx="13" cy="${hCuerpo - 2}" rx="11.5" ry="2.3" fill="#9a7b3e" stroke="#e8d5a9" stroke-width="0.4"/>
      </svg>
    </div>
  `;
}

export function crearArregloFloralSVG(indice = 0) {
  const variante = indice % 3;
  if (variante === 0) {
    // Ramo de Rosas Rojas y Blancas con follaje y lazo dorado
    return `
      <div class="real-bouquet" title="Arreglo de rosas depositado en su memoria">
        <svg width="56" height="58" viewBox="0 0 56 58" aria-hidden="true">
          <ellipse cx="28" cy="54" rx="18" ry="3.5" fill="rgba(0,0,0,0.6)"/>
          <!-- Hojas de eucalipto y tallos -->
          <path d="M28 52 L20 26 M28 52 L28 22 M28 52 L36 26" stroke="#2f523a" stroke-width="2.2" stroke-linecap="round"/>
          <ellipse cx="15" cy="30" rx="6" ry="3" transform="rotate(-28 15 30)" fill="#3b6948"/>
          <ellipse cx="41" cy="30" rx="6" ry="3" transform="rotate(28 41 30)" fill="#3b6948"/>
          <ellipse cx="18" cy="20" rx="5" ry="2.5" transform="rotate(-40 18 20)" fill="#4c7c59"/>
          <ellipse cx="38" cy="20" rx="5" ry="2.5" transform="rotate(40 38 20)" fill="#4c7c59"/>
          <!-- Flores de paniculata ( puntitos blancos ) -->
          <circle cx="13" cy="22" r="1.4" fill="#fff9f0" opacity="0.9"/>
          <circle cx="43" cy="22" r="1.4" fill="#fff9f0" opacity="0.9"/>
          <circle cx="22" cy="11" r="1.3" fill="#fff9f0" opacity="0.85"/>
          <circle cx="34" cy="11" r="1.3" fill="#fff9f0" opacity="0.85"/>
          <!-- Rosa Roja Central -->
          <circle cx="28" cy="17" r="7.5" fill="#881337"/>
          <circle cx="28" cy="16.5" r="5.6" fill="#be123c"/>
          <path d="M25 16 C26.5 13.5, 30 13.5, 31 16 C30 18.5, 26.5 18.5, 25 16 Z" fill="#f43f5e"/>
          <circle cx="28" cy="16" r="1.8" fill="#fda4af"/>
          <!-- Rosa Blanca / Marfil Izquierda -->
          <circle cx="19" cy="24" r="6.5" fill="#d6d3d1"/>
          <circle cx="19" cy="23.5" r="4.8" fill="#f5f5f4"/>
          <path d="M17 23 C18 21, 20.5 21, 21.5 23 C20.5 25, 18 25, 17 23 Z" fill="#fffbeb"/>
          <!-- Rosa Carmesí Derecha -->
          <circle cx="37" cy="24" r="6.5" fill="#9f1239"/>
          <circle cx="37" cy="23.5" r="4.8" fill="#e11d48"/>
          <circle cx="37" cy="23" r="2.1" fill="#fb7185"/>
          <!-- Envoltorio y Lazo Dorado -->
          <path d="M19 34 L28 53 L37 34 Z" fill="#1f242d" stroke="#c9a86a" stroke-width="0.7"/>
          <path d="M23 43 Q28 45 33 43" stroke="#e8d5a9" stroke-width="1.8" fill="none" stroke-linecap="round"/>
        </svg>
      </div>
    `;
  } else if (variante === 1) {
    // Ramo de Lirios Blancos / Cala de Paz
    return `
      <div class="real-bouquet" title="Lirios blancos de paz">
        <svg width="52" height="58" viewBox="0 0 52 58" aria-hidden="true">
          <ellipse cx="26" cy="54" rx="16" ry="3.2" fill="rgba(0,0,0,0.6)"/>
          <path d="M26 53 L21 25 M26 53 L26 18 M26 53 L32 26" stroke="#365c42" stroke-width="2" stroke-linecap="round"/>
          <!-- Hojas estilizadas -->
          <path d="M24 50 Q12 36 14 22 Q20 34 25 46 Z" fill="#2e543a"/>
          <path d="M28 50 Q40 36 38 22 Q32 34 27 46 Z" fill="#3d694b"/>
          <!-- Lirio central -->
          <path d="M26 9 C21 15, 20 22, 26 26 C32 22, 31 15, 26 9 Z" fill="#fafaf9" stroke="#e7e5e4" stroke-width="0.6"/>
          <path d="M26 12 C18 16, 16 22, 23 25" fill="#f5f5f4"/>
          <path d="M26 12 C34 16, 36 22, 29 25" fill="#f5f5f4"/>
          <!-- Pistilos dorados -->
          <line x1="26" y1="21" x2="26" y2="15" stroke="#eab308" stroke-width="1.3" stroke-linecap="round"/>
          <circle cx="26" cy="14.5" r="1.3" fill="#f59e0b"/>
          <!-- Lirio lateral izquierdo -->
          <path d="M17 17 C13 21, 14 27, 19 29 C23 26, 21 20, 17 17 Z" fill="#f5f5f4"/>
          <circle cx="17.5" cy="22" r="1.1" fill="#f59e0b"/>
          <!-- Lirio lateral derecho -->
          <path d="M35 17 C31 20, 29 26, 33 29 C38 27, 39 21, 35 17 Z" fill="#fafaf9"/>
          <circle cx="34.5" cy="22" r="1.1" fill="#f59e0b"/>
          <!-- Cinta de seda dorada -->
          <ellipse cx="26" cy="44" rx="4.5" ry="1.8" fill="#c9a86a"/>
        </svg>
      </div>
    `;
  } else {
    // Corona / Arreglo de Rosas Rosadas, Lavanda y Paniculata
    return `
      <div class="real-bouquet" title="Ofrenda floral con lavanda y rosas">
        <svg width="54" height="56" viewBox="0 0 54 56" aria-hidden="true">
          <ellipse cx="27" cy="52" rx="17" ry="3.2" fill="rgba(0,0,0,0.6)"/>
          <!-- Espigas de lavanda -->
          <path d="M20 46 L14 14 M34 46 L40 14" stroke="#4c6b53" stroke-width="1.5"/>
          <circle cx="14" cy="15" r="1.7" fill="#a78bfa"/>
          <circle cx="15" cy="19" r="1.7" fill="#8b5cf6"/>
          <circle cx="16" cy="23" r="1.7" fill="#a78bfa"/>
          <circle cx="40" cy="15" r="1.7" fill="#a78bfa"/>
          <circle cx="39" cy="19" r="1.7" fill="#8b5cf6"/>
          <circle cx="38" cy="23" r="1.7" fill="#a78bfa"/>
          <!-- Follaje base -->
          <ellipse cx="18" cy="36" rx="7" ry="3.2" transform="rotate(-20 18 36)" fill="#355e43"/>
          <ellipse cx="36" cy="36" rx="7" ry="3.2" transform="rotate(20 36 36)" fill="#355e43"/>
          <!-- Rosas de jardín -->
          <circle cx="27" cy="24" r="7.5" fill="#be185d"/>
          <circle cx="27" cy="23.5" r="5.5" fill="#ec4899"/>
          <circle cx="27" cy="23" r="2.6" fill="#fbcfe8"/>
          <circle cx="19" cy="31" r="5.8" fill="#9f1239"/>
          <circle cx="19" cy="30.5" r="4" fill="#f43f5e"/>
          <circle cx="35" cy="31" r="5.8" fill="#e7e5e4"/>
          <circle cx="35" cy="30.5" r="4" fill="#ffffff"/>
          <!-- Jarrón bajo de piedra/bronce -->
          <path d="M20 38 L34 38 L31 51 L23 51 Z" fill="#292524" stroke="#c9a86a" stroke-width="0.8"/>
        </svg>
      </div>
    `;
  }
}
