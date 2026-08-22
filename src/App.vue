<script setup lang="ts">
import { RouterView } from 'vue-router'
import ToastStack from '@/components/feedback/ToastStack.vue'
import AppConfirmDialog from '@/components/feedback/AppConfirmDialog.vue'
import PageLoader from '@/components/feedback/PageLoader.vue'
</script>

<template>
  <v-app>
    <RouterView />
    <!--
      ORDEN DELIBERADO: `ToastStack` va el ÚLTIMO. Ninguno de estos tres usa
      `Teleport`, así que manda el orden literal del template, y `PageLoader` y
      `ToastStack` compartían `z-index: 2000`: a igual z-index gana el último
      nodo del DOM, de modo que el velo de carga tapaba los avisos. El daño
      concreto: cuando una mutación falla, el interceptor levanta el velo y
      `errorFrom(...)` saca el toast a la vez, y el usuario veía la pantalla
      oscurecida sin llegar a leer POR QUÉ falló (WCAG 2.2 §4.1.3 Status
      Messages, y §3.3.1 Error Identification cuando el aviso viene de un
      fallo). El front del tenant tiene este mismo orden, pero por accidente.
      La escala de `z-index` se está separando en `tokens.css` para que el orden
      del DOM deje de decidir; esto se arregla igual, para que el siguiente que
      edite el fichero no vuelva a caer en la trampa.
    -->
    <PageLoader />
    <AppConfirmDialog />
    <ToastStack />
  </v-app>
</template>
