import { expect, test, type Page } from '@playwright/test'
import {
  ESCRITORIO,
  VIEWPORTS_TABLET,
  abrirArmazon,
  abrirListadoLargo,
  cajon,
  cerrarCajon,
  hamburguesa,
  medidasDelDocumento,
  navegacion,
  scrollersVerticales,
} from '../helpers/app-shell'

/**
 * Armazón de la consola en tablet — §8 de
 * `docs/ux/armazon-tablet-especificacion.md`, medido en navegador.
 *
 * Hasta esta suite, el arreglo del doble scroll y del cajón estaba verificado
 * por tipos y por lint. Ninguna de las dos cosas ve una barra de scroll: el
 * defecto que reportó el usuario —«hay dos barras»— es un hecho de layout que
 * solo existe cuando un motor calcula cajas. Aquí se abre un navegador de
 * verdad, se sirve un listado LARGO y se miden las cajas con
 * `getBoundingClientRect()` y `scrollHeight`, no se derivan del CSS.
 *
 * ── Sin backend, y es un requisito, no un atajo ────────────────────────────
 * Todo el tráfico de API está interceptado (`e2e/helpers/app-shell.ts`). Dos
 * razones: la suite tiene que poder correr aunque `localdev` esté apagado —el
 * armazón no depende del servidor— y, sobre todo, el contenido tiene que ser
 * el MISMO en cada tirada. Una tabla cuyo alto dependa de cuántas empresas
 * haya sembradas ese día convierte «el documento no desborda» en una medida
 * que a veces se cumple sola.
 *
 * Por eso esta suite vive en su propio proyecto de `playwright.config.ts`
 * (`armazon-tablet`) y NO depende del proyecto `setup`, que sí necesita el
 * backend real.
 */

/**
 * Abre el cajón por su único acceso real y espera a que esté DEL TODO dentro.
 *
 * Las tres esperas son distintas y ninguna sobra. `aria-expanded` dice que el
 * estado cambió; el foco en la X dice que el `<aside>` ya salió de `inert`. Ni
 * una ni otra dicen nada de dónde ESTÁ el panel: el foco se coloca en un
 * `requestAnimationFrame`, o sea al principio de la transición de 0,18 s, y en
 * ese instante el cajón sigue en `translateX(-100%)`. Medir ahí da un cajón en
 * x = −280 con el velo cubriendo la pantalla entera — que es exactamente el
 * falso negativo que tuvo la primera versión de esta suite.
 *
 * Se espera por la posición real, no por un `waitForTimeout`: `expect.poll`
 * reintenta la medida hasta que el borde izquierdo del panel es 0.
 */
async function abrirCajon(page: Page) {
  await hamburguesa(page).click()
  await expect(hamburguesa(page)).toHaveAttribute('aria-expanded', 'true')
  await expect(cerrarCajon(page)).toBeFocused()
  await expect
    .poll(async () => (await cajon(page).boundingBox())?.x, {
      message: 'el cajón no terminó de entrar en pantalla',
    })
    .toBe(0)
}

