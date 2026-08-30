import { expect, type Page, type Request } from '@playwright/test'
import { bloquearFuentesRemotas, esperarVeloOculto, seedSession } from './app-shell'
import type { ProposalSuppressionResponse } from '@/features/proposal-suppression/types/proposal-suppression.types'

/**
 * Arnés de la pantalla de **supresión de datos del asistente** — habeas data,
 * artículo 8, literal e, de la Ley 1581.
 *
 * ── Por qué la API va interceptada, y aquí no es una comodidad ─────────────
 * El endpoint de detrás **borra de verdad y no se deshace**, y el contrato no
 * publica ninguna lectura con la que comprobar antes ni restituir después. Una
 * suite que lo llamara de verdad incumpliría la regla de «cada spec deja el
 * sistema como lo encontró» de la única forma que no tiene arreglo. Además, los
 * dos desenlaces que esta suite existe para separar —hallazgo y cero
 * coincidencias— no se pueden provocar a voluntad contra datos reales: el
 * segundo solo aparece con un correo que no está, y el primero exige sembrar
 * una propuesta para destruirla acto seguido.
 *
 * ── Y por eso el contador de llamadas es el instrumento principal ──────────
 * El invariante «ninguna llamada sale sin pasar por el modal» es una
 * afirmación de AUSENCIA, y una afirmación de ausencia sin control positivo no
 * distingue «no se llamó» de «mi prueba no mira las llamadas». Por eso
 * {@link ApiSimulada.correosEnviados} es el mismo instrumento que reporta el
 * cero antes de confirmar y el uno después: si el arnés dejara de contar, el
 * control positivo se pondría rojo en el acto.
 *
 * ── Sin backend, en su propio proyecto de Playwright ───────────────────────
 * `supresion-datos` en `playwright.config.ts`, sin `dependencies`: no arrastra
 * el proyecto `setup`, que sí exige `localdev` arriba. Mismo criterio que
 * `armazon-tablet`.
 */

/** La ruta de la pantalla (`proposal-suppression.routes.ts`). */
export const RUTA_SUPRESION = '/asistente/supresion-datos'

/**
 * El único endpoint que esta pantalla llama, tal como lo escribe
 * `proposal-suppression.api.ts`: `POST`, en plural y con el correo en el
 * cuerpo. Se compara contra el path REAL de la petición, así que si alguien
 * cambiara la ruta del cliente el contador dejaría de sumar y los controles
 * positivos se pondrían rojos.
 */
export const RUTA_API_SUPRESION = '/assistant/proposals/suppress'

/**
 * Correo del titular de las pruebas. Lleva `e2e` en el buzón para que sea
 * reconocible como dato de prueba si alguna vez llegara a un servidor de
 * verdad — que con este arnés no ocurre.
 */
export const CORREO_TITULAR = 'e2e.supresion.titular@ejemplo-clinica.co'

/**
 * Las marcas del servidor de las pruebas, en PASADO y fijas.
 *
 * <p>Ninguna se calcula a partir de «hoy», y es deliberado: una línea base de
 * este proyecto llevaba el mes en doce expresiones regulares y se puso roja
 * sola tres días después. Una fecha del pasado nunca se convierte en la de hoy,
 * así que estas constantes valen igual el año que viene.
 *
 * <p>Van sin zona horaria porque el servidor las manda así (`LocalDateTime`), y
 * se esperan pintadas campo a campo: si alguien las hiciera pasar por
 * `new Date()`, el par dejaría de casar en cualquier equipo que no esté en UTC.
 */
export const SUPRIMIDO_EL = '2019-03-07T09:41:12'
export const SUPRIMIDO_EL_PINTADO = '07/03/2019 a las 09:41'
export const SUPRESION_ANTERIOR = '2018-11-23T17:05:00'
export const SUPRESION_ANTERIOR_PINTADA = '23/11/2018 a las 17:05'

/**
 * Reloj del NAVEGADOR durante las pruebas, puesto a propósito lejísimos de las
 * marcas de arriba. Es lo que convierte «la fecha viene del servidor» en algo
 * comprobable: si la pantalla volviera a fabricarla con `Date.now()`, el acuse
 * pintaría esta fecha y no la del acuse.
 */
export const RELOJ_DEL_NAVEGADOR = new Date('2031-12-25T03:04:05Z')
export const RELOJ_DEL_NAVEGADOR_PINTADO = '25/12/2031'

/** Un acuse CON hallazgo. `total` es la suma, como en `SuppressionResult.total()`. */
export function acuseConHallazgo(
  over: Partial<ProposalSuppressionResponse> = {},
): ProposalSuppressionResponse {
  const proposals = over.proposals ?? 1
  const turns = over.turns ?? 4
  const lines = over.lines ?? 2
  return {
    proposals,
    turns,
    lines,
    total: over.total ?? proposals + turns + lines,
    suppressedAt: over.suppressedAt ?? SUPRIMIDO_EL,
    ...(over.previouslySuppressedAt === undefined
      ? {}
      : { previouslySuppressedAt: over.previouslySuppressedAt }),
  }
}

