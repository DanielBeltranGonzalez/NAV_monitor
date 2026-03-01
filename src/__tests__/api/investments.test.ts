import { GET, POST } from '@/app/api/investments/route'
import { PATCH, DELETE } from '@/app/api/investments/[id]/route'
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

jest.mock('@prisma/client', () => ({
  Prisma: {
    PrismaClientKnownRequestError: class extends Error {
      code: string
      constructor(msg: string, opts: { code: string }) { super(msg); this.code = opts.code }
    },
  },
}))

jest.mock('@/lib/prisma', () => ({
  prisma: {
    investment: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}))

// ── Helpers ──────────────────────────────────────────────────────────────────

const { Prisma } = jest.requireMock('@prisma/client')

function req(body: unknown, method = 'POST') {
  return new Request('http://localhost/api/investments', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const fakeParams = (id: string) => Promise.resolve({ id })

// ── GET /api/investments ──────────────────────────────────────────────────────

describe('GET /api/investments', () => {
  it('devuelve lista de inversiones', async () => {
    const investments = [{ id: 1, name: 'Fondo A', bank: { name: 'BBVA' }, values: [] }]
    ;(prisma.investment.findMany as jest.Mock).mockResolvedValue(investments)

    const res = await GET() as any
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(investments)
  })
})

// ── POST /api/investments ─────────────────────────────────────────────────────

describe('POST /api/investments', () => {
  it('crea inversión válida → 201', async () => {
    const investment = { id: 1, name: 'Fondo A', bankId: 2, bank: { name: 'BBVA' } }
    ;(prisma.investment.create as jest.Mock).mockResolvedValue(investment)

    const res = await POST(req({ name: 'Fondo A', bankId: 2 })) as any
    expect(res.status).toBe(201)
    expect(await res.json()).toEqual(investment)
  })

  it('nombre vacío → 400', async () => {
    const res = await POST(req({ name: '', bankId: 1 })) as any
    expect(res.status).toBe(400)
  })

  it('bankId ausente → 400', async () => {
    const res = await POST(req({ name: 'Fondo A' })) as any
    expect(res.status).toBe(400)
  })

  it('bankId no numérico → 400', async () => {
    const res = await POST(req({ name: 'Fondo A', bankId: 'abc' })) as any
    expect(res.status).toBe(400)
  })
})

// ── PATCH /api/investments/[id] ───────────────────────────────────────────────

describe('PATCH /api/investments/[id]', () => {
  it('actualiza nombre → 200', async () => {
    const investment = { id: 1, name: 'Nuevo nombre', bank: { name: 'BBVA' } }
    ;(prisma.investment.update as jest.Mock).mockResolvedValue(investment)

    const res = await PATCH(
      new Request('http://localhost', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Nuevo nombre' }) }),
      { params: fakeParams('1') }
    ) as any
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(investment)
  })

  it('sin campos → 400', async () => {
    const res = await PATCH(
      new Request('http://localhost', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) }),
      { params: fakeParams('1') }
    ) as any
    expect(res.status).toBe(400)
  })

  it('id no numérico → 400', async () => {
    const res = await PATCH(
      new Request('http://localhost', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'X' }) }),
      { params: fakeParams('abc') }
    ) as any
    expect(res.status).toBe(400)
  })

  it('inversión no encontrada → 404', async () => {
    ;(prisma.investment.update as jest.Mock).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Not found', { code: 'P2025' })
    )
    const res = await PATCH(
      new Request('http://localhost', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'X' }) }),
      { params: fakeParams('99') }
    ) as any
    expect(res.status).toBe(404)
  })
})

// ── DELETE /api/investments/[id] ──────────────────────────────────────────────

describe('DELETE /api/investments/[id]', () => {
  it('elimina inversión → 204', async () => {
    ;(prisma.investment.delete as jest.Mock).mockResolvedValue({})

    const res = await DELETE(new Request('http://localhost'), { params: fakeParams('1') }) as any
    expect(res.status).toBe(204)
  })

  it('id no numérico → 400', async () => {
    const res = await DELETE(new Request('http://localhost'), { params: fakeParams('abc') }) as any
    expect(res.status).toBe(400)
  })

  it('inversión no encontrada → 404', async () => {
    ;(prisma.investment.delete as jest.Mock).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Not found', { code: 'P2025' })
    )
    const res = await DELETE(new Request('http://localhost'), { params: fakeParams('99') }) as any
    expect(res.status).toBe(404)
  })
})
