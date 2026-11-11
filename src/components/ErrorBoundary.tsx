import React, { Component, ErrorInfo, ReactNode } from "react";
import Link from "./Link";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Capturado error en vista:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="py-20 px-4 text-center max-w-xl mx-auto">
          <div className="w-16 h-16 rounded-full bg-gold/10 border border-gold/40 text-gold flex items-center justify-center text-2xl mx-auto mb-5 shadow-[0_0_20px_rgba(201,168,106,0.2)]">
            ✦
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl text-stone-200 mb-3">
            Espacio en Memoria
          </h2>
          <p className="text-xs sm:text-sm text-stone-400 mb-6 font-light leading-relaxed">
            Se produjo una interrupción momentánea al cargar esta sección del santuario.
            Puedes volver a la página principal del obituario o reintentar.
          </p>
          {this.state.error && (
            <p className="text-[11px] font-mono text-rose-300/80 bg-rose-950/40 border border-rose-500/20 rounded-lg p-2.5 mb-6 text-left overflow-auto max-h-32">
              {this.state.error.message}
            </p>
          )}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-gold/40 bg-gold/15 hover:bg-gold/25 text-gold-soft text-xs uppercase tracking-widest transition-all"
              onClick={() => {
                this.setState({ hasError: false, error: null });
              }}
            >
              ← Volver al Obituario
            </Link>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/20 bg-stone-900/80 hover:bg-stone-800 text-stone-300 text-xs uppercase tracking-widest transition-all"
            >
              🔄 Recargar
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
