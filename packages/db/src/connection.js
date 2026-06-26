// Connection helper for the Postgres backend.
// pg is loaded lazily so JSON/memory backends never require it.
export async function createPool(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) throw new Error('DATABASE_URL is required for Postgres storage.');
  const pg = await import('pg');
  const Pool = pg.default?.Pool || pg.Pool;
  const pool = new Pool({ connectionString, max: 8, idleTimeoutMillis: 30000 });
  // Verify connectivity once at boot.
  const client = await pool.connect();
  await client.query('SELECT 1');
  client.release();
  return pool;
}

export async function closePool(pool) {
  if (pool && typeof pool.end === 'function') await pool.end();
}
