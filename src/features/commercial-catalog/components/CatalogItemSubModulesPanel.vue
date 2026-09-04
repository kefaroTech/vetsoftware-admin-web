<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ICONS } from '@/constants/icons'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppTable from '@/components/ui/AppTable.vue'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import BridgeSection from './BridgeSection.vue'
import { useCatalogItemBridges } from '../composables/useCatalogItemBridges'
import { useSellableSubModules } from '../composables/useSellableSubModules'
import type { CatalogItemSubModuleResponse } from '@/features/platform-setup/types/platform-setup.types'

/**
 * Puente 1 · **qué pantallas abre el artículo** (`catalog_item_sub_modules`).
 *
 * ── Por qué este bloque es el que más importa ──────────────────────────────
 *
 * Es el puente entre vender y funcionar. Sin una fila aquí, vender «Historia
 * clínica» a una clínica **no le abre ninguna pantalla** en su aplicación: el
 * artículo se cobra y no concede nada. Es el paso 2 de la puesta en marcha
 * (§3.7) y hasta hoy esa lista lo marcaba «Pendiente» sin ofrecer dónde
 * completarlo.
 *
 * ── Aquí NO hay «Editar», y no se disimula ─────────────────────────────────
 *
 * El puente no tiene `PUT` en el contrato: `POST` y `DELETE`, nada más. Un
 * vínculo o está o no está; no hay nada dentro que cambiar. Así que no se pinta
 * un botón de editar deshabilitado —eso sería prometer una operación que no
 * existe—: la columna de acciones tiene una sola.
 *
 * ── El selector solo ofrece lo vendible ────────────────────────────────────
 *
 * `sellable === false` es infraestructura interna («Sucursales»,
 * «Configuración del sistema»): toda clínica la tiene por existir y no se
 * vende. Ver `useSellableSubModules`.
 *
 * ── `readOnlyCapable` es una advertencia de baja, no un adorno ─────────────
 *
 * Una pantalla que no admite solo lectura, al dar de baja el artículo, queda
 * **oculta** en vez de en consulta. Es la diferencia entre una baja limpia y
 * una clínica que deja de ver su propia historia clínica, así que se dice antes
 * de vincular y se repite en la tabla, con texto e icono y nunca solo por color
 * (§5.2).
 */
const props = defineProps<{ itemId: number; itemName: string }>()

const {
  subModuleLinks,
  subModulesLoading,
  subModulesError,
  subModulesErrorTraceId,
  loadSubModuleLinks,
  linkSubModule,
  unlinkSubModule,
} = useCatalogItemBridges()
const {
  options: sellableOptions,
  loading: subModulesCatalogLoading,
  error: subModulesCatalogError,
  findById,
  refresh: refreshSellable,
} = useSellableSubModules()
const { confirm } = useConfirmDialog()

const section = ref<InstanceType<typeof BridgeSection> | null>(null)
const pending = ref<number | null>(null)
const touched = ref(false)
const saving = ref(false)

// Recarga al abrir, que es la regla del proyecto: un catálogo servido de caché
// diría «no hay pantallas vendibles» justo después de marcar una como vendible.
onMounted(() => {
  void refreshSellable()
})

const linkedIds = computed(() => new Set(subModuleLinks.value.map((link) => link.subModule.id)))

/** Lo vendible que este artículo todavía no abre. */
const availableOptions = computed(() =>
  sellableOptions.value.filter((option) => !linkedIds.value.has(option.value)),
)

const selectedSubModule = computed(() => (pending.value ? findById(pending.value) : null))

/** El aviso de baja se enseña ANTES de vincular, que es cuando aún se puede decidir. */
const readOnlyWarning = computed(
  () => selectedSubModule.value !== null && !selectedSubModule.value.readOnlyCapable,
)

const error = computed(() =>
  pending.value === null ? 'Elige la pantalla que abre el artículo.' : '',
)
const shownError = computed(() => (touched.value ? error.value : ''))

function moveFocusToHeading() {
  section.value?.focus()
}

async function submit() {
  touched.value = true
  if (error.value || pending.value === null || saving.value) return
  saving.value = true
  try {
    await linkSubModule(props.itemId, pending.value)
    pending.value = null
    touched.value = false
    moveFocusToHeading()
  } catch {
    // El composable ya avisó con el `ProblemDetail` y su traza.
  } finally {
    saving.value = false
  }
}

async function unlink(link: CatalogItemSubModuleResponse) {
  const accepted = await confirm({
    message: `¿Quitar «${link.subModule.name}» de ${props.itemName}?`,
    consequence:
      'El artículo dejará de abrir esa pantalla. Las clínicas que lo tengan contratado la perderán en el siguiente recálculo de accesos.',
    confirmLabel: 'Quitar pantalla',
  })
  if (!accepted) return
  try {
    await unlinkSubModule(props.itemId, link.id)
    moveFocusToHeading()
  } catch {
    // El composable ya avisó.
  }
}

