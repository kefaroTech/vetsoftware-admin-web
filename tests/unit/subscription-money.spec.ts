import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  DUPLICATE_PAYMENT_MESSAGE,
  MONEY_INTRO_NOTE,
  MONEY_VERBS,
  PAYMENT_INDEPENDENCE_NOTE,
  PAYMENT_STARTS_PENDING_NOTE,
  SIGN_CONVENTION_NOTE,
  accruedSummary,
  accruedTotals,
  chargeAmountClass,
  chargeAmountReading,
  chargeOriginLabel,
  collectedSummary,
  collectedTotals,
  correctionChainText,
  countsAsCollected,
  documentBalanceReading,
  prorationFraction,
  prorationGap,
  voidBadgeLabel,
} from '@/features/subscriptions-admin/composables/subscriptionMoneyText'
import {
  CHARGE_STATUS_PRESENTATION,
  CHARGE_TYPE_PRESENTATION,
  DOCUMENT_KIND_PRESENTATION,
  ISSUE_STATUS_LABEL,
  ISSUE_STATUS_VARIANT,
} from '@/features/subscriptions-admin/types/subscription-money.types'
import { subscriptionRecordTabs } from '@/router/routes/subscriptions-admin.routes'
import type { SubscriptionChargeResponse } from '@/features/subscriptions-admin/types/subscription-money.types'
import type {
  BillingDocumentResponse,
  SubscriptionPaymentResponse,
} from '@/features/billing-operations/types/billing-operations.types'

/**
 * Lee un fichero del repositorio por su ruta relativa a la raíz.
 *
 * <p>`resolve(__dirname, …)` y no `fileURLToPath(new URL(…, import.meta.url))`:
 * el segundo no resuelve de forma fiable en todas las fases de Vitest —falla con
 * «The URL must be of scheme file» según dónde se evalúe— y esta suite lo usa en
 * cuatro sitios. Es el mismo mecanismo que ya emplea `api-contract.spec.ts`.
 */
const root = resolve(__dirname, '..', '..')
const leer = (rel: string): string => readFileSync(join(root, rel), 'utf8')

function charge(overrides: Partial<SubscriptionChargeResponse> = {}): SubscriptionChargeResponse {
  return {
    id: 500,
    subscriptionId: 184,
    subscriptionItemId: 900,
    chargeType: 'RECURRING',
    description: 'Núcleo + agenda',
    servicePeriodStart: '2026-03-01',
    servicePeriodEnd: '2026-03-31',
    quantity: 1,
    unitAmount: 145000,
    subtotalAmount: 145000,
    taxRate: 0,
    taxTreatment: 'EXCLUDED',
    prorationDays: null,
    periodDays: null,
    status: 'INVOICED',
    amendmentId: null,
    billingDocumentId: 7,
    voidsChargeId: null,
    createdDate: '2026-03-01T00:05:00',
    ...overrides,
  }
}

function document(overrides: Partial<BillingDocumentResponse> = {}): BillingDocumentResponse {
  return {
    id: 7,
    companyId: 42,
    documentNumber: 'DC-2026-00184',
    subscriptionId: 184,
    documentKind: 'INVOICE',
    billingReason: 'RECURRING_CYCLE',
    periodStart: '2026-03-01',
    periodEnd: '2026-03-31',
    issueStatus: 'AWAITING_EXTERNAL',
    externalInvoiceNumber: null,
    externalCufe: null,
    externalIssuedAt: null,
    externalProvider: null,
    externalRegisteredAt: null,
    externalRegisteredBySystemUserId: null,
    correctsDocumentId: null,
    dueDate: '2026-04-10',
    subtotalAmount: 179000,
    taxAmount: 0,
    totalAmount: 179000,
    settledAmount: 0,
    balanceAmount: 179000,
    taxes: [],
    createdDate: '2026-04-01T00:05:00',
    version: 0,
    ...overrides,
  }
}

function payment(
  overrides: Partial<SubscriptionPaymentResponse> = {},
): SubscriptionPaymentResponse {
  return {
    id: 30,
    companyId: 42,
    amount: 179000,
    currency: 'COP',
    paymentMethod: 'TRANSFER',
    gateway: null,
    gatewayReference: null,
    receivedAt: '2026-04-05T10:00:00',
    status: 'CONFIRMED',
    reconciledAt: null,
    createdDate: '2026-04-05T10:05:00',
    version: 0,
    ...overrides,
  }
}

