import { GET, PATCH, DELETE } from '@/app/api/auth/me/route'
import { prisma } from '@/lib/prisma'

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('next/server', () => {
  class NR {
    _data: unknown
    status: number
    _cookies: Map<string, { value: string; options: Record<string, unknown> }>

    constructor(body: unknown, init?: { status?: number }) {
      this._data = body
      this.status = init?.status ?? 200
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
  }
  return { NextResponse: NR }
})

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
      delete: jest.fn().mockResolvedValue({}),
    },
    auditLog: {
      create: jest.fn().mockResolvedValue({}),
    },
  },
}))

jest.mock('@/lib/auth', () => ({
  getSessionUser: jest.fn().mockResolvedValue({ id: 1, email: 'user@test.com', role: 'USER' }),
  comparePassword: jest.fn(),
  hashPassword: jest.fn().mockResolvedValue('hashed-new-password'),
  COOKIE_NAME: 'session',
  validatePasswordComplexity: (password: string) => {
    if (password.length < 8) return 'La contraseña debe tener al menos 8 caracteres'
    if (!/[A-Z]/.test(password)) return 'La contraseña debe incluir al menos una mayúscula'
    if (!/[a-z]/.test(password)) return 'La contraseña debe incluir al menos una minúscula'
    if (!/[0-9]/.test(password)) return 'La contraseña debe incluir al menos un número'
    return null
  },
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

const { getSessionUser, comparePassword } = jest.requireMock('@/lib/auth')
const fakeDbUser = { id: 1, email: 'user@test.com', passwordHash: 'old-hash' }

function req(method: string, body?: unknown) {
  return new Request('http://localhost/api/auth/me', {
    method,
    ...(body
      ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
      : {}),
  })
}

// ── GET /api/auth/me ──────────────────────────────────────────────────────────

describe('GET /api/auth/me', () => {
  it('sin sesión → 401', async () => {
    getSessionUser.mockResolvedValueOnce(null)
    const res = await GET(req('GET')) as any
    expect(res.status).toBe(401)
  })

  it('con sesión → 200 con datos del usuario', async () => {
    const res = await GET(req('GET')) as any
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ id: 1, email: 'user@test.com', role: 'USER' })
  })
})

// ── PATCH /api/auth/me ────────────────────────────────────────────────────────

describe('PATCH /api/auth/me', () => {
  beforeEach(() => {
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(fakeDbUser)
    ;(comparePassword as jest.Mock).mockResolvedValue(true)
  })

  it('sin sesión → 401', async () => {
    getSessionUser.mockResolvedValueOnce(null)
    const res = await PATCH(req('PATCH', { currentPassword: 'Current1', newPassword: 'NewPass1' })) as any
    expect(res.status).toBe(401)
  })

  it('faltan campos → 400', async () => {
    const res = await PATCH(req('PATCH', { currentPassword: 'Current1' })) as any
    expect(res.status).toBe(400)
  })

  it('nueva contraseña sin mayúscula → 400', async () => {
    const res = await PATCH(req('PATCH', { currentPassword: 'Current1', newPassword: 'nouppercase1' })) as any
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/mayúscula/)
  })

  it('nueva contraseña sin número → 400', async () => {
    const res = await PATCH(req('PATCH', { currentPassword: 'Current1', newPassword: 'NoNumbers' })) as any
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/número/)
  })

  it('nueva contraseña corta → 400', async () => {
    const res = await PATCH(req('PATCH', { currentPassword: 'Current1', newPassword: 'Sh0rt' })) as any
    expect(res.status).toBe(400)
  })

  it('contraseña actual incorrecta → 400', async () => {
    ;(comparePassword as jest.Mock).mockResolvedValueOnce(false)
    const res = await PATCH(req('PATCH', { currentPassword: 'Wrong1', newPassword: 'NewPass1' })) as any
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/incorrecta/)
  })

  it('cambio exitoso → 200', async () => {
    const res = await PATCH(req('PATCH', { currentPassword: 'Current1', newPassword: 'NewPass1' })) as any
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 1 }, data: { passwordHash: 'hashed-new-password' } })
    )
  })
})

// ── DELETE /api/auth/me ───────────────────────────────────────────────────────

describe('DELETE /api/auth/me', () => {
  it('sin sesión → 401', async () => {
    getSessionUser.mockResolvedValueOnce(null)
    const res = await DELETE(req('DELETE')) as any
    expect(res.status).toBe(401)
  })

  it('admin no puede eliminarse a sí mismo → 403', async () => {
    getSessionUser.mockResolvedValueOnce({ id: 1, email: 'admin@test.com', role: 'ADMIN' })
    const res = await DELETE(req('DELETE')) as any
    expect(res.status).toBe(403)
  })

  it('usuario normal elimina su cuenta → 200 y borra cookie', async () => {
    const res = await DELETE(req('DELETE')) as any
    expect(res.status).toBe(200)
    expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 1 } })
    const cookie = (res as any)._cookies.get('session')
    expect(cookie?.options?.maxAge).toBe(0)
  })
})
