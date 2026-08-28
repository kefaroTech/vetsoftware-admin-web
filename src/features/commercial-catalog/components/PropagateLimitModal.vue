<script setup lang="ts">
import { computed } from 'vue'
import { ArrowUpCircle } from 'lucide-vue-next'
import AppModal from '@/components/ui/AppModal.vue'
import type {
  CatalogItemLimitResponse,
  PropagateCatalogLimitImprovementRequest,
} from '../types/commercial-catalog.types'

/**
 * Llevar una mejora de techo a los contratos que ya están firmados.
 *
 * ── La asimetría, dicha antes de pulsar ───────────────────────────────────
 *
 * <p><b>Las mejoras se propagan; los recortes no.</b> No es una elección de esta
 * pantalla: el cupo de cada contrato se congela al firmar, así que quien firmó
 * con cien conserva sus cien aunque la fábrica baje a cincuenta. La consecuencia
 * práctica —y la que hay que decir <b>antes</b>— es que esta acción solo puede
 * subir: quien ya esté por encima del techo nuevo no se toca, y quien esté por
 * debajo sube. Nadie baja.
 *
 * <p>Por eso el diálogo enseña el techo de fábrica que se va a propagar y dice
 * quiénes cambian y quiénes no, en vez de un «¿confirmar?» que dejaría a alguien
 * creyendo que acaba de recortar cupos a media cartera.
 *
 * ── Sin firma, porque no hay dónde guardarla ──────────────────────────────
 *
 * <p>`SignedActionModal` garantiza que nunca se emite sin un motivo de lista
 * cerrada, y su valor está en que ese motivo se guarde.
 * `PropagateCatalogLimitImprovementRequest` declara cuatro campos y ninguno es
 * un motivo ni una nota: pedirlo aquí sería teatro. Queda anotado como hueco del
 * contrato — una acción que toca contratos vivos debería poder explicarse.
 */
const props = defineProps<{
  open: boolean
  limit: CatalogItemLimitResponse | null
  /** El nombre del eje, ya resuelto por la pantalla. */
  dimensionName: string
  itemName: string
  saving?: boolean
}>()

const emit = defineEmits<{
  close: []
  confirm: [payload: PropagateCatalogLimitImprovementRequest]
}>()

const ceilingText = computed(() => {
  if (!props.limit) return ''
  if (props.limit.mode === 'FULL') return 'sin techo'
  return props.limit.limitQuantity === null
    ? 'con un techo que el catálogo no declara'
    : `hasta ${props.limit.limitQuantity}`
})

/**
 * Un techo `LIMITED` sin cantidad no se puede propagar: el contrato exige
 * `factoryLimitQuantity` cuando el modo es limitado, y mandar un `null` haría que
 * el servidor lo interpretara como sin techo — una mejora infinita que nadie
 * pidió. Se dice y se bloquea.
 */
const blocked = computed(
  () =>
    props.limit !== null && props.limit.mode === 'LIMITED' && props.limit.limitQuantity === null,
)

function confirm() {
  const limit = props.limit
  if (!limit || props.saving || blocked.value) return
  emit('confirm', {
    catalogItemId: limit.catalogItemId,
    limitDimensionId: limit.limitDimensionId,
    factoryMode: limit.mode,
    factoryLimitQuantity: limit.mode === 'LIMITED' ? limit.limitQuantity : null,
  })
}
</script>

<template>
  <AppModal
    v-if="limit"
    :open="open"
    title="Propagar la mejora a los contratos vivos"
    :max-width="620"
    @close="emit('close')"
  >
    <div class="ds-stack ds-stack--16">
      <p class="ds-dialog-body">
        El techo de fábrica de «{{ itemName }}» sobre {{ dimensionName }} es
        <span class="ds-text-strong">{{ ceilingText }}</span
        >. Propagarlo lleva ese techo a las suscripciones vivas que hoy tengan uno peor.
      </p>

      <p class="ds-banner ds-banner--info" role="status">
        <ArrowUpCircle :size="16" class="ds-banner-icon" />
        <span class="ds-flex-fill">
          <strong>Esto solo sube.</strong> El cupo de cada contrato se congeló al firmar, así que
          quien ya tenga un techo igual o mejor no se toca: quien firmó con cien conserva sus cien
          aunque la fábrica sea de cincuenta. No hay forma de recortar desde aquí, ni la va a haber.
        </span>
      </p>

      <p v-if="blocked" class="ds-banner ds-banner--error" role="alert">
        <span class="ds-flex-fill">
          Este techo dice «hasta una cantidad» pero el catálogo no trae la cantidad. Propagarlo
          mandaría un techo vacío, que el servidor leería como «sin límite» — una mejora infinita
          que nadie pidió. Corrige primero el techo de fábrica.
        </span>
      </p>
    </div>

    <template #footer>
      <button type="button" class="ds-btn ds-btn--ghost" :disabled="saving" @click="emit('close')">
        Cancelar
      </button>
      <button
        type="button"
        class="ds-btn ds-btn--primary"
        :disabled="saving || blocked"
        @click="confirm"
      >
        {{ saving ? 'Propagando…' : 'Propagar la mejora' }}
      </button>
    </template>
  </AppModal>
</template>
