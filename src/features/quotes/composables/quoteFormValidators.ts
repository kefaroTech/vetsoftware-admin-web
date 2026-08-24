import { parseISODate } from '@/composables/format'

/**
 * Validadores puros del alta de una cotización.
 *
 * <p>Viven fuera del SFC por dos razones: el presupuesto de CSS del repositorio fija un tope de
 * 500 líneas por componente, y unas funciones puras se prueban sin montar nada.
 *
 * <p>Reglas de redacción del repositorio (`composables/validators.ts`): sujeto siempre, la regla
 * real y no la genérica, punto final, segunda persona y sin culpabilizar. WCAG 2.2 §3.3.3 pide
 * además que el mensaje diga **qué hacer** — «Introduce una fecha de hoy en adelante», no «valor
 * inválido».
 */

/** Una línea del formulario, todavía como texto de campo. */
export interface QuoteLineDraft {
  catalogItemId: number | null
  quantity: string
  discountPercent: string
}

export function tooLong(value: string, label: string, max: number): string {
  return value.trim().length > max ? `${label} no puede pasar de ${max} caracteres.` : ''
}

/**
 * `prospectName` es opcional en el esquema y **obligatorio en la interfaz**, igual que la `note` de
 * las dependencias del catálogo (§4.1): una oferta sin destinatario no se puede enviar a nadie y
 * deja el embudo lleno de filas anónimas que nadie sabe reclamar.
 */
export function validateProspectName(value: string): string {
  const v = value.trim()
  if (!v) return 'El nombre del prospecto es obligatorio.'
  if (v.length < 2) return 'El nombre del prospecto debe tener al menos 2 caracteres.'
  return tooLong(value, 'El nombre del prospecto', 150)
}

export function validateEmail(value: string): string {
  const v = value.trim()
  if (!v) return ''
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v))
    return 'El correo no tiene el formato correcto. Ejemplo: ana@spaanapet.com'
  return tooLong(value, 'El correo', 120)
}

export function validatePhone(value: string): string {
  const v = value.trim()
  if (!v) return ''
  const digits = v.replace(/\D/g, '').length
  if (!/^[+\d\s\-()]+$/.test(v) || digits < 7 || digits > 15)
    return 'El teléfono debe tener entre 7 y 15 dígitos. Ejemplo: +57 310 123 4567'
  return tooLong(value, 'El teléfono', 30)
}

/**
 * Sin fecha no hay hasta cuándo se respeta el precio; con una fecha ya pasada, la oferta nace
 * vencida y el cliente la recibe muerta.
 */
export function validateValidUntil(value: string, now: Date = new Date()): string {
  if (!value) return 'La fecha de vigencia es obligatoria: es hasta cuándo se respeta el precio.'
  const target = parseISODate(value)
  if (!target) return 'La fecha de vigencia no es una fecha válida. Usa el calendario del campo.'
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (target.getTime() < today.getTime())
    return 'La fecha de vigencia tiene que ser hoy o posterior: una oferta ya vencida no se envía.'
  return ''
}

export function validateTrialDays(value: string): string {
  if (!value.trim()) return ''
  const n = Number(value)
  if (!Number.isInteger(n) || n < 0 || n > 365)
    return 'Los días de prueba deben ser un entero entre 0 y 365.'
  return ''
}

/**
 * Un artículo repetido en dos líneas produce dos cobros del mismo módulo, y el descuadre no se
 * descubre hasta que el cliente reclama la factura.
 */
export function validateQuoteLines(lines: QuoteLineDraft[]): string {
  if (lines.length === 0) return 'La cotización necesita al menos una línea.'
  if (lines.some((l) => l.catalogItemId === null))
    return 'Cada línea necesita un artículo: elígelo o quita la línea.'
  const chosen = lines.map((l) => l.catalogItemId)
  if (new Set(chosen).size !== chosen.length)
    return 'Hay un artículo repetido en dos líneas. Súmale la cantidad a una y quita la otra.'
  if (lines.some((l) => !Number.isInteger(Number(l.quantity)) || Number(l.quantity) < 1))
    return 'La cantidad de cada línea debe ser un entero mayor o igual a 1.'
  const badDiscount = lines.some((l) => {
    const d = Number(l.discountPercent.replace(',', '.'))
    return !Number.isFinite(d) || d < 0 || d > 100
  })
  if (badDiscount) return 'El descuento de cada línea debe estar entre 0 y 100.'
  return ''
}
