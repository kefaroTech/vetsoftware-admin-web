<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ICONS } from '@/constants/icons'
import { ROUTE_NAMES } from '@/constants/routes'

const router = useRouter()
const route = useRoute()

// El botón del header es un atajo a Empresas; se oculta en la propia lista para
// no duplicar el "Nueva empresa" que ya vive en esa pantalla.
const onCompaniesList = computed(() => route.name === ROUTE_NAMES.COMPANIES_LIST)

function goToCompanies() {
  router.push({ name: ROUTE_NAMES.COMPANIES_LIST })
}
</script>

<template>
  <!--
    Retirado el buscador global. NO era un campo: era un `<div>` con una lupa y
    un `<span class="search-placeholder">Buscar empresas, módulos, permisos…
    </span>`. No se podía enfocar, no se podía escribir en él y no hacía nada,
    pero ocupaba 400 px del sitio más visible de la consola y era lo primero que
    veía todo el que la abría. Un control muerto que aparenta estar vivo
    incumple la heurística 1 de Nielsen (visibilidad del estado del sistema) y
    §4.1.2 Name, Role, Value: o se implementa, o se retira. Implementarlo es una
    feature con backend detrás —hay issue abierto—, así que aquí se retira.
  -->
  <header class="topbar">
    <div class="spacer" />
    <button class="bell-btn" aria-label="Notificaciones">
      <component :is="ICONS.BELL" :size="15" />
      <span class="bell-dot" />
    </button>
    <button v-if="!onCompaniesList" class="primary-btn ds-flex-row" @click="goToCompanies">
      <component :is="ICONS.ADD" :size="14" />
      Nueva empresa
    </button>
  </header>
</template>

<style scoped>
.topbar {
  padding: var(--space-16) var(--space-32);
  border-bottom: 1px solid var(--border);
  background: var(--surface);
  display: flex;
  align-items: center;
  gap: var(--space-14);
  flex-shrink: 0;
}

.spacer {
  flex: 1;
}

.bell-btn {
  width: 34px;
  height: 34px;
  border-radius: var(--radius-md);
  border: 1px solid var(--warm-450);
  background: var(--surface);
  display: grid;
  place-items: center;
  cursor: pointer;
  position: relative;
  color: var(--warm-800);
  transition:
    background var(--transition-base),
    border-color var(--transition-base);
}

.bell-btn:hover {
  background: var(--amatista-50);
  border-color: var(--amatista-300);
}

.bell-dot {
  position: absolute;
  top: 6px;
  right: 7px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--amatista-700);
  border: 2px solid var(--surface);
}

.primary-btn {
  padding: var(--space-8) var(--space-14);
  border-radius: var(--radius-md);
  border: none;
  background: var(--warm-900);
  font-size: var(--text-body);
  font-weight: var(--weight-semibold);
  color: var(--warm-50);
  cursor: pointer;
  font-family: inherit;
  transition: background var(--transition-base);
}

.primary-btn:hover {
  background: var(--warm-800);
}

/* EST-10 · A 768 px la barra superior tenía 32 px de padding a cada lado y
   competía por el ancho con el contenido. */
@media (width <= 1024px) {
  .topbar {
    padding: var(--space-14) var(--space-18);
  }
}
</style>
