<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useBreeds } from '../composables/useBreeds'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { useUnsavedChangesGuard } from '@/composables/useUnsavedChangesGuard'
import { formatDate } from '@/composables/format'
import AppLayout from '@/components/layout/AppLayout.vue'
import AppTable from '@/components/ui/AppTable.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppListSearch from '@/components/ui/AppListSearch.vue'
import AppEmptyState from '@/components/feedback/AppEmptyState.vue'
import { coincide } from '@/composables/text'
import BreedForm from '../components/BreedForm.vue'
import { ICONS } from '@/constants/icons'
import type { CreateBreedRequest } from '../types/breeds.types'

const { breeds, loading, error, errorTraceId, fetchAll, create, remove } = useBreeds()
const { confirm } = useConfirmDialog()
const showModal = ref(false)
const saving = ref(false)
const formRef = ref<InstanceType<typeof BreedForm> | null>(null)

const q = ref('')

/**
 * Búsqueda en CLIENTE, y no por comodidad: `GET /breeds` devuelve
 * `List<BreedResponse>` sin paginar, así que el navegador ya tiene el conjunto
 * completo y filtrar en memoria es exhaustivo por construcción — la regla de
 * honestidad de `docs/ux/patron-de-busqueda-en-listado.md` §5. El día que ese
 * endpoint pase a `PageResponse<T>` esto empieza a mentir en silencio y la
 * búsqueda tiene que bajar al servidor en el MISMO PR.
 *
 * Filtra sobre el contenido del store, que es lo que la tabla pinta de verdad.
 * El plegado de acentos lo pone `coincide`: «bengali» tiene que encontrar
 * «Bengalí».
 */
const filtradas = computed(() =>
  breeds.value.filter((b) => coincide(q.value, b.name, b.specie?.name)),
)

onMounted(fetchAll)

// FORM-08: salir de la pantalla con el modal abierto y relleno se llevaba lo
// escrito sin decir nada.
useUnsavedChangesGuard(() => showModal.value && (formRef.value?.isDirty() ?? false))

async function handleCreate(data: CreateBreedRequest) {
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
  const ok = await confirm(`¿Eliminar la raza "${name}"?`)
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
      <h1 class="ds-title">Razas</h1>
      <button type="button" class="ds-btn ds-btn--primary" @click="showModal = true">
        <component :is="ICONS.ADD" :size="15" />
        Nueva raza
      </button>
    </div>

    <!-- El placeholder enumera los campos que el predicado mira de verdad. -->
    <AppListSearch
      v-model="q"
      label="Buscar razas"
      placeholder="Nombre o especie…"
      :result-count="loading ? null : filtradas.length"
    />

    <AppTable
      caption="Razas"
      :headers="['Nombre', 'Especie', 'Fecha creación', 'Acciones']"
      :empty="filtradas.length === 0"
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
          title="Aún no hay razas"
          description="Cada raza pertenece a una especie y es lo que se elige al registrar una mascota."
        >
          <button type="button" class="ds-btn ds-btn--primary" @click="showModal = true">
            <component :is="ICONS.ADD" :size="15" />
            Nueva raza
          </button>
        </AppEmptyState>
      </template>

      <tr v-for="b in filtradas" :key="b.id" class="ds-row-hover">
        <td class="ds-text-strong">{{ b.name }}</td>
        <td>{{ b.specie?.name }}</td>
        <td class="ds-meta">{{ formatDate(b.createdDate) }}</td>
        <td>
          <div class="ds-actions ds-actions--start">
            <RouterLink
              :to="`/animales/razas/${b.id}`"
              class="ds-icon-btn"
              :aria-label="`Editar ${b.name}`"
            >
              <component :is="ICONS.EDIT" :size="15" />
            </RouterLink>
            <button
              type="button"
              class="ds-icon-btn ds-icon-btn--danger"
              :aria-label="`Eliminar ${b.name}`"
              @click="handleDelete(b.id, b.name)"
            >
              <component :is="ICONS.DELETE" :size="15" />
            </button>
          </div>
        </td>
      </tr>
    </AppTable>

    <!-- Salvaguarda de §5: el día que el backend trunque la lista, este número
         dejará de cuadrar de forma observable en vez de degradar en silencio.
         Bajo un error diría «0 de 0», que es «no hay razas» cuando lo cierto es
         que no se pudo preguntar; durante el esqueleto, se contradiría con él. -->
    <p v-if="!loading && !error && breeds.length > 0" class="ds-meta">
      Mostrando {{ filtradas.length }} de {{ breeds.length }}
    </p>

    <AppModal :open="showModal" title="Nueva raza" @close="handleClose">
      <BreedForm ref="formRef" :saving="saving" @submit="handleCreate" @cancel="handleClose" />
    </AppModal>
  </AppLayout>
</template>
