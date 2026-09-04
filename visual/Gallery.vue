<script setup lang="ts">
import { ref } from 'vue'
import { Pencil, Trash2 } from 'lucide-vue-next'

// ── La superficie de formulario (A11Y-09 / A11Y-10) ───────────────────────
// Se montan los componentes REALES y no su marcado copiado, como sí se hace
// con `.ds-btn` más abajo: la mitad de lo que un cambio de token puede romper
// es QUÉ clase pone cada componente en cada estado, y una copia del marcado no
// cubre eso.
import AppInput from '../src/components/ui/AppInput.vue'
import AppSelect from '../src/components/ui/AppSelect.vue'
import AppTextarea from '../src/components/ui/AppTextarea.vue'
import AppCheckbox from '../src/components/ui/AppCheckbox.vue'

// FORM-05. `ErrorSummary` es gemelo TR-02 y no tenía ni una captura: su cuerpo
// se puede recolorear entero sin que nada falle. Se monta el componente REAL
// —no marcado suelto— porque la mitad de lo que un cambio puede romper es qué
// clase pone el propio componente en cada estado.
import ErrorSummary from '../src/components/feedback/ErrorSummary.vue'

// A11Y-09. `ToastStack` es el otro gemelo TR-02 sin una sola captura. Se monta
// el componente REAL y sus avisos llegan por el store REAL, que es la única
// entrada que tiene: no acepta datos por props.
import ToastStack from '../src/components/feedback/ToastStack.vue'
import { useToastStore } from '../src/stores/toast.store'

// ── Valores de los campos ─────────────────────────────────────────────────
// Escritos, no vacíos, salvo donde el estado que se retrata ES el hueco: un
// campo con texto y uno con placeholder pintan colores distintos y los dos
// tienen que entrar en la misma imagen.
const campoTexto = ref('Clínica Veterinaria Norte')
const campoVacio = ref('')
const campoInvalido = ref('ana.restrepo')
const campoBloqueado = ref('EMP-0042')
const campoNotas = ref('Contrato anual; facturación el día 5 de cada mes.')
const campoPlan = ref('pro')
const campoCheck = ref(true)
const campoPista = ref('8')
const campoSoloLectura = ref('a7f3-9c21-0e88')

// Dos items, no uno: el encabezado tiene rama singular/plural y la separación
// entre entradas (`li + li`) solo existe a partir del segundo.
const ERRORES = [
  { id: 'campo-nombre', text: 'El nombre de la sede es obligatorio.' },
  { id: 'campo-nit', text: 'El NIT ya está registrado en otra empresa.' },
]

const PLANES = [
  { value: 'pro', label: 'Plan Pro' },
  { value: 'basico', label: 'Plan Básico' },
]

// ── El bloque del dinero (D-02) ───────────────────────────────────────────
// Las ~60 pantallas de cobranza son la mayor superficie visual de esta consola
// y no tenían ni una captura: la unificación tipográfica del dinero pasó la
// suite 22/22 no porque nada se moviera, sino porque nadie miraba. La objeción
// que excluye las pantallas reales —«piden backend, sesión y datos»— no aplica
// a un fixture: es el mismo argumento con el que ya entraron `/login` y el
// armazón de tablet.
//
// Se montan los componentes REALES (`AppTable`, `MoneyCaption`,
// `MoneyScopeNote`) y el formateador REAL, porque lo que hay que congelar es
// justo la costura entre los tres: la cifra sin símbolo en la celda y la
// divisa dicha una sola vez por superficie.
import AppTable, { type AppTableHeader } from '../src/components/ui/AppTable.vue'
import MoneyScopeNote from '../src/components/ui/MoneyScopeNote.vue'
import { formatAmount, formatMoney } from '../src/composables/format'

/** Importes fijos y escritos a mano: ni `Date`, ni aleatorios, ni red. */
const DOCUMENTOS = [
  { id: 'DOC-2026-000181', empresa: 'Clínica Veterinaria Norte', total: 179000, saldo: 179000 },
  { id: 'DOC-2026-000182', empresa: 'Centro Animal del Valle', total: 1250400.5, saldo: 0 },
  { id: 'DOC-2026-000183', empresa: 'Hospital Veterinario Sur', total: 89900, saldo: 44950 },
]

