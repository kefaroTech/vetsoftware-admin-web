<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useVaccinationTypes } from '../composables/useVaccinationTypes'
import type { VaccinationTypeFormData } from '../composables/useVaccinationTypes'
import { coincide } from '@/composables/text'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { useUnsavedChangesGuard } from '@/composables/useUnsavedChangesGuard'
import { formatDate } from '@/composables/format'
import AppLayout from '@/components/layout/AppLayout.vue'
import AppTable from '@/components/ui/AppTable.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppListSearch from '@/components/ui/AppListSearch.vue'
import AppEmptyState from '@/components/feedback/AppEmptyState.vue'
import VaccinationTypeForm from '../components/VaccinationTypeForm.vue'
import { ICONS } from '@/constants/icons'

const { vaccinationTypes, loading, error, errorTraceId, fetchAll, create, remove } =
  useVaccinationTypes()
const { confirm } = useConfirmDialog()
const showModal = ref(false)
const saving = ref(false)
const formRef = ref<InstanceType<typeof VaccinationTypeForm> | null>(null)

/** Término de búsqueda. La vista es dueña del estado; `AppListSearch` solo lo edita. */
const q = ref('')

/**
 * Búsqueda en CLIENTE, y es la opción honesta aquí, no la cómoda: la regla de
 * `docs/ux/patron-de-busqueda-en-listado.md` §5 la decide la forma de la
 * respuesta, y `GET /vaccination-types` devuelve `VaccinationTypeResponse[]` —el
 * conjunto entero, sin paginar—, así que el navegador ya lo tiene completo en
 * memoria y filtrar sobre él es exhaustivo por construcción. El día que ese
 * endpoint pase a `PageResponse<T>`, esta búsqueda pasa a mentir y hay que
 * bajarla al servidor con su `/search`.
 *
 * El predicado usa `coincide`, que pliega acentos, mayúsculas y espacios en los
 * dos lados de la comparación: con `toLowerCase().includes()`, «antirrabica» no
 * encontraba «Antirrábica», y en estos catálogos clínicos casi todos los nombres
 * llevan tilde. Vive en `@/composables/text` y NO se copia aquí.
 *
 * Se filtra sobre `vaccinationTypes`, que es lo que el store guarda DESPUÉS del
 * filtro por `general` de `fetchAll`, y es exactamente lo que pinta la tabla.
 * Filtrar sobre el crudo del endpoint dejaría el recuento del pie contando
 * filas que la tabla no muestra.
 */
const filtrados = computed(() =>
  vaccinationTypes.value.filter((t) => coincide(q.value, t.name, t.description)),
)

/** `null` mientras carga: entonces el recuento no se anuncia. */
const recuento = computed(() => (loading.value ? null : filtrados.value.length))

onMounted(fetchAll)

// FORM-08: salir de la pantalla con el modal abierto y relleno se llevaba lo
// escrito sin decir nada.
useUnsavedChangesGuard(() => showModal.value && (formRef.value?.isDirty() ?? false))

async function handleCreate(data: VaccinationTypeFormData) {
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
  const ok = await confirm(`¿Eliminar el tipo de vacuna "${name}"?`)
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
      <h1 class="ds-title">Tipos de vacuna</h1>
      <button type="button" class="ds-btn ds-btn--primary" @click="showModal = true">
        <component :is="ICONS.ADD" :size="15" />
        Nuevo tipo
      </button>
    </div>

    <!-- El placeholder dice qué campos mira de verdad el predicado. -->
    <AppListSearch
      v-model="q"
      label="Buscar tipos de vacuna"
      placeholder="Nombre o descripción…"
      :result-count="recuento"
    />

    <AppTable
      :headers="['Nombre', 'Descripción', 'Fecha creación', 'Acciones']"
      :empty="filtrados.length === 0"
      :loading="loading"
      :error="error"
      :trace-id="errorTraceId"
      @retry="fetchAll"
    >
      <template #empty>
        <!-- Vacío de búsqueda y vacío de verdad son estados DISTINTOS (§4).
             Quien busca quiere encontrar, no dar de alta: la rama de búsqueda
             no lleva el botón de crear, y la de catálogo vacío no dice «sin
             resultados». -->
        <AppEmptyState
          v-if="q.trim()"
          :title="`Sin resultados para «${q.trim()}»`"
          description="Revisa la escritura o prueba con menos palabras."
        >
          <button type="button" class="ds-btn ds-btn--ghost" @click="q = ''">
            Limpiar búsqueda
          </button>
        </AppEmptyState>
        <AppEmptyState
          v-else
          title="Aún no hay tipos de vacuna"
          description="Forman el cuadro de vacunación que las clínicas aplican y registran en cada paciente."
        >
          <button type="button" class="ds-btn ds-btn--primary" @click="showModal = true">
            <component :is="ICONS.ADD" :size="15" />
            Nuevo tipo
          </button>
        </AppEmptyState>
      </template>

      <tr v-for="t in filtrados" :key="t.id" class="ds-row-hover">
        <td class="ds-text-strong">{{ t.name }}</td>
        <td class="ds-meta">{{ t.description }}</td>
        <td class="ds-meta">{{ formatDate(t.createdDate) }}</td>
        <td>
          <div class="ds-actions ds-actions--start">
            <RouterLink
              :to="`/catalogos-clinicos/tipos-vacuna/${t.id}`"
              class="ds-icon-btn"
              aria-label="Editar"
            >
              <component :is="ICONS.EDIT" :size="15" />
            </RouterLink>
            <button
              type="button"
              class="ds-icon-btn ds-icon-btn--danger"
              aria-label="Eliminar"
              @click="handleDelete(t.id, t.name)"
            >
              <component :is="ICONS.DELETE" :size="15" />
            </button>
          </div>
        </td>
      </tr>
    </AppTable>

    <!-- Salvaguarda de §5: mientras la búsqueda sea en cliente, el pie dice
         cuántas filas hay REALMENTE en memoria. El día que el backend trunque,
         ese número dejará de coincidir de forma observable en la pantalla, en
         vez de degradar en silencio. No se pinta cargando ni bajo un error:
         «Mostrando 0 de 0» bajo el banner diría que no hay registros cuando lo
         cierto es que no se pudo preguntar. -->
    <p v-if="!loading && !error && vaccinationTypes.length > 0" class="ds-meta">
      Mostrando {{ filtrados.length }} de {{ vaccinationTypes.length }}
    </p>

    <AppModal :open="showModal" title="Nuevo tipo de vacuna" @close="handleClose">
      <VaccinationTypeForm
        ref="formRef"
        :saving="saving"
        @submit="handleCreate"
        @cancel="handleClose"
      />
    </AppModal>
  </AppLayout>
</template>
