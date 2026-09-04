<script setup lang="ts">
import { computed, onMounted, ref, useId } from 'vue'
import AppEmptyState from '@/components/feedback/AppEmptyState.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppPagination from '@/components/ui/AppPagination.vue'
import AppTable from '@/components/ui/AppTable.vue'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { formatDate } from '@/composables/format'
import { ICONS } from '@/constants/icons'
import { useBillingDocumentSequences } from '../composables/useBillingDocumentSequences'
import { validateSequencePrefix } from '../composables/platformBillingValidators'
import { DOCUMENT_SEQUENCE_PREFIX } from '../types/platform-billing.types'

/**
 * Las series de numeración de las cuentas de cobro (§4.6, segundo bloque).
 *
 * <p><b>Solo alta y consulta.</b> La familia no expone `PUT` ni `DELETE`, y eso
 * no es una carencia: el consecutivo lo lleva la base de datos y ajustarlo a mano
 * abre un hueco en la numeración. Por eso aquí no hay ningún «Editar»
 * deshabilitado ni un lápiz atenuado en la columna de acciones — §3.2: una
 * interfaz que presenta con un botón gris una operación que **no existe** miente
 * dos veces, dice que la operación existe y que hoy no te dejan. Sencillamente no
 * está en el marcado.
 *
 * <p><b>El alta se confirma.</b> Una serie no se puede renombrar ni borrar, así
 * que el alta es una puerta de un solo sentido y se pide confirmación con la
 * consecuencia escrita, como el resto de puertas de un solo sentido de esta
 * consola.
 *
 * <p><b>El vacío no es «sin resultados».</b> Una consola recién desplegada no
 * tiene ninguna serie, y «Aún no hay registros» ahí se lee como «esto está roto»
 * (§3.7). Es el paso 6 de la puesta en marcha, y a diferencia de los otros seis
 * **se arregla en esta misma pantalla**, así que el estado vacío lleva la salida
 * puesta: el botón precarga el prefijo `DC` en el formulario de alta. Pintar aquí
 * la lista completa de la puesta en marcha mandaría al operador a otro sitio
 * teniendo el arreglo delante.
 */
const sequences = useBillingDocumentSequences()
const { confirm } = useConfirmDialog()

const prefixId = useId()
const rawPrefix = ref('')
const prefixTouched = ref(false)

/**
 * Saneado en vivo: el contrato solo acepta mayúsculas (`[A-Z]{1,10}`) y
 * mayusculizar lo que se teclea es una transformación predecible que el usuario
 * ve al momento. No se borran los caracteres que sobran —eso sí sorprendería—:
 * de esos se encarga el validador, con su mensaje y su ejemplo.
 */
const prefix = computed({
  get: () => rawPrefix.value,
  set: (value: string) => {
    rawPrefix.value = value.toUpperCase()
  },
})

const prefixError = computed(() => validateSequencePrefix(rawPrefix.value))
const prefixShownError = computed(() => (prefixTouched.value ? prefixError.value : ''))

const hasDocumentSequence = computed(() =>
  sequences.items.value.some((row) => row.prefix === DOCUMENT_SEQUENCE_PREFIX),
)

onMounted(() => {
  void sequences.reload()
})

/** Precarga el prefijo de las cuentas de cobro y lleva el foco al campo. */
function prefillDocumentSequence() {
  rawPrefix.value = DOCUMENT_SEQUENCE_PREFIX
  prefixTouched.value = false
  // Por `id` y no por un `ref` al componente: `AppInput` no expone `focus()`, y
  // el `id` es el mismo que ya usa su `<label for>`. Es el mecanismo que
  // `ErrorSummary.vue:63-69` dejó resuelto para mover el foco a un control.
  document.getElementById(prefixId)?.focus()
}

async function submit() {
  prefixTouched.value = true
  if (prefixError.value) return

  const value = rawPrefix.value.trim()
  const accepted = await confirm({
    message: `¿Crear la serie de numeración «${value}»?`,
    consequence:
      'La serie queda de forma permanente: no se puede renombrar ni eliminar, y su consecutivo lo lleva la base de datos. Un prefijo equivocado se queda en la numeración para siempre.',
    confirmLabel: `Crear la serie ${value}`,
  })
  if (!accepted) return

  if (await sequences.create(value)) {
    rawPrefix.value = ''
    prefixTouched.value = false
  }
}
</script>