/**
 * <b>La fracción del prorrateo es el requisito duro de §3.3.</b> El modelo avisa
 * de que sin `prorationDays` y `periodDays` «un prorrateo no se puede
 * reconstruir: se ve el importe pero no de dónde salió, y explicárselo a un
 * cliente que reclama pasa a ser un ejercicio de arqueología».
 */
describe('un prorrateo se lee como fracción, no como dos columnas numéricas', () => {
  it('dice «18 de 31 días» y su porcentaje, que es lo que se lee por teléfono', () => {
    const fraccion = prorationFraction(
      charge({ chargeType: 'PRORATION', prorationDays: 18, periodDays: 31 }),
    )
    expect(fraccion?.fraction).toBe('18 de 31 días')
    expect(fraccion?.percent).toBe(58)
    expect(fraccion?.sentence).toBe(
      'Se cobraron 18 de 31 días del periodo, el 58 % de la cuota completa.',
    )
  })

  it('concuerda el singular: «1 de 1 día», no «1 de 1 días»', () => {
    expect(prorationFraction(charge({ prorationDays: 1, periodDays: 1 }))?.fraction).toBe(
      '1 de 1 día',
    )
  })

  it('un periodo de cero días no produce una división por cero pintada en una factura', () => {
    expect(prorationFraction(charge({ prorationDays: 18, periodDays: 0 }))).toBeNull()
    expect(prorationFraction(charge({ prorationDays: 18, periodDays: -5 }))).toBeNull()
  })

  it('un recurrente no tiene fracción y ese hueco NO se denuncia: cubre el periodo entero', () => {
    const recurrente = charge({ chargeType: 'RECURRING' })
    expect(prorationFraction(recurrente)).toBeNull()
    expect(prorationGap(recurrente)).toBe('')
  })

  it('un PRORATION sin sus días sí se denuncia, en vez de dejar la celda en blanco', () => {
    const roto = charge({ chargeType: 'PRORATION', prorationDays: null, periodDays: null })
    expect(prorationGap(roto)).toContain('no trae sus días')
    expect(prorationGap(roto)).toContain('no de dónde salió')
  })
})

/**
 * La convención de signos de §3.5 es la que hace que las cuentas cierren: un cargo
 * de anulación es negativo y sumado al original da cero, con los dos en el
 * expediente. Pintarlo como un error, o quitarle el signo, rompe eso.
 */
describe('el signo de un cargo es información, no un defecto', () => {
  it('un cargo corriente suma y no se tiñe de nada', () => {
    const lectura = chargeAmountReading(charge())
    expect(lectura.amount).toBe('145.000,00')
    expect(lectura.sentence).toContain('Suma')
    expect(chargeAmountClass(charge())).toBe('')
  })

  it('una anulación es negativa, lo dice y nombra al cargo que anula', () => {
    const anulacion = charge({ id: 501, subtotalAmount: -145000, voidsChargeId: 500 })
    const lectura = chargeAmountReading(anulacion)
    expect(lectura.amount).toBe('−145.000,00')
    expect(lectura.sentence).toContain('anula el cargo #500')
    expect(lectura.sentence).toContain('sumando cero')
    expect(chargeAmountClass(anulacion)).toBe('ds-amount--neg')
    expect(voidBadgeLabel(anulacion)).toBe('Anula el cargo #500')
  })

  it('el color no viaja solo: el signo «−» ya está en la cifra y hay rótulo textual', () => {
    const anulacion = charge({ subtotalAmount: -1000, voidsChargeId: 500, status: 'VOIDED' })
    expect(chargeAmountReading(anulacion).amount.startsWith('−')).toBe(true)
    expect(CHARGE_STATUS_PRESENTATION.VOIDED.label).toBe('Anulado')
    expect(voidBadgeLabel(anulacion)).not.toBe('')
  })

  it('los importes de cargo van SIN símbolo de moneda: el contrato no declara divisa', () => {
    expect(chargeAmountReading(charge()).amount).not.toContain('$')
  })

  it('una nota crédito NO se pinta como deuda: su signo lo da el tipo, no un menos', () => {
    for (const presentacion of Object.values(DOCUMENT_KIND_PRESENTATION)) {
      expect(presentacion.label).not.toContain('-')
    }
    expect(DOCUMENT_KIND_PRESENTATION.CREDIT_NOTE.label).toBe('Nota crédito')
    expect(DOCUMENT_KIND_PRESENTATION.CREDIT_NOTE.meaning).toContain('en positivo')
  })
})

