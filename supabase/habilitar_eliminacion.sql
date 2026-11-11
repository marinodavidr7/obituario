-- ==============================================================================
-- PANTEÓN: PERMISOS COMPLETOS DE ELIMINACIÓN Y BORRADO EN SUPABASE
-- ==============================================================================
-- Ejecuta este script en el SQL Editor de tu proyecto en Supabase:
-- https://supabase.com/dashboard/project/ljgdjiqbftrrwsclgics/sql/new
-- ==============================================================================

-- 1. Políticas de eliminación (DELETE) para personas, familias y dedicatorias
DROP POLICY IF EXISTS "Permitir eliminación de personas" ON personas;
CREATE POLICY "Permitir eliminación de personas" ON personas
FOR DELETE USING (true);

DROP POLICY IF EXISTS "Permitir eliminación de familias" ON familias;
CREATE POLICY "Permitir eliminación de familias" ON familias
FOR DELETE USING (true);

DROP POLICY IF EXISTS "Permitir eliminación de dedicatorias" ON dedicatorias;
CREATE POLICY "Permitir eliminación de dedicatorias" ON dedicatorias
FOR DELETE USING (true);

-- 2. Asegurar que las políticas cubran tanto 'anon' como 'authenticated'
GRANT ALL ON public.personas TO anon, authenticated;
GRANT ALL ON public.familias TO anon, authenticated;
GRANT ALL ON public.dedicatorias TO anon, authenticated;
GRANT ALL ON public.config TO anon, authenticated;

-- 3. Agregar columna 'color' para personalización por alma
ALTER TABLE personas ADD COLUMN IF NOT EXISTS color TEXT DEFAULT 'default';

-- 4. Borrar registros de prueba si existieran
DELETE FROM personas WHERE id LIKE 'test-delete-%';
