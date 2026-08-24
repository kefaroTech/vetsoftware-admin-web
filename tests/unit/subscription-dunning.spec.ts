import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  DUNNING_CHANNEL_LABEL,
  DUNNING_EVENT_LABEL,
} from '@/features/billing-operations/types/billing-operations.types'
import {
  ANNOTATABLE_EVENT_OPTIONS,
  ANNOTATABLE_EVENT_TYPES,
  CHANNEL_OPTIONS,
  EVENT_TYPE_MEANING,
  LEDGER_SEAL,
  MAX_DETAIL_LENGTH,
  NO_CHANNEL_LABEL,
  PURPOSE_NOTE,
  WRITE_OFF_ACCESS_NOTE,
  WRITE_OFF_CONFIRM_LABEL,
  WRITE_OFF_MEANING,
  WRITE_OFF_RECOVERY_NOTE,
  WRITE_OFF_TITLE,
  annotatedLateText,
  channelTally,
  daysBetween,
  dunningEvidence,
  gapText,
  overdueText,
  reactivationSignal,
  toDateTimeInput,
  toRecordRequest,
  validateChannel,
  validateDaysOverdue,
  validateDetail,
  validateOccurredAt,
  validateWriteOffReason,
  writtenOffAt,
} from '@/features/subscriptions-admin/composables/dunningRecordText'
import { subscriptionRecordTabs } from '@/router/routes/subscriptions-admin.routes'
import type {
  DunningEventResponse,
  DunningEventType,
} from '@/features/subscriptions-admin/types/dunning-record.types'

let nextId = 1

function event(
  eventType: DunningEventType,
  occurredAt: string,
  overrides: Partial<DunningEventResponse> = {},
): DunningEventResponse {
  return {
    id: nextId++,
    companyId: 42,
    subscription: {
      id: 184,
      companyId: 42,
      subscriptionNumber: 'SUS-2026-00184',
      status: 'ACTIVE',
    },
    billingDocument: null,
    eventType,
    daysOverdue: null,
    channel: null,
    detail: null,
    occurredAt,
    createdDate: occurredAt,
    ...overrides,
  }
}

/**
 * La política de §3.4 es innegociable y no vive en un documento: vive donde rompe
 * el build. No existe ni existirá un estado que le quite a una empresa la
 * consulta de su propia información, y un moroso nunca pierde su historia
 * clínica.
 *
 * <p>Esta pantalla es la más expuesta de las seis: es <b>literalmente</b> la de
 * la cobranza, y es donde la palabra equivocada se cuela sola. Por eso el barrido
 * no se queda en el módulo de textos —recorre también el marcado de la vista y de
 * sus tres componentes, que es donde acaban las frases que nadie exportó—, igual
 * que hizo W2-D con «Acceso».
 */
