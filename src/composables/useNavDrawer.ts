import { nextTick, onMounted, onUnmounted, watch, type Ref } from 'vue'
import { useRouter } from 'vue-router'
import { useModalFocus } from '@/composables/useModalFocus'
import { useViewport } from '@/composables/useViewport'

/**
 * Mecánica del cajón de navegación de la consola en tablet.
 *
 * Vive fuera de `AppSidebar.vue` por una razón medible, no de estilo:
 * `scripts/css-budget.mjs` fija `maxSfcLines: 500` con techo de CERO
 * infractores, y el SFC ya partía de 330 líneas. El mismo criterio que sacó
 * los datos del menú a `sidebar-nav.ts` y la trampa de foco de `ModalShell`
 * a `useModalFocus.ts`: el presupuesto no se sube, se paga.
 *
 * El ESTADO no está aquí. `navOpen` es del store de viewport porque lo
 * comparten `AppHeader` y `AppSidebar`, que son hermanos; un `ref()` de
 * ámbito de módulo en este fichero sería el patrón híbrido prohibido por el
 * repo. Aquí solo hay orquestación: foco, teclado y ciclo de vida.
 */
export interface NavDrawerOptions {
  /** El `<aside>`: es la tarjeta del diálogo y el ámbito de la trampa de foco. */
  asideEl: Ref<HTMLElement | null>
  /** La X del cajón; recibe el foco al abrir (APG Dialog). */
  closeBtn: Ref<HTMLButtonElement | null>
}

/** Diálogos abiertos por encima del cajón (`ModalShell` los marca así). */
const OPEN_DIALOG = '[aria-modal="true"][role="dialog"], [aria-modal="true"][role="alertdialog"]'

