import { Pool, PoolConfig } from 'pg';

const dbConfig: PoolConfig = {
  user: 'postgres.dieycvogftvfoncigvtl',
  host: 'aws-0-sa-east-1.pooler.supabase.co',
  database: 'postgres',
  password: 'FRIxpN4J0USv5yqJ', // Mantendo a mesma senha pois não foi fornecida uma nova
  port: 6543,
  ssl: {
    rejectUnauthorized: false
  }
};

export const createPool = () => new Pool(dbConfig);
