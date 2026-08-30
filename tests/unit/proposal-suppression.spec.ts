import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { AxiosError, type AxiosResponse } from 'axios'
import { exigir } from '../helpers/exigir'
import { useToastStore } from '@/stores/toast.store'
import type { ProposalSuppressionResponse } from '@/features/proposal-suppression/types/proposal-suppression.types'

/**
 * Supresión de datos del asistente a petición del titular — Ley 1581, artículo
 * 8, literal e.
 *
 * <p>Lo que se afirma aquí no es «la pantalla pinta un formulario». Son las tres
 * propiedades de las que depende que esta pantalla sirva para lo que existe, y
 * las tres tienen delante un modo de fallo concreto y ya visto en este proyecto:
 *
 * <ol>
 *   <li><b>Cero coincidencias NO es éxito.</b> El endpoint responde 200 con los
 *       contadores a cero cuando no encuentra nada, y lo hace a propósito para no
 *       convertirse en un oráculo de existencia
 *       (`AiProposalRetentionController.java:47-51`). La traducción de ese 200 a
 *       lenguaje de operador la hace el front, y si la hace mal —cartel verde,
 *       «hecho»— la petición de habeas data se cierra sin haberse atendido y
 *       nadie vuelve a mirarla. Es exactamente la forma de un test que pasa
 *       porque el código no hace nada, así que se afirma por los dos lados: que
 *       el caso de hallazgo es `success` y que el de cero es `warn`, y que
 *       ninguno de los dos emite el aviso del otro.</li>
 *   <li><b>La llamada NO sale sin confirmación.</b> La primera llamada ya borra:
 *       no hay endpoint de lectura con el que mirar antes. Un `@submit` que
 *       llamara a la API directamente convertiría un enter en el campo en un
 *       borrado irreversible.</li>
 *   <li><b>El acuse no sobrevive a que cambie el correo.</b> La respuesta no
 *       devuelve la dirección, así que el único sitio donde consta a quién se le
 *       borró es el estado del front; un panel que dice «se borraron 7 filas»
 *       encima de otra dirección es una constancia falsa que se lee igual que una
 *       verdadera.</li>
 * </ol>
 *
 * <p>Se usa pinia real (la instala `tests/unit/setup.ts` antes de cada prueba) y
 * el store de avisos de verdad: lo que se comprueba es el aviso que el operador
 * acabaría viendo, no que se llamó a un espía.
 */

const proposalSuppressionApi = { suppress: vi.fn() }

vi.mock('@/features/proposal-suppression/api/proposal-suppression.api', () => ({
  proposalSuppressionApi,
}))

const { useProposalSuppression } =
  await import('@/features/proposal-suppression/composables/useProposalSuppression')
const { useProposalSuppressionStore } =
  await import('@/features/proposal-suppression/stores/proposal-suppression.store')
const { validateContactEmail, CONTACT_EMAIL_MAX } =
  await import('@/features/proposal-suppression/composables/suppressionRules')
const ProposalSuppressionView = (
  await import('@/features/proposal-suppression/views/ProposalSuppressionView.vue')
).default
const ConfirmSuppressionModal = (
  await import('@/features/proposal-suppression/components/ConfirmSuppressionModal.vue')
).default
const SuppressionOutcomePanel = (
  await import('@/features/proposal-suppression/components/SuppressionOutcomePanel.vue')
).default

const CORREO = 'ana.prospecto@clinicanorte.co'

/**
 * La marca del SERVIDOR que trae el acuse. Es `LocalDateTime` —sin zona—, así que
 * se escribe tal cual y se espera pintada tal cual: si algún día alguien la
 * hiciera pasar por `new Date()`, este par de constantes dejaría de casar en
 * cualquier equipo que no esté en UTC, que es exactamente el fallo que se quiere
 * atrapar.
 */
const SUPRIMIDO_EL = '2026-08-30T14:07:33'
const SUPRIMIDO_EL_PINTADO = '30/08/2026 a las 14:07'