for (const { nombre, viewport } of VIEWPORTS_TABLET) {
  test.describe(`Armazón en tablet ${nombre}`, () => {
    test.use({ viewport })

    test('§8.1 §8.2 §8.3 · el documento no scrollea y solo hay UN scroller de contenido', async ({
      page,
    }) => {
      await abrirListadoLargo(page)

      const doc = await medidasDelDocumento(page)
      // La cifra exacta va en el mensaje a propósito: si esto se rompe, el
      // informe tiene que poder decir «sobran 214 px», no «falla».
      expect(
        doc.scrollHeight,
        `el documento ofrece ${doc.scrollHeight - doc.clientHeight}px de scroll vertical ` +
          `(scrollHeight ${doc.scrollHeight} > clientHeight ${doc.clientHeight}): ` +
          'esa es la SEGUNDA barra que reportó el usuario',
      ).toBeLessThanOrEqual(doc.clientHeight)

      expect(
        doc.scrollWidth,
        `desbordamiento horizontal de ${doc.scrollWidth - doc.innerWidth}px`,
      ).toBeLessThanOrEqual(doc.innerWidth)

      const scrollers = await scrollersVerticales(page)
      expect(
        scrollers.visibles,
        `desplazables alcanzables: ${scrollers.visibles.join(' | ')} · ` +
          `fuera de pantalla: ${scrollers.fueraDePantalla.join(' | ') || '(ninguno)'}`,
      ).toEqual([expect.stringContaining('#contenido')])

      // §8.3 se enuncia como «exactamente UN contenedor de scroll en el árbol».
      // A 1024×768 hay un segundo, `.nav-groups`, porque el menú no cabe en 768
      // px de alto — pero vive en un panel en x = −280 y marcado `inert`, así
      // que el usuario ni lo ve ni lo alcanza. Se afirma esa condición, que es
      // la que hace inocuo al segundo scroller: si algún día deja de estar
      // fuera de pantalla, esto se pone rojo.
      for (const oculto of scrollers.fueraDePantalla) {
        expect(
          oculto.includes('#app-nav'),
          `hay un scroller fuera de pantalla que no es el menú cerrado: ${oculto}`,
        ).toBe(true)
      }
    })

    test('§8.1 §8.4 · con el cajón abierto siguen sin aparecer barras nuevas de documento', async ({
      page,
    }) => {
      await abrirListadoLargo(page)
      await abrirCajon(page)

      const doc = await medidasDelDocumento(page)
      expect(
        doc.scrollHeight,
        `con el cajón abierto el documento ofrece ${doc.scrollHeight - doc.clientHeight}px de scroll`,
      ).toBeLessThanOrEqual(doc.clientHeight)
      expect(doc.scrollWidth).toBeLessThanOrEqual(doc.innerWidth)

      // §8.4: como mucho dos, y el segundo solo puede ser la lista del cajón.
      const scrollers = await scrollersVerticales(page)
      const todos = [...scrollers.visibles, ...scrollers.fueraDePantalla]
      expect(todos.length, `scrollers: ${todos.join(' | ')}`).toBeLessThanOrEqual(2)
      for (const s of todos) {
        expect(
          s.includes('#contenido') || s.includes('#app-nav'),
          `«${s}» no es ni el contenido ni la lista del cajón`,
        ).toBe(true)
      }
    })

    test('§8.5 · la cabecera no se mueve al desplazar el listado', async ({ page }) => {
      await abrirListadoLargo(page)

      const cabecera = page.getByRole('banner')
      const antes = await cabecera.boundingBox()

      // `behavior: 'instant'` y no `el.scrollTop = 600`: `base.css:68-70`
      // declara `* { scroll-behavior: smooth }`, así que una asignación directa
      // arranca un desplazamiento animado y la lectura inmediata devuelve 0.
      // Con la asignación, esta prueba fallaba diciendo «el contenido no se
      // desplazó» sobre un contenido perfectamente desplazable.
      const desplazado = await page.locator('main#contenido').evaluate((el) => {
        el.scrollTo({ top: 600, behavior: 'instant' })
        return el.scrollTop
      })
      // Si esto fuera 0, el listado no sería largo y la prueba no probaría nada.
      expect(desplazado, 'el contenido no se desplazó: la prueba sería vacua').toBeGreaterThan(100)

      const despues = await cabecera.boundingBox()
      expect(despues?.y).toBe(antes?.y)
    })

    test('§8.7 · los rótulos de primer nivel se ven completos, sin elipsis', async ({ page }) => {
      await abrirListadoLargo(page)
      await abrirCajon(page)

      const etiquetas = await page.evaluate(() => {
        const medir = (selector: string) =>
          Array.from(document.querySelectorAll<HTMLElement>(selector)).map((s) => ({
            texto: s.textContent?.trim() ?? '',
            scrollWidth: s.scrollWidth,
            clientWidth: s.clientWidth,
          }))
        return {
          // `> div > ul >` acota a las listas de GRUPO. Sin ese anclaje, el
          // selector se lleva también los hijos de los dos acordeones —que
          // están en el DOM aunque estén plegados, porque usan `v-show`— y
          // cuenta 29 donde hay 19.
          primerNivel: medir(
            'nav#app-nav > div > ul > li > a > span, nav#app-nav > div > ul > li > button > span',
          ),
          todas: medir('nav#app-nav span'),
        }
      })

      const cortados = etiquetas.todas.filter((e) => e.scrollWidth > e.clientWidth + 1)
      expect(
        cortados.map((c) => `${c.texto} (${c.scrollWidth} > ${c.clientWidth})`),
        'hay rótulos cortados con elipsis dentro del cajón',
      ).toEqual([])

      /*
       * 21, y la cifra está MEDIDA en el navegador, no deducida de `sidebar-nav.ts`.
       *
       * Las dos no coinciden y por eso hay que medirla: el array declara 22
       * entradas de primer nivel —20 hojas y 2 acordeones— y el cajón pinta 21.
       * La que falta es «Empleados», cuyo `/empleados` no lo declara ningún
       * `routes/*.routes.ts`, así que `isAvailable()` (`AppSidebar.vue:31-40`)
       * la descarta por `router.resolve(...).matched.length === 0`. En `npm run
       * dev` deja además su rastro en consola: «No match found for location with
       * path "/empleados"».
       *
       * Este número llevaba tiempo desfasado: decía 15 cuando el cajón pintaba
       * 20 (19 más el «Configurador», retirado en esta rama). Restarle uno al
       * retirar el configurador habría dado 14 y habría parecido recién
       * verificado. Si vuelve a fallar, la respuesta NO es mover la constante:
       * es abrir el cajón y contar, porque lo que ha cambiado es el menú o el
       * router.
       * Las dos que separan este 21 del 19 anterior son «Supresión de datos»
       * (`/asistente/supresion-datos`) y «Pistas del asistente»
       * (`/asistente/pistas`), ambas con su ruta registrada. La cifra se sacó
       * contando el menú pintado, no sumándole dos a la anterior.
       */
      expect(etiquetas.primerNivel.length, 'entradas de primer nivel del cajón').toBe(21)
    })

    test('§8.13 · con el cajón cerrado la navegación es inerte y Tab no la alcanza', async ({
      page,
    }) => {
      await abrirListadoLargo(page)

      const inerte = await cajon(page).evaluate((el) => (el as HTMLElement).inert)
      // 19 controles alcanzables: 17 enlaces de primer nivel más los 2
      // acordeones. Los 10 hijos no cuentan porque `v-show` los deja en
      // `display: none` mientras el acordeón está plegado.
      expect(inerte, 'el <aside> cerrado no está inerte: sus 19 controles siguen tabulables').toBe(
        true,
      )

      await hamburguesa(page).focus()
      const recorrido: string[] = []
      for (let i = 0; i < 14; i += 1) {
        await page.keyboard.press('Tab')
        recorrido.push(
          await page.evaluate(() => {
            const activo = document.activeElement as HTMLElement | null
            if (!activo) return '(ninguno)'
            const dentroDelMenu = activo.closest('nav#app-nav') !== null
            const etiqueta =
              activo.getAttribute('aria-label') ?? activo.textContent?.trim().slice(0, 30) ?? ''
            return `${dentroDelMenu ? 'MENU:' : ''}${activo.tagName.toLowerCase()}[${etiqueta}]`
          }),
        )
      }
      expect(
        recorrido.filter((r) => r.startsWith('MENU:')),
        `el recorrido de Tab entró en la navegación oculta: ${recorrido.join(' → ')}`,
      ).toEqual([])
    })

    test('§8.14 §8.15 §8.16 · foco: cae en la X, queda atrapado y vuelve a la hamburguesa', async ({
      page,
    }) => {
      await abrirListadoLargo(page)
      await expect(hamburguesa(page)).toHaveAttribute('aria-expanded', 'false')

      // §8.14 — el foco inicial es el botón de cierre (APG Dialog).
      await abrirCajon(page)

      // §8.15 — Tab en ciclo, sin salir del cajón.
      const tabulables = await cajon(page).evaluate(
        (el) =>
          el.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')
            .length,
      )
      const fugas: string[] = []
      for (let i = 0; i < tabulables + 3; i += 1) {
        await page.keyboard.press('Tab')
        const fuera = await page.evaluate(() => {
          const activo = document.activeElement as HTMLElement | null
          if (!activo || activo.closest('aside')) return null
          return `${activo.tagName.toLowerCase()}[${activo.getAttribute('aria-label') ?? activo.textContent?.trim().slice(0, 25) ?? ''}]`
        })
        if (fuera) fugas.push(fuera)
      }
      expect(fugas, 'el foco salió del cajón abierto (§2.4.3 Focus Order)').toEqual([])

      // Y hacia atrás: Shift+Tab desde el primero cae en el último, no fuera.
      await cerrarCajon(page).focus()
      await page.keyboard.press('Shift+Tab')
      const siguePreso = await page.evaluate(
        () => document.activeElement?.closest('aside') !== null,
      )
      expect(siguePreso, 'Shift+Tab desde el primer tabulable se escapó del cajón').toBe(true)

      // §8.16 — Escape cierra y devuelve el foco al disparador.
      await page.keyboard.press('Escape')
      await expect(hamburguesa(page)).toHaveAttribute('aria-expanded', 'false')
      await expect(hamburguesa(page)).toBeFocused()
    })

    test('§8.23 · el velo cierra el cajón; una pulsación dentro del cajón no', async ({ page }) => {
      await abrirListadoLargo(page)
      await abrirCajon(page)

      // Dentro del cajón, sobre su relleno inferior: ni un enlace ni un botón,
      // así que lo único que se está probando es que el clic NO cierra.
      await page.mouse.click(140, viewport.height - 8)
      await expect(hamburguesa(page)).toHaveAttribute('aria-expanded', 'true')

      // El velo. Se pulsa por COORDENADA y no por clase: lo que el usuario
      // toca es «la zona de fuera», y una coordenada a la derecha del cajón
      // —que mide min(280px, 86vw)— es exactamente eso.
      await page.mouse.click(viewport.width - 40, Math.round(viewport.height / 2))
      await expect(hamburguesa(page)).toHaveAttribute('aria-expanded', 'false')
      await expect(hamburguesa(page)).toBeFocused()
    })

    test('§8.17a · navegar a otra entrada cierra el cajón', async ({ page }) => {
      await abrirListadoLargo(page)
      await abrirCajon(page)

      await page.getByRole('link', { name: 'Módulos', exact: true }).click()

      await expect(page).toHaveURL(/\/modulos$/)
      await expect(hamburguesa(page)).toHaveAttribute('aria-expanded', 'false')
      await expect.poll(async () => (await cajon(page).boundingBox())?.x).toBeLessThan(0)
    })

    /*
     * Regresión de #204. El defecto era estructural y por eso la prueba mira el
     * nodo concreto y no solo «no es <body>»: cada vista renderiza su propio
     * `<AppLayout>`, así que navegar desmonta la cabecera entera y el
     * `.menu-btn` que `useModalFocus.resolveReturnFocus()` resolvía por selector
     * era el del armazón que se estaba desmontando — el foco caía al `<body>`.
     *
     * El destino correcto es el contenido de la pantalla NUEVA, no la
     * hamburguesa: el usuario acaba de elegir un destino, y en una SPA nada
     * anuncia por su cuenta a dónde ha llegado. `useNavDrawer` prefiere el
     * `<h1>` de la vista —que es el nombre de la pantalla— y cae a
     * `main#contenido` si todavía no hay título, así que la prueba afirma la
     * CONDICIÓN («el foco está dentro del contenido») y no un nodo concreto:
     * atarla al `<h1>` la rompería en una vista que pinte su título tras cargar.
     *
     * Se afirma además que el nodo esté conectado al documento, porque el
     * defecto de #204 consistía justo en enfocar uno que ya no lo estaba.
     */
    test('§8.17b · …y el foco aterriza en el contenido de la pantalla nueva', async ({ page }) => {
      await abrirListadoLargo(page)
      await abrirCajon(page)

      await page.getByRole('link', { name: 'Módulos', exact: true }).click()
      await expect(page).toHaveURL(/\/modulos$/)

      const foco = await page.evaluate(() => {
        const activo = document.activeElement as HTMLElement | null
        const contenido = document.getElementById('contenido')
        if (!activo) return { etiqueta: '(ninguno)', dentro: false, conectado: false, texto: '' }
        return {
          etiqueta: `${activo.tagName.toLowerCase()}${activo.id ? `#${activo.id}` : ''}`,
          dentro: contenido !== null && (activo === contenido || contenido.contains(activo)),
          conectado: activo.isConnected,
          texto: activo.textContent?.trim().slice(0, 40) ?? '',
        }
      })

      expect(foco.etiqueta, 'tras navegar el foco cayó al <body> (§2.4.3 Focus Order)').not.toBe(
        'body',
      )
      expect(
        foco.dentro,
        `el foco quedó en «${foco.etiqueta}», fuera del contenido de la pantalla nueva`,
      ).toBe(true)
      expect(foco.conectado, 'el foco quedó en un nodo desconectado del documento').toBe(true)
    })

    test('§8.11 §8.12 · el indicador de página activa es visible y NO queda recortado', async ({
      page,
    }) => {
      await abrirArmazon(page, '/catalogos-clinicos/tipos-vacuna')
      await abrirCajon(page)

      // El padre de la rama activa se muestra desplegado y marcado.
      const padre = page.getByRole('button', { name: 'Catálogos clínicos', exact: true })
      await expect(padre).toHaveAttribute('aria-expanded', 'true')

      const activo = navegacion(page).locator('[aria-current="page"]')
      await expect(activo).toHaveCount(1)
      await expect(activo).toHaveText('Tipos de vacuna')

      const barra = await activo.evaluate((el) => {
        const pseudo = getComputedStyle(el, '::before')
        const item = el.getBoundingClientRect()
        // Este callback corre serializado en el contexto del navegador (Playwright
        // `page.evaluate`): no puede importar el helper `exigir` de Node, así que la
        // comprobación real va inline, con el mismo criterio — fallar diciendo qué
        // ancestro faltaba en vez de un `!` que revienta con "null is not an object".
        const asideEl = el.closest('aside')
        if (!asideEl) throw new Error('el ítem activo no tiene un <aside> ancestro')
        const aside = asideEl.getBoundingClientRect()
        const navEl = el.closest('nav#app-nav')
        if (!navEl) throw new Error('el ítem activo no tiene un nav#app-nav ancestro')
        const lista = navEl.getBoundingClientRect()
        return {
          content: pseudo.content,
          width: pseudo.width,
          inicio: pseudo.insetInlineStart,
          color: pseudo.backgroundColor,
          itemLeft: item.left,
          itemRight: item.right,
          asideLeft: aside.left,
          asideRight: aside.right,
          listaLeft: lista.left,
        }
      })

      expect(barra.content, 'el ::before del ítem activo no existe').not.toBe('none')
      expect(barra.width, 'la barra de 2 px del estado activo').toBe('2px')
      expect(barra.inicio, 'la barra volvió a anclarse fuera del ítem').toBe('0px')
      // El defecto original: la barra aterrizaba en x ≈ −2,5 px y el
      // `overflow` del <aside> la amputaba. Anclada en el ítem, su borde
      // izquierdo ES el del ítem, así que basta con que el ítem empiece dentro.
      expect(
        barra.itemLeft,
        `la fila activa empieza en x=${barra.itemLeft} y el <aside> en x=${barra.asideLeft}: ` +
          'la barra caería fuera y se recortaría',
      ).toBeGreaterThanOrEqual(barra.asideLeft)
      expect(barra.itemLeft).toBeGreaterThanOrEqual(barra.listaLeft)
      expect(barra.itemRight).toBeLessThanOrEqual(barra.asideRight + 0.5)
    })

    test('§8.21 §8.22 · objetivos táctiles de 44 px, medidos con getBoundingClientRect', async ({
      page,
    }) => {
      await abrirListadoLargo(page)

      // Se mide con el cajón cerrado, que es como el usuario lo encuentra.
      const cabecera = await page.evaluate(() =>
        ['Menú de navegación'].map((nombre) => {
          const el = document.querySelector<HTMLElement>(`[aria-label="${nombre}"]`)
          const r = el?.getBoundingClientRect()
          return { nombre, width: r?.width ?? 0, height: r?.height ?? 0 }
        }),
      )
      for (const boton of cabecera) {
        expect(boton.width, `${boton.nombre}: ancho real`).toBeGreaterThanOrEqual(44)
        expect(boton.height, `${boton.nombre}: alto real`).toBeGreaterThanOrEqual(44)
      }

      await abrirCajon(page)

      // La X del cajón y el CERRAR SESIÓN, que venía de 22×22 px.
      const dentro = await page.evaluate(() =>
        ['Cerrar menú', 'Cerrar sesión'].map((nombre) => {
          const el = document.querySelector<HTMLElement>(`[aria-label="${nombre}"]`)
          const r = el?.getBoundingClientRect()
          return { nombre, width: r?.width ?? 0, height: r?.height ?? 0 }
        }),
      )
      for (const boton of dentro) {
        expect(boton.width, `${boton.nombre}: ancho real`).toBeGreaterThanOrEqual(44)
        expect(boton.height, `${boton.nombre}: alto real`).toBeGreaterThanOrEqual(44)
      }

      // Y toda fila pulsable de la navegación, hijas del acordeón incluidas.
      await page.getByRole('button', { name: 'Catálogos clínicos', exact: true }).click()
      const filas = await page.evaluate(() =>
        Array.from(document.querySelectorAll<HTMLElement>('nav#app-nav a, nav#app-nav button'))
          .filter((el) => el.offsetParent !== null || el.getClientRects().length > 0)
          .map((el) => ({
            texto: el.textContent?.trim().slice(0, 30) ?? '',
            height: el.getBoundingClientRect().height,
          })),
      )
      expect(filas.length, 'no se midió ninguna fila de navegación').toBeGreaterThan(10)
      const bajas = filas.filter((f) => f.height < 44)
      expect(
        bajas.map((f) => `${f.texto}: ${f.height}px`),
        'filas del cajón por debajo de 44 px de alto',
      ).toEqual([])
    })

    test('§8.19 · el enlace de salto aparece al primer Tab y lleva el foco a main#contenido', async ({
      page,
    }) => {
      await abrirListadoLargo(page)
      await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())

      await page.keyboard.press('Tab')
      await expect(page.getByRole('link', { name: 'Saltar al contenido' })).toBeFocused()

      await page.keyboard.press('Enter')
      const id = await page.evaluate(() => document.activeElement?.id)
      expect(id).toBe('contenido')
    })

    test('§8.18 · con un diálogo encima, Escape cierra el diálogo y deja el cajón como estaba', async ({
      page,
    }) => {
      await abrirListadoLargo(page)
      await abrirCajon(page)

      /*
       * El diálogo es POSTIZO, y no por comodidad: en el producto no hay forma
       * de tener un `ModalShell` abierto SOBRE el cajón. El único disparador de
       * modal en esta pantalla vive en el contenido, que con el cajón abierto
       * está tapado por el velo; y al revés, con un modal abierto la
       * hamburguesa queda debajo de su overlay. Lo que sí se puede verificar
       * —y es exactamente lo que decide el código de `useNavDrawer.onEscape`—
       * es que la presencia de OTRO `[aria-modal="true"][role="dialog"]` le
       * quita el turno a Escape. Eso es lo que se mide aquí.
       */
      await page.evaluate(() => {
        const falso = document.createElement('div')
        falso.id = 'dialogo-postizo'
        falso.setAttribute('role', 'dialog')
        falso.setAttribute('aria-modal', 'true')
        document.body.appendChild(falso)
      })

      await page.keyboard.press('Escape')
      await expect(
        hamburguesa(page),
        'Escape se llevó por delante el cajón habiendo un diálogo encima',
      ).toHaveAttribute('aria-expanded', 'true')

      await page.evaluate(() => document.getElementById('dialogo-postizo')?.remove())
      await page.keyboard.press('Escape')
      await expect(hamburguesa(page)).toHaveAttribute('aria-expanded', 'false')
    })
  })
}

