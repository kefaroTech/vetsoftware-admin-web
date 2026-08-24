import {
  EXTERNAL_PROVIDER_MAX_LENGTH,
  INVOICE_DAY_MAX,
  INVOICE_DAY_MIN,
  SEQUENCE_PREFIX_MAX_LENGTH,
  SEQUENCE_PREFIX_PATTERN,
} from '../types/platform-billing.types'

/**
 * Validadores puros de la pantalla de facturación de plataforma (§4.6, §5.6).
 *
 * <p>Reglas de redacción heredadas de `src/composables/validators.ts`, que valen
 * igual aquí: sujeto siempre, la regla real y no la genérica, punto final,
 * segunda persona y sin culpabilizar. Y una más que fija §5.6.5 (WCAG §3.3.3
 * *Error Suggestion*): <b>el mensaje dice qué hacer</b> — «Introduce un día entre
 * 1 y 28», no «Valor inválido».
 *
 * <p><b>Ningún tope inventado.</b> El backend solo declara `@Min(0)` en los tres
 * contadores de días: no hay máximo, así que aquí tampoco. Poner un techo de
 * cortesía haría que el formulario rechazara un valor que el servidor acepta, y
 * la convención del repositorio es explícita en que los límites salen de las
 * anotaciones del DTO y no de una costumbre del front. El único rango que se
 * comprueba —1..28— existe porque el DTO lo declara (`@Min(1) @Max(28)`).
 */

/**
 * Contador de días entero y no negativo.
 *
 * <p>`subject` va en minúscula y **con artículo** porque el mensaje es una frase
 * imperativa: `validateDayCount(v, 'los días de cortesía')` produce «Escribe los
 * días de cortesía.», que nombra el campo y dice la acción.
 *
 * <p>Se exige `^\d+$` y no `Number.isInteger` a secas: `Number(' 5 ')` vale 5 y
 * `Number('5e2')` vale 500. Un campo de política de cobro no puede aceptar
 * notación científica por descuido.
 */
export function validateDayCount(value: string, subject: string): string {
  const raw = value.trim()
  if (!raw) return `Escribe ${subject}.`
  if (!/^\d+$/.test(raw)) {
    return `Escribe ${subject} como un número entero de días, sin signo ni decimales.`
  }
  return ''
}

/**
 * Día del mes en que se emiten los cobros.
 *
 * <p>El rango 1–28 no es una precaución: es el `@Min(1) @Max(28)` del DTO, y
 * existe porque febrero no tiene 29, 30 ni 31 días. Un valor mayor dejaría meses
 * sin emisión, que es un fallo que solo se ve cuando ya no se facturó.
 */
export function validateInvoiceDay(value: string): string {
  const raw = value.trim()
  if (!raw) return 'Escribe el día del mes en que se emiten los cobros.'
  const day = Number(raw)
  if (!/^\d+$/.test(raw) || day < INVOICE_DAY_MIN || day > INVOICE_DAY_MAX) {
    return `Introduce un día entre ${INVOICE_DAY_MIN} y ${INVOICE_DAY_MAX}.`
  }
  return ''
}

/** Proveedor de facturación externa: opcional, con el `@Size(max = 40)` del DTO. */
export function validateExternalProvider(value: string): string {
  return value.trim().length > EXTERNAL_PROVIDER_MAX_LENGTH
    ? `El proveedor de facturación externa no puede pasar de ${EXTERNAL_PROVIDER_MAX_LENGTH} caracteres.`
    : ''
}

/**
 * Prefijo de una serie de numeración.
 *
 * <p>El patrón del DTO es `[A-Z]{1,10}`: solo mayúsculas. El mensaje lo dice con
 * un ejemplo, porque sin él el usuario vuelve a probar a ciegas — un «formato
 * incorrecto» sobre un campo que acaba de rechazar `dc-2026` no enseña que el
 * problema son las minúsculas y el guion a la vez.
 */
export function validateSequencePrefix(value: string): string {
  const raw = value.trim()
  if (!raw) return 'Escribe el prefijo de la serie.'
  if (!SEQUENCE_PREFIX_PATTERN.test(raw)) {
    return `El prefijo son de 1 a ${SEQUENCE_PREFIX_MAX_LENGTH} letras mayúsculas, sin números, espacios ni signos. Ejemplo: DC`
  }
  return ''
}
