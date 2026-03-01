import { GET } from '@/app/api/admin/users/route'
import { PATCH, DELETE } from '@/app/api/admin/users/[id]/route'
import { POST as resetPassword } from '@/app/api/admin/users/[id]/reset-password/route'
import { prisma } from '@/lib/prisma'

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('next/server', () => {
  class NR {
    _data: unknown
    status: number

    constructor(body: unknown, init?: { status?: number }) {
      this._data = body
      this.status = init?.status ?? 200
    }

    async json() { return this._data }
    static json(data: unknown, init?: { status?: number }) { return new NR(data, init) }
  }
  return { NextResponse: NR }
})

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn().mockResolvedValue({ email: 'user@test.com', role: 'USER' }),
      count: jest.fn().mockResolvedValue(2),
      delete: jest.fn(),
      update: jest.fn(),
    },
    auditLog: {
      create: jest.fn().mockResolvedValue({}),
    },
  },
}))

jest.mock('@/lib/auth', () => ({
  getSessionUser: jest.fn().mockResolvedValue({ id: 1, email: 'admin@test.com', role: 'ADMIN' }),
  hashPassword: jest.fn().mockResolvedValue('hashed-new-password'),
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

const { getSessionUser } = jest.requireMock('@/lib/auth')

function req(method = 'GET') {
  return new Request('http://localhost/api/admin/users', { method })
}

function reqWithId(id: string, method: string, body?: object) {
  return new Request(`http://localhost/api/admin/users/${id}`, {
    method,
    ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
  })
}

function params(id: string) {
  return { params: Promise.resolve({ id }) }
}

const fakeUsers = [
  { id: 1, email: 'admin@test.com', role: 'ADMIN', createdAt: new Date('2024-01-01') },
  { id: 2, email: 'user@test.com', role: 'USER', createdAt: new Date('2024-01-02') },
]

// ── GET /api/admin/users ──────────────────────────────────────────────────────

describe('GET /api/admin/users', () => {
  beforeEach(() => {
    getSessionUser.mockResolvedValue({ id: 1, email: 'admin@test.com', role: 'ADMIN' })
    ;(prisma.user.findMany as jest.Mock).mockResolvedValue(fakeUsers)
  })

  it('admin → 200 con lista de usuarios', async () => {
    const res = await GET(req()) as any
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
    expect(body).toHaveLength(2)
  })

  it('no-admin → 403', async () => {
    getSessionUser.mockResolvedValue({ id: 2, email: 'user@test.com', role: 'USER' })
    const res = await GET(req()) as any
    expect(res.status).toBe(403)
  })

  it('sin sesión → 401', async () => {
    getSessionUser.mockResolvedValue(null)
    const res = await GET(req()) as any
    expect(res.status).toBe(401)
  })
})

// ── PATCH /api/admin/users/[id] ───────────────────────────────────────────────

describe('PATCH /api/admin/users/[id]', () => {
  beforeEach(() => {
    getSessionUser.mockResolvedValue({ id: 1, email: 'admin@test.com', role: 'ADMIN' })
    ;(prisma.user.update as jest.Mock).mockResolvedValue({
      id: 2, email: 'user@test.com', role: 'ADMIN', createdAt: new Date('2024-01-02'),
    })
  })

  it('no se puede degradar al único admin → 400', async () => {
    ;(prisma.user.count as jest.Mock).mockResolvedValueOnce(1)
    const res = await PATCH(reqWithId('2', 'PATCH', { role: 'USER' }), params('2')) as any
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/único administrador/)
  })

  it('admin cambia rol USER → ADMIN → 200', async () => {
    const res = await PATCH(reqWithId('2', 'PATCH', { role: 'ADMIN' }), params('2')) as any
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.role).toBe('ADMIN')
    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 2 },
      data: { role: 'ADMIN' },
    }))
  })

  it('admin intenta cambiar su propio rol → 400', async () => {
    const res = await PATCH(reqWithId('1', 'PATCH', { role: 'USER' }), params('1')) as any
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/propio rol/)
  })

  it('rol inválido → 400', async () => {
    const res = await PATCH(reqWithId('2', 'PATCH', { role: 'SUPERUSER' }), params('2')) as any
    expect(res.status).toBe(400)
  })

  it('no-admin → 403', async () => {
    getSessionUser.mockResolvedValue({ id: 2, email: 'user@test.com', role: 'USER' })
    const res = await PATCH(reqWithId('3', 'PATCH', { role: 'ADMIN' }), params('3')) as any
    expect(res.status).toBe(403)
  })

  it('sin sesión → 401', async () => {
    getSessionUser.mockResolvedValue(null)
    const res = await PATCH(reqWithId('2', 'PATCH', { role: 'ADMIN' }), params('2')) as any
    expect(res.status).toBe(401)
  })
})

// ── DELETE /api/admin/users/[id] ──────────────────────────────────────────────

describe('DELETE /api/admin/users/[id]', () => {
  beforeEach(() => {
    getSessionUser.mockResolvedValue({ id: 1, email: 'admin@test.com', role: 'ADMIN' })
    ;(prisma.user.delete as jest.Mock).mockResolvedValue({ id: 2 })
  })

  it('no se puede eliminar al único admin → 400', async () => {
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({ email: 'admin2@test.com', role: 'ADMIN' })
    ;(prisma.user.count as jest.Mock).mockResolvedValueOnce(1)
    const res = await DELETE(reqWithId('2', 'DELETE'), params('2')) as any
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/único administrador/)
  })

  it('admin elimina otro usuario → 204', async () => {
    const res = await DELETE(reqWithId('2', 'DELETE'), params('2')) as any
    expect(res.status).toBe(204)
    expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 2 } })
  })

  it('admin intenta eliminarse a sí mismo → 400', async () => {
    const res = await DELETE(reqWithId('1', 'DELETE'), params('1')) as any
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/ti mismo/)
  })

  it('no-admin → 403', async () => {
    getSessionUser.mockResolvedValue({ id: 2, email: 'user@test.com', role: 'USER' })
    const res = await DELETE(reqWithId('3', 'DELETE'), params('3')) as any
    expect(res.status).toBe(403)
  })

  it('sin sesión → 401', async () => {
    getSessionUser.mockResolvedValue(null)
    const res = await DELETE(reqWithId('2', 'DELETE'), params('2')) as any
    expect(res.status).toBe(401)
  })
})

// ── POST /api/admin/users/[id]/reset-password ─────────────────────────────────

describe('POST /api/admin/users/[id]/reset-password', () => {
  beforeEach(() => {
    getSessionUser.mockResolvedValue({ id: 1, email: 'admin@test.com', role: 'ADMIN' })
    ;(prisma.user.update as jest.Mock).mockResolvedValue({ id: 2 })
  })

  it('admin resetea contraseña → 200 con password', async () => {
    const res = await resetPassword(reqWithId('2', 'POST'), params('2')) as any
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(typeof body.password).toBe('string')
    expect(body.password.length).toBe(12)
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 2 },
      data: { passwordHash: 'hashed-new-password' },
      select: { email: true },
    })
  })

  it('no-admin → 403', async () => {
    getSessionUser.mockResolvedValue({ id: 2, email: 'user@test.com', role: 'USER' })
    const res = await resetPassword(reqWithId('3', 'POST'), params('3')) as any
    expect(res.status).toBe(403)
  })

  it('sin sesión → 401', async () => {
    getSessionUser.mockResolvedValue(null)
    const res = await resetPassword(reqWithId('2', 'POST'), params('2')) as any
    expect(res.status).toBe(401)
  })
})
