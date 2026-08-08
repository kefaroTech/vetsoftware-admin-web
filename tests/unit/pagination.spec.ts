import { describe, it, expect } from 'vitest'
import { usePagination } from '@/composables/usePagination'

/**
 * La paginación de todas las listas del panel. No hace peticiones: solo calcula
 * qué página se puede pedir. Los errores aquí no revientan nada, que es lo que
 * los hace difíciles de ver — se manifiestan como una tabla vacía, un botón
 * "siguiente" que no lleva a ninguna parte o un contador que no cuadra con lo
 * que el backend devolvió.
 */

describe('estado inicial', () => {
  it('arranca en la primera página con el tamaño por defecto', () => {
    const p = usePagination()

    expect(p.page.value).toBe(0)
    expect(p.size.value).toBe(10)
    expect(p.totalElements.value).toBe(0)
  })

  it('acepta un tamaño de página propio', () => {
    expect(usePagination(25).size.value).toBe(25)
  })

  it('cada llamada devuelve un estado independiente', () => {
    // Dos tablas en la misma pantalla no pueden compartir página. Si el estado
    // fuera module-scoped, paginar una movería la otra.
    const a = usePagination()
    const b = usePagination()

    a.goTo(3)

    expect(b.page.value).toBe(0)
  })
})

describe('total de páginas', () => {
  it.each([
    [0, 10, 0],
    [1, 10, 1],
    [10, 10, 1],
    [11, 10, 2],
    [99, 10, 10],
    [100, 10, 10],
    [101, 10, 11],
  ])('%i elementos de %i por página → %i páginas', (total, size, esperado) => {
    const p = usePagination(size)
    p.totalElements.value = total

    expect(p.totalPages.value).toBe(esperado)
  })

  it('se recalcula al cambiar el tamaño de página', () => {
    const p = usePagination(10)
    p.totalElements.value = 100
    expect(p.totalPages.value).toBe(10)

    p.size.value = 25

    expect(p.totalPages.value).toBe(4)
  })
})

describe('navegación', () => {
  it('avanza y retrocede dentro del rango', () => {
    const p = usePagination(10)
    p.totalElements.value = 35

    p.next()
    p.next()
    expect(p.page.value).toBe(2)

    p.prev()
    expect(p.page.value).toBe(1)
  })

  it('no pasa de la última página', () => {
    // Pedir una página que no existe devuelve una lista vacía y deja la tabla en
    // blanco sin explicación.
    const p = usePagination(10)
    p.totalElements.value = 25

    p.next()
    p.next()
    p.next()
    p.next()

    expect(p.page.value).toBe(2)
    expect(p.hasNext.value).toBe(false)
  })

  it('no retrocede antes de la primera', () => {
    const p = usePagination()
    p.totalElements.value = 100

    p.prev()

    expect(p.page.value).toBe(0)
  })

  it('sin resultados no hay ni anterior ni siguiente', () => {
    const p = usePagination()
    p.totalElements.value = 0

    expect(p.hasPrev.value).toBe(false)
    expect(p.hasNext.value).toBe(false)
    p.next()
    expect(p.page.value).toBe(0)
  })

  it('con una sola página no hay siguiente', () => {
    const p = usePagination(10)
    p.totalElements.value = 7

    expect(p.hasNext.value).toBe(false)
    expect(p.hasPrev.value).toBe(false)
  })

  it('reset vuelve a la primera página sin tocar el total', () => {
    // Es lo que se llama al aplicar un filtro: los resultados cambian, pero
    // quedarse en la página 5 de un resultado de 2 páginas muestra una tabla
    // vacía.
    const p = usePagination(10)
    p.totalElements.value = 100
    p.goTo(5)

    p.reset()

    expect(p.page.value).toBe(0)
    expect(p.totalElements.value).toBe(100)
  })
})

describe('bordes que el composable no protege', () => {
  it('goTo no valida el rango: acepta una página que no existe', () => {
    // Documentado, no aprobado. `next`/`prev` sí respetan los límites, pero
    // `goTo` —que es lo que usa el selector numérico de página— no. Quien lo
    // llame tiene que acotar el valor.
    const p = usePagination(10)
    p.totalElements.value = 25

    p.goTo(99)

    expect(p.page.value).toBe(99)
    expect(p.hasNext.value).toBe(false)
    // Al menos se puede salir hacia atrás; no queda atrapada.
    expect(p.hasPrev.value).toBe(true)
  })

  it('goTo acepta páginas negativas', () => {
    const p = usePagination(10)
    p.totalElements.value = 25

    p.goTo(-5)

    expect(p.page.value).toBe(-5)
  })

  it('un tamaño de página 0 produce infinitas páginas', () => {
    // División por cero. No debería poder llegar desde la interfaz, pero si un
    // día un selector permitiera 0, el contador mostraría "Infinity".
    const p = usePagination(0)
    p.totalElements.value = 25

    expect(p.totalPages.value).toBe(Number.POSITIVE_INFINITY)
  })
})
