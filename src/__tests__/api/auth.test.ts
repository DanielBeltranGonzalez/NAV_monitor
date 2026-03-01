import { POST as register } from '@/app/api/auth/register/route'
import { POST as login } from '@/app/api/auth/login/route'
import { POST as logout } from '@/app/api/auth/logout/route'
import { prisma } from '@/lib/prisma'

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('next/server', () => {
  class NR {
    _data: unknown
    status: number
    _headers: Map<string, string>
    _cookies: Map<string, { value: string; options: Record<string, unknown> }>

    constructor(body: unknown, init?: { status?: number }) {
      this._data = body
      this.status = init?.status ?? 200
      this._headers = new Map()
      this._cookies = new Map()
    }

    async json() { return this._data }

    get cookies() {
      const self = this
      return {
        set(name: string, value: string, options: Record<string, unknown> = {}) {
          self._cookies.set(name, { value, options })
        },
        get(name: string) { return self._cookies.get(name) },
      }
    }

    static json(data: unknown, init?: { status?: number }) { return new NR(data, init) }
    static redirect(url: URL | string, init?: { status?: number }) {
      const r = new NR(null, { status: init?.status ?? 302 })
      r._headers.set('location', url.toString())
      return r
    }
  }
  return { NextResponse: NR }
})

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
      count: jest.fn().mockResolvedValue(1),
    },
  },
}))

jest.mock('@/lib/auth', () => ({
  hashPassword: jest.fn().mockResolvedValue('hashed-password'),
  comparePassword: jest.fn(),
  signToken: jest.fn().mockResolvedValue('fake-jwt-token'),
  COOKIE_NAME: 'session',
}))

// ── Helper ────────────────────────────────────────────────────────────────────

function req(body: unknown) {
  return new Request('http://localhost/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const { comparePassword } = jest.requireMock('@/lib/auth')

// ── POST /api/auth/register ───────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
  it('registra usuario nuevo → 201 + cookie session', async () => {
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)
    ;(prisma.user.create as jest.Mock).mockResolvedValue({ id: 1, email: 'user@test.com', role: 'USER' })

    const res = await register(req({ email: 'user@test.com', password: 'password123' })) as any
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.email).toBe('user@test.com')
    expect(res.cookies.get('session')?.value).toBe('fake-jwt-token')
  })

  it('email inválido → 400', async () => {
    const res = await register(req({ email: 'notanemail', password: 'password123' })) as any
    expect(res.status).toBe(400)
  })

  it('contraseña corta → 400', async () => {
    const res = await register(req({ email: 'user@test.com', password: 'short' })) as any
    expect(res.status).toBe(400)
  })

  it('email ya registrado → 409', async () => {
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 1, email: 'user@test.com' })

    const res = await register(req({ email: 'user@test.com', password: 'password123' })) as any
    expect(res.status).toBe(409)
  })
})

// ── POST /api/auth/login ──────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  const fakeUser = { id: 1, email: 'user@test.com', passwordHash: 'hashed-password' }

  it('login correcto → 200 + cookie session', async () => {
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(fakeUser)
    ;(comparePassword as jest.Mock).mockResolvedValue(true)

    const res = await login(req({ email: 'user@test.com', password: 'password123' })) as any
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.email).toBe('user@test.com')
    expect(res.cookies.get('session')?.value).toBe('fake-jwt-token')
  })

  it('usuario no encontrado → 401', async () => {
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)

    const res = await login(req({ email: 'noexiste@test.com', password: 'password123' })) as any
    expect(res.status).toBe(401)
  })

  it('contraseña incorrecta → 401', async () => {
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(fakeUser)
    ;(comparePassword as jest.Mock).mockResolvedValue(false)

    const res = await login(req({ email: 'user@test.com', password: 'wrongpassword' })) as any
    expect(res.status).toBe(401)
  })

  it('email ausente → 400', async () => {
    const res = await login(req({ password: 'password123' })) as any
    expect(res.status).toBe(400)
  })

  it('contraseña ausente → 400', async () => {
    const res = await login(req({ email: 'user@test.com' })) as any
    expect(res.status).toBe(400)
  })
})

// ── POST /api/auth/logout ─────────────────────────────────────────────────────

describe('POST /api/auth/logout', () => {
  it('borra cookie session → 200', async () => {
    const res = await logout() as any
    expect(res.status).toBe(200)
    const sessionCookie = res.cookies.get('session')
    expect(sessionCookie?.options?.maxAge).toBe(0)
  })
})
