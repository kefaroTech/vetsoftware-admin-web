<script lang="ts">
/**
 * Mínimo de 12 y no de 8. El 8 del front del tenant es para un empleado de
 * clínica con permisos de su empresa; esto es una cuenta con control total de
 * la plataforma: todos los tenants, todos los catálogos, todos los roles base.
 * NIST SP 800-63B fija 8 como suelo absoluto y recomienda subirlo para cuentas
 * privilegiadas.
 *
 * NO se exigen mayúsculas, dígitos ni símbolos: las reglas de composición
 * empujan a `Password1!`, que es peor que una frase larga, y el mismo NIST las
 * desaconseja. Si el backend acabara imponiéndolas, el cliente las replica
 * EXACTAS — un cliente más permisivo que el servidor produce un rechazo tras el
 * envío, con el formulario lleno.
 *
 * El máximo tiene que coincidir con el `@Size(max)` del DTO del backend. Manda
 * el servidor: si acepta otro número, este se corrige.
 */
export const PASSWORD_MIN = 12
export const PASSWORD_MAX = 100
</script>

<script setup lang="ts">
import { computed } from 'vue'
import { ICONS } from '@/constants/icons'

/**
 * Requisitos de la contraseña, con estado — **no** una barra de fortaleza y
 * **no** `zxcvbn`.
 *
 * «Media», «Fuerte» y «Débil» no son accionables (no dicen qué cambiar) y el
 * color como único canal de información incumple §1.4.1 Use of Color. `zxcvbn`
 * son ~400 kB de diccionarios en una pantalla que se usa una vez por
 * administrador y por vida; este repo acaba de retirar 183 kB de iconos por ese
 * mismo motivo.
 *
 * La lista, en cambio, es determinista, cada línea corresponde a un validador
 * que ya existe, y se lee igual con lector de pantalla.
 */
const props = defineProps<{ value: string }>()

const rules = computed(() => [
  { label: `Al menos ${PASSWORD_MIN} caracteres`, ok: props.value.length >= PASSWORD_MIN },
  {
    label: `Como máximo ${PASSWORD_MAX} caracteres`,
    ok: props.value.length > 0 && props.value.length <= PASSWORD_MAX,
  },
])
</script>

<template>
  <!-- `polite`, no `assertive`: es información de apoyo mientras se teclea, no
       una interrupción. Se pinta desde el primer carácter —no al `blur`— porque
       no es una validación de error, es una guía; la regla de «no validar antes
       de tiempo» prohíbe pintar ERRORES al teclear, no ayuda. -->
  <div v-if="value.length > 0" role="status" aria-live="polite">
    <ul class="ds-list-reset ds-stack ds-stack--8">
      <li
        v-for="rule in rules"
        :key="rule.label"
        class="ds-flex-row ds-flex-row--6 ds-hint"
        :class="rule.ok ? 'ok' : null"
      >
        <component :is="rule.ok ? ICONS.CHECKED : ICONS.UNCHECKED" :size="13" aria-hidden="true" />
        <!-- Sin este prefijo la lista se oye como dos frases sueltas, sin decir
             si están hechas: el icono es la única señal y va `aria-hidden`. -->
        <span class="ds-sr-only">{{ rule.ok ? 'Cumplido: ' : 'Pendiente: ' }}</span>
        <span>{{ rule.label }}</span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.ok {
  color: var(--success-fg);
}
</style>
