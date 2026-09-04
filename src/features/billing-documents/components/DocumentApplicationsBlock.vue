<script setup lang="ts">
import { computed } from 'vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppEmptyState from '@/components/feedback/AppEmptyState.vue'
import AppTable from '@/components/ui/AppTable.vue'
import type { AppTableHeader } from '@/components/ui/AppTable.vue'
import { ICONS } from '@/constants/icons'
import { formatAmount, formatDate } from '@/composables/format'
import { BILLING_DOCUMENT_ROUTE_NAMES } from '@/router/routes/billing-documents.routes'
import ContractGapNotice from './ContractGapNotice.vue'
import {
  applicationSourcePresentation,
  type BillingDocumentApplicationResponse,
} from '../types/billing-documents.types'
/**
 * <b>Bloque 4 · qué salda este documento.</b>
 *
 * <p>El caso que justifica que esto esté en pantalla, y que hay que poder contar
 * mirándola: <i>«Ana debe 213.010. Su contadora le practica retención y le gira
 * 205.850. El sistema aplica, deja 7.160 de saldo vivo, empieza la mora, se
 * agotan los días de gracia y su clínica cae a solo lectura por una deuda que
 * fiscalmente no existe.»</i> Sin esta tabla, ese saldo de 7.160 es un número sin
 * explicación; con ella, es una fila que dice «retención» y se resuelve en un
 * minuto.
 *
 * <p><b>La retención no dice «descuento».</b> Una retención no reduce el ingreso:
 * baja la cartera y sube un activo. El rótulo y su significado viven en
 * `APPLICATION_SOURCE_PRESENTATION`, una vez, para que ninguna pantalla lo
 * reescriba con otra palabra.
 *
 * <p><b>Ni un botón de eliminar, en ninguna fila, nunca</b> (§3.5). Una aplicación
 * no se borra: se contra-aplica, que crea otra fila y deja las dos. La papelera
 * sería una promesa que el esquema no puede cumplir, y descubrirlo con un 409 es
 * la peor forma de aprenderlo. Lo que esta tabla ofrece es
 * <b>«Contra-aplicar»</b> (`POST /billing-document-applications/{id}/reversal`),
 * que es otra cosa y se llama por su nombre: al pulsarlo el documento tiene
 * <b>una fila más</b>, no una menos.
 *
 * <p><b>Las tres filas de la corrección se leen juntas.</b> La equivocada queda
 * marcada como «contra-aplicada», la que la anula dice a cuál anula, y la correcta
 * se registra aparte. Ninguna de las tres desaparece, porque lo que hay que poder
 * reconstruir dentro de dos ejercicios no es el saldo de hoy sino cómo se llegó a
 * él.
 *
 * <p><b>Lo que ya está contra-aplicado no se vuelve a contra-aplicar</b>, y su
 * botón no está: contra-aplicar dos veces la misma fila suma el importe otra vez y
 * deja el documento saldado de más. Tampoco lo lleva la fila que <i>es</i> una
 * contra-aplicación — anular una anulación es rehacer el error original.
 *
 * <p><b>El saldo se pinta como resta, no como número suelto</b>: total − aplicado
 * = saldo. Y como el contrato no declara el signo de una contra-aplicación, la
 * suma de la columna se <b>compara</b> con lo que dice el servidor en vez de
 * sustituirlo; cuando las dos cuentas no coinciden, manda el servidor y se dice.
 */
const props = defineProps<{
  rows: BillingDocumentApplicationResponse[]
  total: number
  loading: boolean
  error: string | null
  errorTraceId: string | null
  settlement: {
    total: number
    settled: number
    balance: number
    arithmeticBalance: number
    balanceAgrees: boolean
    summedApplications: number
    applicationsComplete: boolean
    applicationsAgree: boolean
  } | null
  /** La fila que se está contra-aplicando ahora. `null` = ninguna. */
  reversingId?: number | null
}>()

defineEmits<{ retry: []; reverse: [applicationId: number]; apply: [] }>()

const HEADERS: AppTableHeader[] = [
  'Origen',
  'Referencia',
  { label: 'Aplicado', align: 'num' },
  'Cuándo',
  { label: '', align: 'actions' },
]

