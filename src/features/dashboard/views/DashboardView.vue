<script setup lang="ts">
import { useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import { ICONS } from '@/constants/icons'
import { ROUTE_NAMES } from '@/constants/routes'

const router = useRouter()

type Tile = {
  name?: (typeof ROUTE_NAMES)[keyof typeof ROUTE_NAMES]
  title: string
  count: string
  desc: string
  icon: string
  path: string
}

const tiles: Tile[] = [
  {
    name: ROUTE_NAMES.COMPANIES_LIST,
    title: 'Empresas',
    count: '128',
    desc: 'Clínicas y centros veterinarios registrados en la plataforma.',
    icon: ICONS.COMPANY,
    path: '/empresas',
  },
  {
    title: 'Empleados',
    count: '1,847',
    desc: 'Veterinarios, recepcionistas y personal administrativo.',
    icon: ICONS.EMPLOYEE,
    path: '/empleados',
  },
  {
    name: ROUTE_NAMES.MEMBERSHIPS_LIST,
    title: 'Membresías',
    count: '6',
    desc: 'Planes de suscripción disponibles.',
    icon: ICONS.MEMBERSHIP,
    path: '/membresias',
  },
  {
    name: ROUTE_NAMES.MODULES_LIST,
    title: 'Módulos',
    count: '14',
    desc: 'Funcionalidades del sistema.',
    icon: ICONS.MODULE,
    path: '/modulos',
  },
  {
    name: ROUTE_NAMES.SUBMODULES_LIST,
    title: 'Submódulos',
    count: '52',
    desc: 'Componentes detallados dentro de cada módulo.',
    icon: ICONS.SUBMODULE,
    path: '/submodulos',
  },
  {
    name: ROUTE_NAMES.BASE_PERMISSIONS_LIST,
    title: 'Permisos base',
    count: '38',
    desc: 'Catálogo de permisos asignables.',
    icon: ICONS.BASE_PERMISSION,
    path: '/permisos-base',
  },
  {
    name: ROUTE_NAMES.BASE_ROLES_LIST,
    title: 'Roles base',
    count: '9',
    desc: 'Plantillas de roles predefinidas.',
    icon: ICONS.BASE_ROLE,
    path: '/roles-base',
  },
  {
    name: ROUTE_NAMES.BASE_ROLE_PERMISSIONS_LIST,
    title: 'Permisos de roles',
    count: '—',
    desc: 'Configuración de permisos por rol.',
    icon: ICONS.BASE_ROLE_PERMISSION,
    path: '/permisos-roles-base',
  },
]

function goTo(path: string) {
  router.push(path)
}
</script>

<template>
  <AppLayout>
    <section class="hero">
      <div class="hero-glow" />
      <div class="hero-inner">
        <div class="eyebrow">Bienvenido de vuelta</div>
        <h1 class="hero-title">Dashboard administrativo</h1>
        <p class="hero-text">
          Administra empresas, membresías, módulos y permisos del sistema VetSoftware desde un solo
          lugar.
        </p>
        <div class="hero-actions">
          <button class="cta-primary" @click="goTo('/empresas')">
            Ver empresas
            <Icon :icon="ICONS.ARROW_RIGHT" width="13" height="13" />
          </button>
          <button class="cta-secondary" @click="goTo('/membresias')">
            Configurar membresías
          </button>
        </div>
      </div>
    </section>

    <header class="modules-header">
      <h2 class="modules-title">Módulos del sistema</h2>
      <span class="modules-count">{{ tiles.length }} disponibles</span>
      <div class="spacer" />
      <button class="link-btn" type="button">Personalizar →</button>
    </header>

    <div class="tiles-grid">
      <button v-for="tile in tiles" :key="tile.path" class="tile" @click="goTo(tile.path)">
        <div class="tile-row">
          <div class="tile-icon">
            <Icon :icon="tile.icon" width="16" height="16" />
          </div>
          <div class="tile-arrow">
            <Icon :icon="ICONS.ARROW_UP_RIGHT" width="14" height="14" />
          </div>
        </div>
        <div>
          <div class="tile-heading">
            <span class="tile-title">{{ tile.title }}</span>
            <span class="tile-count">{{ tile.count }}</span>
          </div>
          <div class="tile-desc">{{ tile.desc }}</div>
        </div>
      </button>
    </div>
  </AppLayout>
</template>

<style scoped>
.hero {
  background: linear-gradient(135deg, #581c87 0%, #3b0764 100%);
  border-radius: 14px;
  padding: 28px 32px;
  color: #ffffff;
  margin-bottom: 24px;
  position: relative;
  overflow: hidden;
}

.hero-glow {
  position: absolute;
  top: -40px;
  right: -40px;
  width: 220px;
  height: 220px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(216, 180, 254, 0.25), transparent 70%);
  pointer-events: none;
}

.hero-inner {
  position: relative;
}

.eyebrow {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #d8b4fe;
  margin-bottom: 8px;
}

.hero-title {
  font-family: 'Instrument Serif', serif;
  font-size: 36px;
  font-weight: 400;
  margin: 0;
  letter-spacing: -0.01em;
  line-height: 1.1;
  color: #ffffff;
}

.hero-text {
  font-size: 14px;
  color: #e9d5ff;
  margin: 10px 0 18px;
  max-width: 540px;
  line-height: 1.5;
}

.hero-actions {
  display: flex;
  gap: 8px;
}

.cta-primary {
  padding: 8px 14px;
  border-radius: 7px;
  background: #ffffff;
  color: #3b0764;
  border: none;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: transform 0.12s, box-shadow 0.12s;
}

.cta-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px -4px rgba(0, 0, 0, 0.25);
}

.cta-secondary {
  padding: 8px 14px;
  border-radius: 7px;
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.2);
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  transition: background 0.12s;
}

.cta-secondary:hover {
  background: rgba(255, 255, 255, 0.2);
}

.modules-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}

.modules-title {
  font-size: 14px;
  font-weight: 600;
  margin: 0;
  color: #1a1325;
}

.modules-count {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: #a89bbd;
}

.spacer {
  flex: 1;
}

.link-btn {
  font-size: 12px;
  font-weight: 500;
  color: #7e22ce;
  background: transparent;
  border: none;
  cursor: pointer;
  font-family: inherit;
  padding: 0;
}

.link-btn:hover {
  color: #581c87;
}

.tiles-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.tile {
  padding: 18px;
  border-radius: 12px;
  background: #fbfaff;
  border: 1px solid #ece5f4;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 12px;
  text-align: left;
  font-family: inherit;
  transition: all 0.15s;
}

.tile:hover {
  background: #ffffff;
  border-color: #d8b4fe;
  box-shadow: 0 4px 16px -6px rgba(126, 34, 206, 0.15);
}

.tile-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.tile-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: #ffffff;
  border: 1px solid #ece5f4;
  color: #7e22ce;
  display: grid;
  place-items: center;
  transition: background 0.15s;
}

.tile:hover .tile-icon {
  background: #f3e8ff;
}

.tile-arrow {
  opacity: 0;
  color: #7e22ce;
  transition: opacity 0.15s;
}

.tile:hover .tile-arrow {
  opacity: 1;
}

.tile-heading {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 3px;
}

.tile-title {
  font-size: 14px;
  font-weight: 600;
  color: #1a1325;
}

.tile-count {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: #a89bbd;
  font-weight: 500;
}

.tile-desc {
  font-size: 12px;
  color: #6b5b80;
  line-height: 1.45;
}

@media (max-width: 1279px) {
  .tiles-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .tiles-grid {
    grid-template-columns: 1fr;
  }
}
</style>
