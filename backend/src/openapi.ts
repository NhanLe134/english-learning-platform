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
  { name: 'Courses', description: 'Public course selection and ADMIN-only course management.' },
  { name: 'User Management', description: 'ADMIN-only user administration endpoints.' },
  { name: 'Payments', description: 'Course payment orders, public status lookup, SSE updates, and SePay webhooks.' },
  { name: 'Payment Management', description: 'ADMIN-only payment order management, reconciliation, and audit.' },
  { name: 'Lessons', description: 'Curriculum topics, lessons, and learning material endpoints.' },
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
    '/api/courses': {
      get: {
        tags: ['Courses'],
        summary: 'Retrieve selected published courses',
        description:
          'Returns course details and teacher information for a comma-separated list of course UUIDs. Unpublished or unknown IDs are reported as missing. Pricing is reserved for the admin course-management API.',
        operationId: 'getSelectedCourses',
        parameters: [
          {
            in: 'query',
            name: 'ids',
            required: true,
            description: 'Comma-separated course UUIDs (maximum 50).',
            schema: { type: 'string', example: 'c0a80101-0000-4000-8000-000000000001,c0a80101-0000-4000-8000-000000000002' },
          },
        ],
        responses: {
          '200': {
            description: 'Selected course details',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Course' },
                    },
                  },
                },
              },
            },
          },
          '400': jsonResponse('Missing or invalid course IDs', {
            $ref: '#/components/schemas/ErrorResponse',
          }),
          '404': jsonResponse('One or more courses are unavailable', {
            $ref: '#/components/schemas/MissingCoursesResponse',
          }),
          '503': jsonResponse('Course catalog is not configured', {
            $ref: '#/components/schemas/ErrorResponse',
          }),
        },
      },
    },
    '/api/courses/catalog': {
      get: {
        tags: ['Courses'],
        summary: 'List published courses for the public course page',
        operationId: 'listPublishedCourses',
        responses: {
          '200': jsonResponse('Published course catalog'),
          '503': jsonResponse('Course catalog is not configured', {
            $ref: '#/components/schemas/ErrorResponse',
          }),
        },
      },
    },
    '/api/courses/my-courses': {
      get: {
        tags: ['Courses'],
        summary: 'List enrolled courses for the authenticated student',
        operationId: 'getMyEnrolledCourses',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': jsonResponse('Enrolled courses list'),
          '401': jsonResponse('Authentication required', {
            $ref: '#/components/schemas/ErrorResponse',
          }),
        },
      },
    },
    '/api/courses/{identifier}': {
      get: {
        tags: ['Courses'],
        summary: 'Get a published course by ID or slug',
        operationId: 'getPublishedCourse',
        parameters: [
          {
            in: 'path',
            name: 'identifier',
            required: true,
            schema: { type: 'string' },
            description: 'Course UUID or URL slug.',
          },
        ],
        responses: {
          '200': jsonResponse('Published course details and curriculum'),
          '400': jsonResponse('Invalid course ID or slug', {
            $ref: '#/components/schemas/ErrorResponse',
          }),
          '404': jsonResponse('Published course not found', {
            $ref: '#/components/schemas/ErrorResponse',
          }),
          '503': jsonResponse('Course catalog is not configured', {
            $ref: '#/components/schemas/ErrorResponse',
          }),
        },
      },
    },
    '/api/courses/admin': {
      get: {
        tags: ['Courses'],
        summary: 'List and filter courses',
        description: 'ADMIN only. Returns a paginated course catalog, including draft and archived courses.',
        operationId: 'listManagedCourses',
        security: adminSecurity,
        parameters: [
          { in: 'query', name: 'search', schema: { type: 'string', maxLength: 100 } },
          { in: 'query', name: 'category', schema: { type: 'string', maxLength: 100 } },
          { in: 'query', name: 'level', schema: { type: 'string', enum: ['all', 'beginner', 'intermediate', 'advanced'], default: 'all' } },
          { in: 'query', name: 'status', schema: { type: 'string', enum: ['all', 'draft', 'published', 'archived'], default: 'all' } },
          { in: 'query', name: 'sort', schema: { type: 'string', enum: ['newest', 'price_asc', 'price_desc'], default: 'newest' } },
          { in: 'query', name: 'page', schema: { type: 'integer', minimum: 1, default: 1 } },
          { in: 'query', name: 'limit', schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 } },
        ],
        responses: {
          '200': jsonResponse('Paginated course catalog', { $ref: '#/components/schemas/ManagedCoursePageResponse' }),
          ...adminResponses,
        },
      },
      post: {
        tags: ['Courses'],
        summary: 'Create a course',
        description: 'ADMIN only. The authenticated administrator is assigned as the course teacher.',
        operationId: 'createManagedCourse',
        security: adminSecurity,
        requestBody: jsonBody('CourseManagementInput'),
        responses: {
          '201': jsonResponse('Course created', { $ref: '#/components/schemas/ManagedCourseResponse' }),
          ...adminResponses,
          '409': jsonResponse('Course slug is already in use', { $ref: '#/components/schemas/ErrorResponse' }),
        },
      },
    },
    '/api/courses/admin/{id}': {
      patch: {
        tags: ['Courses'],
        summary: 'Update a course',
        description: 'ADMIN only.',
        operationId: 'updateManagedCourse',
        security: adminSecurity,
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: jsonBody('CourseManagementInput'),
        responses: {
          '200': jsonResponse('Course updated', { $ref: '#/components/schemas/ManagedCourseResponse' }),
          ...adminResponses,
          '404': jsonResponse('Course not found', { $ref: '#/components/schemas/ErrorResponse' }),
          '409': jsonResponse('Course slug is already in use', { $ref: '#/components/schemas/ErrorResponse' }),
        },
      },
      delete: {
        tags: ['Courses'],
        summary: 'Delete a course',
        description: 'ADMIN only. Deletion may be rejected while related course data exists.',
        operationId: 'deleteManagedCourse',
        security: adminSecurity,
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': jsonResponse('Course deleted'),
          ...adminResponses,
          '404': jsonResponse('Course not found', { $ref: '#/components/schemas/ErrorResponse' }),
          '409': jsonResponse('Course has linked enrollment or content data', { $ref: '#/components/schemas/ErrorResponse' }),
        },
      },
    },
    '/api/courses/admin/{id}/status': {
      patch: {
        tags: ['Courses'],
        summary: 'Publish or draft a course',
        description: 'ADMIN only.',
        operationId: 'updateManagedCourseStatus',
        security: adminSecurity,
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: jsonBody('CourseStatusUpdateRequest'),
        responses: {
          '200': jsonResponse('Course status updated', { $ref: '#/components/schemas/ManagedCourseResponse' }),
          ...adminResponses,
          '404': jsonResponse('Course not found', { $ref: '#/components/schemas/ErrorResponse' }),
        },
      },
    },
    '/api/lessons/lessons/{lessonId}/video-stream-token': {
      post: {
        tags: ['Lessons'],
        summary: 'Issue a short-lived signed stream token for a Google Drive lesson video',
        description:
          'Verifies authentication and course access (enrollment for STUDENT, assignment for TEACHER, or ADMIN), then issues a short-lived HMAC-signed token for HTML5 video Range streaming.',
        operationId: 'createLessonVideoStreamToken',
        security: adminSecurity,
        parameters: [
          { in: 'path', name: 'lessonId', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': jsonResponse('Signed stream token issued'),
          '400': jsonResponse('Invalid lesson ID or lesson is not a Google Drive video', { $ref: '#/components/schemas/ErrorResponse' }),
          '401': jsonResponse('Authentication required', { $ref: '#/components/schemas/ErrorResponse' }),
          '403': jsonResponse('Not enrolled or not assigned to course', { $ref: '#/components/schemas/ErrorResponse' }),
          '404': jsonResponse('Lesson not found', { $ref: '#/components/schemas/ErrorResponse' }),
        },
      },
    },
    '/api/lessons/lessons/{lessonId}/video-stream': {
      get: {
        tags: ['Lessons'],
        summary: 'Stream a Google Drive lesson video with HTTP Range support',
        description:
          'Authenticates via the short-lived signed query token and proxies byte ranges (200/206 Partial Content) from Google Drive so HTML5 <video> can enforce watch tracking and anti-seek controls.',
        operationId: 'streamLessonGoogleDriveVideo',
        parameters: [
          { in: 'path', name: 'lessonId', required: true, schema: { type: 'string', format: 'uuid' } },
          { in: 'query', name: 'token', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Full video stream' },
          '206': { description: 'Partial video byte range' },
          '401': jsonResponse('Invalid or expired stream token', { $ref: '#/components/schemas/ErrorResponse' }),
          '404': jsonResponse('Lesson or Google Drive source not found', { $ref: '#/components/schemas/ErrorResponse' }),
          '502': jsonResponse('Google Drive rejected direct video streaming (private, quota exceeded, or non-video)', { $ref: '#/components/schemas/ErrorResponse' }),
        },
      },
    },
    '/api/lessons/courses/{courseId}/topics': {
      get: {
        tags: ['Lessons'],
        summary: 'Get course curriculum and lessons',
        description:
          'Accessible to ADMIN, TEACHER, and enrolled STUDENTs. Students only receive published lessons. Course ID can be a UUID or course slug.',
        operationId: 'getCourseCurriculum',
        security: adminSecurity,
        parameters: [
          {
            in: 'path',
            name: 'courseId',
            required: true,
            schema: { type: 'string' },
            description: 'Course UUID or URL slug.',
          },
        ],
        responses: {
          '200': jsonResponse('Course topics with ordered lessons and materials'),
          '401': jsonResponse('Unauthorized', { $ref: '#/components/schemas/ErrorResponse' }),
          '403': jsonResponse('Student is not enrolled or active in this course', {
            $ref: '#/components/schemas/ErrorResponse',
          }),
          '404': jsonResponse('Course not found', { $ref: '#/components/schemas/ErrorResponse' }),
        },
      },
    },
    '/api/lessons/lessons/{lessonId}': {
      get: {
        tags: ['Lessons'],
        summary: 'Get lesson details and materials',
        description:
          'Accessible to ADMIN, TEACHER, and enrolled STUDENTs. Students can only access published lessons for courses they are actively enrolled in.',
        operationId: 'getLessonDetails',
        security: adminSecurity,
        parameters: [
          {
            in: 'path',
            name: 'lessonId',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Lesson UUID.',
          },
        ],
        responses: {
          '200': jsonResponse('Lesson details including video URL and learning materials'),
          '401': jsonResponse('Unauthorized', { $ref: '#/components/schemas/ErrorResponse' }),
          '403': jsonResponse('Forbidden - unenrolled student', {
            $ref: '#/components/schemas/ErrorResponse',
          }),
          '404': jsonResponse('Lesson not found or unpublished', {
            $ref: '#/components/schemas/ErrorResponse',
          }),
        },
      },
    },
    '/api/lessons/courses/{courseId}/lessons': {
      post: {
        tags: ['Lessons'],
        summary: 'Create a lesson in a course (no topic)',
        description:
          'ADMIN or assigned TEACHER only. Creates a lesson attached directly to the course (topic_id null). An optional quiz payload saves the lesson quiz in the same request; if quiz creation fails after the lesson insert, the lesson is removed again.',
        operationId: 'createLessonInCourse',
        security: adminSecurity,
        parameters: [
          {
            in: 'path',
            name: 'courseId',
            required: true,
            schema: { type: 'string' },
            description: 'Course UUID or URL slug.',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title', 'video_url'],
                properties: {
                  title: { type: 'string', maxLength: 200 },
                  description: { type: 'string', nullable: true, maxLength: 2000 },
                  video_url: { type: 'string', format: 'uri' },
                  status: { type: 'string', enum: ['draft', 'published'], default: 'draft' },
                  quiz: {
                    type: 'object',
                    nullable: true,
                    description: 'Optional quiz saved together with the lesson.',
                    properties: {
                      title: { type: 'string' },
                      questions: {
                        type: 'array',
                        minItems: 1,
                        items: {
                          type: 'object',
                          required: ['content', 'options', 'correct_index'],
                          properties: {
                            content: { type: 'string' },
                            options: { type: 'array', minItems: 2, items: { type: 'string' } },
                            correct_index: { type: 'integer', minimum: 0 },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': jsonResponse('Created lesson (quiz_saved indicates whether the quiz was saved)'),
          '400': jsonResponse('Validation error', { $ref: '#/components/schemas/ErrorResponse' }),
          '401': jsonResponse('Unauthorized', { $ref: '#/components/schemas/ErrorResponse' }),
          '403': jsonResponse('Teacher not assigned to this course', {
            $ref: '#/components/schemas/ErrorResponse',
          }),
        },
      },
    },
    '/api/lessons/lessons/{lessonId}/progress': {
      put: {
        tags: ['Lessons'],
        summary: 'Update student lesson watch progress',
        description:
          'Updates last_position_seconds, watched progress_percent (capped at 99 until exercise completion), and is_completed (set true only upon passing all exercises; completed lessons preserve completion and 100% progress). Optionally backfills missing duration_seconds.',
        operationId: 'updateLessonProgress',
        security: adminSecurity,
        parameters: [
          {
            in: 'path',
            name: 'lessonId',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Lesson UUID.',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['last_position_seconds'],
                properties: {
                  last_position_seconds: { type: 'number', minimum: 0 },
                  progress_percent: { type: 'number', minimum: 0, maximum: 100 },
                  is_completed: { type: 'boolean' },
                  duration_seconds: { type: 'number', minimum: 0 },
                },
              },
            },
          },
        },
        responses: {
          '200': jsonResponse('Updated lesson progress'),
          '400': jsonResponse('Validation error', { $ref: '#/components/schemas/ErrorResponse' }),
          '401': jsonResponse('Unauthorized', { $ref: '#/components/schemas/ErrorResponse' }),
          '403': jsonResponse('Forbidden', { $ref: '#/components/schemas/ErrorResponse' }),
        },
      },
    },
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
          { in: 'query', name: 'status', schema: { type: 'string', enum: ['ALL', 'active', 'locked', 'pending', 'deactivated'], default: 'ALL' } },
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
    '/api/teachers/admin': {
      get: {
        tags: ['User Management'], summary: 'List teacher accounts', operationId: 'listTeachers', security: adminSecurity,
        parameters: [
          { in: 'query', name: 'search', schema: { type: 'string' } },
          { in: 'query', name: 'status', schema: { type: 'string', enum: ['ALL', 'active', 'locked', 'pending', 'deactivated'] } },
          { in: 'query', name: 'page', schema: { type: 'integer', minimum: 1 } },
          { in: 'query', name: 'limit', schema: { type: 'integer', minimum: 1, maximum: 100 } },
        ],
        responses: { '200': jsonResponse('Paginated teacher profiles'), ...adminResponses },
      },
      post: {
        tags: ['User Management'], summary: 'Create a teacher account with an initial password', operationId: 'createTeacher', security: adminSecurity,
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['full_name', 'email', 'password'], properties: { full_name: { type: 'string', minLength: 1 }, email: { type: 'string', format: 'email' }, password: { type: 'string', minLength: 8, maxLength: 72, format: 'password' }, nickname: { type: 'string' }, phone_number: { type: 'string' }, avatar_url: { type: 'string', format: 'uri' } } } } } },
        responses: { '201': jsonResponse('Active teacher profile'), ...adminResponses },
      },
    },
    '/api/teachers/admin/{id}': {
      get: { tags: ['User Management'], summary: 'Get teacher details', operationId: 'getTeacher', security: adminSecurity, parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { '200': jsonResponse('Teacher profile'), '404': jsonResponse('Teacher not found'), ...adminResponses } },
      patch: { tags: ['User Management'], summary: 'Edit teacher profile', operationId: 'updateTeacher', security: adminSecurity, parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['full_name'], properties: { full_name: { type: 'string' }, nickname: { type: 'string' }, phone_number: { type: 'string' } } } } } }, responses: { '200': jsonResponse('Updated teacher profile'), ...adminResponses } },
    },
    '/api/teachers/admin/{id}/status': {
      patch: { tags: ['User Management'], summary: 'Change teacher account status', operationId: 'updateTeacherStatus', security: adminSecurity, parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['status'], properties: { status: { type: 'string', enum: ['active', 'locked', 'pending', 'deactivated'] } } } } } }, responses: { '200': jsonResponse('Updated teacher status'), ...adminResponses } },
    },
    '/api/teachers/admin/{id}/activation/resend': {
      post: { tags: ['User Management'], summary: 'Resend teacher activation link', operationId: 'resendTeacherActivation', security: adminSecurity, parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { '202': jsonResponse('Activation email queued or sent'), ...adminResponses } },
    },
    '/api/teachers/activation/complete': {
      post: { tags: ['Authentication'], summary: 'Activate a teacher account', operationId: 'activateTeacher', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['token', 'password'], properties: { token: { type: 'string' }, password: { type: 'string', minLength: 8, maxLength: 72 } } } } } }, responses: { '200': jsonResponse('Teacher activated'), ...errorResponses } },
    },
    '/api/teachers/password-reset/request': {
      post: { tags: ['Authentication'], summary: 'Request a teacher password reset link', operationId: 'requestTeacherPasswordReset', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['email'], properties: { email: { type: 'string', format: 'email' } } } } } }, responses: { '200': jsonResponse('Generic response independent of account existence'), ...errorResponses } },
    },
    '/api/teachers/password-reset/complete': {
      post: { tags: ['Authentication'], summary: 'Complete teacher password reset', operationId: 'resetTeacherPassword', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['token', 'password'], properties: { token: { type: 'string' }, password: { type: 'string', minLength: 8, maxLength: 72 } } } } } }, responses: { '200': jsonResponse('Password reset and sessions revoked'), ...errorResponses } },
    },
    '/api/teachers/me': {
      get: { tags: ['Authentication'], summary: 'Get authenticated teacher profile', operationId: 'getTeacherMe', security: [{ bearerAuth: [] }], responses: { '200': jsonResponse('Teacher profile'), ...adminResponses } },
    },
    '/api/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'Register a student account',
        description:
          'Creates a pending, unverified PostgreSQL student profile (is_verified = false, status = pending) or reuses an existing pending student profile with the same email (updating profile details, selectedCourseIds, and password, resetting is_verified = false even if previously verified before payment, and returning 202 with verificationRequired = true and savedRegistration so fresh email OTP verification is required). Rejects registration with 409 when an active verified or non-reusable account already exists. Stores bcrypt password hashes in auth_credentials. The role is always assigned server-side as STUDENT; a client-supplied role is ignored.',
        operationId: 'register',
        requestBody: jsonBody('RegisterRequest'),
        responses: {
          '202': jsonResponse('Account created or pending account reused and awaiting email verification', {
            $ref: '#/components/schemas/RegistrationPendingResponse',
          }),
          '409': jsonResponse('Email is already registered', {
            $ref: '#/components/schemas/ErrorResponse',
          }),
          ...errorResponses,
        },
      },
    },
    '/api/auth/register/verification/resend': {
      post: {
        tags: ['Authentication'],
        summary: 'Send or resend a registration verification code',
        description:
          'When eligible, sends a six-digit, one-time code through the configured Resend integration. Codes expire after 10 minutes, allow five failed attempts, and can be resent once per 60 seconds. The status and body are identical for unknown, verified, cooling-down, and eligible addresses; successful provider acceptance does not confirm inbox receipt. A provider delivery failure invalidates the code and returns 503 unless the explicit development-only AUTH_EXPOSE_REGISTRATION_OTP=true fallback is enabled; then developmentOtp is returned for local testing. The value is never returned in production. Requires the registration OTP migration.',
        operationId: 'resendRegistrationOtp',
        requestBody: jsonBody('RegistrationOtpEmailRequest'),
        responses: {
          '202': jsonResponse('Same generic accepted response for all account states; inbox receipt is not confirmed', {
            $ref: '#/components/schemas/MessageResponse',
          }),
          ...errorResponses,
        },
      },
    },
    '/api/auth/register/verification/verify': {
      post: {
        tags: ['Authentication'],
        summary: 'Verify a registration email',
        description:
          'Consumes a valid, unexpired six-digit code and marks the pending account verified (is_verified = true, status = pending). Verification does not authenticate the user or issue tokens; the student proceeds to checkout and must complete SePay payment activation before logging in. All unsuccessful verification states return the same generic 400 response.',
        operationId: 'verifyRegistrationOtp',
        requestBody: jsonBody('RegistrationOtpVerifyRequest'),
        responses: {
          '200': jsonResponse('Email verified; no authentication tokens issued', {
            $ref: '#/components/schemas/RegistrationVerificationResponse',
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
    '/api/auth/google': {
      get: {
        tags: ['Authentication'],
        summary: 'Start Google OAuth login or signup',
        description:
          'Redirects the browser to Google OAuth. Configure GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and the API callback URL as an authorized redirect URI.',
        operationId: 'startGoogleOAuth',
        responses: {
          '302': { description: 'Redirect to Google authorization' },
          ...errorResponses,
        },
      },
      post: {
        tags: ['Authentication'],
        summary: 'Log in or sign up with a Google token',
        description:
          'Verifies the Google identity and resolves its stable provider subject to one canonical profile. An unlinked existing profile must have independently verified its email before it can be linked; a new Google profile remains pending until payment activates it.',
        operationId: 'loginWithGoogle',
        requestBody: jsonBody('GoogleAuthRequest'),
        responses: {
          '200': jsonResponse('Authenticated; refresh token is set as an HttpOnly cookie', {
            $ref: '#/components/schemas/TokenResponse',
          }),
          ...errorResponses,
        },
      },
    },
    '/api/auth/google/callback': {
      get: {
        tags: ['Authentication'],
        summary: 'Complete Google OAuth login or signup',
        description:
          'Exchanges the authorization code, verifies the Google identity, creates a student profile if needed, issues the login session, and sets HttpOnly session cookies. A short-lived, one-time handoff lets the frontend retrieve the already-issued access token after redirect.',
        operationId: 'completeGoogleOAuth',
        responses: {
          '302': {
            description:
              'Redirect to the frontend after establishing the authenticated session, or back to /login?google_oauth_error=access_denied when Google authorization is cancelled or denied',
          },
          ...errorResponses,
        },
      },
    },
    '/api/auth/google/session': {
      post: {
        tags: ['Authentication'],
        summary: 'Complete Google login session handoff',
        description:
          'Consumes a short-lived, one-time HttpOnly handoff cookie created by the successful Google OAuth callback and returns its existing access token. This endpoint does not issue or rotate tokens.',
        operationId: 'consumeGoogleLoginHandoff',
        responses: {
          '200': jsonResponse('Existing Google login access token and user returned', {
            $ref: '#/components/schemas/TokenResponse',
          }),
          ...errorResponses,
        },
      },
    },
    '/api/auth/google/identity': {
      post: {
        tags: ['Authentication'],
        summary: 'Verify Google identity for registration form prefilling',
        description:
          'Verifies the Google token and returns the verified email, display name, and avatar URL. It does not create an account or issue an application session.',
        operationId: 'getGoogleIdentity',
        requestBody: jsonBody('GoogleAuthRequest'),
        responses: {
          '200': jsonResponse('Verified Google profile details', {
            $ref: '#/components/schemas/GoogleIdentityResponse',
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
          'Only an explicit refresh request may rotate an existing session. The endpoint verifies the presented HttpOnly refresh cookie, its expiration, and active server-side session before rotating the cookie and returning a new access token. Reuse of an old refresh token revokes the session. This is session renewal, not login.',
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
        summary: 'Request a temporary password',
        description:
          'Validates the account email, generates a cryptographically secure temporary password, and emails it through Resend. Admin accounts are updated through Supabase Auth; PostgreSQL-authenticated accounts receive an updated bcrypt hash. Active sessions are revoked. The response is generic and never includes the password.',
        operationId: 'forgotPassword',
        requestBody: jsonBody('ForgotPasswordRequest'),
        responses: {
          '200': jsonResponse('Generic response; the temporary password is sent only by email', {
            $ref: '#/components/schemas/ForgotPasswordResponse',
          }),
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
    '/api/payment/orders': {
      post: {
        tags: ['Payments'],
        summary: 'Create or reuse a pending course payment order for the signed-in user',
        operationId: 'createPaymentOrder',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['courseId'],
                properties: {
                  courseId: { type: 'string', format: 'uuid' },
                },
              },
            },
          },
        },
        responses: {
          '201': jsonResponse('Pending order created or reused with SePay checkout payload'),
          '404': jsonResponse('Course or student profile not found', { $ref: '#/components/schemas/ErrorResponse' }),
          '409': jsonResponse('Student is already enrolled in this course', { $ref: '#/components/schemas/ErrorResponse' }),
          '422': jsonResponse('Course pricing is invalid', { $ref: '#/components/schemas/ErrorResponse' }),
          ...errorResponses,
        },
      },
    },
    '/api/payment/orders/guest': {
      post: {
        tags: ['Payments'],
        summary: 'Create or reuse a pending course order for a verified pre-login STUDENT email',
        description: 'Validates against PostgreSQL/Supabase that email belongs to an email-verified STUDENT account (status pending or active) without trusting client sessionStorage. Enforces trusted Origin and rate limits.',
        operationId: 'createGuestPaymentOrder',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['courseId', 'email'],
                properties: {
                  courseId: { type: 'string', format: 'uuid' },
                  email: { type: 'string', format: 'email' },
                },
              },
            },
          },
        },
        responses: {
          ...errorResponses,
          '201': jsonResponse('Pending order created or reused with SePay checkout payload'),
          '403': jsonResponse('Email is not verified or Origin is not allowed', { $ref: '#/components/schemas/ErrorResponse' }),
          '404': jsonResponse('Course or student profile not found', { $ref: '#/components/schemas/ErrorResponse' }),
          '409': jsonResponse('Student is already enrolled in this course', { $ref: '#/components/schemas/ErrorResponse' }),
          '422': jsonResponse('Course pricing is invalid', { $ref: '#/components/schemas/ErrorResponse' }),
        },
      },
    },
    '/api/payment/orders/{orderId}': {
      get: {
        tags: ['Payments'],
        summary: 'Get authenticated student order status and course details',
        operationId: 'getPaymentOrderStatus',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'orderId', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          ...errorResponses,
          '200': jsonResponse('Order status payload (pending orders include paymentInformation when SePay bank details are configured)'),
          '403': jsonResponse('Order belongs to another user', { $ref: '#/components/schemas/ErrorResponse' }),
          '404': jsonResponse('Order not found', { $ref: '#/components/schemas/ErrorResponse' }),
        },
      },
    },
    '/api/payment/orders/{orderId}/public': {
      get: {
        tags: ['Payments'],
        summary: 'Get public order status for pre-login checkout/success polling',
        operationId: 'getPublicPaymentOrderStatus',
        parameters: [{ in: 'path', name: 'orderId', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          ...errorResponses,
          '200': jsonResponse('Public order status payload (pending orders include paymentInformation when SePay bank details are configured)'),
          '404': jsonResponse('Order not found', { $ref: '#/components/schemas/ErrorResponse' }),
        },
      },
    },
    '/api/payment/orders/{orderId}/events': {
      get: {
        tags: ['Payments'],
        summary: 'Subscribe to Server-Sent Events for authenticated student order status changes',
        operationId: 'streamPaymentOrderStatus',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'orderId', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          ...errorResponses,
          '200': { description: 'SSE event stream for order status updates' },
        },
      },
    },
    '/api/payment/sepay-webhook': {
      post: {
        tags: ['Payments'],
        summary: 'SePay Hosted Gateway IPN webhook',
        description: 'Authenticated via X-Secret-Key header. Atomically confirms payment, activates the student profile (status = active), and upserts course enrollment via confirm_course_order_payment RPC.',
        operationId: 'sepayWebhook',
        responses: {
          ...errorResponses,
          '200': jsonResponse('Webhook acknowledged'),
          '401': jsonResponse('Invalid X-Secret-Key', { $ref: '#/components/schemas/ErrorResponse' }),
          '404': jsonResponse('Order not found', { $ref: '#/components/schemas/ErrorResponse' }),
          '422': jsonResponse('Invalid payment state, currency, or amount', { $ref: '#/components/schemas/ErrorResponse' }),
        },
      },
    },
    '/api/payment/sepay-bank-webhook': {
      post: {
        tags: ['Payments'],
        summary: 'SePay Direct Bank Transfer VietQR webhook',
        description: 'Authenticated via X-SePay-Timestamp and X-SePay-Signature HMAC-SHA256 over raw body. Correlates orders strictly via persisted provider_order_id (e.g. PAY...) or transfer_content (DH{orderId}), atomically confirms payment, activates the student profile (status = active), and upserts course enrollment.',
        operationId: 'sepayBankWebhook',
        responses: {
          ...errorResponses,
          '200': jsonResponse('Bank transfer notification processed'),
          '401': jsonResponse('Invalid SePay HMAC signature or stale timestamp', { $ref: '#/components/schemas/ErrorResponse' }),
          '404': jsonResponse('Order not found', { $ref: '#/components/schemas/ErrorResponse' }),
          '409': jsonResponse('Ambiguous order match or bank transaction conflict', { $ref: '#/components/schemas/ErrorResponse' }),
          '422': jsonResponse('Invalid account, amount, reference, or transfer direction', { $ref: '#/components/schemas/ErrorResponse' }),
        },
      },
    },
    '/api/payment/admin/orders': {
      get: {
        tags: ['Payment Management'],
        summary: 'List payment orders with filters',
        description: 'ADMIN only. Returns paginated course orders with student, course, and enrollment details.',
        operationId: 'listAdminPaymentOrders',
        security: adminSecurity,
        parameters: [
          { in: 'query', name: 'search', schema: { type: 'string' }, description: 'Search student name, email, course title, or transfer content.' },
          { in: 'query', name: 'status', schema: { type: 'string', enum: ['ALL', 'pending', 'paid', 'failed', 'expired', 'cancelled'], default: 'ALL' } },
          { in: 'query', name: 'enrollment', schema: { type: 'string', enum: ['ALL', 'has_enrollment', 'missing_enrollment'], default: 'ALL' } },
          { in: 'query', name: 'dateFrom', schema: { type: 'string', format: 'date-time' } },
          { in: 'query', name: 'dateTo', schema: { type: 'string', format: 'date-time' } },
          { in: 'query', name: 'page', schema: { type: 'integer', minimum: 1, default: 1 } },
          { in: 'query', name: 'limit', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
          { in: 'query', name: 'sortBy', schema: { type: 'string', enum: ['created_at', 'paid_at', 'amount', 'student_name', 'course_title'], default: 'created_at' } },
          { in: 'query', name: 'sortOrder', schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' } },
        ],
        responses: {
          '200': jsonResponse('Paginated payment orders', { $ref: '#/components/schemas/PaginatedAdminPaymentOrdersResponse' }),
          ...adminResponses,
        },
      },
    },
    '/api/payment/admin/orders/{orderId}': {
      get: {
        tags: ['Payment Management'],
        summary: 'Get payment order detail',
        description: 'ADMIN only. Returns a single order with full student, course, and enrollment information.',
        operationId: 'getAdminPaymentOrderDetail',
        security: adminSecurity,
        parameters: [{ in: 'path', name: 'orderId', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': jsonResponse('Payment order detail', { $ref: '#/components/schemas/AdminPaymentOrderResponse' }),
          '404': jsonResponse('Order not found', { $ref: '#/components/schemas/ErrorResponse' }),
          ...adminResponses,
        },
      },
      post: {
        tags: ['Payment Management'],
        summary: 'Reconcile enrollment for a paid order',
        description: 'ADMIN only. If the order is paid but has no enrollment, creates the enrollment and activates the student profile. Does not re-verify the payment with SePay.',
        operationId: 'reconcileAdminPaymentOrder',
        security: adminSecurity,
        parameters: [{ in: 'path', name: 'orderId', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': jsonResponse('Reconciliation result', { $ref: '#/components/schemas/ReconcileOrderResponse' }),
          '404': jsonResponse('Order not found', { $ref: '#/components/schemas/ErrorResponse' }),
          ...adminResponses,
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
        description: 'Use the accessToken returned by successful login or explicit refresh.',
      },
      refreshCookie: {
        type: 'apiKey',
        in: 'cookie',
        name: 'english_learning_platform_refresh',
        description:
          'Set automatically by the API as an HttpOnly cookie after login or successful email verification; browser requests must include credentials.',
      },
    },
    schemas: {
      Course: {
        type: 'object',
        required: ['id', 'title', 'status'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
          description: { type: 'string', nullable: true },
          thumbnail_url: { type: 'string', format: 'uri', nullable: true },
          status: { type: 'string' },
          teacher: {
            type: 'object',
            nullable: true,
            properties: {
              id: { type: 'string', format: 'uuid' },
              full_name: { type: 'string' },
              avatar_url: { type: 'string', format: 'uri', nullable: true },
            },
          },
          ManagedCourse: {
            type: 'object',
            required: [
              'id', 'title', 'slug', 'category', 'level', 'target_audience', 'price',
              'total_lessons', 'status', 'teacher_id', 'created_at', 'updated_at',
            ],
            properties: {
              id: { type: 'string', format: 'uuid' },
              title: { type: 'string', maxLength: 200 },
              slug: { type: 'string', maxLength: 180 },
              description: { type: 'string', nullable: true },
              category: { type: 'string', maxLength: 100 },
              level: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] },
              target_audience: { type: 'string', maxLength: 500 },
              price: { type: 'number', minimum: 0 },
              discounted_price: { type: 'number', minimum: 0, nullable: true },
              total_lessons: { type: 'integer', minimum: 0 },
              thumbnail_url: { type: 'string', format: 'uri', nullable: true },
              status: { type: 'string', enum: ['draft', 'published', 'archived'] },
              teacher_id: { type: 'string', format: 'uuid' },
              created_at: { type: 'string', format: 'date-time' },
              updated_at: { type: 'string', format: 'date-time' },
            },
          },
          ManagedCourseResponse: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: { $ref: '#/components/schemas/ManagedCourse' },
            },
          },
          ManagedCoursePageResponse: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: { type: 'array', items: { $ref: '#/components/schemas/ManagedCourse' } },
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
          CourseManagementInput: {
            type: 'object',
            required: [
              'title', 'slug', 'category', 'level', 'target_audience', 'price',
              'total_lessons', 'status',
            ],
            properties: {
              title: { type: 'string', minLength: 1, maxLength: 200 },
              slug: { type: 'string', pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$', maxLength: 180 },
              description: { type: 'string', nullable: true },
              category: { type: 'string', minLength: 1, maxLength: 100 },
              level: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] },
              target_audience: { type: 'string', minLength: 1, maxLength: 500 },
              price: { type: 'number', minimum: 0, maximum: 99999999 },
              discounted_price: { type: 'number', minimum: 0, nullable: true },
              total_lessons: { type: 'integer', minimum: 0, maximum: 100000 },
              thumbnail_url: { type: 'string', format: 'uri', nullable: true },
              status: { type: 'string', enum: ['published', 'archived'] },
              teacher_ids: {
                type: 'array',
                items: { type: 'string', format: 'uuid' },
                description: 'Danh sách ID profile vai trò TEACHER được phân công phụ trách khóa học (1..n). Bỏ trống trường này khi cập nhật thì giữ nguyên phân công cũ; khi tạo mới nếu bỏ trống thì gán tài khoản admin tạo khóa.',
              },
            },
          },
          CourseStatusUpdateRequest: {
            type: 'object',
            required: ['status'],
            properties: { status: { type: 'string', enum: ['published', 'archived'] } },
          },
        },
      },
      MissingCoursesResponse: {
        type: 'object',
        required: ['success', 'message', 'missingIds'],
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string' },
          missingIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
        },
      },
      RegisterRequest: {
        type: 'object',
        required: ['fullName', 'dateOfBirth', 'email', 'phoneNumber', 'password', 'confirmPassword'],
        properties: {
          fullName: { type: 'string', minLength: 1, maxLength: 120, example: 'Nguyễn Minh Anh' },
          dateOfBirth: { type: 'string', format: 'date', example: '2000-01-15' },
          email: { type: 'string', format: 'email', maxLength: 254, example: 'learner@example.com' },
          phoneNumber: {
            type: 'string',
            maxLength: 32,
            pattern: '^\\+?[0-9\\s().-]+$',
            description: 'Phone number containing 10 or 11 digits.',
            example: '+84 912 345 678',
          },
          googleAccessToken: {
            type: 'string',
            description: 'Optional short-lived Google token for registration only. The server validates it and retrieves allowed People API fields.',
          },
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
          selectedCourseIds: {
            type: 'array',
            maxItems: 50,
            uniqueItems: true,
            items: { type: 'string', format: 'uuid' },
            description: 'Optional. Every ID must refer to a published course. IDs are stored in the private pending registration details and do not enroll the user.',
          },
        },
      },
      RegistrationPendingResponse: {
        type: 'object',
        required: ['success', 'message', 'data'],
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string' },
          data: {
            type: 'object',
            required: ['verificationRequired', 'email', 'selectedCourseIds'],
            properties: {
              verificationRequired: { type: 'boolean' },
              email: { type: 'string', format: 'email' },
              selectedCourseIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
              reusedExistingAccount: { type: 'boolean' },
              savedRegistration: {
                type: 'object',
                properties: {
                  fullName: { type: 'string' },
                  dateOfBirth: { type: 'string', format: 'date', nullable: true },
                  phoneNumber: { type: 'string', nullable: true },
                  selectedCourseIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
                },
              },
            },
          },
        },
      },
      RegistrationOtpEmailRequest: {
        type: 'object',
        required: ['email'],
        properties: {
          email: {
            type: 'string',
            format: 'email',
            maxLength: 254,
            example: 'learner@example.com',
          },
        },
      },
      RegistrationOtpVerifyRequest: {
        type: 'object',
        required: ['email', 'otp'],
        properties: {
          email: {
            type: 'string',
            format: 'email',
            maxLength: 254,
            example: 'learner@example.com',
          },
          otp: { type: 'string', pattern: '^\\d{6}$', example: '042615' },
        },
      },
      MessageResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string' },
          developmentOtp: {
            type: 'string',
            pattern: '^\\d{6}$',
            description: 'Included only when NODE_ENV=development and AUTH_EXPOSE_REGISTRATION_OTP=true.',
          },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'learner@example.com' },
          password: { type: 'string', format: 'password', example: 'your-account-password' },
          rememberMe: {
            type: 'boolean',
            description: 'When true, keeps the refresh cookie for seven days; otherwise it lasts for the browser session.',
            default: true,
          },
        },
      },
      GoogleAuthRequest: {
        type: 'object',
        description: 'Provide one valid Google or Supabase token accepted by the selected flow.',
        properties: {
          credential: { type: 'string', description: 'Google Identity Services credential.' },
          idToken: { type: 'string', description: 'Google ID token.' },
          accessToken: { type: 'string', description: 'Google OAuth access token.' },
          supabaseToken: { type: 'string', description: 'Supabase access token issued by Google OAuth.' },
        },
        anyOf: [
          { required: ['credential'] },
          { required: ['idToken'] },
          { required: ['accessToken'] },
          { required: ['supabaseToken'] },
        ],
      },
      GoogleIdentityResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            required: ['email', 'fullName', 'avatarUrl', 'phoneNumber', 'dateOfBirth'],
            properties: {
              email: { type: 'string', format: 'email' },
              fullName: { type: 'string' },
              avatarUrl: { type: 'string', format: 'uri', nullable: true },
              phoneNumber: { type: 'string', nullable: true },
              dateOfBirth: { type: 'string', format: 'date', nullable: true },
            },
          },
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
      PublicUser: {
        type: 'object',
        required: [
          'id', 'email', 'full_name', 'nickname', 'phone_number', 'avatar_url',
          'role', 'status', 'is_verified',
        ],
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          full_name: { type: 'string' },
          nickname: { type: 'string', nullable: true },
          phone_number: { type: 'string', nullable: true },
          avatar_url: { type: 'string', nullable: true },
          role: { type: 'string', enum: ['STUDENT', 'TEACHER', 'ADMIN'] },
          status: { type: 'string', enum: ['active', 'locked', 'pending', 'deactivated'] },
          is_verified: { type: 'boolean' },
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
      RegistrationVerificationResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: { verified: { type: 'boolean', example: true } },
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
      AdminPaymentOrder: {
        type: 'object',
        required: ['orderId', 'studentId', 'studentName', 'studentEmail', 'courseId', 'courseTitle', 'amount', 'currency', 'status', 'transferContent', 'createdAt', 'enrollmentStatus', 'needsAttention'],
        properties: {
          orderId: { type: 'string', format: 'uuid' },
          studentId: { type: 'string', format: 'uuid' },
          studentName: { type: 'string' },
          studentEmail: { type: 'string', format: 'email' },
          studentPhone: { type: 'string', nullable: true },
          courseId: { type: 'string', format: 'uuid' },
          courseTitle: { type: 'string' },
          courseSlug: { type: 'string', nullable: true },
          amount: { type: 'number' },
          currency: { type: 'string' },
          status: { type: 'string', enum: ['pending', 'paid', 'failed', 'expired', 'cancelled'] },
          transferContent: { type: 'string' },
          providerTransactionId: { type: 'string', nullable: true },
          providerOrderId: { type: 'string', nullable: true },
          paidAt: { type: 'string', format: 'date-time', nullable: true },
          expiredAt: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          enrollmentStatus: { type: 'string', enum: ['active', 'completed', 'cancelled'], nullable: true },
          enrollmentId: { type: 'string', format: 'uuid', nullable: true },
          needsAttention: { type: 'boolean' },
        },
      },
      PaginatedAdminPaymentOrdersResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: { type: 'array', items: { $ref: '#/components/schemas/AdminPaymentOrder' } },
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
      AdminPaymentOrderResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: { $ref: '#/components/schemas/AdminPaymentOrder' },
        },
      },
      ReconcileOrderResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string' },
          data: {
            type: 'object',
            properties: {
              orderId: { type: 'string', format: 'uuid' },
              status: { type: 'string' },
              enrollmentCreated: { type: 'boolean' },
              enrollmentId: { type: 'string', format: 'uuid', nullable: true },
              enrollmentStatus: { type: 'string', nullable: true },
            },
          },
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
          message: { type: 'string', example: 'If the account is registered, password recovery instructions have been sent to the email.' },
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
