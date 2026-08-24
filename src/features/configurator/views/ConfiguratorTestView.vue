<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ErrorSummary, { toSummaryItems } from '@/components/feedback/ErrorSummary.vue'
import PlatformSetupChecklist from '@/components/feedback/PlatformSetupChecklist.vue'
import { ICONS } from '@/constants/icons'
import QuestionnaireRunner from '../components/QuestionnaireRunner.vue'
import { useConfiguratorTester } from '../composables/useConfiguratorTester'
import { useConfiguratorStore } from '../stores/configurator.store'
import { catalogItemLabel } from '../composables/effect-sentence'

/**
 * Probarlo — `/configurador/probar`.
 *
 * <p>Renderiza `GET /configurator/questionnaire` exactamente como lo ve el
 * prospecto y manda `POST /configurator/resolve` para enseñar el carrito que
 * saldría.
 *
 * <p><b>Cuándo dispara, que es la decisión de esta pantalla.</b>
 * `/configurator/resolve` es anónimo y está limitado a 60 peticiones por minuto
 * y por IP; ese cupo lo comparte con los prospectos reales que estén cotizando
 * desde la misma salida a internet. Así que no se resuelve al marcar una
 * opción: se resuelve al pulsar «Ver el resultado». Y antes de gastar una
 * petición se comprueba en el cliente lo que el servidor va a comprobar —que no
 * falte ninguna obligatoria de una rama activa—, porque una petición que se
 * sabe rechazada es cupo tirado.
 *
 * <p>Al aparecer el resultado el foco va a su `&lt;h2 tabindex="-1"&gt;`: es el
 * paso nuevo del flujo, y dejar el foco en un botón que puede desaparecer o
 * mandarlo al principio del documento son las dos formas de perderlo (§5.1).
 */
const store = useConfiguratorStore()
const {
  questionnaire,
  answers,
  selection,
  loading,
  error,
  errorTraceId,
  resolving,
  visible,
  missing,
  hasAnswers,
  loadQuestionnaire,
  loadCatalogItems,
  toggleOption,
  updateNumber,
  clearAnswers,
  loadReferenceScenario,
  resolveNow,
} = useConfiguratorTester()

const showErrors = ref(false)
const runnerRef = ref<InstanceType<typeof QuestionnaireRunner> | null>(null)
const resultHeading = ref<HTMLElement | null>(null)
const summaryRef = ref<InstanceType<typeof ErrorSummary> | null>(null)

const summaryItems = computed(() => {
  if (!showErrors.value) return []
  const runner = runnerRef.value
  const ids: Record<string, string> = {}
  const texts: Record<string, string> = {}
  const order: string[] = []
  for (const item of missing.value) {
    const question = questionnaire.value.find((q) => q.id === item.questionId)
    if (!question || !runner) continue
    const key = String(item.questionId)
    ids[key] = runner.controlId(question)
    texts[key] = item.message
    order.push(key)
  }
  return toSummaryItems(texts, ids, order)
})

const cart = computed(() =>
  (selection.value ?? []).map((item) => ({
    ...item,
    name: catalogItemLabel(item.catalogItemId, store.catalogItemById),
  })),
)

async function onResolve() {
  showErrors.value = true
  const done = await resolveNow()
  await Promise.resolve()
  if (done) resultHeading.value?.focus()
  else summaryRef.value?.focus()
}

function onScenario() {
  showErrors.value = false
  loadReferenceScenario()
}

function onClear() {
  showErrors.value = false
  clearAnswers()
}

/**
 * Recarga siempre al abrir la pantalla (regla del repositorio): el cuestionario
 * es un dato vivo y otro operador puede haberlo cambiado hace un segundo.
 */
onMounted(() => {
  void loadQuestionnaire()
  void loadCatalogItems()
})
</script>

