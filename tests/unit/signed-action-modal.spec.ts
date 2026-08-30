import { describe, expect, it } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import ModalShell from '@/components/ui/ModalShell.vue'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import type { MeResponse } from '@/features/auth/types/auth.types'
import SignedActionModal, {
  SIGNED_ACTION_MISSING_REASON,
  signedActionMissingNote,
  type SignedActionSignature,
} from '@/components/ui/SignedActionModal.vue'

/**
 * <b>La propiedad que justifica que este componente exista: no se firma sin
 * motivo.</b>
 *
 * <p>`SignedActionModal` lo consumen once pantallas repartidas en cuatro lotes.
 * Todas escriben algo que después hay que poder explicar —una excepción
 * negociada, una corrección de contador, un periodo contable reabierto—, y la
 * firma es lo único que, dentro de dos ejercicios, dice por qué. Un `submit`
 * emitido con `reason: ''` no es un fallo de interfaz: es un asiento sin
 * justificación en once sitios a la vez.
 *
 * <p>Por eso la prueba no se conforma con «el botón está deshabilitado» —de hecho
 * no lo está, a propósito: un botón apagado no dice qué falta—. Lo que se afirma
 * es que <b>el evento no sale</b>, y que en su lugar aparece el resumen de
 * errores con el texto exacto del campo (GOV.UK, patrón de validación).
 *
 * <p>`teleport: true` en los stubs porque `ModalShell` teletransporta a `<body>`:
 * sin eso el marcado del modal queda fuera del wrapper y las búsquedas devuelven
 * vacío, que se leería como «no hay error» justo donde el error es el sujeto de
 * la prueba.
 */

const REASONS = [
  { value: 'PRICE_MATCH', label: 'Igualar la oferta de un competidor' },
  { value: 'OUR_ERROR', label: 'Error nuestro' },
  { value: 'OTHER', label: 'Otro' },
]

const CONFIRM_LABEL = 'Revocar la excepción'

/**
 * La identidad que `GET /auth/me` deja en el store. Se siembra en cada montaje
 * porque **sin sesión el modal ya no deja firmar** (ver el bloque «la firma se
 * muestra y no se elige», más abajo): un montaje sin identidad no probaría la
 * validación del motivo, probaría la ausencia de sesión.
 */
const FIRMANTE: MeResponse = {
  id: 7,
  type: 'SYSTEM_USER',
  companyId: null,
  name: 'Ana Ruiz',
  employeeCode: null,
  permissions: [],
  mustChangePassword: false,
  branchIds: [],
}

function sembrarFirmante(identity: MeResponse | null = FIRMANTE) {
  useAuthStore().me = identity
}

function montar(props: Record<string, unknown> = {}, identity: MeResponse | null = FIRMANTE) {
  sembrarFirmante(identity)
  return mount(SignedActionModal, {
    props: {
      open: true,
      title: 'Revocar excepción negociada',
      question: '¿Revocar la excepción negociada de Clínica Norte?',
      reasons: REASONS,
      confirmLabel: CONFIRM_LABEL,
      ...props,
    },
    global: { stubs: { teleport: true } },
  })
}

/** El botón se localiza por su rótulo, que es como lo localiza un usuario. */
function boton(wrapper: VueWrapper, label: string) {
  const found = wrapper.findAll('button').find((b) => b.text() === label)
  if (!found) throw new Error(`No hay ningún botón rotulado «${label}»`)
  return found
}

/**
 * Elegir en la lista cerrada. `AppSelect` es un combobox propio: se usa su
 * contrato. Se busca por `{ name }` y no pasando el propio componente: `AppSelect`
 * es genérico (`generic="T extends string | number"`) y `findComponent` no puede
 * resolver `T` sin una instancia concreta, así que el propio componente no
 * encaja en `FindComponentSelector`. El `$emit` se tipa aparte por el mismo
 * motivo: `.vm` de un `WrapperLike` no garantiza los emits de un componente sin
 * instanciar.
 */
async function elegirMotivo(wrapper: VueWrapper, value: string) {
  const select = wrapper.findComponent({ name: 'AppSelect' })
  const vm = select.vm as unknown as { $emit: (event: 'update:modelValue', value: string) => void }
  vm.$emit('update:modelValue', value)
  await wrapper.vm.$nextTick()
}

async function escribirNota(wrapper: VueWrapper, text: string) {
  await wrapper.find('textarea').setValue(text)
}

function firmas(wrapper: VueWrapper): SignedActionSignature[] {
  return (wrapper.emitted('submit') ?? []).map((args) => (args as [SignedActionSignature])[0])
}

