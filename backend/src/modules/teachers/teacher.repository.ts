import { createHash, randomBytes } from 'node:crypto'
import bcrypt from 'bcryptjs'
import type { PoolClient } from 'pg'
import { getDatabasePool } from '../../config/database.js'
import type { UserProfile, UserStatus } from '../users/users.types.js'

const USER_COLUMNS = 'id,email,full_name,nickname,phone_number,role,avatar_url,status,is_verified,created_at,updated_at'
function mapUser(row: Record<string, unknown>): UserProfile {
  return {
    id: String(row.id), email: String(row.email), full_name: String(row.full_name),
    nickname: typeof row.nickname === 'string' ? row.nickname : null,
    phone_number: typeof row.phone_number === 'string' ? row.phone_number : null,
    role: 'TEACHER', avatar_url: typeof row.avatar_url === 'string' ? row.avatar_url : null,
    status: String(row.status) as UserStatus, is_verified: Boolean(row.is_verified),
    created_at: new Date(String(row.created_at)).toISOString(),
    updated_at: new Date(String(row.updated_at)).toISOString(),
  }
}

function makeToken(): string {
  return randomBytes(32).toString('base64url')
}

function tokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export class TeacherRepository {
  async create(input: { fullName: string; email: string; password: string; nickname: string | null; phoneNumber: string | null; avatarUrl: string | null }): Promise<UserProfile> {
    const client = await getDatabasePool().connect()
    const passwordHash = await bcrypt.hash(input.password, 12)
    try {
      await client.query('BEGIN')
      const { rows } = await client.query(
        `INSERT INTO public.profiles (id,email,full_name,nickname,phone_number,role,avatar_url,status,is_verified)
         VALUES (gen_random_uuid(),$1,$2,$3,$4,'TEACHER',$5,'active',true)
         RETURNING ${USER_COLUMNS}`,
        [input.email.trim().toLowerCase(), input.fullName.trim(), input.nickname, input.phoneNumber, input.avatarUrl]
      )
      const row = rows[0] as Record<string, unknown> | undefined
      if (!row) throw new Error('Database did not return the teacher profile')
      await client.query(
        `INSERT INTO public.auth_credentials (user_id,password_hash) VALUES ($1,$2)`,
        [row.id, passwordHash]
      )
      await client.query('COMMIT')
      return mapUser(row)
    } catch (error) {
      await this.rollback(client, error, 'teacher account creation')
      if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
        throw new Error('Email is already registered', { cause: error })
      }
      throw error
    } finally { client.release() }
  }

  async list(params: { search?: string; status?: string; page?: number; limit?: number }): Promise<{ items: UserProfile[]; total: number; page: number; limit: number; totalPages: number }> {
    const page = Math.max(1, Number(params.page) || 1)
    const limit = Math.max(1, Math.min(100, Number(params.limit) || 10))
    const values: unknown[] = []
    const filters = ["role = 'TEACHER'"]
    if (params.search?.trim()) {
      values.push(`%${params.search.trim()}%`)
      filters.push(`(full_name ILIKE $${values.length} OR email ILIKE $${values.length} OR phone_number ILIKE $${values.length})`)
    }
    if (params.status && params.status !== 'ALL') {
      values.push(params.status)
      filters.push(`status = $${values.length}`)
    }
    const where = filters.join(' AND ')
    const pool = getDatabasePool()
    const count = await pool.query(`SELECT count(*)::int AS total FROM public.profiles WHERE ${where}`, values)
    const total = Number((count.rows[0] as { total?: number } | undefined)?.total ?? 0)
    const result = await pool.query(
      `SELECT ${USER_COLUMNS} FROM public.profiles WHERE ${where} ORDER BY created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, limit, (page - 1) * limit]
    )
    return { items: (result.rows as Record<string, unknown>[]).map(mapUser), total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) }
  }

  async findById(id: string): Promise<UserProfile | null> {
    const { rows } = await getDatabasePool().query(
      `SELECT ${USER_COLUMNS} FROM public.profiles WHERE id = $1 AND role = 'TEACHER'`, [id]
    )
    const row = rows[0] as Record<string, unknown> | undefined
    return row ? mapUser(row) : null
  }

  async issueActivation(userId: string): Promise<{ user: UserProfile; token: string } | null> {
    const client = await getDatabasePool().connect()
    const token = makeToken()
    try {
      await client.query('BEGIN')
      const { rows } = await client.query(
        `SELECT ${USER_COLUMNS} FROM public.profiles WHERE id = $1 AND role = 'TEACHER' AND status = 'pending' FOR UPDATE`, [userId]
      )
      const row = rows[0] as Record<string, unknown> | undefined
      if (!row) { await client.query('COMMIT'); return null }
      await client.query(`UPDATE public.teacher_activation_tokens SET used_at = now() WHERE user_id = $1 AND used_at IS NULL`, [userId])
      await client.query(
        `INSERT INTO public.teacher_activation_tokens (user_id,token_hash,expires_at) VALUES ($1,$2,now() + interval '24 hours')`,
        [userId, tokenHash(token)]
      )
      await client.query('COMMIT')
      return { user: mapUser(row), token }
    } catch (error) {
      await this.rollback(client, error, 'activation resend')
      throw error
    } finally { client.release() }
  }

  async activate(token: string, password: string): Promise<boolean> {
    const passwordHash = await bcrypt.hash(password, 12)
    const client = await getDatabasePool().connect()
    try {
      await client.query('BEGIN')
      const { rows } = await client.query(
        `SELECT activation.id, activation.user_id
         FROM public.teacher_activation_tokens activation
         JOIN public.profiles profile ON profile.id = activation.user_id
         WHERE activation.token_hash = $1 AND activation.used_at IS NULL
           AND activation.expires_at > now() AND profile.role = 'TEACHER' AND profile.status = 'pending'
         FOR UPDATE OF activation, profile`, [tokenHash(token)]
      )
      const activation = rows[0] as { id: string; user_id: string } | undefined
      if (!activation) { await client.query('ROLLBACK'); return false }
      await client.query(
        `INSERT INTO public.auth_credentials (user_id,password_hash) VALUES ($1,$2)
         ON CONFLICT (user_id) DO UPDATE SET password_hash = EXCLUDED.password_hash, updated_at = now()`,
        [activation.user_id, passwordHash]
      )
      await client.query(`UPDATE public.profiles SET status='active',is_verified=true,updated_at=now() WHERE id=$1`, [activation.user_id])
      await client.query(`UPDATE public.teacher_activation_tokens SET used_at=now() WHERE user_id=$1 AND used_at IS NULL`, [activation.user_id])
      await client.query('COMMIT')
      return true
    } catch (error) {
      await this.rollback(client, error, 'teacher activation')
      throw error
    } finally { client.release() }
  }

  async updateProfile(id: string, input: { fullName: string; nickname: string | null; phoneNumber: string | null }): Promise<UserProfile | null> {
    const { rows } = await getDatabasePool().query(
      `UPDATE public.profiles SET full_name=$2,nickname=$3,phone_number=$4,updated_at=now()
       WHERE id=$1 AND role='TEACHER' RETURNING ${USER_COLUMNS}`,
      [id, input.fullName, input.nickname, input.phoneNumber]
    )
    const row = rows[0] as Record<string, unknown> | undefined
    return row ? mapUser(row) : null
  }

  async updateStatus(id: string, status: 'active' | 'locked' | 'pending' | 'deactivated'): Promise<UserProfile | null> {
    const { rows } = await getDatabasePool().query(
      `UPDATE public.profiles SET status=$2,updated_at=now()
       WHERE id=$1 AND role='TEACHER' AND NOT ($2='active' AND status='pending')
         AND NOT (status='deactivated' AND $2 <> 'deactivated')
       RETURNING ${USER_COLUMNS}`,
      [id, status]
    )
    if (status !== 'active') {
      await getDatabasePool().query(
        `UPDATE public.auth_sessions SET revoked_at=COALESCE(revoked_at,now()) WHERE user_id=$1 AND revoked_at IS NULL`, [id]
      )
    }
    const row = rows[0] as Record<string, unknown> | undefined
    return row ? mapUser(row) : null
  }

  async issuePasswordReset(email: string): Promise<{ user: UserProfile; token: string } | null> {
    const client = await getDatabasePool().connect()
    const token = makeToken()
    try {
      await client.query('BEGIN')
      const { rows } = await client.query(
        `SELECT ${USER_COLUMNS} FROM public.profiles WHERE lower(email)=$1 AND role='TEACHER' AND status='active' AND is_verified=true FOR UPDATE`,
        [email.trim().toLowerCase()]
      )
      const row = rows[0] as Record<string, unknown> | undefined
      if (!row) { await client.query('COMMIT'); return null }
      await client.query(`UPDATE public.password_reset_tokens SET used_at=now() WHERE user_id=$1 AND used_at IS NULL`, [row.id])
      await client.query(
        `INSERT INTO public.password_reset_tokens (user_id,token_hash,expires_at) VALUES ($1,$2,now()+interval '1 hour')`,
        [row.id, tokenHash(token)]
      )
      await client.query('COMMIT')
      return { user: mapUser(row), token }
    } catch (error) {
      await this.rollback(client, error, 'password reset issuance')
      throw error
    } finally { client.release() }
  }

  async resetPassword(token: string, password: string): Promise<boolean> {
    const passwordHash = await bcrypt.hash(password, 12)
    const client = await getDatabasePool().connect()
    try {
      await client.query('BEGIN')
      const { rows } = await client.query(
        `SELECT reset.id,reset.user_id FROM public.password_reset_tokens reset
         JOIN public.profiles profile ON profile.id=reset.user_id
         WHERE reset.token_hash=$1 AND reset.used_at IS NULL AND reset.expires_at>now()
           AND profile.role='TEACHER' AND profile.status='active' FOR UPDATE OF reset,profile`,
        [tokenHash(token)]
      )
      const reset = rows[0] as { id: string; user_id: string } | undefined
      if (!reset) { await client.query('ROLLBACK'); return false }
      await client.query(`UPDATE public.auth_credentials SET password_hash=$2,updated_at=now() WHERE user_id=$1`, [reset.user_id, passwordHash])
      await client.query(`UPDATE public.password_reset_tokens SET used_at=now() WHERE user_id=$1 AND used_at IS NULL`, [reset.user_id])
      await client.query(`UPDATE public.auth_sessions SET revoked_at=COALESCE(revoked_at,now()) WHERE user_id=$1 AND revoked_at IS NULL`, [reset.user_id])
      await client.query('COMMIT')
      return true
    } catch (error) {
      await this.rollback(client, error, 'teacher password reset')
      throw error
    } finally { client.release() }
  }

  private async rollback(client: PoolClient, error: unknown, operation: string): Promise<void> {
    try { await client.query('ROLLBACK') } catch (rollbackError) {
      throw new AggregateError([error, rollbackError], `Failed to roll back ${operation}`)
    }
  }
}

export const teacherRepository = new TeacherRepository()
