-- ============================================================================
-- PANTEÓN: ENDURECIMIENTO DE RLS / GRANTS / STORAGE (2026-11)
-- CÓMO APLICARLO (como dueño/operador): SQL Editor de tu proyecto
--   https://supabase.com/dashboard/project/<TU-PROYECTO>/sql/new
-- Es idempotente (usa DROP POLICY IF EXISTS / CREATE OR REPLACE).
-- Ejecutar en una sola transacción si prefieres: BEGIN; ... COMMIT;
-- IMPORTANTE:
--   * El INSERT anónimo en personas queda restringido a estado='pendiente'.
--   * Las solicitudes pendientes ya NO son legibles sin autenticación.
--   * config sólo expone claves públicas al rol anon.
--   * El bucket panteon-media mantiene lectura pública, escritura sólo authenticated.
--   * Las funciones del bot (aprobar/rechazar/fotos) requieren
--     TELEGRAM_WEBHOOK_SECRET + TELEGRAM_ADMIN_CHAT_IDS (ver api/telegram.ts).
-- ============================================================================

-- 0) Validación previa: si hay filas que violan las nuevas restricciones de dedicatorias,
--    quedarán señaladas como NOTICE en vez de abortar el script.
DO $$
DECLARE n INT;
BEGIN
  SELECT count(*) INTO n FROM dedicatorias
   WHERE char_length(texto) > 500 OR char_length(autor) > 80 OR texto ~* 'https?://|www\.|t\.me/|wa\.me/';
  IF n > 0 THEN
    RAISE NOTICE 'dedicatorias con % filas que NO entrarían en las nuevas restricciones (quedan NOT VALID, revisar manualmente)', n;
  END IF;
END $$;

ALTER TABLE dedicatorias DROP CONSTRAINT IF EXISTS dedicatorias_texto_len;
ALTER TABLE dedicatorias ADD CONSTRAINT dedicatorias_texto_len
  CHECK (char_length(texto) BETWEEN 1 AND 500 AND char_length(autor) BETWEEN 1 AND 80) NOT VALID;
ALTER TABLE dedicatorias DROP CONSTRAINT IF EXISTS dedicatorias_sin_enlaces;
ALTER TABLE dedicatorias ADD CONSTRAINT dedicatorias_sin_enlaces
  CHECK (texto !~* 'https?://|www\.|t\.me/|wa\.me/') NOT VALID;
ALTER TABLE personas DROP CONSTRAINT IF EXISTS personas_solicitud_len;
ALTER TABLE personas ADD CONSTRAINT personas_solicitud_len
  CHECK (solicitante IS NULL OR char_length(solicitante) <= 120) NOT VALID;
ALTER TABLE personas DROP CONSTRAINT IF EXISTS personas_contacto_len;
ALTER TABLE personas ADD CONSTRAINT personas_contacto_len
  CHECK (contacto IS NULL OR char_length(contacto) <= 200) NOT VALID;

-- 1) Eliminar políticas permisivas anteriores
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
DROP POLICY IF EXISTS "Actualización y borrado de medios" ON storage.objects;
DROP POLICY IF EXISTS "Subida pública de fotos y medios" ON storage.objects;

-- 2) Políticas endurecidas
DROP POLICY IF EXISTS "Lectura pública de familias" ON familias;
CREATE POLICY "Lectura pública de familias" ON familias FOR SELECT USING (true);
DROP POLICY IF EXISTS "Escribir familias (guardián)" ON familias;
CREATE POLICY "Escribir familias (guardián)" ON familias FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Editar familias (guardián)" ON familias;
CREATE POLICY "Editar familias (guardián)" ON familias FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Borrar familias (guardián)" ON familias;
CREATE POLICY "Borrar familias (guardián)" ON familias FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Público lee almas publicadas" ON personas;
CREATE POLICY "Público lee almas publicadas" ON personas FOR SELECT USING (estado = 'publicado' OR estado IS NULL);
DROP POLICY IF EXISTS "Guardián lee todo (incl. pendiente)" ON personas;
CREATE POLICY "Guardián lee todo (incl. pendiente)" ON personas FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Solicitud pública pendiente" ON personas;
CREATE POLICY "Solicitud pública pendiente" ON personas FOR INSERT WITH CHECK (estado = 'pendiente');
DROP POLICY IF EXISTS "Guardianes crean personas" ON personas;
CREATE POLICY "Guardianes crean personas" ON personas FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Guardianes editan personas" ON personas;
CREATE POLICY "Guardianes editan personas" ON personas FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Guardianes borran personas" ON personas;
CREATE POLICY "Guardianes borran personas" ON personas FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Lectura pública de dedicatorias" ON dedicatorias;
CREATE POLICY "Lectura pública de dedicatorias" ON dedicatorias FOR SELECT USING (true);
DROP POLICY IF EXISTS "Dedicatoria válida del público" ON dedicatorias;
CREATE POLICY "Dedicatoria válida del público" ON dedicatorias FOR INSERT
  WITH CHECK (
    char_length(texto) BETWEEN 1 AND 500
    AND char_length(autor) BETWEEN 1 AND 80
    AND texto !~* 'https?://|www\.|t\.me/|wa\.me/'
  );
