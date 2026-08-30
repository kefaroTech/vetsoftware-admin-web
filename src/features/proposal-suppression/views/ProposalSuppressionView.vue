<script setup lang="ts">
import { computed, ref } from 'vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import AppInput from '@/components/ui/AppInput.vue'
import { ICONS } from '@/constants/icons'
import ConfirmSuppressionModal from '../components/ConfirmSuppressionModal.vue'
import SuppressionOutcomePanel from '../components/SuppressionOutcomePanel.vue'
import { useProposalSuppression } from '../composables/useProposalSuppression'
import { CONTACT_EMAIL_MAX, validateContactEmail } from '../composables/suppressionRules'

/**
 * <b>Supresión de datos del asistente</b>, a petición del titular — artículo 8,
 * literal e, de la Ley 1581.
 *
 * <p>Es la única pantalla de los dos fronts que llama a
 * `POST /assistant/proposals/suppress`. Hasta ahora, atender una petición de
 * habeas data del prospecto anónimo exigía invocar la API a mano, mientras el
 * aviso de privacidad que ese prospecto lee le promete tres veces que puede
 * pedirla.
 *
 * <p><b>El sujeto no es un usuario ni una empresa.</b> Es un prospecto anónimo:
 * no tiene cuenta, no tiene identificador que él conozca, y lo que dejó escrito
 * es texto libre describiendo su clínica más los motivos que el modelo derivó de
 * él. Por eso no hay buscador, no hay ficha y no hay listado: **no existe ningún
 * endpoint de lectura**, y no por descuido — uno lo convertiría en un oráculo
 * que responde si una dirección ha usado el asistente.
 *
 * <p><b>Y por eso se confirma antes.</b> No se puede mirar qué hay y decidir
 * después: la primera y única llamada ya borra. El diálogo de confirmación es la
 * pausa que sustituye a la consulta previa que el contrato no ofrece.
 *
 * <p><b>Vía «a petición», distinta del barrido automático.</b>
 * `AiProposalRetentionJob` corre solo cada noche y aplica la política de
 * retención sin que nadie la pida. Esta pantalla no lo dispara, no lo consulta y
 * no lo sustituye. Se dice arriba, en el propio encabezado, porque quien atiende
 * una petición necesita saber que un resultado en cero puede significar que el
 * barrido ya se le adelantó.
 *
 * <p><b>Va dentro de `AppLayout`, como el resto de la consola.</b> No lo estuvo:
 * la vista tenía un `<section>` por raíz y era la única ruta de primer nivel sin
 * armazón, aunque `sidebar-nav.ts:91` la enlaza desde el menú. Quien la abría
 * perdía la barra lateral, la cabecera, el enlace de salto y el landmark `main`,
 * y solo salía con el botón «atrás» del navegador. En una pantalla de
 * cumplimiento legal —la única vía por la que se atiende un habeas data— dejar
 * al operador sin navegación no es un detalle de maquetación.
 */
const { email, outcome, saving, error, errorTraceId, setEmail, suppress } = useProposalSuppression()

const touched = ref(false)
const submitted = ref(false)
const confirming = ref(false)

/**
 * Puente al store, y **sin saneado**: el `set` guarda el texto tal como se
 * teclea, con sus espacios.
 *
 * <p>El recorte ocurre después, en los dos únicos puntos por los que el correo
 * sale de esta pantalla: `suppress()` —`useProposalSuppression.ts:57`, que es lo
 * que viaja al servidor— y el `:email` que recibe el modal de confirmación —lo
 * que el operador contrasta antes de pulsar el botón rojo—. El validador
 * tampoco lo necesita: `validateContactEmail` recorta por su cuenta antes de
 * mirar la forma.
 */
const correo = computed({
  get: () => email.value,
  set: (value: string) => setEmail(value),
})

const errorCorreo = computed(() => validateContactEmail(email.value))

/** El error solo se enseña cuando el campo se ha tocado o ya se intentó enviar. */
const errorMostrado = computed(() =>
  touched.value || submitted.value ? errorCorreo.value : undefined,
)

