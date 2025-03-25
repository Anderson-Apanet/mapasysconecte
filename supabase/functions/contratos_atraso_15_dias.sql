-- Função para buscar contratos em atraso > 15 dias com paginação
CREATE OR REPLACE FUNCTION buscar_contratos_atraso_15_dias(p_limit integer, p_offset integer)
RETURNS SETOF contratos
LANGUAGE sql
AS $$
  SELECT DISTINCT c.*
  FROM public.contratos c
  INNER JOIN public.titulos t ON c.id = t.id_contrato
  WHERE 
      t.vencimento <= (CURRENT_DATE - INTERVAL '15 days')
      AND (t.pago IS DISTINCT FROM true)
      AND c.status NOT IN ('Bloqueado', 'Cancelado')
      AND (c.tipo IS DISTINCT FROM 'Cliente Bonificado')
  ORDER BY c.pppoe ASC
  LIMIT p_limit
  OFFSET p_offset;
$$;

-- Função para contar o total de contratos em atraso > 15 dias
CREATE OR REPLACE FUNCTION contar_contratos_atraso_15_dias()
RETURNS integer
LANGUAGE sql
AS $$
  SELECT COUNT(DISTINCT c.id)
  FROM public.contratos c
  INNER JOIN public.titulos t ON c.id = t.id_contrato
  WHERE 
      t.vencimento <= (CURRENT_DATE - INTERVAL '15 days')
      AND (t.pago IS DISTINCT FROM true)
      AND c.status NOT IN ('Bloqueado', 'Cancelado')
      AND (c.tipo IS DISTINCT FROM 'Cliente Bonificado');
$$;
