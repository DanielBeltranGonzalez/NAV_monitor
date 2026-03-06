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
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    bank: {
      findUnique: jest.fn(),
    },
  },
}))

jest.mock('@/lib/auth', () => ({
  getSessionUser: jest.fn().mockResolvedValue({ id: 1, email: 'test@test.com', role: 'ADMIN' }),
}))

// ── Helpers ──────────────────────────────────────────────────────────────────

const { Prisma } = jest.requireMock('@prisma/client')
const { getSessionUser } = jest.requireMock('@/lib/auth')

function req(body: unknown, method = 'POST') {
  return new Request('http://localhost/api/investments', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function patchReq(body: unknown) {
  return new Request('http://localhost/api/investments/1', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const fakeParams = (id: string) => Promise.resolve({ id })
const fakeInvestment = { id: 1, name: 'Fondo A', comment: null, bankId: 2, userId: 1, bank: { name: 'BBVA' } }

// ── GET /api/investments ──────────────────────────────────────────────────────

describe('GET /api/investments', () => {
  it('sin sesión → 401', async () => {
    getSessionUser.mockResolvedValueOnce(null)
    const res = await GET(new Request('http://localhost/api/investments')) as any
    expect(res.status).toBe(401)
  })

  it('devuelve lista de inversiones → 200', async () => {
    const investments = [{ ...fakeInvestment, values: [] }]
    ;(prisma.investment.findMany as jest.Mock).mockResolvedValue(investments)

    const res = await GET(new Request('http://localhost/api/investments')) as any
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(investments)
  })
})

// ── POST /api/investments ─────────────────────────────────────────────────────

describe('POST /api/investments', () => {
  it('sin sesión → 401', async () => {
    getSessionUser.mockResolvedValueOnce(null)
    const res = await POST(req({ name: 'Fondo A', bankId: 2 })) as any
    expect(res.status).toBe(401)
  })

  it('crea inversión válida → 201', async () => {
    ;(prisma.bank.findUnique as jest.Mock).mockResolvedValue({ id: 2, userId: 1 })
    ;(prisma.investment.create as jest.Mock).mockResolvedValue(fakeInvestment)

    const res = await POST(req({ name: 'Fondo A', bankId: 2 })) as any
    expect(res.status).toBe(201)
    expect(await res.json()).toEqual(fakeInvestment)
  })

  it('nombre vacío → 400', async () => {
    const res = await POST(req({ name: '', bankId: 1 })) as any
    expect(res.status).toBe(400)
  })

  it('nombre mayor de 255 caracteres → 400', async () => {
    const res = await POST(req({ name: 'F'.repeat(256), bankId: 1 })) as any
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

  it('crea inversión con comment → comment se persiste', async () => {
    ;(prisma.bank.findUnique as jest.Mock).mockResolvedValue({ id: 2, userId: 1 })
    ;(prisma.investment.create as jest.Mock).mockResolvedValue({ ...fakeInvestment, comment: 'mi nota' })

    const res = await POST(req({ name: 'Fondo A', bankId: 2, comment: 'mi nota' })) as any
    expect(res.status).toBe(201)
    expect(prisma.investment.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ comment: 'mi nota' }) })
    )
  })

  it('comment vacío → se guarda como null', async () => {
    ;(prisma.bank.findUnique as jest.Mock).mockResolvedValue({ id: 2, userId: 1 })
    ;(prisma.investment.create as jest.Mock).mockResolvedValue(fakeInvestment)

    await POST(req({ name: 'Fondo A', bankId: 2, comment: '' }))
    expect(prisma.investment.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ comment: null }) })
    )
  })

  it('comment de solo espacios → se guarda como null', async () => {
    ;(prisma.bank.findUnique as jest.Mock).mockResolvedValue({ id: 2, userId: 1 })
    ;(prisma.investment.create as jest.Mock).mockResolvedValue(fakeInvestment)

    await POST(req({ name: 'Fondo A', bankId: 2, comment: '   ' }))
    expect(prisma.investment.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ comment: null }) })
    )
  })

  it('comment mayor de 1000 chars → se trunca a 1000', async () => {
    ;(prisma.bank.findUnique as jest.Mock).mockResolvedValue({ id: 2, userId: 1 })
    ;(prisma.investment.create as jest.Mock).mockResolvedValue(fakeInvestment)

    await POST(req({ name: 'Fondo A', bankId: 2, comment: 'X'.repeat(1001) }))
    expect(prisma.investment.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ comment: 'X'.repeat(1000) }) })
    )
  })
})

// ── PATCH /api/investments/[id] ───────────────────────────────────────────────