/** Un acuse con hallazgo. `total` se calcula como lo calcula `SuppressionResult.total()`. */
function contadores(
  over: Partial<Omit<ProposalSuppressionResponse, 'total'>> = {},
): ProposalSuppressionResponse {
  const { suppressedAt = SUPRIMIDO_EL, previouslySuppressedAt, ...resto } = over
  const c = { proposals: 1, turns: 3, lines: 5, ...resto }
  return {
    ...c,
    total: c.proposals + c.turns + c.lines,
    suppressedAt,
    ...(previouslySuppressedAt === undefined ? {} : { previouslySuppressedAt }),
  }
}

/** Los tres ceros que devuelve el servidor cuando ese correo no está. */
const SIN_HALLAZGO: ProposalSuppressionResponse = {
  proposals: 0,
  turns: 0,
  lines: 0,
  total: 0,
  suppressedAt: SUPRIMIDO_EL,
}

function problemDetail(status: number, detail: string, traceId = 'trace-abc-123'): AxiosError {
  const error = new AxiosError(`Request failed with status code ${status}`, 'ERR_BAD_RESPONSE')
  error.response = {
    status,
    statusText: 'Internal Server Error',
    data: { detail, title: 'Internal Server Error', status },
    headers: { 'x-trace-id': traceId },
    config: { headers: {} },
  } as unknown as AxiosResponse
  return error
}

beforeEach(() => {
  proposalSuppressionApi.suppress.mockReset()
})

describe('el validador del único campo', () => {
  it('exige el correo, nombrándolo', () => {
    expect(validateContactEmail('')).toBe('El correo del titular es obligatorio.')
    expect(validateContactEmail('   ')).toBe('El correo del titular es obligatorio.')
  })

  it('rechaza lo que no tiene forma de correo, con ejemplo', () => {
    for (const malo of ['ana', 'ana@', '@clinica.com', 'ana@clinica', 'a n a@clinica.com']) {
      expect(validateContactEmail(malo), `«${malo}» pasó como correo válido`).toContain(
        'no tiene el formato correcto',
      )
    }
  })

  it('respeta el @Size(max = 320) del DTO', () => {
    const justo = `${'a'.repeat(CONTACT_EMAIL_MAX - '@clinica.com'.length)}@clinica.com`
    expect(justo).toHaveLength(CONTACT_EMAIL_MAX)
    expect(validateContactEmail(justo)).toBe('')
    expect(validateContactEmail(`a${justo}`)).toContain(`${CONTACT_EMAIL_MAX} caracteres`)
  })

  it('acepta un correo normal, con espacios de sobra incluidos', () => {
    expect(validateContactEmail(CORREO)).toBe('')
    expect(validateContactEmail(`  ${CORREO}  `)).toBe('')
  })
})

describe('camino feliz: el titular tenía datos y se borraron', () => {
  it('envía el correo RECORTADO y guarda el desglose que devolvió el servidor', async () => {
    const respuesta = contadores({ proposals: 2, turns: 4, lines: 9 })
    proposalSuppressionApi.suppress.mockResolvedValue(respuesta)

    const s = useProposalSuppression()
    s.setEmail(`  ${CORREO}  `)
    await expect(s.suppress()).resolves.toBe(true)

    // Con el espacio delante, el `@Email` del servidor devolvería un 400 que el
    // operador no sabría explicar.
    expect(proposalSuppressionApi.suppress).toHaveBeenCalledTimes(1)
    expect(proposalSuppressionApi.suppress).toHaveBeenCalledWith({ contactEmail: CORREO })

    expect(s.status.value).toBe('suppressed')
    expect(s.outcome.value?.email).toBe(CORREO)
    expect(s.outcome.value?.counters).toEqual(respuesta)
    expect(s.error.value).toBeNull()
  })

  it('avisa en tono de éxito, y NO en tono de advertencia', async () => {
    proposalSuppressionApi.suppress.mockResolvedValue(contadores())
    const avisos = useToastStore().toasts

    const s = useProposalSuppression()
    s.setEmail(CORREO)
    await s.suppress()

    expect(avisos.map((t) => t.kind)).toEqual(['success'])
  })

  it('con UNA sola fila movida ya cuenta como hallazgo', async () => {
    // El límite exacto importa: `total > 0`, no `total > 1` ni «los tres pasos
    // movieron algo». Una propuesta sin conversación mueve solo la cabecera.
    proposalSuppressionApi.suppress.mockResolvedValue({
      proposals: 1,
      turns: 0,
      lines: 0,
      total: 1,
    })

    const s = useProposalSuppression()
    s.setEmail(CORREO)
    await s.suppress()

    expect(s.status.value).toBe('suppressed')
  })
})