/**
 * Devengar · facturar · cobrar. La pantalla existe para no fundirlos, y el módulo
 * de textos es donde esa separación deja de ser una intención.
 */
describe('los tres verbos del dinero están nombrados y separados', () => {
  it('son tres, con su verbo y su bloque', () => {
    expect(MONEY_VERBS.map((verb) => verb.verb)).toEqual(['Devengar', 'Facturar', 'Cobrar'])
    expect(MONEY_VERBS.map((verb) => verb.block)).toEqual(['Devengado', 'Facturado', 'Cobrado'])
  })

  it('la portada dice las dos cosas que se confunden', () => {
    expect(MONEY_INTRO_NOTE).toContain('no es una factura')
    expect(MONEY_INTRO_NOTE).toContain('no es dinero recibido')
  })

  it('un cargo pendiente se rotula «devengado, sin facturar» y no «pendiente» a secas', () => {
    expect(CHARGE_STATUS_PRESENTATION.PENDING.label).toBe('Devengado, sin facturar')
    expect(CHARGE_STATUS_PRESENTATION.INVOICED.meaning).toContain('Facturado no es cobrado')
  })

  it('la convención de signos se declara en pantalla, no solo en el código', () => {
    expect(SIGN_CONVENTION_NOTE).toContain('negativo')
    expect(SIGN_CONVENTION_NOTE).toContain('siempre positivos')
  })
})

describe('lo devengado se cuenta por estados y nunca en un total único', () => {
  const filas = [
    charge({ id: 1, status: 'PENDING', subtotalAmount: 34000 }),
    charge({ id: 2, status: 'PENDING', subtotalAmount: 6000 }),
    charge({ id: 3, status: 'INVOICED', subtotalAmount: 145000 }),
    charge({ id: 4, status: 'VOIDED', subtotalAmount: -145000, voidsChargeId: 3 }),
  ]

  it('separa lo que todavía no está en ninguna cuenta de cobro de lo que ya lo está', () => {
    const totales = accruedTotals(filas)
    expect(totales.pendingAmount).toBe(40000)
    expect(totales.pendingCount).toBe(2)
    expect(totales.invoicedAmount).toBe(145000)
    expect(totales.invoicedCount).toBe(1)
    expect(totales.voidedCount).toBe(1)
  })

  it('los anulados se cuentan aparte y no se restan otra vez: ya vienen en negativo', () => {
    const totales = accruedTotals(filas)
    expect(totales.pendingAmount + totales.invoicedAmount).toBe(185000)
  })

  it('el resumen nombra los tres y concuerda el singular', () => {
    const resumen = accruedSummary(accruedTotals(filas))
    expect(resumen).toContain('2 cargos devengados sin facturar')
    expect(resumen).toContain('1 ya facturado')
    expect(resumen).toContain('1 anulado')
    const uno = accruedSummary(accruedTotals([charge({ status: 'PENDING' })]))
    expect(uno).toContain('1 cargo devengado sin facturar')
  })

  it('sin anulados no se inventa un «0 anulados» en la frase', () => {
    expect(accruedSummary(accruedTotals([charge({ status: 'PENDING' })]))).not.toContain('anulado')
  })
})

/**
 * Solo los pagos confirmados cuentan como cobro. Sumar un pendiente al total es
 * cómo una cuenta morosa se ve al día mientras el banco no ha abonado nada.
 */
