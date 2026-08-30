<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ICONS } from '@/constants/icons'
import SidebarBrand from './SidebarBrand.vue'
import SidebarUserCard from './SidebarUserCard.vue'
import { useNavDrawer } from '@/composables/useNavDrawer'
// El QUÉ del menú —grupos, orden y destinos— vive en su propio módulo; aquí se
// queda el CÓMO se pinta y el estado por instancia. Ver la cabecera de ese
// fichero para el porqué.
import { isParent, navGroups, type NavLeaf, type NavParent } from './sidebar-nav'

const route = useRoute()
const router = useRouter()

/**
 * Los destinos que el router conoce **hoy**.
 *
 * Las entradas nuevas de §2 llegan antes que las pantallas: cada tarea de la
 * onda 1 aporta su `routes/<feature>.routes.ts` por su cuenta y el registro de
 * los imports lo hace una sola instancia (§7). Entre medias, pintar
 * «Cotizaciones» en el menú llevaría a una ruta sin coincidencia —una pantalla
 * en blanco—, que es peor que no ofrecer la entrada: el usuario no lee «esto
 * todavía no está», lee «esto está roto».
 *
 * Se resuelve una vez, no en cada render: el `computed` no depende de nada
 * reactivo. En dev, las rutas que aún no existen dejan un aviso de vue-router
 * en la consola — es la señal de que falta descomentar su import en
 * `router/index.ts`, no un defecto.
 */
const availablePaths = computed(() => {
  const leaves = navGroups.flatMap((group) =>
    group.items.flatMap((item) => (isParent(item) ? item.children : [item])),
  )
  return new Set(
    leaves.filter((leaf) => router.resolve(leaf.path).matched.length > 0).map((leaf) => leaf.path),
  )
})

const isAvailable = (leaf: NavLeaf) => availablePaths.value.has(leaf.path)

const expanded = ref<Record<string, boolean>>({})

const isChildActive = (parent: NavParent) =>
  parent.children.some((child) => route.path.startsWith(child.path))

const isExpanded = (parent: NavParent) => expanded.value[parent.label] ?? isChildActive(parent)

const toggle = (parent: NavParent) => {
  expanded.value[parent.label] = !isExpanded(parent)
}

/**
 * En tablet el rótulo de cada enlace ya NO se oculta: el sidebar deja de
 * colapsar a un raíl de iconos y pasa a ser un cajón modal con el texto
 * completo. Por eso desaparece el `.ds-sr-only` que este componente aplicaba a
 * los tres rótulos —hoja, padre del acordeón e hija—: aquella clase existía
 * para devolverle nombre accesible a un enlace cuyo texto se ocultaba, y ese
 * enlace ya no existe. Con el cajón cerrado la navegación entera queda fuera
 * de pantalla y marcada `inert`, así que tampoco hay un estado intermedio en
 * el que un enlace se quede sin nombre.
 *
 * `:title` se mantiene, pero cambia de papel: ya no es el sustituto del rótulo
 * —un tooltip necesita `:hover`, que en táctil no existe, y por eso el raíl de
 * iconos era una promesa que la tablet no cumplía— sino el respaldo de
 * `.ds-truncate` para un rótulo largo cortado en un cajón que `86vw` puede
 * estrechar por debajo de 280 px.
 *
 * La mecánica del cajón (foco, Escape, cierre al navegar) está en
 * `useNavDrawer.ts` y no aquí: `css:budget` fija `maxSfcLines: 500` con techo
 * de cero infractores y este fichero ya partía de 330 líneas.
 */
const asideEl = ref<HTMLElement | null>(null)
const drawerCloseBtn = ref<HTMLButtonElement | null>(null)
const { isDrawerViewport, navOpen, closeNav, onTrapTab } = useNavDrawer({
  asideEl,
  closeBtn: drawerCloseBtn,
})
</script>

