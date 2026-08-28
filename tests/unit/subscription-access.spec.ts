import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  ACCESS_LEVEL_PRESENTATION,
  ACCESS_POLICY_NOTE,
  CAPACITY_UNIT_NOUN,
  CAPACITY_UNIT_TITLE,
  DERIVED_NOTE,
  HIDDEN_INSTEAD_OF_BROKEN_NOTE,
  RECALCULATE_CONFIRM_LABEL,
  RECALCULATE_CONSEQUENCE,
  SOURCE_PRESENTATION,
  STALE_AFTER_HOURS,
  capacityText,
  entitlementJustification,
  formatDateTime,
  justificationLinkLabel,
  parseLocalDateTime,
  recalculationHealth,
  recalculationSummary,
} from '@/features/subscriptions-admin/composables/entitlementText'
import { subscriptionRecordTabs } from '@/router/routes/subscriptions-admin.routes'
import type {
  CompanyCapacityResponse,
  CompanyEntitlementResponse,
} from '@/features/subscriptions-admin/types/entitlements.types'

function entitlement(
  overrides: Partial<CompanyEntitlementResponse> = {},
): CompanyEntitlementResponse {
  return {
    id: 1,
    companyId: 42,
    subModule: { id: 7, code: 'CLINICAL_HISTORY', name: 'Historia clínica' },
    accessLevel: 'FULL',
    source: 'SUBSCRIPTION',
    subscriptionId: 184,
    subscriptionItemId: 900,
    validFrom: '2026-03-01T00:00:00',
    validUntil: null,
    recalculatedAt: '2026-03-10T08:00:00',
    ...overrides,
  }
}

function capacity(overrides: Partial<CompanyCapacityResponse> = {}): CompanyCapacityResponse {
  return {
    id: 5,
    companyId: 42,
    // El eje ya no es un enum: es una fila del catálogo de dimensiones
    // (`limitDimensionId` + `dimensionCode`). Ver `entitlements.types.ts`.
    limitDimensionId: 1,
    dimensionCode: 'USER',
    measureKind: 'CONCURRENT',
    periodKey: null,
    limitQuantity: 10,
    usedQuantity: 7,
    exhausted: false,
    subscriptionId: 184,
    limitRecalculatedAt: '2026-03-10T08:00:00',
    usageReconciledAt: '2026-03-10T08:00:00',
    ...overrides,
  }
}

/**
 * La política de §3.4 es innegociable y no vive en un documento: vive donde
 * rompe el build. No existe ni existirá un estado de corte total de acceso, y un
 * moroso nunca pierde la consulta de su propia historia clínica.
 *
 * <p>Esta pantalla es la que más expuesta está: es una tabla de <b>niveles de
 * acceso</b>, y ahí la palabra equivocada se cuela sola. Por eso el barrido no se
 * queda en el módulo de textos —recorre también el marcado de la vista y de sus
 * dos componentes, que es donde acaban las frases que nadie exportó—.
 */
