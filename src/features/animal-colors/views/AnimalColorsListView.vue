<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useAnimalColors } from '../composables/useAnimalColors'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { useToast } from '@/composables/useToast'
import { useUnsavedChangesGuard } from '@/composables/useUnsavedChangesGuard'
import { getProblemDetailMessage } from '@/services/http/http.client'
import { formatDate } from '@/composables/format'
import AppLayout from '@/components/layout/AppLayout.vue'
import AppTable from '@/components/ui/AppTable.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppListSearch from '@/components/ui/AppListSearch.vue'
import AppEmptyState from '@/components/feedback/AppEmptyState.vue'
import { coincide } from '@/composables/text'
import AnimalColorForm from '../components/AnimalColorForm.vue'
import { speciesApi } from '@/features/species/api/species.api'
import type { SpecieResponse } from '@/features/species/types/species.types'
import { ICONS } from '@/constants/icons'
import type { CreateAnimalColorRequest } from '../types/animal-colors.types'

const { colors, loading, error, errorTraceId, fetchAll, fetchBySpecie, create, remove } =
  useAnimalColors()
const { confirm } = useConfirmDialog()
const { errorFrom } = useToast()
const showModal = ref(false)
const saving = ref(false)
const formRef = ref<InstanceType<typeof AnimalColorForm> | null>(null)

const availableSpecies = ref<SpecieResponse[]>([])
const specieFilter = ref(0)
const q = ref('')

/** Carga del catálogo del filtro en vuelo, para el `placeholder="Cargando…"`. */
const cargandoEspecies = ref(false)

/**
 * Fallo al traer el catálogo del filtro. Se guarda aparte del `error` de la
 * tabla —que habla de los colores— porque son dos peticiones distintas y
 * confundirlas haría decir «no se pudieron cargar los colores» cuando los
 * colores están perfectamente.
 */
const especiesError = ref<string | null>(null)

const specieFilterOptions = computed(() => [
  { value: 0, label: 'Todas las especies' },
  ...availableSpecies.value.map((s) => ({ value: s.id, label: s.name })),
])

/**
 * Búsqueda en CLIENTE, y no por comodidad: `GET /animal-colors` devuelve
 * `List<AnimalColorResponse>` sin paginar, así que el navegador ya tiene el
 * conjunto completo y filtrar en memoria es exhaustivo por construcción — la
 * regla de honestidad de `docs/ux/patron-de-busqueda-en-listado.md` §5. El
 * desplegable de especie es otra cosa: ése SÍ baja al servidor
 * (`listBySpecie`), y el término se aplica encima de lo que haya traído.
 *
 * Filtra sobre el contenido del store, que es lo que la tabla pinta de verdad.
 * El plegado de acentos lo pone `coincide`: «canela» tiene que encontrar
 * «Canelá».
 */
const filtradas = computed(() =>
  colors.value.filter((c) => coincide(q.value, c.name, c.specie?.name)),
)

function reload() {
  return specieFilter.value ? fetchBySpecie(specieFilter.value) : fetchAll()
}

async function cargarEspecies() {
  cargandoEspecies.value = true
  especiesError.value = null
  try {
    availableSpecies.value = await speciesApi.listAll()
  } catch (e) {
    // Se conserva el OBJETO de error: `errorFrom` saca el mensaje del
    // `ProblemDetail` y arrastra el `X-Trace-Id`. Escribir el texto a mano en
    // este `catch` tiraría la traza.
    especiesError.value = getProblemDetailMessage(e, 'No se pudieron cargar las especies')
    errorFrom('Error al cargar las especies', e)
  } finally {
    cargandoEspecies.value = false
  }
}

onMounted(async () => {
  // El catálogo del filtro y la lista son DOS peticiones independientes: ni la
  // de especies necesita las filas ni la de colores necesita el desplegable.
  // Encadenadas con `await` la pantalla tardaba la SUMA de las dos; en paralelo
  // tarda lo que la más lenta.
  //
  // `allSettled` y no `all` a propósito: esta pantalla tiene DOS superficies de
  // error separadas —`especiesError` para el desplegable y el `error` del store
  // para la tabla— y sigue siendo útil con una sola de las dos respuestas. Con
  // `all`, el primer rechazo se propagaría fuera del `onMounted` y dejaría una
  // promesa rechazada sin manejar en lugar del banner concreto que cada bloque
  // ya sabe pintar. Ninguna de las dos rechaza hoy —ambas capturan y guardan su
  // error—, así que `allSettled` no traga nada: solo blinda que un cambio
  // futuro en una no pueda volver a tumbar a la otra, que es exactamente el
  // fallo que ya se dio aquí (la tabla se quedaba en «Aún no hay colores», sin
  // carga, sin error y sin filas, cuando la de especies se rechazaba).
  await Promise.allSettled([cargarEspecies(), reload()])
})

