import { POST } from '@/app/api/values/route'
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
    investment: { findUnique: jest.fn() },
    investmentValue: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
  },
}))

jest.mock('@/lib/auth', () => ({
  getSessionUser: jest.fn().mockResolvedValue({ id: 1, email: 'test@test.com', role: 'ADMIN' }),
}))

// ── Helper ────────────────────────────────────────────────────────────────────

function req(body: unknown) {
  return new Request('http://localhost/api/values', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const validBody = { investmentId: 1, date: '2024-06-01', value: 1234.56 }
const fakeInvestment = { id: 1, userId: 1 }

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /api/values', () => {
  beforeEach(() => {
    ;(prisma.investment.findUnique as jest.Mock).mockResolvedValue(fakeInvestment)
    ;(prisma.investmentValue.findFirst as jest.Mock).mockResolvedValue(null)
    ;(prisma.investmentValue.create as jest.Mock).mockResolvedValue({ id: 10, ...validBody })
  })

  it('crea valor nuevo → 201', async () => {
    const res = await POST(req(validBody)) as any
    expect(res.status).toBe(201)
    expect(prisma.investmentValue.create).toHaveBeenCalled()
  })

  it('actualiza valor existente (upsert) → 201', async () => {
    ;(prisma.investmentValue.findFirst as jest.Mock).mockResolvedValue({ id: 10 })
    ;(prisma.investmentValue.update as jest.Mock).mockResolvedValue({ id: 10, ...validBody })

    const res = await POST(req(validBody)) as any
    expect(res.status).toBe(201)
    expect(prisma.investmentValue.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 10 } })
    )
  })

  it('investmentId no entero → 400', async () => {
    const res = await POST(req({ ...validBody, investmentId: 1.5 })) as any
    expect(res.status).toBe(400)
  })

  it('investmentId negativo → 400', async () => {
    const res = await POST(req({ ...validBody, investmentId: -1 })) as any
    expect(res.status).toBe(400)
  })

  it('fecha con formato incorrecto → 400', async () => {
    const res = await POST(req({ ...validBody, date: '01/06/2024' })) as any
    expect(res.status).toBe(400)
  })

  it('valor negativo → 400', async () => {
    const res = await POST(req({ ...validBody, value: -10 })) as any
    expect(res.status).toBe(400)
  })

  it('valor no numérico → 400', async () => {
    const res = await POST(req({ ...validBody, value: 'abc' })) as any
    expect(res.status).toBe(400)
  })

  it('inversión no encontrada → 404', async () => {
    ;(prisma.investment.findUnique as jest.Mock).mockResolvedValue(null)

    const res = await POST(req(validBody)) as any
    expect(res.status).toBe(404)
  })

  it('inversión de otro usuario → 403', async () => {
    ;(prisma.investment.findUnique as jest.Mock).mockResolvedValue({ id: 1, userId: 99 })

    const res = await POST(req(validBody)) as any
    expect(res.status).toBe(403)
  })
})
