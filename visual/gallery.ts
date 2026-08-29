/**
 * Punto de entrada de la galería visual.
 *
 * Es una entrada de Vite SEPARADA de `index.html`, así que no entra en el
 * bundle de producción: `vite build` sigue compilando solo la aplicación. Vive
 * aquí para poder importar los componentes REALES y las hojas REALES —si se
 * pintara con CSS copiado, la regresión no protegería nada.
 *
 * No monta router a propósito: todo lo que la galería muestra recibe sus datos
 * por props, y esa restricción es lo que la mantiene determinista.
 *
 * Pinia sí se monta, y por una razón concreta y acotada: `AppTable` —el chasis
 * de las 17 listas y de los bloques de dinero— llama a `useToast()` en su
 * `setup` para poder copiar el identificador de traza, y `useToast()` resuelve
 * el store al construirse. Sin `createPinia()` la galería no puede montar el
 * componente REAL y tendría que fotografiar una copia del marcado, que es justo
 * lo que esta galería existe para no hacer. No monta ningún store con datos: la
 * galería sigue recibiéndolo todo por props.
 */
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import '../src/assets/styles/tokens.css'
import '../src/assets/styles/base.css'
import '../src/assets/styles/primitives.css'
import '../src/assets/styles/app.css'
import Gallery from './Gallery.vue'

createApp(Gallery).use(createPinia()).mount('#app')
