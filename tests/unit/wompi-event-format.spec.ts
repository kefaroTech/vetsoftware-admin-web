import { describe, expect, it } from 'vitest'
import { prettyWompiBody } from '@/features/billing-operations/composables/wompiEventFormat'

/**
 * El cuerpo crudo de un webhook de Wompi es un `string` en el contrato;
 * El panel de detalle lo formatea como JSON legible. Probado aparte del modal
 * Para no tener que montar el componente solo para verificar el formateo.
 */
describe('prettyWompiBody formatea el cuerpo crudo del webhook', () => {
  it('indenta un JSON válido', () => {
    const raw = '{"transactionId":"123","status":"APPROVED"}'
    expect(prettyWompiBody(raw)).toBe(
      JSON.stringify({ transactionId: '123', status: 'APPROVED' }, null, 2),
    )
  })

  it('devuelve el texto tal cual cuando no es JSON válido', () => {
    expect(prettyWompiBody('no es json')).toBe('no es json')
  })

  it('devuelve un guion cuando no hay cuerpo', () => {
    expect(prettyWompiBody(null)).toBe('—')
  })
})
