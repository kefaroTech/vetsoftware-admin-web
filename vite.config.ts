import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiUrl = env.VITE_API_URL?.trim()
  const configuredProfile = env.VETSOFTWARE_PROFILE?.trim()

  if (mode !== 'test' && configuredProfile !== mode) {
    throw new Error(`Missing or mismatched environment file for Vite mode "${mode}".`)
  }

  if (mode !== 'localdev' && mode !== 'test' && !apiUrl) {
    throw new Error(`VITE_API_URL is required for Vite mode "${mode}".`)
  }

  return {
    plugins: [vue(), vuetify({ autoImport: true })],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
    build: {
      // Pinado: el objetivo por defecto de Vite cambia entre versiones mayores, y
      // un salto silencioso mueve el tamaño del bundle sin que nadie lo pida.
      target: 'es2022',

      // Nunca se publican mapas de código, tampoco en dev: el entorno de dev es
      // accesible desde internet y un mapa entrega el fuente completo a quien
      // abra las herramientas del navegador. Para depurar, se construye en local.
      sourcemap: false,

      // Por defecto son 500 kB. El chunk más grande hoy es el de iconos (182 kB),
      // así que 200 avisa cuando algo empieza a engordar, no cuando ya es tarde.
      chunkSizeWarningLimit: 200,

      // Sin `manualChunks`, y es una decisión medida, no un olvido.
      //
      // Se probaron tres configuraciones sobre este mismo proyecto (gzip, ruta
      // crítica = entry + modulepreloads):
      //
      //   automático de Vite (esto)        121,3 KB   ← el mejor
      //   vendor por familias              124,9 KB   (+3,6 KB, y +1,5 KB de CSS)
      //   solo vue/router/pinia aparte     122,0 KB   (+0,7 KB, sin aligerar el entry)
      //
      // El argumento habitual a favor de `manualChunks` es la caché: que un
      // cambio de código de aplicación no invalide el vendor. Aquí ya no aplica.
      // Medido cambiando una línea de `App.vue` y reconstruyendo, de los 72
      // chunks emitidos cambia de hash EXACTAMENTE UNO: `index-*.js`, 19,7 KB
      // gzip. Los 71 restantes —incluido el de iconos, que es el más pesado— se
      // quedan cacheados. Rollup ya separa por sí solo lo que se comparte entre
      // rutas, y forzarlo a mano solo rompe esa optimización.
      //
      // TR-02 movió las cifras a la baja: al salir Iconify y los componentes de
      // Vuetify de las vistas, la ruta crítica pasó de 121,3 a 86,0 KB gzip y el
      // total de 190,3 a 152,8. `chunkSizeWarningLimit` avisa sobre bytes SIN
      // comprimir, así que sigue ladrando por el entry de 238 KB en crudo; lo que
      // manda es `npm run budget`, que mide lo que de verdad viaja por el cable.
      //
      // Si alguien vuelve a plantearlo: mídelo con `npm run budget -- --report`
      // antes y después. La cifra manda.
    },
    server: {
      port: 5173,
      strictPort: true,
    },
  }
})
