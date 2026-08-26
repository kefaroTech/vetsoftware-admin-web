import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useLoaderStore } from '@/stores/loader.store'
import { useToastStore } from '@/stores/toast.store'

/**
 * Los dos stores transversales de la interfaz. Ninguno tiene lógica de negocio
 * y por eso nadie los mira, pero los dos pueden dejar la aplicación inutilizable
 * sin lanzar un solo error: el loader, con el velo puesto para siempre (es la
 * mitad de FE-04); los avisos, acumulándose sin irse nunca.
 *
 * Este archivo se mantiene idéntico en los dos fronts (TR-02).
 */

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('loader global', () => {
  it('no se muestra si la petición responde antes del retardo', () => {
    // Las peticiones rápidas no deben provocar un parpadeo del velo.
    const loader = useLoaderStore()

    loader.push()
    vi.advanceTimersByTime(100)
    loader.pop()
    vi.advanceTimersByTime(1_000)

    expect(loader.visible).toBe(false)
    expect(loader.pending).toBe(0)
  })

  it('se muestra cuando la petición supera el retardo', () => {
    const loader = useLoaderStore()

    loader.push()
    vi.advanceTimersByTime(250)

    expect(loader.visible).toBe(true)
  })

  it('una vez visible permanece un mínimo para no parpadear', () => {
    const loader = useLoaderStore()
    loader.push()
    vi.advanceTimersByTime(250)

    loader.pop()

    expect(loader.visible).toBe(true)
    vi.advanceTimersByTime(300)
    expect(loader.visible).toBe(false)
  })

  it('una vez visible, ocultar siempre respeta la ventana de gracia', () => {
    // Aunque la petición ya llevaba visible de sobra el mínimo, el ocultado
    // pasa por HIDE_GRACE_MS (150 ms) antes de aplicarse: es esa ventana la
    // que le da tiempo a una petición siguiente a cancelar el ocultado, que
    // es justo lo que evita el parpadeo entre peticiones secuenciales.
    const loader = useLoaderStore()
    loader.push()
    vi.advanceTimersByTime(250)
    expect(loader.visible).toBe(true)

    vi.advanceTimersByTime(2_000)
    loader.pop()

    expect(loader.visible).toBe(true)
    vi.advanceTimersByTime(150)
    expect(loader.visible).toBe(false)
  })

  it('dos peticiones secuenciales no producen parpadeo', () => {
    // El caso real reportado: una pantalla encadena `await peticionA();
    // await peticionB()`. Entre una y otra, `pending` pasa por 0, pero el
    // velo no debe apagarse ni un instante si la siguiente petición llega
    // dentro de la ventana de gracia.
    const loader = useLoaderStore()
    loader.push()
    vi.advanceTimersByTime(250)
    expect(loader.visible).toBe(true)

    loader.pop()
    vi.advanceTimersByTime(100)
    expect(loader.visible).toBe(true)

    loader.push()
    vi.advanceTimersByTime(1_000)

    expect(loader.visible).toBe(true)
    expect(loader.pending).toBe(1)
  })

  it('cuenta peticiones concurrentes y solo se retira con la última', () => {
    // Si el velo se retirara con el primer pop, la pantalla quedaría operable
    // con datos a medio cargar.
    const loader = useLoaderStore()

    loader.push()
    loader.push()
    loader.push()
    vi.advanceTimersByTime(250)

    loader.pop()
    loader.pop()
    expect(loader.pending).toBe(1)
    expect(loader.visible).toBe(true)

    loader.pop()
    vi.advanceTimersByTime(1_000)
    expect(loader.pending).toBe(0)
    expect(loader.visible).toBe(false)
  })

  it('un pop de más no deja el contador en negativo', () => {
    // Un contador negativo haría falta un push extra para volver a mostrar el
    // velo, y la siguiente carga pasaría desapercibida.
    const loader = useLoaderStore()

    loader.pop()
    loader.pop()

    expect(loader.pending).toBe(0)
  })

  it('una petición que llega mientras se retira el velo lo mantiene', () => {
    // Encadenar dos llamadas —guardar y recargar la lista— no debe producir un
    // parpadeo entre ambas.
    const loader = useLoaderStore()
    loader.push()
    vi.advanceTimersByTime(250)
    loader.pop()

    loader.push()
    vi.advanceTimersByTime(1_000)

    expect(loader.visible).toBe(true)
    expect(loader.pending).toBe(1)
  })

  it('cancelar antes del retardo no deja un temporizador colgado', () => {
    const loader = useLoaderStore()

    loader.push()
    loader.pop()
    vi.advanceTimersByTime(5_000)

    expect(loader.visible).toBe(false)
  })
})