describe('el vocabulario de «Acceso» no sugiere un corte de acceso que no existe', () => {
  const PROHIBIDAS = [
    'bloquear',
    'bloquead',
    'suspender el acceso',
    'cortar',
    'desactivar la cuenta',
    'inhabilitar',
  ]

  const FUENTES = [
    '../../src/features/subscriptions-admin/views/record/SubscriptionAccessView.vue',
    '../../src/features/subscriptions-admin/components/record/EntitlementsTable.vue',
    '../../src/features/subscriptions-admin/components/record/CapacityMeters.vue',
    '../../src/features/subscriptions-admin/composables/entitlementText.ts',
  ]

  function textosExportados(): string[] {
    const textos: string[] = [
      DERIVED_NOTE,
      ACCESS_POLICY_NOTE,
      HIDDEN_INSTEAD_OF_BROKEN_NOTE,
      RECALCULATE_CONSEQUENCE,
      RECALCULATE_CONFIRM_LABEL,
      ...Object.values(CAPACITY_UNIT_TITLE),
      ...Object.values(CAPACITY_UNIT_NOUN),
      capacityText(capacity()),
      capacityText(capacity({ limitQuantity: null })),
      recalculationSummary({ entitlementCount: 12, manualGrantCount: 1, capacityCount: 3 }),
      justificationLinkLabel(entitlement()),
    ]
    for (const presentation of Object.values(ACCESS_LEVEL_PRESENTATION)) {
      textos.push(presentation.label, presentation.meaning)
    }
    for (const presentation of Object.values(SOURCE_PRESENTATION)) {
      textos.push(presentation.label, presentation.meaning)
    }
    for (const source of ['SUBSCRIPTION', 'TRIAL', 'CORE', 'MANUAL_GRANT'] as const) {
      textos.push(
        entitlementJustification(
          entitlement({ source, subscriptionId: null, subscriptionItemId: null }),
        ).text,
      )
    }
    for (const iso of [null, '2026-03-10T08:00:00', '2026-02-01T08:00:00']) {
      textos.push(recalculationHealth(iso, new Date(2026, 2, 10, 12, 0, 0)).note)
      textos.push(recalculationHealth(iso, new Date(2026, 2, 10, 12, 0, 0)).badgeLabel ?? '')
    }
    return textos
  }

  it.each(PROHIBIDAS)('ninguna frase exportada de «Acceso» dice «%s»', (palabra) => {
    for (const texto of textosExportados()) {
      expect(texto.toLowerCase()).not.toContain(palabra)
    }
  })

  it.each(PROHIBIDAS)('tampoco aparece en el marcado de la sub-vista: «%s»', (palabra) => {
    for (const ruta of FUENTES) {
      const fuente = readFileSync(fileURLToPath(new URL(ruta, import.meta.url)), 'utf8')
      expect(fuente.toLowerCase()).not.toContain(palabra)
    }
  })

  it('solo consulta promete por escrito la consulta y la impresión', () => {
    expect(ACCESS_LEVEL_PRESENTATION.READ_ONLY.meaning).toContain('Consulta e impresión activas')
    expect(ACCESS_LEVEL_PRESENTATION.READ_ONLY.meaning).toContain('No puede crear ni modificar')
  })

  it('la política dice que dar de baja no borra datos y nombra la historia clínica', () => {
    expect(ACCESS_POLICY_NOTE).toContain('nunca borra ni elimina datos')
    expect(ACCESS_POLICY_NOTE).toContain('historia clínica')
  })

  it('«No disponible» explica que los datos siguen ahí', () => {
    expect(ACCESS_LEVEL_PRESENTATION.NONE.meaning).toContain('Sus datos siguen ahí')
  })
})

/**
 * Los tres niveles y los cuatro orígenes llevan rótulo textual: ninguno se
 * comunica solo por color (§5.2). Es lo que permite leerle a un cliente por
 * teléfono lo que ve el operador.
 */
describe('ningún nivel ni origen se comunica solo por color', () => {
  it('los tres niveles llevan rótulo, y son los de §4.4.2', () => {
    expect(ACCESS_LEVEL_PRESENTATION.FULL.label).toBe('Uso normal')
    expect(ACCESS_LEVEL_PRESENTATION.READ_ONLY.label).toBe('Solo consulta')
    expect(ACCESS_LEVEL_PRESENTATION.NONE.label).toBe('No disponible')
  })

  it('los cuatro orígenes llevan rótulo, y son los de §4.4.2', () => {
    expect(SOURCE_PRESENTATION.SUBSCRIPTION.label).toBe('Contratado')
    expect(SOURCE_PRESENTATION.TRIAL.label).toBe('En prueba')
    expect(SOURCE_PRESENTATION.CORE.label).toBe('Núcleo')
    expect(SOURCE_PRESENTATION.MANUAL_GRANT.label).toBe('Concedido a mano')
  })

  it('«Concedido a mano» es el único origen que se destaca, porque es el único que no sale del contrato', () => {
    const destacados = Object.entries(SOURCE_PRESENTATION).filter(
      ([, presentation]) => presentation.variant === 'warning',
    )
    expect(destacados).toHaveLength(1)
    expect(destacados[0]?.[0]).toBe('MANUAL_GRANT')
  })
})