const DOCUMENTOS_HEADERS: AppTableHeader[] = [
  'Documento',
  'Empresa',
  { label: 'Total', align: 'num' },
  { label: 'Saldo', align: 'num' },
]

/** Los totales de una oferta: la superficie de dinero que NO es una tabla. */
const TOTALES = [
  { concepto: 'Subtotal', importe: 1050000 },
  { concepto: 'Descuento', importe: 50000 },
  { concepto: 'Impuestos', importe: 190000 },
]
const TOTAL_OFERTA = 1190000

/**
 * La otra mitad de la política: cuando el DTO SÍ declara `currency`, la celda
 * lleva el símbolo y la tabla NO lleva `<caption>` de divisa. Las dos formas
 * tienen que poder compararse en la misma imagen — es exactamente la costura
 * que se rompió cuando el mismo peso tenía tres tipografías.
 */
const PAGOS = [
  { id: 'PAY-9001', importe: 179000, currency: 'COP' },
  { id: 'PAY-9002', importe: 50, currency: 'USD' },
]

const PAGOS_HEADERS: AppTableHeader[] = ['Pago', { label: 'Importe', align: 'num' }]

/**
 * Los cuatro tonos del aviso flotante, más el chip de traza — que es la
 * superficie cuyo borde movió A11Y-09 y la única que lleva tipografía
 * monoespaciada.
 *
 * Duración 0 y no la de por defecto: el store programa un `setTimeout` que
 * borraría cada aviso a los 3 s, y la captura no puede depender de dispararse
 * antes de que venza.
 */
const avisos = useToastStore()
avisos.push('success', 'Consulta guardada', 'La historia clínica quedó registrada.', 0)
avisos.push('info', 'Sin sede seleccionada', undefined, 0)
avisos.push('warn', 'Alguien editó primero', 'Vuelve a cargar para ver los cambios.', 0)
avisos.push(
  'error',
  'No se pudo anular el documento',
  'El documento ya fue anulado (409).',
  0,
  '7f3a9c1e-0b22-4d51-9a6f-1c8e40b7d233',
)

/**
 * Catálogo de todo lo que la capa visual promete.
 *
 * Cada bloque lleva `data-shot`: es la unidad que Playwright captura. Se
 * fotografía bloque a bloque y no la página entera porque una diferencia en el
 * primero desplazaría todo lo de abajo y una sola regresión saldría como
 * quince — el informe dejaría de decir DÓNDE está el cambio.
 *
 * Al añadir una primitiva a `primitives.css`, añádela también aquí: lo que no
 * está en la galería no tiene red.
 */
</script>