describe('cero coincidencias: se atendió la petición y no se borró nada', () => {
  beforeEach(() => {
    proposalSuppressionApi.suppress.mockResolvedValue(SIN_HALLAZGO)
  })

  it('NO se lee como éxito: el estado es «no encontrado»', async () => {
    const s = useProposalSuppression()
    s.setEmail(CORREO)
    await expect(s.suppress()).resolves.toBe(true)

    expect(
      s.status.value,
      'un 200 con ceros se estaría pintando como una supresión hecha: la petición de habeas data se cierra sin atender',
    ).toBe('not-found')
  })

  it('el aviso es de advertencia y dice qué hacer a continuación', async () => {
    const avisos = useToastStore().toasts

    const s = useProposalSuppression()
    s.setEmail(CORREO)
    await s.suppress()

    expect(avisos.map((t) => t.kind)).toEqual(['warn'])
    expect(avisos[0]?.message).toContain('otra dirección')
  })

  it('guarda el acuse igual, con sus ceros: la petición SÍ llegó y volvió', async () => {
    const s = useProposalSuppression()
    s.setEmail(CORREO)
    await s.suppress()

    expect(s.outcome.value?.counters).toEqual(SIN_HALLAZGO)
    expect(s.error.value, 'un cero no es un error del servidor').toBeNull()
  })
})

describe('fallo de la llamada', () => {
  it('conserva el mensaje del servidor y su traza, y no fabrica un acuse', async () => {
    proposalSuppressionApi.suppress.mockRejectedValue(
      problemDetail(500, 'La base de datos rechazó la transacción de supresión.'),
    )

    const s = useProposalSuppression()
    s.setEmail(CORREO)
    await expect(s.suppress()).resolves.toBe(false)

    expect(s.status.value, 'un fallo dejó un acuse de supresión donde no hubo ninguna').toBe('idle')
    expect(s.outcome.value).toBeNull()
    expect(s.error.value).toBe('La base de datos rechazó la transacción de supresión.')
    expect(s.errorTraceId.value).toBe('trace-abc-123')
    expect(s.saving.value, 'el botón se quedaría en «Suprimiendo…» para siempre').toBe(false)
  })

  it('el aviso lleva la traza, que es lo único con lo que soporte encuentra qué pasó', async () => {
    proposalSuppressionApi.suppress.mockRejectedValue(problemDetail(503, 'Servicio no disponible.'))
    const avisos = useToastStore().toasts

    const s = useProposalSuppression()
    s.setEmail(CORREO)
    await s.suppress()

    expect(avisos).toHaveLength(1)
    expect(avisos[0]?.kind).toBe('error')
    expect(avisos[0]?.message, 'se perdió el mensaje del ProblemDetail').toBe(
      'Servicio no disponible.',
    )
    expect(avisos[0]?.traceId, 'se tiró el X-Trace-Id escribiendo el error a mano').toBe(
      'trace-abc-123',
    )
  })

  it('no llama al servidor si el correo está vacío', async () => {
    const s = useProposalSuppression()
    s.setEmail('   ')
    await expect(s.suppress()).resolves.toBe(false)
    expect(proposalSuppressionApi.suppress).not.toHaveBeenCalled()
  })
})

describe('el acuse pertenece a UNA dirección concreta', () => {
  beforeEach(() => {
    proposalSuppressionApi.suppress.mockResolvedValue(contadores())
  })

  it('cambiar el correo tira el acuse anterior', async () => {
    const s = useProposalSuppression()
    s.setEmail(CORREO)
    await s.suppress()
    expect(s.status.value).toBe('suppressed')

    s.setEmail('otro@clinicasur.co')

    expect(
      s.outcome.value,
      'el acuse de una supresión quedó colgando bajo una dirección distinta de la que se suprimió',
    ).toBeNull()
    expect(s.status.value).toBe('idle')
  })

  it('reescribir el MISMO correo, aunque sea con espacios, no lo tira', async () => {
    const s = useProposalSuppression()
    s.setEmail(CORREO)
    await s.suppress()

    s.setEmail(`  ${CORREO} `)

    expect(s.outcome.value?.email).toBe(CORREO)
    expect(s.status.value).toBe('suppressed')
  })

  it('un error anterior desaparece al corregir el campo', async () => {
    const store = useProposalSuppressionStore()
    store.setError('Lo que fuera', 'trace-vieja')

    store.setEmail(CORREO)

    expect(store.error).toBeNull()
    expect(store.errorTraceId).toBeNull()
  })
})

