-- Verificar a estrutura da tabela caixas
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'caixas'
ORDER BY ordinal_position;

-- Verificar a estrutura da tabela lancamentos
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'lancamentos'
ORDER BY ordinal_position;

-- Adicionar colunas que podem estar faltando na tabela caixas
DO $$
BEGIN
    -- Verificar e adicionar coluna id_usuario se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'caixas' AND column_name = 'id_usuario') THEN
        ALTER TABLE caixas ADD COLUMN id_usuario UUID;
    END IF;
    
    -- Verificar e adicionar coluna horario_abertura se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'caixas' AND column_name = 'horario_abertura') THEN
        ALTER TABLE caixas ADD COLUMN horario_abertura TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    -- Verificar e adicionar coluna horario_fechamento se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'caixas' AND column_name = 'horario_fechamento') THEN
        ALTER TABLE caixas ADD COLUMN horario_fechamento TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Verificar e adicionar coluna saldo_inicial se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'caixas' AND column_name = 'saldo_inicial') THEN
        ALTER TABLE caixas ADD COLUMN saldo_inicial DECIMAL(10, 2) DEFAULT 0;
    END IF;
    
    -- Verificar e adicionar coluna saldo_final se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'caixas' AND column_name = 'saldo_final') THEN
        ALTER TABLE caixas ADD COLUMN saldo_final DECIMAL(10, 2);
    END IF;
    
    -- Verificar e adicionar coluna observacoes se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'caixas' AND column_name = 'observacoes') THEN
        ALTER TABLE caixas ADD COLUMN observacoes TEXT;
    END IF;
    
    -- Verificar e adicionar coluna created_at se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'caixas' AND column_name = 'created_at') THEN
        ALTER TABLE caixas ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Adicionar colunas que podem estar faltando na tabela lancamentos
DO $$
BEGIN
    -- Verificar e adicionar coluna id_usuario se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lancamentos' AND column_name = 'id_usuario') THEN
        ALTER TABLE lancamentos ADD COLUMN id_usuario UUID;
    END IF;
    
    -- Verificar e adicionar coluna id_caixa se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lancamentos' AND column_name = 'id_caixa') THEN
        ALTER TABLE lancamentos ADD COLUMN id_caixa INTEGER REFERENCES caixas(id);
    END IF;
    
    -- Verificar e adicionar coluna tipopag se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lancamentos' AND column_name = 'tipopag') THEN
        ALTER TABLE lancamentos ADD COLUMN tipopag VARCHAR(50);
    END IF;
    
    -- Verificar e adicionar coluna descricao se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lancamentos' AND column_name = 'descricao') THEN
        ALTER TABLE lancamentos ADD COLUMN descricao TEXT;
    END IF;
    
    -- Verificar e adicionar coluna categoria se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lancamentos' AND column_name = 'categoria') THEN
        ALTER TABLE lancamentos ADD COLUMN categoria VARCHAR(100);
    END IF;
    
    -- Verificar e adicionar coluna total se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lancamentos' AND column_name = 'total') THEN
        ALTER TABLE lancamentos ADD COLUMN total DECIMAL(10, 2) DEFAULT 0;
    END IF;
    
    -- Verificar e adicionar coluna saidas se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lancamentos' AND column_name = 'saidas') THEN
        ALTER TABLE lancamentos ADD COLUMN saidas DECIMAL(10, 2) DEFAULT 0;
    END IF;
    
    -- Verificar e adicionar coluna forma_pagamento se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lancamentos' AND column_name = 'forma_pagamento') THEN
        ALTER TABLE lancamentos ADD COLUMN forma_pagamento VARCHAR(50);
    END IF;
    
    -- Verificar e adicionar coluna data_cad_lancamento se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lancamentos' AND column_name = 'data_cad_lancamento') THEN
        ALTER TABLE lancamentos ADD COLUMN data_cad_lancamento TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    -- Verificar e adicionar coluna observacoes se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lancamentos' AND column_name = 'observacoes') THEN
        ALTER TABLE lancamentos ADD COLUMN observacoes TEXT;
    END IF;
    
    -- Verificar e adicionar coluna tipo se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lancamentos' AND column_name = 'tipo') THEN
        ALTER TABLE lancamentos ADD COLUMN tipo VARCHAR(50);
    END IF;
END $$;
