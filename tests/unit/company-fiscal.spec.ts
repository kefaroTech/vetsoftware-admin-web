import { describe, expect, it } from 'vitest'
import {
  COMPANY_DOCUMENT_TYPE_LABEL,
  ELECTRONIC_DOCUMENT_TYPE_LABEL,
  RESOLUTION_EXPIRY_WARNING_DAYS,
  TAX_PROFILE_HISTORY_GAP,
  formatCompanyDocument,
  formatResolutionRange,
  formatWithholdingRate,
  isNaturalPerson,
  resolutionUsage,
  resolutionWarnings,
  resolutionsSummaryText,
} from '@/features/companies/composables/companyFiscalText'
import fiscalTab from '@/features/companies/views/record/fiscal.tab'
import datosPersonalesTab from '@/features/companies/views/record/datos-personales.tab'
import type {
  CompanyTaxProfileResponse,
  NumberingResolutionResponse,
} from '@/features/companies/types/company-fiscal.types'

/**
 * Las cuentas de la pestaña «Fiscal» (§I7).
 *
 * <p>Lo que se barre aquí no es formato: es el <b>signo</b> de dos cuentas cuyo
 * error se ve por primera vez el día en que una clínica no puede facturar. El
 * `currentNumber` del contrato es el PRÓXIMO consecutivo a emitir —lo dice el
 * dominio del backend— y leerlo como «el último emitido» desplaza en uno tanto lo
 * emitido como lo que queda. Sobre un rango de cinco mil eso no se nota; sobre el
 * último número sí, y es exactamente cuando importa.
 */

function resolution(
  overrides: Partial<NumberingResolutionResponse> = {},
): NumberingResolutionResponse {
  return {
    id: 7,
    company: { id: 42, name: 'Spa Ana Pet', identifier: '900123456' },
    branchId: null,
    documentType: 'FE_VENTA',
    resolutionNumber: '18764000001234',
    resolutionDate: '2026-01-15',
    prefix: 'FA',
    rangeFrom: 1,
    rangeTo: 5000,
    validFrom: '2026-01-15',
    validTo: '2027-01-15',
    technicalKey: null,
    currentNumber: 1,
    createdDate: '2026-01-15T10:00:00',
    enabled: true,
    ...overrides,
  }
}

function profile(overrides: Partial<CompanyTaxProfileResponse> = {}): CompanyTaxProfileResponse {
  return {
    id: 3,
    company: { id: 42, name: 'Spa Ana Pet', identifier: '900123456' },
    companyDocumentType: 'NIT',
    companyDocumentId: '900123456',
    companyDocumentVerificationDigit: '7',
    legalName: 'SPA ANA PET S.A.S.',
    taxRegime: 'RESPONSABLE_IVA',
    fiscalEmail: 'contabilidad@spaanapet.co',
    commercialName: 'Spa Ana Pet',
    economicActivity: null,
    responsibilities: [],
    createdDate: '2026-01-10T09:00:00',
    enabled: true,
    ...overrides,
  }
}

const HOY = new Date(2026, 5, 1) // 1 de junio de 2026, medianoche local

