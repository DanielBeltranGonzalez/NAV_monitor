import { GET } from '@/app/api/values/chart/route'
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
    investment: { findMany: jest.fn() },
  },
}))

jest.mock('@/lib/auth', () => ({
  getSessionUser: jest.fn().mockResolvedValue({ id: 1, email: 'test@test.com', role: 'USER' }),
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

const { getSessionUser } = jest.requireMock('@/lib/auth')

function makeValue(date: string, value: string) {
  return { date: new Date(date + 'T00:00:00Z'), value }
}

function req() {
  return new Request('http://localhost/api/values/chart')
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GET /api/values/chart', () => {
  it('sin sesión → 401', async () => {
    getSessionUser.mockResolvedValueOnce(null)
    const res = await GET(req()) as any
    expect(res.status).toBe(401)
  })

  it('sin inversiones → array vacío', async () => {
    ;(prisma.investment.findMany as jest.Mock).mockResolvedValue([])
    const res = await GET(req()) as any
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })

  it('una inversión → serie temporal correcta', async () => {
    ;(prisma.investment.findMany as jest.Mock).mockResolvedValue([
      {
        id: 1,
        values: [
          makeValue('2024-01-01', '100'),
          makeValue('2024-03-01', '120'),
        ],
      },
    ])

    const res = await GET(req()) as any
    const data = await res.json()

    expect(data).toHaveLength(2)
    expect(data[0]).toEqual({ date: '2024-01-01', total: 100 })
    expect(data[1]).toEqual({ date: '2024-03-01', total: 120 })
  })

  it('varias inversiones → suma correcta por fecha', async () => {
    // Investment A: valor en 2024-01-01 (100) y 2024-03-01 (120)
    // Investment B: valor en 2024-02-01 (200)
    // En 2024-01-01: A=100, B=nada → total=100
    // En 2024-02-01: A=100 (último hasta esa fecha), B=200 → total=300
    // En 2024-03-01: A=120, B=200 → total=320
    ;(prisma.investment.findMany as jest.Mock).mockResolvedValue([
      {
        id: 1,
        values: [
          makeValue('2024-01-01', '100'),
          makeValue('2024-03-01', '120'),
        ],
      },
      {
        id: 2,
        values: [
          makeValue('2024-02-01', '200'),
        ],
      },
    ])

    const res = await GET(req()) as any
    const data = await res.json()

    expect(data).toHaveLength(3)
    expect(data.find((d: any) => d.date === '2024-01-01').total).toBe(100)
    expect(data.find((d: any) => d.date === '2024-02-01').total).toBe(300)
    expect(data.find((d: any) => d.date === '2024-03-01').total).toBe(320)
  })

  it('redondea a 2 decimales', async () => {
    ;(prisma.investment.findMany as jest.Mock).mockResolvedValue([
      {
        id: 1,
        values: [makeValue('2024-01-01', '100.333')],
      },
      {
        id: 2,
        values: [makeValue('2024-01-01', '200.333')],
      },
    ])

    const res = await GET(req()) as any
    const data = await res.json()

    expect(data[0].total).toBe(300.67)
  })

  it('devuelve fechas en formato YYYY-MM-DD', async () => {
    ;(prisma.investment.findMany as jest.Mock).mockResolvedValue([
      { id: 1, values: [makeValue('2024-06-15', '500')] },
    ])

    const res = await GET(req()) as any
    const data = await res.json()

    expect(data[0].date).toBe('2024-06-15')
  })
})
