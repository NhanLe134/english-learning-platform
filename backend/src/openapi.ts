import { env } from './config/env.js'

const jsonResponse = (description: string, schema = { $ref: '#/components/schemas/ApiResponse' }) => ({
  description,
  content: { 'application/json': { schema } },
})

const errorResponses = {
  '400': jsonResponse('Invalid request or validation failure', {
    $ref: '#/components/schemas/ErrorResponse',
  }),
  '401': jsonResponse('Missing, invalid, expired, or revoked credentials', {
    $ref: '#/components/schemas/ErrorResponse',
  }),
  '403': jsonResponse('Request Origin is not allowed', {
    $ref: '#/components/schemas/ErrorResponse',
  }),
  '413': jsonResponse('Request body exceeds the configured size limit', {
    $ref: '#/components/schemas/ErrorResponse',
  }),
  '429': jsonResponse('Rate limit exceeded', {
    $ref: '#/components/schemas/ErrorResponse',
  }),
  '503': jsonResponse('Authentication service, configuration, or session storage is unavailable', {
    $ref: '#/components/schemas/ErrorResponse',
  }),
  '500': jsonResponse('Unexpected server error', {
    $ref: '#/components/schemas/ErrorResponse',
  }),
}

const jsonBody = (schema: string) => ({
  required: true,
  content: {
    'application/json': {
      schema: { $ref: `#/components/schemas/${schema}` },
    },
  },
})

const tags = [
  { name: 'Authentication' },
  { name: 'User Management', description: 'ADMIN-only user administration endpoints.' },
]

const adminSecurity = [{ bearerAuth: [] }]
const adminResponses = {
  ...errorResponses,
  '403': jsonResponse('Authenticated user does not have the ADMIN role', {
    $ref: '#/components/schemas/ErrorResponse',
  }),
}