describe('SignedActionModal · sin motivo no se firma', () => {
  it('no emite submit al confirmar con la lista cerrada sin elegir', async () => {
    const wrapper = montar()

    await boton(wrapper, CONFIRM_LABEL).trigger('click')

    expect(wrapper.emitted('submit')).toBeUndefined()
  })

  it('dice qué falta, con el texto exacto, en el resumen de errores', async () => {
    const wrapper = montar()

    await boton(wrapper, CONFIRM_LABEL).trigger('click')

    const summary = wrapper.find('[data-error-anchor]')
    expect(summary.exists()).toBe(true)
    expect(summary.attributes('role')).toBe('alert')
    expect(summary.text()).toContain(SIGNED_ACTION_MISSING_REASON)
  })

  it('sigue sin emitir aunque se escriba la nota: la nota no sustituye al motivo', async () => {
    const wrapper = montar()

    await escribirNota(wrapper, 'Lo pidió el comercial por teléfono.')
    await boton(wrapper, CONFIRM_LABEL).trigger('click')

    expect(wrapper.emitted('submit')).toBeUndefined()
  })

  it('el botón NO se deshabilita: un botón apagado no explica qué falta', () => {
    const wrapper = montar()

    expect(boton(wrapper, CONFIRM_LABEL).attributes('disabled')).toBeUndefined()
  })

  it('una lista de motivos vacía no abre una puerta trasera para firmar sin motivo', async () => {
    const wrapper = montar({ reasons: [] })

    await boton(wrapper, CONFIRM_LABEL).trigger('click')

    expect(wrapper.emitted('submit')).toBeUndefined()
  })
})

describe('SignedActionModal · la firma que sí sale', () => {
  it('emite el motivo elegido y note null cuando el texto libre está vacío', async () => {
    const wrapper = montar()

    await elegirMotivo(wrapper, 'PRICE_MATCH')
    await boton(wrapper, CONFIRM_LABEL).trigger('click')

    expect(firmas(wrapper)).toEqual([{ reason: 'PRICE_MATCH', note: null }])
  })

  it('recorta la nota y la manda con el motivo', async () => {
    const wrapper = montar()

    await elegirMotivo(wrapper, 'PRICE_MATCH')
    await escribirNota(wrapper, '   Igualamos a VetPlus hasta diciembre.  ')
    await boton(wrapper, CONFIRM_LABEL).trigger('click')

    expect(firmas(wrapper)).toEqual([
      { reason: 'PRICE_MATCH', note: 'Igualamos a VetPlus hasta diciembre.' },
    ])
  })

  it('una nota de solo espacios viaja como null, no como cadena vacía', async () => {
    const wrapper = montar()

    await elegirMotivo(wrapper, 'PRICE_MATCH')
    await escribirNota(wrapper, '    ')
    await boton(wrapper, CONFIRM_LABEL).trigger('click')

    expect(firmas(wrapper)[0]?.note).toBeNull()
  })
})

describe('SignedActionModal · los motivos que no se explican solos', () => {
  it('con «Otro» la nota pasa a ser obligatoria y no deja firmar sin ella', async () => {
    const wrapper = montar({ noteRequiredReasons: ['OTHER'] })

    await elegirMotivo(wrapper, 'OTHER')
    await boton(wrapper, CONFIRM_LABEL).trigger('click')

    expect(wrapper.emitted('submit')).toBeUndefined()
    expect(wrapper.find('[data-error-anchor]').text()).toContain(signedActionMissingNote('Otro'))
  })

  it('con la nota escrita, «Otro» firma igual que los demás', async () => {
    const wrapper = montar({ noteRequiredReasons: ['OTHER'] })

    await elegirMotivo(wrapper, 'OTHER')
    await escribirNota(wrapper, 'Acuerdo verbal con el fundador; queda pendiente el anexo.')
    await boton(wrapper, CONFIRM_LABEL).trigger('click')

    expect(firmas(wrapper)).toEqual([
      { reason: 'OTHER', note: 'Acuerdo verbal con el fundador; queda pendiente el anexo.' },
    ])
  })

  it('un motivo que sí se explica solo no exige nota aunque otro de la lista la exija', async () => {
    const wrapper = montar({ noteRequiredReasons: ['OTHER'] })

    await elegirMotivo(wrapper, 'PRICE_MATCH')
    await boton(wrapper, CONFIRM_LABEL).trigger('click')

    expect(firmas(wrapper)).toEqual([{ reason: 'PRICE_MATCH', note: null }])
  })

  it('una nota más larga que el máximo del DTO no se manda a que la rechace el servidor', async () => {
    const wrapper = montar({ maxNoteLength: 20 })

    await elegirMotivo(wrapper, 'PRICE_MATCH')
    await escribirNota(wrapper, 'x'.repeat(21))
    await boton(wrapper, CONFIRM_LABEL).trigger('click')

    expect(wrapper.emitted('submit')).toBeUndefined()
    expect(wrapper.find('[data-error-anchor]').text()).toContain('20 caracteres')
  })
})