describe('el panel de resultado distingue los dos desenlaces', () => {
  it('con hallazgo: banner de éxito y el desglose de las tres tablas', () => {
    const wrapper = mount(SuppressionOutcomePanel, {
      props: {
        outcome: {
          email: CORREO,
          counters: {
            proposals: 2,
            turns: 4,
            lines: 9,
            total: 15,
            suppressedAt: SUPRIMIDO_EL,
          },
        },
      },
    })

    expect(wrapper.find('.ds-banner--success').exists()).toBe(true)
    expect(wrapper.find('.ds-banner--warning').exists()).toBe(false)
    const texto = wrapper.text()
    expect(texto).toContain(CORREO)
    // Los tres contadores, no solo el total: sin el desglose, «se borró algo» no
    // distingue una supresión sana de un paso roto.
    for (const n of ['2', '4', '9', '15']) expect(texto).toContain(n)
  })

  it('sin hallazgo: NO hay banner de éxito, y se dice que pruebe otra dirección', () => {
    const wrapper = mount(SuppressionOutcomePanel, {
      props: { outcome: { email: CORREO, counters: SIN_HALLAZGO } },
    })

    expect(
      wrapper.find('.ds-banner--success').exists(),
      'cero filas borradas se está anunciando en verde',
    ).toBe(false)
    expect(wrapper.find('.ds-banner--warning').exists()).toBe(true)

    const texto = wrapper.text()
    expect(texto).toContain('No se encontró')
    expect(texto).toContain('otra dirección')
    // Y que se pintan los ceros: esconderlos dejaría sin ver que la petición
    // llegó al servidor y volvió.
    expect(texto).toContain('Total de filas')
  })

  it('la fecha del acuse es la del SERVIDOR, pintada sin pasar por new Date()', () => {
    const wrapper = mount(SuppressionOutcomePanel, {
      props: { outcome: { email: CORREO, counters: contadores() } },
    })

    const texto = wrapper.text()
    // El valor exacto, no «una fecha»: es la evidencia de cumplimiento que hay
    // que poder exhibir ante la SIC, y antes se fabricaba con `Date.now()`.
    expect(texto).toContain(SUPRIMIDO_EL_PINTADO)
    expect(texto).toContain('del reloj del servidor')
    expect(texto, 'la pantalla sigue diciendo que la fecha la pone el equipo').not.toContain(
      'según el reloj de tu equipo',
    )
  })

  it('cero filas CON supresión anterior no manda a probar otra dirección', () => {
    const wrapper = mount(SuppressionOutcomePanel, {
      props: {
        outcome: {
          email: CORREO,
          counters: { ...SIN_HALLAZGO, previouslySuppressedAt: '2026-07-03T09:15:00' },
        },
      },
    })

    const texto = wrapper.text()
    expect(texto).toContain('Ya se había suprimido antes')
    expect(texto).toContain('03/07/2026 a las 09:15')
    // Es el punto entero de `previouslySuppressedAt`: al titular ya atendido no
    // se le manda a buscar una dirección que no existe.
    //
    // Se afirma sobre la INSTRUCCIÓN, no sobre la frase «otra dirección» suelta:
    // el propio texto correcto dice «no hace falta probar otra dirección», así
    // que un `not.toContain('otra dirección')` se pone rojo con la pantalla
    // buena delante. Lo que no puede aparecer es la llamada a la acción de la
    // otra rama.
    expect(texto).not.toContain('Si el titular pudo escribir desde otra dirección')
    expect(texto).not.toContain('pruébala')
  })
})

/**
 * Los dos hijos del armazón que necesitan router (`useRoute`/`useRouter`). Se
 * recortan ELLOS y no `AppLayout`: lo que varias pruebas de abajo afirman es
 * precisamente el DOM que `AppLayout.vue` aporta —el enlace de salto y
 * `main#contenido`—, y un `AppLayout: true` lo sustituiría por un stub vacío,
 * dejando esas pruebas midiendo su propio andamio.
 */
