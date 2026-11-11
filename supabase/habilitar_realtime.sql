-- Script para habilitar Supabase Realtime completo en PostgreSQL
-- Ejecuta este script en el SQL Editor de tu Dashboard de Supabase si deseas
-- que los cambios realizados directamente en la base de datos o dashboard
-- también se sincronicen en vivo a todos los visitantes.

-- 1. Agregar tablas a la publicación de Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE familias;
ALTER PUBLICATION supabase_realtime ADD TABLE personas;
ALTER PUBLICATION supabase_realtime ADD TABLE dedicatorias;
ALTER PUBLICATION supabase_realtime ADD TABLE config;

-- 2. Habilitar REPLICA IDENTITY FULL para enviar la fila completa en UPDATE y DELETE
ALTER TABLE familias REPLICA IDENTITY FULL;
ALTER TABLE personas REPLICA IDENTITY FULL;
ALTER TABLE dedicatorias REPLICA IDENTITY FULL;
ALTER TABLE config REPLICA IDENTITY FULL;
