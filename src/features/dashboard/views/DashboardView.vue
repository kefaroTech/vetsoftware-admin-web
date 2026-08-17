<script setup lang="ts">
import { onMounted, type Component } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '@/components/layout/AppLayout.vue'
import { ICONS } from '@/constants/icons'
import { ROUTE_NAMES } from '@/constants/routes'
import { useSystemConfig } from '@/features/config/composables/useSystemConfig'

const router = useRouter()

// UVT vigente para el strip destacado de facturación electrónica.
const { uvtValue, fetch: fetchConfig } = useSystemConfig()
const currentYear = new Date().getFullYear()
onMounted(fetchConfig)

function formatCOP(n: number) {
  return '$' + Math.round(n || 0).toLocaleString('es-CO')
}

interface Tile {
  name?: (typeof ROUTE_NAMES)[keyof typeof ROUTE_NAMES]
  title: string
  count: string
  desc: string
  icon: Component
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
    name: ROUTE_NAMES.CONFIG,
    title: 'Configuración',
    count: '',
    desc: 'UVT, facturación electrónica y ajustes del sistema.',
    icon: ICONS.SETTINGS,
    path: '/configuracion',
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
            <component :is="ICONS.ARROW_RIGHT" :size="13" />
          </button>
          <button class="cta-secondary" @click="goTo('/membresias')">Configurar membresías</button>
        </div>
      </div>
    </section>

    <button class="uvt-strip" type="button" @click="goTo('/configuracion')">
      <div class="uvt-strip-ic"><component :is="ICONS.RECEIPT" :size="20" /></div>
      <div class="ds-flex-fill">
        <div class="uvt-strip-kicker">Facturación electrónica</div>
        <div class="uvt-strip-desc">
          Valor UVT vigente {{ currentYear }} para cálculos de facturación
        </div>
      </div>
      <div class="uvt-strip-right">
        <div class="uvt-strip-value">{{ formatCOP(uvtValue) }}</div>
        <div class="uvt-strip-cta">Configurar <component :is="ICONS.ARROW_RIGHT" :size="11" /></div>
      </div>
    </button>

    <header class="modules-header ds-flex-row ds-flex-row--12">
      <h2 class="modules-title">Módulos del sistema</h2>
      <span class="modules-count">{{ tiles.length }} disponibles</span>
      <div class="spacer" />
      <button class="link-btn" type="button">Personalizar →</button>
    </header>

    <div class="tiles-grid">
      <button v-for="tile in tiles" :key="tile.path" class="tile ds-stack" @click="goTo(tile.path)">
        <div class="tile-row">
          <div class="tile-icon">
            <component :is="tile.icon" :size="16" />
          </div>
          <div class="tile-arrow">
            <component :is="ICONS.ARROW_UP_RIGHT" :size="14" />
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
  color: #fff;
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
  background: radial-gradient(circle, rgb(216 180 254 / 25%), transparent 70%);
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
  color: #fff;
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
  background: #fff;
  color: #3b0764;
  border: none;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  display: flex;
  align-items: center;
  gap: 6px;
  transition:
    transform 0.12s,
    box-shadow 0.12s;
}

.cta-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px -4px rgb(0 0 0 / 25%);
}

.cta-secondary {
  padding: 8px 14px;
  border-radius: 7px;
  background: rgb(255 255 255 / 10%);
  color: #fff;
  border: 1px solid rgb(255 255 255 / 20%);
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  transition: background 0.12s;
}

.cta-secondary:hover {
  background: rgb(255 255 255 / 20%);
}

.uvt-strip {
  display: flex;
  align-items: center;
  gap: 18px;
  width: 100%;
  text-align: left;
  font-family: inherit;
  padding: 16px 22px;
  margin-bottom: 24px;
  background: #fff;
  border: 1px solid #e9d5ff;
  border-radius: 12px;
  cursor: pointer;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}

.uvt-strip:hover {
  border-color: #c084fc;
  box-shadow: 0 4px 16px -6px rgb(126 34 206 / 15%);
}

.uvt-strip-ic {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: #f3e8ff;
  color: #7e22ce;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.uvt-strip-kicker {
  font-size: 11px;
  font-weight: 600;
  color: #7e22ce;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  margin-bottom: 3px;
}

.uvt-strip-desc {
  font-size: 13px;
  color: #3d2e57;
}

.uvt-strip-right {
  text-align: right;
  flex-shrink: 0;
}

.uvt-strip-value {
  font-family: 'Instrument Serif', Georgia, serif;
  font-size: 28px;
  font-weight: 400;
  color: #1a1325;
  line-height: 1;
}

.uvt-strip-cta {
  font-size: 11px;
  color: #a89bbd;
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
  justify-content: flex-end;
}

.modules-header {
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
  gap: 12px;
  text-align: left;
  font-family: inherit;
  transition: all 0.15s;
}

.tile:hover {
  background: #fff;
  border-color: #d8b4fe;
  box-shadow: 0 4px 16px -6px rgb(126 34 206 / 15%);
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
  background: #fff;
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

@media (width <= 1279px) {
  .tiles-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (width <= 640px) {
  .tiles-grid {
    grid-template-columns: 1fr;
  }
}
</style>
