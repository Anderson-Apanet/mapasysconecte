-- Create materiais table
CREATE TABLE IF NOT EXISTS materiais (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    tipo VARCHAR(50) NOT NULL,
    modelo VARCHAR(100) NOT NULL,
    marca VARCHAR(100) NOT NULL,
    quantidade INTEGER NOT NULL DEFAULT 0,
    etiqueta VARCHAR(100) NOT NULL,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_materiais_updated_at
    BEFORE UPDATE ON materiais
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
