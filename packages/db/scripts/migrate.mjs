#!/usr/bin/env node
// Applies SQL migrations in order against DATABASE_URL.
// Usage: npm run db:migrate
import fs from 'node:fs';
import path from 'node:path';
import { createPool, closePool } from '../src/connection.js';

const migrationsDir = path.resolve(process.cwd(), 'db', 'migrations');
const schemaFile = path.resolve(process.cwd(), 'db', 'schema.sql');

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is required. Set STORAGE_MODE=postgres and DATABASE_URL=postgres://...');
    process.exit(1);
  }
  const pool = await createPool();
  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`);

  // Apply base schema first.
  const schema = fs.readFileSync(schemaFile, 'utf8');
  await pool.query(schema);
  console.log('Applied db/schema.sql');

  // Then numbered migrations in order.
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) {
    const { rows } = await pool.query('SELECT 1 FROM schema_migrations WHERE name=$1', [file]);
    if (rows.length) { console.log(`Skip (already applied): ${file}`); continue; }
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    await pool.query(sql);
    await pool.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
    console.log(`Applied: ${file}`);
  }
  await closePool(pool);
  console.log('Migrations complete.');
}

main().catch((err) => { console.error('Migration failed:', err.message); process.exit(1); });
