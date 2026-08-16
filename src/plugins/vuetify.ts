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

// Amatista (hue 300) — alineado con el sistema de tokens en src/assets/styles/tokens.css.
// Aproximación sRGB de oklch(50% 0.18 300) ≈ #7C3AED (--amatista-600).
const customTheme = {
  dark: false,
  colors: {
    background: '#F9FAFB',
    surface: '#FFFFFF',
    primary: '#7C3AED',
    secondary: '#6B7280',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6',
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