/** El encabezado de la pantalla, que es adonde vuelve el foco tras la escritura. */
const titulo = ref<HTMLElement | null>(null)

/**
 * Si el cierre del diálogo que viene a continuación es el de una escritura ya
 * ejecutada, o el de una salida sin consecuencia.
 *
 * <p>No son el mismo cierre y no dejan el foco en el mismo sitio. Cancelar o
 * pulsar Escape no ha cambiado nada: el foco vuelve al disparador, que sigue
 * ahí, y esa es la cadena de respaldo que `ModalShell` ya aplica. Confirmar sí
 * ha cambiado algo, y el acuse aparece <b>por debajo</b> del botón que se pulsó:
 * quien navega con teclado o con lector de pantalla se quedaba en «Revisar y
 * suprimir» sin enterarse del resultado de una operación irreversible sobre
 * datos personales.
 */
const volverAlTitulo = ref(false)

/**
 * `returnFocusTo` de `ModalShell`, como FUNCIÓN y no como elemento: se resuelve
 * en el instante del cierre, así que el mismo diálogo puede devolver el foco a
 * un sitio o a otro según por dónde se haya cerrado. Devolver `null` deja actuar
 * la cadena de respaldo del propio modal —disparador → `<h1>` de `main` → `main`—.
 */
function focoAlCerrar(): HTMLElement | null {
  return volverAlTitulo.value ? titulo.value : null
}

/**
 * Abre la confirmación. Si el correo no vale, ni siquiera se llega a ella: el
 * diálogo que dice «esto no se deshace» se reserva para lo que de verdad va a
 * ejecutarse.
 */
function pedirConfirmacion() {
  submitted.value = true
  touched.value = true
  if (errorCorreo.value !== '') return
  // Cada apertura arranca en «este cierre no escribe nada»: si el operador
  // cancela, el foco tiene que volver al botón desde el que abrió.
  volverAlTitulo.value = false
  confirming.value = true
}

async function confirmar() {
  const respondio = await suppress()
  // El foco va al encabezado SOLO si el servidor respondió, que es cuando existe
  // el acuse y hay un resultado que leer (§5.1, y el mismo criterio que aplican
  // los tres bloques de `/catalogo-comercial/articulos/:id`). Si la llamada
  // falló no hay acuse: el banner de error es vecino inmediato del disparador y
  // se anuncia solo con su `role="alert"`, así que mover el foco arriba dejaría
  // al operador más lejos del campo que tiene que corregir.
  volverAlTitulo.value = respondio
  // Falle o no, el diálogo se cierra: si falló, el aviso y el banner de abajo lo
  // cuentan con el mensaje del servidor y su traza; dejarlo abierto invitaría a
  // pulsar otra vez sin haber leído por qué.
  confirming.value = false
  if (respondio) submitted.value = false
}
</script>

