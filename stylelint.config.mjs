// `vetsoftware/no-duplicate-primitive` (FE-08, fase final) vive en
// `stylelint-plugins/`, fuera de `src/`, porque es tooling del repo, no
// código de la app — mismo criterio que `scripts/`. Ver el propio fichero
// para el porqué de la regla: mueve al momento de escribir el código lo que
// `scripts/css-budget.mjs` sólo podía medir en el agregado.
export default {
  extends: ['stylelint-config-standard-scss', 'stylelint-config-standard-vue/scss'],
  plugins: ['./stylelint-plugins/no-duplicate-primitive.mjs'],
  ignoreFiles: [
    '**/node_modules/**',
    '**/dist/**',
    '**/coverage/**',
    '**/playwright-report/**',
    '**/test-results/**',
  ],
  defaultSeverity: 'error',
  reportDescriptionlessDisables: true,
  reportInvalidScopeDisables: true,
  reportNeedlessDisables: true,
  rules: {
    'rule-empty-line-before': null,
    'selector-class-pattern': [
      '^[a-z][a-z0-9]*(?:-[a-z0-9]+)*(?:__(?:[a-z0-9]+(?:-[a-z0-9]+)*))?(?:--(?:[a-z0-9]+(?:-[a-z0-9]+)*))?$',
      { message: 'Expected class selector to use kebab-case with optional BEM notation' },
    ],
    // FE-08: rechaza cualquier bloque `<style>` cuyo cuerpo normalizado
    // repita el de una clase ya declarada en `src/assets/styles/primitives.css`
    // — mueve al momento de escribir el código lo que `css:budget` sólo mide
    // en el agregado. Activa: el barrido que la mantenía en `null` ya está en
    // cero (17 aplicaron la primitiva, 9 quedaron con
    // `stylelint-disable-next-line … -- motivo` justificado, cada uno por una
    // limitación estructural: nodo de terceros sin gancho de clase, guardián
    // de exclusión no intercambiable, o forma que sólo existe plana).
    'vetsoftware/no-duplicate-primitive': true,
    // DS-08: prohíbe `!important` por defecto. `EmployeeFormModal.vue` tenía
    // tres sin motivo escrito, resueltos por especificidad (`:not()`) en vez
    // de por fuerza bruta — ver `overrides` abajo para las excepciones que sí
    // resisten el criterio de FE-08 (nodo de terceros sin gancho propio,
    // guardián de exclusión no intercambiable, forma que sólo existe plana),
    // cada una por fichero concreto y con su motivo.
    'declaration-no-important': true,
  },
  overrides: [
    {
      // `.mx-datepicker-main` la teletransporta `vue-datepicker-next` a
      // `<body>` (`append-to-body`): sale del árbol scoped del componente y
      // aterriza como hermano de overlays globales (modales de Vuetify), así
      // que no hay clase propia a la que colgarle una especificidad mayor —
      // es el caso "nodo de terceros sin gancho propio" de FE-08. El
      // `!important` es lo único que garantiza que el panel del calendario
      // gane siempre al z-index del modal que lo contiene.
      files: ['src/components/ui/DateInput.vue'],
      rules: {
        'declaration-no-important': null,
      },
    },
  ],
}
