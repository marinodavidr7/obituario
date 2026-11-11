import { useEffect } from "react";

interface TerminosModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void;
}

export default function TerminosModal({ isOpen, onClose, onAccept }: TerminosModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add("no-scroll");
    } else {
      document.body.classList.remove("no-scroll");
    }
    return () => {
      document.body.classList.remove("no-scroll");
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl border border-gold/40 bg-[#0c0f14] shadow-[0_25px_70px_rgba(0,0,0,0.95)] text-stone-200 overflow-hidden">
        {/* Cabecera */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-gold/[0.08] to-transparent shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="text-gold text-lg">⚖️</span>
            <div>
              <h2 className="font-serif text-lg sm:text-xl text-stone-100 font-medium leading-tight">
                Términos, Condiciones y Consentimiento Familiar
              </h2>
              <p className="text-[11px] text-stone-400">
                Obituario Familiar · Protección de datos, fotografías y deslinde de responsabilidad
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 text-stone-400 hover:text-white grid place-items-center text-sm transition-colors"
            aria-label="Cerrar términos"
          >
            ✕
          </button>
        </div>

        {/* Contenido con scroll */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-7 py-5 space-y-5 text-xs sm:text-sm font-light leading-relaxed text-stone-300 divide-y divide-white/5">
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs leading-relaxed">
            <span className="font-semibold block mb-1">AVISO IMPORTANTE PARA FAMILIARES Y SOLICITANTES:</span>
            Al solicitar la inscripción de una persona fallecida y suministrar sus fotografías, datos biográficos,
            música o semblanzas, usted asume la responsabilidad exclusiva sobre el contenido y declara poseer la
            autorización moral y legal de la familia para su publicación conmemorativa.
          </div>

          <div className="pt-4 space-y-2">
            <h3 className="font-serif text-base text-gold-soft font-medium">1. Naturaleza y Finalidad del Santuario</h3>
            <p>
              El <b>Obituario Familiar</b> es un servicio digital de carácter estrictamente conmemorativo, afectivo,
              genealógico y de tributo a la memoria de personas fallecidas. La plataforma opera de buena fe como un medio
              tecnológico de alojamiento para que las familias preserven sus recuerdos, sin perseguir fines de lucro,
              difamatorios ni comerciales.
            </p>
          </div>

          <div className="pt-4 space-y-2">
            <h3 className="font-serif text-base text-gold-soft font-medium">
              2. Declaración Jurada de Parentesco y Legitimidad
            </h3>
            <p>
              Quien remite información a través del formulario de inscripción declara bajo juramento y buena fe que:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-stone-300">
              <li>
                Es cónyuge supérstite, descendiente directo (hijo/a, nieto/a), ascendiente (padre/madre), colateral
                (hermano/a), heredero/a legal o representante legítimo debidamente facultado por la familia del difunto.
              </li>
              <li>
                Cuenta con la autorización y beneplácito del núcleo familiar más cercano para registrar y homenajear al
                ser querido en este espacio.
              </li>
              <li>
                Los datos biográficos, fechas y nombres aportados corresponden a la verdad histórica y familiar.
              </li>
            </ul>
          </div>

          <div className="pt-4 space-y-2">
            <h3 className="font-serif text-base text-gold-soft font-medium">
              3. Autorización de Difusión de Fotografías, Música y Datos
            </h3>
            <p>
              El solicitante otorga a la plataforma una licencia no exclusiva, voluntaria, gratuita e indefinida para
              almacenar, formatear, exhibir y reproducir en la web pública las fotografías, audios, enlaces de vídeo,
              fechas de vida y reseñas que haya proporcionado, con el único propósito de ilustrar el memorial del difunto.
            </p>
          </div>

          <div className="pt-4 space-y-2">
            <h3 className="font-serif text-base text-gold-soft font-medium">
              4. Deslinde Total de Responsabilidad e Indemnidad (Cláusula de Protección de la Plataforma)
            </h3>
            <p className="text-stone-300">
              La plataforma y sus administradores <b>no poseen capacidad jurídica ni técnica para auditar o validar con
              registros civiles o notariales</b> los lazos de sangre o la propiedad de cada álbum de fotos familiar
              subido por los usuarios.
            </p>
            <p className="text-stone-300">
              Por consiguiente:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-stone-300">
              <li>
                <b>Responsabilidad Exclusiva:</b> El solicitante asume plena y exclusiva responsabilidad civil,
                administrativa o penal por los contenidos aportados y por la vulneración de derechos de autor, derecho
                a la propia imagen, honor, intimidad o datos personales que pudieran alegarse.
              </li>
              <li>
                <b>Compromiso de Indemnidad:</b> El solicitante se compromete expresamente a mantener indemne a la
                plataforma <b>Obituario Familiar</b>, a sus creadores, colaboradores y administradores ante cualquier
                reclamación, demanda, denuncia o litigio promovido por otros familiares, coherederos o terceros,
                asumiendo a su costa cualquier gasto judicial, extrajudicial o indemnizatorio derivado de la publicación.
              </li>
            </ul>
          </div>

          <div className="pt-4 space-y-2">
            <h3 className="font-serif text-base text-gold-soft font-medium">
              5. Fotografías de Terceras Personas y Protección de Menores
            </h3>
            <p>
              El solicitante se compromete a no subir fotografías donde aparezcan terceras personas vivas o menores de
              edad de forma identificable sin haber recabado previamente su consentimiento informado. Queda terminantemente
              prohibido incluir documentos de identidad oficiales, datos financieros, contraseñas o datos sensibles de
              personas vivas.
            </p>
          </div>

          <div className="pt-4 space-y-2">
            <h3 className="font-serif text-base text-gold-soft font-medium">
              6. Procedimiento de Retirada Inmediata (Derecho de Oposición y Paz Familiar)
            </h3>
            <p>
              Para garantizar la concordia y el respeto absoluto a la intimidad familiar:
            </p>
            <p className="p-3 rounded-lg bg-stone-900 border border-white/10 text-stone-200">
              Cualquier familiar directo (hijos, cónyuge, padres, hermanos) que acredite parentesco y manifieste su
              desacuerdo u oposición a la publicación de un perfil, fotografía o dato, podrá solicitar en cualquier
              momento su rectificación o eliminación total. <b>La plataforma retirará de inmediato el contenido en un plazo
              máximo de 24 a 48 horas</b>, evitando cualquier necesidad de controversia legal.
            </p>
          </div>

          <div className="pt-4 space-y-2">
            <h3 className="font-serif text-base text-gold-soft font-medium">7. Derecho de Moderación y Baja</h3>
            <p>
              La administración del Obituario Familiar se reserva el derecho de rechazar, suspender temporalmente o dar
              de baja en cualquier momento cualquier inscripción que resulte dudosa, conflictiva, ofensiva o que sea
              objeto de disputa intrafamiliar, sin que ello genere derecho a compensación alguna.
            </p>
          </div>

          <div className="pt-4 pb-2 text-[11px] text-stone-500 italic">
            Última actualización: Noviembre de 2026 · Válido para todas las inscripciones y publicaciones en la plataforma.
          </div>
        </div>

        {/* Pie con botones de acción */}
        <div className="px-5 py-3.5 border-t border-white/10 flex flex-wrap items-center justify-end gap-3 bg-[#080b0f] shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-full border border-white/15 text-stone-300 hover:text-white hover:bg-white/5 text-xs uppercase tracking-wider transition-colors"
          >
            Cerrar
          </button>
          {onAccept && (
            <button
              type="button"
              onClick={() => {
                onAccept();
                onClose();
              }}
              className="px-5 py-2 rounded-full bg-gold/25 hover:bg-gold/40 border border-gold/70 text-gold-soft text-xs uppercase tracking-wider font-medium shadow-[0_0_15px_rgba(201,168,106,0.3)] transition-all active:scale-95"
            >
              ✓ He leído y Acepto los Términos
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
