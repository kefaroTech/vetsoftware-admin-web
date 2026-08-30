import { expect, test } from '@playwright/test'
import {
  CORREO_TITULAR,
  RELOJ_DEL_NAVEGADOR_PINTADO,
  SUPRESION_ANTERIOR,
  SUPRESION_ANTERIOR_PINTADA,
  SUPRIMIDO_EL_PINTADO,
  abrirSupresion,
  acuse,
  acuseBanner,
  acuseCeroAmbiguo,
  acuseMomento,
  acuseOtraDireccion,
  acuseSupresionAnterior,
  acuseConHallazgo,
  acuseSinHallazgo,
  botonCancelar,
  botonRevisar,
  botonSuprimir,
  campoCorreo,
  contador,
  correoEnElModal,
  errorDelCampo,
  errorServidor,
  modal,
  seccion,
} from '../helpers/supresion'

/**
 * **Supresión de datos del asistente** — Ley 1581, artículo 8, literal e.
 *
 * <p>El aviso de privacidad le promete al prospecto anónimo el derecho de
 * supresión. Esta pantalla es la única vía por la que un operador lo atiende, y
 * su resultado es lo que hay que poder enseñar ante la SIC. Lo que se comprueba
 * aquí no es que pinte un formulario: son los tres invariantes de los que
 * depende que sirva para lo que existe, y los tres tienen delante un modo de
 * fallo concreto.
 *
 * <ol>
 *   <li><b>Cero coincidencias NO es éxito.</b> El servidor responde 200 con los
 *       cuatro números a cero cuando no encuentra nada, y lo hace a propósito
 *       para no ser un oráculo de existencia. Traducir ese 200 a un cartel verde
 *       es como se cierra una petición de habeas data sin haberla atendido:
 *       quien la atiende cree que borró algo y nunca prueba otra dirección. Se
 *       afirma por los DOS lados —el hallazgo es `role="status"`, el cero es
 *       `role="alert"`, y ninguno lleva las señas del otro—, porque una prueba
 *       que solo mire el caso malo pasaría igual con la pantalla pintando
 *       siempre en rojo.</li>
 *   <li><b>Ninguna llamada sale sin pasar por el modal.</b> La operación es
 *       irreversible y <b>no existe ningún endpoint de lectura</b>: no se puede
 *       mirar antes y decidir después, la primera llamada ya borra. La
 *       confirmación no es cortesía, es lo único que sustituye a la consulta
 *       previa que el contrato no ofrece. Es una afirmación de AUSENCIA, así que
 *       va siempre con control positivo: el mismo contador que dice «cero» antes
 *       de confirmar tiene que decir «uno» después. Sin eso, «no se llamó a la
 *       API» y «mi prueba no mira las llamadas» dan exactamente la misma
 *       salida.</li>
 *   <li><b>La fecha del acuse viene del servidor.</b> `suppressedAt` acaba de
 *       entrar al contrato; antes la pantalla la fabricaba con `Date.now()`. Una
 *       fecha del reloj del cliente no vale como prueba de una obligación legal:
 *       se cambia desde el panel de control del equipo. Aquí el reloj del
 *       navegador está clavado en 2031 y el acuse dice 2019 — si volviera a
 *       salir del navegador, se vería. Y `previouslySuppressedAt` es lo que
 *       separa los dos ceros: «este correo nunca pidió nada» de «ya se le borró
 *       todo».</li>
 * </ol>
 *
 * <p>La API va interceptada y el sistema queda como estaba: el endpoint borra
 * de verdad, no se deshace y no hay lectura con la que restituir. Ver
 * `e2e/helpers/supresion.ts`.
 */