const ARMAZON_SIN_ROUTER = { AppSidebar: true, AppHeader: true } as const

describe('la pantalla no borra nada sin pasar por la confirmación', () => {
  function montar() {
    return mount(ProposalSuppressionView, {
      global: { stubs: { ...ARMAZON_SIN_ROUTER, ConfirmSuppressionModal: true } },
    })
  }

  it('enviar el formulario abre el diálogo y NO llama al servidor', async () => {
    proposalSuppressionApi.suppress.mockResolvedValue(contadores())
    const wrapper = montar()

    await wrapper.find('input#supresion-correo').setValue(CORREO)
    await wrapper.find('form').trigger('submit')

    expect(
      proposalSuppressionApi.suppress,
      'la pantalla borró datos personales con un solo envío del formulario',
    ).not.toHaveBeenCalled()
    expect(wrapper.findComponent(ConfirmSuppressionModal).props('open')).toBe(true)
  })

  it('solo al confirmar sale la petición, y con el correo del cuadro', async () => {
    proposalSuppressionApi.suppress.mockResolvedValue(contadores())
    const wrapper = montar()

    await wrapper.find('input#supresion-correo').setValue(`  ${CORREO}  `)
    await wrapper.find('form').trigger('submit')
    wrapper.findComponent(ConfirmSuppressionModal).vm.$emit('confirm')
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    expect(proposalSuppressionApi.suppress).toHaveBeenCalledTimes(1)
    expect(proposalSuppressionApi.suppress).toHaveBeenCalledWith({ contactEmail: CORREO })
  })

  it('con un correo inválido no se llega ni a la confirmación', async () => {
    const wrapper = montar()

    await wrapper.find('input#supresion-correo').setValue('ana@clinica')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.findComponent(ConfirmSuppressionModal).props('open')).toBe(false)
    expect(proposalSuppressionApi.suppress).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('no tiene el formato correcto')
  })

  it('el diálogo recibe el correo recortado, que es el que se va a suprimir', async () => {
    const wrapper = montar()

    await wrapper.find('input#supresion-correo').setValue(`  ${CORREO}  `)
    await wrapper.find('form').trigger('submit')

    expect(wrapper.findComponent(ConfirmSuppressionModal).props('email')).toBe(CORREO)
  })
})

/**
 * <b>La pantalla se pinta DENTRO del armazón de la consola.</b>
 *
 * <p>No lo hacía. `ProposalSuppressionView.vue` tenía un `<section>` por raíz en
 * vez de un `<AppLayout>`, y era la única ruta de primer nivel de la consola sin
 * armazón: las otras veinte vistas sin `AppLayout` o cuelgan de un padre que sí
 * lo pone, o son públicas (login, acceso de plataforma).
 *
 * <p><b>Y lo que lo convierte en defecto, y no en una diferencia de estilo, es
 * que el menú enlaza a ella</b> (`sidebar-nav.ts:91`). Quien la abría desde ahí
 * perdía la navegación entera —sin barra lateral, sin cabecera, sin enlace de
 * salto y sin landmark `main`— y solo salía con el botón «atrás» del navegador.
 * En la única pantalla por la que se atiende una petición de habeas data.
 *
 * <p>Se afirman las tres cosas que el armazón aporta y que el `<section>` suelto
 * no podía aportar por su cuenta, cada una con su modo de fallo detrás.
 */
