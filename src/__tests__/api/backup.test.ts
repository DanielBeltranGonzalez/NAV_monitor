import { GET } from '@/app/api/admin/backup/route'

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('next/server', () => {
  class NR {
    _data: unknown
    status: number
    _resHeaders: Record<string, string>

    constructor(body: unknown, init?: { status?: number; headers?: Record<string, string> }) {
      this._data = body
      this.status = init?.status ?? 200
      this._resHeaders = (init?.headers as Record<string, string>) ?? {}
    }

    async json() { return this._data }
    headers = {
      get: (name: string) => this._resHeaders[name] ?? null,
    }

    static json(data: unknown, init?: { status?: number }) { return new NR(data, init) }
  }
  return { NextResponse: NR }
})

jest.mock('fs', () => ({
  readFileSync: jest.fn().mockReturnValue(Buffer.from('fake-db-content')),
}))

jest.mock('path', () => ({
  resolve: jest.fn().mockReturnValue('/fake/prisma/nav.db'),
}))

jest.mock('@/lib/prisma', () => ({
  prisma: {
    auditLog: {
      create: jest.fn().mockResolvedValue({}),
    },
  },
}))

jest.mock('@/lib/auth', () => ({
  getSessionUser: jest.fn().mockResolvedValue({ id: 1, email: 'admin@test.com', role: 'ADMIN' }),
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

const { getSessionUser } = jest.requireMock('@/lib/auth')
const { readFileSync } = jest.requireMock('fs')
const { prisma } = jest.requireMock('@/lib/prisma')

function req() {
  return new Request('http://localhost/api/admin/backup')
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GET /api/admin/backup', () => {
  beforeEach(() => {
    readFileSync.mockReturnValue(Buffer.from('fake-db-content'))
  })

  it('sin sesión → 401', async () => {
    getSessionUser.mockResolvedValueOnce(null)
    const res = await GET(req()) as any
    expect(res.status).toBe(401)
  })

  it('no-admin → 403', async () => {
    getSessionUser.mockResolvedValueOnce({ id: 2, email: 'user@test.com', role: 'USER' })
    const res = await GET(req()) as any
    expect(res.status).toBe(403)
  })

  it('admin → 200 con fichero de backup', async () => {
    const res = await GET(req()) as any
    expect(res.status).toBe(200)
    expect(res._resHeaders['Content-Type']).toBe('application/octet-stream')
    expect(res._resHeaders['Content-Disposition']).toMatch(/nav_backup_.*\.db/)
  })

  it('BD no encontrada → 500', async () => {
    readFileSync.mockImplementation(() => { throw new Error('ENOENT') })
    const res = await GET(req()) as any
    expect(res.status).toBe(500)
  })

  it('registra el evento BACKUP_DOWNLOADED en audit log', async () => {
    await GET(req())
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ event: 'BACKUP_DOWNLOADED', userEmail: 'admin@test.com' }),
      })
    )
  })
})
