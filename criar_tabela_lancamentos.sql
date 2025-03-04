-- Criar tabela lancamentos
CREATE TABLE IF NOT EXISTS lancamentos (
  id SERIAL PRIMARY KEY,
  id_usuario UUID NOT NULL,
  id_caixa INTEGER REFERENCES caixas(id),
  tipopag VARCHAR(50) NOT NULL, -- 'RECEITA' ou 'DESPESA'
  descricao TEXT NOT NULL,
  categoria VARCHAR(100),
  total DECIMAL(10, 2) NOT NULL,
  saidas DECIMAL(10, 2) DEFAULT 0,
  forma_pagamento VARCHAR(50),
  data_cad_lancamento TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  observacoes TEXT,
  tipo VARCHAR(50) -- campo adicional mencionado no código
);

-- Adicionar políticas de segurança RLS (Row Level Security)
ALTER TABLE lancamentos ENABLE ROW LEVEL SECURITY;

-- Política para permitir leitura de lançamentos pelo próprio usuário
CREATE POLICY "Usuários podem ver seus próprios lançamentos" 
  ON lancamentos FOR SELECT 
  USING (auth.uid() = id_usuario);

-- Política para permitir inserção de lançamentos pelo próprio usuário
CREATE POLICY "Usuários podem inserir seus próprios lançamentos" 
  ON lancamentos FOR INSERT 
  WITH CHECK (auth.uid() = id_usuario);

-- Política para permitir atualização de lançamentos pelo próprio usuário
CREATE POLICY "Usuários podem atualizar seus próprios lançamentos" 
  ON lancamentos FOR UPDATE 
  USING (auth.uid() = id_usuario);

-- Política para permitir exclusão de lançamentos pelo próprio usuário
CREATE POLICY "Usuários podem excluir seus próprios lançamentos" 
  ON lancamentos FOR DELETE 
  USING (auth.uid() = id_usuario);
