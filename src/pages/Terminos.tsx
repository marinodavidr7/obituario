import Link from "@/components/Link";
import Ornament from "@/components/Ornament";

export default function Terminos() {
  return (
    <article className="fade-enter pt-3 sm:pt-8 pb-24 w-full max-w-4xl mx-auto">
      <div className="text-center pb-6 mb-6 border-b border-white/10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[11px] sm:text-xs tracking-[0.2em] uppercase text-stone-400 hover:text-gold-soft border border-white/10 hover:border-gold/40 bg-stone-900/60 rounded-full px-4 py-2 active:scale-95 transition-all mb-4"
        >
          <span>←</span> Volver al Obituario
        </Link>
        <span className="text-[10px] sm:text-[11px] uppercase tracking-[0.35em] text-gold block mb-1">
          Aviso Legal y Protección Familiar
        </span>
        <h1 className="font-serif font-light text-3xl sm:text-5xl tracking-[0.06em] text-[#f2efe9]">
          Términos, Condiciones y Deslinde de Responsabilidad
        </h1>
        <Ornament />
        <p className="max-w-2xl mx-auto text-xs sm:text-sm font-light leading-relaxed text-stone-400 px-3">
          Marco de protección jurídica y ético relativo a la publicación de fotografías, datos biográficos y
          recuerdos en el memorial digital de acceso familiar.
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-stone-900/50 p-4 sm:p-9 shadow-2xl space-y-6 text-xs sm:text-sm font-light leading-relaxed text-stone-300 divide-y divide-white/5">
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs sm:text-sm leading-relaxed">
          <p className="font-medium mb-1 flex items-center gap-2">
            <span>⚖️</span>
            <span>Declaración de Buena Fe y Deslinde de Responsabilidad</span>
          </p>
          <p>
            Al registrar a una persona y aportar sus imágenes o semblanzas, el solicitante declara bajo juramento
            que ostenta la debida legitimación familiar y asume en exclusiva cualquier responsabilidad civil o
            administrativa, manteniendo indemne a la plataforma <b>Obituario Familiar</b> y a sus administradores ante
            cualquier eventual litigio o discrepancia entre familiares o terceros.
          </p>
        </div>

        <section className="pt-5 space-y-2.5">
          <h2 className="font-serif text-lg sm:text-xl text-gold-soft font-medium">
            1. Finalidad Exclusivamente Conmemorativa
          </h2>
          <p>
            El <b>Obituario Familiar</b> es un servicio digital creado con la noble intención de preservar en la memoria
            colectiva los homenajes de personas fallecidas. No constituye un registro civil oficial ni persigue fines
            comerciales, lucrativos, difamatorios o denigratorios.
          </p>
        </section>

        <section className="pt-5 space-y-2.5">
          <h2 className="font-serif text-lg sm:text-xl text-gold-soft font-medium">
            2. Declaración Jurada de Parentesco y Legitimidad
          </h2>
          <p>
            Toda persona que solicite la creación, edición o enriquecimiento de un perfil en el obituario declara y
            garantiza bajo protesta de decir verdad que:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-stone-300">
            <li>
              Posee parentesco directo con el homenajeado (cónyuge, hijo/a, padre/madre, hermano/a, nieto/a), o actúa
              como albacea testamentario o representante autorizado con la anuencia del núcleo familiar más cercano.
            </li>
            <li>
              Ha comunicado o consensuado con los familiares directos la intención de publicar dicho homenaje en este
              espacio digital.
            </li>
            <li>
              Toda la información aportada es veraz y refleja con dignidad la vida del homenajeado.
            </li>
          </ul>
        </section>

        <section className="pt-5 space-y-2.5">
          <h2 className="font-serif text-lg sm:text-xl text-gold-soft font-medium">
            3. Autorización y Licencia de Difusión de Fotografías y Contenidos
          </h2>
          <p>
            El solicitante otorga al Obituario Familiar una licencia de uso no exclusiva, voluntaria, gratuita, mundial
            e irrevocable para alojar, adaptar a los marcos estéticos de la plataforma, reproducir y difundir las
            fotografías, dedicatorias, música, enlaces a vídeos y biografías proporcionadas, exclusivamente con fines
            de homenaje público o privado según la configuración del espacio.
          </p>
        </section>

        <section className="pt-5 space-y-2.5">
          <h2 className="font-serif text-lg sm:text-xl text-gold-soft font-medium">
            4. Cláusula de Indemnidad y Deslinde de Responsabilidad
          </h2>
          <div className="p-4 rounded-xl bg-stone-950/70 border border-white/10 space-y-2 text-stone-300">
            <p>
              Dado que la plataforma y sus administradores <b>carecen de facultades judiciales o periciales para auditar
              fehacientemente los árboles genealógicos o la propiedad de cada fotografía histórica familiar</b>, se
              establece de manera expresa y vinculante:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <b>Responsabilidad del Solicitante:</b> El solicitante es el único responsable por cualquier infracción
                al derecho al honor, a la intimidad personal y familiar, a la propia imagen o a la propiedad intelectual
                de las fotos o textos subidos.
              </li>
              <li>
                <b>Pacto de Indemnidad:</b> El solicitante se obliga formalmente a mantener indemne y a defender a su
                costa al Obituario Familiar, a sus creadores, representantes y administradores frente a toda reclamación,
                requerimiento extrajudicial o demanda que puedan promover otros coherederos, parientes desavenidos o
                terceros, asumiendo íntegramente los gastos legales, costas judiciales e indemnizaciones que pudieran
                derivarse.
              </li>
            </ul>
          </div>
        </section>

        <section className="pt-5 space-y-2.5">
          <h2 className="font-serif text-lg sm:text-xl text-gold-soft font-medium">
            5. Protección de Menores y Personas Vivas
          </h2>
          <p>
            En cumplimiento de las normativas de protección de datos personales y privacidad:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-stone-300">
            <li>
              No se admiten fotografías donde aparezcan menores de edad o terceros vivos sin su previa autorización
              expresa.
            </li>
            <li>
              Está estrictamente prohibido incorporar documentos de identificación oficial (DNI, pasaportes, actas con
              datos sensibles de vivos), domicilios actuales o números de teléfono de terceros.
            </li>
          </ul>
        </section>

        <section className="pt-5 space-y-2.5">
          <h2 className="font-serif text-lg sm:text-xl text-gold-soft font-medium">
            6. Mecanismo Ágil de Retirada Inmediata (Notice & Take-Down)
          </h2>
          <p>
            El Obituario Familiar prioriza la concordia y la paz de las familias por encima de cualquier consideración:
          </p>
          <p className="p-3.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-200">
            Si cualquier familiar directo que acredite su parentesco solicita la corrección o retirada de un perfil o
            fotografía, <b>la administración procederá a la despublicación o eliminación inmediata en un plazo máximo
            de 24 a 48 horas hábiles</b>. Este mecanismo permite resolver cualquier conflicto de manera amistosa y
            rápida, evitando la necesidad de trámites judiciales.
          </p>
        </section>

        <section className="pt-5 space-y-2.5">
          <h2 className="font-serif text-lg sm:text-xl text-gold-soft font-medium">
            7. Moderación, Modificación y Derecho de Admisión
          </h2>
          <p>
            El administrador del obituario se reserva en todo momento el derecho de revisar, aprobar, solicitar
            documentación aclaratoria, suspender temporalmente o eliminar definitivamente cualquier perfil o contenido
            que a su criterio resulte controvertido, litigioso, ofensivo o contrario al espíritu de respeto y veneración
            del santuario.
          </p>
        </section>

        <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <span className="text-[11px] text-stone-500 italic">
            Obituario Familiar · Registro de Memoria y Paz Digital
          </span>
          <Link
            href="/inscribir"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gold/20 hover:bg-gold/30 border border-gold/60 text-gold-soft text-xs uppercase tracking-wider font-medium active:scale-95 transition-all self-start sm:self-auto"
          >
            <span>🕊️</span> Inscribir ser querido
          </Link>
        </div>
      </div>
    </article>
  );
}