export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'English Learning Platform API',
    version: '1.0.0',
    description:
      'Interactive documentation for the English Learning Platform authentication endpoints. POST requests require an Origin matching FRONTEND_URL or API_ORIGIN. The refresh token is an HttpOnly cookie and cannot be read by JavaScript.',
  },
  servers: [{ url: new URL(env.apiOrigin).origin, description: 'Configured API origin' }],
  tags,
  paths: {
    '/api/users': {
      get: {
        tags: ['User Management'],
        summary: 'List and search users',
        description: 'ADMIN only. Returns a paginated profile list. Does not return password hashes.',
        operationId: 'listUsers',
        security: adminSecurity,
        parameters: [
          { in: 'query', name: 'search', schema: { type: 'string' }, description: 'Search name, email, phone number, or nickname.' },
          { in: 'query', name: 'role', schema: { type: 'string', enum: ['ALL', 'STUDENT', 'TEACHER', 'ADMIN'], default: 'ALL' } },
          { in: 'query', name: 'status', schema: { type: 'string', enum: ['ALL', 'active', 'locked', 'pending'], default: 'ALL' } },
          { in: 'query', name: 'page', schema: { type: 'integer', minimum: 1, default: 1 } },
          { in: 'query', name: 'limit', schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 } },
        ],
        responses: {
          '200': jsonResponse('Paginated user profiles', { $ref: '#/components/schemas/UserListResponse' }),
          ...adminResponses,
        },
      },
      post: {
        tags: ['User Management'],
        summary: 'Create a teacher or admin account',
        description: 'ADMIN only. Creates a user through the configured Supabase Auth provider. Password must be at least 8 characters and no more than 72 UTF-8 bytes.',
        operationId: 'createManagedUser',
        security: adminSecurity,
        requestBody: jsonBody('CreateManagedUserRequest'),
        responses: {
          '201': jsonResponse('User created', { $ref: '#/components/schemas/UserResponse' }),
          ...adminResponses,
        },
      },
    },
    '/api/users/export': {
      get: {
        tags: ['User Management'],
        summary: 'Export users as CSV',
        description: 'ADMIN only. Exports up to 10,000 matching profiles.',
        operationId: 'exportUsersCsv',
        security: adminSecurity,
        parameters: [
          { in: 'query', name: 'search', schema: { type: 'string' } },
          { in: 'query', name: 'role', schema: { type: 'string', enum: ['ALL', 'STUDENT', 'TEACHER', 'ADMIN'] } },
          { in: 'query', name: 'status', schema: { type: 'string', enum: ['ALL', 'active', 'locked', 'pending'] } },
        ],
        responses: {
          '200': {
            description: 'CSV file',
            content: { 'text/csv': { schema: { type: 'string' } } },
          },
          ...adminResponses,
        },
      },
    },
    '/api/users/seed': {
      post: {
        tags: ['User Management'],
        summary: 'Seed sample users',
        description: 'ADMIN only. Seeds sample data only if the users table is empty.',
        operationId: 'seedUsers',
        security: adminSecurity,
        responses: {
          '200': jsonResponse('Seed result', { $ref: '#/components/schemas/SeedUsersResponse' }),
          ...adminResponses,
        },
      },
    },
    '/api/users/{id}/status': {
      patch: {
        tags: ['User Management'],
        summary: 'Update a user status',
        description: 'ADMIN only. Set status to active, locked, or pending.',
        operationId: 'updateUserStatus',
        security: adminSecurity,
        parameters: [
          { in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: jsonBody('UpdateUserStatusRequest'),
        responses: {
          '200': jsonResponse('User status updated', { $ref: '#/components/schemas/UserResponse' }),
          ...adminResponses,
        },
      },
    },
    '/api/users/{id}': {
      delete: {
        tags: ['User Management'],
        summary: 'Delete a user',
        description: 'ADMIN only. Permanently deletes the user profile.',
        operationId: 'deleteUser',
        security: adminSecurity,
        parameters: [
          { in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': jsonResponse('User deleted'),
          ...adminResponses,
        },
      },
    },
    '/api/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'Register a student account',
        description:
          'Creates a PostgreSQL profile and stores its bcrypt password hash in the private auth_credentials table. The role is always assigned server-side as STUDENT; a client-supplied role is ignored. Requires the database auth migration.',
        operationId: 'register',
        requestBody: jsonBody('RegisterRequest'),
        responses: {
          '201': jsonResponse('Account created; refresh token is set as an HttpOnly cookie', {
            $ref: '#/components/schemas/TokenResponse',
          }),
          '409': jsonResponse('Email is already registered', {
            $ref: '#/components/schemas/ErrorResponse',
          }),
          ...errorResponses,
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Log in',
        operationId: 'login',
        requestBody: jsonBody('LoginRequest'),
        responses: {
          '200': jsonResponse('Authenticated; refresh token is set as an HttpOnly cookie', {
            $ref: '#/components/schemas/TokenResponse',
          }),
          ...errorResponses,
        },
      },
    },
    '/api/auth/refresh': {
      post: {
        tags: ['Authentication'],
        summary: 'Rotate the refresh token',
        description:
          'Verifies the HMAC-SHA256-signed seven-day token expiration and active server-side session before rotating the HttpOnly refresh cookie and returning a new access token. Reuse of an old refresh token revokes the session.',
        operationId: 'refresh',
        security: [{ refreshCookie: [] }],
        responses: {
          '200': jsonResponse('Refresh token rotated; new cookie and access token issued', {
            $ref: '#/components/schemas/TokenResponse',
          }),
          ...errorResponses,
        },
      },
    },
    '/api/auth/logout': {
      post: {
        tags: ['Authentication'],
        summary: 'Log out the current session',
        description:
          'Revokes the associated session immediately and clears the refresh cookie. If the access token has expired, the current refresh cookie can be used instead.',
        operationId: 'logout',
        security: [{ bearerAuth: [] }, { refreshCookie: [] }],
        responses: {
          '204': { description: 'Session revoked and refresh cookie cleared' },
          ...errorResponses,
        },
      },
    },
    '/api/auth/forgot-password': {
      post: {
        tags: ['Authentication'],
        summary: 'Request a password reset',
        description:
          'Always returns the same generic message to avoid revealing whether an account exists. Eligible users receive a Resend email with a 10-minute reset link. For local testing only, AUTH_EXPOSE_RESET_LINK=true in development adds resetUrl to the response; it is never exposed in production.',
        operationId: 'forgotPassword',
        requestBody: jsonBody('ForgotPasswordRequest'),
        responses: {
          '200': jsonResponse('Generic response; resetUrl is only included when explicitly enabled in development', {
            $ref: '#/components/schemas/ForgotPasswordResponse',
          }),
          ...errorResponses,
        },
      },
    },
    '/api/auth/reset-password': {
      post: {
        tags: ['Authentication'],
        summary: 'Reset a password',
        description:
          'Consumes the reset token once, updates the PostgreSQL password hash, and revokes every active application session.',
        operationId: 'resetPassword',
        requestBody: jsonBody('ResetPasswordRequest'),
        responses: {
          '204': { description: 'Password changed and active sessions revoked' },
          ...errorResponses,
        },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Authentication'],
        summary: 'Get the current user',
        operationId: 'currentUser',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': jsonResponse('Public user fields only', {
            $ref: '#/components/schemas/CurrentUserResponse',
          }),
          ...errorResponses,
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Use the accessToken returned by register, login, or refresh.',
      },
      refreshCookie: {
        type: 'apiKey',
        in: 'cookie',
        name: 'english_learning_platform_refresh',
        description:
          'Set automatically by the API as an HttpOnly cookie after login or registration; browser requests must include credentials.',
      },
    },
    schemas: {
      RegisterRequest: {
        type: 'object',
        required: ['email', 'password', 'confirmPassword'],
        properties: {
          email: { type: 'string', format: 'email', maxLength: 254, example: 'learner@example.com' },
          password: {
            type: 'string',
            minLength: 8,
            maxLength: 72,
            description: 'At least 8 characters and no more than 72 UTF-8 bytes.',
            example: 'a-long-example-password',
          },
          confirmPassword: {
            type: 'string',
            minLength: 8,
            maxLength: 72,
            description: 'Must match password.',
            example: 'a-long-example-password',
          },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'learner@example.com' },
          password: { type: 'string', format: 'password', example: 'your-account-password' },
        },
      },
      ForgotPasswordRequest: {
        type: 'object',
        required: ['email'],
        properties: {
          email: { type: 'string', format: 'email', example: 'learner@example.com' },
        },
      },
      UserProfile: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          full_name: { type: 'string' },
          nickname: { type: 'string', nullable: true },
          phone_number: { type: 'string', nullable: true },
          role: { type: 'string', enum: ['STUDENT', 'TEACHER', 'ADMIN'] },
          avatar_url: { type: 'string', nullable: true },
          status: { type: 'string', enum: ['active', 'locked', 'pending'] },
          is_verified: { type: 'boolean' },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
        },
      },
      UserResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string' },
          data: { $ref: '#/components/schemas/UserProfile' },
        },
      },
      UserListResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: { type: 'array', items: { $ref: '#/components/schemas/UserProfile' } },
          pagination: {
            type: 'object',
            properties: {
              page: { type: 'integer' },
              limit: { type: 'integer' },
              total: { type: 'integer' },
              totalPages: { type: 'integer' },
            },
          },
        },
      },
      CreateManagedUserRequest: {
        type: 'object',
        required: ['full_name', 'email', 'role', 'password'],
        properties: {
          full_name: { type: 'string', minLength: 1 },
          nickname: { type: 'string' },
          email: { type: 'string', format: 'email' },
          phone_number: { type: 'string' },
          role: { type: 'string', enum: ['TEACHER', 'ADMIN'] },
          password: { type: 'string', minLength: 8, maxLength: 72, format: 'password' },
          avatar_url: { type: 'string', format: 'uri' },
        },
      },
      UpdateUserStatusRequest: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { type: 'string', enum: ['active', 'locked', 'pending'] },
        },
      },
      SeedUsersResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string' },
          data: {
            type: 'object',
            properties: {
              inserted: { type: 'integer' },
              message: { type: 'string' },
            },
          },
        },
      },
      ResetPasswordRequest: {
        type: 'object',
        required: ['token', 'newPassword', 'confirmPassword'],
        properties: {
          token: { type: 'string', description: 'Token from the reset email link.' },
          newPassword: {
            type: 'string',
            minLength: 8,
            maxLength: 72,
            format: 'password',
            description: 'At least 8 characters and no more than 72 UTF-8 bytes.',
          },
          confirmPassword: {
            type: 'string',
            minLength: 8,
            maxLength: 72,
            format: 'password',
            description: 'Must match newPassword.',
          },
        },
      },
      PublicUser: {
        type: 'object',
        required: ['id', 'email', 'role'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          role: { type: 'string', enum: ['STUDENT', 'TEACHER', 'ADMIN'] },
        },
      },
      TokenResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              accessToken: { type: 'string', description: '30-minute bearer access JWT.' },
              user: { $ref: '#/components/schemas/PublicUser' },
            },
          },
        },
      },
      CurrentUserResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: { $ref: '#/components/schemas/PublicUser' },
        },
      },
      ApiResponse: {
        type: 'object',
        properties: { success: { type: 'boolean' }, message: { type: 'string' } },
      },
      ForgotPasswordResponse: {
        type: 'object',
        required: ['success', 'message'],
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'If an account exists for that address, a reset link will be sent.' },
          resetUrl: {
            type: 'string',
            format: 'uri',
            description: 'Only present in development when AUTH_EXPOSE_RESET_LINK=true. Never returned in production.',
          },
        },
      },
      ErrorResponse: {
        type: 'object',
        required: ['message'],
        properties: { message: { type: 'string' } },
      },
    },
  },
} as const
