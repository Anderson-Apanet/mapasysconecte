-- Verificar se as políticas de RLS estão habilitadas para a tabela caixas
SELECT relname, relrowsecurity 
FROM pg_class 
WHERE relname = 'caixas';

-- Habilitar RLS para a tabela caixas (caso não esteja habilitado)
ALTER TABLE caixas ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes para a tabela caixas (para evitar conflitos)
DROP POLICY IF EXISTS "Usuários podem ver seus próprios caixas" ON caixas;
DROP POLICY IF EXISTS "Usuários podem inserir seus próprios caixas" ON caixas;
DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios caixas" ON caixas;
DROP POLICY IF EXISTS "Usuários podem excluir seus próprios caixas" ON caixas;

-- Criar políticas para a tabela caixas
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

-- Verificar se as políticas de RLS estão habilitadas para a tabela lancamentos
SELECT relname, relrowsecurity 
FROM pg_class 
WHERE relname = 'lancamentos';

-- Habilitar RLS para a tabela lancamentos (caso não esteja habilitado)
ALTER TABLE lancamentos ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes para a tabela lancamentos (para evitar conflitos)
DROP POLICY IF EXISTS "Usuários podem ver seus próprios lançamentos" ON lancamentos;
DROP POLICY IF EXISTS "Usuários podem inserir seus próprios lançamentos" ON lancamentos;
DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios lançamentos" ON lancamentos;
DROP POLICY IF EXISTS "Usuários podem excluir seus próprios lançamentos" ON lancamentos;

-- Criar políticas para a tabela lancamentos
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

-- Criar uma política temporária para permitir acesso público (apenas para testes)
-- ATENÇÃO: Remova esta política em ambiente de produção
CREATE POLICY "Acesso temporário para testes" 
  ON caixas FOR ALL 
  USING (true);

CREATE POLICY "Acesso temporário para testes" 
  ON lancamentos FOR ALL 
  USING (true);