/**
 * `recalculatedAt` es un indicador de salud, no un adorno: si esta fecha se queda
 * vieja, hay un proceso caído. Los tres estados tienen que ser distinguibles, y
 * «no lo sé» no puede disfrazarse de «está al día».
 */
describe('el recálculo se lee como un indicador de salud', () => {
  const ahora = new Date(2026, 2, 10, 12, 0, 0)

  it('una fecha de hace unas horas está al día y no pone badge', () => {
    const salud = recalculationHealth('2026-03-10T08:00:00', ahora)
    expect(salud.state).toBe('fresh')
    expect(salud.hours).toBe(4)
    expect(salud.badgeLabel).toBeNull()
    expect(salud.note).toContain('Calculado hace 4 horas')
  })

  it('a las 24 h exactas ya está atrasado, que es el umbral de §4.4.2', () => {
    expect(STALE_AFTER_HOURS).toBe(24)
    const justo = recalculationHealth('2026-03-09T12:00:00', ahora)
    expect(justo.state).toBe('stale')
    expect(justo.badgeLabel).toBe('Recálculo atrasado')
    expect(justo.note).toContain('1 día')
    expect(justo.note).toContain('hay un proceso caído')

    const casi = recalculationHealth('2026-03-09T12:30:00', ahora)
    expect(casi.state).toBe('fresh')
  })

  it('sin fecha NO dice que esté al día: es su propio hallazgo', () => {
    const salud = recalculationHealth(null, ahora)
    expect(salud.state).toBe('unknown')
    expect(salud.hours).toBeNull()
    expect(salud.badgeLabel).toBe('Sin fecha de recálculo')
    expect(salud.note).toContain('mismo síntoma que una fecha vieja')
  })

  it('una fecha en el futuro no produce horas negativas', () => {
    expect(recalculationHealth('2026-03-11T00:00:00', ahora).hours).toBe(0)
  })

  it('el resumen del recálculo confirma por escrito que lo concedido a mano se conserva', () => {
    expect(
      recalculationSummary({ entitlementCount: 12, manualGrantCount: 2, capacityCount: 3 }),
    ).toBe('12 permisos · 3 capacidades · 2 concedidos a mano, conservados.')
    expect(
      recalculationSummary({ entitlementCount: 1, manualGrantCount: 1, capacityCount: 1 }),
    ).toBe('1 permiso · 1 capacidad · 1 concedido a mano, conservado.')
  })
})

/**
 * `LocalDateTime` de Java: sin zona y con hora. Medir la antigüedad con la parte
 * de fecha sola convertiría un recálculo de hace veinte minutos en uno de hace
 * medio día, que es justo el error que este indicador existe para no cometer.
 */
describe('la marca de tiempo del recálculo se lee con su hora y en local', () => {
  it('parsea la hora y no se corre de día', () => {
    const fecha = parseLocalDateTime('2026-03-10T20:30:15')
    expect(fecha?.getDate()).toBe(10)
    expect(fecha?.getHours()).toBe(20)
  })

  it('rechaza una fecha que el backend no pudo emitir en vez de correrla de mes', () => {
    expect(parseLocalDateTime('2026-02-31T10:00:00')).toBeNull()
    expect(parseLocalDateTime('no es una fecha')).toBeNull()
    expect(parseLocalDateTime(null)).toBeNull()
  })

  it('se pinta con el formato de fecha de §4 y la hora al lado', () => {
    expect(formatDateTime('2026-03-10T08:05:00')).toBe('10/03/2026 · 08:05')
    expect(formatDateTime(null)).toBe('—')
  })
})