describe('solo los pagos confirmados cuentan como cobro', () => {
  it('confirmado sí; pendiente, fallido y devuelto no', () => {
    expect(countsAsCollected(payment({ status: 'CONFIRMED' }))).toBe(true)
    expect(countsAsCollected(payment({ status: 'PENDING' }))).toBe(false)
    expect(countsAsCollected(payment({ status: 'FAILED' }))).toBe(false)
    expect(countsAsCollected(payment({ status: 'REFUNDED' }))).toBe(false)
  })

  it('el total suma solo los confirmados y dice cuántos deja fuera', () => {
    const totales = collectedTotals([
      payment({ id: 1, status: 'CONFIRMED', amount: 100000 }),
      payment({ id: 2, status: 'PENDING', amount: 79000 }),
      payment({ id: 3, status: 'FAILED', amount: 50000 }),
    ])
    expect(totales.confirmedAmount).toBe(100000)
    expect(totales.confirmedCount).toBe(1)
    expect(totales.notCountedCount).toBe(2)
  })

  it('el resumen NO omite en silencio los que no cuentan', () => {
    const resumen = collectedSummary(
      collectedTotals([payment({ id: 1 }), payment({ id: 2, status: 'PENDING' })]),
    )
    expect(resumen).toContain('1 pago confirmado')
    expect(resumen).toContain('Otros 1 registrados no cuentan')
  })

  it('sin pagos sueltos, el resumen no añade una coletilla vacía', () => {
    expect(collectedSummary(collectedTotals([payment()]))).toBe('1 pago confirmado por 179.000,00.')
  })

  it('el conflicto de pasarela + referencia se dice en castellano de negocio', () => {
    expect(DUPLICATE_PAYMENT_MESSAGE).toContain('ya estaba registrado')
    expect(DUPLICATE_PAYMENT_MESSAGE).not.toContain('restricción única')
    expect(DUPLICATE_PAYMENT_MESSAGE.toLowerCase()).not.toContain('constraint')
  })

  it('el alta advierte de lo que NO hace y de que el pago nace pendiente', () => {
    expect(PAYMENT_INDEPENDENCE_NOTE).toContain('no lo aplica a ninguna cuenta de cobro')
    expect(PAYMENT_STARTS_PENDING_NOTE).toContain('no cuenta como cobro')
  })
})

/**
 * Facturar no es cobrar, y un documento emitido con su saldo entero no está
 * pagado por mucho que exista y esté numerado.
 */
describe('un documento dice cuánto queda por cobrar, no solo su total', () => {
  it('sin abonos lo dice con esas palabras', () => {
    expect(documentBalanceReading(document()).sentence).toContain('Sin ningún abono')
  })

  it('abonado en parte enseña las dos cifras, no solo el saldo', () => {
    const lectura = documentBalanceReading(
      document({ settledAmount: 100000, balanceAmount: 79000 }),
    )
    expect(lectura.sentence).toContain('100.000,00')
    expect(lectura.sentence).toContain('179.000,00')
    expect(lectura.amount).toBe('79.000,00')
  })

  it('saldado se llama saldado', () => {
    expect(
      documentBalanceReading(document({ settledAmount: 179000, balanceAmount: 0 })).sentence,
    ).toContain('Saldado')
  })

  it('la cadena de corrección se ve, y dice que el original NO se modificó', () => {
    expect(correctionChainText(document())).toBe('')
    const nota = document({ documentKind: 'CREDIT_NOTE', correctsDocumentId: 7 })
    expect(correctionChainText(nota)).toContain('Corrige al documento #7')
    expect(correctionChainText(nota)).toContain('no se modificó')
  })
})

/**
 * Los rótulos del estado de emisión son los de W1-E, literales. §4.5 dice de esos
 * mapas que «ya son correctos y no se cambian», y esta prueba es lo que impide que
 * la copia se separe del original sin que nadie se entere: dos rótulos distintos
 * para el mismo estado en dos pantallas de la misma consola es cómo un operador
 * acaba creyendo que son dos cosas.
 */
describe('los rótulos del estado de emisión no se han separado de los de cobranza', () => {
  // Se lee dentro del `it` y no en el cuerpo del `describe`: en la fase de
  // recolección de Vitest, `import.meta.url` no es todavía una URL `file:` y
  // `fileURLToPath` revienta la suite entera antes de ejecutar nada. Es el mismo
  // sitio donde lo hace `subscription-access.spec.ts`.
  const fuente = () => leer('src/features/billing-operations/components/BillingDocumentsTable.vue')

  it.each(Object.entries(ISSUE_STATUS_LABEL))(
    '«%s» se rotula igual que en W1-E',
    (estado, label) => {
      expect(fuente()).toContain(`${estado}: '${label}'`)
    },
  )

  it.each(Object.entries(ISSUE_STATUS_VARIANT))(
    '«%s» usa el mismo tono que en W1-E',
    (estado, variant) => {
      expect(fuente()).toContain(`${estado}: '${variant}'`)
    },
  )
})