describe('PATCH /api/investments/[id]', () => {
  it('sin sesión → 401', async () => {
    getSessionUser.mockResolvedValueOnce(null)
    const res = await PATCH(patchReq({ name: 'X' }), { params: fakeParams('1') }) as any
    expect(res.status).toBe(401)
  })

  it('actualiza nombre → 200', async () => {
    ;(prisma.investment.findUnique as jest.Mock).mockResolvedValue(fakeInvestment)
    const updated = { ...fakeInvestment, name: 'Nuevo nombre' }
    ;(prisma.investment.update as jest.Mock).mockResolvedValue(updated)

    const res = await PATCH(patchReq({ name: 'Nuevo nombre' }), { params: fakeParams('1') }) as any
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(updated)
  })

  it('nombre mayor de 255 caracteres → 400', async () => {
    const res = await PATCH(patchReq({ name: 'X'.repeat(256) }), { params: fakeParams('1') }) as any
    expect(res.status).toBe(400)
  })

  it('sin campos → 400', async () => {
    const res = await PATCH(patchReq({}), { params: fakeParams('1') }) as any
    expect(res.status).toBe(400)
  })

  it('id no numérico → 400', async () => {
    const res = await PATCH(patchReq({ name: 'X' }), { params: fakeParams('abc') }) as any
    expect(res.status).toBe(400)
  })

  it('inversión no encontrada → 404', async () => {
    ;(prisma.investment.findUnique as jest.Mock).mockResolvedValue(null)
    const res = await PATCH(patchReq({ name: 'X' }), { params: fakeParams('99') }) as any
    expect(res.status).toBe(404)
  })

  it('inversión de otro usuario → 403', async () => {
    ;(prisma.investment.findUnique as jest.Mock).mockResolvedValue({ ...fakeInvestment, userId: 99 })
    const res = await PATCH(patchReq({ name: 'X' }), { params: fakeParams('1') }) as any
    expect(res.status).toBe(403)
  })

  it('actualiza solo comment → 200', async () => {
    ;(prisma.investment.findUnique as jest.Mock).mockResolvedValue(fakeInvestment)
    const updated = { ...fakeInvestment, comment: 'nueva nota' }
    ;(prisma.investment.update as jest.Mock).mockResolvedValue(updated)

    const res = await PATCH(patchReq({ comment: 'nueva nota' }), { params: fakeParams('1') }) as any
    expect(res.status).toBe(200)
    expect(prisma.investment.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ comment: 'nueva nota' }) })
    )
  })

  it('comment null en body → se borra', async () => {
    ;(prisma.investment.findUnique as jest.Mock).mockResolvedValue(fakeInvestment)
    ;(prisma.investment.update as jest.Mock).mockResolvedValue({ ...fakeInvestment, comment: null })

    const res = await PATCH(patchReq({ comment: null }), { params: fakeParams('1') }) as any
    expect(res.status).toBe(200)
    expect(prisma.investment.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ comment: null }) })
    )
  })

  it('comment vacío en body → se borra', async () => {
    ;(prisma.investment.findUnique as jest.Mock).mockResolvedValue(fakeInvestment)
    ;(prisma.investment.update as jest.Mock).mockResolvedValue({ ...fakeInvestment, comment: null })

    await PATCH(patchReq({ comment: '' }), { params: fakeParams('1') })
    expect(prisma.investment.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ comment: null }) })
    )
  })

  it('body sin clave comment → comment no se incluye en data', async () => {
    ;(prisma.investment.findUnique as jest.Mock).mockResolvedValue(fakeInvestment)
    ;(prisma.investment.update as jest.Mock).mockResolvedValue(fakeInvestment)

    await PATCH(patchReq({ name: 'Nuevo nombre' }), { params: fakeParams('1') })
    const callData = (prisma.investment.update as jest.Mock).mock.calls.at(-1)[0].data
    expect(callData).not.toHaveProperty('comment')
  })

  it('comment mayor de 1000 chars en PATCH → se trunca a 1000', async () => {
    ;(prisma.investment.findUnique as jest.Mock).mockResolvedValue(fakeInvestment)
    ;(prisma.investment.update as jest.Mock).mockResolvedValue(fakeInvestment)

    await PATCH(patchReq({ comment: 'X'.repeat(1001) }), { params: fakeParams('1') })
    expect(prisma.investment.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ comment: 'X'.repeat(1000) }) })
    )
  })
})

// ── DELETE /api/investments/[id] ──────────────────────────────────────────────

describe('DELETE /api/investments/[id]', () => {
  it('sin sesión → 401', async () => {
    getSessionUser.mockResolvedValueOnce(null)
    const res = await DELETE(new Request('http://localhost'), { params: fakeParams('1') }) as any
    expect(res.status).toBe(401)
  })

  it('elimina inversión → 204', async () => {
    ;(prisma.investment.findUnique as jest.Mock).mockResolvedValue(fakeInvestment)
    ;(prisma.investment.delete as jest.Mock).mockResolvedValue({})

    const res = await DELETE(new Request('http://localhost'), { params: fakeParams('1') }) as any
    expect(res.status).toBe(204)
  })

  it('id no numérico → 400', async () => {
    const res = await DELETE(new Request('http://localhost'), { params: fakeParams('abc') }) as any
    expect(res.status).toBe(400)
  })

  it('inversión no encontrada → 404', async () => {
    ;(prisma.investment.findUnique as jest.Mock).mockResolvedValue(null)
    const res = await DELETE(new Request('http://localhost'), { params: fakeParams('99') }) as any
    expect(res.status).toBe(404)
  })

  it('inversión de otro usuario → 403', async () => {
    ;(prisma.investment.findUnique as jest.Mock).mockResolvedValue({ ...fakeInvestment, userId: 99 })
    const res = await DELETE(new Request('http://localhost'), { params: fakeParams('1') }) as any
    expect(res.status).toBe(403)
  })
})
