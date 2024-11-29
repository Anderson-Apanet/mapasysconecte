import { Pool, PoolConfig } from 'pg';

const dbConfig: PoolConfig = {
  user: 'postgres.aunfucsmyfbdyxfgvpha',
  host: 'aws-0-sa-east-1.pooler.supabase.com',
  database: 'postgres',
  password: 'FRIxpN4J0USv5yqJ',
  port: 6543,
  ssl: {
    rejectUnauthorized: false
  }
};

export const createPool = () => new Pool(dbConfig);
