import { GET } from '@/app/api/admin/events/route'
import { GET as getCount } from '@/app/api/admin/events/count/route'
import { prisma } from '@/lib/prisma'

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('next/server', () => {
  class NR {
    _data: unknown; status: number
    constructor(body: unknown, init?: { status?: number }) {
      this._data = body; this.status = init?.status ?? 200
    }
    async json() { return this._data }
    static json(data: unknown, init?: { status?: number }) { return new NR(data, init) }
  }
  return { NextResponse: NR }
})

jest.mock('@/lib/prisma', () => ({
  prisma: {
    auditLog: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}))

jest.mock('@/lib/auth', () => ({
  getSessionUser: jest.fn().mockResolvedValue({ id: 1, email: 'admin@test.com', role: 'ADMIN' }),
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

const { getSessionUser } = jest.requireMock('@/lib/auth')

function req(url = 'http://localhost/api/admin/events') {
  return new Request(url)
}

const fakeEvents = [
  { id: 1, event: 'USER_LOGIN', userEmail: 'u@test.com', targetEmail: null, createdAt: new Date() },
  { id: 2, event: 'ROLE_CHANGED', userEmail: 'admin@test.com', targetEmail: 'u@test.com', createdAt: new Date() },
]

// ── GET /api/admin/events ─────────────────────────────────────────────────────

describe('GET /api/admin/events', () => {
  it('sin sesión → 401', async () => {
    getSessionUser.mockResolvedValueOnce(null)
    const res = await GET(req()) as any
    expect(res.status).toBe(401)
  })

  it('no-admin → 403', async () => {
    getSessionUser.mockResolvedValueOnce({ id: 2, email: 'u@test.com', role: 'USER' })
    const res = await GET(req()) as any
    expect(res.status).toBe(403)
  })

  it('admin → 200 con lista de eventos', async () => {
    ;(prisma.auditLog.findMany as jest.Mock).mockResolvedValue(fakeEvents)
    const res = await GET(req()) as any
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveLength(2)
    expect(body[0].event).toBe('USER_LOGIN')
  })

  it('consulta máximo 200 eventos ordenados por fecha desc', async () => {
    ;(prisma.auditLog.findMany as jest.Mock).mockResolvedValue([])
    await GET(req())
    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: 'desc' },
        take: 200,
      })
    )
  })
})

// ── GET /api/admin/events/count ───────────────────────────────────────────────

describe('GET /api/admin/events/count', () => {
  it('sin sesión → 401', async () => {
    getSessionUser.mockResolvedValueOnce(null)
    const res = await getCount(req('http://localhost/api/admin/events/count')) as any
    expect(res.status).toBe(401)
  })

  it('no-admin → 403', async () => {
    getSessionUser.mockResolvedValueOnce({ id: 2, email: 'u@test.com', role: 'USER' })
    const res = await getCount(req('http://localhost/api/admin/events/count')) as any
    expect(res.status).toBe(403)
  })

  it('admin sin since → total de eventos', async () => {
    ;(prisma.auditLog.count as jest.Mock).mockResolvedValue(42)
    const res = await getCount(req('http://localhost/api/admin/events/count')) as any
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.count).toBe(42)
    expect(prisma.auditLog.count).toHaveBeenCalledWith({ where: undefined })
  })

  it('admin con since → count filtrado desde esa fecha', async () => {
    ;(prisma.auditLog.count as jest.Mock).mockResolvedValue(5)
    const since = '2024-01-01T00:00:00.000Z'
    const res = await getCount(req(`http://localhost/api/admin/events/count?since=${since}`)) as any
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.count).toBe(5)
    expect(prisma.auditLog.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: { createdAt: { gt: new Date(since) } } })
    )
  })
})