test.describe('Supresión de datos del asistente · el formulario', () => {
  test('formulario vacío: sin acuse, sin error y con el modal cerrado', async ({ page }) => {
    const api = await abrirSupresion(page, { clase: 'acuse', cuerpo: acuseConHallazgo() })

    await expect(campoCorreo(page)).toHaveValue('')
    await expect(campoCorreo(page)).not.toHaveAttribute('aria-invalid', 'true')
    await expect(errorDelCampo(page)).toHaveCount(0)
    await expect(acuse(page)).toHaveCount(0)
    await expect(errorServidor(page)).toHaveCount(0)
    await expect(modal(page)).toBeHidden()
    await expect(botonRevisar(page)).toBeEnabled()

    // El aviso que separa esta vía del barrido nocturno se lee de entrada: un
    // cero puede venir de que el barrido se adelantó, y quien atiende la
    // petición tiene que saberlo antes de escribir nada.
    await expect(seccion(page)).toContainText('No es lo mismo que la retención automática.')

    expect(api.correosEnviados()).toEqual([])
  })

  test('un correo mal formado se queda en el formulario: ni modal ni llamada', async ({ page }) => {
    const api = await abrirSupresion(page, { clase: 'acuse', cuerpo: acuseConHallazgo() })

    await campoCorreo(page).fill('titular@clinica')
    await botonRevisar(page).click()

    await expect(errorDelCampo(page)).toBeVisible()
    await expect(errorDelCampo(page)).toContainText('no tiene el formato correcto')
    await expect(campoCorreo(page)).toHaveAttribute('aria-invalid', 'true')
    // El error que se anuncia es el que se ve: `aria-describedby` tiene que
    // resolver al mismo nodo, no a uno huérfano.
    await expect(campoCorreo(page)).toHaveAttribute('aria-describedby', 'supresion-correo-error')

    await expect(modal(page)).toBeHidden()
    expect(
      api.correosEnviados(),
      'un formato inválido no puede llegar a la API: el 400 llegaría DESPUÉS de la confirmación',
    ).toEqual([])
  })

  test('el campo vacío tampoco abre la confirmación', async ({ page }) => {
    const api = await abrirSupresion(page, { clase: 'acuse', cuerpo: acuseConHallazgo() })

    await botonRevisar(page).click()

    await expect(errorDelCampo(page)).toContainText('El correo del titular es obligatorio.')
    await expect(modal(page)).toBeHidden()
    expect(api.correosEnviados()).toEqual([])
  })
})

test.describe('Supresión de datos del asistente · la confirmación', () => {
  test('el modal se abre con el correo a la vista y ya recortado', async ({ page }) => {
    const api = await abrirSupresion(page, { clase: 'acuse', cuerpo: acuseConHallazgo() })

    await campoCorreo(page).fill(`   ${CORREO_TITULAR}   `)
    await botonRevisar(page).click()

    await expect(modal(page)).toBeVisible()
    await expect(modal(page)).toContainText('No se puede deshacer.')
    // El sujeto de la operación, literal y sin espacios: es lo único que el
    // operador puede contrastar antes de pulsar el botón rojo.
    await expect(correoEnElModal(page)).toHaveText(CORREO_TITULAR)

    expect(api.correosEnviados(), 'abrir el diálogo no puede haber llamado ya a la API').toEqual([])
  })

  /**
   * INVARIANTE 2, con su control positivo dentro de la misma prueba y sobre el
   * MISMO instrumento. Los tres ceros de arriba solo significan algo porque el
   * uno de abajo demuestra que el contador sabe contar.
   */
  test('ninguna llamada sale sin pasar por el modal — y al confirmar sale exactamente una', async ({
    page,
  }) => {
    const api = await abrirSupresion(page, { clase: 'acuse', cuerpo: acuseConHallazgo() })

    // 1 · Un enter en el campo es un `submit`. Abre el diálogo, no borra.
    await campoCorreo(page).fill(CORREO_TITULAR)
    await campoCorreo(page).press('Enter')
    await expect(modal(page)).toBeVisible()
    expect(api.correosEnviados(), 'un enter en el campo no puede borrar').toEqual([])

    // 2 · Cancelar cierra sin llamar.
    await botonCancelar(page).click()
    await expect(modal(page)).toBeHidden()
    expect(api.correosEnviados(), 'cancelar no puede borrar').toEqual([])

    // 3 · Volver a abrir tampoco.
    await botonRevisar(page).click()
    await expect(modal(page)).toBeVisible()
    expect(api.correosEnviados()).toEqual([])

    // 4 · CONTROL POSITIVO: el botón rojo del modal sí llama, una sola vez y con
    //     el correo recortado. Si el arnés no estuviera contando, esto sería el
    //     rojo que lo delata.
    await botonSuprimir(page).click()
    await expect(acuse(page)).toBeVisible()
    await expect(modal(page)).toBeHidden()
    expect(api.correosEnviados()).toEqual([CORREO_TITULAR])
    // El contrato declara UN solo campo. Un segundo campo en el cuerpo sería un
    // dato personal de más viajando a un endpoint de borrado.
    expect(api.peticiones.map((p) => [...p.claves].sort())).toEqual([['contactEmail']])
  })
})