describe('resolutionUsage · el signo de las dos cuentas', () => {
  it('una resolución recién creada no ha emitido nada y conserva el rango entero', () => {
    // `create` inicializa `currentNumber` en `rangeFrom`: cero emitidos, no uno.
    const usage = resolutionUsage(resolution({ rangeFrom: 1, rangeTo: 5000, currentNumber: 1 }))
    expect(usage.capacity).toBe(5000)
    expect(usage.issued).toBe(0)
    expect(usage.remaining).toBe(5000)
  })

  it('con el próximo igual al último del rango queda UN número, no cero', () => {
    // El caso que decide si el aviso llega a tiempo. Leer `currentNumber` como
    // «el último emitido» daría cero aquí y la pantalla diría «agotada» sobre una
    // resolución con la que todavía se puede emitir una factura.
    const usage = resolutionUsage(resolution({ rangeFrom: 1, rangeTo: 5000, currentNumber: 5000 }))
    expect(usage.issued).toBe(4999)
    expect(usage.remaining).toBe(1)
  })

  it('un rango de un solo número se cuenta como uno, no como cero', () => {
    const usage = resolutionUsage(resolution({ rangeFrom: 900, rangeTo: 900, currentNumber: 900 }))
    expect(usage.capacity).toBe(1)
    expect(usage.remaining).toBe(1)
  })

  it('un dato a la deriva se acota en vez de producir números negativos', () => {
    // Un rango recortado por debajo de lo ya emitido. No debería darse, pero si
    // se da, «quedan −40 números» es peor que el problema.
    const usage = resolutionUsage(resolution({ rangeFrom: 1, rangeTo: 100, currentNumber: 140 }))
    expect(usage.issued).toBe(100)
    expect(usage.remaining).toBe(0)
  })

  it('cuenta los días hasta la caducidad y marca la ya caducada', () => {
    expect(resolutionUsage(resolution({ validTo: '2026-06-11' }), HOY).daysLeft).toBe(10)
    expect(resolutionUsage(resolution({ validTo: '2026-06-01' }), HOY).daysLeft).toBe(0)
    expect(resolutionUsage(resolution({ validTo: '2026-06-01' }), HOY).expired).toBe(false)

    const caducada = resolutionUsage(resolution({ validTo: '2026-05-31' }), HOY)
    expect(caducada.daysLeft).toBe(-1)
    expect(caducada.expired).toBe(true)
  })

  it('una fecha que el backend no pudo emitir deja los días en nulo, no en cero', () => {
    // Un cero se leería como «caduca hoy», que es una alarma falsa; nulo se lee
    // como «no se sabe» y la resolución se va al final de la lista.
    const usage = resolutionUsage(resolution({ validTo: '2026-02-31' }), HOY)
    expect(usage.daysLeft).toBeNull()
    expect(usage.expired).toBe(false)
  })
})

describe('resolutionWarnings · los dos relojes suenan por separado', () => {
  it('no avisa de nada cuando queda rango y queda tiempo', () => {
    const usage = resolutionUsage(resolution({ currentNumber: 100, validTo: '2027-01-15' }), HOY)
    expect(resolutionWarnings(usage)).toEqual([])
  })

  it('avisa de la caducidad dentro de la ventana y no antes', () => {
    const dentro = resolutionUsage(resolution({ validTo: '2026-06-25' }), HOY)
    expect(resolutionWarnings(dentro).some((a) => a.includes('Caduca en 24 días'))).toBe(true)

    const fuera = resolutionUsage(
      resolution({ validTo: `2026-08-01` }), // 61 días > la ventana
      HOY,
    )
    expect(fuera.daysLeft).toBeGreaterThan(RESOLUTION_EXPIRY_WARNING_DAYS)
    expect(resolutionWarnings(fuera)).toEqual([])
  })

  it('dice «día» en singular cuando queda uno', () => {
    const usage = resolutionUsage(resolution({ validTo: '2026-06-02' }), HOY)
    expect(resolutionWarnings(usage)[0]).toContain('Caduca en 1 día.')
  })

  it('los dos avisos conviven: una resolución puede caducar Y estar agotándose', () => {
    const usage = resolutionUsage(
      resolution({ validTo: '2026-06-10', rangeFrom: 1, rangeTo: 100, currentNumber: 96 }),
      HOY,
    )
    const avisos = resolutionWarnings(usage)
    expect(avisos).toHaveLength(2)
    expect(avisos[0]).toContain('Caduca en 9 días')
    expect(avisos[1]).toContain('Quedan 5 números de 100')
  })

  it('la caducada y la agotada se dicen como bloqueos, no como avisos de tiempo', () => {
    const usage = resolutionUsage(
      resolution({ validTo: '2026-05-01', rangeFrom: 1, rangeTo: 100, currentNumber: 140 }),
      HOY,
    )
    const avisos = resolutionWarnings(usage)
    expect(avisos[0]).toContain('ya caducó')
    expect(avisos[1]).toContain('no queda ningún número')
  })
})