/**
 * Qué aplicaciones ya tienen su contra-aplicación en pantalla.
 *
 * <p>Se deriva de `reversalOfId` de las demás filas y no de un campo propio,
 * porque el contrato no publica ninguno: `BillingDocumentApplicationResponse`
 * declara la ida —a quién anulo— y no la vuelta. Por eso solo se puede afirmar
 * sobre las filas cargadas, y cuando la página está incompleta la tabla lo dice.
 */
const reversedIds = computed(
  () =>
    new Set(props.rows.map((row) => row.reversalOfId).filter((id): id is number => id !== null)),
)

/**
 * Una fila se puede contra-aplicar si no es ya una contra-aplicación y nadie la ha
 * anulado todavía. Cuando no se puede, el botón <b>no está</b>: un botón apagado
 * en una tabla de dinero invita a buscar cómo encenderlo.
 */
function canReverse(row: BillingDocumentApplicationResponse): boolean {
  return row.reversalOfId === null && !reversedIds.value.has(row.id)
}
</script>

<template>
  <section class="ds-card ds-stack ds-stack--14" aria-labelledby="aplicaciones-titulo">
    <div class="ds-block-head">
      <div>
        <h3 id="aplicaciones-titulo" class="ds-title titulo">Qué lo salda</h3>
        <p class="ds-meta descripcion">
          Una fila por aplicación, en orden. Aquí no se borra nada: una aplicación equivocada se
          contra-aplica con otra, y las dos quedan.
        </p>
      </div>
      <button type="button" class="ds-btn ds-btn--ghost ds-btn--sm" @click="$emit('apply')">
        <component :is="ICONS.ADD" :size="14" />
        Registrar aplicación
      </button>
    </div>

    <AppTable
      caption="Qué salda el documento"
      money
      :headers="HEADERS"
      :empty="rows.length === 0"
      :loading="loading"
      :error="error"
      :trace-id="errorTraceId"
      @retry="$emit('retry')"
    >
      <template #empty>
        <AppEmptyState
          title="Nada lo ha saldado todavía"
          description="Ningún pago, nota crédito ni retención se ha aplicado a este documento. El saldo es el total."
        />
      </template>

      <tr v-for="row in rows" :key="row.id" class="ds-row-hover">
        <td>
          <span class="ds-text-strong">{{
            applicationSourcePresentation(row.sourceKind).label
          }}</span>
          <span class="ds-meta linea">{{
            applicationSourcePresentation(row.sourceKind).meaning
          }}</span>
          <span v-if="row.reversalOfId" class="linea">
            <AppBadge
              variant="neutral"
              :label="`Contra-aplica la aplicación #${row.reversalOfId}`"
            />
          </span>
          <!-- La fila equivocada sigue aquí, marcada. Es la primera de las tres
               que la corrección deja: la aplicación, su contra-aplicación y la
               correcta. -->
          <span v-else-if="reversedIds.has(row.id)" class="linea">
            <AppBadge variant="warning" label="Contra-aplicada: ya no cuenta" />
          </span>
        </td>

        <td>
          <span v-if="row.paymentId">Pago #{{ row.paymentId }}</span>
          <RouterLink
            v-else-if="row.sourceDocument"
            :to="{
              name: BILLING_DOCUMENT_ROUTE_NAMES.DETAIL,
              params: { companyId: row.sourceDocument.companyId, id: row.sourceDocument.id },
            }"
            :aria-label="`Abrir el documento ${row.sourceDocument.documentNumber ?? row.sourceDocument.id}`"
          >
            {{ row.sourceDocument.documentNumber ?? `Documento #${row.sourceDocument.id}` }}
          </RouterLink>
          <!-- Retención, saldo a favor, redondeo y castigo no traen ninguna
               referencia en el contrato: no se inventa un guion que parezca dato. -->
          <span v-else class="ds-meta">Sin referencia en el contrato</span>
        </td>

        <td class="ds-num">{{ formatAmount(row.appliedAmount) }}</td>
        <td>{{ formatDate(row.appliedAt) }}</td>

        <!-- Nunca una papelera: contra-aplicar añade una fila, no la quita. El
             nombre accesible lleva el sujeto de la fila (R04). -->
        <td class="ds-col-actions">
          <button
            v-if="canReverse(row)"
            type="button"
            class="ds-btn ds-btn--ghost ds-btn--sm"
            :disabled="reversingId !== null"
            :aria-label="`Contra-aplicar la aplicación #${row.id} de ${applicationSourcePresentation(row.sourceKind).label}`"
            @click="$emit('reverse', row.id)"
          >
            <component :is="ICONS.RETRY" :size="14" />
            {{ reversingId === row.id ? 'Contra-aplicando…' : 'Contra-aplicar' }}
          </button>
        </td>
      </tr>
    </AppTable>

    <ContractGapNotice
      v-if="rows.some((row) => row.sourceKind === 'WITHHOLDING')"
      title="La retención sin su certificado"
      reason="Este documento tiene una retención aplicada, pero la respuesta solo trae el importe:
        ni el tipo (renta, IVA o ICA), ni la base, ni la tarifa, ni el municipio, ni el año
        gravable, ni el certificado. Con el importe a secas no se puede contestar a la contadora
        que llame."
      needed="Que la aplicación de origen `WITHHOLDING` traiga su detalle fiscal y la referencia
        del certificado."
    />

    <!-- El motivo de una corrección de dinero es justo lo que alguien va a
         preguntar dentro de dos ejercicios. Se declara el hueco en vez de pedirlo
         en un modal y tirarlo en el borde. -->
    <ContractGapNotice
      v-if="rows.some((row) => row.reversalOfId !== null)"
      title="Por qué se contra-aplicó"
      reason="`POST /billing-document-applications/{id}/reversal` no acepta cuerpo: no hay dónde
        guardar el motivo ni quién lo hizo. Por eso esta pantalla no lo pide — un modal que pidiera
        un motivo que el borde descarta haría creer que queda registrado cuando no queda nada."
      needed="Que la contra-aplicación acepte motivo de lista cerrada y nota, como el resto de las
        acciones firmadas de la consola."
    />

    <!-- La aritmética escrita, que es lo que convierte un saldo en algo que se
         puede discutir. Sin la resta a la vista, «7.160» es un número que nadie
         sabe de dónde sale. -->
    <dl v-if="settlement" class="ds-detail-grid cuentas">
      <div>
        <dt class="ds-label">Total del documento</dt>
        <dd class="ds-num">{{ formatAmount(settlement.total) }}</dd>
      </div>
      <div>
        <dt class="ds-label">Aplicado (lo que dice el servidor)</dt>
        <dd class="ds-num">− {{ formatAmount(settlement.settled) }}</dd>
      </div>
      <div>
        <dt class="ds-label">Saldo</dt>
        <dd class="ds-num ds-text-strong">= {{ formatAmount(settlement.balance) }}</dd>
      </div>
    </dl>

    <div v-if="settlement && !settlement.balanceAgrees" class="ds-banner ds-banner--warning">
      <component :is="ICONS.WARNING" :size="16" class="ds-banner-icon" />
      <span class="ds-flex-fill">
        La resta no da el saldo que trae el documento: total menos aplicado son
        {{ formatAmount(settlement.arithmeticBalance) }} y el saldo dice
        {{ formatAmount(settlement.balance) }}. <strong>Manda el saldo del servidor</strong>, que es
        el que gobierna la mora; esta diferencia hay que reportarla.
      </span>
    </div>

    <p
      v-if="
        settlement &&
        rows.length > 0 &&
        settlement.applicationsComplete &&
        !settlement.applicationsAgree
      "
      class="ds-meta descripcion"
    >
      La suma de la columna «Aplicado» da
      {{ formatAmount(settlement.summedApplications) }} y el documento dice que lleva
      {{ formatAmount(settlement.settled) }} saldados. La diferencia es esperable si alguna fila
      contra-aplica a otra: el contrato no declara con qué signo viaja una reversión, así que la
      cuenta buena es la del servidor.
    </p>

    <p v-if="settlement && !settlement.applicationsComplete" class="ds-meta descripcion">
      Se muestran {{ rows.length }} de {{ total }} aplicaciones.
    </p>
  </section>
</template>

<style scoped>
.titulo,
.descripcion {
  margin: 0;
}

.linea {
  display: block;
}

/* Las tres cifras de la resta van una debajo de otra en una sola columna: leídas
   en fila, «total, aplicado, saldo» no se lee como una operación. */
.cuentas {
  max-width: 34rem;
}
</style>
