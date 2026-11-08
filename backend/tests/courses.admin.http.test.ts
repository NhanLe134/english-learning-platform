import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { once } from 'node:events'
import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'
import { after, before, describe, it } from 'node:test'
import { app } from '../src/app.js'
import { AuthError } from '../src/modules/auth/auth.errors.js'
import { authService } from '../src/modules/auth/auth.service.js'
import { courseRepository } from '../src/modules/courses/course.repository.js'
import type {
  CourseListFilters,
  ManagedCourse,
  ManagedCourseInput,
} from '../src/modules/courses/course.types.js'
import type { UserProfile } from '../src/modules/users/users.types.js'

const adminId = randomUUID()
const courseId = randomUUID()
const admin: UserProfile = {
  id: adminId,
  email: 'course-admin@example.test',
  full_name: 'Course Admin',
  role: 'ADMIN',
  status: 'active',
  is_verified: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}
const student: UserProfile = { ...admin, id: randomUUID(), role: 'STUDENT' }
const initialCourse: ManagedCourse = {
  id: courseId,
  title: 'English Foundations',
  slug: 'english-foundations',
  description: 'Build core English skills.',
  category: 'English',
  level: 'beginner',
  target_audience: 'New learners',
  price: 1200000,
  discounted_price: 990000,
  total_lessons: 24,
  thumbnail_url: 'https://example.test/course.jpg',
  status: 'published',
  teacher_id: adminId,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

describe('admin course management HTTP API', () => {
  let server: Server
  let baseUrl: string
  let originalAuthenticate: typeof authService.authenticateAccessToken
  let originalFindCourses: typeof courseRepository.findCourses
  let originalCreateCourse: typeof courseRepository.createCourse
  let originalUpdateCourse: typeof courseRepository.updateCourse
  let originalUpdateCourseStatus: typeof courseRepository.updateCourseStatus
  let originalDeleteCourse: typeof courseRepository.deleteCourse
  let courses: ManagedCourse[]
  let lastFilters: CourseListFilters | undefined
  let createCount: number

  before(async () => {
    originalAuthenticate = authService.authenticateAccessToken
    originalFindCourses = courseRepository.findCourses
    originalCreateCourse = courseRepository.createCourse
    originalUpdateCourse = courseRepository.updateCourse
    originalUpdateCourseStatus = courseRepository.updateCourseStatus
    originalDeleteCourse = courseRepository.deleteCourse
    courses = [{ ...initialCourse }]
    createCount = 0

    authService.authenticateAccessToken = async (token) => {
      if (token === 'test-admin') return admin
      if (token === 'test-student') return student
      throw new AuthError('Invalid or expired authentication token', 401)
    }
    courseRepository.findCourses = async (filters) => {
      lastFilters = filters
      const filtered = courses.filter((course) =>
        (!filters.search || course.title.toLowerCase().includes(filters.search.toLowerCase())) &&
        (!filters.category || course.category === filters.category) &&
        (filters.level === 'all' || course.level === filters.level) &&
        (filters.status === 'all' || course.status === filters.status)
      )
      const offset = (filters.page - 1) * filters.limit
      return {
        items: filtered.slice(offset, offset + filters.limit),
        total: filtered.length,
        page: filters.page,
        limit: filters.limit,
        totalPages: Math.max(1, Math.ceil(filtered.length / filters.limit)),
      }
    }
    courseRepository.createCourse = async (input: ManagedCourseInput, teacherId: string) => {
      createCount += 1
      const created: ManagedCourse = {
        ...input,
        id: randomUUID(),
        teacher_id: teacherId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      courses.push(created)
      return created
    }
    courseRepository.updateCourse = async (id, input) => {
      const index = courses.findIndex((course) => course.id === id)
      if (index < 0) return null
      const current = courses[index]
      if (!current) return null
      const updated = { ...current, ...input, updated_at: new Date().toISOString() }
      courses[index] = updated
      return updated
    }
    courseRepository.updateCourseStatus = async (id, status) => {
      const index = courses.findIndex((course) => course.id === id)
      const current = courses[index]
      if (!current) return null
      const updated = { ...current, status, updated_at: new Date().toISOString() }
      courses[index] = updated
      return updated
    }
    courseRepository.deleteCourse = async (id) => {
      const index = courses.findIndex((course) => course.id === id)
      if (index < 0) return false
      courses.splice(index, 1)
      return true
    }

    server = app.listen(0, '127.0.0.1')
    await once(server, 'listening')
    const address = server.address() as AddressInfo
    baseUrl = `http://127.0.0.1:${address.port}`
  })

  after(async () => {
    authService.authenticateAccessToken = originalAuthenticate
    courseRepository.findCourses = originalFindCourses
    courseRepository.createCourse = originalCreateCourse
    courseRepository.updateCourse = originalUpdateCourse
    courseRepository.updateCourseStatus = originalUpdateCourseStatus
    courseRepository.deleteCourse = originalDeleteCourse
    server.close()
    await once(server, 'close')
  })

  const request = (path: string, token?: string, init?: RequestInit) => {
    const headers = new Headers(init?.headers)
    if (init?.body) headers.set('Content-Type', 'application/json')
    if (token) headers.set('Authorization', `Bearer ${token}`)
    return fetch(`${baseUrl}/api/courses/admin${path}`, { ...init, headers })
  }

  const validCourseInput = {
    title: 'English Foundations',
    slug: 'english-foundations',
    description: 'Build core English skills.',
    category: 'English',
    level: 'beginner',
    target_audience: 'New learners',
    price: 1200000,
    discounted_price: 990000,
    total_lessons: 24,
    thumbnail_url: 'https://example.test/course.jpg',
    status: 'published',
  }

  it('requires an administrator and returns filtered paginated course data', async () => {
    const anonymous = await request('/')
    assert.equal(anonymous.status, 401)

    const forbidden = await request('/', 'test-student')
    assert.equal(forbidden.status, 403)

    const response = await request(
      '/?search=English&category=English&level=beginner&status=published&sort=price_asc&page=2&limit=5',
      'test-admin'
    )
    assert.equal(response.status, 200)
    const body = await response.json() as { success: boolean; data: ManagedCourse[]; pagination: { total: number } }
    assert.equal(body.success, true)
    assert.equal(body.data.length, 0)
    assert.equal(body.pagination.total, 1)
    assert.deepEqual(lastFilters, {
      search: 'English',
      category: 'English',
      level: 'beginner',
      status: 'published',
      sort: 'price_asc',
      page: 2,
      limit: 5,
    })
  })

  it('creates, updates, changes status, lists, and deletes a course', async () => {
    const createResponse = await request('/', 'test-admin', {
      method: 'POST',
      body: JSON.stringify(validCourseInput),
    })
    assert.equal(createResponse.status, 201)
    const createdBody = await createResponse.json() as { success: boolean; data: ManagedCourse }
    assert.equal(createdBody.success, true)
    assert.equal(createdBody.data.teacher_id, adminId)
    assert.equal(createCount, 1)

    const createdId = createdBody.data.id
    const updatedInput = { ...validCourseInput, title: 'Updated English', slug: 'updated-english' }
    const updateResponse = await request(`/${createdId}`, 'test-admin', {
      method: 'PATCH',
      body: JSON.stringify(updatedInput),
    })
    assert.equal(updateResponse.status, 200)
    const updatedBody = await updateResponse.json() as { data: ManagedCourse }
    assert.equal(updatedBody.data.title, 'Updated English')

    const statusResponse = await request(`/${createdId}/status`, 'test-admin', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'draft' }),
    })
    assert.equal(statusResponse.status, 200)
    const statusBody = await statusResponse.json() as { data: ManagedCourse }
    assert.equal(statusBody.data.status, 'draft')

    const listResponse = await request('/?status=draft', 'test-admin')
    assert.equal(listResponse.status, 200)
    const listBody = await listResponse.json() as { data: ManagedCourse[] }
    assert.equal(listBody.data.some((course) => course.id === createdId), true)

    const deleteResponse = await request(`/${createdId}`, 'test-admin', { method: 'DELETE' })
    assert.equal(deleteResponse.status, 200)
    assert.equal(courses.some((course) => course.id === createdId), false)
  })

  it('rejects invalid prices, discounts, levels, slugs, and status filters', async () => {
    const invalidPrice = await request('/', 'test-admin', {
      method: 'POST',
      body: JSON.stringify({ ...validCourseInput, price: -1 }),
    })
    assert.equal(invalidPrice.status, 400)

    const invalidDiscount = await request('/', 'test-admin', {
      method: 'POST',
      body: JSON.stringify({ ...validCourseInput, discounted_price: 1200001 }),
    })
    assert.equal(invalidDiscount.status, 400)

    const invalidLevel = await request('/', 'test-admin', {
      method: 'POST',
      body: JSON.stringify({ ...validCourseInput, level: 'expert' }),
    })
    assert.equal(invalidLevel.status, 400)

    const invalidSlug = await request('/', 'test-admin', {
      method: 'POST',
      body: JSON.stringify({ ...validCourseInput, slug: 'not a slug' }),
    })
    assert.equal(invalidSlug.status, 400)
    assert.equal(createCount, 1)

    const invalidFilter = await request('/?status=unknown', 'test-admin')
    assert.equal(invalidFilter.status, 400)
  })
})
