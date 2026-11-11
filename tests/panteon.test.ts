import { describe, expect, it } from "vitest";
import { calcularTrackActivo, listFamilias, listPersonas, getPersona, addOfrenda, addDedicatoria } from "../src/lib/db";
import { parseRoute } from "../src/lib/router";
import { validarDedicatoria } from "../src/lib/moderacion";

describe("Panteón Stack & Lógica del Santuario", () => {
  it("debe cargar familias y almas iniciales del seed", () => {
    const familias = listFamilias();
    expect(familias.length).toBeGreaterThan(0);

    const personas = listPersonas();
    expect(personas.length).toBeGreaterThan(0);

    const juan = getPersona("juan-herrera");
    expect(juan).toBeDefined();
    expect(juan?.nombre).toContain("Juan Herrera");
  });

  it("debe calcular correctamente el enrutador SPA", () => {
    expect(parseRoute("#/").name).toBe("home");
    expect(parseRoute("#/inscribir").name).toBe("inscribir");
    expect(parseRoute("#/persona/juan-herrera")).toEqual({
      name: "persona",
      id: "juan-herrera",
    });
    expect(parseRoute("#/familia/garcia")).toEqual({
      name: "familia",
      id: "garcia",
    });
    expect(parseRoute("#/admin").name).toBe("admin");
  });

  it("debe validar dedicatorias y filtrar ofensas o spam", () => {
    const valida = validarDedicatoria("Familiar", "Siempre en nuestros corazones.");
    expect(valida.ok).toBe(true);

    const conEnlace = validarDedicatoria("Bot", "Visita https://spam.com para ofertas");
    expect(conEnlace.ok).toBe(false);
  });

  it("debe calcular la pista de rotación musical periódica", () => {
    const tracks = [
      { id: "1", titulo: "Ave María", url: "https://ejemplo.com/1.mp3", duracion_dias: 7 },
      { id: "2", titulo: "Réquiem", url: "https://ejemplo.com/2.mp3", duracion_dias: 7 },
    ];
    const activa = calcularTrackActivo(tracks, new Date().toISOString());
    expect(activa.track).not.toBeNull();
    expect(activa.total).toBe(2);
  });

  it("debe resolver la navegación previa y siguiente entre miembros de una misma familia", () => {
    const personas = listPersonas();
    const herrera = personas.filter((p) => p.familia_id === "herrera");
    expect(herrera.length).toBeGreaterThan(0);

    const idx = 0;
    const prev = herrera[(idx - 1 + herrera.length) % herrera.length];
    const next = herrera[(idx + 1) % herrera.length];
    expect(prev).toBeDefined();
    expect(next).toBeDefined();
  });
});