<template>
  <!-- El velo va aquí y no en `AppLayout`: al ser hermano ANTERIOR del `<aside>`
       y compartir `z-index`, queda debajo del cajón sin `calc()` ni un segundo
       token. -->
  <div v-if="isDrawerViewport && navOpen" class="nav-backdrop" @click="closeNav" />

  <!-- El rol cambia con la banda, y es correcto que cambie: por encima de 1024
       el `<aside>` es una región persistente; por debajo lleva velo, el fondo
       queda inoperable y el foco NO puede salir (§2.4.3 Focus Order, patrón
       Dialog del APG). `inert` es obligatorio y no una mejora: un panel movido
       con `transform` sigue en el flujo y sus enlaces seguirían recibiendo Tab
       fuera de pantalla.
       `? true : undefined` y no un booleano pelado: `inert` no está en la lista
       de atributos booleanos especiales de Vue, así que solo se comporta como
       tal donde el DOM expone la PROPIEDAD `inert`. Donde no la expone —jsdom,
       es decir las pruebas unitarias— Vue cae a `setAttribute` y un `false`
       escribiría `inert="false"`, que por presencia del atributo sigue siendo
       inerte. Con `undefined` el atributo se retira en los dos caminos. -->
  <aside
    ref="asideEl"
    class="sidebar ds-stack"
    :class="{ 'is-open': navOpen }"
    :inert="isDrawerViewport && !navOpen ? true : undefined"
    :role="isDrawerViewport ? 'dialog' : undefined"
    :aria-modal="isDrawerViewport ? 'true' : undefined"
    :aria-label="isDrawerViewport ? 'Navegación principal' : undefined"
    @keydown.capture="onTrapTab"
  >
    <button
      v-if="isDrawerViewport"
      ref="drawerCloseBtn"
      type="button"
      class="drawer-close ds-hover-accent ds-focus-ring"
      aria-label="Cerrar menú"
      @click="closeNav"
    >
      <component :is="ICONS.CLOSE" :size="18" />
    </button>

    <SidebarBrand />

    <!-- Listas nombradas, no `<div>`s sueltos: antes el lector de pantalla
         anunciaba 26 enlaces en fila sin decir cuántos había ni de qué grupo
         eran. Con `<ul>` + `aria-labelledby` dice «lista Suscripciones, 5
         elementos, elemento 3 de 5» (§1.3.1). `.ds-list-reset` en vez de
         reescribir `list-style/margin/padding` en el scoped: esa primitiva ya
         existe y copiarla dispara `vetsoftware/no-duplicate-primitive`. -->
    <nav id="app-nav" class="nav-groups ds-stack" aria-label="Navegación principal">
      <div v-for="group in navGroups" :key="group.title" class="nav-group">
        <div :id="`navgrp-${group.title}`" class="nav-group-title">{{ group.title }}</div>
        <ul class="nav-list ds-stack ds-list-reset" :aria-labelledby="`navgrp-${group.title}`">
          <template v-for="item in group.items" :key="item.label">
            <!--
              `custom` y no `active-class`: `RouterLink` solo emite
              `aria-current` cuando la ruta coincide EXACTAMENTE, así que en las
              37 rutas de esta consola el ítem que se ve resaltado y el que se
              anuncia como actual no siempre eran el mismo. Con el slot, el
              mismo `isActive` gobierna la clase y el atributo, y nunca se
              separan.
            -->
            <li v-if="!isParent(item) && isAvailable(item)">
              <RouterLink v-slot="{ href, navigate, isActive }" :to="item.path" custom>
                <a
                  :href="href"
                  class="nav-item ds-focus-ring"
                  :class="{ 'is-active': isActive }"
                  :aria-current="isActive ? 'page' : undefined"
                  :title="item.label"
                  @click="navigate"
                >
                  <component :is="item.icon" :size="15" class="nav-icon" />
                  <span class="nav-label ds-truncate">{{ item.label }}</span>
                </a>
              </RouterLink>
            </li>

            <li v-else-if="isParent(item)" class="ds-stack">
              <button
                type="button"
                class="nav-item nav-item-parent ds-focus-ring"
                :class="{ 'is-active': isChildActive(item) }"
                :aria-expanded="isExpanded(item)"
                :title="item.label"
                @click="toggle(item)"
              >
                <component :is="item.icon" :size="15" class="nav-icon" />
                <span class="nav-label ds-truncate">{{ item.label }}</span>
                <component
                  :is="ICONS.CHEVRON_DOWN"
                  :size="13"
                  class="nav-chevron"
                  :class="{ 'is-open': isExpanded(item) }"
                />
              </button>

              <ul v-show="isExpanded(item)" class="nav-sublist ds-stack ds-list-reset">
                <li v-for="child in item.children" :key="child.path">
                  <RouterLink v-slot="{ href, navigate, isActive }" :to="child.path" custom>
                    <a
                      :href="href"
                      class="nav-item nav-subitem ds-focus-ring"
                      :class="{ 'is-active': isActive }"
                      :aria-current="isActive ? 'page' : undefined"
                      :title="child.label"
                      @click="navigate"
                    >
                      <component :is="child.icon" :size="13" class="nav-icon" />
                      <span class="nav-label ds-truncate">{{ child.label }}</span>
                    </a>
                  </RouterLink>
                </li>
              </ul>
            </li>
          </template>
        </ul>
      </div>
    </nav>

    <SidebarUserCard />
  </aside>