describe('SignedActionModal · la forma del modal', () => {
  it('envuelve ModalShell en vez de sustituirlo', () => {
    const wrapper = montar()

    expect(wrapper.findComponent(ModalShell).exists()).toBe(true)
  })

  it('es un alertdialog: su cuerpo hay que oírlo antes de decidir', () => {
    const wrapper = montar()

    expect(wrapper.find('[aria-modal="true"]').attributes('role')).toBe('alertdialog')
  })

  it('el botón nombra la acción y nunca dice «Confirmar»', () => {
    const wrapper = montar()

    const labels = wrapper.findAll('button').map((b) => b.text())
    expect(labels).toContain(CONFIRM_LABEL)
    expect(labels).not.toContain('Confirmar')
  })

  it('pinta la consecuencia como aviso, no como éxito ni como error', () => {
    const wrapper = montar({ consequence: 'La excepción se pierde y no se repone al recalcular.' })

    const banner = wrapper.find('.ds-banner--warning')
    expect(banner.exists()).toBe(true)
    expect(banner.text()).toContain('no se repone al recalcular')
  })

  it('sin consecuencia no pinta un aviso vacío', () => {
    expect(montar().find('.ds-banner--warning').exists()).toBe(false)
  })

  it('mientras guarda, los dos botones quedan fuera de alcance', () => {
    const wrapper = montar({ saving: true, savingLabel: 'Revocando…' })

    expect(boton(wrapper, 'Revocando…').attributes('disabled')).toBeDefined()
    expect(boton(wrapper, 'Cancelar').attributes('disabled')).toBeDefined()
  })
})

describe('SignedActionModal · cada apertura empieza en blanco', () => {
  it('no hereda el motivo ni la nota de la firma anterior', async () => {
    const wrapper = montar()

    await elegirMotivo(wrapper, 'PRICE_MATCH')
    await escribirNota(wrapper, 'Caso anterior.')
    await boton(wrapper, CONFIRM_LABEL).trigger('click')
    expect(firmas(wrapper)).toHaveLength(1)

    await wrapper.setProps({ open: false })
    await wrapper.setProps({ open: true })

    // Sin motivo otra vez: si se hubiera quedado el anterior, esto emitiría.
    await boton(wrapper, CONFIRM_LABEL).trigger('click')
    expect(firmas(wrapper)).toHaveLength(1)
    expect(wrapper.find('textarea').element.value).toBe('')
  })

  it('tampoco hereda el error mostrado: al reabrir no hay resumen', async () => {
    const wrapper = montar()

    await boton(wrapper, CONFIRM_LABEL).trigger('click')
    expect(wrapper.find('[data-error-anchor]').exists()).toBe(true)

    await wrapper.setProps({ open: false })
    await wrapper.setProps({ open: true })

    expect(wrapper.find('[data-error-anchor]').exists()).toBe(false)
  })
})

/**
 * <b>La tercera regla del plano: la firma se muestra y no se elige.</b>
 *
 * <p>El modal implementaba cuatro de las cinco y omitía esta, así que en 12 de
 * las 13 pantallas que firman el operador confirmaba una condonación de deuda o
 * una devolución <b>sin ver su propio nombre al lado del botón</b>. Con un solo
 * rol de plataforma para 216 operaciones, la firma no protege de nada
 * técnicamente: es todo el control que hay, y un control que no se ve no disuade.
 */
describe('SignedActionModal · la firma se muestra y no se elige', () => {
  it('dice quién firma, con su nombre, sin que la pantalla tenga que pasarlo', () => {
    const wrapper = montar()

    expect(wrapper.text()).toContain('Firma')
    expect(wrapper.text()).toContain('Ana Ruiz')
  })

  it('avisa de que la firma queda escrita y no se puede cambiar', () => {
    expect(montar().text()).toContain('no se puede cambiar')
  })

  it('no ofrece ningún selector de «quién autoriza»: eso convertiría la firma en una afirmación', () => {
    const wrapper = montar()

    // El único combobox del modal es el de motivos.
    expect(wrapper.findAllComponents({ name: 'AppSelect' })).toHaveLength(1)
  })

  it('sin nombre resuelto dice el identificador y NO inventa uno (R14)', () => {
    const wrapper = montar({}, { ...FIRMANTE, name: '' })

    expect(wrapper.text()).toContain('usuario #7')
  })
})

describe('SignedActionModal · una sesión que no identifica a nadie no firma', () => {
  it('lo dice con un aviso en role="alert" en vez de dejar que lo rechace el servidor', () => {
    const wrapper = montar({}, null)

    const aviso = wrapper
      .findAll('[role="alert"]')
      .find((n) => n.text().includes('no se puede firmar'))
    expect(aviso).toBeDefined()
    expect(aviso?.text()).toContain('Vuelve a iniciar sesión')
  })

  it('es la ÚNICA excepción a «el botón no se deshabilita»: aquí no falta un campo, falta la sesión', () => {
    const wrapper = montar({}, null)

    expect(boton(wrapper, CONFIRM_LABEL).attributes('disabled')).toBeDefined()
  })

  it('tampoco firma por la puerta de atrás que abre defineExpose', async () => {
    const wrapper = montar({}, null)

    await elegirMotivo(wrapper, 'PRICE_MATCH')
    ;(wrapper.vm as unknown as { submit: () => void }).submit()
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('submit')).toBeUndefined()
  })
})