<template>
  <div class="ds-stack ds-stack--16">
    <p class="ds-banner ds-banner--info aviso">
      <component :is="ICONS.INFO" :size="16" class="ds-banner-icon" aria-hidden="true" />
      <span class="ds-flex-fill">
        El consecutivo lo lleva la base de datos. No se puede ajustar a mano: un salto crea un hueco
        en la numeración. Por eso aquí solo se consulta y se da de alta.
      </span>
    </p>

    <p
      v-if="!hasDocumentSequence && !sequences.loading.value && !sequences.error.value"
      class="ds-banner ds-banner--warning aviso"
      role="status"
    >
      <component :is="ICONS.WARNING" :size="16" class="ds-banner-icon" aria-hidden="true" />
      <span class="ds-flex-fill">
        No hay ninguna serie con el prefijo {{ DOCUMENT_SEQUENCE_PREFIX }}. Sin ella, la primera
        cuenta de cobro que haya que emitir falla.
      </span>
    </p>

    <form class="alta" @submit.prevent="submit">
      <AppInput
        :id="prefixId"
        v-model="prefix"
        label="Prefijo de la serie"
        required
        autocomplete="off"
        :placeholder="DOCUMENT_SEQUENCE_PREFIX"
        hint="De 1 a 10 letras mayúsculas. El de las cuentas de cobro de suscripción es DC."
        :error="prefixShownError"
        @blur="prefixTouched = true"
      />
      <button
        type="submit"
        class="ds-btn ds-btn--primary boton"
        :disabled="sequences.creating.value"
      >
        <component :is="ICONS.ADD" :size="15" aria-hidden="true" />
        {{ sequences.creating.value ? 'Creando…' : 'Crear serie' }}
      </button>
    </form>

    <AppTable
      caption="Series de numeración"
      :headers="['Prefijo', { label: 'Próximo número', align: 'num' }, 'Creada']"
      :empty="sequences.items.value.length === 0"
      :loading="sequences.loading.value"
      :error="sequences.error.value"
      :trace-id="sequences.errorTraceId.value"
      :skeleton-rows="3"
      @retry="sequences.reload"
    >
      <template #empty>
        <AppEmptyState
          title="Todavía no hay ninguna serie de numeración"
          description="Es el paso 6 de la puesta en marcha de la plataforma, y se hace aquí mismo."
        >
          <button type="button" class="ds-btn ds-btn--primary" @click="prefillDocumentSequence">
            <component :is="ICONS.ADD" :size="15" aria-hidden="true" />
            Crear la serie {{ DOCUMENT_SEQUENCE_PREFIX }}
          </button>
        </AppEmptyState>
      </template>

      <tr v-for="row in sequences.items.value" :key="row.id">
        <td class="ds-text-strong">{{ row.prefix }}</td>
        <td class="ds-num">{{ row.nextValue }}</td>
        <td>{{ formatDate(row.createdDate) }}</td>
      </tr>
    </AppTable>

    <AppPagination
      v-if="sequences.pageCount.value > 1"
      :page="sequences.page.value"
      :page-size="sequences.pageSize"
      :total="sequences.total.value"
      :page-count="sequences.pageCount.value"
      @update:page="sequences.goTo"
    />
  </div>
</template>

<style scoped>
.aviso {
  margin: 0;
}

/* El campo crece y el botón se queda con su ancho; alineados por abajo para que
   el botón case con el `<input>` y no con su etiqueta. */
.alta {
  display: flex;
  align-items: flex-end;
  gap: var(--space-12);
}

.alta > :first-child {
  flex: 1 1 auto;
  min-width: 0;
}

/* El campo lleva ayuda debajo; sin esto el botón quedaría a la altura de ese
   texto en vez de a la del control. */
.boton {
  margin-bottom: var(--space-24);
}

@media (width <= 640px) {
  .alta {
    flex-direction: column;
    align-items: stretch;
  }

  .boton {
    margin-bottom: 0;
  }
}
</style>
