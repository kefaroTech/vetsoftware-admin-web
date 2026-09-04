<script setup lang="ts">
import { computed, nextTick, onMounted, ref, useId, watch } from 'vue'
import { useMedicaments, NAME_ALREADY_EXISTS } from '../composables/useMedicaments'
import type { MedicamentFormData } from '../composables/useMedicaments'
import { useMedicamentEditor } from '../composables/useMedicamentEditor'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { useQuerySync } from '@/composables/useQuerySync'
import { useUnsavedChangesGuard } from '@/composables/useUnsavedChangesGuard'
import { formatDate } from '@/composables/format'
import { getProblemDetailCode, getProblemDetailMessage } from '@/services/http/http.client'
import AppLayout from '@/components/layout/AppLayout.vue'
import AppTable from '@/components/ui/AppTable.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppListSearch from '@/components/ui/AppListSearch.vue'
import AppPagination from '@/components/ui/AppPagination.vue'
import AppSegmentedTabs from '@/components/ui/AppSegmentedTabs.vue'
import { segmentedTabId, type SegmentedTabOption } from '@/components/ui/segmented-tabs'
import AppEmptyState from '@/components/feedback/AppEmptyState.vue'
import MedicamentForm from '../components/MedicamentForm.vue'
import { ICONS } from '@/constants/icons'
import { ROUTE_NAMES } from '@/constants/routes'
import type { MedicamentResponse } from '../types/medicaments.types'

/**
 * El vademécum global de la plataforma: alta, edición, pausa y reactivación.
 *
 * Es el catálogo global **puro**: todas las filas son globales por construcción
 * del endpoint. Lo que crean los tenants por su cuenta se mira en la vista de
 * plataforma, que es de solo lectura y a la que se llega desde el enlace de la
 * cabecera. Separarlas es lo que hace que las acciones coincidan con el
 * contenido —en una tabla mixta el operador tendría que leer la columna de
 * ámbito antes de cada clic— y que el recuento del pie signifique algo: el
 * tamaño del vademécum global, y no una mezcla de datos de plataforma y de
 * tenants.
 */

/**
 * El término, la página y la pestaña viven en la URL: así el listado filtrado
 * se puede compartir por enlace, sobrevive a un F5 y vuelve igual al pulsar
 * «atrás». `useQuerySync` escribe con `replace` y no con `push`, de modo que
 * teclear ocho letras no mete ocho entradas en el historial.
 *
 * Se declara ANTES del composable porque el término inicial se le pasa por
 * argumento; ver el porqué en `useMedicaments`.
 */
const filtros = useQuerySync({ q: '', page: '1', estado: 'activos' }, { debounceMs: 300 }).state

const {
  query,
  activos,
  page,
  pageSize,
  total,
  pageCount,
  activosLoading,
  activosError,
  activosErrorTraceId,
  goTo,
  ensureActivos,
  recargarActivos,
  pausados,
  pausadosTotal,
  pausadosCargados,
  pausadosLoading,
  pausadosError,
  pausadosErrorTraceId,
  ensurePausados,
  fetchPausados,
  create,
  pausar,
  reactivar,
} = useMedicaments(filtros.q)

const { select } = useMedicamentEditor()
const { confirm } = useConfirmDialog()

const OPCIONES: SegmentedTabOption[] = [
  { value: 'activos', label: 'Activos' },
  { value: 'pausados', label: 'Pausados' },
]

/**
 * El `id` del panel lo genera esta vista, no el conmutador: el buscador va
 * ENTRE los dos y por tanto el panel no puede vivir dentro del componente de
 * pestañas. Ver `components/ui/segmented-tabs.ts`.
 */
const panelId = useId()
const tabsRef = ref<InstanceType<typeof AppSegmentedTabs> | null>(null)

const showModal = ref(false)
const saving = ref(false)
const formRef = ref<InstanceType<typeof MedicamentForm> | null>(null)
/** Texto literal del 409 del índice único, para pintarlo en el campo `name`. */
const nombreDuplicado = ref('')

/**
 * Normaliza lo que venga en la URL: `?estado=cualquiera` no puede dejar el
 * conmutador sin ninguna pestaña seleccionada.
 */
const estado = computed({
  get: () => (filtros.estado === 'pausados' ? 'pausados' : 'activos'),
  set: (valor: string) => {
    filtros.estado = valor
  },
})

const enPausados = computed(() => estado.value === 'pausados')
const termino = computed(() => filtros.q.trim())

