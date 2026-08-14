import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { http, getTraceId } from '@/services/http/http.client'

/**
 * TR-05. Comprobar el generador no basta: lo que importa es que la cabecera **salga de verdad**
 * en cada petición. Estas pruebas no piden nada por red — sustituyen el adaptador de axios por
 * uno que devuelve la propia configuración, que es el único punto donde se puede mirar lo que se
 * habría enviado.
 *
 * <p>El backend ya tiene su contraparte (`TraceparentPropagationIT`): allí se comprueba que
 * adopta este identificador y lo devuelve en `X-Trace-Id`. Las dos mitades juntas son lo que
 * garantiza que navegador y servidor comparten una sola traza.
 */
let enviada: InternalAxiosRequestConfig

// El interceptor incrementa el velo de carga, que vive en un store de Pinia.
beforeAll(() => setActivePinia(createPinia()))

beforeEach(() => {
  http.defaults.adapter = async (config) => {
    enviada = config as InternalAxiosRequestConfig
    return { data: {}, status: 200, statusText: 'OK', headers: {}, config }
  }
})

describe('el interceptor manda traceparent', () => {
  it('adjunta la cabecera con el formato W3C en una petición real', async () => {
    await http.get('/lo-que-sea')
    expect(enviada.headers.get('traceparent')).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/)
  })

  it('el trace-id de la cabecera es el que queda accesible para mostrarlo', async () => {
    await http.get('/lo-que-sea')
    const cabecera = String(enviada.headers.get('traceparent'))
    expect(cabecera).toContain(enviada._traceId!)
  })

  it('cada petición lleva la suya', async () => {
    await http.get('/una')
    const primera = enviada._traceId
    await http.get('/otra')
    expect(enviada._traceId).not.toBe(primera)
  })

  it('el identificador sobrevive a un error sin respuesta', async () => {
    // El caso que da nombre al hallazgo: la petición muere y no hay cabecera que leer.
    // Un `AxiosError` de verdad: `getTraceId` comprueba `instanceof`, así que un doble hecho a
    // mano pasaría de largo y la prueba estaría midiendo otra cosa.
    http.defaults.adapter = async (config) => {
      throw new AxiosError('Network Error', AxiosError.ERR_NETWORK, config)
    }
    const fallo = await http.get('/se-cae').catch((e: unknown) => e)
    expect(getTraceId(fallo)).toMatch(/^[0-9a-f]{32}$/)
  })
})
