import { useEffect, useState } from "react";

/**
 * Devuelve el valor recibido sólo después de que haya permanecido estable
 * durante `delay` milisegundos. Evita filtrar/buscar en cada pulsación.
 */
export function useDebouncedValue<T>(value: T, delay = 200): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    if (delay <= 0) {
      setDebounced(value);
      return;
    }
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