test.describe('Supresión de datos del asistente · el acuse', () => {
  test('con hallazgo: se anuncia como estado, en tono de éxito y con los tres contadores', async ({
    page,
  }) => {
    await abrirSupresion(page, {
      clase: 'acuse',
      cuerpo: acuseConHallazgo({ proposals: 1, turns: 4, lines: 2 }),
    })

    await campoCorreo(page).fill(CORREO_TITULAR)
    await botonRevisar(page).click()
    await botonSuprimir(page).click()

    await expect(acuse(page)).toBeVisible()
    await expect(acuse(page)).toHaveAttribute('data-resultado', 'hallazgo')
    // `role="status"` y no `alert`: se anuncia sin interrumpir, porque el
    // trabajo del operador terminó aquí.
    await expect(acuse(page)).toHaveAttribute('role', 'status')
    await expect(acuseBanner(page)).toHaveAttribute('data-tono', 'exito')
    await expect(acuse(page)).toContainText(CORREO_TITULAR)

    // Los tres, no solo el total: un total suelto no distingue «ese correo no
    // está» de «el paso de los motivos no tocó nada porque su consulta está
    // rota» (`ProposalSuppressionDto.java:9-13`).
    await expect(contador(page, 'proposals')).toHaveText('1')
    await expect(contador(page, 'turns')).toHaveText('4')
    await expect(contador(page, 'lines')).toHaveText('2')
    await expect(contador(page, 'total')).toHaveText('7')

    // El otro lado del invariante 1: el acuse con hallazgo NO puede llevar
    // ninguna de las señas del cero.
    await expect(acuseOtraDireccion(page)).toHaveCount(0)
    await expect(acuseCeroAmbiguo(page)).toHaveCount(0)
    await expect(acuseSupresionAnterior(page)).toHaveCount(0)
  })

  /**
   * INVARIANTE 1. El servidor contesta 200 igual que arriba; la única barrera
   * entre «se borró» y «no había nada» es esta pantalla.
   */
  test('sin hallazgo: se anuncia como alerta, en tono de aviso, y manda a probar otra dirección', async ({
    page,
  }) => {
    await abrirSupresion(page, { clase: 'acuse', cuerpo: acuseSinHallazgo() })

    await campoCorreo(page).fill(CORREO_TITULAR)
    await botonRevisar(page).click()
    await botonSuprimir(page).click()

    await expect(acuse(page)).toBeVisible()
    await expect(acuse(page)).toHaveAttribute('data-resultado', 'sin-hallazgo')
    await expect(acuse(page)).toHaveAttribute('role', 'alert')
    await expect(acuseBanner(page)).toHaveAttribute('data-tono', 'aviso')
    await expect(acuse(page)).toContainText('Nada se borró.')

    // Los cuatro ceros se pintan: son la respuesta, y esconderlos dejaría al
    // operador sin ver que la petición llegó al servidor y volvió.
    await expect(contador(page, 'proposals')).toHaveText('0')
    await expect(contador(page, 'turns')).toHaveText('0')
    await expect(contador(page, 'lines')).toHaveText('0')
    await expect(contador(page, 'total')).toHaveText('0')

    // Lo que hace que la petición NO se dé por cerrada.
    await expect(acuseCeroAmbiguo(page)).toBeVisible()
    await expect(acuseOtraDireccion(page)).toBeVisible()
    await expect(acuseOtraDireccion(page)).toContainText('pruébala')
    await expect(acuseSupresionAnterior(page)).toHaveCount(0)
  })

  /**
   * INVARIANTE 3, segunda mitad: `previouslySuppressedAt` es lo único que separa
   * los dos ceros. Mandar a «probar otra dirección» a un titular al que ya se le
   * borró todo le hace perder el tiempo sobre un derecho ya ejercido.
   */
  test('sin hallazgo pero con supresión anterior: dice cuándo se atendió y NO manda a otra dirección', async ({
    page,
  }) => {
    await abrirSupresion(page, {
      clase: 'acuse',
      cuerpo: acuseSinHallazgo(SUPRESION_ANTERIOR),
    })

    await campoCorreo(page).fill(CORREO_TITULAR)
    await botonRevisar(page).click()
    await botonSuprimir(page).click()

    await expect(acuse(page)).toBeVisible()
    // Sigue sin ser un éxito: no se borró nada.
    await expect(acuse(page)).toHaveAttribute('data-resultado', 'sin-hallazgo')
    await expect(acuse(page)).toHaveAttribute('role', 'alert')

    await expect(acuseSupresionAnterior(page)).toBeVisible()
    await expect(acuseSupresionAnterior(page)).toContainText(SUPRESION_ANTERIOR_PINTADA)
    await expect(acuseSupresionAnterior(page)).toContainText('La petición está atendida')

    await expect(
      acuseOtraDireccion(page),
      'con una supresión anterior registrada no hay otra dirección que probar',
    ).toHaveCount(0)
    await expect(acuseCeroAmbiguo(page)).toHaveCount(0)
  })

  /**
   * INVARIANTE 3, primera mitad. El reloj del navegador está clavado en
   * 25/12/2031 (`abrirSupresion`) y el acuse trae 07/03/2019: si la fecha
   * volviera a salir de `Date.now()`, el texto diría 2031.
   */
  test('la fecha del acuse es la del SERVIDOR, no la del reloj del navegador', async ({ page }) => {
    await abrirSupresion(page, { clase: 'acuse', cuerpo: acuseConHallazgo() })

    await campoCorreo(page).fill(CORREO_TITULAR)
    await botonRevisar(page).click()
    await botonSuprimir(page).click()

    await expect(acuseMomento(page)).toBeVisible()
    await expect(acuseMomento(page)).toContainText(SUPRIMIDO_EL_PINTADO)
    await expect(acuseMomento(page)).toContainText('del reloj del servidor, no')

    // El control que mata la mutación: el reloj del navegador dice otra cosa, y
    // esa otra cosa no puede aparecer en el acuse por ninguna vía.
    await expect(
      acuse(page),
      'el acuse está pintando la fecha del navegador: no vale como constancia ante la SIC',
    ).not.toContainText(RELOJ_DEL_NAVEGADOR_PINTADO)

    // Comprobación de que el reloj simulado es real y el control de arriba mide
    // algo: la propia página, preguntada, dice 2031.
    const relojDeLaPagina = await page.evaluate(() => new Date().getFullYear())
    expect(
      relojDeLaPagina,
      'el reloj del navegador no quedó fijado: la comprobación de arriba no probaría nada',
    ).toBe(2031)
  })
})

