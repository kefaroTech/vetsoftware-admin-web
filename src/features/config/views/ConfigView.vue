<script setup lang="ts">
import { ref } from 'vue'
import { Icon } from '@iconify/vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import { ICONS } from '@/constants/icons'
import UvtEditor from '../components/UvtEditor.vue'

type TabKey = 'facturacion' | 'general' | 'seguridad'

const tabs: { k: TabKey; label: string; icon: string }[] = [
  { k: 'facturacion', label: 'Facturación electrónica', icon: ICONS.RECEIPT },
  { k: 'general', label: 'General', icon: ICONS.SETTINGS },
  { k: 'seguridad', label: 'Seguridad', icon: ICONS.BASE_ROLE_PERMISSION },
]
const tab = ref<TabKey>('facturacion')
</script>

<template>
  <AppLayout>
    <header class="page-head">
      <div class="eyebrow">Sistema</div>
      <h1 class="title">Configuración</h1>
    </header>

    <div class="tabs">
      <button
        v-for="t in tabs"
        :key="t.k"
        type="button"
        class="tab"
        :class="{ active: tab === t.k }"
        @click="tab = t.k"
      >
        <Icon :icon="t.icon" width="15" height="15" />{{ t.label }}
      </button>
    </div>

    <UvtEditor v-if="tab === 'facturacion'" />
    <div v-else class="placeholder">
      Ajustes {{ tab === 'general' ? 'generales' : 'de seguridad' }} — en construcción.
    </div>
  </AppLayout>
</template>

<style scoped>
.page-head {
  margin-bottom: 22px;
}
.eyebrow {
  font-size: 11px;
  font-weight: 600;
  color: #a89bbd;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin-bottom: 6px;
}
.title {
  font-family: 'Instrument Serif', Georgia, serif;
  font-size: 32px;
  font-weight: 400;
  color: #1a1325;
  letter-spacing: -0.01em;
  line-height: 1.1;
  margin: 0;
}
.tabs {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid #ece5f4;
  margin-bottom: 24px;
}
.tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  color: #6b5b80;
  position: relative;
}
.tab.active {
  font-weight: 600;
  color: #7e22ce;
}
.tab.active::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 2px;
  background: #7e22ce;
  border-radius: 2px;
}
.placeholder {
  padding: 40px;
  text-align: center;
  color: #a89bbd;
  font-size: 13px;
}
</style>
