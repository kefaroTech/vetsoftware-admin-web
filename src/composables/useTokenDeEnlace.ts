import { useRoute, useRouter } from 'vue-router'

/**
 * EL TOKEN DEL CORREO, FUERA DE LA BARRA DE DIRECCIONES.
 *
 * ── Qué credencial es esta ─────────────────────────────────────────────────
 * Las pantallas de este front que llegan por enlace de correo reciben en
 * `?token=` lo único que las autoriza: crear o fijar una contraseña, aprobar
 * una solicitud, verificar una cuenta. No es un identificador: es una
 * credencial de un solo uso viajando en una URL, y mientras siga ahí, quien
 * la tenga puede usarla igual que quien la recibió.
 *
 * ── Dónde se queda si nadie la quita ───────────────────────────────────────
 * En el historial del navegador —para siempre, y visible para el siguiente que
 * use el equipo—, en cualquier captura de pantalla de esa pestaña, y en la
 * cabecera `Referer` de cualquier navegación posterior que no lo suprima. Del
 * lado del servidor la otra mitad ya está resuelta: el backend pone el token en
 * la cadena de consulta y no en la ruta precisamente porque
 * `RequestLoggingContextFilter` escribe `getRequestURI()` —que no incluye la
 * cadena de consulta— en el contexto de log de toda petición.
 *
 * ── Por qué `replace` y no `push` ──────────────────────────────────────────
 * Con `push` se AÑADE una entrada: «atrás» devuelve al usuario a la URL con el
 * token dentro y la entrada sigue en el historial igualmente. Sustituir es la
 * única forma de que la URL con la credencial dentro deje de existir.
 *
 * ── Por qué antes de consumirlo y no después ───────────────────────────────
 * Porque el momento en que el token está expuesto es exactamente el que dura la
 * petición. Limpiar al terminar deja la credencial en la barra durante todo el
 * viaje de red, y si la petición falla o se queda colgada, para siempre.
 *
 * ── Por qué el token no cruza a un store ───────────────────────────────────
 * Quien llame a esto se queda el valor en un `ref` de su propia instancia. No es
 * estado global —muere con la pantalla— y además las devtools de Pinia registran
 * los argumentos de cada acción en su línea de tiempo, así que pasarlo por una
 * acción lo volvería a publicar en el mismo sitio del que se acaba de sacar. Es
 * la misma decisión, y por el mismo motivo, que se aplica en cualquier otro
 * composable de este front que maneje un token de un solo uso llegado por URL.
 *
 * ── Por qué quien llama NO puede seguir leyendo `route.query` ──────────────
 * Justamente porque esto funciona. Un `computed(() => route.query.token)` se
 * vacía en el instante en que la URL queda limpia, así que la pantalla se
 * quedaría sin el token para el envío posterior sin ningún error a la vista.
 * El valor se captura una vez en un `ref` de instancia y de ahí sale para el
 * resto de la vida de la pantalla.
 */
export function useTokenDeEnlace() {
  const route = useRoute()
  const router = useRouter()

  /** El `?token=` de esta visita, o `null` si no trae ninguno. */
  function leerToken(): string | null {
    const crudo = route.query.token
    const valor = Array.isArray(crudo) ? crudo[0] : crudo
    return typeof valor === 'string' && valor.length > 0 ? valor : null
  }

  /**
   * Reescribe la URL actual sin el token, SUSTITUYENDO la entrada del historial.
   *
   * El resto de la cadena de consulta se conserva: lo único que se descarta es
   * el token. La ruta no cambia —se sigue en la misma pantalla—, así que no se
   * nombra destino: `replace({ query })` resuelve sobre la ruta actual.
   */
  async function borrarTokenDeLaUrl(): Promise<void> {
    const { token: _token, ...resto } = route.query
    await router.replace({ query: resto })
  }

  /**
   * Lee el token y lo borra de la barra en el mismo gesto, ANTES de devolverlo.
   *
   * Quien llama recibe la credencial ya con la URL limpia, así que no hay forma
   * de consumirla dejándola visible: para cuando se puede usar, ya no está.
   * Sin token no navega —no hay nada que limpiar y la mayoría de las visitas
   * llegan así—, y por tanto tampoco toca el historial.
   */
  async function tomarTokenDeLaUrl(): Promise<string | null> {
    const token = leerToken()
    if (token === null) return null
    await borrarTokenDeLaUrl()
    return token
  }

  return { tomarTokenDeLaUrl }
}
