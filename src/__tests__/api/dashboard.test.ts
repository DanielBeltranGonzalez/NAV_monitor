import { GET } from '@/app/api/values/dashboard/route'
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeValue(id: number, date: string, value: string) {
  return { id, date: new Date(date + 'T00:00:00Z'), value }
}

function makeInvestment(values: ReturnType<typeof makeValue>[]) {
  return { id: 1, name: 'Fondo A', bank: { name: 'BBVA' }, values }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GET /api/values/dashboard', () => {
  it('devuelve current, previous, prevMonth y prevYear correctos', async () => {
    const values = [
      makeValue(4, '2024-06-15', '1400'), // current
      makeValue(3, '2024-06-01', '1300'), // previous (mismo mes)
      makeValue(2, '2024-05-01', '1200'), // prevMonth
      makeValue(1, '2023-12-01', '1100'), // prevYear
    ]
    ;(prisma.investment.findMany as jest.Mock).mockResolvedValue([makeInvestment(values)])

    const res = await GET() as any
    const data = await res.json()

    expect(data).toHaveLength(1)
    const inv = data[0]
    expect(inv.current.id).toBe(4)
    expect(inv.previous.id).toBe(3)
    expect(inv.prevMonth.id).toBe(2)
    expect(inv.prevYear.id).toBe(1)
  })

  it('sin previous ni prevMonth ni prevYear si solo hay un valor', async () => {
    const values = [makeValue(1, '2024-06-15', '1000')]
    ;(prisma.investment.findMany as jest.Mock).mockResolvedValue([makeInvestment(values)])

    const res = await GET() as any
    const data = await res.json()

    expect(data[0].previous).toBeNull()
    expect(data[0].prevMonth).toBeNull()
    expect(data[0].prevYear).toBeNull()
  })

  it('filtra inversiones sin valor o con valor 0', async () => {
    const invSinValores = { id: 2, name: 'Fondo B', bank: { name: 'Sabadell' }, values: [] }
    const invValorCero = {
      id: 3, name: 'Fondo C', bank: { name: 'Sabadell' },
      values: [makeValue(1, '2024-06-01', '0')],
    }
    ;(prisma.investment.findMany as jest.Mock).mockResolvedValue([invSinValores, invValorCero])

    const res = await GET() as any
    const data = await res.json()
    expect(data).toHaveLength(0)
  })

  it('prevMonth busca en año anterior si el actual es enero', async () => {
    // Ref date: enero 2024 → prevMonth debe ser diciembre 2023
    const values = [
      makeValue(2, '2024-01-15', '1200'), // current (enero 2024)
      makeValue(1, '2023-12-01', '1100'), // prevMonth (dic 2023) y también prevYear
    ]
    ;(prisma.investment.findMany as jest.Mock).mockResolvedValue([makeInvestment(values)])

    const res = await GET() as any
    const data = await res.json()

    expect(data[0].prevMonth.id).toBe(1)
    expect(data[0].prevYear.id).toBe(1)
  })

  it('devuelve array vacío si no hay inversiones', async () => {
    ;(prisma.investment.findMany as jest.Mock).mockResolvedValue([])

    const res = await GET() as any
    expect(await res.json()).toEqual([])
  })
})
