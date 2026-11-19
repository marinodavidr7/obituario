/**
 * Bloques de carga reutilizables. Mantienen la estructura de la página
 * mientras llegan los datos, evitando saltos de layout y pantallas vacías.
 */
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-xl bg-white/10 ${className}`}
    />
  );
}

export function PersonaViewSkeleton() {
  return (
    <div className="fade-enter pt-6 sm:pt-10" role="status" aria-live="polite">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(320px,28%)_1fr] xl:grid-cols-[380px_1fr] gap-6 sm:gap-8 xl:gap-12 items-start">
        <aside className="min-w-0">
          <Skeleton className="w-56 xs:w-64 sm:w-60 lg:w-72 xl:w-80 h-[300px] sm:h-[380px] rounded-t-[130px] rounded-b-2xl mx-auto" />
          <div className="pt-6 space-y-3">
            <Skeleton className="h-3 w-40 mx-auto" />
            <Skeleton className="h-8 w-60 max-w-full mx-auto" />
            <Skeleton className="h-5 w-44 mx-auto rounded-full" />
            <Skeleton className="h-4 w-52 max-w-full mx-auto" />
          </div>
        </aside>

        <div className="space-y-4 sm:space-y-5">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-36 w-full" />
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
      <span className="sr-only">Cargando memorias y ofrendas…</span>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="fade-enter pt-8 sm:pt-12 max-w-3xl mx-auto space-y-5" role="status" aria-live="polite">
      <Skeleton className="h-4 w-40 mx-auto" />
      <Skeleton className="h-9 w-64 max-w-full mx-auto" />
      <Skeleton className="h-4 w-72 max-w-full mx-auto" />
      <Skeleton className="h-56 w-full mt-6" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
      <span className="sr-only">Cargando sección…</span>
    </div>
  );
}
