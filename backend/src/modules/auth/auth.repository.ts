import bcrypt from 'bcryptjs'
import type { PoolClient } from 'pg'
import { getDatabasePool } from '../../config/database.js'
import type { UserProfile } from '../users/users.types.js'
import {
  REGISTRATION_OTP_MAX_ATTEMPTS,
  hashRegistrationOtp,
  registrationOtpMatches,
} from './registration-otp.js'

export interface AuthSession {
  id: string
  user_id: string
  refresh_token_hash: string
  expires_at: string
  revoked_at: string | null
}

export type RegistrationOtpIssueResult =
  | { status: 'not_registered' }
  | { status: 'cooldown'; retryAfterSeconds: number }
  | { status: 'issued'; userId: string; email: string; fullName: string }

export type RegistrationOtpVerifyResult =
  | { status: 'verified'; user: UserProfile }
  | { status: 'not_registered' | 'already_verified' | 'invalid' | 'expired' | 'attempts_exhausted' }

export type GoogleIdentityResolution =
  | { status: 'resolved'; user: UserProfile }
  | { status: 'link_required' | 'conflict' }

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
    is_verified: Boolean(row.is_verified || ['TEACHER', 'ADMIN'].includes(String(row.role ?? '').toUpperCase())),
    created_at: isoDate(row.created_at),
    updated_at: isoDate(row.updated_at),
  }
}

export class AuthRepository {
  private async finishTransaction(client: PoolClient): Promise<void> {
    await client.query('COMMIT')
  }

  async issueRegistrationOtp(
    email: string,
    otp: string,
    expiresAt: string,
    sentAt: string,
    cooldownMs: number
  ): Promise<RegistrationOtpIssueResult> {
    const client = await getDatabasePool().connect()
    try {
      await client.query('BEGIN')
      const { rows } = await client.query(
        `SELECT p.id, p.email, p.full_name
         FROM public.profiles AS p
         JOIN public.auth_registration_details AS details ON details.user_id = p.id
         WHERE lower(p.email) = $1 AND p.status = 'active' AND p.is_verified = false
         FOR UPDATE OF p`,
        [email]
      )
      const profile = rows[0] as
        | { id: string; email: string; full_name: string }
        | undefined
      if (!profile) {
        await this.finishTransaction(client)
        return { status: 'not_registered' }
      }

      const otpResult = await client.query(
        `SELECT last_sent_at
         FROM public.registration_email_otps
         WHERE user_id = $1
         FOR UPDATE`,
        [profile.id]
      )
      const previousSentAt = otpResult.rows[0]?.last_sent_at
      if (previousSentAt) {
        const elapsedMs = Date.parse(String(previousSentAt)) > 0
          ? Date.now() - Date.parse(String(previousSentAt))
          : Date.now() - new Date(previousSentAt).getTime()
        const retryAfterSeconds = Math.ceil((cooldownMs - elapsedMs) / 1000)
        if (retryAfterSeconds > 0) {
          await this.finishTransaction(client)
          return { status: 'cooldown', retryAfterSeconds }
        }
      }

      const otpHash = hashRegistrationOtp(profile.id, otp)
      await client.query(
        `INSERT INTO public.registration_email_otps
          (user_id, otp_hash, expires_at, attempt_count, last_sent_at, consumed_at)
         VALUES ($1, $2, $3, 0, $4, NULL)
         ON CONFLICT (user_id) DO UPDATE
         SET otp_hash = EXCLUDED.otp_hash,
             expires_at = EXCLUDED.expires_at,
             attempt_count = 0,
             last_sent_at = EXCLUDED.last_sent_at,
             consumed_at = NULL`,
        [profile.id, otpHash, expiresAt, sentAt]
      )
      await this.finishTransaction(client)
      return {
        status: 'issued',
        userId: profile.id,
        email: profile.email,
        fullName: profile.full_name,
      }
    } catch (error) {
      try {
        await client.query('ROLLBACK')
      } catch (rollbackError) {
        throw new AggregateError([error, rollbackError], 'Failed to roll back registration OTP issuance')
      }
      throw new Error('Unable to issue registration verification code', { cause: error })
    } finally {
      client.release()
    }
  }

  async invalidateRegistrationOtp(userId: string, otpHash: string): Promise<void> {
    try {
      await getDatabasePool().query(
        `DELETE FROM public.registration_email_otps
         WHERE user_id = $1 AND otp_hash = $2`,
        [userId, otpHash]
      )
    } catch (error) {
      throw new Error('Unable to invalidate undelivered registration verification code', {
        cause: error,
      })
    }
  }

