<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useMedicamentEditor } from '../composables/useMedicamentEditor'
import { NAME_ALREADY_EXISTS, type MedicamentFormData } from '../composables/useMedicaments'
import { useUnsavedChangesGuard } from '@/composables/useUnsavedChangesGuard'
import { getProblemDetailCode, getProblemDetailMessage } from '@/services/http/http.client'
import AppLayout from '@/components/layout/AppLayout.vue'
import AppEmptyState from '@/components/feedback/AppEmptyState.vue'
import MedicamentForm from '../components/MedicamentForm.vue'
import { ROUTE_NAMES } from '@/constants/routes'
import { ICONS } from '@/constants/icons'

/**
 * Edición de un medicamento global. Es una **ruta completa y no un modal**,
 * como en los nueve catálogos maestros de esta consola.
 *
 * ── El límite del contrato, dicho en pantalla ─────────────────────────────
 *
 * `/admin/medicaments/{id}` expone `PUT`, `DELETE` y `PATCH …/enable`, pero
 * **no `GET`**. No hay forma de releer una fila por su id, así que esta ficha
 * se abre con lo que el listado dejó en el store y no puede recuperarse sola
 * tras un F5 ni por enlace directo.
 *
 * Cuando eso pasa **se dice**, con la salida al listado, en vez de pintar un
 * formulario vacío que al guardar sobrescribiría el registro con dos campos en
 * blanco. El endpoint que falta está abierto como issue en el backend.
 */
const props = defineProps<{ id: string }>()
const router = useRouter()
const { selected, update } = useMedicamentEditor()

const saving = ref(false)
const formRef = ref<InstanceType<typeof MedicamentForm> | null>(null)
const nombreDuplicado = ref('')

/** La fila del store solo sirve si es la que pide la ruta. */
const medicamento = computed(() =>
  selected.value && selected.value.id === Number(props.id) ? selected.value : null,
)

// FORM-08: esto es una ruta completa; pulsar el sidebar con la edición a medias
// se llevaba lo escrito.
useUnsavedChangesGuard(() => formRef.value?.isDirty() ?? false)

async function handleSave(data: MedicamentFormData) {
  if (saving.value) return
  saving.value = true
  nombreDuplicado.value = ''
  try {
    await update(Number(props.id), data)
    router.push({ name: ROUTE_NAMES.MEDICAMENTS_LIST })
  } catch (e) {
    // El composable ya avisó de todo lo demás; no navegamos, para no perder lo
    // editado. El 409 del índice único se pinta en línea sobre el campo.
    if (getProblemDetailCode(e) === NAME_ALREADY_EXISTS) {
      nombreDuplicado.value = getProblemDetailMessage(
        e,
        'Ya existe un medicamento activo con ese nombre en este ámbito.',
      )
    }
  } finally {
    // FORM-09: AQUÍ y no dentro del `try`.
    saving.value = false
  }
}
</script>

<template>
  <AppLayout>
    <div class="ds-detail-head">
      <button type="button" class="ds-btn ds-btn--ghost" @click="router.back()">
        <component :is="ICONS.BACK" :size="15" aria-hidden="true" />
        Volver
      </button>
      <h1 class="ds-title">Editar medicamento</h1>
    </div>

    <section v-if="medicamento" class="ds-card ds-detail-card">
      <MedicamentForm
        ref="formRef"
        :initial="medicamento"
        :saving="saving"
        :server-error="nombreDuplicado"
        @submit="handleSave"
        @cancel="router.back()"
      />
    </section>

    <AppEmptyState
      v-else
      title="Abre la ficha desde el catálogo"
      description="Esta pantalla edita el medicamento que se eligió en el listado y la plataforma no ofrece forma de releerlo por su identificador, así que al recargar o entrar por enlace se queda sin datos."
    >
      <RouterLink :to="{ name: ROUTE_NAMES.MEDICAMENTS_LIST }" class="ds-btn ds-btn--primary">
        Ir al catálogo de medicamentos
      </RouterLink>
    </AppEmptyState>
  </AppLayout>
</template>

<style scoped>
/* Mismo ancho que las otras 17 fichas de esta consola. No sube a
   `primitives.css`: esa hoja es gemela TR-02 y solo `front-parity` la escribe. */
.ds-detail-card {
  max-width: 640px;
}
</style>
