<script setup lang="ts">
import { computed, onUnmounted, reactive, ref, useId } from 'vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppTable from '@/components/ui/AppTable.vue'
import AppEmptyState from '@/components/feedback/AppEmptyState.vue'
import ErrorSummary, { toSummaryItems } from '@/components/feedback/ErrorSummary.vue'
import CompanyRef from '@/components/ui/CompanyRef.vue'
import { ICONS } from '@/constants/icons'
import { formatDateTime } from '@/features/subscriptions-admin/composables/entitlementText'
import { useEntitlementSnapshot } from '../composables/useEntitlementSnapshot'
import { businessToday } from '../composables/trialWindowText'
import { SNAPSHOT_TRIGGER_LABEL, snapshotActor, snapshotCell } from '../composables/snapshotPayload'

/**
 * `/pruebas/fotos` — <b>«¿qué veía esta empresa el día X?»</b>
 *
 * <p>La pregunta llega por soporte: una clínica dice que el martes no podía
 * entrar a hospitalización. Hoy eso se contesta mirando el contrato vigente y
 * suponiendo, que es como se acaba dando la razón a quien no la tiene — los
 * permisos se recalculan, y lo que hay hoy no es lo que había el martes. La foto
 * de permisos sí lo sabe, porque es el JSON congelado de aquel cálculo.
 *
 * <p><b>La foto casi nunca es del día que se pide, y eso se dice.</b> El endpoint
 * devuelve la última tomada <i>en o antes</i> del instante pedido. Si se pregunta
 * por el 14 y el último recálculo fue el 2, vuelve la del 2 — y esa es la
 * respuesta correcta, porque entre el 2 y el 14 no cambió nada y el cliente
 * seguía viendo lo del 2. Lo que no puede pasar es que se pinte como «la foto del
 * 14»: la fecha que se enseña grande es la del recálculo, y el aviso explica la
 * diferencia.
 *
 * <p><b>El `payload` se enseña sin declararle una forma.</b> El contrato no
 * documenta ni un campo de dentro y `payloadFormatVersion` es la confesión de que
 * puede cambiar. Renderizarlo campo a campo ataría la pantalla a una forma no
 * publicada, y el día que el backend la cambiara no habría error: habría celdas
 * vacías donde antes había permisos. Así que las columnas <b>salen de las claves
 * que la propia foto trae</b>, y debajo está el JSON crudo, que es lo único que
 * con seguridad es cierto. Ver `composables/snapshotPayload.ts`.
 *
 * <p><b>La empresa se pide por número.</b> Es la misma limitación que en el resto
 * de pantallas de plataforma de este bloque: el contrato no publica un buscador
 * de empresas que se pueda usar aquí sin traerse el censo. El número se enlaza al
 * expediente en cuanto hay respuesta, con `CompanyRef`.
 */
const companyFieldId = useId()
const dayFieldId = useId()
const summary = ref<InstanceType<typeof ErrorSummary> | null>(null)
const resultRegion = ref<HTMLElement | null>(null)

const { snapshot, missing, reading, asOfNotice, loading, error, errorTraceId, load, reset } =
  useEntitlementSnapshot()

const form = reactive({ companyId: '', day: businessToday() })
const touched = reactive({ companyId: false, day: false })

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

const errors = computed(() => ({
  companyId: !form.companyId.trim()
    ? 'La empresa es obligatoria.'
    : !/^\d+$/.test(form.companyId.trim()) || Number(form.companyId) < 1
      ? 'Escribe el número de la empresa, sin el «#».'
      : '',
  day: !form.day
    ? 'El día es obligatorio.'
    : !ISO_DATE.test(form.day)
      ? 'La fecha no es válida. Usa el calendario del campo.'
      : form.day > businessToday()
        ? 'No se puede preguntar por un día que todavía no ha pasado: no hay ninguna foto tomada en el futuro.'
        : '',
}))

type Field = keyof typeof errors.value

const ORDER: Field[] = ['companyId', 'day']

const summaryItems = computed(() =>
  toSummaryItems(
    Object.fromEntries(ORDER.map((field) => [field, touched[field] ? errors.value[field] : ''])),
    { companyId: companyFieldId, day: dayFieldId },
    ORDER,
  ),
)

function err(field: Field): string {
  return touched[field] ? errors.value[field] : ''
}

/** Las columnas salen de la propia foto. Ver la cabecera del módulo. */
const headers = computed(() => reading.value?.keys ?? [])

/** <b>Recarga siempre</b>: esta pantalla existe para resolver una disputa concreta. */
async function onSubmit() {
  touched.companyId = true
  touched.day = true
  if (ORDER.some((field) => errors.value[field])) {
    void summary.value?.focus()
    return
  }
  await load(Number(form.companyId), form.day)
  resultRegion.value?.focus()
}

onUnmounted(reset)
</script>

