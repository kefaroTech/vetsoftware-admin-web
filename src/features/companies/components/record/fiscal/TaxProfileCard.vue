<script setup lang="ts">
import { computed } from 'vue'
import { formatDate } from '@/composables/format'
import MissingDataNote from '../MissingDataNote.vue'
import CardState from '../summary/CardState.vue'
import FiscalFact from './FiscalFact.vue'
import {
  COMPANY_DOCUMENT_TYPE_LABEL,
  FISCAL_EMAIL_OWNER_GAP,
  FISCAL_MISSING_DATA_TITLE,
  NATURAL_PERSON_NAME_GAP,
  NO_TAX_PROFILE_TEXT,
  TAX_PROFILE_HISTORY_GAP,
  TAX_REGIME_LABEL,
  formatCompanyDocument,
  isNaturalPerson,
} from '../../../composables/companyFiscalText'
import type { CompanyTaxProfileResponse } from '../../../types/company-fiscal.types'

/**
 * <b>El perfil de facturación de la clínica</b> — el bloque principal de §I7.
 *
 * <p><b>Es de solo lectura, y eso es la decisión de diseño, no una carencia que
 * alguien vaya a completar luego.</b> Un perfil fiscal no se corrige: se cierra el
 * vigente y se abre otro, porque una factura emitida hace un año tiene que seguir
 * diciendo a quién se le emitió. El contrato de hoy no sabe hacer ninguna de las
 * dos cosas —el `PUT` reescribe la fila en sitio y el `POST` responde 409 cuando ya
 * hay perfil—, así que poner aquí un botón «Editar» sería ofrecer exactamente lo
 * que la regla prohíbe, con la agravante de que <b>funcionaría</b>: el operador no
 * vería ningún error y la factura del año pasado cambiaría de destinatario. El
 * hueco lo dice con palabras (`TAX_PROFILE_HISTORY_GAP`).
 *
 * <p><b>Los dos huecos condicionales.</b> El de apellidos y nombres solo aparece
 * cuando el tipo de documento es de persona natural, que es cuando duele;
 * pintarlo siempre lo convertiría en decoración que nadie lee. El del titular del
 * correo aparece siempre, pegado al correo, porque el correo de facturación casi
 * nunca es el del dueño de la clínica.
 *
 * <p>El documento va con `.ds-num`: un NIT se lee dígito a dígito por teléfono y se
 * copia en un portal que lo rechaza si sobra un espacio.
 */
const props = defineProps<{
  profile: CompanyTaxProfileResponse | null
  hasNoProfile: boolean
  loading: boolean
  error: string | null
}>()

const documento = computed(() => (props.profile ? formatCompanyDocument(props.profile) : ''))

/** Solo cuando el titular es una persona natural. Ver `NATURAL_PERSON_NAME_GAP`. */
const esPersonaNatural = computed(
  () => props.profile !== null && isNaturalPerson(props.profile.companyDocumentType),
)

/**
 * El rótulo del nombre cambia con el tipo de titular. `legalName` es un solo campo
 * para los dos casos, y llamarlo «Razón social» delante de una cédula es rotular
 * mal un dato que ya viene incompleto.
 */
const rotuloNombre = computed(() =>
  esPersonaNatural.value ? 'Nombre del titular' : 'Razón social',
)
</script>

<template>
  <section class="ds-card ds-stack ds-stack--14">
    <h3 class="ds-item-label ds-item-label--lg titulo">Perfil de facturación</h3>

    <CardState :loading="loading" :error="error">
      <p v-if="hasNoProfile" class="parrafo">{{ NO_TAX_PROFILE_TEXT }}</p>

      <template v-else-if="profile">
        <dl class="ds-detail-grid lista">
          <FiscalFact :label="COMPANY_DOCUMENT_TYPE_LABEL[profile.companyDocumentType]">
            <span class="ds-text-strong ds-num">{{ documento }}</span>
          </FiscalFact>

          <FiscalFact label="Régimen">{{ TAX_REGIME_LABEL[profile.taxRegime] }}</FiscalFact>

          <FiscalFact :label="rotuloNombre" wide>
            <span class="ds-text-strong">{{ profile.legalName }}</span>
          </FiscalFact>

          <!-- El nombre comercial es opcional en el contrato: sin él no se pinta la
               línea, en vez de un rótulo seguido de un guion. -->
          <FiscalFact v-if="profile.commercialName" label="Nombre comercial" wide>
            {{ profile.commercialName }}
          </FiscalFact>

          <FiscalFact v-if="profile.economicActivity" label="Actividad económica" wide>
            <span class="ds-num">{{ profile.economicActivity.code }}</span>
            · {{ profile.economicActivity.name }}
          </FiscalFact>

          <FiscalFact label="Correo de facturación" wide>{{ profile.fiscalEmail }}</FiscalFact>

          <FiscalFact label="Responsabilidades fiscales" wide>
            <!-- Una lista vacía es un hecho, no un hueco: el contrato declara
                 `responsibilities` como requerido, así que vacía significa que la
                 empresa no declara ninguna. -->
            <span v-if="profile.responsibilities.length === 0">
              No declara ninguna responsabilidad fiscal.
            </span>
            <span v-else class="ds-flex-row etiquetas">
              <span
                v-for="codigo in profile.responsibilities"
                :key="codigo"
                class="ds-pill ds-tone--neutral-soft ds-num"
              >
                {{ codigo }}
              </span>
            </span>
          </FiscalFact>

          <FiscalFact label="Registrado el" wide>
            <span class="ds-meta">{{ formatDate(profile.createdDate) }}</span>
          </FiscalFact>
        </dl>

        <MissingDataNote
          :title="FISCAL_MISSING_DATA_TITLE"
          :what="FISCAL_EMAIL_OWNER_GAP.what"
          :why="FISCAL_EMAIL_OWNER_GAP.why"
          :blocked-by="FISCAL_EMAIL_OWNER_GAP.blockedBy"
        />

        <MissingDataNote
          v-if="esPersonaNatural"
          :title="FISCAL_MISSING_DATA_TITLE"
          :what="NATURAL_PERSON_NAME_GAP.what"
          :why="NATURAL_PERSON_NAME_GAP.why"
          :blocked-by="NATURAL_PERSON_NAME_GAP.blockedBy"
        />
      </template>

      <!-- La serie del perfil falta haya perfil o no, así que va fuera de las dos
           ramas: es lo que explica por qué esta pantalla no ofrece «editar». -->
      <MissingDataNote
        :title="FISCAL_MISSING_DATA_TITLE"
        :what="TAX_PROFILE_HISTORY_GAP.what"
        :why="TAX_PROFILE_HISTORY_GAP.why"
        :trap="TAX_PROFILE_HISTORY_GAP.trap"
        :blocked-by="TAX_PROFILE_HISTORY_GAP.blockedBy"
      />
    </CardState>
  </section>
</template>

<style scoped>
.titulo {
  margin: 0;
}

.parrafo {
  margin: 0;
}

/* `.ds-detail-grid` pone las dos columnas y los huecos; aquí solo se le quita al
   `<dl>` el margen del navegador, que no existe como primitiva. */
.lista {
  margin: 0;
}

.etiquetas {
  flex-wrap: wrap;
}
</style>