describe('los textos que se leen por teléfono', () => {
  it('el resumen de la sección distingue ninguna, ninguna urgente y varias urgentes', () => {
    expect(resolutionsSummaryText(0, 0)).toContain('no tiene ninguna resolución')
    expect(resolutionsSummaryText(1, 0)).toBe(
      '1 resolución, ninguna a punto de caducar ni de agotarse.',
    )
    expect(resolutionsSummaryText(3, 1)).toBe('3 resoluciones, 1 necesita atención.')
    expect(resolutionsSummaryText(3, 2)).toBe('3 resoluciones, 2 necesitan atención.')
  })

  it('el documento lleva el dígito de verificación pegado, y nunca un guion suelto', () => {
    expect(formatCompanyDocument(profile())).toBe('NIT 900123456-7')
    expect(
      formatCompanyDocument(
        profile({
          companyDocumentType: 'CEDULA_CIUDADANIA',
          companyDocumentId: '1020304050',
          companyDocumentVerificationDigit: null,
        }),
      ),
    ).toBe('Cédula de ciudadanía 1020304050')
  })

  it('el rango se lee con su prefijo, y sin él cuando no lo tiene', () => {
    expect(formatResolutionRange(resolution())).toBe('FA 1 – 5000')
    expect(formatResolutionRange(resolution({ prefix: null }))).toBe('1 – 5000')
  })

  it('los cuatro tipos de documento y los cuatro de resolución tienen rótulo', () => {
    expect(Object.values(COMPANY_DOCUMENT_TYPE_LABEL).every((l) => l.length > 0)).toBe(true)
    expect(Object.values(ELECTRONIC_DOCUMENT_TYPE_LABEL).every((l) => l.length > 0)).toBe(true)
  })
})

describe('isNaturalPerson · decide si falta un dato que no se rellena hacia atrás', () => {
  it('los tres documentos de persona natural lo son, y el NIT no', () => {
    expect(isNaturalPerson('CEDULA_CIUDADANIA')).toBe(true)
    expect(isNaturalPerson('CEDULA_EXTRANJERIA')).toBe(true)
    expect(isNaturalPerson('PASAPORTE')).toBe(true)
    expect(isNaturalPerson('NIT')).toBe(false)
  })
})

describe('formatWithholdingRate · el ICA va por mil, no por ciento', () => {
  it('conserva la unidad que le pasa quien la conoce', () => {
    expect(formatWithholdingRate(2.5, '%')).toBe('2,5 %')
    expect(formatWithholdingRate(9.66, '‰')).toBe('9,66 ‰')
  })

  it('una tarifa ausente devuelve nulo y NO un cero', () => {
    // Un «0 %» pintado por defecto se lee como «no retiene», que es una
    // afirmación distinta de «nadie lo ha declarado».
    expect(formatWithholdingRate(null, '%')).toBeNull()
    expect(formatWithholdingRate(undefined, '%')).toBeNull()
    expect(formatWithholdingRate(0, '%')).toBe('0 %')
  })
})

describe('las dos pestañas de este lote', () => {
  it('«Fiscal» ya no está pendiente y apunta a su propia vista', () => {
    expect(fiscalTab.segment).toBe('fiscal')
    expect(fiscalTab.routeName).toBe('company-record-fiscal')
    expect(fiscalTab.order).toBe(6)
    expect(fiscalTab.pending).toBeUndefined()
  })

  it('«Datos personales» sigue pendiente y dice por qué, sin pintar un solo número', () => {
    // Es el caso que R14 gobierna: no hay endpoint, así que la pestaña declara el
    // impedimento en vez de maquetar una tabla vacía que se leería como «esta
    // clínica no tiene ninguna autorización».
    expect(datosPersonalesTab.order).toBe(8)
    expect(datosPersonalesTab.pending?.spec).toBe('I9')
    expect(datosPersonalesTab.pending?.blockedBy).toContain('data_subject_requests')
    expect(datosPersonalesTab.pending?.blockedBy).toContain('festivos')
  })

  it('el hueco del perfil fiscal nombra la trampa: aquí no se ofrece «editar»', () => {
    expect(TAX_PROFILE_HISTORY_GAP.trap).toContain('editar')
    expect(TAX_PROFILE_HISTORY_GAP.blockedBy).toContain('CompanyTaxProfileResponse')
  })
})