watch(specieFilter, reload)

// FORM-08: salir de la pantalla con el modal abierto y relleno se llevaba lo
// escrito sin decir nada.
useUnsavedChangesGuard(() => showModal.value && (formRef.value?.isDirty() ?? false))

async function handleCreate(data: CreateAnimalColorRequest) {
  if (saving.value) return
  saving.value = true
  try {
    await create(data)
    showModal.value = false
    // El color creado puede no pertenecer a la especie filtrada; releemos para no mostrarlo fuera.
    await reload()
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
  const ok = await confirm(`¿Eliminar el color "${name}"?`)
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
      <h1 class="ds-title">Colores</h1>
      <button type="button" class="ds-btn ds-btn--primary" @click="showModal = true">
        <component :is="ICONS.ADD" :size="15" />
        Nuevo color
      </button>
    </div>

    <!-- El placeholder enumera los campos que el predicado mira de verdad. -->
    <AppListSearch
      v-model="q"
      label="Buscar colores"
      placeholder="Nombre o especie…"
      :result-count="loading ? null : filtradas.length"
    />

    <!-- El desplegable vacío no explica por qué está vacío. Todo sale de
         primitivas `ds-*`: esto no añade ni una regla de estilo propia. -->
    <p v-if="especiesError" class="ds-banner ds-banner--error ds-banner--sm" role="alert">
      <component :is="ICONS.ERROR" :size="14" class="ds-banner-icon" />
      <span class="ds-flex-fill">{{ especiesError }}</span>
      <button type="button" class="ds-btn ds-btn--ghost ds-btn--sm" @click="cargarEspecies">
        <component :is="ICONS.RETRY" :size="13" />
        Reintentar
      </button>
    </p>

    <div class="filtro">
      <AppSelect
        v-model="specieFilter"
        label="Especie"
        :options="specieFilterOptions"
        :placeholder="cargandoEspecies ? 'Cargando…' : undefined"
      />
    </div>

    <AppTable
      caption="Colores"
      :headers="['Nombre', 'Especie', 'Fecha creación', 'Acciones']"
      :empty="filtradas.length === 0"
      :loading="loading"
      :error="error"
      :trace-id="errorTraceId"
      @retry="reload"
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
          title="Aún no hay colores"
          description="Cada color pertenece a una especie y describe el pelaje de la mascota en su ficha."
        >
          <button type="button" class="ds-btn ds-btn--primary" @click="showModal = true">
            <component :is="ICONS.ADD" :size="15" />
            Nuevo color
          </button>
        </AppEmptyState>
      </template>

      <tr v-for="c in filtradas" :key="c.id" class="ds-row-hover">
        <td class="ds-text-strong">{{ c.name }}</td>
        <td>{{ c.specie?.name }}</td>
        <td class="ds-meta">{{ formatDate(c.createdDate) }}</td>
        <td>
          <div class="ds-actions ds-actions--start">
            <RouterLink
              :to="`/animales/colores/${c.id}`"
              class="ds-icon-btn"
              :aria-label="`Editar ${c.name}`"
            >
              <component :is="ICONS.EDIT" :size="15" />
            </RouterLink>
            <button
              type="button"
              class="ds-icon-btn ds-icon-btn--danger"
              :aria-label="`Eliminar ${c.name}`"
              @click="handleDelete(c.id, c.name)"
            >
              <component :is="ICONS.DELETE" :size="15" />
            </button>
          </div>
        </td>
      </tr>
    </AppTable>

    <!-- Salvaguarda de §5: el día que el backend trunque la lista, este número
         dejará de cuadrar de forma observable en vez de degradar en silencio.
         Bajo un error diría «0 de 0», que es «no hay colores» cuando lo cierto
         es que no se pudo preguntar; durante el esqueleto, se contradiría con
         él. El total es el de la especie filtrada, que es lo que hay en memoria. -->
    <p v-if="!loading && !error && colors.length > 0" class="ds-meta">
      Mostrando {{ filtradas.length }} de {{ colors.length }}
    </p>

    <AppModal :open="showModal" title="Nuevo color" @close="handleClose">
      <AnimalColorForm
        ref="formRef"
        :saving="saving"
        @submit="handleCreate"
        @cancel="handleClose"
      />
    </AppModal>
  </AppLayout>
</template>

<style scoped>
/* Sustituye a `mb-4` de Vuetify y al `style` en línea que fijaba el ancho: el
   desplegable de un solo dato no debe estirarse al ancho de la tabla (DS-03b). */
.filtro {
  max-width: 280px;
  margin-bottom: var(--space-16);
}
</style>
