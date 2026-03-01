import { GET, POST } from '@/app/api/values/route'
import { PATCH, DELETE } from '@/app/api/values/[id]/route'
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
    investmentValue: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}))

jest.mock('@/lib/auth', () => ({
  getSessionUser: jest.fn().mockResolvedValue({ id: 1, email: 'test@test.com', role: 'ADMIN' }),
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

const { getSessionUser } = jest.requireMock('@/lib/auth')

function req(body: unknown) {
  return new Request('http://localhost/api/values', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function getReq(params: string) {
  return new Request(`http://localhost/api/values?${params}`)
}

function patchReq(id: number, body: unknown) {
  return new Request(`http://localhost/api/values/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function deleteReq(id: number) {
  return new Request(`http://localhost/api/values/${id}`, { method: 'DELETE' })
}

function idParams(id: number) {
  return Promise.resolve({ id: String(id) })
}

const validBody = { investmentId: 1, date: '2024-06-01', value: 1234.56 }
const fakeInvestment = { id: 1, userId: 1 }
const fakeValue = {
  id: 10,
  date: new Date('2024-06-01T00:00:00Z'),
  value: '1234.56',
  investment: { userId: 1 },
}

// ── POST /api/values ──────────────────────────────────────────────────────────

describe('POST /api/values', () => {
  beforeEach(() => {
    ;(prisma.investment.findUnique as jest.Mock).mockResolvedValue(fakeInvestment)
    ;(prisma.investmentValue.findFirst as jest.Mock).mockResolvedValue(null)
    ;(prisma.investmentValue.create as jest.Mock).mockResolvedValue({ id: 10, ...validBody })
  })

  it('sin sesión → 401', async () => {
    getSessionUser.mockResolvedValueOnce(null)
    const res = await POST(req(validBody)) as any
    expect(res.status).toBe(401)
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

// ── GET /api/values ───────────────────────────────────────────────────────────

describe('GET /api/values', () => {
  beforeEach(() => {
    ;(prisma.investment.findUnique as jest.Mock).mockResolvedValue(fakeInvestment)
    ;(prisma.investmentValue.findMany as jest.Mock).mockResolvedValue([fakeValue])
  })

  it('sin sesión → 401', async () => {
    getSessionUser.mockResolvedValueOnce(null)
    const res = await GET(getReq('investmentId=1')) as any
    expect(res.status).toBe(401)
  })

  it('sin investmentId → 400', async () => {
    const res = await GET(getReq('')) as any
    expect(res.status).toBe(400)
  })

  it('devuelve lista de valores → 200', async () => {
    const res = await GET(getReq('investmentId=1')) as any
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
    expect(data[0]).toHaveProperty('id', 10)
  })

  it('inversión de otro usuario → 403', async () => {
    ;(prisma.investment.findUnique as jest.Mock).mockResolvedValue({ id: 1, userId: 99 })
    const res = await GET(getReq('investmentId=1')) as any
    expect(res.status).toBe(403)
  })

  it('inversión no encontrada → 404', async () => {
    ;(prisma.investment.findUnique as jest.Mock).mockResolvedValue(null)
    const res = await GET(getReq('investmentId=1')) as any
    expect(res.status).toBe(404)
  })
})

// ── PATCH /api/values/[id] ────────────────────────────────────────────────────

describe('PATCH /api/values/[id]', () => {
  beforeEach(() => {
    ;(prisma.investmentValue.findUnique as jest.Mock).mockResolvedValue(fakeValue)
    ;(prisma.investmentValue.update as jest.Mock).mockResolvedValue({
      ...fakeValue,
      value: '2000',
    })
  })

  it('sin sesión → 401', async () => {
    getSessionUser.mockResolvedValueOnce(null)
    const res = await PATCH(patchReq(10, { value: 2000 }), { params: idParams(10) }) as any
    expect(res.status).toBe(401)
  })

  it('actualiza valor → 200', async () => {
    const res = await PATCH(patchReq(10, { value: 2000 }), { params: idParams(10) }) as any
    expect(res.status).toBe(200)
    expect(prisma.investmentValue.update).toHaveBeenCalled()
  })

  it('valor negativo → 400', async () => {
    const res = await PATCH(patchReq(10, { value: -5 }), { params: idParams(10) }) as any
    expect(res.status).toBe(400)
  })

  it('fecha con formato incorrecto → 400', async () => {
    const res = await PATCH(patchReq(10, { date: '01-06-2024' }), { params: idParams(10) }) as any
    expect(res.status).toBe(400)
  })

  it('sin campos → 400', async () => {
    const res = await PATCH(patchReq(10, {}), { params: idParams(10) }) as any
    expect(res.status).toBe(400)
  })

  it('valor de otro usuario → 403', async () => {
    ;(prisma.investmentValue.findUnique as jest.Mock).mockResolvedValue({
      ...fakeValue,
      investment: { userId: 99 },
    })
    const res = await PATCH(patchReq(10, { value: 2000 }), { params: idParams(10) }) as any
    expect(res.status).toBe(403)
  })

  it('valor no encontrado → 404', async () => {
    ;(prisma.investmentValue.findUnique as jest.Mock).mockResolvedValue(null)
    const res = await PATCH(patchReq(10, { value: 2000 }), { params: idParams(10) }) as any
    expect(res.status).toBe(404)
  })
})

// ── DELETE /api/values/[id] ───────────────────────────────────────────────────

describe('DELETE /api/values/[id]', () => {
  beforeEach(() => {
    ;(prisma.investmentValue.findUnique as jest.Mock).mockResolvedValue(fakeValue)
    ;(prisma.investmentValue.delete as jest.Mock).mockResolvedValue(fakeValue)
  })

  it('sin sesión → 401', async () => {
    getSessionUser.mockResolvedValueOnce(null)
    const res = await DELETE(deleteReq(10), { params: idParams(10) }) as any
    expect(res.status).toBe(401)
  })

  it('elimina valor → 204', async () => {
    const res = await DELETE(deleteReq(10), { params: idParams(10) }) as any
    expect(res.status).toBe(204)
    expect(prisma.investmentValue.delete).toHaveBeenCalledWith({ where: { id: 10 } })
  })

  it('valor de otro usuario → 403', async () => {
    ;(prisma.investmentValue.findUnique as jest.Mock).mockResolvedValue({
      ...fakeValue,
      investment: { userId: 99 },
    })
    const res = await DELETE(deleteReq(10), { params: idParams(10) }) as any
    expect(res.status).toBe(403)
  })

  it('valor no encontrado → 404', async () => {
    ;(prisma.investmentValue.findUnique as jest.Mock).mockResolvedValue(null)
    const res = await DELETE(deleteReq(10), { params: idParams(10) }) as any
    expect(res.status).toBe(404)
  })
})