test.describe('Escritorio 1280×900 — lo que NO debía cambiar', () => {
  test.use({ viewport: ESCRITORIO })

  test('§8.7bis · el menú fijo sigue ahí: ni cajón, ni diálogo, ni hamburguesa', async ({
    page,
  }) => {
    await abrirListadoLargo(page)

    await expect(hamburguesa(page)).toHaveCount(0)
    await expect(cerrarCajon(page)).toHaveCount(0)
    await expect(cajon(page)).toBeVisible()

    const aside = await cajon(page).evaluate((el) => ({
      role: el.getAttribute('role'),
      ariaModal: el.getAttribute('aria-modal'),
      inert: (el as HTMLElement).inert,
      width: el.getBoundingClientRect().width,
      left: el.getBoundingClientRect().left,
      position: getComputedStyle(el).position,
    }))
    expect(aside.role, 'en escritorio el <aside> no puede ser un diálogo').toBeNull()
    expect(aside.ariaModal).toBeNull()
    expect(aside.inert, 'el menú persistente quedó inerte en escritorio').toBe(false)
    expect(aside.position, 'el menú de escritorio dejó de ser una columna del grid').toBe('static')
    expect(aside.width, 'la columna del menú de escritorio').toBe(244)
    expect(aside.left).toBe(0)
  })

  test('§8.1 §8.3 · en escritorio tampoco scrollea el documento', async ({ page }) => {
    await abrirListadoLargo(page)

    const doc = await medidasDelDocumento(page)
    expect(doc.scrollHeight).toBeLessThanOrEqual(doc.clientHeight)
    expect(doc.scrollWidth).toBeLessThanOrEqual(doc.innerWidth)

    const scrollers = await scrollersVerticales(page)
    expect(
      scrollers.visibles,
      `scrollers: ${scrollers.visibles.join(' | ')} · fuera: ${scrollers.fueraDePantalla.join(' | ') || '(ninguno)'}`,
    ).toEqual([expect.stringContaining('#contenido')])
    expect(scrollers.fueraDePantalla, 'en escritorio no hay nada fuera de pantalla').toEqual([])
  })
})
