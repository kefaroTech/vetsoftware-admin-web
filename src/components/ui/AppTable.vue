<script setup lang="ts">
import { ICONS } from '@/constants/icons'
import { useToast } from '@/composables/useToast'
import AppEmptyState from '@/components/feedback/AppEmptyState.vue'

/**
 * Tabla de las 17 vistas de listado de la consola.
 *
 * DS-02: la geometría dejó de reescribirse aquí. `.tabla` declaraba a mano lo
 * mismo que `.ds-table` (`primitives.css`, 88 usos en el front del tenant y 0
 * en esta consola) y el gate de duplicados no lo veía porque las dos copias no
 * eran idénticas byte a byte tras interpolar los tokens. El hover de fila pasa
 * a `.ds-row-hover`.
 *
 * EST-06: la tabla ya sabe decir tres cosas distintas donde antes decía una.
 * Hasta ahora pintaba «Sin resultados» en cuanto `empty` era cierto, así que un
 * catálogo recién creado, una carga en vuelo y un 500 compartían el mismo
 * mensaje sin salida. El orden de las ramas —error ANTES que vacío— es el
 * criterio que `ListBody.vue` del tenant dejó escrito: si se invierten, un 500
 * vuelve a disfrazarse de «no hay registros».
 *
 * La rama 3 (`loading` con filas ya pintadas) NO existe en `ListBody`, que en
 * un refresco borra la tabla: refrescar ocho filas no puede destruir el
 * contexto que el usuario está mirando.
 */
const props = withDefaults(
  defineProps<{
    headers: string[]
    /** Sin filas que pintar. Va SIEMPRE acompañada de `loading` para que la
     *  primera carga muestre esqueleto y no el estado vacío. */
    empty?: boolean
    loading?: boolean
    error?: string | null
    traceId?: string | null
    /** Filas del esqueleto durante la primera carga. */
    skeletonRows?: number
  }>(),
  { skeletonRows: 5 },
)

defineEmits<{ retry: [] }>()

const { success } = useToast()

async function copyTrace() {
  if (!props.traceId) return
  await navigator.clipboard.writeText(props.traceId)
  success('Identificador de traza copiado')
}
</script>

<template>
  <div class="ds-card ds-card--flat tabla-caja">
    <!-- Anuncio de cambio de estado para lector de pantalla (WCAG 2.2 §4.1.3).
         Va FUERA de la tabla y en `polite`: una carga informa, no interrumpe.
         No dice el texto del error a propósito — ese ya lo anuncia el banner de
         la rama 1 con `role="alert"`, y repetirlo sería anunciarlo dos veces. -->
    <p class="ds-sr-only" role="status">
      {{ error ? 'Error al cargar la tabla' : loading ? 'Cargando…' : '' }}
    </p>

    <div class="ds-table-scroll tabla-scroll">
      <table class="ds-table" :aria-busy="loading || undefined">
        <thead>
          <tr>
            <th v-for="header in headers" :key="header">{{ header }}</th>
          </tr>
        </thead>

        <!-- 1 · Fallo del servidor. -->
        <tbody v-if="error">
          <tr>
            <td :colspan="headers.length">
              <div class="ds-banner ds-banner--error ds-banner--flush" role="alert">
                <component :is="ICONS.ERROR" :size="16" class="ds-banner-icon" />
                <span class="ds-flex-fill">{{ error }}</span>
                <button
                  type="button"
                  class="ds-btn ds-btn--ghost ds-btn--sm"
                  @click="$emit('retry')"
                >
                  <component :is="ICONS.RETRY" :size="14" />
                  Reintentar
                </button>
              </div>
              <p v-if="traceId" class="traza ds-meta">
                <span>Traza: {{ traceId }}</span>
                <button type="button" class="ds-btn ds-btn--plain ds-btn--sm" @click="copyTrace">
                  <component :is="ICONS.COPY" :size="13" />
                  Copiar
                </button>
              </p>
            </td>
          </tr>
        </tbody>

        <!-- 2 · Primera carga: no hay nada que conservar, se pinta esqueleto. -->
        <tbody v-else-if="loading && empty" aria-hidden="true">
          <tr v-for="fila in skeletonRows" :key="fila">
            <td v-for="header in headers" :key="header">
              <span class="ds-skeleton ds-skeleton--text celda-esqueleto" />
            </td>
          </tr>
        </tbody>

        <!-- 4 · Vacío de verdad: ni error ni carga. -->
        <tbody v-else-if="empty">
          <tr>
            <td :colspan="headers.length" class="celda-vacia">
              <!--
                El contenido por defecto es el de la rama 4 (catálogo vacío de
                verdad), NO el de la rama 3 (la búsqueda no casó): son estados
                distintos y confundirlos es el defecto que este orden de ramas
                existe para evitar. Toda vista con buscador declara su propio
                slot con los dos textos; este es solo el suelo honesto para una
                tabla sin búsqueda.
              -->
              <slot name="empty">
                <AppEmptyState title="Aún no hay registros" />
              </slot>
            </td>
          </tr>
        </tbody>

        <!-- 3 y 5 · Filas. En un refresco (`loading` con datos ya pintados) se
             conservan, y el `aria-busy` del `<table>` es quien lo anuncia. -->
        <tbody v-else>
          <slot />
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
/* La caja ya NO recorta: un `overflow:hidden` aquí dejaba las últimas columnas
   inalcanzables cuando la tabla es más ancha que el contenedor (WCAG 1.4.10
   Reflow). Quien recorta ahora es el envoltorio `.ds-table-scroll`, que además
   deja desplazarla en horizontal. */
.tabla-caja {
  padding: 0;
}

/* `.ds-table-scroll` aporta el `overflow-x:auto`; eso ya establece un contexto
   de recorte, así que basta con heredar el radio de la caja para conservar las
   esquinas redondeadas que antes recortaba el `overflow:hidden`. */
.tabla-scroll {
  border-radius: inherit;
}

.celda-esqueleto {
  display: block;
  width: 70%;
}

.celda-vacia {
  padding: 0;
}

.traza {
  display: flex;
  align-items: center;
  gap: var(--space-8);
  margin: var(--space-8) 0 0;
}
</style>