test.describe('Supresión de datos del asistente · el error del servidor', () => {
  test('un 500 pinta el banner de error con el mensaje del servidor y su traza, y no deja acuse', async ({
    page,
  }) => {
    const api = await abrirSupresion(page, {
      clase: 'fallo',
      status: 500,
      detail: 'No se pudo ejecutar la supresión: la transacción se deshizo.',
      traceId: 'e2e-traza-supresion-0001',
    })

    await campoCorreo(page).fill(CORREO_TITULAR)
    await botonRevisar(page).click()
    await botonSuprimir(page).click()

    await expect(errorServidor(page)).toBeVisible()
    await expect(errorServidor(page)).toContainText(
      'No se pudo ejecutar la supresión: la transacción se deshizo.',
    )
    // La traza es lo que hace auditable la operación sobre la que después hay
    // que responder ante la SIC.
    await expect(errorServidor(page)).toContainText('e2e-traza-supresion-0001')

    // Nada de acuse: un acuse tras un fallo sería una constancia falsa.
    await expect(acuse(page)).toHaveCount(0)
    // El diálogo se cierra igual, para no invitar a pulsar otra vez sin leer.
    await expect(modal(page)).toBeHidden()

    // Control positivo del propio caso: la llamada SÍ salió, una sola vez.
    expect(api.correosEnviados()).toEqual([CORREO_TITULAR])
  })

  test('corregir el correo retira el banner de error', async ({ page }) => {
    await abrirSupresion(page, {
      clase: 'fallo',
      status: 500,
      detail: 'No se pudo ejecutar la supresión: la transacción se deshizo.',
      traceId: 'e2e-traza-supresion-0002',
    })

    await campoCorreo(page).fill(CORREO_TITULAR)
    await botonRevisar(page).click()
    await botonSuprimir(page).click()
    await expect(errorServidor(page)).toBeVisible()

    await campoCorreo(page).fill('otro.titular@ejemplo-clinica.co')
    await expect(
      errorServidor(page),
      'el operador que corrige el texto está respondiendo al aviso; dejarlo puesto lo vuelve ruido',
    ).toHaveCount(0)
  })
})
