import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

function loadEnv() {
  for (const envFile of [".env.local", ".env"]) {
    const fullPath = path.resolve(process.cwd(), envFile);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, "utf-8");
      for (const line of content.split("\n")) {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          const key = match[1];
          let value = match[2] || "";
          value = value.replace(/^['"](.*)['"]$/, "$1").trim();
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      }
    }
  }
}

loadEnv();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Error: Faltan variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY.");
  console.error("Configura tu archivo .env.local o pásalas por comando.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("✦ Conectando a Supabase:", supabaseUrl);

  const dumpPath = path.resolve(process.cwd(), "data", "sqlite_dump.json");
  if (!fs.existsSync(dumpPath)) {
    console.error("❌ No se encontró data/sqlite_dump.json");
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(dumpPath, "utf-8"));

  // 1. Sembrar Familias
  console.log(`\n📁 Insertando ${data.familias.length} familias...`);
  for (const f of data.familias) {
    const { error } = await supabase.from("familias").upsert({
      id: f.id,
      apellido: f.apellido,
      lema: f.lema || null,
      orden: f.orden || 0,
    });
    if (error) console.error(`  Error familia ${f.apellido}:`, error.message);
    else console.log(`  ✓ Familia ${f.apellido} sembrada`);
  }

  // 2. Sembrar Personas
  console.log(`\n👤 Insertando ${data.personas.length} personas...`);
  for (const p of data.personas) {
    const { error } = await supabase.from("personas").upsert({
      id: p.id,
      familia_id: p.familia_id,
      nombre: p.nombre,
      apodo: p.apodo || null,
      anios: p.anios,
      fechas: p.fechas || null,
      epitafio: p.epitafio || null,
      foto: p.foto || null,
      foto_pos: p.foto_pos || "50% 20%",
      bio: p.bio || null,
      datos: p.datos || [],
      galeria: p.galeria || [],
      videos: p.videos || [],
      visitas: p.visitas || 0,
      velas: p.velas || 0,
      flores: p.flores || 0,
      orden: p.orden || 0,
      estado: p.estado || "publicado",
      solicitante: p.solicitante || null,
      contacto: p.contacto || null,
      musica: p.musica || null,
      musica_titulo: p.musica_titulo || null,
    });
    if (error) console.error(`  Error persona ${p.nombre}:`, error.message);
    else console.log(`  ✓ Persona ${p.nombre} sembrada`);
  }

  // 3. Sembrar Dedicatorias
  console.log(`\n💬 Insertando ${data.dedicatorias.length} dedicatorias...`);
  for (const d of data.dedicatorias) {
    const isParsedDate = d.fecha && !isNaN(Date.parse(d.fecha));
    const fecha = isParsedDate ? new Date(d.fecha).toISOString() : new Date().toISOString();

    const { error } = await supabase.from("dedicatorias").insert({
      persona_id: d.persona_id,
      autor: d.autor,
      texto: d.texto,
      fecha,
    });
    if (error) console.error(`  Error dedicatoria de ${d.autor}:`, error.message);
    else console.log(`  ✓ Dedicatoria de ${d.autor} sembrada`);
  }

  console.log("\n✅ Migración de datos hacia Supabase finalizada.");
}

run().catch((err) => {
  console.error("Error fatal:", err);
  process.exit(1);
});
