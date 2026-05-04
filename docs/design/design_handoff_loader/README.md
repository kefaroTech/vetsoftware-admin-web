# Handoff: Loader "Huella latiendo" — Vetrina

## Overview
Loader oficial de la aplicación. Una huella de perrito en color amatista que palpita como un corazón (curva real lub-dub: pico fuerte al 14% + segundo pico suave al 28% + descanso) con un glow que sigue el contorno exacto de la silueta.

**Casos de uso:**
- Transiciones entre pantallas (overlay full-screen)
- Esperas de servicios / fetch de datos (loader inline o en card)
- Estados de carga en botones (versión chica, sin glow)
- Empty states mientras carga el primer fetch
- Skeleton loaders junto al contenido

## Sobre el archivo de referencia
`Loader Huella Latido.html` es la **referencia visual** validada. Ábrelo en navegador para ver el comportamiento exacto antes de implementar. **No copies el HTML literal** — porteá a un componente Vue idiomático siguiendo las convenciones del proyecto.

## Stack objetivo
- **Vue 3** + `<script setup>` (Composition API)
- **TypeScript** (recomendado, opcional)
- **CSS scoped** o módulos
- Sin dependencias externas — todo es SVG inline + CSS animation

---

## Anatomía del loader

```
┌─────────────────────────────┐
│                             │
│           👣 latiendo       │  ← <svg> con filtro glow
│                             │     y animación CSS scale
│                             │
└─────────────────────────────┘
```

3 piezas:

1. **Filtro SVG `paw-glow`** — dos capas de `feGaussianBlur` sobre el `SourceAlpha`, una nítida (3px) + una difusa (9px), ambas teñidas en amatista. Sigue exactamente la silueta.
2. **Definición de la huella** (`<g id="paw">`) — 1 path para el pad central + 4 ellipses para los dedos (2 centrales + 2 laterales angulados). Cada elemento lleva `fill="currentColor"` para que el color sea controlable desde CSS.
3. **Animación de latido** — keyframes `beat`: `0%, 50%, 100% → scale(1)`, `14% → scale(1.18)`, `28% → scale(1.08)`, duración 1.2s, easing `ease-in-out`.

> ⚠️ **Detalle crítico SVG:** `fill="currentColor"` debe ir en **cada** path/ellipse individualmente, no en el `<g>` padre. Cuando se usa `<use href="#paw">`, las propiedades de fill no se heredan a través de la frontera del shadow tree del `<use>`.

---

## Componente Vue

### `src/components/ui/PawLoader.vue`

