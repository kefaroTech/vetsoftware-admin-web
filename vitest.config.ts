import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    passWithNoTests: false,
    include: ['tests/unit/**/*.spec.ts'],
    setupFiles: ['./tests/unit/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],

      // Se mide TODO el código de la aplicación. Antes `include` apuntaba a un
      // único archivo de cuatro líneas y los umbrales exigían 100 % sobre él,
      // así que el CI certificaba "cobertura 100 %" midiendo 2 sentencias de
      // 2.640. Eso es peor que no medir: es un número que miente, y cualquiera
      // que mirara el pipeline concluiría que el frontend está probado.
      include: ['src/**/*.{ts,vue}'],
      exclude: [
        'src/generated/**', // datos generados, sin lógica
        'src/**/types/**', // solo tipos, se borran al compilar
        'src/**/*.d.ts',
        'src/main.ts', // arranque de la aplicación
      ],

      // Umbrales por ruta, no globales. Un umbral global tendría que ponerse en
      // el ~1 % que hay hoy, y entonces cualquier PR que añada código sin
      // pruebas bajaría el ratio y rompería el build — castigando el crecimiento
      // en vez de premiar las pruebas.
      //
      // En su lugar se exige 100 % en lo que YA está cubierto, de modo que esas
      // rutas no puedan regresar. La lista crece a medida que se cubren módulos:
      // añadir uno aquí es la forma de declarar "esto ya está probado y no se
      // rompe".
      thresholds: {
        'src/services/http/api-base-url.ts': {
          statements: 100,
          branches: 100,
          functions: 100,
          lines: 100,
        },
        'src/features/auth/utils/jwt.ts': {
          statements: 100,
          branches: 100,
          functions: 100,
          lines: 100,
        },
        'src/router/guards/**': {
          statements: 100,
          branches: 100,
          functions: 100,
          lines: 100,
        },
        // La fachada de sesión. El bug que tenía —un booleano congelado en vez
        // de un ref— no lanzaba ni avisaba, así que solo una prueba lo detecta.
        'src/features/auth/composables/useAuth.ts': {
          statements: 100,
          branches: 100,
          functions: 100,
          lines: 100,
        },
        'src/composables/usePagination.ts': {
          statements: 100,
          branches: 100,
          functions: 100,
          lines: 100,
        },
        'src/services/storage/storage.service.ts': {
          statements: 100,
          branches: 100,
          functions: 100,
          lines: 100,
        },
        'src/stores/confirmDialog.store.ts': {
          statements: 100,
          branches: 100,
          functions: 100,
          lines: 100,
        },
        'src/stores/toast.store.ts': {
          statements: 100,
          branches: 100,
          functions: 100,
          lines: 100,
        },
        // Por debajo de 100 % en ramas: queda la del temporizador de salida
        // cuando llega una petición nueva justo mientras el velo se retira. Se
        // ejercita en las pruebas, pero v8 no la marca porque el `setTimeout`
        // resuelve por el otro lado.
        'src/stores/loader.store.ts': {
          statements: 100,
          branches: 93,
          functions: 100,
          lines: 100,
        },
        // También por debajo de 100 %, y a propósito. Lo que queda sin cubrir
        // son ramas defensivas que axios no produce en la práctica: un error sin
        // `config`, una request sin `url`, un AxiosError sin `message`. Forzarlas
        // exigiría fabricar objetos que el runtime nunca construye, y esas
        // pruebas solo servirían para mover un número.
        'src/services/http/http.client.ts': {
          statements: 98,
          branches: 92,
          functions: 100,
          lines: 100,
        },
      },
    },
  },
})