export function useNavDrawer(opts: NavDrawerOptions) {
  const router = useRouter()
  const { isDrawerViewport, navOpen, openNav, closeNav, toggleNav } = useViewport()

  /**
   * Se consume `useModalFocus` tal cual: es gemelo TR-02 y su API ya es
   * genérica. `getReturnFocusTo` va por selector y no por `ref` a propósito —
   * la hamburguesa vive en `AppHeader`, que es hermano de este componente y
   * no comparte árbol con él.
   */
  const navFocus = useModalFocus({
    cardEl: opts.asideEl,
    closeBtn: opts.closeBtn,
    getInitialFocus: () => undefined,
    getReturnFocusTo: () => '.menu-btn',
  })

  /**
   * Escape cierra el cajón, salvo que haya un diálogo encima.
   *
   * `ModalShell` escucha Escape en `window` y hace `preventDefault()`, pero no
   * detiene la propagación: los dos listeners corren. Sin esta cesión, cerrar
   * un modal abierto sobre el cajón cerraría también el cajón de debajo.
   *
   * El propio `<aside>` cumple el selector en la banda de cajón —también lleva
   * `role="dialog"` y `aria-modal="true"`—, así que se excluye por identidad
   * de nodo y no por clase: comparar contra `asideEl` no se rompe si mañana
   * cambia el nombre de la clase.
   */
  function onEscape(e: KeyboardEvent) {
    if (e.key !== 'Escape' || !navOpen.value) return
    for (const dialog of document.querySelectorAll<HTMLElement>(OPEN_DIALOG)) {
      if (dialog !== opts.asideEl.value) return
    }
    e.preventDefault()
    closeNav()
  }

  /**
   * Distingue los dos cierres, que NO son el mismo y no llevan el foco al mismo
   * sitio: cerrar sin navegar (Escape, velo, la X) devuelve el foco al
   * disparador —criterio 16, y sigue siendo cosa del `watch`—; cerrar POR una
   * navegación lo lleva al contenido nuevo, y de eso se encarga el `afterEach`.
   *
   * Variable de ámbito de función y no `ref` de módulo: solo vive entre el
   * `afterEach` y el flush que ese mismo cierre dispara, no la comparte nadie y
   * por tanto no es el patrón híbrido que el repo prohíbe.
   */
  let cerrandoPorNavegacion = false

  /**
   * Dónde aterriza el foco cuando el cajón se cierra POR una navegación.
   *
   * El `<h1>` de la vista antes que `main#contenido`, y por el mismo motivo por
   * el que no se vuelve a la hamburguesa: lo que hay que comunicar es que la
   * pantalla ha cambiado y a cuál. El título es el nombre de la pantalla
   * —exactamente el dato que una SPA se traga al sustituir el contenido sin
   * recarga, porque el navegador no anuncia nada por su cuenta—, mientras que el
   * `<main>` solo anuncia la región y deja al usuario deducir dónde está.
   *
   * `#contenido` se queda como respaldo, no como destino preferente: es del
   * armazón, siempre existe y ya lleva `tabindex="-1"` por el enlace de salto,
   * así que cubre a la vista que pinte su título después de cargar datos. Es la
   * misma preferencia (`h1` > `main`) que ya aplica la cadena de respaldo de
   * `useModalFocus.resolveReturnFocus()`; se replica aquí en vez de delegar en
   * ella porque esa cadena empieza por el disparador, y el disparador es
   * justamente el nodo que esta navegación acaba de destruir.
   */
  function enfocarContenidoNuevo() {
    const contenido = document.getElementById('contenido')
    const destino = contenido?.querySelector<HTMLElement>('h1') ?? contenido
    if (!destino) return
    // Un título no es tabulable: `tabIndex = -1` le abre el foco programático
    // sin meterlo en el orden de tabulación. `preventScroll` porque la vista
    // recién montada ya está arriba del todo y no hay nada que desplazar.
    destino.tabIndex = -1
    destino.focus({ preventScroll: true })
  }

  /**
   * `flush: 'post'`: el foco se mueve DESPUÉS de que el DOM refleje el estado.
   * Importa de verdad — con el cajón cerrado el `<aside>` está `inert`, y un
   * `focus()` sobre un subárbol inerte no hace nada.
   */
  watch(
    navOpen,
    (open, wasOpen) => {
      if (open) {
        navFocus.captureTrigger()
        requestAnimationFrame(() => navFocus.resolveInitialFocus()?.focus())
        return
      }
      // La bandera se consume AQUÍ, y no se repone en `afterEach`: este `watch`
      // es `flush: 'post'`, así que corre mucho después de que aquella función
      // haya vuelto, y reponerla allí la borraría antes de leerla. Sin reponerla
      // en algún sitio, el primer cierre por navegación dejaría mudo para
      // siempre el camino de Escape.
      const porNavegacion = cerrandoPorNavegacion
      cerrandoPorNavegacion = false
      // Al cruzar a escritorio el cajón se cierra solo y `isDrawerViewport` ya
      // es falso: mover el foco ahí sería robárselo al usuario por redimensionar.
      // Y si el cierre lo provocó una navegación, del foco se encarga el
      // `afterEach`: el disparador que este camino resolvería ya no existe.
      if (wasOpen && isDrawerViewport.value && !porNavegacion) {
        navFocus.resolveReturnFocus()?.focus({ preventScroll: true })
      }
    },
    { flush: 'post' },
  )

  // Un `role="dialog"` huérfano: al pasar a escritorio el `<aside>` vuelve a ser
  // región persistente y no puede quedarse con el estado «abierto» de un cajón.
  watch(isDrawerViewport, (drawer) => {
    if (!drawer) closeNav()
  })

  let stopAfterEach: (() => void) | null = null

  onMounted(() => {
    window.addEventListener('keydown', onEscape)
    /*
     * Navegar con el cajón abierto lo dejaría tapando la pantalla recién
     * abierta, así que se cierra. Lo que NO puede hacer el `watch` de arriba es
     * devolver el foco: el destino que resolvía —`.menu-btn`, por selector— es
     * un nodo que la propia navegación destruye.
     *
     * El motivo es estructural y conviene tenerlo escrito: CADA vista renderiza
     * su propio `<AppLayout>`, así que cambiar de ruta desmonta el armazón
     * entero —`AppHeader` y este `AppSidebar` incluidos— y monta uno nuevo. El
     * `.menu-btn` que existía cuando el cajón se cerró ya no está conectado, el
     * `focus()` cae en un nodo que se va y el navegador manda el foco al
     * `<body>`. Medido en Chromium a 768×1024 y 1024×768: la traza era
     * `focusout` del botón de cierre, `focusin`/`focusout` del enlace pulsado,
     * y ningún `focusin` posterior (issue #204).
     *
     * Por eso el destino se resuelve en un `nextTick`, cuando el armazón NUEVO
     * ya está en el DOM, y lo elige `enfocarContenidoNuevo()` — ver allí por qué
     * es el contenido de la pantalla nueva y no la hamburguesa.
     *
     * `nextTick` y no `requestAnimationFrame`: vue-router actualiza
     * `currentRoute` ANTES de ejecutar `afterEach`, de modo que el re-render
     * del `<RouterView>` ya está encolado cuando esto corre y `nextTick`
     * resuelve justo después. Un `rAF` dependería del reloj del compositor.
     */
    stopAfterEach = router.afterEach(() => {
      if (!navOpen.value) return
      const enBandaDeCajon = isDrawerViewport.value
      cerrandoPorNavegacion = true
      closeNav()
      if (!enBandaDeCajon) return
      void nextTick(enfocarContenidoNuevo)
    })
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', onEscape)
    stopAfterEach?.()
    stopAfterEach = null
  })

  return {
    isDrawerViewport,
    navOpen,
    openNav,
    closeNav,
    toggleNav,
    onTrapTab: navFocus.onTrapTab,
  }
}
