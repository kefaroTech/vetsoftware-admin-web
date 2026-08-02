export default {
  extends: ['stylelint-config-standard-scss', 'stylelint-config-standard-vue/scss'],
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
  },
}
