import { describe, expect, it } from 'vitest'
import { formatAmount, formatMoney } from '@/composables/format'

/**
 * <b>La política de moneda de la consola, en una sola regla, sujeta por pruebas.</b>
 *
 * <p>Convivían tres: importe sin símbolo (25 ficheros), importe con «COP» a fuego
 * (21) y un `Intl.NumberFormat` con la divisa real (2). El reparto no seguía
 * ninguna regla, así que el mismo total del mismo documento salía `179.000,00` en
 * la cola de cobranza y `$ 179.000,00` en conciliación, y las pestañas «Lo
 * contratado» y «Dinero» del mismo expediente discrepaban a un clic de distancia.
 *
 * <p>La regla vigente: <b>si el DTO trae `currency`, `formatMoney`; si no lo
 * trae, `formatAmount`</b> —y entonces la pantalla no declara la divisa en ningún
 * otro sitio, tampoco en la cabecera de la columna, porque «Total (COP)» sobre un
 * importe cuya divisa el contrato no declara es la misma invención que el «$»,
 * solo que desplazada a donde se revisa menos.
 */
describe('formatAmount: la divisa que el contrato no declara no se inventa', () => {
  it('imprime la cifra sin ningún símbolo de moneda', () => {
    const texto = formatAmount(179000)
    expect(texto).not.toContain('$')
    expect(texto).not.toContain('COP')
    expect(texto).toContain('179')
  })

  it('siempre dos decimales, que es lo que una pantalla contable necesita cuadrar', () => {
    expect(formatAmount(179000)).toMatch(/,00$/)
  })

  it('un importe ausente cae en el guion del sistema de diseño', () => {
    expect(formatAmount(null)).toBe('—')
    expect(formatAmount(undefined)).toBe('—')
  })

  it('acepta el BigDecimal serializado como cadena, que es como llega en algún DTO', () => {
    expect(formatAmount('179000')).toBe(formatAmount(179000))
  })

  it('un valor roto no se imprime como cero: cae en el hueco', () => {
    expect(formatAmount('no es un número')).toBe('—')
    expect(formatAmount(Number.NaN)).toBe('—')
  })

  it('respeta el texto de vacío que pida la pantalla', () => {
    expect(formatAmount(null, '')).toBe('')
  })
})

describe('formatMoney: la divisa que el contrato SÍ declara se rotula, y la de verdad', () => {
  it('los pesos llevan su símbolo', () => {
    expect(formatMoney(179000, 'COP')).toContain('$')
  })

  it('una divisa distinta no se disfraza de pesos', () => {
    // El defecto que esto cierra: en una lista en dólares el simulador de
    // escalera decía `US$ 50,00` y el precio de excedente `$ 50,00`, en la misma
    // pantalla y para el mismo artículo.
    const dolares = formatMoney(1200, 'USD')
    const pesos = formatMoney(1200, 'COP')
    expect(dolares).not.toBe(pesos)
    expect(dolares).toContain('US$')
  })

  it('sin código de divisa no se inventa uno: cae a la cifra desnuda', () => {
    expect(formatMoney(179000, null)).toBe(formatAmount(179000))
    expect(formatMoney(179000, '   ')).toBe(formatAmount(179000))
  })

  it('un importe ausente cae en el guion aunque haya divisa', () => {
    expect(formatMoney(null, 'COP')).toBe('—')
  })

  it('la cifra es la MISMA con símbolo y sin él: solo cambia el rótulo', () => {
    // Esto no es una obviedad: `Intl` da a COP cero decimales por CLDR, así que
    // el `formatCurrency` anterior imprimía `$ 179.000` mientras el importe sin
    // símbolo del mismo documento imprimía `179.000,00`. Las dos políticas
    // discrepaban también en la cifra, no solo en el símbolo.
    expect(formatMoney(179000, 'COP')).toContain(formatAmount(179000))
    expect(formatMoney(179000.456, 'COP')).toContain(formatAmount(179000.456))
  })
})