<template>
  <main class="gallery">
    <!-- ── Botones ────────────────────────────────────────────────────── -->
    <section data-shot="botones">
      <h2>Botones</h2>
      <div class="row">
        <button class="ds-btn ds-btn--primary">Guardar</button>
        <button class="ds-btn ds-btn--ghost">Cancelar</button>
        <button class="ds-btn ds-btn--neutral">Neutro</button>
        <button class="ds-btn ds-btn--danger">Eliminar</button>
        <button class="ds-btn ds-btn--danger-solid">Anular</button>
        <button class="ds-btn ds-btn--plain">Plano</button>
      </div>
      <div class="row">
        <button class="ds-btn ds-btn--primary ds-btn--sm">Pequeño</button>
        <button class="ds-btn ds-btn--primary ds-btn--lg">Grande</button>
        <button class="ds-btn ds-btn--primary" disabled>Deshabilitado</button>
      </div>
    </section>

    <!-- ── Botón de icono ─────────────────────────────────────────────── -->
    <section data-shot="icon-btn">
      <h2>Botón de icono</h2>
      <div class="row">
        <button class="ds-icon-btn" aria-label="Editar"><Pencil :size="14" /></button>
        <button class="ds-icon-btn ds-icon-btn--danger" aria-label="Eliminar">
          <Trash2 :size="14" />
        </button>
        <button class="ds-icon-btn" aria-label="Deshabilitado" disabled>
          <Pencil :size="14" />
        </button>
      </div>
    </section>

    <!-- ── Avisos ─────────────────────────────────────────────────────── -->
    <section data-shot="banners">
      <h2>Avisos</h2>
      <div class="ds-banner ds-banner--info">Selecciona una sede para ver su stock.</div>
      <div class="ds-banner ds-banner--success">Consulta guardada correctamente.</div>
      <div class="ds-banner ds-banner--warning">Hay 3 lotes por vencer este mes.</div>
      <div class="ds-banner ds-banner--error">No se pudo conectar con el servidor.</div>
      <div class="ds-banner ds-banner--info ds-banner--sm">Variante compacta.</div>
      <p class="ds-server-error">El documento ya fue anulado (409).</p>
    </section>

    <!-- ── Tarjetas y paneles ─────────────────────────────────────────── -->
    <section data-shot="tarjetas">
      <h2>Tarjetas y paneles</h2>
      <div class="row">
        <div class="ds-card">
          <h3 class="ds-title">Tarjeta</h3>
          <p class="ds-subtitle">Con título y subtítulo.</p>
        </div>
        <div class="ds-card ds-card--flat">
          <h3 class="ds-title">Plana</h3>
        </div>
        <div class="ds-card ds-card--tight">
          <h3 class="ds-title">Compacta</h3>
        </div>
      </div>
      <div class="ds-panel">Panel</div>
    </section>

    <!-- ── Tipografía ─────────────────────────────────────────────────── -->
    <section data-shot="tipografia">
      <h2>Tipografía</h2>
      <p class="ds-display">Display</p>
      <p class="ds-display ds-display--sm">Display pequeño</p>
      <p class="ds-title">Título</p>
      <p class="ds-subtitle">Subtítulo</p>
      <p class="ds-label">Etiqueta</p>
      <p class="ds-truncate" style="width: 180px">
        Texto muy largo que se debe cortar con puntos suspensivos al final
      </p>
    </section>

    <!-- ── Estados vacíos ─────────────────────────────────────────────── -->
    <section data-shot="vacios">
      <h2>Estados vacíos</h2>
      <div class="ds-empty">Sin resultados.</div>
      <div class="ds-empty ds-empty--boxed">Sin resultados, con caja.</div>
      <div class="ds-empty ds-empty--lg">Sin resultados, grande.</div>
    </section>

    <!-- ── Rejillas ───────────────────────────────────────────────────── -->
    <section data-shot="rejillas">
      <h2>Rejillas</h2>
      <div class="ds-grid-2">
        <div class="ds-card ds-card--tight">Uno</div>
        <div class="ds-card ds-card--tight">Dos</div>
        <div class="ds-card ds-card--tight ds-grid-span">Ancho completo</div>
      </div>
      <dl class="ds-detail-grid">
        <dt>Propietario</dt>
        <dd>Ana Restrepo</dd>
        <dt>Documento</dt>
        <dd>1017254398</dd>
      </dl>
    </section>

    <!-- ── Campos de formulario ───────────────────────────────────────── -->
    <!--
      A11Y-09 / A11Y-10. Hasta aquí la galería no fotografiaba NI UN campo:
      cubría botones, avisos, tarjetas, tipografía, vacíos y rejillas, y la
      superficie de formulario —el borde de control, el texto tenue del
      placeholder y el anillo de foco— se podía romper entera sin que una sola
      línea base se moviera.

      Los estados van en UN bloque y no en seis a propósito: lo que hay que
      poder comparar de un vistazo es el borde de reposo contra el de error
      contra el deshabilitado. En capturas separadas esa comparación se pierde,
      y es justo la que decide si un cambio de token es correcto.

      El foco NO cabe aquí porque exige interacción; vive en sus propios casos
      del spec, igual que el hover del botón de icono.
    -->
    <section data-shot="campos">
      <h2>Campos de formulario</h2>

      <!-- Reposo. Es el PRIMER tabulable del bloque: el caso del anillo de
           foco del disparador de select parte de aquí y tabula una vez. -->
      <AppInput v-model="campoTexto" label="Razón social" required data-testid="campo-texto" />

      <!-- Disparador de select en reposo: mismo borde, otro control. -->
      <AppSelect
        v-model="campoPlan"
        :options="PLANES"
        label="Plan contratado"
        data-testid="campo-select"
      />

      <!-- Placeholder: texto tenue DENTRO del control. -->
      <AppInput v-model="campoVacio" label="NIT" placeholder="Sin dígito de verificación" />

      <!-- Pista. El texto auxiliar lo pinta `.ds-hint`, primitiva del fichero
           gemelo TR-02: la captura es lo que sujeta el token que la tiñe. -->
      <AppInput
        v-model="campoPista"
        label="Cupo de sedes"
        hint="Sedes activas simultáneas incluidas en el plan."
      />

      <!-- Inválido + mensaje de error. En esta familia son INSEPARABLES: la
           prop `error` pinta a la vez el borde rojo y el mensaje. El temblor lo
           apaga el spec. -->
      <AppInput
        v-model="campoInvalido"
        label="Correo de contacto"
        error="Falta el signo @."
        data-testid="campo-invalido"
      />

      <!-- Deshabilitado: cambia fondo y texto pero CONSERVA el borde neutro,
           así que retrata el token de borde. -->
      <AppInput v-model="campoBloqueado" label="Código de empresa" disabled />

      <!-- Solo lectura. `AppInput` acepta la prop pero su `toneClass` nunca
           elige `.ds-field-readonly`, así que lo que la línea base congela es
           el hecho —no el estilo— de que un campo de solo lectura se ve
           EXACTAMENTE igual que uno editable. -->
      <AppInput v-model="campoSoloLectura" label="Identificador interno" readonly />

      <!-- Área de texto: la tercera geometría de la familia. -->
      <AppTextarea v-model="campoNotas" label="Notas" :rows="2" />

      <!-- Casilla: cuarto control con el mismo token de borde. -->
      <AppCheckbox v-model="campoCheck" label="Habilitar facturación electrónica" />
    </section>

    <!-- ── Texto tenue por superficie ─────────────────────────────────── -->
    <!--
      A11Y-10 se midió sobre blanco, y aunque esta consola pinta su fondo en
      `#fbfaff`, las primitivas de `primitives.css` —gemelo TR-02 con la app del
      tenant— apoyan su texto tenue sobre `--warm-50`, `--warm-100`
      (`.ds-panel`), `--warm-150` y `--amatista-50`. El contraste real es
      distinto en cada una y ése es el caso que se midió mal.

      Las cuatro tarjetas son la MISMA `.ds-panel` y sólo se les sustituye el
      fondo en línea, así que lo único que varía entre ellas —y por tanto lo
      único que un diff puede señalar— es la superficie. Aquí sí se usan tokens
      a propósito: la superficie no es la regla con la que se mide, es lo medido.
    -->
    <section data-shot="texto-tenue">
      <h2>Texto tenue por superficie</h2>

      <div class="ds-panel ds-stack ds-stack--8" style="background: var(--warm-50)">
        <span>Sobre --warm-50 · superficie de página y de campo</span>
        <span class="ds-meta">.ds-meta · dato de apoyo bajo un título</span>
        <span class="ds-hint">.ds-hint · nota de ayuda, el tamaño más pequeño</span>
        <span class="ds-meta-dark">.ds-meta-dark · un tono más oscuro</span>
        <span class="ds-label">.ds-label · etiqueta en versalitas</span>
      </div>

      <div class="ds-panel ds-stack ds-stack--8">
        <span>Sobre --warm-100 · `.ds-panel` sin sustituir el fondo</span>
        <span class="ds-meta">.ds-meta · dato de apoyo bajo un título</span>
        <span class="ds-hint">.ds-hint · nota de ayuda, el tamaño más pequeño</span>
        <span class="ds-meta-dark">.ds-meta-dark · un tono más oscuro</span>
        <span class="ds-label">.ds-label · etiqueta en versalitas</span>
      </div>

      <div class="ds-panel ds-stack ds-stack--8" style="background: var(--warm-150)">
        <span>Sobre --warm-150 · superficie hundida</span>
        <span class="ds-meta">.ds-meta · dato de apoyo bajo un título</span>
        <span class="ds-hint">.ds-hint · nota de ayuda, el tamaño más pequeño</span>
        <span class="ds-meta-dark">.ds-meta-dark · un tono más oscuro</span>
        <span class="ds-label">.ds-label · etiqueta en versalitas</span>
      </div>

      <div class="ds-panel ds-stack ds-stack--8" style="background: var(--amatista-50)">
        <span>Sobre --amatista-50 · fila y opción seleccionadas</span>
        <span class="ds-meta">.ds-meta · dato de apoyo bajo un título</span>
        <span class="ds-hint">.ds-hint · nota de ayuda, el tamaño más pequeño</span>
        <span class="ds-meta-dark">.ds-meta-dark · un tono más oscuro</span>
        <span class="ds-label">.ds-label · etiqueta en versalitas</span>
      </div>
    </section>
    <!-- ── Resumen de errores ─────────────────────────────────────────── -->
    <!--
      FORM-05. El color lo hereda de `.ds-banner--error`, que el marcado aplica
      JUNTO a `.ds-error-summary` (ver la cabecera de la primitiva): por eso el
      bloque lleva las dos clases y no solo la del resumen — fotografiarlo sin el
      banner retrataria un componente que no existe en ninguna pantalla.
    -->
    <section data-shot="resumen-errores">
      <h2>Resumen de errores</h2>
      <ErrorSummary :items="ERRORES" />
      <ErrorSummary :items="ERRORES.slice(0, 1)" />
      <ErrorSummary :items="ERRORES" trace-id="7f3a9c1e-0b22-4d51-9a6f-1c8e40b7d233" />
    </section>

    <!-- ── Diálogo ────────────────────────────────────────────────────── -->
    <!--
      `.ds-dialog-overlay` es `position: fixed; inset: 0`, asi que tal cual
      taparía la galería entera y la captura del bloque saldría del tamaño del
      viewport. El envoltorio lleva `transform` para convertirse en el bloque
      contenedor de sus descendientes fijos (CSS Transforms §3.2): el overlay se
      queda dentro de la caja y se fotografía con su fondo y su desenfoque
      REALES, sin tocar una sola declaración de la primitiva.
    -->
    <section data-shot="dialogos">
      <h2>Diálogo</h2>

      <div class="dialog-caja">
        <div class="ds-dialog-overlay">
          <div class="ds-dialog-card">
            <div class="ds-dialog-icon ds-tone--danger">
              <Trash2 :size="20" />
            </div>
            <h3>¿Anular el documento?</h3>
            <p class="ds-dialog-body">
              Esta acción no se puede deshacer. El consecutivo queda anulado y no se reutiliza.
            </p>
            <div class="row">
              <button class="ds-btn ds-btn--ghost">Cancelar</button>
              <button class="ds-btn ds-btn--danger-solid">Anular</button>
            </div>
          </div>
        </div>
      </div>

      <!-- La variante ancha (480px) — su único consumidor real es
           `ResumeOrNewConsultaDialog`, que además tiñe el icono de amatista
           con `.ds-tone--accent` puesto aparte en el marcado. -->
      <div class="dialog-caja">
        <div class="ds-dialog-overlay">
          <div class="ds-dialog-card ds-dialog-card--wide">
            <div class="ds-dialog-icon ds-tone--accent">
              <Pencil :size="20" />
            </div>
            <h3>Tienes una consulta sin terminar</h3>
            <p class="ds-dialog-body">
              Puedes retomar el borrador guardado o empezar una consulta nueva desde cero.
            </p>
            <div class="row">
              <button class="ds-btn ds-btn--ghost">Descartar</button>
              <button class="ds-btn ds-btn--primary">Retomar</button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Dinero · tabla cuyo DTO no declara divisa ──────────────────── -->
    <section data-shot="dinero-tabla">
      <h2>Dinero · tabla sin divisa en el contrato</h2>
      <AppTable :headers="DOCUMENTOS_HEADERS" money>
        <tr v-for="documento in DOCUMENTOS" :key="documento.id" class="ds-row-hover">
          <td class="ds-text-strong">{{ documento.id }}</td>
          <td>{{ documento.empresa }}</td>
          <td class="ds-num">{{ formatAmount(documento.total) }}</td>
          <td class="ds-num">{{ formatAmount(documento.saldo) }}</td>
        </tr>
      </AppTable>
    </section>

    <!-- ── Dinero · superficie que no es una tabla ────────────────────── -->
    <section data-shot="dinero-nota">
      <h2>Dinero · nota de superficie</h2>
      <div class="ds-card ds-stack ds-stack--8">
        <h3 class="ds-title">Totales de la oferta</h3>
        <dl class="ds-detail-grid">
          <div v-for="linea in TOTALES" :key="linea.concepto">
            <dt class="ds-label">{{ linea.concepto }}</dt>
            <dd class="ds-num">{{ formatAmount(linea.importe) }}</dd>
          </div>
          <div>
            <dt class="ds-label">Total</dt>
            <dd class="ds-num ds-text-strong">{{ formatAmount(TOTAL_OFERTA) }}</dd>
          </div>
        </dl>
        <MoneyScopeNote />
      </div>
    </section>

    <!-- ── Dinero · tabla cuyo DTO SÍ declara divisa ──────────────────── -->
    <section data-shot="dinero-divisa">
      <h2>Dinero · divisa declarada por el contrato</h2>
      <AppTable :headers="PAGOS_HEADERS">
        <tr v-for="pago in PAGOS" :key="pago.id" class="ds-row-hover">
          <td class="ds-text-strong">{{ pago.id }}</td>
          <td class="ds-num">{{ formatMoney(pago.importe, pago.currency) }}</td>
        </tr>
      </AppTable>
    </section>

    <!-- ── Avisos flotantes ───────────────────────────────────────────── -->
    <!--
      Mismo caso que el bloque `dialogos`: `.toast-stack` es `position: fixed`,
      así que sin envoltorio se pintaría sobre la esquina de la galería entera
      y la captura del bloque saldría del tamaño del viewport. El `transform`
      convierte la caja en el bloque contenedor de sus descendientes fijos
      (CSS Transforms §3.2), sin tocar una declaración del componente.
    -->
    <section data-shot="avisos">
      <h2>Avisos flotantes</h2>
      <div class="aviso-caja"><ToastStack /></div>
    </section>
  </main>
