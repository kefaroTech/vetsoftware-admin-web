import { describe, it, expect } from 'vitest'
import { AxiosError, AxiosHeaders } from 'axios'
import { getTraceId } from '@/services/http/http.client'

/**
 * TR-05. El backend emite `X-Trace-Id` en cada respuesta y la declara en `exposedHeaders` del
 * CORS para que el front la lea. Nadie la leía, así que ante un «se quedó cargando» soporte no
 * tenía forma de encontrar la traza.
 *
 * <p>Lo que se protege aquí es la precedencia: la cabecera manda sobre el `traceId` del cuerpo,
 * porque existe también en las respuestas que no traen `ProblemDetail` —un 502 del proxy, un
 * timeout—, que son justo las peores de diagnosticar.
 */
function errorCon(headers: Record<string, string>, data?: unknown): AxiosError {
  const error = new AxiosError('fallo')
  error.response = {
    status: 500,
    statusText: 'Internal Server Error',
    headers: new AxiosHeaders(headers),
    config: { headers: new AxiosHeaders() },
    data,
  }
  return error
}

describe('getTraceId', () => {
  it('lee la cabecera que el backend expone', () => {
    expect(getTraceId(errorCon({ 'x-trace-id': 'abc123' }))).toBe('abc123')
  })

  it('prefiere la cabecera al traceId del cuerpo', () => {
    const error = errorCon({ 'x-trace-id': 'de-la-cabecera' }, { traceId: 'del-cuerpo' })
    expect(getTraceId(error)).toBe('de-la-cabecera')
  })

  it('cae al traceId del ProblemDetail cuando no hay cabecera', () => {
    expect(getTraceId(errorCon({}, { traceId: 'del-cuerpo' }))).toBe('del-cuerpo')
  })

  it('devuelve undefined cuando no hay ninguno de los dos', () => {
    expect(getTraceId(errorCon({}, { detail: 'sin traza' }))).toBeUndefined()
  })

  it('ignora una cabecera vacía en vez de mostrar un identificador en blanco', () => {
    expect(getTraceId(errorCon({ 'x-trace-id': '   ' }))).toBeUndefined()
  })

  it('no revienta con algo que no es un error de axios', () => {
    expect(getTraceId(new Error('cualquiera'))).toBeUndefined()
    expect(getTraceId(null)).toBeUndefined()
  })
})

describe('traceparent', () => {
  it('tiene el formato del estándar W3C', async () => {
    const { nextTraceparent } = await import('@/services/telemetry/trace')
    const { traceId, traceparent } = nextTraceparent()
    expect(traceparent).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/)
    expect(traceparent).toContain(traceId)
  })

  it('genera uno distinto por petición', async () => {
    const { nextTraceparent } = await import('@/services/telemetry/trace')
    expect(nextTraceparent().traceId).not.toBe(nextTraceparent().traceId)
  })

  it('prefiere el id generado por el cliente al de la respuesta', () => {
    const error = errorCon({ 'x-trace-id': 'del-servidor' })
    error.config = { headers: new AxiosHeaders(), _traceId: 'del-cliente' }
    expect(getTraceId(error)).toBe('del-cliente')
  })

  it('sirve el id aunque la petición muriera sin respuesta', () => {
    // El caso que dio nombre al hallazgo: «se quedó cargando» y no hay cabecera que leer.
    const error = new AxiosError('timeout')
    error.config = { headers: new AxiosHeaders(), _traceId: 'sin-respuesta' }
    expect(getTraceId(error)).toBe('sin-respuesta')
  })
})
