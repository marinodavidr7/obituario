import { describe, expect, it } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import PersonaView from "../src/pages/PersonaView";
import FamiliaView from "../src/pages/FamiliaView";
import App from "../src/App";
import { listPersonas } from "../src/lib/db";

describe("PersonaView & App Rendering", () => {
  it("renders PersonaView for every registered persona without error", () => {
    const personas = listPersonas();
    expect(personas.length).toBeGreaterThan(0);

    for (const p of personas) {
      expect(() => {
        const html = renderToString(React.createElement(PersonaView, { id: p.id }));
        expect(html).toBeDefined();
        expect(html.length).toBeGreaterThan(200);
        expect(html).toContain(p.nombre);
      }).not.toThrow();
    }
  });

  it("renders jose-garcia with name and details intact", () => {
    const html = renderToString(React.createElement(PersonaView, { id: "jose-garcia" }));
    expect(html).toContain("José Antonio García Ruiz");
    expect(html).toContain("El abuelo Pepe");
  });

  it("renders entire App without throwing", () => {
    expect(() => {
      const html = renderToString(React.createElement(App));
      expect(html).toContain("OBITUARIO");
    }).not.toThrow();
  });

  it("renders FamiliaView with centered header and cards", () => {
    const html = renderToString(React.createElement(FamiliaView, { id: "garcia" }));
    expect(html).toContain("Volver al obituario");
    expect(html).toContain("García");
  });
});
