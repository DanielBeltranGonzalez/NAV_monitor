import { GET } from '@/app/api/export/csv/route'
import { prisma } from '@/lib/prisma'

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('next/server', () => {
  class NR {
    _body: unknown
    status: number
    _headers: Map<string, string>

    constructor(body: unknown, init?: { status?: number; headers?: Record<string, string> }) {
      this._body = body
      this.status = init?.status ?? 200
      this._headers = new Map(Object.entries(init?.headers ?? {}))
    }

    async json() { return this._body }
    async text() { return this._body as string }

    get headers() {
      const self = this
      return { get: (k: string) => self._headers.get(k) ?? null }
    }

    static json(data: unknown, init?: { status?: number }) { return new NR(data, init) }
  }
  return { NextResponse: NR }
})

jest.mock('@/lib/prisma', () => ({
  prisma: {
    investment: {
      findMany: jest.fn(),
    },
  },
}))

jest.mock('@/lib/auth', () => ({
  getSessionUser: jest.fn().mockResolvedValue({ id: 1, email: 'user@test.com', role: 'USER' }),
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

const { getSessionUser } = jest.requireMock('@/lib/auth')

function req() {
  return new Request('http://localhost/api/export/csv', { method: 'GET' })
}

// ── GET /api/export/csv ───────────────────────────────────────────────────────

describe('GET /api/export/csv', () => {
  it('sin sesión → 401', async () => {
    getSessionUser.mockResolvedValueOnce(null)
    const res = await GET(req()) as any
    expect(res.status).toBe(401)
  })

  it('sin inversiones → CSV solo con cabecera', async () => {
    ;(prisma.investment.findMany as jest.Mock).mockResolvedValue([])

    const res = await GET(req()) as any
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toContain('text/csv')
    expect(res.headers.get('Content-Disposition')).toMatch(/attachment; filename="nav_export_.*\.csv"/)
    const text = await res.text()
    expect(text).toBe('Banco,Inversión,Fecha,Valor')
  })

  it('con inversiones → CSV con filas correctas', async () => {
    ;(prisma.investment.findMany as jest.Mock).mockResolvedValue([
      {
        name: 'Fondo A',
        bank: { name: 'Banco X' },
        values: [
          { date: new Date('2026-01-15'), value: 1000.5 },
          { date: new Date('2026-02-01'), value: 1100 },
        ],
      },
      {
        name: 'Fondo B',
        bank: { name: 'Banco Y' },
        values: [
          { date: new Date('2026-02-28'), value: 500 },
        ],
      },
    ])

    const res = await GET(req()) as any
    expect(res.status).toBe(200)
    const text = await res.text()
    const lines = text.split('\n')

    expect(lines[0]).toBe('Banco,Inversión,Fecha,Valor')
    expect(lines[1]).toBe('Banco X,Fondo A,2026-01-15,1000.5')
    expect(lines[2]).toBe('Banco X,Fondo A,2026-02-01,1100')
    expect(lines[3]).toBe('Banco Y,Fondo B,2026-02-28,500')
  })

  it('nombres con comas se escapan con comillas', async () => {
    ;(prisma.investment.findMany as jest.Mock).mockResolvedValue([
      {
        name: 'Fondo, con coma',
        bank: { name: 'Banco "X"' },
        values: [{ date: new Date('2026-01-01'), value: 200 }],
      },
    ])

    const res = await GET(req()) as any
    const text = await res.text()
    const dataLine = text.split('\n')[1]

    expect(dataLine).toContain('"Banco ""X"""')
    expect(dataLine).toContain('"Fondo, con coma"')
  })

  it('inversión sin valores → no genera filas de datos', async () => {
    ;(prisma.investment.findMany as jest.Mock).mockResolvedValue([
      { name: 'Fondo vacío', bank: { name: 'Banco Z' }, values: [] },
    ])

    const res = await GET(req()) as any
    const text = await res.text()
    expect(text).toBe('Banco,Inversión,Fecha,Valor')
  })

  it('consulta prisma con userId del usuario en sesión', async () => {
    ;(prisma.investment.findMany as jest.Mock).mockResolvedValue([])

    await GET(req())

    expect(prisma.investment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 1 } })
    )
  })

  it('el nombre del fichero contiene la fecha de hoy', async () => {
    ;(prisma.investment.findMany as jest.Mock).mockResolvedValue([])

    const res = await GET(req()) as any
    const today = new Date().toISOString().slice(0, 10)
    expect(res.headers.get('Content-Disposition')).toContain(`nav_export_${today}.csv`)
  })
})
