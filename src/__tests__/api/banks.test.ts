import { GET, POST } from '@/app/api/banks/route'
import { PATCH, DELETE } from '@/app/api/banks/[id]/route'
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
    bank: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}))

jest.mock('@/lib/auth', () => ({
  getSessionUser: jest.fn().mockResolvedValue({ id: 1, email: 'test@test.com' }),
}))

// ── Helpers ──────────────────────────────────────────────────────────────────

const { Prisma } = jest.requireMock('@prisma/client')

function req(body: unknown, method = 'POST') {
  return new Request('http://localhost/api/banks', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function reqWithParams(body: unknown, method = 'PATCH') {
  return new Request('http://localhost/api/banks/1', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const fakeParams = (id: string) => Promise.resolve({ id })
const fakeBank = { id: 1, name: 'Bankinter', userId: 1 }

// ── GET /api/banks ────────────────────────────────────────────────────────────

describe('GET /api/banks', () => {
  it('devuelve lista de bancos', async () => {
    const banks = [fakeBank]
    ;(prisma.bank.findMany as jest.Mock).mockResolvedValue(banks)

    const res = await GET(new Request('http://localhost/api/banks')) as any
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(banks)
  })
})

// ── POST /api/banks ───────────────────────────────────────────────────────────

describe('POST /api/banks', () => {
  it('crea banco con nombre válido → 201', async () => {
    ;(prisma.bank.create as jest.Mock).mockResolvedValue(fakeBank)

    const res = await POST(req({ name: 'Bankinter' })) as any
    expect(res.status).toBe(201)
    expect(await res.json()).toEqual(fakeBank)
  })

  it('nombre vacío → 400', async () => {
    const res = await POST(req({ name: '' })) as any
    expect(res.status).toBe(400)
  })

  it('nombre ausente → 400', async () => {
    const res = await POST(req({})) as any
    expect(res.status).toBe(400)
  })

  it('nombre duplicado → 409', async () => {
    ;(prisma.bank.create as jest.Mock).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique', { code: 'P2002' })
    )
    const res = await POST(req({ name: 'Bankinter' })) as any
    expect(res.status).toBe(409)
  })
})

// ── PATCH /api/banks/[id] ─────────────────────────────────────────────────────

describe('PATCH /api/banks/[id]', () => {
  it('actualiza nombre → 200', async () => {
    ;(prisma.bank.findUnique as jest.Mock).mockResolvedValue(fakeBank)
    ;(prisma.bank.update as jest.Mock).mockResolvedValue({ ...fakeBank, name: 'Sabadell' })

    const res = await PATCH(reqWithParams({ name: 'Sabadell' }), { params: fakeParams('1') }) as any
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ...fakeBank, name: 'Sabadell' })
  })

  it('id no numérico → 400', async () => {
    const res = await PATCH(reqWithParams({ name: 'X' }), { params: fakeParams('abc') }) as any
    expect(res.status).toBe(400)
  })

  it('nombre vacío → 400', async () => {
    ;(prisma.bank.findUnique as jest.Mock).mockResolvedValue(fakeBank)
    const res = await PATCH(reqWithParams({ name: '' }), { params: fakeParams('1') }) as any
    expect(res.status).toBe(400)
  })

  it('banco no encontrado → 404', async () => {
    ;(prisma.bank.findUnique as jest.Mock).mockResolvedValue(null)
    const res = await PATCH(reqWithParams({ name: 'X' }), { params: fakeParams('99') }) as any
    expect(res.status).toBe(404)
  })

  it('banco de otro usuario → 403', async () => {
    ;(prisma.bank.findUnique as jest.Mock).mockResolvedValue({ ...fakeBank, userId: 99 })
    const res = await PATCH(reqWithParams({ name: 'X' }), { params: fakeParams('1') }) as any
    expect(res.status).toBe(403)
  })

  it('nombre duplicado → 409', async () => {
    ;(prisma.bank.findUnique as jest.Mock).mockResolvedValue(fakeBank)
    ;(prisma.bank.update as jest.Mock).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique', { code: 'P2002' })
    )
    const res = await PATCH(reqWithParams({ name: 'Bankinter' }), { params: fakeParams('1') }) as any
    expect(res.status).toBe(409)
  })
})

// ── DELETE /api/banks/[id] ────────────────────────────────────────────────────

describe('DELETE /api/banks/[id]', () => {
  it('elimina banco → 204', async () => {
    ;(prisma.bank.findUnique as jest.Mock).mockResolvedValue(fakeBank)
    ;(prisma.bank.delete as jest.Mock).mockResolvedValue({})

    const res = await DELETE(new Request('http://localhost'), { params: fakeParams('1') }) as any
    expect(res.status).toBe(204)
  })

  it('id no numérico → 400', async () => {
    const res = await DELETE(new Request('http://localhost'), { params: fakeParams('abc') }) as any
    expect(res.status).toBe(400)
  })

  it('banco no encontrado → 404', async () => {
    ;(prisma.bank.findUnique as jest.Mock).mockResolvedValue(null)
    const res = await DELETE(new Request('http://localhost'), { params: fakeParams('99') }) as any
    expect(res.status).toBe(404)
  })

  it('banco de otro usuario → 403', async () => {
    ;(prisma.bank.findUnique as jest.Mock).mockResolvedValue({ ...fakeBank, userId: 99 })
    const res = await DELETE(new Request('http://localhost'), { params: fakeParams('1') }) as any
    expect(res.status).toBe(403)
  })

  it('banco con inversiones → 409', async () => {
    ;(prisma.bank.findUnique as jest.Mock).mockResolvedValue(fakeBank)
    ;(prisma.bank.delete as jest.Mock).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('FK', { code: 'P2003' })
    )
    const res = await DELETE(new Request('http://localhost'), { params: fakeParams('1') }) as any
    expect(res.status).toBe(409)
  })
})
