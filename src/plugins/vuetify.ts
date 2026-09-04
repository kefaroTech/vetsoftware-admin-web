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

// Espejo en sRGB de los tokens de `tokens.css`, no una paleta aparte.
// Ningún gate comprueba automáticamente que los dos coincidan.
const customTheme = {
  dark: false,
  colors: {
    background: '#FAFCFF',
    surface: '#FFFFFF',
    primary: '#564DC5',
    secondary: '#646970',
    success: '#278733',
    error: '#C53637',
    warning: '#683D00',
    info: '#564DC5',
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
