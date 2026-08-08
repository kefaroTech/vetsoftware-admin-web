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
      // rompe". El objetivo siguiente es el interceptor 401/refresh con su
      // single-flight, que es la lógica sin cubrir de mayor riesgo.
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
      },
    },
  },
})
