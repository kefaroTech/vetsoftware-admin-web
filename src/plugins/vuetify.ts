import 'vuetify/styles'
import { h, type Component } from 'vue'
import { createVuetify, type IconProps, type IconSet } from 'vuetify'
import { lucideAliases } from './vuetify-icon-aliases'

/**
 * Vuetify dibuja sus iconos con la misma librería que la aplicación: Lucide, en
 * componentes. Ni webfont ni colección registrada en tiempo de ejecución — ver
 * `vuetify-icon-aliases.ts` para el porqué.
 */
const lucide: IconSet = {
  component: (props: IconProps) => h(props.icon as Component, { size: 20 }),
}

// Espejo en sRGB de los tokens de `tokens.css`, no una paleta aparte:
// `--brand-canvas` · `--surface` · `--amatista-600` (el indigo del kit) ·
// `--warm-500` · `--success-dot` · `--danger-500` · `--warning-900` ·
// `--amatista-600`. Ningún gate comprueba automáticamente que los dos
// coincidan.
const customTheme = {
  dark: false,
  colors: {
    background: '#F5F3FF',
    surface: '#FFFFFF',
    primary: '#4F46E5',
    secondary: '#5D6A7D',
    success: '#1C8D7F',
    error: '#CD1E46',
    warning: '#6A430A',
    info: '#4F46E5',
  },
}

export default createVuetify({
  theme: {
    defaultTheme: 'customTheme',
    themes: { customTheme },
  },
  icons: {
    defaultSet: 'lucide',
    aliases: lucideAliases,
    sets: { lucide },
  },
  defaults: {
    VBtn: { variant: 'elevated', density: 'default' },
    VTextField: { variant: 'outlined', density: 'comfortable', color: 'primary' },
    VSelect: { variant: 'outlined', density: 'comfortable', color: 'primary' },
    VTextarea: { variant: 'outlined', density: 'comfortable', color: 'primary' },
    VCheckbox: { color: 'primary', density: 'comfortable' },
    VCard: { rounded: 'lg', elevation: 1 },
  },
})
