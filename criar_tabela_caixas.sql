-- Criar tabela caixas
CREATE TABLE IF NOT EXISTS caixas (
  id SERIAL PRIMARY KEY,
  id_usuario UUID NOT NULL,
  horario_abertura TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  horario_fechamento TIMESTAMP WITH TIME ZONE,
  saldo_inicial DECIMAL(10, 2) DEFAULT 0,
  saldo_final DECIMAL(10, 2),
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar políticas de segurança RLS (Row Level Security)
ALTER TABLE caixas ENABLE ROW LEVEL SECURITY;

-- Política para permitir leitura de caixas pelo próprio usuário
CREATE POLICY "Usuários podem ver seus próprios caixas" 
  ON caixas FOR SELECT 
  USING (auth.uid() = id_usuario);

-- Política para permitir inserção de caixas pelo próprio usuário
CREATE POLICY "Usuários podem inserir seus próprios caixas" 
  ON caixas FOR INSERT 
  WITH CHECK (auth.uid() = id_usuario);

-- Política para permitir atualização de caixas pelo próprio usuário
CREATE POLICY "Usuários podem atualizar seus próprios caixas" 
  ON caixas FOR UPDATE 
  USING (auth.uid() = id_usuario);

-- Política para permitir exclusão de caixas pelo próprio usuário
CREATE POLICY "Usuários podem excluir seus próprios caixas" 
  ON caixas FOR DELETE 
  USING (auth.uid() = id_usuario);
