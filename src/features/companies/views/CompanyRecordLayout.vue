<script setup lang="ts">
import { computed, onUnmounted, watch } from 'vue'
import { RouterView } from 'vue-router'
import AppLayout from '@/components/layout/AppLayout.vue'
import RecordSkeleton from '@/components/ui/RecordSkeleton.vue'
import { ICONS } from '@/constants/icons'
import { useCompanyRecord } from '../composables/useCompanyRecord'
import CompanyRecordHeader from '../components/record/CompanyRecordHeader.vue'
import CompanyRecordNav from '../components/record/CompanyRecordNav.vue'

/**
 * <b>El armazón del expediente de empresa</b> (§I2–I11, lote W5-A). Es común a las
 * diez sub-vistas y es el único que carga la empresa.
 *
 * <p>`/empresas/:id` era hasta ahora una vista suelta: el formulario de edición y
 * nada más. Soporte necesita otra cosa —quién es esta clínica, qué tiene
 * contratado, si debe, qué puede usar— y eso no cabe en un formulario. El
 * formulario <b>no se toca</b>: se muda a `/empresas/:id/datos` y pasa a ser una
 * de las diez.
 *
 * <p><b>Dos cosas viven aquí y no en las sub-vistas, a propósito:</b>
 *
 * <ol>
 *   <li>La <b>cabecera con la identidad de la empresa</b> y el aviso de empresa
 *       deshabilitada. Las sub-vistas leen y escriben mandando la cabecera
 *       `X-Company-Id`, que es invisible en la petición: si lo que decide a quién
 *       se le cambian los datos no se ve, tiene que ser visible y permanente en la
 *       pantalla.</li>
 *   <li>La <b>carga de la empresa</b>. Una sola llamada a `GET /companies/{id}`
 *       por expediente abierto, no por sub-vista.</li>
 * </ol>
 *
 * <p>El `RouterView` no se monta hasta que la empresa ha cargado. Es lo que
 * permite a los lotes que cuelgan de este dar por hecho que `companyId` y
 * `company` ya están puestos cuando su sub-vista se monta, sin repetir la carga ni
 * defenderse de un `null` que no puede darse.
 *
 * <p><b>Recarga siempre al abrir</b>, y también al navegar de una empresa a otra
 * sin desmontar la vista: el `watch` mira el parámetro de la ruta.
 */
const props = defineProps<{ id: string }>()

const { company, loading, error, errorTraceId, openRecord, closeRecord } = useCompanyRecord()

// La ruta declara el parámetro como `(\d+)`, así que una URL con letras no llega
// hasta aquí: no hay `NaN` que defender.
const companyIdNumber = computed(() => Number(props.id))

watch(companyIdNumber, (next) => void openRecord(next), { immediate: true })

/** Nada de una empresa ajena esperando en el store a que se abra la siguiente. */
onUnmounted(closeRecord)
</script>

<template>
  <AppLayout>
    <div class="ds-stack ds-stack--18">
      <p class="ds-sr-only" role="status">{{ loading ? 'Cargando la empresa…' : '' }}</p>

      <div v-if="error" class="ds-banner ds-banner--error" role="alert">
        <component :is="ICONS.ERROR" :size="16" class="ds-banner-icon" />
        <span class="ds-flex-fill">{{ error }}</span>
        <button
          type="button"
          class="ds-btn ds-btn--ghost ds-btn--sm"
          @click="openRecord(companyIdNumber)"
        >
          <component :is="ICONS.RETRY" :size="14" />
          Reintentar
        </button>
      </div>
      <p v-if="error && errorTraceId" class="ds-meta">Traza: {{ errorTraceId }}</p>

      <RecordSkeleton v-else-if="loading" />

      <template v-else-if="company">
        <CompanyRecordHeader :company="company" />

        <!--
          Estado presente, no consecuencia de una acción: banner, no toast (un
          toast se va y esto sigue siendo cierto). `role="status"` y no `alert`:
          no interrumpe a quien está leyendo la ficha. Vive en el armazón porque
          sigue siendo cierto en las diez sub-vistas, no solo en el formulario.
        -->
        <p v-if="!company.enabled" class="ds-banner ds-banner--warning" role="status">
          <component :is="ICONS.WARNING" :size="16" class="ds-banner-icon" />
          <span>
            <strong>Esta empresa está deshabilitada.</strong> Sus empleados no pueden entrar.
          </span>
        </p>

        <CompanyRecordNav :company-id="companyIdNumber" />

        <RouterView />
      </template>
    </div>
  </AppLayout>
</template>
