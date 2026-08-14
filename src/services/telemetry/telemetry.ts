/**
 * Telemetría del navegador (TR-05, nivel 2).
 *
 * <p>El nivel 1 —`traceparent` en cada petición— hace que el servidor adopte el identificador
 * del navegador, así que un fallo ya se puede correlacionar con lo que ocurrió en el backend.
 * Lo que falta es el otro lado: cuánto tardó el *render*, si hubo reintentos, de qué pantalla
 * venía el usuario. Eso lo aporta Faro, que instrumenta el navegador y envía sus tramos al mismo
 * pipeline por el que ya viajan las trazas del servidor.
 *
 * <p><b>Se carga de forma diferida, y no es un detalle de estilo.</b> El presupuesto de
 * `check-bundle-budget.mjs` mide la ruta crítica —el *entry* y sus precargas—, que está al 81 %
 * de su techo. Faro y OTel web pesan más que el margen que queda, así que importarlos desde
 * `main.ts` rompería el presupuesto y con él el CI. Un `import()` después del montaje los deja en
 * un *chunk* aparte que el navegador pide cuando ya pintó, y que no cuenta como ruta crítica.
 *
 * <p><b>Y no se activa si no hay a dónde enviar.</b> `VITE_TELEMETRY_URL` sin valor deja esto en
 * nada: ni descarga el *chunk*. Es deliberado — en producción el colector (Alloy) vive en un
 * registro DNS interno al que un navegador no llega, y abrirlo al exterior es una decisión de
 * plataforma con su propio ingress, autenticación y límite de peticiones. Mientras esa decisión
 * no se tome, esto queda inerte en prod y funcionando donde sí haya endpoint.
 */

let arrancada = false

export async function startTelemetry(): Promise<void> {
  const url = import.meta.env.VITE_TELEMETRY_URL
  if (!url || arrancada) return
  arrancada = true

  try {
    const [{ initializeFaro, getWebInstrumentations }, { TracingInstrumentation }] =
      await Promise.all([import('@grafana/faro-web-sdk'), import('@grafana/faro-web-tracing')])

    initializeFaro({
      url,
      app: {
        name: 'vetsoftware-admin',
        version: import.meta.env.VITE_APP_VERSION ?? 'dev',
        environment: import.meta.env.VITE_TELEMETRY_ENV ?? import.meta.env.MODE,
      },
      instrumentations: [
        ...getWebInstrumentations(),
        new TracingInstrumentation({
          // Solo hacia la propia API. Sin esta lista, la instrumentación inyectaría cabeceras de
          // traza en peticiones a terceros y filtraría identificadores fuera del sistema.
          instrumentationOptions: {
            propagateTraceHeaderCorsUrls: [new RegExp(escapeRegExp(apiOrigin()))],
          },
        }),
      ],
    })
  } catch {
    // La telemetría no puede tumbar la aplicación: si el chunk no descarga o el colector no
    // responde, la pantalla sigue funcionando sin ella.
    arrancada = false
  }
}

/** Origen de la API, que es el único destino al que se propagan cabeceras de traza. */
function apiOrigin(): string {
  try {
    return new URL(import.meta.env.VITE_API_URL ?? window.location.origin).origin
  } catch {
    return window.location.origin
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