<template>
  <div class="ds-stack ds-stack--18">
    <section class="ds-stack ds-stack--14" aria-labelledby="probar-titulo">
      <div class="ds-block-head">
        <div class="ds-stack ds-stack--8">
          <h2 id="probar-titulo" class="ds-title">Probarlo</h2>
          <p class="ds-meta">
            El cuestionario tal y como lo ve un prospecto. Responde y pulsa «Ver el resultado» para
            saber qué artículos saldrían en su cotización.
          </p>
        </div>
        <button
          type="button"
          class="ds-btn ds-btn--ghost"
          :disabled="loading"
          @click="loadQuestionnaire"
        >
          <component :is="ICONS.RETRY" :size="15" />
          Actualizar
        </button>
      </div>

      <div v-if="error" class="ds-banner ds-banner--error" role="alert">
        <component :is="ICONS.ERROR" :size="16" class="ds-banner-icon" />
        <span class="ds-flex-fill">{{ error }}</span>
        <button type="button" class="ds-btn ds-btn--ghost ds-btn--sm" @click="loadQuestionnaire">
          <component :is="ICONS.RETRY" :size="14" />
          Reintentar
        </button>
      </div>
      <p v-if="error && errorTraceId" class="ds-meta">Traza: {{ errorTraceId }}</p>

      <p v-if="loading && questionnaire.length === 0" class="ds-meta">Cargando el cuestionario…</p>

      <!--
        Vacío de arranque, no «sin resultados»: la plataforma se despliega sin
        catálogo sembrado y el cuestionario es el paso 7 de la puesta en marcha
        (§3.7). Un «Aún no hay registros» aquí se lee como «esto está roto».
      -->
      <PlatformSetupChecklist
        v-else-if="!error && questionnaire.length === 0"
        variant="compact"
        purpose="probar el asistente"
      />

      <template v-else>
        <ErrorSummary ref="summaryRef" :items="summaryItems" />

        <div class="ds-wrap-row">
          <button type="button" class="ds-btn ds-btn--ghost ds-btn--sm" @click="onScenario">
            <component :is="ICONS.PAW" :size="14" />
            Cargar «Spa Ana Pet»
          </button>
          <button
            type="button"
            class="ds-btn ds-btn--ghost ds-btn--sm"
            :disabled="!hasAnswers"
            @click="onClear"
          >
            <component :is="ICONS.CLOSE" :size="14" />
            Vaciar respuestas
          </button>
        </div>

        <p class="ds-hint">
          «Spa Ana Pet» es el escenario de referencia: la primera respuesta de cada pregunta y un 1
          en cada número. Es fijo, así que dos pruebas separadas en el tiempo son comparables — y es
          el mismo con el que se compara cada cambio en «Editar el cuestionario».
        </p>

        <QuestionnaireRunner
          ref="runnerRef"
          :questions="visible"
          :answers="answers"
          :missing="missing"
          :show-errors="showErrors"
          @toggle="toggleOption"
          @number="updateNumber"
        />

        <div class="ds-wrap-row">
          <button
            type="button"
            class="ds-btn ds-btn--primary"
            :disabled="resolving"
            @click="onResolve"
          >
            <component :is="ICONS.CHECK" :size="15" />
            {{ resolving ? 'Resolviendo…' : 'Ver el resultado' }}
          </button>
          <p class="ds-meta">
            Cada pulsación es una petición al servidor, que admite 60 por minuto y por IP —
            compartidas con los prospectos que estén cotizando ahora mismo.
          </p>
        </div>
      </template>
    </section>

    <section
      v-if="selection"
      class="ds-card ds-stack ds-stack--10"
      aria-labelledby="resultado-titulo"
    >
      <h2 id="resultado-titulo" ref="resultHeading" class="ds-title" tabindex="-1">
        Lo que saldría cotizado
      </h2>
      <p class="ds-meta">
        {{ selection.length === 1 ? '1 artículo' : `${selection.length} artículos` }} con estas
        respuestas. Los precios no salen de aquí: los pone la tarifa al cotizar.
      </p>

      <p v-if="selection.length === 0" class="ds-empty ds-empty--boxed">
        Estas respuestas no meten ningún artículo en el carrito. Si esperabas alguno, revisa los
        efectos de las respuestas que marcaste en «Editar el cuestionario».
      </p>

      <div v-else class="ds-table-scroll">
        <table class="ds-table ds-table--dense">
          <thead>
            <tr>
              <th scope="col">Artículo</th>
              <th scope="col" class="ds-num">Cantidad</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in cart" :key="item.catalogItemId">
              <td>{{ item.name }}</td>
              <td class="ds-num">{{ item.quantity }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
