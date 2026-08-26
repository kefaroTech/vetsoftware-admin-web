import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { MedicamentResponse } from '../types/medicaments.types'

/**
 * Store del vademécum. Guarda **solo el medicamento seleccionado**.
 *
 * ── Por qué existe, si la especificación decía «sin carpeta `stores/`» ─────
 *
 * La especificación descarta `createCatalogStore` para el LISTADO, y con razón:
 * esa factoría guarda la colección entera y no tiene `page`, `total` ni
 * `pageCount`, que es justo lo que aporta `useServerPaged`. Eso no se toca.
 *
 * Lo que sí hace falta es un sitio para la fila seleccionada, porque **la
 * edición es una ruta completa** y el contrato **no tiene `GET
 * /admin/medicaments/{id}`**: el único camino para que la ficha conozca el
 * registro es que el listado se lo pase. Eso es estado compartido entre dos
 * pantallas, y en este proyecto el estado compartido entre pantallas vive en
 * Pinia sin excepciones — un `ref()` de ámbito de módulo dentro del composable
 * sería exactamente el patrón híbrido prohibido.
 *
 * Es el mismo reparto que `companies.store.ts`, que también guarda solo
 * `selected` y deja el listado paginado en `useServerPaged`.
 *
 * **Límite conocido:** entrar a `/catalogos-clinicos/medicamentos/:id` por
 * enlace directo o tras un F5 encuentra el store vacío, y sin `GET` por id no
 * hay forma de rellenarlo. `MedicamentDetailView` lo dice en pantalla en vez de
 * fingir un formulario vacío; el endpoint que falta está abierto como issue en
 * el repositorio del backend.
 */
export const useMedicamentsStore = defineStore('medicaments', () => {
  const selected = ref<MedicamentResponse | null>(null)

  function setSelected(value: MedicamentResponse | null) {
    selected.value = value
  }

  return { selected, setSelected }
})
