import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  AxiosError,
  CanceledError,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'
import {
  http,
  DEFAULT_TIMEOUT_MS,
  getProblemDetailMessage,
  setRefreshHandler,
} from '@/services/http/http.client'
import { storageService } from '@/services/storage/storage.service'
import { useLoaderStore } from '@/stores/loader.store'

/**
 * El contrato del cliente HTTP no es "hacer peticiones": es garantizar que el
 * loader global vuelva SIEMPRE a cero. El interceptor de request lo incrementa
 * en cada llamada y solo el de response lo decrementa, así que cualquier camino
 * que no llegue a una respuesta —cuelgue, corte de red, cancelación— deja el
 * velo de carga puesto y la interfaz sin salida salvo recargar.
 *
 * Estas pruebas recorren cada uno de esos caminos y comprueban lo mismo al
 * final de todos: `pending === 0`.
 */

/** Respuesta correcta mínima con la forma que espera axios. */
function ok(config: InternalAxiosRequestConfig, data: unknown = {}): AxiosResponse {
  return { data, status: 200, statusText: 'OK', headers: {}, config }
}

/** Error sin respuesta del servidor (cable desconectado, DNS caído, CORS). */
function networkError(config: InternalAxiosRequestConfig): AxiosError {
  return new AxiosError('Network Error', AxiosError.ERR_NETWORK, config)
}

/** Lo que axios produce cuando vence `timeout`. */
function timeoutError(config: InternalAxiosRequestConfig): AxiosError {
  return new AxiosError('timeout exceeded', AxiosError.ECONNABORTED, config)
}

/** Error con respuesta del servidor. */
function httpError(
  config: InternalAxiosRequestConfig,
  status: number,
  data: unknown = {},
): AxiosError {
  const response = { data, status, statusText: '', headers: {}, config } as AxiosResponse
  return new AxiosError(
    `Request failed with status code ${status}`,
    String(status),
    config,
    null,
    response,
  )
}

/** Sustituye el transporte real por uno controlado, dejando los interceptores intactos. */
function useAdapter(adapter: (config: InternalAxiosRequestConfig) => Promise<AxiosResponse>) {
  const spy = vi.fn(adapter)
  http.defaults.adapter = spy as never
  return spy
}

let loader: ReturnType<typeof useLoaderStore>

beforeEach(() => {
  loader = useLoaderStore()
})

describe('cliente HTTP', () => {
  it('nace con timeout: ninguna petición puede colgarse para siempre', () => {
    // Es la causa raíz de FE-04. Sin este valor, el resto de garantías de abajo
    // no sirven de nada: la promesa nunca se resuelve y ningún interceptor corre.
    expect(http.defaults.timeout).toBe(DEFAULT_TIMEOUT_MS)
  })
})

describe('loader global', () => {
  it('vuelve a cero tras una respuesta correcta', async () => {
    useAdapter(async (config) => ok(config))

    await http.get('/cualquier-cosa')

    expect(loader.pending).toBe(0)
  })

  it('vuelve a cero cuando la red falla', async () => {
    useAdapter(async (config) => {
      throw networkError(config)
    })

    await expect(http.post('/cualquier-cosa', {})).rejects.toThrow()

    expect(loader.pending).toBe(0)
  })

  it('vuelve a cero cuando vence el timeout', async () => {
    // El caso que la auditoría describe: la petición se cuelga. Ahora termina en
    // error y el velo se retira, en vez de quedarse hasta recargar la página.
    useAdapter(async (config) => {
      throw timeoutError(config)
    })

    await expect(http.post('/cualquier-cosa', {})).rejects.toThrow()

    expect(loader.pending).toBe(0)
  })

  it('vuelve a cero cuando el llamador cancela', async () => {
    // Axios adjunta la config al cancelar (`new CanceledError(null, config, req)`
    // en el adaptador), y es esa config la que lleva la marca del loader. Un
    // CanceledError sin config no representa ninguna cancelación real.
    useAdapter(async (config) => {
      throw new CanceledError(undefined, config)
    })

    await expect(http.get('/cualquier-cosa')).rejects.toThrow(CanceledError)

    expect(loader.pending).toBe(0)
  })

  it('queda balanceado tras varias peticiones concurrentes con distinto desenlace', async () => {
    useAdapter(async (config) => {
      if (config.url === '/falla') throw networkError(config)
      return ok(config)
    })

    await Promise.allSettled([
      http.post('/ok', {}),
      http.post('/falla', {}),
      http.post('/ok', {}),
      http.post('/falla', {}),
    ])

    expect(loader.pending).toBe(0)
  })
})

describe('reintentos', () => {
  it('reintenta un GET dos veces ante 5xx y deja el loader en cero', async () => {
    const adapter = useAdapter(async (config) => {
      throw httpError(config, 503)
    })

    await expect(http.get('/informes')).rejects.toThrow()

    expect(adapter).toHaveBeenCalledTimes(3) // original + 2 reintentos
    expect(loader.pending).toBe(0)
  })

  it('no reintenta un POST: no es idempotente', async () => {
    // Reintentar un POST que sí llegó al servidor duplicaría la operación.
    const adapter = useAdapter(async (config) => {
      throw httpError(config, 503)
    })

    await expect(http.post('/ventas', {})).rejects.toThrow()

    expect(adapter).toHaveBeenCalledTimes(1)
  })

  it('no reintenta ante timeout', async () => {
    // Reintentar un cuelgue multiplicaría por tres el tiempo con la interfaz
    // bloqueada — exactamente lo contrario de lo que persigue este cambio.
    const adapter = useAdapter(async (config) => {
      throw timeoutError(config)
    })

    await expect(http.get('/informes')).rejects.toThrow()

    expect(adapter).toHaveBeenCalledTimes(1)
  })

  it('no reintenta ante un error del cliente', async () => {
    const adapter = useAdapter(async (config) => {
      throw httpError(config, 422)
    })

    await expect(http.get('/informes')).rejects.toThrow()

    expect(adapter).toHaveBeenCalledTimes(1)
  })

  it('devuelve la respuesta buena si el reintento acierta', async () => {
    let intentos = 0
    useAdapter(async (config) => {
      intentos += 1
      if (intentos === 1) throw networkError(config)
      return ok(config, { ok: true })
    })

    const { data } = await http.get('/informes')

    expect(data).toEqual({ ok: true })
    expect(loader.pending).toBe(0)
  })
})