describe('el vocabulario de «Cobranza» no sugiere un corte de acceso que no existe', () => {
  const PROHIBIDAS = [
    'bloquear',
    'bloquead',
    'suspender',
    'cortar',
    'corte de acceso',
    'desactivar la cuenta',
    'inhabilitar',
  ]

  const FUENTES = [
    '../../src/features/subscriptions-admin/views/record/SubscriptionDunningView.vue',
    '../../src/features/subscriptions-admin/components/record/DunningTimeline.vue',
    '../../src/features/subscriptions-admin/components/record/RecordDunningEventModal.vue',
    '../../src/features/subscriptions-admin/components/record/WriteOffDunningModal.vue',
    '../../src/features/subscriptions-admin/composables/dunningRecordText.ts',
  ]

  function fuente(ruta: string): string {
    return readFileSync(fileURLToPath(new URL(ruta, import.meta.url)), 'utf8')
  }

  function textosExportados(): string[] {
    return [
      LEDGER_SEAL,
      PURPOSE_NOTE,
      NO_CHANNEL_LABEL,
      WRITE_OFF_TITLE,
      WRITE_OFF_MEANING,
      WRITE_OFF_ACCESS_NOTE,
      WRITE_OFF_RECOVERY_NOTE,
      WRITE_OFF_CONFIRM_LABEL,
      ...Object.values(EVENT_TYPE_MEANING),
      // Los rótulos son de W1-E y esta pantalla los reutiliza tal cual: si allí
      // se colara la palabra equivocada, aquí también, así que se barren aquí.
      ...Object.values(DUNNING_EVENT_LABEL),
      ...Object.values(DUNNING_CHANNEL_LABEL),
      ...ANNOTATABLE_EVENT_OPTIONS.map((option) => option.label),
      ...CHANNEL_OPTIONS.map((option) => option.label),
      overdueText(null),
      overdueText(0),
      overdueText(12),
      validateChannel('REMINDER_SENT', ''),
      validateDetail(''),
      validateWriteOffReason(''),
      validateOccurredAt(''),
      validateDaysOverdue('doce'),
    ]
  }

  it.each(PROHIBIDAS)('ninguna frase exportada de «Cobranza» dice «%s»', (palabra) => {
    for (const texto of textosExportados()) {
      expect(texto.toLowerCase()).not.toContain(palabra)
    }
  })

  it.each(PROHIBIDAS)('ninguna frase de la evidencia dice «%s»', (palabra) => {
    const escenarios = [
      [],
      [event('REMINDER_SENT', '2026-03-03T10:00:00', { channel: 'EMAIL' })],
      [
        event('REMINDER_SENT', '2026-03-03T10:00:00', { channel: 'EMAIL' }),
        event('READ_ONLY_APPLIED', '2026-03-15T09:00:00'),
      ],
      [event('READ_ONLY_APPLIED', '2026-03-15T09:00:00')],
    ]
    for (const escenario of escenarios) {
      const evidencia = dunningEvidence(escenario)
      expect(evidencia.headline.toLowerCase()).not.toContain(palabra)
      expect(evidencia.detail.toLowerCase()).not.toContain(palabra)
      expect((evidencia.badgeLabel ?? '').toLowerCase()).not.toContain(palabra)
    }
  })

  it.each(PROHIBIDAS)('tampoco aparece en el fuente en crudo: «%s»', (palabra) => {
    for (const ruta of FUENTES) {
      expect(fuente(ruta).toLowerCase()).not.toContain(palabra)
    }
  })

  it('«Pasó a solo lectura» es el rótulo, y su significado promete la consulta y la impresión', () => {
    expect(DUNNING_EVENT_LABEL.READ_ONLY_APPLIED).toBe('Pasó a solo lectura')
    expect(EVENT_TYPE_MEANING.READ_ONLY_APPLIED).toContain('conserva la consulta y la impresión')
    expect(EVENT_TYPE_MEANING.READ_ONLY_APPLIED).toContain('historia clínica')
    expect(EVENT_TYPE_MEANING.READ_ONLY_APPLIED).toContain('máximo grado de restricción que existe')
  })

  it('dar de baja contable dice por escrito que no toca el acceso de la empresa', () => {
    expect(WRITE_OFF_ACCESS_NOTE).toContain('No cambia nada de lo que la empresa puede usar')
    expect(WRITE_OFF_ACCESS_NOTE).toContain('consulta e impresión')
  })
})

/**
 * La bitácora solo se inserta: el backend no expone `PUT` ni `DELETE`. Que eso se
 * note en la pantalla no es una preferencia — «Editar» ofrecido y deshabilitado
 * promete una operación que no existe.
 */
