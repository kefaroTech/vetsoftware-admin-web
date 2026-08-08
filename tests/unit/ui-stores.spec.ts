import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useLoaderStore } from '@/stores/loader.store'
import { useNotificationStore } from '@/stores/notification.store'
import { useConfirmDialogStore } from '@/stores/confirmDialog.store'

/**
 * Los tres stores transversales de la interfaz. Ninguno tiene lógica de negocio
 * y por eso nadie los mira, pero los tres pueden dejar la aplicación
 * inutilizable sin lanzar un solo error:
 *
 *  - el loader, con el velo puesto para siempre (es la mitad de FE-04);
 *  - el diálogo de confirmación, con una promesa que no resuelve nunca y una
 *    acción del usuario que se queda a medias sin decir nada;
 *  - las notificaciones, acumulando avisos que no se van.
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

  it('si ya llevaba visible más del mínimo, se retira de inmediato', () => {
    // Una petición larga ya cumplió de sobra el tiempo mínimo: alargar el velo
    // otros 300 ms al terminar solo añadiría latencia percibida.
    const loader = useLoaderStore()
    loader.push()
    vi.advanceTimersByTime(250)
    expect(loader.visible).toBe(true)

    vi.advanceTimersByTime(2_000)
    loader.pop()

    expect(loader.visible).toBe(false)
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

describe('notificaciones', () => {
  it('apila el aviso con su tipo', () => {
    const store = useNotificationStore()

    store.notify('Guardado', 'success')

    expect(store.notifications).toHaveLength(1)
    expect(store.notifications[0]).toMatchObject({ message: 'Guardado', type: 'success' })
  })

  it('el tipo por defecto es informativo', () => {
    const store = useNotificationStore()

    store.notify('Algo pasó')

    expect(store.notifications[0].type).toBe('info')
  })

  it('cada aviso lleva un id distinto', () => {
    // El id es lo que identifica al aviso para cerrarlo. Dos iguales harían que
    // cerrar uno cerrase el otro.
    const store = useNotificationStore()

    store.notify('Uno')
    store.notify('Dos')
    store.notify('Tres')

    expect(new Set(store.notifications.map((n) => n.id)).size).toBe(3)
  })

  it('se retira solo a los 4 segundos', () => {
    const store = useNotificationStore()

    store.notify('Guardado')
    vi.advanceTimersByTime(3_999)
    expect(store.notifications).toHaveLength(1)

    vi.advanceTimersByTime(1)
    expect(store.notifications).toHaveLength(0)
  })

  it('cada aviso cuenta su propio tiempo', () => {
    // Con un solo temporizador compartido, el segundo aviso se iría antes de
    // que al usuario le diera tiempo a leerlo.
    const store = useNotificationStore()

    store.notify('Primero')
    vi.advanceTimersByTime(2_000)
    store.notify('Segundo')

    vi.advanceTimersByTime(2_000)
    expect(store.notifications.map((n) => n.message)).toEqual(['Segundo'])

    vi.advanceTimersByTime(2_000)
    expect(store.notifications).toHaveLength(0)
  })

  it('cerrarlo a mano lo quita sin tocar los demás', () => {
    const store = useNotificationStore()
    store.notify('Uno')
    store.notify('Dos')
    const idPrimero = store.notifications[0].id

    store.dismiss(idPrimero)

    expect(store.notifications.map((n) => n.message)).toEqual(['Dos'])
  })

  it('cerrar dos veces el mismo aviso no arrastra a otro', () => {
    // El temporizador dispara `dismiss` sobre un id ya cerrado a mano. Si el
    // borrado fuera por posición en vez de por id, se llevaría por delante el
    // aviso siguiente.
    const store = useNotificationStore()
    store.notify('Uno')
    store.notify('Dos')
    const idPrimero = store.notifications[0].id

    store.dismiss(idPrimero)
    store.dismiss(idPrimero)

    expect(store.notifications.map((n) => n.message)).toEqual(['Dos'])
  })

  it('cerrar un id inexistente no rompe nada', () => {
    const store = useNotificationStore()
    store.notify('Uno')

    expect(() => store.dismiss(9_999)).not.toThrow()
    expect(store.notifications).toHaveLength(1)
  })
})

describe('diálogo de confirmación', () => {
  it('aceptar resuelve a verdadero', async () => {
    const store = useConfirmDialogStore()

    const respuesta = store.confirm('¿Eliminar la especie?')
    expect(store.isOpen).toBe(true)
    expect(store.message).toBe('¿Eliminar la especie?')
    store.accept()

    await expect(respuesta).resolves.toBe(true)
    expect(store.isOpen).toBe(false)
  })

  it('cancelar resuelve a falso', async () => {
    const store = useConfirmDialogStore()

    const respuesta = store.confirm('¿Eliminar?')
    store.cancel()

    await expect(respuesta).resolves.toBe(false)
    expect(store.isOpen).toBe(false)
  })

  it('aceptar dos veces no vuelve a resolver', async () => {
    // Un doble clic en "Aceptar" no debe ejecutar la acción destructiva dos
    // veces: el segundo `accept` ya no tiene a quién resolver.
    const store = useConfirmDialogStore()
    const respuesta = store.confirm('¿Eliminar?')

    store.accept()
    expect(() => store.accept()).not.toThrow()

    await expect(respuesta).resolves.toBe(true)
  })

  it('cancelar después de aceptar no cambia la respuesta ya dada', async () => {
    const store = useConfirmDialogStore()
    const respuesta = store.confirm('¿Eliminar?')

    store.accept()
    store.cancel()

    await expect(respuesta).resolves.toBe(true)
  })

  it('DEFECTO: un segundo confirm deja la primera promesa sin resolver nunca', async () => {
    // `confirm` pisa el resolver anterior. Quien esperaba la primera respuesta
    // se queda esperando para siempre: si ese `await` estaba dentro de un
    // `try/finally` que apaga un spinner o libera un bloqueo, no se ejecuta
    // nunca y no hay ningún error que lo delate.
    const store = useConfirmDialogStore()
    let primeraResuelta = false
    const primera = store.confirm('¿Eliminar la especie?')
    primera.then(() => {
      primeraResuelta = true
    })
    const segunda = store.confirm('¿Eliminar la raza?')

    store.accept()

    await expect(segunda).resolves.toBe(true)
    // Esperarla colgaría la prueba, así que se comprueba que su `then` no llegó
    // a correr después de vaciar la cola de microtareas.
    await Promise.resolve()
    await Promise.resolve()

    expect(primeraResuelta).toBe(false)
  })
})