/**
 * El otro camino que atraviesa el mismo interceptor: el 401. Es la lógica sin
 * cubrir de mayor riesgo que dejó pendiente el PR de cobertura, y comparte con
 * el loader la propiedad de fallar en silencio — si el reintento tras refrescar
 * se rompiera, el usuario vería sesiones que caen sin motivo aparente.
 */
describe('401 y renovación de sesión', () => {
  beforeEach(() => {
    // El redirect es una navegación dura; jsdom no la implementa, así que se
    // observa sobre un doble en vez de dejar que reviente.
    vi.stubGlobal('location', { pathname: '/pacientes', href: '' })
    storageService.setToken('access-viejo')
    storageService.setRefreshToken('refresh-vigente')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    setRefreshHandler(async () => null)
    localStorage.clear()
  })

  it('refresca una vez y reintenta la petición con el token nuevo', async () => {
    // El handler real (auth.store) persiste la sesión antes de resolver, y de eso
    // depende el reintento: al reenviar la petición, el interceptor de request
    // relee el token del storage. Un doble que no persistiera reintentaría con el
    // token viejo — y la prueba pasaría por el motivo equivocado.
    const refresh = vi.fn(async () => {
      storageService.setToken('access-nuevo')
      return 'access-nuevo'
    })
    setRefreshHandler(refresh)
    let intentos = 0
    useAdapter(async (config) => {
      intentos += 1
      if (intentos === 1) throw httpError(config, 401, { code: 'TOKEN_EXPIRED' })
      expect(config.headers.Authorization).toBe('Bearer access-nuevo')
      return ok(config, { pacientes: [] })
    })

    const { data } = await http.get('/pacientes')

    expect(refresh).toHaveBeenCalledTimes(1)
    expect(data).toEqual({ pacientes: [] })
    expect(loader.pending).toBe(0)
  })

  it('no reintenta dos veces la misma petición aunque el reintento vuelva a dar 401', async () => {
    // Sin la marca `_retry` esto sería un bucle infinito de refrescos.
    const refresh = vi.fn(async () => 'access-nuevo')
    setRefreshHandler(refresh)
    useAdapter(async (config) => {
      throw httpError(config, 401, { code: 'TOKEN_EXPIRED' })
    })

    await expect(http.get('/pacientes')).rejects.toThrow()

    expect(refresh).toHaveBeenCalledTimes(1)
    expect(location.href).toBe('/login')
    expect(loader.pending).toBe(0)
  })

  it('manda al login sin intentar refrescar cuando el token es inválido, no expirado', async () => {
    const refresh = vi.fn(async () => 'access-nuevo')
    setRefreshHandler(refresh)
    useAdapter(async (config) => {
      throw httpError(config, 401, { code: 'TOKEN_INVALID' })
    })

    await expect(http.get('/pacientes')).rejects.toThrow()

    expect(refresh).not.toHaveBeenCalled()
    expect(storageService.getToken()).toBeNull()
    expect(storageService.getRefreshToken()).toBeNull()
    expect(location.href).toBe('/login')
  })

  it('no recarga si el 401 llega estando ya en el login', async () => {
    vi.stubGlobal('location', { pathname: '/login', href: '' })
    useAdapter(async (config) => {
      throw httpError(config, 401, { code: 'TOKEN_INVALID' })
    })

    await expect(http.get('/pacientes')).rejects.toThrow()

    expect(location.href).toBe('')
  })

  it('deja pasar el 401 de las llamadas de auth sin tocar la sesión', async () => {
    // Un login con credenciales malas responde 401: refrescar o redirigir ahí
    // sería recursión y pérdida del mensaje de error del formulario.
    const refresh = vi.fn(async () => 'access-nuevo')
    setRefreshHandler(refresh)
    useAdapter(async (config) => {
      throw httpError(config, 401, { code: 'BAD_CREDENTIALS' })
    })

    await expect(http.post('/auth/login/employee', {})).rejects.toThrow()

    expect(refresh).not.toHaveBeenCalled()
    expect(storageService.getToken()).toBe('access-viejo')
    expect(location.href).toBe('')
  })
})

describe('getProblemDetailMessage', () => {
  it.each([
    [
      'el detail del ProblemDetail',
      { detail: 'Saldo insuficiente', title: 'Conflicto' },
      'Saldo insuficiente',
    ],
    ['el title cuando no hay detail', { title: 'Conflicto' }, 'Conflicto'],
  ])('devuelve %s', (_caso, data, esperado) => {
    const error = httpError({ headers: {} } as InternalAxiosRequestConfig, 409, data)

    expect(getProblemDetailMessage(error)).toBe(esperado)
  })

  it('cae al mensaje de axios cuando el cuerpo no es un ProblemDetail', () => {
    const error = new AxiosError('Network Error', AxiosError.ERR_NETWORK)

    expect(getProblemDetailMessage(error)).toBe('Network Error')
  })

  it('usa el texto de respaldo ante algo que no es un error de axios', () => {
    expect(getProblemDetailMessage(new Error('vaya'), 'Algo salió mal')).toBe('Algo salió mal')
  })
})
