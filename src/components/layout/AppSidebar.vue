<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ICONS } from '@/constants/icons'
import SidebarBrand from './SidebarBrand.vue'
import SidebarUserCard from './SidebarUserCard.vue'
import { useViewport } from '@/composables/useViewport'
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
 * los seis imports lo hace una sola instancia (§7). Entre medias, pintar
 * «Configurador» en el menú llevaría a una ruta sin coincidencia —una pantalla
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
 * EST-10 · El rótulo de cada enlace se oculta con `.ds-sr-only`, NO con
 * `display: none`. Con `display:none` el enlace se queda sin nombre accesible
 * y un lector de pantalla anuncia «enlace» a secas (WCAG 2.2 §2.4.4 Link
 * Purpose, §4.1.2 Name, Role, Value). El front del tenant lo tapa a medias con
 * `:title`, que es un parche débil: no es fiable en todos los lectores y no
 * existe en táctil. Aquí se hacen las dos cosas — `.ds-sr-only` para el nombre
 * accesible, `title` para el usuario de ratón.
 */
const { isCompact } = useViewport()
</script>

<template>
  <aside class="sidebar ds-stack">
    <SidebarBrand />

    <nav class="nav-groups ds-stack">
      <div v-for="group in navGroups" :key="group.title" class="nav-group">
        <div class="nav-group-title">{{ group.title }}</div>
        <div class="nav-list ds-stack">
          <template v-for="item in group.items" :key="item.label">
            <!--
              `custom` y no `active-class`: `RouterLink` solo emite
              `aria-current` cuando la ruta coincide EXACTAMENTE, así que en las
              37 rutas de esta consola el ítem que se ve resaltado y el que se
              anuncia como actual no siempre eran el mismo. Con el slot, el
              mismo `isActive` gobierna la clase y el atributo, y nunca se
              separan.
            -->
            <RouterLink
              v-if="!isParent(item) && isAvailable(item)"
              v-slot="{ href, navigate, isActive }"
              :to="item.path"
              custom
            >
              <a
                :href="href"
                class="nav-item"
                :class="{ 'is-active': isActive }"
                :aria-current="isActive ? 'page' : undefined"
                :title="item.label"
                @click="navigate"
              >
                <component :is="item.icon" :size="15" class="nav-icon" />
                <span class="nav-label ds-truncate" :class="{ 'ds-sr-only': isCompact }">
                  {{ item.label }}
                </span>
              </a>
            </RouterLink>

            <div v-else-if="isParent(item)" class="ds-stack">
              <button
                type="button"
                class="nav-item nav-item-parent"
                :class="{ 'is-active': isChildActive(item) }"
                :aria-expanded="isExpanded(item)"
                :title="item.label"
                @click="toggle(item)"
              >
                <component :is="item.icon" :size="15" class="nav-icon" />
                <span class="nav-label ds-truncate" :class="{ 'ds-sr-only': isCompact }">
                  {{ item.label }}
                </span>
                <component
                  :is="ICONS.CHEVRON_DOWN"
                  :size="13"
                  class="nav-chevron"
                  :class="{ 'is-open': isExpanded(item) }"
                />
              </button>

              <div v-show="isExpanded(item)" class="nav-sublist ds-stack">
                <RouterLink
                  v-for="child in item.children"
                  :key="child.path"
                  v-slot="{ href, navigate, isActive }"
                  :to="child.path"
                  custom
                >
                  <a
                    :href="href"
                    class="nav-item nav-subitem"
                    :class="{ 'is-active': isActive }"
                    :aria-current="isActive ? 'page' : undefined"
                    :title="child.label"
                    @click="navigate"
                  >
                    <component :is="child.icon" :size="13" class="nav-icon" />
                    <span class="nav-label ds-truncate" :class="{ 'ds-sr-only': isCompact }">
                      {{ child.label }}
                    </span>
                  </a>
                </RouterLink>
              </div>
            </div>
          </template>
        </div>
      </div>
    </nav>

    <SidebarUserCard />
  </aside>
</template>

<style scoped>
.sidebar {
  background: var(--surface);
  border-right: 1px solid var(--border);
  padding: var(--space-20) var(--space-16);
  height: 100vh;
  position: sticky;
  top: 0;
  overflow-y: auto;
}

.nav-groups {
  margin-top: var(--space-18);
}

.nav-group {
  margin-bottom: var(--space-18);
}

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
  padding: 7px var(--space-12);
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

.nav-item.is-active::before {
  content: '';
  position: absolute;
  left: -16px;
  top: 4px;
  bottom: 4px;
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

.nav-chevron {
  color: var(--text-subtle);
  transition: transform 0.18s ease;
}

.nav-chevron.is-open {
  transform: rotate(180deg);
  color: var(--amatista-700);
}

.nav-sublist {
  gap: 1px;
  margin: var(--space-2) 0 var(--space-4) var(--space-18);
  padding-left: var(--space-10);
  border-left: 1px solid var(--border);
}

.nav-subitem {
  padding: var(--space-6) var(--space-10);
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

.nav-subitem.is-active::before {
  left: -11px;
  top: 6px;
  bottom: 6px;
}

/* EST-10 · Sidebar colapsado a iconos en tablet. Portado del patrón que el
   front del tenant ya tiene resuelto (`AppSidebar` + `SidebarNavItem` +
   `SidebarSubItem`), con los objetivos de 44×38 y 44×34 px, que superan de
   sobra el mínimo de §2.5.8 Target Size (24×24 px CSS, AA).
   El rótulo de grupo colapsa a una línea de 32×1 px en vez de desaparecer:
   sigue separando bloques cuando ya no se puede leer.
   El acordeón pierde su señal visual (`.nav-chevron`) al colapsar;
   `aria-expanded` se conserva, así que el lector de pantalla sí lo sabe. Que el
   padre navegue al primer hijo en vez de desplegar es un CAMBIO DE
   COMPORTAMIENTO y necesita aprobación aparte: no se hace aquí. */
@media (width <= 1024px) {
  .sidebar {
    padding: var(--space-18) var(--space-10);
    align-items: center;
  }

  .nav-group-title {
    width: 32px;
    height: 1px;
    margin: var(--space-8) 0;
    padding: 0;
    overflow: hidden;
    background: var(--border);
    color: transparent;
    font-size: 0;
  }

  .nav-item {
    width: 44px;
    height: 38px;
    justify-content: center;
    padding: 0;
    gap: 0;
  }

  .nav-subitem {
    width: 44px;
    height: 34px;
  }

  .nav-chevron {
    display: none;
  }

  .nav-sublist {
    align-items: center;
    margin-left: 0;
    padding-left: 0;
    border-left: none;
  }
}
</style>
