import bcrypt from 'bcryptjs'
import { getDatabasePool } from '../../config/database.js'
import type { UserProfile } from '../users/users.types.js'

export interface AuthSession {
  id: string
  user_id: string
  refresh_token_hash: string
  expires_at: string
  revoked_at: string | null
}

const USER_COLUMNS =
  'id,email,full_name,nickname,phone_number,role,avatar_url,status,is_verified,created_at,updated_at'
const QUALIFIED_USER_COLUMNS = USER_COLUMNS.split(',')
  .map((column) => `p.${column}`)
  .join(',')

function isoDate(value: unknown): string {
  const dateValue = typeof value === 'string' || typeof value === 'number' || value instanceof Date
    ? value
    : Number.NaN
  const date = new Date(dateValue)
  return Number.isFinite(date.getTime()) ? date.toISOString() : new Date().toISOString()
}

function mapUser(row: Record<string, unknown>): UserProfile {
  return {
    id: String(row.id),
    email: String(row.email ?? ''),
    full_name: String(row.full_name ?? ''),
    nickname: typeof row.nickname === 'string' ? row.nickname : null,
    phone_number: typeof row.phone_number === 'string' ? row.phone_number : null,
    role: String(row.role ?? 'STUDENT').toUpperCase() as UserProfile['role'],
    avatar_url: typeof row.avatar_url === 'string' ? row.avatar_url : null,
    status: String(row.status ?? 'active').toLowerCase() as UserProfile['status'],
    is_verified: Boolean(row.is_verified),
    created_at: isoDate(row.created_at),
    updated_at: isoDate(row.updated_at),
  }
}