describe('avisos', () => {
  it('apila el aviso con su tipo y su título', () => {
    const store = useToastStore()

    store.push('success', 'Guardado')

    expect(store.toasts).toHaveLength(1)
    expect(store.toasts[0]).toMatchObject({ kind: 'success', title: 'Guardado' })
  })

  it('el mensaje es opcional: el título solo ya dice algo', () => {
    const store = useToastStore()

    store.push('info', 'Sincronizando')

    expect(store.toasts[0].message).toBeUndefined()
  })

  it('cada aviso lleva un id distinto', () => {
    // El id es lo que identifica al aviso para cerrarlo. Dos iguales harían que
    // cerrar uno cerrase el otro.
    const store = useToastStore()

    store.push('info', 'Uno')
    store.push('info', 'Dos')
    store.push('info', 'Tres')

    expect(new Set(store.toasts.map((t) => t.id)).size).toBe(3)
  })

  it('se retira solo a los 3 segundos', () => {
    const store = useToastStore()

    store.push('success', 'Guardado')
    vi.advanceTimersByTime(2_999)
    expect(store.toasts).toHaveLength(1)

    vi.advanceTimersByTime(1)
    expect(store.toasts).toHaveLength(0)
  })

  it('una duración explícita manda sobre la de por defecto', () => {
    // TR-05: un aviso con traza dura 9 s porque alguien puede querer copiarla, y
    // tres segundos no dan para leer un identificador de 32 caracteres.
    const store = useToastStore()

    store.push('error', 'Falló el guardado', 'Detalle', 9_000, 'abc123')
    vi.advanceTimersByTime(8_999)
    expect(store.toasts).toHaveLength(1)
    expect(store.toasts[0].traceId).toBe('abc123')

    vi.advanceTimersByTime(1)
    expect(store.toasts).toHaveLength(0)
  })

  it('duración cero deja el aviso hasta que alguien lo cierre', () => {
    const store = useToastStore()

    store.push('error', 'Requiere tu atención', undefined, 0)
    vi.advanceTimersByTime(60_000)

    expect(store.toasts).toHaveLength(1)
  })

  it('cada aviso cuenta su propio tiempo', () => {
    // Con un solo temporizador compartido, el segundo aviso se iría antes de que
    // al usuario le diera tiempo a leerlo.
    const store = useToastStore()

    store.push('info', 'Primero')
    vi.advanceTimersByTime(2_000)
    store.push('info', 'Segundo')

    vi.advanceTimersByTime(2_000)
    expect(store.toasts.map((t) => t.title)).toEqual(['Segundo'])

    vi.advanceTimersByTime(2_000)
    expect(store.toasts).toHaveLength(0)
  })

  it('cerrarlo a mano lo quita sin tocar los demás', () => {
    const store = useToastStore()
    store.push('info', 'Uno')
    store.push('info', 'Dos')
    const idPrimero = store.toasts[0].id

    store.dismiss(idPrimero)

    expect(store.toasts.map((t) => t.title)).toEqual(['Dos'])
  })

  it('cerrar dos veces el mismo aviso no arrastra a otro', () => {
    const store = useToastStore()
    store.push('info', 'Uno')
    store.push('info', 'Dos')
    const idPrimero = store.toasts[0].id

    store.dismiss(idPrimero)
    store.dismiss(idPrimero)

    expect(store.toasts.map((t) => t.title)).toEqual(['Dos'])
  })
})
