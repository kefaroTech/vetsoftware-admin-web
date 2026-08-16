<script setup lang="ts">
import { Pencil, Trash2 } from 'lucide-vue-next'

/**
 * Catálogo de todo lo que la capa visual promete.
 *
 * Cada bloque lleva `data-shot`: es la unidad que Playwright captura. Se
 * fotografía bloque a bloque y no la página entera porque una diferencia en el
 * primero desplazaría todo lo de abajo y una sola regresión saldría como
 * quince — el informe dejaría de decir DÓNDE está el cambio.
 *
 * Al añadir una primitiva a `primitives.css`, añádela también aquí: lo que no
 * está en la galería no tiene red.
 */
</script>

<template>
  <main class="gallery">
    <!-- ── Botones ────────────────────────────────────────────────────── -->
    <section data-shot="botones">
      <h2>Botones</h2>
      <div class="row">
        <button class="ds-btn ds-btn--primary">Guardar</button>
        <button class="ds-btn ds-btn--ghost">Cancelar</button>
        <button class="ds-btn ds-btn--neutral">Neutro</button>
        <button class="ds-btn ds-btn--danger">Eliminar</button>
        <button class="ds-btn ds-btn--danger-solid">Anular</button>
        <button class="ds-btn ds-btn--plain">Plano</button>
      </div>
      <div class="row">
        <button class="ds-btn ds-btn--primary ds-btn--sm">Pequeño</button>
        <button class="ds-btn ds-btn--primary ds-btn--lg">Grande</button>
        <button class="ds-btn ds-btn--primary" disabled>Deshabilitado</button>
      </div>
    </section>

    <!-- ── Botón de icono ─────────────────────────────────────────────── -->
    <section data-shot="icon-btn">
      <h2>Botón de icono</h2>
      <div class="row">
        <button class="ds-icon-btn" aria-label="Editar"><Pencil :size="14" /></button>
        <button class="ds-icon-btn ds-icon-btn--danger" aria-label="Eliminar">
          <Trash2 :size="14" />
        </button>
        <button class="ds-icon-btn" aria-label="Deshabilitado" disabled>
          <Pencil :size="14" />
        </button>
      </div>
    </section>

    <!-- ── Avisos ─────────────────────────────────────────────────────── -->
    <section data-shot="banners">
      <h2>Avisos</h2>
      <div class="ds-banner ds-banner--info">Selecciona una sede para ver su stock.</div>
      <div class="ds-banner ds-banner--success">Consulta guardada correctamente.</div>
      <div class="ds-banner ds-banner--warning">Hay 3 lotes por vencer este mes.</div>
      <div class="ds-banner ds-banner--error">No se pudo conectar con el servidor.</div>
      <div class="ds-banner ds-banner--info ds-banner--sm">Variante compacta.</div>
      <p class="ds-server-error">El documento ya fue anulado (409).</p>
    </section>

    <!-- ── Tarjetas y paneles ─────────────────────────────────────────── -->
    <section data-shot="tarjetas">
      <h2>Tarjetas y paneles</h2>
      <div class="row">
        <div class="ds-card">
          <h3 class="ds-title">Tarjeta</h3>
          <p class="ds-subtitle">Con título y subtítulo.</p>
        </div>
        <div class="ds-card ds-card--flat">
          <h3 class="ds-title">Plana</h3>
        </div>
        <div class="ds-card ds-card--tight">
          <h3 class="ds-title">Compacta</h3>
        </div>
      </div>
      <div class="ds-panel">Panel</div>
    </section>

    <!-- ── Tipografía ─────────────────────────────────────────────────── -->
    <section data-shot="tipografia">
      <h2>Tipografía</h2>
      <p class="ds-display">Display</p>
      <p class="ds-display ds-display--sm">Display pequeño</p>
      <p class="ds-title">Título</p>
      <p class="ds-subtitle">Subtítulo</p>
      <p class="ds-label">Etiqueta</p>
      <p class="ds-truncate" style="width: 180px">
        Texto muy largo que se debe cortar con puntos suspensivos al final
      </p>
    </section>

    <!-- ── Estados vacíos ─────────────────────────────────────────────── -->
    <section data-shot="vacios">
      <h2>Estados vacíos</h2>
      <div class="ds-empty">Sin resultados.</div>
      <div class="ds-empty ds-empty--boxed">Sin resultados, con caja.</div>
      <div class="ds-empty ds-empty--lg">Sin resultados, grande.</div>
    </section>

    <!-- ── Rejillas ───────────────────────────────────────────────────── -->
    <section data-shot="rejillas">
      <h2>Rejillas</h2>
      <div class="ds-grid-2">
        <div class="ds-card ds-card--tight">Uno</div>
        <div class="ds-card ds-card--tight">Dos</div>
        <div class="ds-card ds-card--tight ds-grid-span">Ancho completo</div>
      </div>
      <dl class="ds-detail-grid">
        <dt>Propietario</dt>
        <dd>Ana Restrepo</dd>
        <dt>Documento</dt>
        <dd>1017254398</dd>
      </dl>
    </section>
  </main>
</template>

<style scoped>
/* Andamiaje de la galería. Deliberadamente mínimo y sin tokens: si esta hoja
   usara variables del design system, un cambio en los tokens movería a la vez
   lo medido y la regla con la que se mide. */
.gallery {
  padding: 24px;
  background: #fff;
  display: flex;
  flex-direction: column;
  gap: 28px;
}

section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: flex-start;
}

h2 {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #666;
}

.row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

section > .ds-banner,
section > .ds-server-error,
section > .ds-empty,
section > .ds-grid-2,
section > .ds-panel,
section > [data-shot],
section > div:not(.row) {
  width: 560px;
}
</style>
