<script setup lang="ts">
import { ref, type Component } from 'vue'
import { useRoute } from 'vue-router'
import { ROUTE_NAMES } from '@/constants/routes'
import { ICONS } from '@/constants/icons'
import SidebarUserCard from './SidebarUserCard.vue'

const route = useRoute()

interface NavLeaf {
  name?: (typeof ROUTE_NAMES)[keyof typeof ROUTE_NAMES]
  label: string
  path: string
  icon: Component
}

interface NavParent {
  label: string
  icon: Component
  children: NavLeaf[]
}

type NavItem = NavLeaf | NavParent

interface NavGroup {
  title: string
  items: NavItem[]
}

const isParent = (item: NavItem): item is NavParent => 'children' in item

const navGroups: NavGroup[] = [
  {
    title: 'General',
    items: [
      {
        name: ROUTE_NAMES.DASHBOARD,
        label: 'Dashboard',
        path: '/dashboard',
        icon: ICONS.DASHBOARD,
      },
      {
        name: ROUTE_NAMES.COMPANIES_LIST,
        label: 'Empresas',
        path: '/empresas',
        icon: ICONS.COMPANY,
      },
      { label: 'Empleados', path: '/empleados', icon: ICONS.EMPLOYEE },
    ],
  },
  {
    title: 'Suscripciones',
    items: [
      {
        name: ROUTE_NAMES.MEMBERSHIPS_LIST,
        label: 'Membresías',
        path: '/membresias',
        icon: ICONS.MEMBERSHIP,
      },
      {
        name: ROUTE_NAMES.MEMBERSHIP_SUB_MODULES_LIST,
        label: 'Membresías · Submódulos',
        path: '/membresias-submodulos',
        icon: ICONS.MEMBERSHIP_SUBMODULE,
      },
    ],
  },
  {
    title: 'Configuración',
    items: [
      {
        name: ROUTE_NAMES.MODULES_LIST,
        label: 'Módulos',
        path: '/modulos',
        icon: ICONS.MODULE,
      },
      {
        name: ROUTE_NAMES.SUBMODULES_LIST,
        label: 'Submódulos',
        path: '/submodulos',
        icon: ICONS.SUBMODULE,
      },
      {
        name: ROUTE_NAMES.BASE_PERMISSIONS_LIST,
        label: 'Permisos base',
        path: '/permisos-base',
        icon: ICONS.BASE_PERMISSION,
      },
      {
        name: ROUTE_NAMES.BASE_ROLES_LIST,
        label: 'Roles base',
        path: '/roles-base',
        icon: ICONS.BASE_ROLE,
      },
      {
        name: ROUTE_NAMES.BASE_ROLE_PERMISSIONS_LIST,
        label: 'Permisos de roles',
        path: '/permisos-roles-base',
        icon: ICONS.BASE_ROLE_PERMISSION,
      },
      {
        label: 'Animales',
        icon: ICONS.ANIMAL_SETTINGS,
        children: [
          {
            name: ROUTE_NAMES.SPECIES_LIST,
            label: 'Especies',
            path: '/animales/especies',
            icon: ICONS.SPECIES,
          },
          {
            name: ROUTE_NAMES.BREEDS_LIST,
            label: 'Razas',
            path: '/animales/razas',
            icon: ICONS.BREED,
          },
          {
            name: ROUTE_NAMES.ANIMAL_COLORS_LIST,
            label: 'Colores',
            path: '/animales/colores',
            icon: ICONS.COLOR,
          },
        ],
      },
      {
        label: 'Catálogos clínicos',
        icon: ICONS.CLINICAL_CATALOGS,
        children: [
          {
            name: ROUTE_NAMES.CONSULTATION_TYPES_LIST,
            label: 'Tipos de consulta',
            path: '/catalogos-clinicos/tipos-consulta',
            icon: ICONS.CONSULTATION_TYPE,
          },
          {
            name: ROUTE_NAMES.VACCINATION_TYPES_LIST,
            label: 'Tipos de vacuna',
            path: '/catalogos-clinicos/tipos-vacuna',
            icon: ICONS.VACCINATION_TYPE,
          },
          {
            name: ROUTE_NAMES.SURGERY_TYPES_LIST,
            label: 'Tipos de cirugía',
            path: '/catalogos-clinicos/tipos-cirugia',
            icon: ICONS.SURGERY_TYPE,
          },
          {
            name: ROUTE_NAMES.LABORATORY_TEST_TYPES_LIST,
            label: 'Tipos de laboratorio',
            path: '/catalogos-clinicos/tipos-laboratorio',
            icon: ICONS.LABORATORY_TEST_TYPE,
          },
          {
            name: ROUTE_NAMES.DIAGNOSTIC_IMAGING_TYPES_LIST,
            label: 'Tipos de imagen',
            path: '/catalogos-clinicos/tipos-imagen',
            icon: ICONS.DIAGNOSTIC_IMAGING_TYPE,
          },
          {
            name: ROUTE_NAMES.SPA_TYPES_LIST,
            label: 'Tipos de spa',
            path: '/catalogos-clinicos/tipos-spa',
            icon: ICONS.SPA_TYPE,
          },
        ],
      },
    ],
  },
  {
    title: 'Sistema',
    items: [
      {
        name: ROUTE_NAMES.CONFIG,
        label: 'Configuración',
        path: '/configuracion',
        icon: ICONS.SETTINGS,
      },
    ],
  },
]

