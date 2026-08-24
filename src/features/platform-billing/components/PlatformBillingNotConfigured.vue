<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ICONS } from '@/constants/icons'
import { useToast } from '@/composables/useToast'

/**
 * La fila única de `platform_billing_config` no existe.
 *
 * ── Por qué esto NO se pinta con `PlatformSetupChecklist` ────────────────────
 *
 * La lista de puesta en marcha (§3.7, tarea W1-B) es la respuesta a «la lista
 * está vacía porque todavía no se ha sembrado el catálogo», y sus siete pasos
 * comparten una propiedad: **el operador los puede completar, y el rótulo de cada
 * uno enlaza al sitio donde se hacen**. Este estado no cumple ninguna de las dos
 * condiciones:
 *
 * 1. **No es un vacío, es un error.** El servidor responde 503 con un `code`
 *    propio. La regla del repositorio —el orden de ramas de `AppTable`, R05— es
 *    que el error se pinta ANTES que el vacío y nunca disfrazado de vacío. Es la
 *    misma razón por la que `PlatformSetupStepState` tiene un tercer estado
 *    `unknown` en vez de contar cualquier fallo como «pendiente».
 * 2. **Su paso enlaza aquí.** El paso 5 de la lista apunta a
 *    `/configuracion/facturacion`, que es esta pantalla. Pintar aquí la lista
 *    mandaría al operador a donde ya está. Y peor: la lista rotula ese paso como
 *    «Pendiente», que promete una acción que esta pantalla no tiene —no existe
 *    `POST /platform-billing-config`, y el propio controller explica que la fila
 *    la siembra el changeset que crea la tabla, no un alta desde la interfaz—.
 *
 * ── Lo que sí se hereda de §3.7: las palabras son las del servidor ───────────
 *
 * GOV.UK, *Validation pattern*: el mensaje del resumen y el del sitio donde se
 * arregla tienen que ser **el mismo texto**. Aquí el sitio donde se arregla es la
 * base de datos del entorno y quien enumera el remedio es el servidor, así que su
 * `detail` se pinta **íntegro y sin reescribir**, incluido el `INSERT`. Resumirlo
 * o sustituirlo por un «Servicio no disponible» tiraría lo único que resuelve el
 * problema y dejaría al operador creyendo que son dos problemas distintos.
 *
 * ── Accesibilidad ───────────────────────────────────────────────────────────
 *
 * `role="alert"` porque es un fallo que aparece tras una acción (§5.3, tabla).
 * El `<h2>` lleva `tabindex="-1"` y recibe el foco al montar: el formulario que
 * el operador venía a rellenar ya no está, así que dejar el foco donde estaba lo
 * abandonaría en un contenedor que se acaba de vaciar (§5.1). Ni un estado se
 * comunica solo por color: el icono va `aria-hidden` y el texto lo dice todo.
 */
const props = defineProps<{
  /** `detail` del `ProblemDetail`, tal cual. No se recorta ni se reformula. */
  detail: string
  traceId: string | null
  retrying?: boolean
}>()

defineEmits<{ retry: [] }>()

const { success } = useToast()
const heading = ref<HTMLElement | null>(null)

onMounted(() => heading.value?.focus())

async function copy(text: string, label: string) {
  await navigator.clipboard.writeText(text)
  success(`${label} copiado`)
}
</script>

<template>
  <section class="ds-card ds-stack ds-stack--16" role="alert">
    <div class="ds-stack ds-stack--8">
      <h2 ref="heading" tabindex="-1" class="titulo ds-flex-row">
        <component :is="ICONS.ERROR" :size="18" aria-hidden="true" />
        La plataforma no tiene configuración de facturación
      </h2>
      <p class="cuerpo">
        No falta un dato de negocio: falta un paso del despliegue. Sin esa fila el sistema no sabe
        cuántos días de cortesía conceder tras un vencimiento, qué día del mes emitir los cobros ni
        a cuántos días vence una factura, y no hay valor por defecto que inventar — el propósito
        entero de la tabla es que esas políticas no vivan escritas en el código.
      </p>
      <p class="cuerpo">
        Esta pantalla <strong>no puede crearla</strong>: el recurso no tiene alta. La siembra el
        mismo changeset que crea la tabla, así que el remedio se aplica en la base de datos del
        entorno y lo enumera el propio servidor, aquí debajo.
      </p>
    </div>

    <div class="ds-stack ds-stack--8">
      <p class="ds-label">Lo que respondió el servidor (503)</p>
      <p class="detalle">{{ detail }}</p>
      <div class="ds-actions ds-actions--start">
        <button
          type="button"
          class="ds-btn ds-btn--ghost ds-btn--sm"
          @click="copy(props.detail, 'Mensaje del servidor')"
        >
          <component :is="ICONS.COPY" :size="13" aria-hidden="true" />
          Copiar el mensaje
        </button>
      </div>
    </div>

    <p v-if="traceId" class="ds-meta ds-flex-row">
      <span>Traza: {{ traceId }}</span>
      <button
        type="button"
        class="ds-btn ds-btn--plain ds-btn--sm"
        @click="copy(traceId, 'Identificador de traza')"
      >
        <component :is="ICONS.COPY" :size="13" aria-hidden="true" />
        Copiar
      </button>
    </p>

    <div class="ds-actions ds-actions--start">
      <button
        type="button"
        class="ds-btn ds-btn--primary"
        :disabled="retrying"
        @click="$emit('retry')"
      >
        <component :is="ICONS.RETRY" :size="14" aria-hidden="true" />
        {{ retrying ? 'Comprobando…' : 'Volver a comprobar' }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.titulo {
  margin: 0;
  color: var(--danger-500);
  font-size: var(--text-h3);
}

.cuerpo {
  margin: 0;
  max-width: 72ch;
}

/* El mensaje del servidor va monoespaciado y sin recortar: lleva dentro la
   sentencia SQL que hay que ejecutar, y una elipsis la dejaría inservible. */
.detalle {
  margin: 0;
  padding: var(--space-12);
  border-radius: var(--radius-panel);
  background: var(--surface-sunken);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
</style>