</template>

<style scoped>
/* El `<aside>` ya NO scrollea: era el segundo contenedor de scroll de la
   pantalla —`height: 100vh` + `overflow-y: auto`— y desbordaba en cuanto se
   abría «Catálogos clínicos» (7 hijos, +238 px). Al ser además `sticky` con un
   `AppHeader` que no lo era, las dos barras se comportaban al revés de lo que
   el usuario espera: el menú se quedaba quieto y la barra superior se iba de la
   pantalla. Ahora el scroll baja SOLO a la lista (`.nav-groups`), así que la
   marca y «Cerrar sesión» quedan siempre alcanzables, y `sticky` sobra porque
   ya no hay nada que se desplace detrás. */
.sidebar {
  background: var(--surface);
  border-right: 1px solid var(--border);
  padding: var(--space-20) var(--space-16);
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.nav-groups {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  margin-top: var(--space-18);
}

.nav-group {
  margin-bottom: var(--space-18);
}

/* En compacto esto se convertía en una raya de 32×1 px de `--border`: 1,23:1
   sobre `--surface`, y era el ÚNICO indicador de frontera entre grupos, o sea
   información y no decoración (§1.4.11 pide 3:1). Con el rótulo de vuelta el
   problema no se parchea, se disuelve: el texto mide 5,36:1. */
.nav-group-title {
  font-size: var(--text-caption);
  font-weight: var(--weight-semibold);
  color: var(--text-subtle);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 0 var(--space-12) var(--space-6);
}

.nav-list {
  gap: 1px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: var(--space-10);
  padding: 7px var(--space-12) 7px var(--space-16);
  border-radius: 7px;
  font-size: var(--text-body);
  font-weight: var(--weight-medium);
  color: var(--warm-800);
  text-decoration: none;
  position: relative;
  transition: background var(--transition-base);
}

.nav-item:hover {
  background: var(--amatista-50);
}

.nav-item.is-active {
  background: var(--amatista-100);
  font-weight: var(--weight-semibold);
  color: var(--text);
}

/* La barra se ancla DENTRO del ítem. Antes iba en `left: -16px`, calibrado
   para el padding lateral de 16 px del sidebar de escritorio; en compacto ese
   padding bajaba a 10 px y la barra aterrizaba en x ≈ −2,5 px, fuera del
   `<aside>`, donde el `overflow-y: auto` la recortaba entera (el desbordamiento
   hacia el borde inicial no es región desplazable). En tablet quedaba solo el
   lavado de fondo `--amatista-100`, que mide 1,17:1: el usuario no podía ver en
   qué pantalla estaba (§1.4.11 sobre un indicador de estado, y §1.4.1 porque a
   esa distancia de luminancia lo único que queda es el matiz).
   Anclada aquí no depende nunca del padding del contenedor, y vale igual para
   la hoja, para la hija y para el padre de la rama activa. */
.nav-item.is-active::before {
  content: '';
  position: absolute;
  inset-inline-start: 0;
  inset-block: var(--space-4);
  width: 2px;
  background: var(--amatista-700);
  border-radius: 2px;
}

.nav-icon {
  flex-shrink: 0;
}

.nav-label {
  flex: 1;
}

.nav-item-parent {
  background: transparent;
  border: none;
  width: 100%;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
}

/* El chevron ya no se apaga en tablet. Con `display: none` el acordeón se
   quedaba sin ninguna señal visible de que fuera desplegable: solo
   `aria-expanded`, que quien ve no percibe. */
.nav-chevron {
  color: var(--text-subtle);
  transition: transform 0.18s ease;
}

.nav-chevron.is-open {
  transform: rotate(180deg);
  color: var(--amatista-700);
}

/* La línea vertical se conserva pero NO es la señal de subordinación: mide
   1,23:1, así que es decoración. Lo que jerarquiza es la indentación de 18 px,
   el cuerpo de letra menor y el icono de 13 px frente a 15. */
.nav-sublist {
  gap: 1px;
  margin: var(--space-2) 0 var(--space-4) var(--space-18);
  padding-inline-start: var(--space-10);
  border-left: 1px solid var(--border);
}

.nav-subitem {
  padding: var(--space-6) var(--space-10) var(--space-6) var(--space-16);
  font-size: var(--text-xs);
  font-weight: var(--weight-medium);
  color: var(--text-muted);
}

.nav-subitem:hover {
  color: var(--warm-800);
}

.nav-subitem.is-active {
  color: var(--text);
}

/* Solo existe en la banda de cajón (`v-if`), por eso no vive dentro del
   `@media`. Recibe el foco al abrir: es el primer tabulable del diálogo. */
.drawer-close {
  position: absolute;
  inset-block-start: var(--space-8);
  inset-inline-end: var(--space-8);
  width: 44px;
  height: 44px;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  display: grid;
  place-items: center;
  cursor: pointer;
  color: var(--text-muted);
}

/* Igual que el botón de cierre: el `v-if` ya lo limita a la banda de cajón.
   Va antes del `<aside>` en el DOM y con el MISMO `z-index`, así que queda
   debajo sin necesidad de un token propio. `--z-drawer` (1400) ya existía en
   `tokens.css` y está por debajo de `--z-modal` (1500): un `ModalShell` abierto
   sigue tapando el cajón, que es lo correcto. */
.nav-backdrop {
  position: fixed;
  inset: 0;
  z-index: var(--z-drawer);
  background: rgb(20 15 30 / 45%);
}

/* Banda de cajón. El valor DEBE coincidir con `COMPACT_MAX_WIDTH` de
   `src/stores/viewport.store.ts`, que es quien decide `role`/`aria-modal`/`inert`.
   No se añade guarda local de `prefers-reduced-motion`: `base.css` ya apaga
   toda transición con `!important`, y duplicarla exigiría un `stylelint-disable`
   sin justificación. */
@media (width <= 1024px) {
  .sidebar {
    position: fixed;
    inset-block: 0;
    inset-inline-start: 0;
    width: min(280px, 86vw);
    z-index: var(--z-drawer);
    box-shadow: var(--shadow-modal);
    transform: translateX(-100%);
    transition: transform var(--transition-slow);
  }

  .sidebar.is-open {
    transform: none;
  }

  /* 44 px de alto para TODA fila pulsable, hijas incluidas: la jerarquía la
     llevan la indentación y el cuerpo de letra, no una fila más baja. Alcanza a
     las tres variantes porque las tres llevan `.nav-item`. */
  .nav-item {
    min-height: 44px;
  }
}
</style>