/**
 * Un acuse SIN hallazgo: 200 con los cuatro números a cero. Es la respuesta que
 * el servidor da a propósito para no ser un oráculo de existencia
 * (`AiProposalRetentionController.java:47-51`), y el caso que esta suite existe
 * para impedir que se pinte como éxito.
 */
export function acuseSinHallazgo(previouslySuppressedAt?: string): ProposalSuppressionResponse {
  return acuseConHallazgo({
    proposals: 0,
    turns: 0,
    lines: 0,
    total: 0,
    previouslySuppressedAt,
  })
}

/** Lo que el servidor simulado contestará a la siguiente supresión. */
export type RespuestaDelServidor =
  | { clase: 'acuse'; cuerpo: ProposalSuppressionResponse }
  | { clase: 'fallo'; status: number; detail: string; traceId: string }

/** Lo que se registró de un POST de supresión. */
export interface PeticionSupresion {
  readonly correo: string
  /** Las claves del JSON enviado. El contrato declara UNA sola: `contactEmail`. */
  readonly claves: readonly string[]
}

export interface ApiSimulada {
  /** Cada POST a la ruta de supresión, en orden de salida. */
  readonly peticiones: readonly PeticionSupresion[]
  /** Los correos enviados. Es el instrumento de los invariantes de ausencia. */
  correosEnviados(): string[]
}

/**
 * Saca el `contactEmail` del cuerpo sin `any` y sin `!`: si el cuerpo no tiene
 * la forma del contrato, esto revienta con el cuerpo escrito en el mensaje, que
 * es un fallo mucho más útil que un `undefined` viajando hasta la aserción.
 */
function correoDelCuerpo(crudo: unknown): string {
  if (typeof crudo === 'object' && crudo !== null && 'contactEmail' in crudo) {
    const valor: unknown = (crudo as { contactEmail: unknown }).contactEmail
    if (typeof valor === 'string') return valor
  }
  throw new Error(
    `El POST de supresión no envió un \`contactEmail\` de tipo string: ${JSON.stringify(crudo)}`,
  )
}

/**
 * Las cabeceras CORS del backend real, copiadas de `CorsConfig.java:25`.
 *
 * <p><b>`access-control-expose-headers` no es adorno.</b> La aplicación corre en
 * `:5173` y la API en `:8080`, o sea CRUZANDO ORIGEN, y sin esa cabecera el
 * navegador deja leer el cuerpo pero ESCONDE `X-Trace-Id` a JavaScript: el
 * banner de error saldría con el mensaje del servidor y sin traza. Sin estas
 * cabeceras el arnés era MÁS ESTRICTO que la realidad, y la prueba de la traza
 * se ponía roja contra un producto que está bien — que es la peor clase de
 * fallo, porque acusa al código en vez de al instrumento. Se reproduce la lista
 * exacta del servidor: si alguien le quitara `X-Trace-Id` allí, esto seguiría
 * siendo una copia fiel y no un deseo.
 */
function cabecerasCors(peticion: Request): Record<string, string> {
  const cabeceras = peticion.headers()
  return {
    // `allowCredentials: true` en el servidor obliga a devolver el origen
    // CONCRETO y no `*`: con comodín, Chromium rechaza la respuesta entera.
    'access-control-allow-origin': cabeceras['origin'] ?? '*',
    'access-control-allow-credentials': 'true',
    'access-control-allow-methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    // El servidor declara `allowedHeaders: ["*"]` y Spring lo resuelve
    // devolviendo lo que pidió el preflight. Se hace igual.
    'access-control-allow-headers': cabeceras['access-control-request-headers'] ?? '*',
    'access-control-expose-headers': 'Authorization, X-Trace-Id, X-Request-Id',
    'access-control-max-age': '3600',
  }
}

const USUARIO_SIMULADO = { id: 1, name: 'Operador de pruebas E2E', permissions: [] }
const PAGINA_VACIA = { content: [], page: 0, pageSize: 20, totalElements: 0, totalPages: 0 }

/**
 * Intercepta TODA la API con un solo manejador. Uno y no varias rutas porque
 * Playwright las resuelve en orden inverso al de registro, y depender de ese
 * orden es lo que se rompe al añadir un caso (misma lección que
 * `helpers/app-shell.ts`).
 */
