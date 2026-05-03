import 'vuetify/styles'
import { h } from 'vue'
import { createVuetify, type IconSet, type IconProps } from 'vuetify'
import { Icon, addCollection } from '@iconify/vue'
import tablerCollection from '@iconify-json/tabler/icons.json'

addCollection(tablerCollection as Parameters<typeof addCollection>[0])

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