const expanded = ref<Record<string, boolean>>({})

const isChildActive = (parent: NavParent) =>
  parent.children.some((child) => route.path.startsWith(child.path))

const isExpanded = (parent: NavParent) => expanded.value[parent.label] ?? isChildActive(parent)

const toggle = (parent: NavParent) => {
  expanded.value[parent.label] = !isExpanded(parent)
}
</script>

<template>
  <aside class="sidebar ds-stack">
    <div class="sidebar-header">
      <div class="logo">
        <component :is="ICONS.PAW" :size="16" />
      </div>
      <div>
        <div class="brand">VetSoftware</div>
        <div class="brand-sub">Panel administrativo</div>
      </div>
    </div>

    <nav class="nav-groups ds-stack">
      <div v-for="group in navGroups" :key="group.title" class="nav-group">
        <div class="nav-group-title">{{ group.title }}</div>
        <div class="nav-list ds-stack">
          <template v-for="item in group.items" :key="item.label">
            <RouterLink
              v-if="!isParent(item)"
              :to="item.path"
              class="nav-item"
              active-class="is-active"
            >
              <component :is="item.icon" :size="15" class="nav-icon" />
              <span class="nav-label ds-truncate">{{ item.label }}</span>
            </RouterLink>

            <div v-else class="ds-stack">
              <button
                type="button"
                class="nav-item nav-item-parent"
                :class="{ 'is-active': isChildActive(item) }"
                :aria-expanded="isExpanded(item)"
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

              <div v-show="isExpanded(item)" class="nav-sublist ds-stack">
                <RouterLink
                  v-for="child in item.children"
                  :key="child.path"
                  :to="child.path"
                  class="nav-item nav-subitem"
                  active-class="is-active"
                >
                  <component :is="child.icon" :size="13" class="nav-icon" />
                  <span class="nav-label ds-truncate">{{ child.label }}</span>
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
  background: #fff;
  border-right: 1px solid #ece5f4;
  padding: 20px 16px;
  height: 100vh;
  position: sticky;
  top: 0;
  overflow-y: auto;
}

.sidebar-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 12px 22px;
  border-bottom: 1px solid #ece5f4;
}

.logo {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: linear-gradient(135deg, #a855f7, #581c87);
  display: grid;
  place-items: center;
  color: #fff;
  box-shadow: 0 2px 6px -1px rgb(126 34 206 / 40%);
}

.brand {
  font-size: 14px;
  font-weight: 700;
  color: #1a1325;
  letter-spacing: -0.01em;
  line-height: 1.1;
}

.brand-sub {
  font-size: 10px;
  color: #6b5b80;
  letter-spacing: 0.04em;
  margin-top: 1px;
}

.nav-groups {
  margin-top: 18px;
}

.nav-group {
  margin-bottom: 18px;
}

.nav-group-title {
  font-size: 10px;
  font-weight: 600;
  color: #a89bbd;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 0 12px 6px;
}

.nav-list {
  gap: 1px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 12px;
  border-radius: 7px;
  font-size: 13px;
  font-weight: 500;
  color: #3d2e57;
  text-decoration: none;
  position: relative;
  transition: background 0.12s;
}

.nav-item:hover {
  background: #faf5ff;
}

.nav-item.is-active {
  background: #f3e8ff;
  font-weight: 600;
  color: #1a1325;
}

.nav-item.is-active::before {
  content: '';
  position: absolute;
  left: -16px;
  top: 4px;
  bottom: 4px;
  width: 2px;
  background: #7e22ce;
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
  color: #a89bbd;
  transition: transform 0.18s ease;
}

.nav-chevron.is-open {
  transform: rotate(180deg);
  color: #7e22ce;
}

.nav-sublist {
  gap: 1px;
  margin: 2px 0 4px 18px;
  padding-left: 10px;
  border-left: 1px solid #ece5f4;
}

.nav-subitem {
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 500;
  color: #6b5b80;
}

.nav-subitem:hover {
  color: #3d2e57;
}

.nav-subitem.is-active {
  color: #1a1325;
}

.nav-subitem.is-active::before {
  left: -11px;
  top: 6px;
  bottom: 6px;
}
</style>
