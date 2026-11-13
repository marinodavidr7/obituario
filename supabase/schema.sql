-- Schema Supabase para Panteón Familiar
-- Compatible con PostgreSQL, RLS y Supabase Storage

-- Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABLA FAMILIAS
CREATE TABLE IF NOT EXISTS familias (
  id TEXT PRIMARY KEY,
  apellido TEXT NOT NULL,
  lema TEXT,
  orden INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. TABLA PERSONAS (Seres queridos con fotos y músicas en Supabase)
CREATE TABLE IF NOT EXISTS personas (
  id TEXT PRIMARY KEY,
  familia_id TEXT NOT NULL REFERENCES familias(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  apodo TEXT,
  anios TEXT NOT NULL,
  fechas TEXT,
  epitafio TEXT,
  foto TEXT,
  foto_pos TEXT DEFAULT '50% 20%',
  bio TEXT,
  datos JSONB NOT NULL DEFAULT '[]'::jsonb,
  galeria JSONB NOT NULL DEFAULT '[]'::jsonb,
  videos JSONB NOT NULL DEFAULT '[]'::jsonb,
  visitas INTEGER NOT NULL DEFAULT 0,
  velas INTEGER NOT NULL DEFAULT 0,
  flores INTEGER NOT NULL DEFAULT 0,
  orden INTEGER NOT NULL DEFAULT 0,
  estado TEXT NOT NULL DEFAULT 'publicado' CHECK (estado IN ('publicado', 'pendiente', 'rechazado')),
  solicitante TEXT,
  contacto TEXT,
  fecha_solicitud TIMESTAMPTZ,
  musica TEXT,
  musica_titulo TEXT,
  musicas_rotacion JSONB DEFAULT '[]'::jsonb,
  musicas_inicio TIMESTAMPTZ,
  color TEXT DEFAULT 'default',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. TABLA DEDICATORIAS (Libro de memorias y condolencias)
CREATE TABLE IF NOT EXISTS dedicatorias (
  id BIGSERIAL PRIMARY KEY,
  persona_id TEXT NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  autor TEXT NOT NULL,
  texto TEXT NOT NULL,
  fecha TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. TABLA CONFIG (Configuración global del santuario)
CREATE TABLE IF NOT EXISTS config (
  clave TEXT PRIMARY KEY,
  valor TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ÍNDICES PARA ALTO RENDIMIENTO
CREATE INDEX IF NOT EXISTS idx_personas_familia ON personas(familia_id);
CREATE INDEX IF NOT EXISTS idx_personas_estado ON personas(estado);
CREATE INDEX IF NOT EXISTS idx_dedicatorias_persona ON dedicatorias(persona_id);
CREATE INDEX IF NOT EXISTS idx_dedicatorias_fecha ON dedicatorias(fecha DESC);

-- HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE familias ENABLE ROW LEVEL SECURITY;
ALTER TABLE personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE dedicatorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE config ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS RLS:
CREATE POLICY "Lectura pública de familias" ON familias FOR SELECT USING (true);
CREATE POLICY "Lectura pública de personas" ON personas FOR SELECT USING (true);
CREATE POLICY "Lectura pública de dedicatorias" ON dedicatorias FOR SELECT USING (true);
CREATE POLICY "Lectura pública de config" ON config FOR SELECT USING (true);

CREATE POLICY "Permitir inserción de familias" ON familias FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir actualización de familias" ON familias FOR UPDATE USING (true);
CREATE POLICY "Permitir eliminación de familias" ON familias FOR DELETE USING (true);

CREATE POLICY "Permitir inserción de personas" ON personas FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir actualización de personas" ON personas FOR UPDATE USING (true);
CREATE POLICY "Permitir eliminación de personas" ON personas FOR DELETE USING (true);

CREATE POLICY "Permitir inserción de dedicatorias" ON dedicatorias FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir actualización de dedicatorias" ON dedicatorias FOR UPDATE USING (true);
CREATE POLICY "Permitir eliminación de dedicatorias" ON dedicatorias FOR DELETE USING (true);

CREATE POLICY "Permitir actualización de config" ON config FOR ALL USING (true);

GRANT ALL ON public.familias TO anon, authenticated;
GRANT ALL ON public.personas TO anon, authenticated;
GRANT ALL ON public.dedicatorias TO anon, authenticated;
GRANT ALL ON public.config TO anon, authenticated;

-- 5. CREACIÓN DEL BUCKET DE ALMACENAMIENTO PARA FOTOS Y MEDIOS
INSERT INTO storage.buckets (id, name, public)
VALUES ('panteon-media', 'panteon-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Políticas de Supabase Storage para fotos y música
DROP POLICY IF EXISTS "Lectura pública de fotos y medios" ON storage.objects;
CREATE POLICY "Lectura pública de fotos y medios"
ON storage.objects FOR SELECT
USING (bucket_id = 'panteon-media');

DROP POLICY IF EXISTS "Subida pública de fotos y medios" ON storage.objects;
CREATE POLICY "Subida pública de fotos y medios"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'panteon-media');

DROP POLICY IF EXISTS "Actualización y borrado de medios" ON storage.objects;
CREATE POLICY "Actualización y borrado de medios"
ON storage.objects FOR ALL
USING (bucket_id = 'panteon-media');

-- 6. CONFIRMAR AUTOMÁTICAMENTE EL CORREO DEL ADMINISTRADOR (bcrypt nativo de Supabase Auth)
UPDATE auth.users
SET email_confirmed_at = timezone('utc'::text, now())
WHERE email = 'davidsbusinessgroup@gmail.com';