  async verifyRegistrationOtp(
    email: string,
    otp: string,
    now: string,
    maxAttempts = REGISTRATION_OTP_MAX_ATTEMPTS
  ): Promise<RegistrationOtpVerifyResult> {
    const client = await getDatabasePool().connect()
    try {
      await client.query('BEGIN')
      const { rows } = await client.query(
        `SELECT p.id, p.email, p.full_name, p.nickname, p.phone_number, p.role,
                p.avatar_url, p.status, p.is_verified, p.created_at, p.updated_at
         FROM public.profiles AS p
         JOIN public.auth_registration_details AS details ON details.user_id = p.id
         WHERE lower(p.email) = $1 AND p.status = 'active'
         FOR UPDATE OF p`,
        [email]
      )
      const profile = rows[0] as Record<string, unknown> | undefined
      if (!profile) {
        await this.finishTransaction(client)
        return { status: 'not_registered' }
      }
      if (profile.is_verified) {
        await this.finishTransaction(client)
        return { status: 'already_verified' }
      }

      const otpResult = await client.query(
        `SELECT otp_hash, expires_at, attempt_count, consumed_at
         FROM public.registration_email_otps
         WHERE user_id = $1
         FOR UPDATE`,
        [profile.id]
      )
      const otpRow = otpResult.rows[0] as {
        otp_hash: string
        expires_at: Date | string
        attempt_count: number
        consumed_at: Date | string | null
      } | undefined
      if (!otpRow) {
        await this.finishTransaction(client)
        return { status: 'invalid' }
      }
      if (otpRow.attempt_count >= maxAttempts) {
        await this.finishTransaction(client)
        return { status: 'attempts_exhausted' }
      }
      if (otpRow.consumed_at) {
        await this.finishTransaction(client)
        return { status: 'invalid' }
      }
      if (new Date(otpRow.expires_at).getTime() <= new Date(now).getTime()) {
        await client.query(
          `UPDATE public.registration_email_otps SET consumed_at = $2 WHERE user_id = $1`,
          [profile.id, now]
        )
        await this.finishTransaction(client)
        return { status: 'expired' }
      }
      if (!registrationOtpMatches(String(profile.id), otp, otpRow.otp_hash)) {
        const attempts = otpRow.attempt_count + 1
        await client.query(
          `UPDATE public.registration_email_otps
           SET attempt_count = $2,
               consumed_at = CASE WHEN $2 >= $3 THEN $4 ELSE consumed_at END
           WHERE user_id = $1`,
          [profile.id, attempts, maxAttempts, now]
        )
        await this.finishTransaction(client)
        return { status: attempts >= maxAttempts ? 'attempts_exhausted' : 'invalid' }
      }

      await client.query(
        `UPDATE public.registration_email_otps SET consumed_at = $2 WHERE user_id = $1`,
        [profile.id, now]
      )
      const { rows: verifiedRows } = await client.query(
        `UPDATE public.profiles
         SET is_verified = true, status = 'pending', updated_at = $2
         WHERE id = $1 AND is_verified = false
         RETURNING id, email, full_name, nickname, phone_number, role,
                   avatar_url, status, is_verified, created_at, updated_at`,
        [profile.id, now]
      )
      const verifiedProfile = verifiedRows[0] as Record<string, unknown> | undefined
      if (!verifiedProfile) throw new Error('Registration profile could not be verified')
      await this.finishTransaction(client)
      return { status: 'verified', user: mapUser(verifiedProfile) }
    } catch (error) {
      try {
        await client.query('ROLLBACK')
      } catch (rollbackError) {
        throw new AggregateError([error, rollbackError], 'Failed to roll back registration OTP verification')
      }
      throw new Error('Unable to verify registration code', { cause: error })
    } finally {
      client.release()
    }
  }