<template>
  <section class="ds-stack ds-stack--18" aria-labelledby="fotos-title">
    <div class="ds-block-head">
      <h2 id="fotos-title" class="ds-title">Fotos de permisos</h2>
    </div>

    <p class="ds-meta intro">
      Qué podía usar una empresa en una fecha concreta, según el cálculo que quedó congelado
      entonces. No es lo que puede usar hoy: los permisos se recalculan, y para saber qué veía el
      martes hay que mirar el cálculo del martes.
    </p>

    <form class="ds-card ds-stack ds-stack--14" @submit.prevent="onSubmit">
      <ErrorSummary ref="summary" :items="summaryItems" />

      <div class="ds-wrap-row">
        <AppInput
          :id="companyFieldId"
          v-model="form.companyId"
          label="Empresa"
          type="number"
          inputmode="numeric"
          required
          hint="Su número."
          :error="err('companyId')"
          @blur="touched.companyId = true"
        />

        <AppInput
          :id="dayFieldId"
          v-model="form.day"
          label="Día"
          type="date"
          required
          hint="Se consulta el día entero, hasta su último instante en hora de Colombia."
          :error="err('day')"
          @blur="touched.day = true"
        />
      </div>

      <div class="ds-actions ds-actions--start">
        <button type="submit" class="ds-btn ds-btn--primary" :disabled="loading">
          <component :is="ICONS.SEARCH" :size="15" />
          {{ loading ? 'Consultando…' : 'Consultar la foto' }}
        </button>
      </div>
    </form>

    <p class="ds-sr-only" role="status">{{ loading ? 'Consultando la foto de permisos…' : '' }}</p>

    <div ref="resultRegion" tabindex="-1" class="region ds-stack ds-stack--14">
      <!-- 1 · Fallo del servidor. Va antes que el vacío: un 500 no puede
           disfrazarse de «esta empresa nunca tuvo cálculo» (R05). -->
      <template v-if="error">
        <div class="ds-banner ds-banner--error" role="alert">
          <component :is="ICONS.ERROR" :size="16" class="ds-banner-icon" />
          <span class="ds-flex-fill">{{ error }}</span>
        </div>
        <p v-if="errorTraceId" class="ds-meta">Traza: {{ errorTraceId }}</p>
      </template>

      <!-- 2 · No hay foto, y eso NO es un error: es un dato fuerte. -->
      <AppEmptyState
        v-else-if="missing && !loading"
        title="No hay ninguna foto de esa empresa en o antes de ese día"
        description="Significa que a esa empresa nunca se le habían recalculado los permisos hasta esa fecha, no que la consulta fallara. Si la clínica dice que ese día veía algo, ese algo no salía de un cálculo guardado."
      />

      <!-- 3 · La foto. -->
      <template v-else-if="snapshot">
        <div class="ds-card ds-stack ds-stack--10">
          <h3 class="ds-subtitle">
            Empresa <CompanyRef :company-id="snapshot.companyId" />, calculada el
            {{ formatDateTime(snapshot.recalculatedAt) }}
          </h3>

          <!-- La diferencia entre el día pedido y el día del cálculo. Sin esto,
               el operador lee la fecha y cree que se equivocó de día. -->
          <div v-if="asOfNotice" class="ds-banner ds-banner--info" role="status">
            <component :is="ICONS.INFO" :size="16" class="ds-banner-icon" />
            <span class="ds-flex-fill">{{ asOfNotice }}</span>
          </div>

          <dl class="hechos">
            <div>
              <dt>Por qué se recalculó</dt>
              <dd>{{ SNAPSHOT_TRIGGER_LABEL[snapshot.triggerReason] }}</dd>
            </div>
            <div>
              <dt>Quién lo hizo</dt>
              <dd>{{ snapshotActor(snapshot) }}</dd>
            </div>
            <div v-if="snapshot.amendmentId !== null">
              <dt>Enmienda que lo disparó</dt>
              <dd>#{{ snapshot.amendmentId }}</dd>
            </div>
            <div>
              <dt>Formato de la foto</dt>
              <dd>versión {{ snapshot.payloadFormatVersion }}</dd>
            </div>
          </dl>
        </div>

        <!-- 3a · El contenido, con las columnas que la propia foto trae. -->
        <template v-if="reading && reading.parsed && reading.entries.length > 0">
          <h3 class="ds-subtitle">Lo que la empresa veía ese día</h3>
          <AppTable caption="Foto de permisos" :headers="headers" :empty="false">
            <tr v-for="(entry, index) in reading.entries" :key="index" class="ds-row-hover">
              <td v-for="key in headers" :key="key">{{ snapshotCell(entry[key]) }}</td>
            </tr>
          </AppTable>
        </template>

        <!-- 3b · El JSON no se pudo leer. Es un hallazgo, no un vacío. -->
        <div
          v-else-if="reading && !reading.parsed"
          class="ds-banner ds-banner--warning"
          role="alert"
        >
          <component :is="ICONS.WARNING" :size="16" class="ds-banner-icon" />
          <span class="ds-flex-fill">
            La foto existe pero su contenido no es JSON legible. Se muestra tal cual llegó: es lo
            único que con seguridad es cierto.
          </span>
        </div>

        <!-- 3c · El texto crudo, siempre. Es la prueba, y la tabla de arriba es
             solo una lectura de ella. -->
        <details class="ds-card">
          <summary class="ds-subtitle">Ver el contenido tal cual quedó guardado</summary>
          <pre class="crudo">{{ reading?.pretty }}</pre>
        </details>
      </template>
    </div>
  </section>
</template>

<style scoped>
.intro {
  max-width: 70ch;
}

/* La región que recibe el foco al llegar la respuesta. Sin caja, el
   `tabindex="-1"` no tendría anillo de foco visible. */
.region {
  display: block;
}

.hechos {
  display: grid;
  gap: var(--space-10);
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}

.hechos dt {
  color: var(--text-muted);
  font-size: var(--text-caption);
}

.hechos dd {
  margin: 0;
}

/* El JSON crudo puede ser largo y ancho: se desborda dentro de su propia caja,
   nunca empujando la página (regla de contenido ancho). */
.crudo {
  overflow-x: auto;
  margin: var(--space-10) 0 0;
  padding: var(--space-10);
  border-radius: var(--radius-sm);
  background: var(--surface-sunken);
  font-size: var(--text-caption);
  white-space: pre-wrap;

  /* `anywhere` y no el `break-word` de `word-break`, que está obsoleto y lo
     rechaza `declaration-property-value-keyword-no-deprecated`. */
  overflow-wrap: anywhere;
}
</style>
