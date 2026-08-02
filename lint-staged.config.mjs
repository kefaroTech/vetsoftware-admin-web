export default {
  'src/**/*.{js,jsx,ts,tsx,vue}': [
    'eslint --cache --cache-strategy content --cache-location node_modules/.cache/eslint/ --max-warnings=0',
  ],
  'src/**/*.{css,scss,sass,vue}': [
    'stylelint --cache --cache-strategy content --cache-location node_modules/.cache/stylelint/ --max-warnings=0',
  ],
  '*.{js,mjs,cjs,ts,tsx,vue,json,md,yml,yaml,html,css,scss,sass}': ['prettier --check'],
}