describe('el expediente se lee como lo que es: una bitácora que no se edita', () => {
  /**
   * <b>El marcado, no el fichero entero.</b> Lo que se afirma aquí es lo que se
   * pinta, y los comentarios que explican por qué «Editar» no está tienen que
   * poder nombrarlo. Barrer el fichero completo haría fallar la prueba por su
   * propia documentación — el mismo tropiezo que evita mirar solo el
   * `<template>`.
   */
  function marcado(ruta: string): string {
    const fuente = readFileSync(fileURLToPath(new URL(ruta, import.meta.url)), 'utf8')
    return fuente.slice(fuente.indexOf('<template>'), fuente.indexOf('<style'))
  }

  const timeline = '../../src/features/subscriptions-admin/components/record/DunningTimeline.vue'
  const vista = '../../src/features/subscriptions-admin/views/record/SubscriptionDunningView.vue'

  it('la línea de tiempo no tiene ni un campo, ni deshabilitado ni de ningún otro tipo', () => {
    const marcadoTimeline = marcado(timeline)
    expect(marcadoTimeline).not.toContain('<input')
    expect(marcadoTimeline).not.toContain('disabled')
  })

  it('«Editar» no está en el marcado de la sub-vista, ni gris ni oculto', () => {
    expect(marcado(timeline)).not.toContain('Editar')
    expect(marcado(vista)).not.toContain('Editar')
  })

  it('los hechos van en <dl> y en <ol>, que es lo que hace el orden legible sin ARIA', () => {
    expect(marcado(timeline)).toContain('<dl')
    expect(marcado(timeline)).toContain('<ol')
  })

  it('el sello dice que un hito mal anotado se corrige anotando otro', () => {
    expect(LEDGER_SEAL).toContain('no se editan ni se borran')
    expect(LEDGER_SEAL).toContain('se corrige anotando otro')
  })
})

/**
 * La razón de ser de la tabla, según el modelo: demostrar que se avisó antes de
 * restringir la cuenta. La pantalla no deja esa conclusión para que el lector la
 * arme fila a fila — la calcula y la escribe.
 */
describe('la secuencia responde «¿se avisó antes de restringir la cuenta?»', () => {
  it('sin ningún hito lo dice, y no se disfraza de «todo en orden»', () => {
    const evidencia = dunningEvidence([])
    expect(evidencia.state).toBe('empty')
    expect(evidencia.badgeLabel).toBe('Sin ningún hito')
    expect(evidencia.detail).toContain('única prueba de que se avisó')
  })

  it('con avisos previos cuenta cuántos, y dice cuánto margen se dio', () => {
    const evidencia = dunningEvidence([
      event('REMINDER_SENT', '2026-03-03T10:00:00', { channel: 'EMAIL' }),
      event('REMINDER_SENT', '2026-03-08T10:00:00', { channel: 'WHATSAPP' }),
      event('GRACE_STARTED', '2026-03-10T00:00:00'),
      event('READ_ONLY_APPLIED', '2026-03-15T09:00:00'),
      event('REACTIVATED', '2026-03-20T11:00:00'),
    ])
    expect(evidencia.state).toBe('warned')
    expect(evidencia.badgeLabel).toBeNull()
    expect(evidencia.headline).toBe('Se avisó 2 veces antes de pasar a solo lectura.')
    expect(evidencia.detail).toContain('03/03/2026 · 10:00')
    expect(evidencia.detail).toContain('15/03/2026 · 09:00')
    expect(evidencia.detail).toContain('12 días después')
  })

  it('un solo aviso se cuenta en singular', () => {
    const evidencia = dunningEvidence([
      event('REMINDER_SENT', '2026-03-14T10:00:00', { channel: 'PHONE' }),
      event('READ_ONLY_APPLIED', '2026-03-15T09:00:00'),
    ])
    expect(evidencia.headline).toBe('Se avisó 1 vez antes de pasar a solo lectura.')
    expect(evidencia.detail).toContain('1 día después')
  })

  it('restringir sin haber avisado es el hallazgo que esta pantalla tiene que cantar', () => {
    const evidencia = dunningEvidence([
      event('GRACE_STARTED', '2026-03-10T00:00:00'),
      event('READ_ONLY_APPLIED', '2026-03-15T09:00:00'),
      // Un aviso POSTERIOR no repara la ausencia del previo, y no se cuenta.
      event('REMINDER_SENT', '2026-03-16T10:00:00', { channel: 'EMAIL' }),
    ])
    expect(evidencia.state).toBe('unwarned')
    expect(evidencia.badgeLabel).toBe('Sin aviso previo')
    expect(evidencia.headline).toContain('15/03/2026 · 09:00')
    expect(evidencia.detail).toContain('para esa fecha está vacío')
  })

  it('una cuenta que nunca se restringió lo dice sin inventar un hallazgo', () => {
    const evidencia = dunningEvidence([
      event('REMINDER_SENT', '2026-03-03T10:00:00', { channel: 'EMAIL' }),
    ])
    expect(evidencia.state).toBe('no-restriction')
    expect(evidencia.headline).toBe('Esta cuenta nunca ha pasado a solo lectura.')
    expect(evidencia.detail).toBe('Lleva 1 recordatorio anotado.')
  })

  it('el mismo día no se lee como un margen de días', () => {
    const evidencia = dunningEvidence([
      event('REMINDER_SENT', '2026-03-15T08:00:00', { channel: 'SMS' }),
      event('READ_ONLY_APPLIED', '2026-03-15T09:00:00'),
    ])
    expect(evidencia.detail).toContain('el mismo día')
  })
})

