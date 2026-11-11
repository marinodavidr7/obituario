/**
 * Importa PANTEON_BASE desde el HTML original a SQLite.
 * Uso: npm run seed            (solo si la base está vacía)
 *      npm run seed -- --force (reinicia la base)
 */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { db, insertPersona, upsertFamilia, addDedicatoria } from "../src/lib/db";

const force = process.argv.includes("--force");
const htmlPath = path.resolve(process.cwd(), "..", "pante_n_familiar_en_memoria.html");
const html = fs.readFileSync(htmlPath, "utf8");

const start = html.indexOf("const PANTEON_BASE = [");
const end = html.indexOf("\n];", start);
if (start < 0 || end < 0) throw new Error("No se encontró PANTEON_BASE en el HTML");

const sandbox: { result?: unknown } = {};
vm.runInNewContext(html.slice(start, end + 3).replace("const PANTEON_BASE =", "result ="), sandbox);

type Raw = {
  id: string; apellido: string; lema?: string;
  personas: {
    id: string; nombre: string; apodo?: string; anios: string; fechas?: string; epitafio?: string;
    foto?: string | null; bio?: string; datos?: [string, string][]; galeria?: string[];
    videos?: { titulo: string; fuente?: string; url: string }[];
    recuerdosIniciales?: { autor: string; fecha: string; texto: string }[];
  }[];
};
const base = sandbox.result as Raw[];

const conn = db();
const existentes = (conn.prepare("SELECT COUNT(*) AS n FROM personas").get() as { n: number }).n;
if (existentes > 0 && !force) {
  console.log(`La base ya tiene ${existentes} personas. Usa --force para reiniciar.`);
  process.exit(0);
}
if (force) {
  conn.exec("DELETE FROM dedicatorias; DELETE FROM personas; DELETE FROM familias;");
}

for (const f of base) {
  upsertFamilia({ id: f.id, apellido: f.apellido, lema: f.lema });
  for (const p of f.personas) {
    insertPersona({
      id: p.id,
      familia_id: f.id,
      nombre: p.nombre,
      apodo: p.apodo ?? null,
      anios: p.anios,
      fechas: p.fechas ?? null,
      epitafio: p.epitafio ?? null,
      foto: p.foto ?? null,
      bio: p.bio ?? null,
      datos: p.datos ?? [],
      galeria: p.galeria ?? [],
      videos: p.videos ?? [],
    });
    for (const r of p.recuerdosIniciales ?? []) {
      const d = addDedicatoria(p.id, r.autor, r.texto);
      conn.prepare("UPDATE dedicatorias SET fecha = ? WHERE id = ?").run(r.fecha, d.id);
    }
  }
}
console.log(`Importadas ${base.length} familias y ${base.reduce((n, f) => n + f.personas.length, 0)} personas.`);