const filas = computed<MedicamentResponse[]>(() =>
  enPausados.value ? pausados.value : activos.value,
)
const loading = computed(() => (enPausados.value ? pausadosLoading.value : activosLoading.value))
const error = computed(() => (enPausados.value ? pausadosError.value : activosError.value))
const errorTraceId = computed(() =>
  enPausados.value ? pausadosErrorTraceId.value : activosErrorTraceId.value,
)

/**
 * `null` mientras carga: entonces el recuento no se anuncia, para no leer un
 * número obsoleto. No hace falta ninguna región viva extra para el cambio de
 * pestaña: la de `AppListSearch` vigila el recuento, así que **también se
 * dispara cuando cambia sin que cambie el término**, que es exactamente lo que
 * pasa al cambiar de pestaña. Dos regiones `polite` por la misma acción del
 * usuario producen el clásico anuncio doble.
 */
const recuento = computed(() => {
  if (loading.value) return null
  return enPausados.value ? pausadosTotal.value : total.value
})

const cabeceras = computed(() =>
  enPausados.value
    ? ['Medicamento', 'Descripción', 'Acciones']
    : ['Medicamento', 'Descripción', 'Fecha creación', 'Acciones'],
)

onMounted(() => {
  if (enPausados.value) void ensurePausados()
  else void goTo(Number(filtros.page) || 1)
})

/**
 * §5.10 · Al entrar en una pestaña se recarga si una mutación la dejó vieja.
 * La recarga reutiliza el término vigente: el término se CONSERVA al cambiar
 * de pestaña, porque el recorrido más frecuente de esta pantalla es buscar
 * «amoxi» en activos, no encontrarlo y comprobar si está pausado.
 */
watch(estado, (valor) => {
  if (valor === 'pausados') void ensurePausados()
  else void ensureActivos()
})

// URL → estado. Cubre «atrás»/«adelante» y la entrada directa por enlace.
watch(
  () => filtros.q,
  (valor) => {
    if (valor !== query.value) query.value = valor
  },
)
watch(
  () => filtros.page,
  (valor) => {
    const n = Number(valor) || 1
    if (n !== page.value) void goTo(n)
  },
)
// Estado → URL. `useServerPaged` vuelve solo a la página 1 al cambiar el
// término, así que la URL tiene que seguirle.
watch(page, (n) => {
  filtros.page = String(n)
})

// FORM-08: salir de la pantalla con el modal abierto y relleno se llevaba lo
// escrito sin decir nada.
useUnsavedChangesGuard(() => showModal.value && (formRef.value?.isDirty() ?? false))

function buscar(valor: string) {
  filtros.q = valor
  query.value = valor
}

function limpiarBusqueda() {
  buscar('')
}

/** Salida del estado vacío: la misma búsqueda, en el otro conjunto. */
function buscarEnLaOtraPestana() {
  estado.value = enPausados.value ? 'activos' : 'pausados'
}

/**
 * Tras pausar o reactivar, la fila desaparece y con ella el botón que tenía el
 * foco: sin esto el foco cae al `<body>` y el siguiente Tab reempieza por el
 * principio del documento (WCAG 2.2 §2.4.3, §3.2.2). Vuelve al conmutador, que
 * es el control que gobierna el conjunto que acaba de cambiar.
 */
async function devolverFoco() {
  await nextTick()
  tabsRef.value?.focusActive()
}

async function handleCreate(data: MedicamentFormData) {
  if (saving.value) return
  saving.value = true
  nombreDuplicado.value = ''
  try {
    await create(data)
    showModal.value = false
  } catch (e) {
    // El composable ya avisó de todo lo demás; el modal sigue abierto CON lo
    // escrito. Lo único que se añade aquí es el 409 del índice único, que se
    // pinta en línea sobre el campo que hay que corregir.
    if (getProblemDetailCode(e) === NAME_ALREADY_EXISTS) {
      nombreDuplicado.value = getProblemDetailMessage(
        e,
        'Ya existe un medicamento activo con ese nombre en este ámbito.',
      )
    }
  } finally {
    // FORM-09: AQUÍ y no dentro del `try`. Si se pone tras el `await`, el
    // camino de error nunca lo ejecuta y el botón queda deshabilitado para
    // siempre.
    saving.value = false
  }
}

function handleClose() {
  if (saving.value) return
  showModal.value = false
  nombreDuplicado.value = ''
}

/**
 * La confirmación nombra el alcance porque es la diferencia entera entre esta
 * pantalla y la del tenant, y hay que leerla antes de confirmar, no después.
 * El verbo es «pausar» y no «eliminar»: el `DELETE` es una baja lógica, y
 * llamarlo eliminar miente en la dirección peligrosa.
 */