/**
 * El hueco entre dos hitos es contenido, no metadato: responde «cuánto margen se
 * le dio», que es la mitad de la pregunta.
 */
describe('los huecos entre hitos se leen como parte de la película', () => {
  it('cuenta días de calendario, no diferencia de instantes', () => {
    expect(daysBetween('2026-03-03T23:50:00', '2026-03-04T00:10:00')).toBe(1)
    expect(gapText('2026-03-03T23:50:00', '2026-03-04T00:10:00')).toBe('1 día después')
    expect(gapText('2026-03-01T08:00:00', '2026-03-08T08:00:00')).toBe('7 días después')
    expect(gapText('2026-03-01T08:00:00', '2026-03-01T20:00:00')).toBe('el mismo día')
  })

  it('sin fecha parseable no inventa un hueco', () => {
    expect(gapText(null, '2026-03-01T08:00:00')).toBeNull()
    expect(gapText('2026-02-31T08:00:00', '2026-03-01T08:00:00')).toBeNull()
  })

  it('los días de mora se dicen con palabras y nunca como un número suelto', () => {
    expect(overdueText(null)).toBe('Días de mora no anotados')
    expect(overdueText(0)).toBe('El mismo día del vencimiento')
    expect(overdueText(1)).toBe('Con 1 día de mora')
    expect(overdueText(12)).toBe('Con 12 días de mora')
  })

  it('un hito anotado a toro pasado lo dice, porque debilita la prueba y hay que verlo', () => {
    const tarde = event('REMINDER_SENT', '2026-03-03T10:00:00', {
      channel: 'PHONE',
      createdDate: '2026-03-10T18:00:00',
    })
    expect(annotatedLateText(tarde)).toBe(
      'Anotado el 10/03/2026 · 18:00, 7 días después de ocurrir.',
    )
    expect(annotatedLateText(event('REMINDER_SENT', '2026-03-03T10:00:00'))).toBeNull()
  })
})

