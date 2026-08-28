<script setup lang="ts">
import { useCompanyRestore } from '../composables/useCompanyRestore'
import { ICONS } from '@/constants/icons'
import type { CompanyResponse } from '../types/companies.types'

/**
 * Botón «Restaurar» de una empresa archivada.
 *
 * ── ADVERTENCIA: hoy no está montado en ninguna pantalla, y no por olvido ──
 *
 * El backend publica `PATCH /companies/{id}/enable`, pero **el contrato no
 * ofrece ninguna forma de llegar a una empresa archivada**: `GET /companies` y
 * `GET /companies/search` solo aceptan `page`, `pageSize` y `q`
 * (`api/openapi.json`), y `@SQLRestriction("enabled = true")` sobre
 * `CompanyJpaEntity` las excluye de toda consulta JPA — `GET /companies/{id}`
 * incluido, que responde 404. Falta el hermano `GET /companies/disabled`, que
 * sí existe para `/products`, `/services`, `/taxes` y `/admin/medicaments` y es
 * justo lo que alimenta la pestaña «Pausados» de `MedicamentsListView`.
 *
 * Este componente es la pieza que queda por enchufar: en cuanto ese listado
 * exista, se pinta en la fila de la empresa archivada y `@restored` recarga la
 * lista. Nada más que cambiar aquí.
 *
 * Se pinta con primitivas (`ds-btn`, `ds-btn--ghost`, `ds-btn--sm`) y no lleva
 * bloque `<style>`: no hay nada que este componente necesite que
 * `primitives.css` no dé ya.
 */
const props = defineProps<{ company: CompanyResponse }>()

const emit = defineEmits<{
  /** La empresa volvió al registro. Lleva la ficha fresca que devolvió el backend. */
  restored: [company: CompanyResponse]
}>()

const { restoring, restore } = useCompanyRestore()

async function handleRestore() {
  const restored = await restore(props.company.id, props.company.name)
  // `null` es «canceló» o «falló»; el composable ya avisó y la fila se queda
  // como estaba.
  if (restored) emit('restored', restored)
}
</script>

<template>
  <!-- R04 · el nombre accesible lleva el sujeto de la fila: veinte «Restaurar»
       seguidos son veinte controles indistinguibles. `aria-busy` porque el
       rótulo cambia mientras la petición vuela y un lector de pantalla tiene
       que poder decir que el control está ocupado, no roto. -->
  <button
    type="button"
    class="ds-btn ds-btn--ghost ds-btn--sm"
    :disabled="restoring"
    :aria-busy="restoring"
    :aria-label="`Restaurar ${company.name}`"
    @click="handleRestore"
  >
    <component :is="ICONS.RETRY" :size="14" aria-hidden="true" />
    {{ restoring ? 'Restaurando…' : 'Restaurar' }}
  </button>
</template>
