<script setup lang="ts">
import AppSidebar from './AppSidebar.vue'
import AppHeader from './AppHeader.vue'
</script>

<template>
  <div class="app-shell">
    <!--
      §2.4.1 Bypass Blocks (A). En escritorio hay entre 15 y 26 enlaces antes
      del contenido en CADA navegación. En tablet el cajón lo hace innecesario,
      pero el enlace se pone para las dos bandas: no cuesta nada y así no se
      puede «olvidar activar» justo en la banda donde hace falta.
    -->
    <a class="skip-link" href="#contenido">Saltar al contenido</a>

    <AppSidebar />

    <!--
      `.app-main` es un `<div>` y no un `<main>` a propósito: `AppHeader` cuelga
      de aquí, y un `<header>` descendiente de `<main>` NO es el landmark
      `banner`. Con esta forma el armazón entrega los tres landmarks reales
      —banner, navigation, main— y la hamburguesa del cajón vive dentro de una
      región con nombre en vez de en tierra de nadie.
    -->
    <div class="app-main ds-stack">
      <AppHeader />
      <!-- `tabindex="-1"` no es opcional: sin él, un salto por `#id` mueve el
           scroll pero no siempre el foco. -->
      <main id="contenido" class="app-content" tabindex="-1">
        <slot />
      </main>
    </div>
  </div>
</template>

<style scoped>
/* El armazón es el ÚNICO tope de altura de la aplicación, y `<main>` el único
   contenedor de scroll de contenido.
   Antes había dos barras a la vez: `.app-shell`/`.app-main` declaraban
   `min-height: 100vh` —un mínimo, no un tope— y `.app-content` llevaba
   `flex: 1` sin `min-height: 0`, así que su mínima automática de ítem flex era
   la altura de su contenido y nunca encogía. El desbordamiento se propagaba
   hasta el `body`, y por eso `overflow: auto`/`hidden` de aquí no recortaban
   nada: eran declaraciones inertes que aparentaban resolver el problema.
   `dvh` y no `vh`: en iPadOS Safari y Chrome Android `100vh` se resuelve
   contra el viewport GRANDE, así que con la barra de herramientas visible el
   armazón ya sobresalía y el documento ofrecía scroll aunque todo cupiera. */
.app-shell {
  display: grid;
  grid-template-columns: 244px 1fr;
  height: 100dvh;
  overflow: hidden;
  background: var(--surface);
  color: var(--text);
}

.app-main {
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.app-content {
  flex: 1;
  min-height: 0;
  padding: var(--space-28) var(--space-32);
  overflow: auto;
  overscroll-behavior: contain;
}

/* Se usa `transform` y no `.ds-sr-only`: esa primitiva oculta con `clip-path`
   y no se «desoculta» limpiamente al enfocar. */
.skip-link {
  position: absolute;
  inset-inline-start: var(--space-8);
  inset-block-start: var(--space-8);
  z-index: var(--z-toast);
  padding: var(--space-8) var(--space-14);
  border-radius: var(--radius-md);
  background: var(--warm-900);
  color: var(--warm-50);
  font-size: var(--text-body);
  font-weight: var(--weight-semibold);
  text-decoration: none;
  transform: translateY(-200%);
}

.skip-link:focus-visible {
  transform: none;
  box-shadow: var(--ring);
}

/* La consola se soporta en escritorio y tablet, con 768 px como mínimo
   declarado. En tablet la navegación es un cajón `position: fixed`, así que el
   armazón deja de reservarle columna: el contenido se lleva el ancho ENTERO
   (768 px en vez de los 696 del raíl de iconos, 1024 en vez de 952).
   Sintaxis de rango, que es la que usa el resto del árbol (`ModalShell`,
   `primitives.css`, el front del tenant); `max-width` sería una tercera
   convención. El valor DEBE coincidir con `COMPACT_MAX_WIDTH` de
   `src/stores/viewport.store.ts`, que es quien decide si el `<aside>` es un
   diálogo o una región persistente. */
@media (width <= 1024px) {
  .app-shell {
    grid-template-columns: 1fr;
  }

  .app-content {
    padding: var(--space-18);
  }
}
</style>