/** La segunda razón de ser de la tabla: medir qué recordatorio funciona. */
describe('el expediente permite ver qué recordatorio funciona', () => {
  it('cuenta los recordatorios por canal, y solo los recordatorios', () => {
    const tally = channelTally([
      event('REMINDER_SENT', '2026-03-01T10:00:00', { channel: 'EMAIL' }),
      event('REMINDER_SENT', '2026-03-03T10:00:00', { channel: 'EMAIL' }),
      event('REMINDER_SENT', '2026-03-05T10:00:00', { channel: 'WHATSAPP' }),
      // No es un recordatorio: no sale hacia el cliente y no cuenta.
      event('READ_ONLY_APPLIED', '2026-03-09T10:00:00', { channel: 'IN_APP' }),
    ])
    expect(tally).toBe('Correo 2 · WhatsApp 1')
  })

  it('sin recordatorios devuelve vacío: una cuenta de ceros no es una medida', () => {
    expect(channelTally([event('GRACE_STARTED', '2026-03-01T10:00:00')])).toBe('')
  })

  it('dice qué aviso precedió a la última reactivación, como caso y no como estadística', () => {
    const señal = reactivationSignal([
      event('REMINDER_SENT', '2026-03-01T10:00:00', { channel: 'EMAIL' }),
      event('REMINDER_SENT', '2026-03-18T10:00:00', { channel: 'WHATSAPP' }),
      event('REACTIVATED', '2026-03-20T10:00:00'),
    ])
    expect(señal).toBe(
      'La última vez que esta cuenta se puso al día, el recordatorio anterior más cercano fue por WhatsApp, 2 días antes.',
    )
  })

  it('sin reactivación no dice nada, en vez de decir algo vacío', () => {
    expect(reactivationSignal([event('REMINDER_SENT', '2026-03-01T10:00:00')])).toBeNull()
  })

  it('una reactivación sin aviso previo también es información', () => {
    expect(reactivationSignal([event('REACTIVATED', '2026-03-20T10:00:00')])).toContain(
      'no había ningún recordatorio anotado antes',
    )
  })
})

/**
 * `WRITTEN_OFF` es una decisión de negocio con consecuencias contables, no un
 * valor más de un desplegable.
 */
describe('dar de baja contable no queda a un clic del resto', () => {
  it('no está entre los hitos que ofrece el formulario normal', () => {
    expect(ANNOTATABLE_EVENT_TYPES).not.toContain('WRITTEN_OFF')
    expect(ANNOTATABLE_EVENT_TYPES).toHaveLength(4)
    expect(ANNOTATABLE_EVENT_OPTIONS.map((option) => option.value)).toEqual([
      'REMINDER_SENT',
      'GRACE_STARTED',
      'READ_ONLY_APPLIED',
      'REACTIVATED',
    ])
  })

  it('su confirmación dice qué significa, que no se deshace y que no toca el acceso', () => {
    expect(WRITE_OFF_MEANING).toContain('no se va a cobrar')
    expect(WRITE_OFF_MEANING).toContain('no se puede borrar ni corregir')
    expect(WRITE_OFF_RECOVERY_NOTE).toContain('no se retira')
    expect(WRITE_OFF_ACCESS_NOTE).toContain('No cambia nada')
  })

  it('el botón nombra la acción y no dice «Confirmar» (WCAG §3.3.4)', () => {
    expect(WRITE_OFF_CONFIRM_LABEL).toBe('Dar de baja contable')
  })

  it('exige justificación, y una de tres letras no vale', () => {
    expect(validateWriteOffReason('')).toContain('justificación contable')
    expect(validateWriteOffReason('no')).toContain('al menos 10 caracteres')
    expect(validateWriteOffReason('Empresa liquidada, deuda irrecuperable.')).toBe('')
  })

  it('se sabe si ya se declaró antes, y cuándo', () => {
    expect(writtenOffAt([event('REMINDER_SENT', '2026-03-01T10:00:00')])).toBeNull()
    expect(
      writtenOffAt([
        event('WRITTEN_OFF', '2026-04-01T10:00:00'),
        event('REACTIVATED', '2026-05-01T10:00:00'),
      ]),
    ).toBe('2026-04-01T10:00:00')
  })
})

/**
 * Las invariantes del dominio se comprueban aquí antes de que el operador las
 * descubra con un 400 delante y el cliente al teléfono (§5.6).
 */
