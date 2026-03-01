import { formatEUR, formatDate, formatChangePercent } from '@/lib/formatters'

// Normaliza espacios (incluye no-rompibles U+00A0) para comparaciones
const norm = (s: string) => s.replace(/\u00a0/g, ' ').trim()

describe('formatEUR', () => {
  it('incluye el símbolo €', () => {
    expect(formatEUR(1234.56)).toContain('€')
  })
  it('positivo no lleva signo negativo', () => {
    expect(formatEUR(100)).not.toContain('-')
  })
  it('negativo lleva signo -', () => {
    expect(formatEUR(-500)).toContain('-')
  })
  it('redondea a 2 decimales — 1.999 → 2,00', () => {
    expect(norm(formatEUR(1.999))).toMatch(/2[,.]00/)
  })
  it('cero devuelve 0,00 €', () => {
    expect(norm(formatEUR(0))).toMatch(/0[,.]00/)
  })
})

describe('formatDate', () => {
  it('contiene día, mes y año del string ISO', () => {
    const result = formatDate('2024-01-15')
    expect(result).toContain('15')
    expect(result).toContain('01')
    expect(result).toContain('2024')
  })
  it('acepta objeto Date', () => {
    const result = formatDate(new Date('2024-06-30T00:00:00Z'))
    expect(result).toContain('30')
    expect(result).toContain('06')
    expect(result).toContain('2024')
  })
})

describe('formatChangePercent', () => {
  it('positivo lleva signo +', () => {
    expect(formatChangePercent(5.5)).toBe('+5.50%')
  })
  it('negativo lleva signo -', () => {
    expect(formatChangePercent(-3.2)).toBe('-3.20%')
  })
  it('cero lleva signo +', () => {
    expect(formatChangePercent(0)).toBe('+0.00%')
  })
})
