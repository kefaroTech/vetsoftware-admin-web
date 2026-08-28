<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useCompanies } from '../../composables/useCompanies'
import { useCompanyRecord } from '../../composables/useCompanyRecord'
import { useUnsavedChangesGuard } from '@/composables/useUnsavedChangesGuard'
import CompanyForm from '../../components/CompanyForm.vue'
import type { CreateCompanyRequest } from '../../types/companies.types'

/**
 * <b>I3 · `/empresas/:id/datos` — el formulario de siempre, bajo el armazón.</b>
 *
 * <p>Es la mudanza de `CompanyDetailView.vue`, que era la vista suelta de
 * `/empresas/:id`. El formulario (`CompanyForm.vue`) no se ha tocado: la validación
 * por campo, el mapa `touched`, el `defineExpose({ validate })` y el guardián de
 * cambios sin guardar son los mismos. Lo que cambia es <b>de dónde salen los datos
 * y a dónde van</b>, y las tres diferencias son consecuencia de la mudanza, no un
 * rediseño:
 *
 * <ol>
 *   <li><b>Ya no carga la empresa.</b> La carga el armazón, una vez, y no monta
 *       esta vista hasta tenerla. El `onMounted(fetchById)` de antes se ha ido:
 *       mantenerlo pediría `GET /companies/{id}` dos veces al abrir la pestaña.</li>
 *   <li><b>El aviso de empresa deshabilitada se ha ido de aquí</b> — al armazón.
 *       Sigue siendo cierto en las otras nueve sub-vistas, así que dejarlo solo en
 *       ésta lo escondía justo donde se necesita.</li>
 *   <li><b>Guardar ya no manda a la lista de empresas.</b> Antes tenía sentido:
 *       `/empresas/:id` <i>era</i> el formulario, así que terminar de editar era
 *       terminar con la pantalla. Ahora es una pestaña de nueve dentro de un
 *       expediente, y expulsar al operador del expediente que está revisando —para
 *       que vuelva a buscarlo en la lista— es peor que el problema que resolvía. Se
 *       queda, y la cabecera se repinta con el nombre nuevo.</li>
 * </ol>
 */
const router = useRouter()
const { update } = useCompanies()
const { companyId, company, setCompany } = useCompanyRecord()
const saving = ref(false)
const formRef = ref<InstanceType<typeof CompanyForm> | null>(null)

// FORM-08: esto es una ruta completa; pulsar el sidebar —o saltar a otra pestaña
// del expediente— con la edición a medias se llevaba lo escrito.
useUnsavedChangesGuard(() => formRef.value?.isDirty() ?? false)

async function handleUpdate(data: CreateCompanyRequest) {
  if (saving.value || companyId.value == null) return
  saving.value = true
  try {
    const result = await update(companyId.value, data)
    // La cabecera del armazón lleva el nombre: sin esto seguiría enseñando el
    // anterior hasta que alguien recargara la página.
    setCompany(result)
  } catch {
    // El composable ya avisó del fallo; no navegamos para no perder lo editado.
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <section v-if="company" class="ds-stack ds-stack--14">
    <h2 class="ds-title">Datos</h2>

    <div class="ds-card ds-detail-card">
      <CompanyForm
        ref="formRef"
        :initial="company"
        :saving="saving"
        @submit="handleUpdate"
        @cancel="router.back()"
      />
    </div>
  </section>
</template>

<style scoped>
/* El ancho lo fijaba `max-width` de v-card; con la primitiva vive aquí.
   No sube a `primitives.css` en este cambio: esa hoja es gemela TR-02 y solo
   `front-parity` puede escribirla. El prefijo `ds-` de esta clase induce a
   error mientras tanto — está registrado como issue. */
.ds-detail-card {
  max-width: 640px;
}
</style>