<template>
  <AppLayout>
    <!-- `.ds-page--wide` es lo que le da a esta pantalla el mismo ancho útil que
         a las demás. Sin armazón no hacía falta —el `<section>` colgaba del
         `<body>`— y con él sí: el contenido es prosa larga, y una línea de texto
         que cruza un monitor entero no se lee. -->
    <section class="ds-page ds-page--wide ds-stack ds-stack--16" aria-labelledby="supresion-titulo">
      <div class="ds-stack ds-stack--8">
        <!-- `<h1>` y no `<h2>`: el armazón NO aporta ninguno —cada vista pone el
             suyo, y `AppSidebar`/`AppHeader` no tienen encabezados—, así que
             mientras esto fue un `<h2>` el documento entero empezaba en el nivel
             2 y no había primer nivel al que saltar. Además es el `<h1>` del que
             dependen dos cadenas de respaldo del proyecto:
             `useNavDrawer.enfocarContenidoNuevo()` y
             `useModalFocus.resolveReturnFocus()`, que buscan `main h1` antes que
             `main`. `tabindex="-1"` se conserva: es el destino del foco tras la
             escritura. -->
        <h1 id="supresion-titulo" ref="titulo" class="ds-display--sm titular" tabindex="-1">
          Supresión de datos del asistente
        </h1>
        <p class="ds-meta">
          Borra, <strong>a petición del titular</strong>, lo que el asistente guardó de un prospecto
          anónimo: su correo de contacto, el texto que escribió y los motivos que el modelo derivó
          de él. Es el derecho del artículo 8, literal e, de la Ley 1581 que el aviso de privacidad
          le promete.
        </p>
      </div>

      <div class="ds-banner ds-banner--info">
        <component :is="ICONS.INFO" :size="16" class="ds-banner-icon" />
        <span class="ds-flex-fill">
          <strong>No es lo mismo que la retención automática.</strong> El barrido nocturno anonimiza
          las propuestas inactivas y purga las antiguas por su cuenta, sin que nadie lo pida; esta
          pantalla es la vía a petición y actúa ahora, sobre un correo concreto. Si el titular
          escribió hace tiempo, es posible que el barrido ya se le hubiera adelantado — entonces
          esto dirá que no encontró nada, y eso también es cumplimiento. Los plazos exactos del
          barrido los fija la configuración del servidor y ningún endpoint los publica, así que esta
          pantalla no puede mostrarlos.
        </span>
      </div>

      <form class="ds-card ds-stack ds-stack--14" novalidate @submit.prevent="pedirConfirmacion">
        <div class="ds-stack ds-stack--8">
          <p class="ds-kicker">El titular</p>
          <p class="ds-meta">
            <strong>El correo de contacto es la única llave.</strong> El endpoint no admite el
            identificador de la propuesta ni ningún token. Si el titular no recuerda desde qué
            dirección escribió, no hay otra forma de encontrarlo desde aquí. Comprueba fuera de esta
            consola que quien pide el borrado es el dueño de la dirección: el servidor no lo
            verifica y no registra quién lo pidió.
          </p>
        </div>

        <AppInput
          id="supresion-correo"
          v-model="correo"
          label="Correo del titular"
          type="email"
          inputmode="email"
          autocomplete="off"
          required
          placeholder="titular@clinica.com"
          :maxlength="CONTACT_EMAIL_MAX"
          :error="errorMostrado"
          hint="Tal como lo escribió al pedir la propuesta. Mayúsculas y minúsculas dan igual."
          @blur="touched = true"
        />

        <p
          v-if="error"
          class="ds-banner ds-banner--error"
          role="alert"
          data-testid="supresion-error-servidor"
        >
          <component :is="ICONS.ERROR" :size="16" class="ds-banner-icon" />
          <span class="ds-flex-fill">
            {{ error }}
            <span v-if="errorTraceId" class="ds-meta">Traza: {{ errorTraceId }}</span>
          </span>
        </p>

        <div class="ds-actions">
          <button type="submit" class="ds-btn ds-btn--danger" :disabled="saving">
            <component :is="ICONS.DATA_SUPPRESSION" :size="15" />
            Revisar y suprimir
          </button>
        </div>
      </form>

      <SuppressionOutcomePanel v-if="outcome !== null" :outcome="outcome" />

      <!-- El alcance va abajo y no en el modal: son los límites de la pantalla, no
           de la operación que se está confirmando. -->
      <div class="ds-stack ds-stack--8">
        <p class="ds-kicker">Alcance de esta pantalla</p>
        <p class="ds-meta">
          Atiende <strong>solo</strong> el derecho de supresión sobre los datos del asistente. Los
          demás derechos del artículo 8 que el aviso de privacidad enumera —conocer qué datos hay,
          actualizarlos, rectificarlos, pedir prueba de la autorización— no tienen hoy ni pantalla
          ni endpoint, y una petición que los incluya hay que atenderla por fuera.
        </p>
        <p class="ds-meta">
          Tampoco alcanza los datos que el titular haya dejado en otras partes del producto
          <span aria-hidden="true">·</span> aquí solo viven las propuestas del asistente.
        </p>
      </div>

      <ConfirmSuppressionModal
        :open="confirming"
        :email="email.trim()"
        :saving="saving"
        :return-focus-to="focoAlCerrar"
        @close="confirming = false"
        @confirm="confirmar"
      />
    </section>
  </AppLayout>
</template>

<style scoped>
.titular {
  margin: 0;
}
</style>