  async createStudentAccount(
    email: string,
    password: string,
    fullName: string,
    dateOfBirth: string | null,
    phoneNumber: string,
    selectedCourseIds: string[],
    googleDetails?: { phoneNumber: string | null; dateOfBirth: string | null; avatarUrl: string | null; googleId: string }
  ): Promise<UserProfile> {
    const passwordHash = await bcrypt.hash(password, 12)
    const client = await getDatabasePool().connect()
    try {
      await client.query('BEGIN')
      const { rows } = await client.query(
        `INSERT INTO public.profiles
          (id, email, full_name, nickname, phone_number, role, avatar_url,
           status, is_verified, created_at, updated_at)
         VALUES
          (gen_random_uuid(), $1, $2, NULL, $3, 'STUDENT',
           $4, 'pending', false, now(), now())
         RETURNING ${USER_COLUMNS}`,
        [email, fullName, phoneNumber || googleDetails?.phoneNumber || null, googleDetails?.avatarUrl ?? null]
      )
      const row = rows[0] as Record<string, unknown> | undefined
      if (!row) throw new Error('Database did not return the created user profile')
      await client.query(
        `INSERT INTO public.auth_registration_details
          (user_id, date_of_birth, selected_course_ids, google_id)
         VALUES ($1, $2, $3::UUID[], $4)`,
        [row.id, dateOfBirth ?? googleDetails?.dateOfBirth ?? null, selectedCourseIds, googleDetails?.googleId ?? null]
      )
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

  async resolveGoogleIdentity(
    email: string,
    googleSubject: string,
    fullName: string,
    avatarUrl: string | null
  ): Promise<GoogleIdentityResolution> {
    const normalizedEmail = email.trim().toLowerCase()
    const normalizedSubject = googleSubject.trim()
    if (!normalizedEmail || !normalizedSubject) {
      throw new Error('A verified Google email and stable provider subject are required')
    }

    const client = await getDatabasePool().connect()
    try {
      await client.query('BEGIN')
      // Serialize both repeated callbacks and competing Google accounts for the same email.
      await client.query(
        'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
        [`google-subject:${normalizedSubject}`]
      )
      await client.query(
        'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
        [`profile-email:${normalizedEmail}`]
      )

      const linked = await client.query(
        `SELECT ${QUALIFIED_USER_COLUMNS}
         FROM public.auth_identities AS identity
         JOIN public.profiles AS p ON p.id = identity.profile_id
         WHERE identity.provider = 'google' AND identity.provider_subject = $1
         FOR UPDATE OF p`,
        [normalizedSubject]
      )
      const linkedRow = linked.rows[0] as Record<string, unknown> | undefined
      if (linkedRow) {
        const user = mapUser(linkedRow)
        console.info('[Auth] resolveGoogleIdentity: found linked profile', {
          profileId: user.id.slice(0, 8) + '…',
          googleSub: normalizedSubject.slice(0, 8) + '…',
        })
        if (!user.avatar_url?.trim() && avatarUrl) {
          const updated = await client.query(
            `UPDATE public.profiles AS p
             SET avatar_url = $2, updated_at = now()
             WHERE p.id = $1 AND (p.avatar_url IS NULL OR btrim(p.avatar_url) = '')
             RETURNING ${QUALIFIED_USER_COLUMNS}`,
            [user.id, avatarUrl]
          )
          if (updated.rows[0]) {
            await client.query('COMMIT')
            return { status: 'resolved', user: mapUser(updated.rows[0] as Record<string, unknown>) }
          }
        }
        await client.query('COMMIT')
        return { status: 'resolved', user }
      }

      const existing = await client.query(
        `SELECT ${USER_COLUMNS}
         FROM public.profiles
         WHERE lower(email) = $1
         FOR UPDATE`,
        [normalizedEmail]
      )
      const existingRow = existing.rows[0] as Record<string, unknown> | undefined

      if (existingRow) {
        const existingUser = mapUser(existingRow)
        if (existingUser.role === 'ADMIN' && !existingUser.is_verified) {
          await client.query(
            `UPDATE public.profiles SET is_verified = true, updated_at = now() WHERE id = $1`,
            [existingUser.id]
          )
          existingUser.is_verified = true
        }

        // A Google-verified address is only sufficient when the existing profile
        // has independently completed its own email verification.
        if (!existingUser.is_verified) {
          await client.query('COMMIT')
          return { status: 'link_required' }
        }

        const inserted = await client.query(
          `INSERT INTO public.auth_identities
             (provider, provider_subject, profile_id, email_at_link)
           VALUES ('google', $1, $2, $3)
           ON CONFLICT DO NOTHING
           RETURNING provider_subject`,
          [normalizedSubject, existingUser.id, normalizedEmail]
        )
        if (inserted.rowCount !== 1) {
          const subjectOwner = await client.query(
            `SELECT profile_id FROM public.auth_identities
             WHERE provider = 'google' AND provider_subject = $1`,
            [normalizedSubject]
          )
          const profileOwner = await client.query(
            `SELECT provider_subject FROM public.auth_identities
             WHERE provider = 'google' AND profile_id = $1`,
            [existingUser.id]
          )
          const existingSubject = (profileOwner.rows[0] as { provider_subject?: string } | undefined)?.provider_subject
          const sameSubject = subjectOwner.rows[0]?.profile_id === existingUser.id
          const profileAlreadyLinked = profileOwner.rows.length > 0

          // If the profile is linked to a stale development placeholder
          // identity (e.g. "dev-google-email@…"), replace it with the
          // real Google `sub` so the canonical account is reachable.
          if (
            !sameSubject &&
            profileAlreadyLinked &&
            typeof existingSubject === 'string' &&
            existingSubject.startsWith('dev-google-')
          ) {
            await client.query(
              `DELETE FROM public.auth_identities
               WHERE provider = 'google' AND profile_id = $1 AND provider_subject = $2`,
              [existingUser.id, existingSubject]
            )
            await client.query(
              `INSERT INTO public.auth_identities
                 (provider, provider_subject, profile_id, email_at_link)
               VALUES ('google', $1, $2, $3)
               ON CONFLICT (provider, provider_subject) DO NOTHING`,
              [normalizedSubject, existingUser.id, normalizedEmail]
            )
            // Fall through to avatar update and return resolved.
          } else if (!sameSubject || profileAlreadyLinked) {
            await client.query('COMMIT')
            return { status: 'conflict' }
          }
        }

        let resolvedUser = existingUser
        if (!resolvedUser.avatar_url?.trim() && avatarUrl) {
          const updated = await client.query(
            `UPDATE public.profiles AS p
             SET avatar_url = $2, updated_at = now()
             WHERE p.id = $1 AND (p.avatar_url IS NULL OR btrim(p.avatar_url) = '')
             RETURNING ${QUALIFIED_USER_COLUMNS}`,
            [resolvedUser.id, avatarUrl]
          )
          if (updated.rows[0]) resolvedUser = mapUser(updated.rows[0] as Record<string, unknown>)
        }
        await client.query('COMMIT')
        return { status: 'resolved', user: resolvedUser }
      }

      const created = await client.query(
        `INSERT INTO public.profiles
           (id, email, full_name, nickname, phone_number, role, avatar_url,
            status, is_verified, created_at, updated_at)
         VALUES
           (gen_random_uuid(), $1, $2, NULL, NULL, 'STUDENT', $3,
            'pending', true, now(), now())
         RETURNING ${USER_COLUMNS}`,
        [normalizedEmail, fullName.trim() || normalizedEmail.split('@')[0] || 'Learner', avatarUrl]
      )
      const createdRow = created.rows[0] as Record<string, unknown> | undefined
      if (!createdRow) throw new Error('Database did not return the created Google profile')
      const user = mapUser(createdRow)
      await client.query(
        `INSERT INTO public.auth_identities
           (provider, provider_subject, profile_id, email_at_link)
         VALUES ('google', $1, $2, $3)`,
        [normalizedSubject, user.id, normalizedEmail]
      )
      await client.query('COMMIT')
      return { status: 'resolved', user }
    } catch (error) {
      try {
        await client.query('ROLLBACK')
      } catch (rollbackError) {
        throw new AggregateError([error, rollbackError], 'Failed to roll back Google identity resolution')
      }
      throw new Error('Unable to resolve Google identity to a profile', { cause: error })
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

  async updatePasswordAndVerifyEmail(userId: string, password: string): Promise<void> {
    const passwordHash = await bcrypt.hash(password, 12)
    const client = await getDatabasePool().connect()
    try {
      await client.query('BEGIN')
      await client.query(
        `INSERT INTO public.auth_credentials (user_id, password_hash)
         VALUES ($1, $2)
         ON CONFLICT (user_id) DO UPDATE
         SET password_hash = EXCLUDED.password_hash, updated_at = now()`,
        [userId, passwordHash]
      )
      const { rowCount } = await client.query(
        `UPDATE public.profiles
         SET is_verified = true, updated_at = now()
         WHERE id = $1 AND status = 'active'`,
        [userId]
      )
      if (rowCount !== 1) throw new Error('Unable to verify email for the account')
      await this.finishTransaction(client)
    } catch (error) {
      try {
        await client.query('ROLLBACK')
      } catch (rollbackError) {
        throw new AggregateError([error, rollbackError], 'Failed to roll back password recovery')
      }
      throw error
    } finally {
      client.release()
    }
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

  async revokeUserSessions(userId: string): Promise<void> {
    await getDatabasePool().query(
      `UPDATE public.auth_sessions
       SET revoked_at = COALESCE(revoked_at, now())
       WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId]
    )
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const client = await getDatabasePool().connect()
    try {
      await client.query('BEGIN')
      const { rows } = await client.query(
        `SELECT password_hash FROM public.auth_credentials WHERE user_id = $1 FOR UPDATE`,
        [userId]
      )
      const cred = rows[0] as { password_hash?: string } | undefined
      if (!cred?.password_hash) {
        throw new Error('Credentials not found')
      }
      const matches = await bcrypt.compare(currentPassword, cred.password_hash)
      if (!matches) {
        throw new Error('Current password does not match')
      }
      const newHash = await bcrypt.hash(newPassword, 12)
      await client.query(
        `UPDATE public.auth_credentials SET password_hash = $2, updated_at = now() WHERE user_id = $1`,
        [userId, newHash]
      )
      await client.query(
        `UPDATE public.profiles SET status = 'active', is_verified = true, updated_at = now() WHERE id = $1`,
        [userId]
      )
      await client.query('COMMIT')
    } catch (error) {
      try {
        await client.query('ROLLBACK')
      } catch (rollbackError) {
        throw new AggregateError([error, rollbackError], 'Failed to rollback change password transaction')
      }
      throw error
    } finally {
      client.release()
    }
  }
}

export const authRepository = new AuthRepository()
