import { describe, expect, it } from 'vitest'
import {
  REVISION_STATE_LABEL,
  provenanceText,
  revisionState,
} from '@/features/catalog-ai-hints/composables/hintText'
import type { CatalogItemAiHintResponse } from '@/features/catalog-ai-hints/types/catalog-ai-hints.types'

/**
 * El historial es la única evidencia de con qué texto se generó una propuesta
 * pasada, y su pie de procedencia es el punto de la pantalla donde más fácil es
 * mentir. Esta prueba cubre la tabla de verdad entera.
 *
 * <p>Los dos casos que importan y que nadie escribe solo: <b>«Retirada» frente a
 * «Reemplazada»</b>, que la API no distingue y aquí se resuelve por posición; y
 * <b>«no consta quién»</b>, que no es un dato que falte sino información — la
 * firma de retirada la añadió el changeset 393 y las sucesiones anteriores no la
 * tienen.
 */

function revision(over: Partial<CatalogItemAiHintResponse> = {}): CatalogItemAiHintResponse {
  return {
    id: 1,
    catalogItemId: 42,
    catalogItemCode: 'GROOMING',
    catalogItemName: 'Peluquería',
    hintRevision: 3,
    hintText: 'qué es\n\nseñales\n\nno aplica',
    publishedAt: '2026-03-03T10:00:00',
    publishedBySystemUserId: 7,
    supersededAt: null,
    supersededBySystemUserId: null,
    current: true,
    createdDate: '2026-03-03T10:00:00',
    ...over,
  }
}

describe('la etiqueta de la revisión se decide por POSICIÓN, no por aritmética', () => {
  it('la vigente es «Vigente» esté donde esté', () => {
    expect(revisionState(revision({ current: true }), 0)).toBe('current')
    expect(REVISION_STATE_LABEL.current).toBe('Vigente')
  })

  it('la de arriba del todo sin vigencia es una RETIRADA: nadie la sucedió', () => {
    const retirada = revision({ current: false, supersededAt: '2026-04-01T09:00:00' })
    expect(revisionState(retirada, 0)).toBe('retired')
    expect(REVISION_STATE_LABEL.retired).toBe('Retirada')
  })

  it('cualquier otra sin vigencia es un REEMPLAZO: hay una más nueva encima', () => {
    const reemplazada = revision({ current: false, supersededAt: '2026-04-01T09:00:00' })
    expect(revisionState(reemplazada, 1)).toBe('superseded')
    expect(revisionState(reemplazada, 5)).toBe('superseded')
    expect(REVISION_STATE_LABEL.superseded).toBe('Reemplazada')
  })

  it('no mira `hintRevision`: una numeración con saltos no cambia la etiqueta', () => {
    // Si la regla fuera «existe la N+1», un historial con un hueco —o el que
    // deja una retirada seguida de una publicación nueva— la rompería.
    const conSalto = revision({
      current: false,
      hintRevision: 9,
      supersededAt: '2026-04-01T09:00:00',
    })
    expect(revisionState(conSalto, 0)).toBe('retired')
    expect(revisionState(conSalto, 1)).toBe('superseded')
  })
})

describe('el pie de procedencia dice la verdad en los cuatro casos', () => {
  it('vigente: publicada y punto', () => {
    expect(provenanceText(revision(), null)).toBe(
      'Publicada el 03/03/2026 por usuario #7. Vigente.',
    )
  })

  it('retirada con firma: dice quién y cuándo', () => {
    const h = revision({
      current: false,
      supersededAt: '2026-04-01T09:00:00',
      supersededBySystemUserId: 12,
    })
    expect(provenanceText(h, null)).toBe(
      'Publicada el 03/03/2026 por usuario #7 · retirada el 01/04/2026 por usuario #12.',
    )
  })

  it('retirada SIN firma: dice «No consta quién», no inventa un firmante', () => {
    const h = revision({
      current: false,
      supersededAt: '2026-04-01T09:00:00',
      supersededBySystemUserId: null,
    })
    const texto = provenanceText(h, null)
    expect(texto).toBe(
      'Publicada el 03/03/2026 por usuario #7 · retirada el 01/04/2026. No consta quién: la firma de retirada no existía cuando ocurrió.',
    )
    // Los tres errores que este caso invita a cometer: pintar `usuario #null`,
    // esconder la línea, o caer al firmante de publicación «porque es el que hay».
    expect(texto).not.toContain('null')
    expect(texto).not.toContain('retirada el 01/04/2026 por usuario #7')
  })

  it('el caso imposible se canta como dato incoherente y no se rellena', () => {
    // `chk_catalog_item_ai_hints_superseded_by` lo impide en la base de datos.
    const h = revision({ supersededAt: null, supersededBySystemUserId: 12 })
    expect(provenanceText(h, null)).toBe('Dato incoherente: figura firmante de retirada sin fecha.')
  })

  it('cuando el firmante es quien mira, lo dice', () => {
    expect(provenanceText(revision(), 7)).toContain('por tú (usuario #7)')
    expect(provenanceText(revision(), 99)).toContain('por usuario #7')
  })
})