</template>

<style scoped>
/* Andamiaje de la galería. Deliberadamente mínimo y sin tokens: si esta hoja
   usara variables del design system, un cambio en los tokens movería a la vez
   lo medido y la regla con la que se mide. */
.gallery {
  padding: 24px;
  background: #fff;
  display: flex;
  flex-direction: column;
  gap: 28px;
}

section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: flex-start;
}

h2 {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #666;
}

.row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

section > .ds-banner,
section > .ds-server-error,
section > .ds-empty,
section > .ds-grid-2,
section > .ds-panel,
/* Ver el comentario del bloque `dialogos`: el `transform` es lo que mantiene
   al overlay `fixed` dentro de esta caja en vez de sobre la página entera.
   `translate(0)` no mueve un píxel; solo crea el bloque contenedor. */
.dialog-caja {
  position: relative;
  transform: translate(0);
  width: 560px;
  height: 300px;
  overflow: hidden;
}

section > [data-shot],
section > div:not(.row) {
  width: 560px;
}

/* Ver el comentario del bloque `avisos`. El alto va holgado a propósito: la
   pila es `fixed` y no aporta alto al envoltorio, así que si se quedara corto
   el último aviso se recortaría sin que nada fallase. */
.aviso-caja {
  position: relative;
  transform: translate(0);
  height: 380px;
  overflow: hidden;
}
</style>
