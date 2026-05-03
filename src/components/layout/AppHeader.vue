<script setup lang="ts">
import { useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import { ICONS } from '@/constants/icons'
import { ROUTE_NAMES } from '@/constants/routes'

const router = useRouter()

function goToCompanies() {
  router.push({ name: ROUTE_NAMES.COMPANIES_LIST })
}
</script>

<template>
  <header class="topbar">
    <div class="search">
      <Icon :icon="ICONS.SEARCH" width="14" height="14" class="search-icon" />
      <span class="search-placeholder">Buscar empresas, módulos, permisos…</span>
      <span class="kbd">⌘K</span>
    </div>
    <div class="spacer" />
    <button class="bell-btn" aria-label="Notificaciones">
      <Icon :icon="ICONS.BELL" width="15" height="15" />
      <span class="bell-dot" />
    </button>
    <button class="primary-btn" @click="goToCompanies">
      <Icon :icon="ICONS.ADD" width="14" height="14" />
      Nueva empresa
    </button>
  </header>
</template>

<style scoped>
.topbar {
  padding: 16px 32px;
  border-bottom: 1px solid #ece5f4;
  background: #ffffff;
  display: flex;
  align-items: center;
  gap: 14px;
  flex-shrink: 0;
}

.search {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 8px;
  background: #f5f1fa;
  flex: 1;
  max-width: 400px;
  cursor: text;
}

.search-icon {
  color: #6b5b80;
  flex-shrink: 0;
}

.search-placeholder {
  font-size: 13px;
  color: #a89bbd;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.kbd {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  background: #ffffff;
  color: #6b5b80;
  border: 1px solid #ece5f4;
  flex-shrink: 0;
}

.spacer {
  flex: 1;
}

.bell-btn {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  border: 1px solid #ece5f4;
  background: #ffffff;
  display: grid;
  place-items: center;
  cursor: pointer;
  position: relative;
  color: #3d2e57;
  transition: background 0.12s, border-color 0.12s;
}

.bell-btn:hover {
  background: #faf5ff;
  border-color: #d8b4fe;
}

.bell-dot {
  position: absolute;
  top: 6px;
  right: 7px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #7e22ce;
  border: 2px solid #ffffff;
}

.primary-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 8px;
  border: none;
  background: #1a1325;
  font-size: 13px;
  font-weight: 600;
  color: #ffffff;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.12s;
}

.primary-btn:hover {
  background: #3d2e57;
}
</style>
