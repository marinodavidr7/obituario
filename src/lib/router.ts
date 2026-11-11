import { useEffect, useState } from "react";

export type Route =
  | { name: "home" }
  | { name: "persona"; id: string }
  | { name: "familia"; id: string }
  | { name: "inscribir" }
  | { name: "inscribir-gracias" }
  | { name: "terminos" }
  | { name: "admin" }
  | { name: "admin-nueva" }
  | { name: "admin-editar"; id: string }
  | { name: "notfound"; path: string };

export function parseRoute(rawHash?: string): Route {
  let raw = (rawHash ?? (typeof window !== "undefined" ? window.location.hash : "")).replace(/^[#/]+/, "");

  let pathPart = "";
  if (raw && raw !== "/") {
    const [hPath] = raw.split("?");
    pathPart = hPath;
  } else if (typeof window !== "undefined") {
    pathPart = window.location.pathname.replace(/^\/+/, "");
  }

  const segments = pathPart.split("/").filter(Boolean);

  if (segments.length === 0) {
    return { name: "home" };
  }

  const first = segments[0];

  if (first === "persona" && segments[1]) {
    return { name: "persona", id: segments[1] };
  }

  if (first === "familia" && segments[1]) {
    return { name: "familia", id: segments[1] };
  }

  if (first === "inscribir") {
    if (segments[1] === "gracias") {
      return { name: "inscribir-gracias" };
    }
    return { name: "inscribir" };
  }

  if (first === "terminos") {
    return { name: "terminos" };
  }

  if (first === "admin") {
    if (segments[1] === "nueva") {
      return { name: "admin-nueva" };
    }
    if (segments[1] === "editar" && segments[2]) {
      return { name: "admin-editar", id: segments[2] };
    }
    return { name: "admin" };
  }

  return { name: "notfound", path: pathPart };
}

export function navigate(path: string, options?: { replace?: boolean }): void {
  if (typeof window === "undefined") return;

  const target = path.startsWith("#") ? path : `#/${path.replace(/^\/+/, "")}`;

  if (options?.replace) {
    window.location.replace(target);
  } else {
    window.location.hash = target.replace(/^#/, "");
  }

  // Desplazar suavemente arriba
  window.scrollTo({ top: 0, behavior: "smooth" });
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseRoute());

  useEffect(() => {
    const handleLocationChange = () => {
      setRoute(parseRoute());
    };

    window.addEventListener("hashchange", handleLocationChange);
    window.addEventListener("popstate", handleLocationChange);

    return () => {
      window.removeEventListener("hashchange", handleLocationChange);
      window.removeEventListener("popstate", handleLocationChange);
    };
  }, []);

  return route;
}
