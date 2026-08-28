<script setup lang="ts">
import AppLayout from '@/components/layout/AppLayout.vue'
import { TRIALS_ROUTE_NAMES } from '@/router/routes/trials.routes'

/**
 * El armazón de `/pruebas`: la sección de plataforma de las pruebas gratuitas y
 * las concesiones manuales.
 *
 * <p><b>Existe porque hay dos preguntas que ninguna pantalla de una sola empresa
 * puede contestar</b>: «¿a quién hay que llamar hoy?» —el barrido de
 * vencimientos, que cruza todas las empresas— y «¿qué veía esta empresa el día
 * que llamó?», que es una consulta puntual y no un dato del expediente. Hasta
 * ahora el barrido vivía empotrado en la pestaña «Prueba» del expediente
 * (`TrialExpirationsPanel.vue` lo dice en su cabecera: «el día que exista la
 * pantalla de plataforma se monta ahí sin tocar nada»). Esta es esa pantalla, y
 * el panel se monta aquí sin haberlo modificado.
 *
 * <p><b>Abre en «Vencimientos» y no en un resumen.</b> Es la única de las dos que
 * es trabajo pendiente: se entra a ver a quién hay que llamar, no a consultar un
 * archivo.
 *
 * <p><b>Las secciones son RUTAS, no pestañas de componente.</b> Enlace profundo
 * para pegar en un ticket, botón «atrás» que funciona y un SFC por pantalla —el
 * presupuesto fija `maxSfcLines: 500`—. El patrón exacto (`RouterLink custom` +
 * `isActive` gobernando a la vez la clase y `aria-current`) se copia de
 * `LimitsView.vue` en vez de inventarse otro, y el estado activo lo pone
 * `.ds-tab--active`, que ya existe en `primitives.css`.
 *
 * <p><b>Lo que esta sección NO puede ofrecer, y por qué se dice aquí arriba.</b>
 * No hay listado de plataforma de ventanas de prueba ni registro global de
 * concesiones: el contrato solo publica las dos lecturas por empresa
 * (`/system/company-trial-windows/companies/{companyId}/current` y
 * `/system/company-trial-grants/companies/{companyId}`) y un único barrido, que
 * es por día. Con eso no se puede componer «todas las pruebas vivas» sin recorrer
 * el censo de empresas entero, una petición por empresa. El encabezado lo declara
 * en vez de dejar la sección con una pestaña vacía o —peor— con un listado
 * construido a base de barrer trescientos días.
 */
const TABS = [
  { name: TRIALS_ROUTE_NAMES.EXPIRATIONS, label: 'Vencimientos del día' },
  { name: TRIALS_ROUTE_NAMES.SNAPSHOTS, label: 'Fotos de permisos' },
] as const
</script>

<template>
  <AppLayout>
    <div class="ds-page ds-page--stack ds-page--wide">
      <div class="ds-head">
        <div>
          <h1 class="ds-title">Pruebas y concesiones</h1>
          <p class="ds-meta">
            La <strong>ventana</strong> es el periodo en el que una empresa está en prueba · la
            <strong>concesión</strong> es cada artículo que se le deja usar dentro de ella · el
            <strong>desenlace</strong> es lo que pasó cuando venció. El último día de una prueba
            <strong>cuenta entero</strong>: una que termina el 30 sigue viva todo el 30, en hora de
            Colombia. Una ventana no se amplía y una concesión no se desconcede: las dos ausencias
            son deliberadas.
          </p>
        </div>
      </div>

      <!-- El hueco declarado. Va en la propia sección y no en un comentario:
           quien busque «todas las pruebas vivas» tiene que encontrar aquí por qué
           no está, o la pedirá por soporte una vez al mes (R14). -->
      <p class="ds-meta hueco">
        <strong>No hay listado de todas las pruebas ni registro global de concesiones.</strong> El
        contrato solo publica las dos lecturas por empresa y un barrido por día: componer el censo
        entero exigiría una petición por empresa. Las concesiones de una empresa concreta se ven en
        su expediente, en la pestaña «Prueba».
      </p>

      <nav class="pestanas ds-wrap-row" aria-label="Secciones de pruebas y concesiones">
        <RouterLink
          v-for="tab in TABS"
          :key="tab.name"
          v-slot="{ href, navigate, isActive }"
          :to="{ name: tab.name }"
          custom
        >
          <a
            :href="href"
            class="pestana"
            :class="{ 'ds-tab--active': isActive }"
            :aria-current="isActive ? 'page' : undefined"
            @click="navigate"
          >
            {{ tab.label }}
          </a>
        </RouterLink>
      </nav>

      <RouterView />
    </div>
  </AppLayout>
</template>

<style scoped>
/* La fila y su separación las pone `.ds-wrap-row`; aquí solo la línea que
   separa las pestañas del contenido. */
.pestanas {
  border-bottom: 1px solid var(--border);
}

/* §2.5.8 · 24 px de alto efectivo como mínimo: el padding vertical de 10 px
   sobre una línea de texto lo supera con margen. */
.pestana {
  padding: var(--space-10) var(--space-14);
  border-bottom: 2px solid transparent;
  color: var(--text-muted);
  font-size: var(--text-body);
  text-decoration: none;
}

.pestana:hover {
  color: var(--text);
}

.hueco {
  max-width: 70ch;
}
</style>
