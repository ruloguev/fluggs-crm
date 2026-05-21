-- Limpiar duplicados en lead_sources
-- Este script elimina los duplicados manteniendo el registro más antiguo (menor ID)

-- 1. Ver duplicados existentes (opcional, para diagnóstico)
-- SELECT name, COUNT(*) as count FROM lead_sources 
-- WHERE company_id IN (
--   SELECT company_id FROM lead_sources 
--   GROUP BY company_id, name 
--   HAVING COUNT(*) > 1
-- )
-- GROUP BY name;

-- 2. Eliminar duplicados
-- Mantiene el registro con el ID más bajo (creado primero)
DELETE FROM lead_sources
WHERE id IN (
  SELECT a.id FROM lead_sources a
  JOIN lead_sources b ON a.name = b.name AND a.company_id = b.company_id
  WHERE a.id > b.id
);

-- 3. Verificar limpieza
-- SELECT name, COUNT(*) FROM lead_sources 
-- GROUP BY name HAVING COUNT(*) > 1;
-- Debería retornar 0 filas si todo está limpio