```vue
<script setup lang="ts">
interface Props {
  /** Tamaño en px del cuadrado contenedor. Default 64. */
  size?: number;
  /** Color CSS del contorno y relleno. Default `currentColor` (hereda). */
  color?: string;
  /** Mostrar el glow amatista. Default true. Apagar para versiones inline (botones, chips). */
  glow?: boolean;
  /** Velocidad del latido en ms. Default 1200. */
  speed?: number;
  /** Texto accesible (anunciado por screen readers). */
  label?: string;
}

const props = withDefaults(defineProps<Props>(), {
  size: 64,
  color: 'currentColor',
  glow: true,
  speed: 1200,
  label: 'Cargando',
});
</script>

<template>
  <span
    class="paw-loader"
    role="status"
    :aria-label="label"
    :style="{
      width: `${size}px`,
      height: `${size}px`,
      color: color,
      '--paw-speed': `${speed}ms`,
    }"
  >
    <svg viewBox="-40 -40 200 200" aria-hidden="true">
      <defs>
        <filter v-if="glow" :id="`paw-glow-${_uid}`" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur1" />
          <feFlood flood-color="oklch(50% 0.18 300)" flood-opacity="0.55" result="color1" />
          <feComposite in="color1" in2="blur1" operator="in" result="glow1" />
          <feGaussianBlur in="SourceAlpha" stdDeviation="9" result="blur2" />
          <feFlood flood-color="oklch(55% 0.18 300)" flood-opacity="0.45" result="color2" />
          <feComposite in="color2" in2="blur2" operator="in" result="glow2" />
          <feMerge>
            <feMergeNode in="glow2" />
            <feMergeNode in="glow1" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g class="paw-pivot" :filter="glow ? `url(#paw-glow-${_uid})` : undefined">
        <!-- Pad central -->
        <path fill="currentColor" d="
          M 60 58
          C 80 58, 94 72, 97 90
          C 100 105, 92 120, 80 124
          C 73 127, 66 124, 60 124
          C 54 124, 47 127, 40 124
          C 28 120, 20 105, 23 90
          C 26 72, 40 58, 60 58 Z
        " />
        <!-- Dedo central izquierdo -->
        <ellipse fill="currentColor" cx="42" cy="22" rx="14" ry="19" />
        <!-- Dedo central derecho -->
        <ellipse fill="currentColor" cx="78" cy="22" rx="14" ry="19" />
        <!-- Dedo lateral izquierdo -->
        <ellipse fill="currentColor" cx="14" cy="46" rx="12" ry="16" transform="rotate(-25 14 46)" />
        <!-- Dedo lateral derecho -->
        <ellipse fill="currentColor" cx="106" cy="46" rx="12" ry="16" transform="rotate(25 106 46)" />
      </g>
    </svg>
    <span class="sr-only">{{ label }}</span>
  </span>
</template>

<script lang="ts">
let _seq = 0;
export default { computed: { _uid() { return ++_seq; } } };
</script>

<style scoped>
.paw-loader {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--amatista-700, oklch(42% 0.16 300));
  flex-shrink: 0;
}
.paw-loader svg {
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
}
.paw-pivot {
  transform-origin: center;
  transform-box: fill-box;
  animation: paw-beat var(--paw-speed, 1200ms) ease-in-out infinite;
}
@keyframes paw-beat {
  0%, 50%, 100% { transform: scale(1); }
  14%           { transform: scale(1.18); }
  28%           { transform: scale(1.08); }
}
.sr-only {
  position: absolute;
  width: 1px; height: 1px;
  padding: 0; margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap; border: 0;
}
@media (prefers-reduced-motion: reduce) {
  .paw-pivot { animation: none; }
}
</style>
```

> El `_uid` evita colisiones de id si renderás varios loaders simultáneamente. Si tu proyecto usa `useId()` de Vue 3.5+, prefiérelo.

---

## Uso

### Loader full-screen (transiciones)

```vue
<!-- src/components/ui/PageLoader.vue -->
<template>
  <Transition name="fade">
    <div v-if="loading" class="page-loader">
      <PawLoader :size="96" />
    </div>
  </Transition>
</template>

<script setup lang="ts">
import PawLoader from './PawLoader.vue';
defineProps<{ loading: boolean }>();
</script>

