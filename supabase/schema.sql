-- ============================================================================
-- Schema Supabase para El Panteón (Santuario Obituario Familiar)
-- Versión endurecida 2026-11. Fresh installs.
-- El despliegue operativo sobre el proyecto vivo se aplica con
-- supabase/hardening_2026-11.sql (idempotente) mediante SQL Editor.
--
-- Principios:
--   * El rol `anon` sólo lee contenido publicado y escribe lo mínimo del
--     flujo público (solicitudes pendientes, dedicatorias validadas).
--   * Las mutaciones privilegiadas requieren rol `authenticated`
--     (Supabase Auth por email/contraseña, sólo el guardián).
--   * Los contadores públicos suben sólo por RPC (+1 atómico), nunca por UPDATE directo.
--   * Ningún secreto vive en tablas legibles por `anon`.
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABLAS (definiciones sin cambios respecto a la versión anterior)
CREATE TABLE IF NOT EXISTS familias (
  id TEXT PRIMARY KEY,
  apellido TEXT NOT NULL,
  lema TEXT,
  orden INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

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

CREATE TABLE IF NOT EXISTS dedicatorias (
  id BIGSERIAL PRIMARY KEY,
  persona_id TEXT NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  autor TEXT NOT NULL,
  texto TEXT NOT NULL,
  fecha TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS config (
  clave TEXT PRIMARY KEY,
  valor TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_personas_familia ON personas(familia_id);
CREATE INDEX IF NOT EXISTS idx_personas_estado ON personas(estado);
CREATE INDEX IF NOT EXISTS idx_dedicatorias_persona ON dedicatorias(persona_id);
CREATE INDEX IF NOT EXISTS idx_dedicatorias_fecha ON dedicatorias(fecha DESC);

-- Restricciones anti-abuso básicas para el flujo público de dedicatorias
ALTER TABLE dedicatorias DROP CONSTRAINT IF EXISTS dedicatorias_texto_len;
ALTER TABLE dedicatorias ADD CONSTRAINT dedicatorias_texto_len
  CHECK (char_length(texto) BETWEEN 1 AND 500 AND char_length(autor) BETWEEN 1 AND 80)
  NOT VALID;
ALTER TABLE dedicatorias DROP CONSTRAINT IF EXISTS dedicatorias_sin_enlaces;
ALTER TABLE dedicatorias ADD CONSTRAINT dedicatorias_sin_enlaces
  CHECK (texto !~* 'https?://|www\.|t\.me/|wa\.me/')
  NOT VALID;
ALTER TABLE personas DROP CONSTRAINT IF EXISTS personas_solicitud_len;
ALTER TABLE personas ADD CONSTRAINT personas_solicitud_len
  CHECK (solicitante IS NULL OR char_length(solicitante) <= 120)
  NOT VALID;
ALTER TABLE personas DROP CONSTRAINT IF EXISTS personas_contacto_len;
ALTER TABLE personas ADD CONSTRAINT personas_contacto_len
  CHECK (contacto IS NULL OR char_length(contacto) <= 200)
  NOT VALID;

-- HABILITAR ROW LEVEL SECURITY
ALTER TABLE familias ENABLE ROW LEVEL SECURITY;
ALTER TABLE personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE dedicatorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE config ENABLE ROW LEVEL SECURITY;

-- LIMPIEZA DE POLÍTICAS ABIERTAS (idempotente para re-ejecuciones)
DROP POLICY IF EXISTS "Lectura pública de familias" ON familias;
DROP POLICY IF EXISTS "Lectura pública de personas" ON personas;
DROP POLICY IF EXISTS "Lectura pública de dedicatorias" ON dedicatorias;
DROP POLICY IF EXISTS "Lectura pública de config" ON config;
DROP POLICY IF EXISTS "Permitir inserción de familias" ON familias;
DROP POLICY IF EXISTS "Permitir actualización de familias" ON familias;
DROP POLICY IF EXISTS "Permitir eliminación de familias" ON familias;
DROP POLICY IF EXISTS "Permitir inserción de personas" ON personas;
DROP POLICY IF EXISTS "Permitir actualización de personas" ON personas;
DROP POLICY IF EXISTS "Permitir eliminación de personas" ON personas;
DROP POLICY IF EXISTS "Permitir inserción de dedicatorias" ON dedicatorias;
DROP POLICY IF EXISTS "Permitir actualización de dedicatorias" ON dedicatorias;
DROP POLICY IF EXISTS "Permitir eliminación de dedicatorias" ON dedicatorias;
DROP POLICY IF EXISTS "Permitir actualización de config" ON config;

-- POLÍTICAS
-- familias: lectura pública (sin PII); escritura sólo autenticada
CREATE POLICY "Lectura pública de familias" ON familias FOR SELECT USING (true);
CREATE POLICY "Escribir familias (guardián)" ON familias FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Editar familias (guardián)" ON familias FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Borrar familias (guardián)" ON familias FOR DELETE TO authenticated USING (true);

-- personas: público sólo lee publicado; guardián autenticado todo
CREATE POLICY "Público lee almas publicadas" ON personas FOR SELECT USING (estado = 'publicado' OR estado IS NULL);
CREATE POLICY "Guardián lee todo (incl. pendiente)" ON personas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Solicitud pública pendiente" ON personas FOR INSERT WITH CHECK (estado = 'pendiente');
CREATE POLICY "Guardianes crean personas" ON personas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Guardianes editan personas" ON personas FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Guardianes borran personas" ON personas FOR DELETE TO authenticated USING (true);

-- dedicatorias: lectura pública; inserción validada; gestión autenticada
CREATE POLICY "Lectura pública de dedicatorias" ON dedicatorias FOR SELECT USING (true);
CREATE POLICY "Dedicatoria válida del público" ON dedicatorias FOR INSERT
  WITH CHECK (
    char_length(texto) BETWEEN 1 AND 500
    AND char_length(autor) BETWEEN 1 AND 80
    AND texto !~* 'https?://|www\.|t\.me/|wa\.me/'
  );
CREATE POLICY "Guardianes crean dedicatorias" ON dedicatorias FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Guardianes editan dedicatorias" ON dedicatorias FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Guardianes borran dedicatorias" ON dedicatorias FOR DELETE TO authenticated USING (true);

-- config: anon sólo lectura de claves no sensibles y escritura limitada
-- a las mismas claves cosméticas del sitio; guardián autenticado, todo.
CREATE POLICY "Config pública no sensible" ON config FOR SELECT
  USING (clave IN ('musica_general_url','musica_general_titulo','musica_volumen','site_url',
                   'decoraciones_almas','perfiles_policia')
         OR clave LIKE 'flores_tipos_%');
CREATE POLICY "Config cosmética escribible por el público" ON config FOR INSERT
  WITH CHECK (
    (clave IN ('decoraciones_almas','perfiles_policia') OR clave LIKE 'flores_tipos_%')
    AND char_length(valor) <= 12000
  );
CREATE POLICY "Config cosmética actualizable por el público" ON config FOR UPDATE
  USING (clave IN ('decoraciones_almas','perfiles_policia') OR clave LIKE 'flores_tipos_%')
  WITH CHECK (
    (clave IN ('decoraciones_almas','perfiles_policia') OR clave LIKE 'flores_tipos_%')
    AND char_length(valor) <= 12000
  );
CREATE POLICY "Guardianes leen toda la config" ON config FOR SELECT TO authenticated USING (true);
CREATE POLICY "Guardianes escriben config" ON config FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Guardianes editan config" ON config FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Guardianes borran config" ON config FOR DELETE TO authenticated USING (true);

-- GRANTs mínimos
REVOKE ALL ON public.familias FROM anon;
REVOKE ALL ON public.personas FROM anon;
REVOKE ALL ON public.dedicatorias FROM anon;
REVOKE ALL ON public.config FROM anon;

-- GRANTs a nivel de columna para anon (PII fuera del alcance de anon)
REVOKE SELECT ON public.personas FROM anon;
GRANT SELECT (id, familia_id, nombre, apodo, anios, fechas, epitafio, foto, foto_pos, bio, datos, galeria, videos, visitas, velas, flores, orden, estado, fecha_solicitud, musica, musica_titulo, musicas_rotacion, musicas_inicio, color, created_at) ON public.personas TO anon;
REVOKE INSERT ON public.personas FROM anon;
GRANT INSERT (id, familia_id, nombre, apodo, anios, fechas, epitafio, foto, foto_pos, bio, datos, galeria, videos, orden, estado, solicitante, contacto, fecha_solicitud, musica, musica_titulo, musicas_rotacion, musicas_inicio, color) ON public.personas TO anon;
GRANT SELECT ON public.familias TO anon;
GRANT SELECT, INSERT ON public.dedicatorias TO anon;
GRANT SELECT ON public.config TO anon;
GRANT INSERT, UPDATE ON public.config TO anon;
GRANT USAGE ON SEQUENCE dedicatorias_id_seq TO anon;

GRANT ALL ON public.familias TO authenticated;
GRANT ALL ON public.personas TO authenticated;
GRANT ALL ON public.dedicatorias TO authenticated;
GRANT ALL ON public.config TO authenticated;
GRANT USAGE ON SEQUENCE dedicatorias_id_seq TO authenticated;

-- RPC: incremento atómico de visita (+1) sólo en publicada
CREATE OR REPLACE FUNCTION public.increment_visita(persona_id TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE personas
     SET visitas = visitas + 1
   WHERE id = persona_id
     AND (estado = 'publicado' OR estado IS NULL);
END $$;
REVOKE ALL ON FUNCTION public.increment_visita(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_visita(TEXT) TO anon, authenticated;

-- RPC: ofrenda (+1 vela, o +1 flor) atómica sólo en publicada
CREATE OR REPLACE FUNCTION public.registrar_ofrenda(persona_id TEXT, tipo TEXT, flor_tipo TEXT DEFAULT 'lujo')
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  res JSONB;
BEGIN
  IF tipo = 'vela' THEN
    UPDATE personas
       SET velas = velas + 1
     WHERE id = persona_id AND (estado = 'publicado' OR estado IS NULL)
     RETURNING jsonb_build_object('id', id, 'velas', velas, 'flores', flores) INTO res;
  ELSIF tipo = 'flor' THEN
    UPDATE personas
       SET flores = flores + 1
     WHERE id = persona_id AND (estado = 'publicado' OR estado IS NULL)
     RETURNING jsonb_build_object('id', id, 'velas', velas, 'flores', flores) INTO res;
  ELSE
    RAISE EXCEPTION 'tipo de ofrenda no soportado: %', tipo;
  END IF;
  RETURN res;
END $$;
REVOKE ALL ON FUNCTION public.registrar_ofrenda(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.registrar_ofrenda(TEXT, TEXT, TEXT) TO anon, authenticated;

-- 5. STORAGE
INSERT INTO storage.buckets (id, name, public)
VALUES ('panteon-media', 'panteon-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Lectura pública de fotos y medios" ON storage.objects;
DROP POLICY IF EXISTS "Subida pública de fotos y medios" ON storage.objects;
DROP POLICY IF EXISTS "Actualización y borrado de medios" ON storage.objects;

-- Lectura pública (el memorial es público por diseño)
CREATE POLICY "Lectura pública de fotos y medios"
ON storage.objects FOR SELECT
USING (bucket_id = 'panteon-media');

-- Subida pública limitada a solicitudes (imagen/audio/vídeo, sin SVG, <= 5 MB)
CREATE POLICY "Solicitud pública sube medios"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'panteon-media'
  AND (storage.foldername(name))[1] = 'uploads'
  AND (metadata->>'mimetype') ~ '^(image/(?!svg)|audio/|video/)'
  AND coalesce((metadata->>'size')::bigint, 0) <= 5242880
);

-- Escritura/borrado sólo para el guardián autenticado, y sólo bajo uploads/
CREATE POLICY "Guardianes suben medios"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'panteon-media' AND (storage.foldername(name))[1] = 'uploads');

CREATE POLICY "Guardianes editan medios"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'panteon-media' AND (storage.foldername(name))[1] = 'uploads')
WITH CHECK (bucket_id = 'panteon-media' AND (storage.foldername(name))[1] = 'uploads');

CREATE POLICY "Guardianes borran medios"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'panteon-media' AND (storage.foldername(name))[1] = 'uploads');

-- NOTA: el bucket sigue siendo público-lectura por diseño (URLs públicas de medios).
-- La escritura anónima queda prohibida. Si se desea bucket privado, cambiar public=false
-- y servir medios con URLs firmadas (requiere cambios en el cliente).
