declare module 'vuetify/styles'

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  /**
   * Colector al que el navegador envía su telemetría (TR-05). **Sin valor no se activa nada** y
   * ni siquiera se descarga el chunk de Faro: en producción el colector vive en un registro DNS
   * interno al que un navegador no llega, y exponerlo es una decisión de plataforma.
   */
  readonly VITE_TELEMETRY_URL?: string
  readonly VITE_TELEMETRY_ENV?: string
  readonly VITE_APP_VERSION?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
