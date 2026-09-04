import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import tseslint from 'typescript-eslint'
import prettierConfig from 'eslint-config-prettier'

export default tseslint.config(
  // `api.generated.d.ts` lo escribe openapi-typescript desde el contrato del backend. No se edita
  // a mano, así que aplicarle reglas de estilo solo produce ruido que nadie puede arreglar.
  { ignores: ['dist/**', 'node_modules/**', 'coverage/**', 'src/types/api.generated.d.ts'] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,
  ...pluginVue.configs['flat/recommended'],
  // `tests/**` y `e2e/**` estuvieron fuera del alcance de eslint —y de todo
  // `tsconfig`— hasta que se miró qué escondían: enums inventados en rutas de
  // sesión y de dinero. Ahora entran también en `tsconfig.vitest.json` y
  // `tsconfig.e2e.json` (referenciados desde el `tsconfig.json` raíz, que es
  // lo que compila `npm run typecheck` y `npm run build`), y aquí en los
  // MISMOS bloques de eslint que `src`, no en unos rebajados: una prueba que
  // nadie comprueba es peor que ninguna, porque además da confianza.
  {
    files: ['{src,visual,tests,e2e}/**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
      },
    },
  },
  {
    files: ['{src,visual,tests,e2e}/**/*.{ts,tsx,vue}'],
    rules: {
      'no-undef': 'off',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-unused-expressions': [
        'error',
        { allowShortCircuit: true, allowTernary: true },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-empty-object-type': [
        'error',
        { allowInterfaces: 'with-single-extends' },
      ],
      '@typescript-eslint/array-type': 'warn',
      '@typescript-eslint/consistent-type-definitions': 'warn',
      '@typescript-eslint/no-dynamic-delete': 'warn',
      '@typescript-eslint/no-empty-function': 'warn',
      '@typescript-eslint/no-invalid-void-type': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/prefer-function-type': 'warn',
    },
  },
  {
    // El cuerpo vacío es el CONTENIDO de un doble de prueba, no un olvido: un
    // `vi.fn(async () => {})` que no hace nada es exactamente lo que se quiere
    // afirmar, igual que un `console.error` silenciado a propósito o el `reset()`
    // de un stub de grecaptcha. La regla existe para cazar implementaciones a
    // medio escribir en `src/`, donde sigue activa; aquí solo produce 21 avisos
    // que solo se pueden callar uno a uno, y esa es la forma que tiene un gate de
    // volverse ruido y dejar de leerse.
    files: ['{tests,e2e}/**/*.ts'],
    rules: { '@typescript-eslint/no-empty-function': 'off' },
  },
  // Guardarraíl de la migración a Lucide: `CLAUDE.md` declara "una sola librería
  // de iconos" pero nada la comprobaba, así que un `mdi-`/`<v-icon>` puede
  // colarse de vuelta sin que ningún gate lo note.
  {
    // `vue/no-restricted-syntax` (bloque siguiente) solo recorre la plantilla:
    // un literal `mdi-*` dentro de `<script setup>` de un `.vue` se le escapa,
    // así que este bloque cubre también `.vue`, no solo `.ts`/`.tsx`.
    files: ['src/**/*.{ts,tsx,vue}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/^mdi-/]',
          message:
            'Los iconos de Material Design Icons (`mdi-*`) están retirados: usa un componente de `lucide-vue-next`, o `vuetify-icon-aliases.ts` para lo que Vuetify pide para sí.',
        },
      ],
    },
  },
  {
    files: ['src/**/*.vue'],
    rules: {
      'vue/no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/^mdi-/], VLiteral[value=/^mdi-/]',
          message:
            'Los iconos de Material Design Icons (`mdi-*`) están retirados: usa un componente de `lucide-vue-next`, o `vuetify-icon-aliases.ts` para lo que Vuetify pide para sí.',
        },
        {
          selector: "VElement[rawName='v-icon']",
          message:
            'El componente `<v-icon>` (Material Design Icons) está retirado: usa un componente de `lucide-vue-next`, o `vuetify-icon-aliases.ts` para lo que Vuetify pide para sí.',
        },
      ],
    },
  },
  prettierConfig,
  {
    rules: {
      'vue/block-order': ['error', { order: ['script', 'template', 'style'] }],
      'vue/component-api-style': ['error', ['script-setup']],
      'vue/define-macros-order': [
        'warn',
        { order: ['defineOptions', 'defineProps', 'defineEmits', 'defineSlots'] },
      ],
      'vue/multi-word-component-names': 'off',
      'vue/require-default-prop': 'off',
      'vue/no-unused-emit-declarations': 'warn',
      'vue/no-unused-properties': [
        'warn',
        { groups: ['props', 'data', 'computed', 'methods', 'setup'] },
      ],
      'vue/no-unused-refs': 'warn',
    },
  },
)
