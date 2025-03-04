-- Script para corrigir problemas nos eventos do calendário

-- 1. Verificar eventos com datas em março de 2025
SELECT 
  id, 
  nome, 
  datainicio, 
  datafinal, 
  tipo_evento,
  horamarcada
FROM 
  agenda 
WHERE 
  datainicio >= '2025-03-01' 
  AND datainicio < '2025-04-01'
ORDER BY 
  datainicio;

-- 2. Verificar se há eventos com formato de data incorreto
SELECT 
  id, 
  nome, 
  datainicio, 
  datafinal
FROM 
  agenda 
WHERE 
  datainicio IS NULL 
  OR datafinal IS NULL 
  OR datainicio::text NOT LIKE '20%'
  OR datafinal::text NOT LIKE '20%';

-- 3. Verificar se há eventos com datas de início posteriores às datas de fim
SELECT 
  id, 
  nome, 
  datainicio, 
  datafinal
FROM 
  agenda 
WHERE 
  datainicio > datafinal;

-- 4. Corrigir eventos com datas de início posteriores às datas de fim
UPDATE agenda
SET datafinal = datainicio + interval '1 hour'
WHERE datainicio > datafinal;

-- 5. Verificar eventos com datas de março de 2025 que podem ter problemas de fuso horário
SELECT 
  id, 
  nome, 
  datainicio, 
  datafinal, 
  datainicio AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo' as datainicio_local,
  datafinal AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo' as datafinal_local
FROM 
  agenda 
WHERE 
  datainicio >= '2025-03-01' 
  AND datainicio < '2025-04-01'
ORDER BY 
  datainicio;

-- 6. Corrigir eventos com problemas de fuso horário (se necessário)
-- ATENÇÃO: Execute este comando apenas se for confirmado que há problemas de fuso horário
-- UPDATE agenda
-- SET 
--   datainicio = datainicio AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo',
--   datafinal = datafinal AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo'
-- WHERE 
--   datainicio >= '2025-03-01' 
--   AND datainicio < '2025-04-01';

-- 7. Verificar se há eventos sem responsáveis
SELECT 
  a.id, 
  a.nome, 
  a.datainicio, 
  COUNT(ar.user_id) as num_responsaveis
FROM 
  agenda a
LEFT JOIN 
  agenda_responsaveis ar ON a.id = ar.agenda_id
WHERE 
  a.datainicio >= '2025-03-01' 
  AND a.datainicio < '2025-04-01'
GROUP BY 
  a.id, a.nome, a.datainicio
HAVING 
  COUNT(ar.user_id) = 0
ORDER BY 
  a.datainicio;