/**
 * El puente de vuelta al dinero: cada fila sabe qué línea del contrato la
 * justifica. Y las que no tienen ninguna lo dicen, en vez de ofrecer un enlace
 * que no lleva a ninguna parte.
 */
describe('cada permiso dice qué lo justifica', () => {
  it('un permiso contratado apunta a su línea', () => {
    const justificacion = entitlementJustification(entitlement())
    expect(justificacion.kind).toBe('line')
    expect(justificacion.text).toBe('Línea #900')
  })

  it('sin línea pero con contrato, apunta al contrato', () => {
    const justificacion = entitlementJustification(
      entitlement({ source: 'TRIAL', subscriptionItemId: null }),
    )
    expect(justificacion.kind).toBe('contract')
    expect(justificacion.text).toBe('Contrato #184')
  })

  it('el núcleo y lo concedido a mano no ofrecen enlace, porque no hay línea detrás', () => {
    const core = entitlementJustification(
      entitlement({ source: 'CORE', subscriptionId: null, subscriptionItemId: null }),
    )
    expect(core.kind).toBe('none')
    expect(core.text).toContain('Núcleo del producto')

    const manual = entitlementJustification(
      entitlement({ source: 'MANUAL_GRANT', subscriptionId: null, subscriptionItemId: null }),
    )
    expect(manual.kind).toBe('none')
    expect(manual.text).toBe('No se deriva del contrato.')
  })

  it('el nombre accesible del enlace dice de qué submódulo es, no solo un número', () => {
    expect(justificationLinkLabel(entitlement())).toBe(
      'Línea 900 del contrato 184, que da acceso a Historia clínica',
    )
  })
})

describe('las capacidades se leen sin depender de la barra', () => {
  it('dice «7 de 10 usuarios» y no solo un porcentaje', () => {
    expect(capacityText(capacity())).toBe('7 de 10 usuarios')
  })

  it('un límite nulo no se pinta como un límite de cero', () => {
    expect(capacityText(capacity({ limitQuantity: null }))).toBe(
      '7 usuarios · sin límite declarado',
    )
  })

  it('un contador sin uso declarado cuenta cero, no «—»', () => {
    expect(capacityText(capacity({ usedQuantity: null }))).toBe('0 de 10 usuarios')
  })

  it('nombra en castellano los ejes que sabe traducir', () => {
    expect(capacityText(capacity({ dimensionCode: 'BRANCH' }))).toContain('sedes')
    expect(capacityText(capacity({ dimensionCode: 'TERMINAL' }))).toContain('terminales de caja')
    expect(capacityText(capacity({ dimensionCode: 'STORAGE_GB' }))).toContain(
      'GB de almacenamiento',
    )
  })

  /**
   * <b>El eje dejó de ser un enum cerrado.</b> El backend borró `CapacityUnit.java` y las
   * dimensiones pasaron a ser datos, así que el servidor puede sembrar un eje nuevo sin
   * desplegar nada. Indexando el `Record` cerrado, ese eje se pintaba «7 de 10 undefined»:
   * sin excepción, sin aviso en consola y sin nada roto que mirar — el operador simplemente
   * leía una palabra inglesa donde iba el sustantivo.
   */
  it('un eje que esta consola no sabe traducir se pinta con su código, nunca «undefined»', () => {
    const texto = capacityText(capacity({ dimensionCode: 'APPOINTMENTS_PER_MONTH' }))
    expect(texto).toBe('7 de 10 APPOINTMENTS_PER_MONTH')
    expect(texto).not.toContain('undefined')
  })
})

describe('«Acceso» se registra como la cuarta sub-vista del expediente', () => {
  it('aparece con el segmento, el nombre de ruta y el orden acordados en §4.4.2', () => {
    const tab = subscriptionRecordTabs.find((candidate) => candidate.segment === 'acceso')
    expect(tab).toBeDefined()
    expect(tab?.routeName).toBe('subscription-record-acceso')
    expect(tab?.label).toBe('Acceso')
    expect(tab?.order).toBe(4)
  })
})
