/**
 * Punto de entrada de la galería visual.
 *
 * Es una entrada de Vite SEPARADA de `index.html`, así que no entra en el
 * bundle de producción: `vite build` sigue compilando solo la aplicación. Vive
 * aquí para poder importar los componentes REALES y las hojas REALES —si se
 * pintara con CSS copiado, la regresión no protegería nada.
 *
 * No monta router ni Pinia a propósito: todo lo que la galería muestra recibe
 * sus datos por props, y esa restricción es lo que la mantiene determinista.
 */
import { createApp } from 'vue'
import '../src/assets/styles/tokens.css'
import '../src/assets/styles/base.css'
import '../src/assets/styles/primitives.css'
import '../src/assets/styles/app.css'
import Gallery from './Gallery.vue'

createApp(Gallery).mount('#app')
