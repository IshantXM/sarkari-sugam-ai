import pg from 'pg';
import config from '../../config/env.js';
import logger from '../../utils/logger.js';

const { Pool } = pg;

let pool = null;
let isConnected = false;

export function getPool() {
  if (!pool && config.postgresUri) {
    pool = new Pool({
      connectionString: config.postgresUri,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    pool.on('error', (err) => {
      logger.error(`[POSTGRES] Idle client error: ${err.message}`);
    });
  }
  return pool;
}

export async function connectPostgres() {
  const currentPool = getPool();
  if (!currentPool) {
    logger.warn('[POSTGRES] No POSTGRES_URI configured.');
    return false;
  }

  try {
    const client = await currentPool.connect();
    isConnected = true;

    // Check version
    const versionRes = await client.query('SELECT version(), current_database()');
    const dbName = versionRes.rows[0].current_database;
    logger.info(`[SUPABASE] Connected successfully to PostgreSQL database "${dbName}"`);

    // Ensure pgcrypto for UUID generation
    await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');

    // Ensure users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'PROCUREMENT_OFFICER',
        department VARCHAR(255) DEFAULT 'MoRTH National Highways Division',
        organization VARCHAR(255) DEFAULT 'Ministry of Road Transport and Highways',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Ensure tenders table
    await client.query(`
      CREATE TABLE IF NOT EXISTS tenders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tender_id VARCHAR(255) UNIQUE NOT NULL,
        title TEXT DEFAULT 'Government Procurement Notice',
        issuing_agency TEXT DEFAULT 'Public Authority',
        budget_usd NUMERIC DEFAULT 0,
        submission_deadline TEXT DEFAULT 'Open',
        eligibility TEXT DEFAULT 'Standard General Conditions',
        source_url TEXT DEFAULT '',
        extraction_confidence NUMERIC DEFAULT 0.85,
        status VARCHAR(50) DEFAULT 'MONITORED',
        saved_by VARCHAR(255) DEFAULT NULL,
        history JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    client.release();
    logger.info('[SUPABASE] Database schema and tables verified ready.');
    return true;
  } catch (err) {
    isConnected = false;
    logger.error(`[SUPABASE] Connection error: ${err.message}`);
    return false;
  }
}

export async function query(text, params) {
  const currentPool = getPool();
  if (!currentPool) {
    throw new Error('Postgres pool not initialized. Check POSTGRES_URI in .env.');
  }
  return currentPool.query(text, params);
}

export function getPostgresStatus() {
  const maskedUri = (config.postgresUri || '').replace(/(:\/\/)([^:@/]+):([^@/]+)@/, '$1$2:••••••••@');
  return {
    connected: isConnected,
    type: 'supabase_postgresql',
    status: isConnected ? 'Connected' : 'Disconnected',
    database: 'postgres',
    uri: maskedUri,
  };
}

export default {
  getPool,
  connectPostgres,
  query,
  getPostgresStatus,
};