export async function montarApi(page: Page, inicial: RespuestaDelServidor): Promise<ApiSimulada> {
  const peticiones: PeticionSupresion[] = []
  const respuesta = inicial

  await page.route(/\/api\/v1\//, async (route) => {
    const peticion = route.request()
    const ruta = new URL(peticion.url()).pathname.replace(/^.*\/api\/v1/, '')

    // La aplicación vive en :5173 y la API en :8080, así que toda petición
    // con `Authorization` va preflighted. Sin contestar el OPTIONS el
    // navegador ni llega a mandar el POST y la pantalla se queda sin acuse:
    // un rojo que no dice nada del producto.
    if (peticion.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: cabecerasCors(peticion), body: '' })
      return
    }

    if (ruta === RUTA_API_SUPRESION && peticion.method() === 'POST') {
      const crudo: unknown = peticion.postDataJSON()
      peticiones.push({
        correo: correoDelCuerpo(crudo),
        claves: typeof crudo === 'object' && crudo !== null ? Object.keys(crudo) : [],
      })
      if (respuesta.clase === 'acuse') {
        await route.fulfill({
          status: 200,
          headers: { ...cabecerasCors(peticion), 'content-type': 'application/json' },
          body: JSON.stringify(respuesta.cuerpo),
        })
        return
      }
      await route.fulfill({
        status: respuesta.status,
        headers: {
          ...cabecerasCors(peticion),
          'content-type': 'application/problem+json',
          'x-trace-id': respuesta.traceId,
        },
        body: JSON.stringify({
          type: 'about:blank',
          title: 'Internal Server Error',
          status: respuesta.status,
          detail: respuesta.detail,
        }),
      })
      return
    }

    await route.fulfill({
      status: 200,
      headers: { ...cabecerasCors(peticion), 'content-type': 'application/json' },
      body: JSON.stringify(ruta === '/auth/me' ? USUARIO_SIMULADO : PAGINA_VACIA),
    })
  })

  return {
    peticiones,
    correosEnviados: () => peticiones.map((p) => p.correo),
  }
}

/**
 * Abre la pantalla con sesión sembrada, API interceptada y el reloj del
 * navegador clavado en {@link RELOJ_DEL_NAVEGADOR}.
 *
 * <p>El reloj se fija ANTES de navegar y en todas las pruebas, no solo en la
 * que mira la fecha: así ninguna otra puede pasar por casualidad porque el
 * reloj real y el del acuse coincidieran.
 */
export async function abrirSupresion(
  page: Page,
  respuesta: RespuestaDelServidor,
): Promise<ApiSimulada> {
  await page.clock.setFixedTime(RELOJ_DEL_NAVEGADOR)
  await bloquearFuentesRemotas(page)
  const api = await montarApi(page, respuesta)
  await seedSession(page)
  await page.goto(RUTA_SUPRESION)
  // Se espera a la SECCIÓN y no a `main#contenido`. La razón original era que
  // esta ruta no se pintaba dentro de `AppLayout`; ESO YA ESTÁ ARREGLADO —la
  // vista monta el armazón, hay landmark `main` y un `<h1>`—, pero la espera se
  // mantiene sobre la sección a propósito: es el ancla propia de esta pantalla y
  // no depende de la estructura del armazón, así que esta suite sigue midiendo
  // la supresión y no la envoltura. El armazón lo cubren sus propias pruebas.
  await expect(seccion(page)).toBeVisible()
  await esperarVeloOculto(page)
  return api
}

/** La pantalla. Por su `aria-labelledby`, que es un ancla del producto. */
export const seccion = (page: Page) => page.locator('section[aria-labelledby="supresion-titulo"]')

/** El campo del correo del titular. */
export const campoCorreo = (page: Page) => page.locator('input#supresion-correo')

/**
 * El mensaje de error del campo. Se localiza por el `id` que `AppInput` ata con
 * `aria-describedby`, no por su clase: es el mismo nodo que anuncia el lector
 * de pantalla.
 */
export const errorDelCampo = (page: Page) => page.locator('#supresion-correo-error')

/** El botón que abre la confirmación. Por rol y nombre accesible. */
export const botonRevisar = (page: Page) =>
  page.getByRole('button', { name: 'Revisar y suprimir', exact: true })

/** El botón rojo del modal, el único que dispara la llamada. */
export const botonSuprimir = (page: Page) =>
  page.getByRole('button', { name: 'Suprimir los datos', exact: true })

export const botonCancelar = (page: Page) =>
  page.getByRole('button', { name: 'Cancelar', exact: true })

/** El modal de confirmación. `role="alertdialog"` es del producto, no del test. */
export const modal = (page: Page) => page.getByRole('alertdialog')

/** El correo pintado dentro del modal: el sujeto de la operación. */
export const correoEnElModal = (page: Page) => page.getByTestId('confirmar-correo')

/** El acuse. */
export const acuse = (page: Page) => page.getByTestId('acuse')
export const acuseBanner = (page: Page) => page.getByTestId('acuse-banner')
export const acuseMomento = (page: Page) => page.getByTestId('acuse-momento')
export const acuseSupresionAnterior = (page: Page) => page.getByTestId('acuse-supresion-anterior')
export const acuseCeroAmbiguo = (page: Page) => page.getByTestId('acuse-cero-ambiguo')
export const acuseOtraDireccion = (page: Page) => page.getByTestId('acuse-otra-direccion')

/** Los cuatro números del desglose. */
export const contador = (page: Page, cual: 'proposals' | 'turns' | 'lines' | 'total') =>
  page.getByTestId(`acuse-contador-${cual}`)

/** El banner de error de servidor del formulario. */
export const errorServidor = (page: Page) => page.getByTestId('supresion-error-servidor')
