import 'vuetify/styles'
import { h } from 'vue'
import { createVuetify, type IconSet, type IconProps } from 'vuetify'
import { Icon, addCollection } from '@iconify/vue'
// Subconjunto generado con solo los iconos que el código usa. La colección
// completa de Tabler pesa 2.087.955 bytes y trae 6.140 iconos; este archivo
// ronda los 15 KB. Como este módulo lo importa main.ts, la diferencia iba entera
// al chunk de entrada: todo usuario del panel se descargaba la colección antes
// del primer píxel para usar unas decenas de iconos.
//
// Lo regenera scripts/build-icon-subset.mjs en cada dev y cada build, y falla si
// un nombre no existe en la colección — un icono mal escrito no lanza error en
// Iconify, simplemente deja un hueco.
import tablerIcons from '@/generated/tabler-icons.json'
import { tablerAliases } from './vuetify-icon-aliases'

addCollection(tablerIcons as Parameters<typeof addCollection>[0])

const iconify: IconSet = {
  component: (props: IconProps) => h(Icon, { icon: props.icon as string }),
}

const customTheme = {
  dark: false,
  colors: {
    background: '#fbfaff',
    surface: '#ffffff',
    primary: '#7e22ce',
    secondary: '#6b5b80',
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
    defaultSet: 'iconify',
    // Sin este mapa, los iconos internos de Vuetify se resolvían contra la CDN
    // pública de Iconify en tiempo de ejecución. Ver vuetify-icon-aliases.ts.
    aliases: tablerAliases,
    sets: { iconify },
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
