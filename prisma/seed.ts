import { PrismaClient } from '@prisma/client'
import bcryptjs from 'bcryptjs'

const prisma = new PrismaClient()

// Fechas de referencia (hoy = 2026-02-28)
const D = (y: number, m: number, d: number) =>
  new Date(Date.UTC(y, m - 1, d))

const DATES = {
  prevYear:   D(2025, 12, 31),  // fin año anterior  → columna "vs Año ant."
  prevMonth:  D(2026,  1, 31),  // fin mes anterior  → columna "vs Mes ant."
  prev:       D(2026,  2, 15),  // entrada anterior  → columna "vs Anterior"
  current:    D(2026,  2, 28),  // hoy
}

async function main() {
  // Limpiar datos anteriores
  await prisma.investmentValue.deleteMany()
  await prisma.investment.deleteMany()
  await prisma.bank.deleteMany()
  await prisma.user.deleteMany()

  // ── Usuario de prueba ─────────────────────────────────────────────────────
  const user = await prisma.user.create({
    data: {
      email: 'test@test.com',
      passwordHash: await bcryptjs.hash('password123', 12),
    },
  })

  // ── Bancos ────────────────────────────────────────────────────────────────
  const [bbva, santander, myinvestor] = await Promise.all([
    prisma.bank.create({ data: { name: 'BBVA', userId: user.id } }),
    prisma.bank.create({ data: { name: 'Santander', userId: user.id } }),
    prisma.bank.create({ data: { name: 'MyInvestor', userId: user.id } }),
  ])

  // ── Inversiones + valores ─────────────────────────────────────────────────
  const investments: {
    name: string
    bankId: number
    values: Record<keyof typeof DATES, number>
  }[] = [
    {
      name: 'Fondo Mixto Global',
      bankId: bbva.id,
      values: { prevYear: 9_800, prevMonth: 10_200, prev: 10_350, current: 10_432.56 },
    },
    {
      name: 'Renta Variable Europa',
      bankId: bbva.id,
      values: { prevYear: 15_400, prevMonth: 16_100, prev: 15_980, current: 16_340 },
    },
    {
      name: 'Fondo Indexado SP500',
      bankId: santander.id,
      values: { prevYear: 22_000, prevMonth: 23_500, prev: 24_100, current: 24_876.30 },
    },
    {
      name: 'Depósito Estructurado',
      bankId: santander.id,
      values: { prevYear: 5_000, prevMonth: 5_000, prev: 5_025, current: 5_025 },
    },
    {
      name: 'Cartera Indexada Global',
      bankId: myinvestor.id,
      values: { prevYear: 31_200, prevMonth: 33_400, prev: 33_100, current: 34_215.80 },
    },
    {
      name: 'Plan de Pensiones Dinámico',
      bankId: myinvestor.id,
      values: { prevYear: 18_600, prevMonth: 19_200, prev: 19_450, current: 19_380 },
    },
  ]

  for (const inv of investments) {
    const created = await prisma.investment.create({
      data: { name: inv.name, bankId: inv.bankId, userId: user.id },
    })

    await prisma.investmentValue.createMany({
      data: Object.entries(inv.values).map(([key, value]) => ({
        investmentId: created.id,
        date: DATES[key as keyof typeof DATES],
        value: String(value),
      })),
    })
  }

  console.log('✅ Seed completado:')
  console.log(`   1 usuario (test@test.com / password123)`)
  console.log(`   3 bancos | ${investments.length} inversiones | ${investments.length * 4} valores`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