function readOnlyLabel(link: CatalogItemSubModuleResponse) {
  const sub = findById(link.subModule.id)
  if (sub === null) return { text: 'Sin comprobar', icon: ICONS.WARNING }
  return sub.readOnlyCapable
    ? { text: 'Sí, queda en consulta', icon: ICONS.CHECK }
    : { text: 'No: quedará oculta', icon: ICONS.WARNING }
}
</script>

<template>
  <BridgeSection
    ref="section"
    title="Qué pantallas abre"
    help="Un artículo puede abrir varias pantallas; «Historia clínica» abre consultas, hospitalización y prescripciones. Sin ninguna, el artículo se cobra y no concede nada."
  >
    <div v-if="subModulesCatalogError" class="ds-banner ds-banner--error" role="alert">
      <component :is="ICONS.ERROR" :size="16" class="ds-banner-icon" aria-hidden="true" />
      <span class="ds-flex-fill">{{ subModulesCatalogError }}</span>
      <button type="button" class="ds-btn ds-btn--ghost ds-btn--sm" @click="refreshSellable()">
        <component :is="ICONS.RETRY" :size="14" aria-hidden="true" />
        Reintentar
      </button>
    </div>

    <form
      v-if="availableOptions.length > 0 || subModulesCatalogLoading"
      class="alta"
      @submit.prevent="submit"
    >
      <AppSelect
        v-model="pending"
        :options="availableOptions"
        label="Pantalla que abre este artículo"
        required
        :disabled="subModulesCatalogLoading || !!subModulesCatalogError"
        :placeholder="subModulesCatalogLoading ? 'Cargando…' : 'Selecciona una pantalla'"
        hint="Solo aparecen los submódulos vendibles; el resto es infraestructura interna."
        :error="shownError"
        @blur="touched = true"
      />
      <button
        type="submit"
        class="ds-btn ds-btn--primary"
        :disabled="saving || subModulesCatalogLoading || !!subModulesCatalogError"
      >
        <component :is="ICONS.ADD" :size="15" aria-hidden="true" />
        {{ saving ? 'Vinculando…' : 'Vincular' }}
      </button>
    </form>
    <p v-else class="ds-meta">Este artículo ya abre todas las pantallas vendibles del sistema.</p>

    <p v-if="readOnlyWarning" class="ds-banner ds-banner--warning" role="status">
      <component :is="ICONS.WARNING" :size="16" class="ds-banner-icon" aria-hidden="true" />
      <span class="ds-flex-fill">
        Esta pantalla <strong>no admite solo lectura</strong>: al dar de baja el artículo quedará
        oculta, no en consulta.
      </span>
    </p>

    <AppTable
      caption="Pantallas que abre el artículo"
      :headers="['Módulo', 'Pantalla', 'Código', 'Al dar de baja', 'Acciones']"
      :empty="subModuleLinks.length === 0"
      :loading="subModulesLoading"
      :error="subModulesError"
      :trace-id="subModulesErrorTraceId"
      @retry="loadSubModuleLinks(props.itemId)"
    >
      <template #empty>
        <p class="ds-empty ds-empty--boxed">
          <component :is="ICONS.WARNING" :size="15" class="ds-banner-icon" aria-hidden="true" />
          Este artículo no abre ninguna pantalla todavía. Vender así lo cobra sin conceder nada.
        </p>
      </template>

      <tr v-for="link in subModuleLinks" :key="link.id" class="ds-row-hover">
        <td>{{ findById(link.subModule.id)?.module.name ?? '—' }}</td>
        <td class="ds-text-strong">{{ link.subModule.name }}</td>
        <td class="ds-meta">{{ link.subModule.code }}</td>
        <td>
          <span class="ds-flex-row ds-flex-row--6">
            <component :is="readOnlyLabel(link).icon" :size="14" aria-hidden="true" />
            {{ readOnlyLabel(link).text }}
          </span>
        </td>
        <td>
          <div class="ds-actions ds-actions--start">
            <button
              type="button"
              class="ds-icon-btn ds-icon-btn--danger"
              :aria-label="`Quitar ${link.subModule.name}`"
              @click="unlink(link)"
            >
              <component :is="ICONS.DELETE" :size="15" aria-hidden="true" />
            </button>
          </div>
        </td>
      </tr>
    </AppTable>
  </BridgeSection>
</template>

<style scoped>
.alta {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: var(--space-12);
}

@media (width <= 680px) {
  .alta {
    grid-template-columns: 1fr;
  }
}
</style>
