<script setup lang="ts">
import { useId } from 'vue'

interface Props {
  size?: number
  color?: string
  glow?: boolean
  speed?: number
  label?: string
}

const props = withDefaults(defineProps<Props>(), {
  size: 64,
  color: 'currentColor',
  glow: true,
  speed: 1200,
  label: 'Cargando',
})

const filterId = `paw-glow-${useId()}`
</script>

<template>
  <span
    class="paw-loader"
    role="status"
    :aria-label="props.label"
    :style="{
      width: `${props.size}px`,
      height: `${props.size}px`,
      color: props.color,
      '--paw-speed': `${props.speed}ms`,
    }"
  >
    <svg viewBox="-40 -40 200 200" aria-hidden="true">
      <defs>
        <filter v-if="props.glow" :id="filterId" x="-60%" y="-60%" width="220%" height="220%">
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

      <g class="paw-pivot" :filter="props.glow ? `url(#${filterId})` : undefined">
        <path fill="currentColor" d="M 60 58 C 80 58, 94 72, 97 90 C 100 105, 92 120, 80 124 C 73 127, 66 124, 60 124 C 54 124, 47 127, 40 124 C 28 120, 20 105, 23 90 C 26 72, 40 58, 60 58 Z" />
        <ellipse fill="currentColor" cx="42" cy="22" rx="14" ry="19" />
        <ellipse fill="currentColor" cx="78" cy="22" rx="14" ry="19" />
        <ellipse fill="currentColor" cx="14" cy="46" rx="12" ry="16" transform="rotate(-25 14 46)" />
        <ellipse fill="currentColor" cx="106" cy="46" rx="12" ry="16" transform="rotate(25 106 46)" />
      </g>
    </svg>
    <span class="sr-only">{{ props.label }}</span>
  </span>
</template>

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
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (prefers-reduced-motion: reduce) {
  .paw-pivot { animation: none; }
}
</style>