describe('el armazón de la consola', () => {
  function montarEnElArmazon() {
    return mount(ProposalSuppressionView, {
      global: { stubs: { ...ARMAZON_SIN_ROUTER, ConfirmSuppressionModal: true } },
    })
  }

  it('pinta el landmark `main#contenido`, y la pantalla vive dentro de él', () => {
    const wrapper = montarEnElArmazon()

    const main = wrapper.find('main#contenido')
    expect(
      main.exists(),
      'sin `<main>` no hay landmark principal: no se puede saltar al contenido, y es la pantalla por la que se atiende un habeas data',
    ).toBe(true)
    // El destino del salto tiene que poder RECIBIR el foco: sin `tabindex`, un
    // salto por `#id` mueve el scroll y deja el foco en el `<body>`.
    expect(main.attributes('tabindex')).toBe('-1')

    const seccion = wrapper.find('section[aria-labelledby="supresion-titulo"]')
    expect(seccion.exists()).toBe(true)
    expect(
      main.element.contains(seccion.element),
      'la pantalla está fuera del landmark principal: el salto al contenido no la alcanzaría',
    ).toBe(true)
  })

  it('ofrece el enlace de salto, y su destino existe y va DESPUÉS de él', () => {
    const wrapper = montarEnElArmazon()

    const salto = wrapper.find('a[href="#contenido"]')
    expect(
      salto.exists(),
      'sin enlace de salto se tabulan las entradas del menú antes de llegar al formulario, en cada visita (§2.4.1)',
    ).toBe(true)
    expect(salto.text()).toContain('Saltar al contenido')

    const destino = wrapper.find('#contenido')
    expect(destino.exists(), 'el enlace de salto apunta a un ancla que no existe').toBe(true)

    // Un enlace de salto colocado DETRÁS de lo que se salta no salta nada. Se
    // mide la posición real en el documento, no el orden del código fuente.
    const posicion = salto.element.compareDocumentPosition(destino.element)
    expect(
      posicion & Node.DOCUMENT_POSITION_FOLLOWING,
      'el enlace de salto no precede a su destino: tabular desde él no adelanta nada',
    ).toBeTruthy()
  })

  it('el título de la pantalla es el `<h1>` del documento, y es el único', () => {
    const wrapper = montarEnElArmazon()

    const titulo = wrapper.get('#supresion-titulo')
    // El armazón NO aporta `<h1>` —cada vista pone el suyo, y ni `AppSidebar` ni
    // `AppHeader` tienen encabezados—, así que mientras esto fue un `<h2>` el
    // documento empezaba en el nivel 2 y no había primer nivel al que saltar.
    // Además es el nodo del que dependen las cadenas de respaldo de
    // `useNavDrawer.enfocarContenidoNuevo()` y `useModalFocus.resolveReturnFocus()`,
    // que buscan `main h1` antes que `main`.
    expect(
      titulo.element.tagName,
      'el documento no tiene `<h1>`: empieza en el nivel 2 y se salta el primero',
    ).toBe('H1')
    expect(titulo.attributes('tabindex'), 'el encabezado no podría recibir el foco').toBe('-1')

    expect(wrapper.findAll('h1')).toHaveLength(1)
    // Y no queda ningún nivel colgando por debajo del primero sin nada en medio.
    expect(wrapper.findAll('h3')).toHaveLength(0)
  })
})

/**
 * <b>La devolución del foco tras la escritura irreversible.</b>
 *
 * <p>La convención del repositorio —con gate propio en
 * `e2e/accessibility.spec.ts:46-77`— es mover el foco al encabezado tras cada
 * escritura. Aquí no se hacía: el foco volvía al botón «Revisar y suprimir» y el
 * acuse aparece por DEBAJO de él, así que quien navega con teclado o con lector
 * de pantalla no se enteraba del resultado de un borrado irreversible de datos
 * personales — el mismo resultado que después hay que poder enseñar ante la SIC.
 *
 * <p><b>Los dos cierres del diálogo no son el mismo, y se afirman los dos.</b>
 * Una prueba que solo mirase el caso de confirmar pasaría igual con un
 * `returnFocusTo` puesto a lo bruto, y entonces cancelar —que no escribe nada—
 * también arrancaría al operador del botón desde el que abrió.
 */