/**
 * La política de §3.4 es innegociable y no vive en un documento: vive donde rompe
 * el build. No existe ni existirá un corte total de acceso, y una pantalla de
 * cobranza es donde más fácil se cuela la palabra equivocada — es justo donde
 * alguien tiene la tentación de escribir «si no paga, se bloquea».
 */
describe('el vocabulario del dinero no sugiere un corte de acceso que no existe', () => {
  const PROHIBIDAS = [
    'bloquear',
    'bloquead',
    'suspender el acceso',
    'cortar',
    'desactivar la cuenta',
    'inhabilitar',
  ]

  const FUENTES = [
    'src/features/subscriptions-admin/views/record/SubscriptionMoneyView.vue',
    'src/features/subscriptions-admin/components/record/SubscriptionChargesTable.vue',
    'src/features/subscriptions-admin/components/record/SubscriptionDocumentsTable.vue',
    'src/features/subscriptions-admin/components/record/SubscriptionPaymentsTable.vue',
    'src/features/subscriptions-admin/components/record/ChargeChain.vue',
    'src/features/subscriptions-admin/components/record/PaymentForm.vue',
    'src/features/subscriptions-admin/components/record/PaymentRecord.vue',
    'src/features/subscriptions-admin/components/record/RegisterPaymentModal.vue',
    'src/features/subscriptions-admin/composables/subscriptionMoneyText.ts',
    'src/features/subscriptions-admin/types/subscription-money.types.ts',
  ]

  function textosExportados(): string[] {
    const textos: string[] = [
      MONEY_INTRO_NOTE,
      SIGN_CONVENTION_NOTE,
      DUPLICATE_PAYMENT_MESSAGE,
      PAYMENT_INDEPENDENCE_NOTE,
      PAYMENT_STARTS_PENDING_NOTE,
      chargeOriginLabel(charge()),
      prorationGap(charge({ chargeType: 'PRORATION' })),
      correctionChainText(document({ correctsDocumentId: 7 })),
      documentBalanceReading(document()).sentence,
      chargeAmountReading(charge({ subtotalAmount: -1, voidsChargeId: 9 })).sentence,
      accruedSummary(accruedTotals([charge()])),
      collectedSummary(collectedTotals([payment()])),
    ]
    for (const verb of MONEY_VERBS) textos.push(verb.verb, verb.meaning, verb.block)
    for (const p of Object.values(CHARGE_TYPE_PRESENTATION)) textos.push(p.label, p.meaning)
    for (const p of Object.values(CHARGE_STATUS_PRESENTATION)) textos.push(p.label, p.meaning)
    for (const p of Object.values(DOCUMENT_KIND_PRESENTATION)) textos.push(p.label, p.meaning)
    return textos
  }

  it.each(PROHIBIDAS)('ninguna frase exportada de «Dinero» dice «%s»', (palabra) => {
    for (const texto of textosExportados()) {
      expect(texto.toLowerCase()).not.toContain(palabra)
    }
  })

  it.each(PROHIBIDAS)('tampoco aparece en el marcado de la sub-vista: «%s»', (palabra) => {
    for (const ruta of FUENTES) {
      expect(leer(ruta).toLowerCase()).not.toContain(palabra)
    }
  })
})

describe('«Dinero» se registra como la quinta sub-vista del expediente', () => {
  it('aparece con el segmento, el nombre de ruta y el orden acordados en §4.4.2', () => {
    const tab = subscriptionRecordTabs.find((candidate) => candidate.segment === 'dinero')
    expect(tab).toBeDefined()
    expect(tab?.routeName).toBe('subscription-record-dinero')
    expect(tab?.label).toBe('Dinero')
    expect(tab?.order).toBe(5)
  })

  it('el banner de cuenta vencida ya puede ofrecer «Registrar pago» sin dejar una ruta rota', () => {
    const fuente = leer(
      'src/features/subscriptions-admin/components/record/SubscriptionStatusBanner.vue',
    )
    expect(fuente).toContain("segment === 'dinero'")
    expect(subscriptionRecordTabs.some((tab) => tab.segment === 'dinero')).toBe(true)
  })
})
