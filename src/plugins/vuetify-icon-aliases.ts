import type { IconAliases } from 'vuetify'

/**
 * Iconos que Vuetify pide por su cuenta para sus propios componentes: la flecha
 * de un `VSelect`, el check de un `VCheckbox`, las flechas de paginación, el
 * spinner de carga, los iconos de `VAlert`.
 *
 * Sin este mapa, Vuetify usa sus alias de fábrica, que nombran iconos de
 * Material Design (`mdi-chevron-right` y compañía). Como el único set
 * registrado es Iconify con la colección Tabler, esos nombres no se resuelven
 * localmente — y entonces Iconify hace lo que hace por defecto: **los descarga
 * de `https://api.iconify.design` en tiempo de ejecución**, uno por uno.
 *
 * Eso significaba que un panel de administración con datos clínicos y fiscales
 * hacía peticiones a un tercero desde el navegador de cada usuario, que los
 * iconos aparecían tarde y con salto de maquetación, y que en una red que
 * bloquee esa CDN —o el día que se añada una Content-Security-Policy— no
 * aparecían en absoluto.
 *
 * Con este mapa todos resuelven contra el subconjunto local y no sale ni una
 * petición. Los nombres los valida `scripts/build-icon-subset.mjs` en cada
 * build: si uno no existe en Tabler, el build falla en vez de dejar un hueco.
 */
export const tablerAliases: IconAliases = {
  collapse: 'tabler:chevron-up',
  complete: 'tabler:check',
  cancel: 'tabler:circle-x',
  close: 'tabler:x',
  delete: 'tabler:circle-x',
  clear: 'tabler:circle-x',
  success: 'tabler:circle-check',
  info: 'tabler:info-circle',
  warning: 'tabler:alert-circle',
  error: 'tabler:circle-x',
  prev: 'tabler:chevron-left',
  next: 'tabler:chevron-right',
  checkboxOn: 'tabler:checkbox',
  checkboxOff: 'tabler:square',
  checkboxIndeterminate: 'tabler:square-minus',
  delimiter: 'tabler:circle',
  sortAsc: 'tabler:arrow-up',
  sortDesc: 'tabler:arrow-down',
  expand: 'tabler:chevron-down',
  menu: 'tabler:menu-2',
  subgroup: 'tabler:chevron-down',
  dropdown: 'tabler:chevron-down',
  radioOn: 'tabler:circle-dot',
  radioOff: 'tabler:circle',
  edit: 'tabler:pencil',
  ratingEmpty: 'tabler:star',
  ratingFull: 'tabler:star-filled',
  ratingHalf: 'tabler:star-half-filled',
  loading: 'tabler:refresh',
  first: 'tabler:chevrons-left',
  last: 'tabler:chevrons-right',
  unfold: 'tabler:selector',
  file: 'tabler:paperclip',
  plus: 'tabler:plus',
  minus: 'tabler:minus',
  calendar: 'tabler:calendar',
  treeviewCollapse: 'tabler:chevron-down',
  treeviewExpand: 'tabler:chevron-right',
  tableGroupCollapse: 'tabler:chevron-down',
  tableGroupExpand: 'tabler:chevron-right',
  eyeDropper: 'tabler:color-picker',
  upload: 'tabler:cloud-upload',
  color: 'tabler:palette',
  command: 'tabler:command',
  ctrl: 'tabler:chevron-up',
  space: 'tabler:space',
  shift: 'tabler:arrow-big-up',
  alt: 'tabler:option',
  enter: 'tabler:corner-down-left',
  arrowup: 'tabler:arrow-up',
  arrowdown: 'tabler:arrow-down',
  arrowleft: 'tabler:arrow-left',
  arrowright: 'tabler:arrow-right',
  backspace: 'tabler:backspace',
  play: 'tabler:player-play',
  pause: 'tabler:player-pause',
  fullscreen: 'tabler:maximize',
  fullscreenExit: 'tabler:minimize',
  volumeHigh: 'tabler:volume',
  volumeMedium: 'tabler:volume-2',
  volumeLow: 'tabler:volume-3',
  volumeOff: 'tabler:volume-off',
  search: 'tabler:search',
}