describe('el foco después de suprimir', () => {
  /**
   * jsdom no hace layout: `HTMLElement.offsetParent` devuelve SIEMPRE `null`, y
   * `resolveReturnFocus()` lo usa para decidir si el disparador sigue visible.
   * Sin reponerlo, esa cadena descarta el disparador y aterriza en `main h1`
   * —que es justo el nodo que estas pruebas afirman—, así que pasarían igual con
   * el defecto delante. Se le da la semántica del navegador: un elemento montado
   * tiene padre de posicionamiento, uno desconectado no.
   */
  const descriptorOriginal = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetParent')

  beforeAll(() => {
    Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
      configurable: true,
      get(this: HTMLElement): Element | null {
        return this.parentElement
      },
    })
  })

  afterAll(() => {
    if (descriptorOriginal) {
      Object.defineProperty(HTMLElement.prototype, 'offsetParent', descriptorOriginal)
    }
  })

  /**
   * Se monta sobre `document.body` y con el diálogo DE VERDAD: el foco no se
   * puede medir sobre un árbol desconectado, y un stub del modal no ejecuta la
   * devolución del foco, que es justo el sujeto de estas pruebas.
   */
  function montarConDialogo() {
    return mount(ProposalSuppressionView, {
      attachTo: document.body,
      global: { stubs: { ...ARMAZON_SIN_ROUTER, teleport: true } },
    })
  }

  function boton(wrapper: VueWrapper, texto: string) {
    const encontrado = wrapper.findAll('button').find((b) => b.text().includes(texto))
    return exigir(encontrado, `un botón cuyo rótulo contenga «${texto}»`)
  }

  /** Deja el formulario listo y el diálogo abierto, con el foco en el disparador. */
  async function abrirElDialogo(wrapper: VueWrapper) {
    await wrapper.find('input#supresion-correo').setValue(CORREO)
    // El foco se pone en el botón A PROPÓSITO: es donde lo tiene el operador que
    // acaba de pulsarlo, y es el nodo que `ModalShell` captura como disparador.
    // Sin esto, la cadena de respaldo ni siquiera llegaría a considerarlo.
    boton(wrapper, 'Revisar y suprimir').element.focus()
    await wrapper.find('form').trigger('submit')
    await flushPromises()
  }

  it('tras el acuse, el foco está en el encabezado y NO en el botón que se pulsó', async () => {
    proposalSuppressionApi.suppress.mockResolvedValue(contadores())
    const wrapper = montarConDialogo()
    await abrirElDialogo(wrapper)

    await boton(wrapper, 'Suprimir los datos').trigger('click')
    await flushPromises()

    // Control de que la escritura ocurrió: sin acuse no habría nada que anunciar
    // y la afirmación de abajo no significaría nada.
    expect(wrapper.findComponent(SuppressionOutcomePanel).exists()).toBe(true)

    expect(
      document.activeElement,
      'el foco se quedó en «Revisar y suprimir»: quien usa teclado o lector de pantalla no se entera de que el borrado irreversible se ejecutó, ni con qué resultado',
    ).toBe(wrapper.get('#supresion-titulo').element)

    wrapper.unmount()
  })

  /**
   * CONTROL POSITIVO, sobre el mismo instrumento. Demuestra que la devolución de
   * foco está viva y que el `document.activeElement` de arriba mide algo: si el
   * diálogo devolviera el foco al encabezado SIEMPRE, esto se pondría rojo.
   */
  it('cancelar no escribe nada, así que el foco vuelve al botón que lo abrió', async () => {
    proposalSuppressionApi.suppress.mockResolvedValue(contadores())
    const wrapper = montarConDialogo()
    await abrirElDialogo(wrapper)

    await boton(wrapper, 'Cancelar').trigger('click')
    await flushPromises()

    expect(
      proposalSuppressionApi.suppress,
      'cancelar no puede haber borrado nada',
    ).not.toHaveBeenCalled()
    expect(
      document.activeElement,
      'cancelar arrancó al operador del botón desde el que abrió el diálogo, sin que hubiera pasado nada',
    ).toBe(boton(wrapper, 'Revisar y suprimir').element)

    wrapper.unmount()
  })

  /**
   * Un fallo no deja acuse, así que no hay resultado nuevo al que llevar el foco:
   * el banner `role="alert"` del formulario se anuncia solo y es vecino inmediato
   * del botón. Subir el foco al encabezado dejaría al operador más lejos del
   * campo que tiene que corregir.
   */
  it('si la llamada falla, el foco se queda en el botón, junto al banner del error', async () => {
    proposalSuppressionApi.suppress.mockRejectedValue(
      problemDetail(500, 'La transacción se deshizo.'),
    )
    const wrapper = montarConDialogo()
    await abrirElDialogo(wrapper)

    await boton(wrapper, 'Suprimir los datos').trigger('click')
    await flushPromises()

    expect(wrapper.findComponent(SuppressionOutcomePanel).exists()).toBe(false)
    expect(wrapper.find('[data-testid="supresion-error-servidor"]').exists()).toBe(true)
    expect(document.activeElement).toBe(boton(wrapper, 'Revisar y suprimir').element)

    wrapper.unmount()
  })
})