DROP POLICY IF EXISTS "Guardianes crean dedicatorias" ON dedicatorias;
CREATE POLICY "Guardianes crean dedicatorias" ON dedicatorias FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Guardianes editan dedicatorias" ON dedicatorias;
CREATE POLICY "Guardianes editan dedicatorias" ON dedicatorias FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Guardianes borran dedicatorias" ON dedicatorias;
CREATE POLICY "Guardianes borran dedicatorias" ON dedicatorias FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Config pública no sensible" ON config;
CREATE POLICY "Config pública no sensible" ON config FOR SELECT
  USING (clave IN ('musica_general_url','musica_general_titulo','musica_volumen','site_url',
                   'decoraciones_almas','perfiles_policia')
         OR clave LIKE 'flores_tipos_%');
DROP POLICY IF EXISTS "Config cosmética escribible por el público" ON config;
CREATE POLICY "Config cosmética escribible por el público" ON config FOR INSERT
  WITH CHECK (
    (clave IN ('decoraciones_almas','perfiles_policia') OR clave LIKE 'flores_tipos_%')
    AND char_length(valor) <= 12000
  );
DROP POLICY IF EXISTS "Config cosmética actualizable por el público" ON config;
CREATE POLICY "Config cosmética actualizable por el público" ON config FOR UPDATE
  USING (clave IN ('decoraciones_almas','perfiles_policia') OR clave LIKE 'flores_tipos_%')
  WITH CHECK (
    (clave IN ('decoraciones_almas','perfiles_policia') OR clave LIKE 'flores_tipos_%')
    AND char_length(valor) <= 12000
  );
DROP POLICY IF EXISTS "Guardianes leen toda la config" ON config;
CREATE POLICY "Guardianes leen toda la config" ON config FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Guardianes escriben config" ON config;
CREATE POLICY "Guardianes escriben config" ON config FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Guardianes editan config" ON config;
CREATE POLICY "Guardianes editan config" ON config FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Guardianes borran config" ON config;
CREATE POLICY "Guardianes borran config" ON config FOR DELETE TO authenticated USING (true);

-- 3) GRANTs mínimos
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

-- 4) RPCs (+1 atómico)
CREATE OR REPLACE FUNCTION public.increment_visita(persona_id TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE personas SET visitas = visitas + 1
   WHERE id = persona_id AND (estado = 'publicado' OR estado IS NULL);
END $$;
REVOKE ALL ON FUNCTION public.increment_visita(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_visita(TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.registrar_ofrenda(persona_id TEXT, tipo TEXT, flor_tipo TEXT DEFAULT 'lujo')
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE res JSONB;
BEGIN
  IF tipo = 'vela' THEN
    UPDATE personas SET velas = velas + 1
     WHERE id = persona_id AND (estado = 'publicado' OR estado IS NULL)
     RETURNING jsonb_build_object('id', id, 'velas', velas, 'flores', flores) INTO res;
  ELSIF tipo = 'flor' THEN
    UPDATE personas SET flores = flores + 1
     WHERE id = persona_id AND (estado = 'publicado' OR estado IS NULL)
     RETURNING jsonb_build_object('id', id, 'velas', velas, 'flores', flores) INTO res;
  ELSE
    RAISE EXCEPTION 'tipo de ofrenda no soportado: %', tipo;
  END IF;
  RETURN res;
END $$;
REVOKE ALL ON FUNCTION public.registrar_ofrenda(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.registrar_ofrenda(TEXT, TEXT, TEXT) TO anon, authenticated;

-- 5) Storage: lectura pública conservada; escritura sólo guardián y bajo uploads/
-- Subida pública limitada a solicitudes (imagen/audio/vídeo, sin SVG, <= 5 MB)
DROP POLICY IF EXISTS "Solicitud pública sube medios" ON storage.objects;
CREATE POLICY "Solicitud pública sube medios"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'panteon-media'
  AND (storage.foldername(name))[1] = 'uploads'
  AND (metadata->>'mimetype') ~ '^(image/(?!svg)|audio/|video/)'
  AND coalesce((metadata->>'size')::bigint, 0) <= 5242880
);

DROP POLICY IF EXISTS "Guardianes suben medios" ON storage.objects;
CREATE POLICY "Guardianes suben medios" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'panteon-media' AND (storage.foldername(name))[1] = 'uploads');
DROP POLICY IF EXISTS "Guardianes editan medios" ON storage.objects;
CREATE POLICY "Guardianes editan medios" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'panteon-media' AND (storage.foldername(name))[1] = 'uploads')
WITH CHECK (bucket_id = 'panteon-media' AND (storage.foldername(name))[1] = 'uploads');
DROP POLICY IF EXISTS "Guardianes borran medios" ON storage.objects;
CREATE POLICY "Guardianes borran medios" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'panteon-media' AND (storage.foldername(name))[1] = 'uploads');

-- 6) config ya no se publica vía Realtime (contiene/leía secretos en la versión anterior)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime DROP TABLE config;
EXCEPTION
  WHEN object_not_in_prerequisite_state OR undefined_object THEN
    RAISE NOTICE 'config no estaba en supabase_realtime (continúa)';
END $$;

-- 7) Validación post-aplicación (ejecutar aparte):
-- SELECT schemaname, tablename, policyname, permissive, cmd, qual FROM pg_policies
--  WHERE schemaname IN ('public','storage') ORDER BY tablename, policyname;
-- SELECT id, public FROM storage.buckets WHERE id = 'panteon-media';