export class AuthRepository {
  async createStudentAccount(email: string, password: string): Promise<UserProfile> {
    const passwordHash = await bcrypt.hash(password, 12)
    const client = await getDatabasePool().connect()
    try {
      await client.query('BEGIN')
      const { rows } = await client.query(
        `INSERT INTO public.profiles
          (id, email, full_name, nickname, phone_number, role,
           avatar_url, status, is_verified, created_at, updated_at)
         VALUES
          (gen_random_uuid(), $1, $2, NULL, NULL, 'STUDENT',
           NULL, 'active', false, now(), now())
         RETURNING ${USER_COLUMNS}`,
        [email, email.split('@')[0] || 'Learner']
      )
      const row = rows[0] as Record<string, unknown> | undefined
      if (!row) throw new Error('Database did not return the created user profile')
      await client.query(
        `INSERT INTO public.auth_credentials (user_id, password_hash)
         VALUES ($1, $2)`,
        [row.id, passwordHash]
      )
      await client.query('COMMIT')
      return mapUser(row)
    } catch (error) {
      try {
        await client.query('ROLLBACK')
      } catch (rollbackError) {
        throw new AggregateError([error, rollbackError], 'Failed to roll back account creation')
      }
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === '23505'
      ) {
        throw new Error('Email is already registered', { cause: error })
      }
      throw new Error('Unable to create authentication account in PostgreSQL', { cause: error })
    } finally {
      client.release()
    }
  }

  async rollbackStudentAccount(userId: string): Promise<void> {
    const { rowCount, rows } = await getDatabasePool().query(
      'DELETE FROM public.profiles WHERE id = $1 RETURNING id',
      [userId]
    )
    if (rowCount !== 1 || !rows[0]) {
      throw new Error('Unable to roll back the newly created authentication account')
    }
  }

  async authenticatePassword(email: string, password: string): Promise<UserProfile | null> {
    const { rows } = await getDatabasePool().query(
      `SELECT ${QUALIFIED_USER_COLUMNS}, c.password_hash
       FROM public.profiles AS p
       JOIN public.auth_credentials AS c ON c.user_id = p.id
       WHERE lower(p.email) = $1
       LIMIT 1`,
      [email]
    )
    const row = rows[0] as (Record<string, unknown> & { password_hash?: string | null }) | undefined
    if (!row?.password_hash || !(await bcrypt.compare(password, row.password_hash))) return null
    return mapUser(row)
  }

  async updatePassword(userId: string, password: string): Promise<void> {
    const passwordHash = await bcrypt.hash(password, 12)
    const { rowCount } = await getDatabasePool().query(
      `INSERT INTO public.auth_credentials (user_id, password_hash)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE
       SET password_hash = EXCLUDED.password_hash, updated_at = now()`,
      [userId, passwordHash]
    )
    if (rowCount !== 1) throw new Error('Unable to update password for the account')
  }

  async findById(userId: string): Promise<UserProfile | null> {
    const { rows } = await getDatabasePool().query(
      `SELECT ${USER_COLUMNS} FROM public.profiles WHERE id = $1 LIMIT 1`,
      [userId]
    )
    const row = rows[0] as Record<string, unknown> | undefined
    return row ? mapUser(row) : null
  }

  async findByEmail(email: string): Promise<UserProfile | null> {
    const { rows } = await getDatabasePool().query(
      `SELECT ${USER_COLUMNS} FROM public.profiles WHERE lower(email) = $1 LIMIT 1`,
      [email.trim().toLowerCase()]
    )
    const row = rows[0] as Record<string, unknown> | undefined
    return row ? mapUser(row) : null
  }

  async createSession(
    id: string,
    userId: string,
    refreshTokenHash: string,
    expiresAt: string
  ): Promise<void> {
    try {
      await getDatabasePool().query(
        `INSERT INTO public.auth_sessions (id, user_id, refresh_token_hash, expires_at)
         VALUES ($1, $2, $3, $4)`,
        [id, userId, refreshTokenHash, expiresAt]
      )
    } catch (error) {
      throw new Error('Unable to create authentication session', { cause: error })
    }
  }

  async findSessionById(id: string): Promise<AuthSession | null> {
    const { rows } = await getDatabasePool().query(
      `SELECT id, user_id, refresh_token_hash, expires_at, revoked_at
       FROM public.auth_sessions WHERE id = $1 LIMIT 1`,
      [id]
    )
    return (rows[0] as AuthSession | undefined) ?? null
  }

  async rotateSession(
    id: string,
    previousHash: string,
    nextHash: string,
    expiresAt: string
  ): Promise<boolean> {
    const { rowCount } = await getDatabasePool().query(
      `UPDATE public.auth_sessions
       SET refresh_token_hash = $3, expires_at = $4, last_used_at = now()
       WHERE id = $1 AND refresh_token_hash = $2
         AND revoked_at IS NULL AND expires_at > now()`,
      [id, previousHash, nextHash, expiresAt]
    )
    return rowCount === 1
  }

  async revokeSession(id: string): Promise<void> {
    await getDatabasePool().query(
      `UPDATE public.auth_sessions
       SET revoked_at = COALESCE(revoked_at, now())
       WHERE id = $1`,
      [id]
    )
  }

  async issuePasswordResetToken(
    userId: string,
    tokenHash: string,
    expiresAt: string
  ): Promise<void> {
    const client = await getDatabasePool().connect()
    try {
      await client.query('BEGIN')
      const user = await client.query(
        'SELECT id FROM public.profiles WHERE id = $1 FOR UPDATE',
        [userId]
      )
      if (user.rowCount !== 1) throw new Error('Cannot issue reset token for a missing account')
      await client.query(
        `UPDATE public.password_reset_tokens
         SET used_at = COALESCE(used_at, now())
         WHERE user_id = $1 AND used_at IS NULL`,
        [userId]
      )
      await client.query(
        `INSERT INTO public.password_reset_tokens (user_id, token_hash, expires_at)
         VALUES ($1, $2, $3)`,
        [userId, tokenHash, expiresAt]
      )
      await client.query('COMMIT')
    } catch (error) {
      try {
        await client.query('ROLLBACK')
      } catch (rollbackError) {
        throw new AggregateError([error, rollbackError], 'Failed to roll back password reset request')
      }
      throw new Error('Unable to create password reset request', { cause: error })
    } finally {
      client.release()
    }
  }

  async consumePasswordResetToken(tokenHash: string): Promise<string | null> {
    const { rows } = await getDatabasePool().query(
      `UPDATE public.password_reset_tokens
       SET used_at = now()
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
       RETURNING user_id`,
      [tokenHash]
    )
    return typeof rows[0]?.user_id === 'string' ? rows[0].user_id : null
  }

  async revokeUserSessions(userId: string): Promise<void> {
    await getDatabasePool().query(
      `UPDATE public.auth_sessions
       SET revoked_at = COALESCE(revoked_at, now())
       WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId]
    )
  }
}

export const authRepository = new AuthRepository()