describe('el formulario comprueba lo que el dominio va a exigir', () => {
  it('un recordatorio sin canal no pasa: es espejo de chk_dunning_events_reminder_channel', () => {
    expect(validateChannel('REMINDER_SENT', '')).toContain('Elige por dónde se avisó')
    expect(validateChannel('REMINDER_SENT', 'WHATSAPP')).toBe('')
    // En los demás hitos el canal es opcional: no siempre hay un medio.
    expect(validateChannel('READ_ONLY_APPLIED', '')).toBe('')
    expect(validateChannel('GRACE_STARTED', '')).toBe('')
  })

  it('los días de mora son un entero no negativo, y el mensaje dice qué hacer', () => {
    expect(validateDaysOverdue('')).toBe('')
    expect(validateDaysOverdue('12')).toBe('')
    expect(validateDaysOverdue('-3')).toContain('sin letras ni signos')
    expect(validateDaysOverdue('doce')).toContain('sin letras ni signos')
    expect(validateDaysOverdue('99999')).toContain('3650')
  })

  it('el detalle es obligatorio y tiene el tope del dominio', () => {
    expect(validateDetail('')).toContain('qué se dijo y a quién')
    expect(validateDetail('corto')).toContain('al menos 10 caracteres')
    expect(validateDetail('Llamada a Ana, paga el viernes.')).toBe('')
    expect(validateDetail('x'.repeat(MAX_DETAIL_LENGTH + 1))).toContain('255')
  })

  it('no se anota el futuro: aquí se deja constancia de lo que ya ocurrió', () => {
    const ahora = new Date(2026, 2, 15, 12, 0, 0)
    expect(validateOccurredAt('', ahora)).toContain('Indica cuándo ocurrió')
    expect(validateOccurredAt('2026-03-15T11:00', ahora)).toBe('')
    expect(validateOccurredAt('2026-03-15T13:00', ahora)).toContain('no puede estar en el futuro')
    expect(validateOccurredAt('2026-02-31T10:00', ahora)).toContain('fecha y una hora válidas')
  })

  it('la hora por defecto del formulario es la local, sin corrimiento de zona', () => {
    expect(toDateTimeInput(new Date(2026, 2, 3, 9, 5, 0))).toBe('2026-03-03T09:05')
  })

  it('el borrador se convierte en el cuerpo una sola vez, y después de validar', () => {
    expect(
      toRecordRequest(184, {
        eventType: 'REMINDER_SENT',
        occurredAt: '2026-03-03T09:05',
        channel: 'WHATSAPP',
        daysOverdue: '12',
        detail: '  Llamada a Ana, paga el viernes.  ',
      }),
    ).toEqual({
      subscriptionId: 184,
      billingDocumentId: null,
      eventType: 'REMINDER_SENT',
      daysOverdue: 12,
      channel: 'WHATSAPP',
      detail: 'Llamada a Ana, paga el viernes.',
      occurredAt: '2026-03-03T09:05:00',
    })
  })

  it('los campos vacíos viajan como nulos y no como cadenas ni ceros', () => {
    const cuerpo = toRecordRequest(184, {
      eventType: 'READ_ONLY_APPLIED',
      occurredAt: '2026-03-15T09:00',
      channel: '',
      daysOverdue: '',
      detail: 'Pasa a solo lectura por impago del periodo.',
    })
    expect(cuerpo.channel).toBeNull()
    expect(cuerpo.daysOverdue).toBeNull()
    expect(cuerpo.billingDocumentId).toBeNull()
  })

  it('«Sin canal» es una opción con nombre y va la primera', () => {
    expect(CHANNEL_OPTIONS[0]).toEqual({ value: '', label: NO_CHANNEL_LABEL })
    expect(CHANNEL_OPTIONS).toHaveLength(6)
  })
})

describe('«Cobranza» se registra como la sexta sub-vista del expediente', () => {
  it('aparece con el segmento, el nombre de ruta y el orden acordados en §4.4.2', () => {
    const tab = subscriptionRecordTabs.find((candidate) => candidate.segment === 'cobranza')
    expect(tab).toBeDefined()
    expect(tab?.routeName).toBe('subscription-record-cobranza')
    expect(tab?.label).toBe('Cobranza')
    expect(tab?.order).toBe(6)
  })
})