<style scoped>
.page-loader {
  position: fixed; inset: 0;
  background: oklch(97% 0.008 60 / 0.85);
  backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000;
}
.fade-enter-active, .fade-leave-active { transition: opacity .25s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
```

### En un botón mientras se guarda

```vue
<button class="btn-primary" :disabled="saving">
  <PawLoader v-if="saving" :size="18" :glow="false" :speed="900" />
  <span>{{ saving ? 'Guardando…' : 'Guardar consulta' }}</span>
</button>
```

> En contextos chicos (≤24px) **apaga el glow** (`:glow="false"`) — a esa escala el halo amatista se ve borroso y resta legibilidad. Subí también la velocidad (~900ms) para que se sienta más responsivo.

### Mientras carga datos de un servicio

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import PawLoader from '@/components/ui/PawLoader.vue';

const loading = ref(true);
const data = ref(null);

onMounted(async () => {
  try {
    data.value = await fetch('/api/consultas').then(r => r.json());
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="consultas-list">
    <div v-if="loading" class="loader-wrap">
      <PawLoader :size="56" />
      <p>Cargando consultas…</p>
    </div>
    <ul v-else>
      <li v-for="c in data" :key="c.id">{{ c.title }}</li>
    </ul>
  </div>
</template>

<style scoped>
.loader-wrap {
  display: flex; flex-direction: column;
  align-items: center; gap: 14px;
  padding: 48px 0;
  color: var(--warm-600);
  font-size: 13px;
}
</style>
```

### Como interceptor global de Axios

```ts
// src/composables/useGlobalLoader.ts
import { ref } from 'vue';

const pending = ref(0);
export const isLoading = computed(() => pending.value > 0);
export function pushLoader() { pending.value++; }
export function popLoader()  { pending.value = Math.max(0, pending.value - 1); }

// src/lib/api.ts
import axios from 'axios';
import { pushLoader, popLoader } from '@/composables/useGlobalLoader';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL });
api.interceptors.request.use(c => { pushLoader(); return c; });
api.interceptors.response.use(
  r => { popLoader(); return r; },
  e => { popLoader(); return Promise.reject(e); },
);

export default api;
```

```vue
<!-- App.vue -->
<PageLoader :loading="isLoading" />
```

---

## Reglas de uso

| Contexto                              | Tamaño  | Glow  | Speed   |
|---------------------------------------|---------|-------|---------|
| Splash / overlay full-screen          | 96–128  | ✅    | 1200ms  |
| Empty state de pantalla               | 64–80   | ✅    | 1200ms  |
| Card / panel cargando                 | 48–56   | ✅    | 1200ms  |
| Inline en botones                     | 18–22   | ❌    | 900ms   |
| Inline en chips / badges              | 14–16   | ❌    | 900ms   |
| Modo dark (hospitalización)           | igual   | ✅    | 1000ms  |

- **No usar más de un loader full-screen a la vez.** Si hay varios fetches, agruparlos en un solo `loading` con counter.
- **Tiempo mínimo visible: 300ms.** Si la respuesta llega antes, no muestres el loader (parpadeo). Usa un debounce o "delayed loader" pattern.
- **Tiempo máximo sin feedback: 6s.** Si pasa más, agregá copy explicando la espera ("Esto puede tardar unos segundos…").
- **Respeta `prefers-reduced-motion`.** El componente ya lo hace — la animación se desactiva pero la huella se queda visible.

---

## Tokens

Reutilizá los tokens del handoff de pantalla principal. Si no están aún:

```css
:root {
  --hue: 300; /* tono amatista */
  --amatista-700: oklch(42% 0.16 var(--hue));  /* color principal de la huella */
  --amatista-500: oklch(58% 0.18 var(--hue));  /* glow externo */
  --amatista-600: oklch(50% 0.18 var(--hue));  /* glow interno */
  --warm-600: oklch(45% 0.012 60);             /* texto secundario "Cargando…" */
}
```

Si tu proyecto usa Tailwind, mapeá `paw` → `oklch(42% 0.16 300)` y aplicá clases utilitarias.

---

## Variantes adicionales (opcional)

Si querés exponer estas variantes desde el mismo componente (vía prop `variant: 'beat' | 'beat-slow' | 'beat-strong'`):

```css
/* Latido lento — esperas largas, pacientes en reposo */
.paw-pivot.beat-slow { animation-duration: 1800ms; }

/* Latido fuerte — modo clínica */
@keyframes paw-beat-strong {
  0%, 50%, 100% { transform: scale(1); }
  14%           { transform: scale(1.32); }
  28%           { transform: scale(1.12); }
}
.paw-pivot.beat-strong { animation-name: paw-beat-strong; animation-duration: 1100ms; }
```

---

## Checklist de implementación

- [ ] Crear `src/components/ui/PawLoader.vue` con el código de arriba
- [ ] Crear `src/components/ui/PageLoader.vue` para overlay full-screen
- [ ] Agregar tokens amatista en `tokens.css` si no existen
- [ ] (Opcional) `src/composables/useGlobalLoader.ts` + interceptor de axios
- [ ] Reemplazar todos los spinners genéricos del proyecto por `<PawLoader>`
- [ ] Verificar `prefers-reduced-motion` en tu QA
- [ ] Probar en botones — confirmá que `glow={false}` se ve crisp a 18–22px
- [ ] Probar en dark mode — el color amatista funciona, el glow también

---

## Notas técnicas

- **`viewBox="-40 -40 200 200"`** — la huella vive en el rect (0..120, 0..150), pero el viewBox se extiende hacia afuera para que el glow no se recorte.
- **`overflow: visible`** en el `<svg>` — necesario para que el glow externo no se corte en el borde del contenedor.
- **`transform-box: fill-box`** en `.paw-pivot` — hace que `transform-origin: center` se calcule sobre el bounding box del grupo, no sobre el viewBox completo.
- **Por qué el glow no es cuadrado**: el filtro toma el `SourceAlpha` (la silueta exacta) y la difumina. Si usaras `box-shadow` o `filter: drop-shadow` sobre un `<div>` cuadrado, el shadow seguiría el div, no la huella.
- **Por qué `fill="currentColor"` en cada elemento**: cuando se renderiza con `<use href="#paw">`, los nodos del `<defs>` se clonan al shadow tree y los atributos no heredados (como `fill` puesto en el `<g>` padre) no cruzan la frontera. Con `currentColor` directo en cada path/ellipse, sí toman el `color` del contenedor.

---

## Archivos incluidos

- `Loader Huella Latido.html` — referencia visual validada (abrí en navegador)
- `README.md` — esta guía

**Cualquier duda sobre intención visual, abre el HTML y mirá el mock.**
