<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useSpecies } from '../composables/useSpecies'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { useUnsavedChangesGuard } from '@/composables/useUnsavedChangesGuard'
import { coincide } from '@/composables/text'
import AppLayout from '@/components/layout/AppLayout.vue'
import AppTable from '@/components/ui/AppTable.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppListSearch from '@/components/ui/AppListSearch.vue'
import AppEmptyState from '@/components/feedback/AppEmptyState.vue'
import SpecieForm from '../components/SpecieForm.vue'
import { ICONS } from '@/constants/icons'
import type { CreateSpecieRequest } from '../types/species.types'

const { species, loading, error, errorTraceId, fetchAll, create, remove } = useSpecies()
const { confirm } = useConfirmDialog()
const showModal = ref(false)
const saving = ref(false)
const formRef = ref<InstanceType<typeof SpecieForm> | null>(null)

/**
 * Búsqueda en CLIENTE, y es honesta porque `GET /species` devuelve el conjunto
 * entero sin paginar: el navegador ya tiene todas las especies antes de que el
 * usuario teclee, así que filtrar en memoria es exhaustivo por construcción. La
 * regla es la forma de la respuesta, no la comodidad: `T[]` permite cliente,
 * `PageResponse<T>` obliga a búsqueda servida.
 *
 * El plegado de acentos lo pone `coincide`: con `toLowerCase().includes()`,
 * «canino» encontraría «Canino» pero nadie encontraría «Anfibio» tecleando
 * rápido una palabra con tilde. Vive en `@/composables/text` y no aquí, para que
 * no haya diecisiete copias de la normalización.
 */
const q = ref('')
const filtradas = computed(() => species.value.filter((s) => coincide(q.value, s.name)))

/** `null` mientras carga: entonces el recuento no se anuncia. */
const recuento = computed(() => (loading.value ? null : filtradas.value.length))

onMounted(fetchAll)

// FORM-08: salir de la pantalla con el modal abierto y relleno se llevaba lo
// escrito sin decir nada.
useUnsavedChangesGuard(() => showModal.value && (formRef.value?.isDirty() ?? false))

function limpiarBusqueda() {
  q.value = ''
}

async function handleCreate(data: CreateSpecieRequest) {
  if (saving.value) return
  saving.value = true
  try {
    await create(data)
    showModal.value = false
  } catch {
    // El composable ya avisó del fallo; el modal sigue abierto con lo escrito.
  } finally {
    // FORM-09: AQUÍ y no dentro del `try`. Si se pone tras el `await`, el
    // camino de error nunca lo ejecuta y el botón queda deshabilitado para
    // siempre: el mismo daño que FORM-08, causado por el arreglo de FORM-09.
    saving.value = false
  }
}

function handleClose() {
  if (saving.value) return
  showModal.value = false
}

async function handleDelete(id: number, name: string) {
  const ok = await confirm(`¿Eliminar la especie "${name}"?`)
  if (!ok) return
  try {
    await remove(id)
  } catch {
    // El composable ya avisó del fallo; la fila se queda como estaba.
  }
}
</script>

<template>
  <AppLayout>
    <div class="ds-head">
      <h1 class="ds-title">Especies</h1>
      <button type="button" class="ds-btn ds-btn--primary" @click="showModal = true">
        <component :is="ICONS.ADD" :size="15" />
        Nueva especie
      </button>
    </div>

    <AppListSearch
      v-model="q"
      label="Buscar especies"
      placeholder="Nombre…"
      :result-count="recuento"
    />

    <AppTable
      :headers="['Nombre', 'Fecha creación', 'Acciones']"
      :empty="filtradas.length === 0"
      :loading="loading"
      :error="error"
      :trace-id="errorTraceId"
      @retry="fetchAll"
    >
      <template #empty>
        <!-- Vacío de búsqueda y vacío de verdad son estados DISTINTOS. Quien
             busca quiere encontrar, no dar de alta: la rama de búsqueda no
             lleva el botón de crear, y la de catálogo vacío no dice «sin
             resultados». -->
        <AppEmptyState
          v-if="q.trim()"
          :title="`Sin resultados para «${q.trim()}»`"
          description="Revisa la escritura o prueba con menos palabras."
        >
          <button type="button" class="ds-btn ds-btn--ghost" @click="limpiarBusqueda">
            Limpiar búsqueda
          </button>
        </AppEmptyState>
        <AppEmptyState
          v-else
          title="Aún no hay especies"
          description="La especie clasifica a cada paciente y es lo que gobierna las razas y los colores disponibles."
        >
          <button type="button" class="ds-btn ds-btn--primary" @click="showModal = true">
            <component :is="ICONS.ADD" :size="15" />
            Nueva especie
          </button>
        </AppEmptyState>
      </template>

      <tr v-for="s in filtradas" :key="s.id" class="ds-row-hover">
        <td class="ds-text-strong">{{ s.name }}</td>
        <td class="ds-meta">{{ s.createdDate }}</td>
        <td>
          <div class="ds-actions ds-actions--start">
            <RouterLink :to="`/animales/especies/${s.id}`" class="ds-icon-btn" aria-label="Editar">
              <component :is="ICONS.EDIT" :size="15" />
            </RouterLink>
            <button
              type="button"
              class="ds-icon-btn ds-icon-btn--danger"
              aria-label="Eliminar"
              @click="handleDelete(s.id, s.name)"
            >
              <component :is="ICONS.DELETE" :size="15" />
            </button>
          </div>
        </td>
      </tr>
    </AppTable>

    <!-- Salvaguarda: el día que el backend empiece a truncar este listado, el
         total dejará de coincidir con la realidad de forma OBSERVABLE aquí, en
         vez de degradar en silencio. No se pinta bajo un error —diría que no hay
         registros cuando lo cierto es que no se pudo preguntar— ni durante el
         esqueleto, que ya comunica que está cargando. -->
    <p v-if="!loading && !error && species.length > 0" class="ds-meta">
      Mostrando {{ filtradas.length }} de {{ species.length }}
    </p>

    <AppModal :open="showModal" title="Nueva especie" @close="handleClose">
      <SpecieForm ref="formRef" :saving="saving" @submit="handleCreate" @cancel="handleClose" />
    </AppModal>
  </AppLayout>
</template>