async function handlePausar(m: MedicamentResponse) {
  const ok = await confirm({
    message: `¿Pausar el medicamento global "${m.name}"?`,
    consequence:
      'Dejará de estar disponible al recetar en TODAS las clínicas de la plataforma. ' +
      'Podrás reactivarlo desde la pestaña «Pausados». Las recetas ya emitidas no cambian.',
    confirmLabel: 'Pausar medicamento',
  })
  if (!ok) return
  try {
    await pausar(m.id)
    await devolverFoco()
  } catch {
    // El composable ya avisó del fallo; la fila se queda como estaba y el foco
    // sigue en el botón que se pulsó.
  }
}

/** La reactivación NO se confirma: confirmar lo inocuo entrena a confirmar sin leer. */
async function handleReactivar(m: MedicamentResponse) {
  try {
    await reactivar(m.id)
    await devolverFoco()
  } catch {
    // El composable ya avisó del fallo.
  }
}

function reintentar() {
  if (enPausados.value) void fetchPausados()
  else void recargarActivos()
}
</script>

<template>
  <AppLayout>
    <div class="ds-head">
      <div>
        <h1 class="ds-title">Catálogo de medicamentos</h1>
        <p class="ds-subtitle">El vademécum que comparten todas las clínicas de la plataforma.</p>
      </div>
      <div class="ds-actions">
        <AppSegmentedTabs
          ref="tabsRef"
          v-model="estado"
          :options="OPCIONES"
          :panel-id="panelId"
          label="Estado del catálogo"
        />
        <!-- Solo en «Activos»: en «Pausados», crear no es la acción de esa vista. -->
        <button
          v-if="!enPausados"
          type="button"
          class="ds-btn ds-btn--primary"
          @click="showModal = true"
        >
          <component :is="ICONS.ADD" :size="15" />
          Nuevo medicamento
        </button>
      </div>
    </div>

    <!-- La lente de consulta NO va al menú: es un mismo concepto visto de otra
         manera, y dos entradas de sidebar para «medicamentos» obligarían a
         elegir entre ellas antes de saber en qué se diferencian. -->
    <p class="enlace-plataforma">
      <RouterLink
        :to="{ name: ROUTE_NAMES.MEDICAMENTS_PLATFORM }"
        class="ds-btn ds-btn--ghost ds-btn--sm"
      >
        Ver los medicamentos de todas las empresas
        <component :is="ICONS.ARROW_RIGHT" :size="14" aria-hidden="true" />
      </RouterLink>
    </p>

    <!-- FUERA del `role="tabpanel"`: el término se conserva al cambiar de
         pestaña, así que el control pertenece a la pantalla y no al panel.
         Dentro, el árbol de accesibilidad diría que es propiedad de «Activos» y
         desaparecería del panel en cada cambio.
         Búsqueda SERVIDA en «Activos» —la respuesta es una página—; en
         «Pausados» el endpoint devuelve la lista completa y no acepta `q`, así
         que allí el filtro se aplica sobre el conjunto entero, que es
         exhaustivo por construcción. Ver `useMedicaments`. -->
    <AppListSearch
      :model-value="filtros.q"
      label="Buscar medicamentos"
      placeholder="Nombre del medicamento…"
      :result-count="recuento"
      @update:model-value="buscar"
    />

    <!-- `tabindex="0"` para que el panel sea alcanzable con teclado también
         cuando su contenido no tiene nada enfocable (el vacío de «Pausados»). -->
    <div
      :id="panelId"
      role="tabpanel"
      :aria-labelledby="segmentedTabId(panelId, estado)"
      tabindex="0"
    >
      <AppTable
        caption="Medicamentos globales"
        :headers="cabeceras"
        :empty="filas.length === 0"
        :loading="loading"
        :error="error"
        :trace-id="errorTraceId"
        @retry="reintentar"
      >
        <template #empty>
          <!-- Cuatro estados, no uno: «sin resultados» y «catálogo vacío» son
               cosas distintas, y la rama con término NUNCA lleva el botón de
               crear —quien busca quiere encontrar, y antes de ofrecer crear hay
               que descartar que esté pausado, que es lo que hace su segunda
               salida—. -->
          <AppEmptyState
            v-if="!enPausados && termino"
            :title="`Sin resultados para «${termino}»`"
            description="Revisa la escritura o prueba con menos palabras. La búsqueda no distingue mayúsculas ni acentos."
          >
            <span class="ds-flex-row ds-flex-row--6">
              <button type="button" class="ds-btn ds-btn--ghost" @click="limpiarBusqueda">
                Limpiar búsqueda
              </button>
              <button type="button" class="ds-btn ds-btn--ghost" @click="buscarEnLaOtraPestana">
                Buscarlo en pausados
              </button>
            </span>
          </AppEmptyState>

          <AppEmptyState
            v-else-if="!enPausados"
            title="Aún no hay medicamentos globales"
            description="El vademécum global es lo que toda clínica puede recetar sin haberlo creado."
          >
            <button type="button" class="ds-btn ds-btn--primary" @click="showModal = true">
              <component :is="ICONS.ADD" :size="15" />
              Nuevo medicamento
            </button>
          </AppEmptyState>

          <AppEmptyState
            v-else-if="termino"
            :title="`Sin resultados para «${termino}» entre los pausados`"
            description="Puede que exista y esté activo."
          >
            <span class="ds-flex-row ds-flex-row--6">
              <button type="button" class="ds-btn ds-btn--ghost" @click="limpiarBusqueda">
                Limpiar búsqueda
              </button>
              <button type="button" class="ds-btn ds-btn--ghost" @click="buscarEnLaOtraPestana">
                Buscarlo en activos
              </button>
            </span>
          </AppEmptyState>

          <!-- Es un BUEN estado, no una carencia: no hay nada que el usuario
               deba hacer, así que no lleva salida. -->
          <AppEmptyState
            v-else
            title="No hay medicamentos pausados"
            description="Aquí aparecen los globales que se retiraron del recetario, para poder reactivarlos."
          />
        </template>

        <tr v-for="m in filas" :key="m.id" class="ds-row-hover">
          <td class="ds-text-strong">{{ m.name }}</td>
          <td class="ds-meta">{{ m.description || '—' }}</td>
          <!-- En una fila resucitada la fecha es la ORIGINAL, y pintar una
               fecha que no explica nada de la pausa es ruido. -->
          <td v-if="!enPausados" class="ds-meta">{{ formatDate(m.createdDate) }}</td>
          <td>
            <!-- R04 · el nombre accesible lleva el sujeto de la fila: veinte
                 «Editar» seguidos son veinte controles indistinguibles. -->
            <div v-if="enPausados" class="ds-actions ds-actions--start">
              <button
                type="button"
                class="ds-btn ds-btn--ghost ds-btn--sm"
                :aria-label="`Reactivar ${m.name}`"
                @click="handleReactivar(m)"
              >
                <component :is="ICONS.RETRY" :size="14" aria-hidden="true" />
                Reactivar
              </button>
            </div>
            <div v-else class="ds-actions ds-actions--start">
              <RouterLink
                :to="{ name: ROUTE_NAMES.MEDICAMENT_DETAIL, params: { id: String(m.id) } }"
                class="ds-icon-btn"
                :aria-label="`Editar ${m.name}`"
                @click="select(m)"
              >
                <component :is="ICONS.EDIT" :size="15" aria-hidden="true" />
              </RouterLink>
              <button
                type="button"
                class="ds-icon-btn ds-icon-btn--danger"
                :aria-label="`Pausar ${m.name}`"
                @click="handlePausar(m)"
              >
                <component :is="ICONS.PAUSE" :size="15" aria-hidden="true" />
              </button>
            </div>
          </td>
        </tr>
      </AppTable>

      <!-- No se pinta cargando ni bajo un error: «Mostrando 0–0 de 0» bajo el
           banner diría que no hay registros cuando lo cierto es que no se pudo
           preguntar. Y NO existe en «Pausados», que no está paginado: un
           paginador sobre una lista completa es una promesa falsa de que hay
           más. -->
      <AppPagination
        v-if="!enPausados && !loading && !error && total > 0"
        :page="page"
        :page-size="pageSize"
        :total="total"
        :page-count="pageCount"
        @update:page="goTo"
      />
      <p v-else-if="enPausados && !loading && !error && pausadosCargados > 0" class="ds-meta">
        Mostrando {{ pausadosTotal }} de {{ pausadosCargados }}
      </p>
    </div>

    <AppModal :open="showModal" title="Nuevo medicamento" @close="handleClose">
      <MedicamentForm
        ref="formRef"
        :saving="saving"
        :server-error="nombreDuplicado"
        @submit="handleCreate"
        @cancel="handleClose"
      />
    </AppModal>
  </AppLayout>
</template>

<style scoped>
.enlace-plataforma {
  margin: 0 0 var(--space-16);
}
</style>
