import { Pool } from 'pg'
import { env } from './env.js'

let pool: Pool | undefined

export function getDatabasePool(): Pool {
  if (!env.databaseUrl) {
    throw new Error('DATABASE_URL (or DB_URL) is required for authentication')
  }

  pool ??= new Pool({
    connectionString: env.databaseUrl,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  })

  return pool
}
