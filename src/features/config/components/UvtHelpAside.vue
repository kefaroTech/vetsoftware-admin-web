<script setup lang="ts">
import { ICONS } from '@/constants/icons'

/**
 * Lateral explicativo del editor de UVT: qué es la unidad y el aviso de
 * actualización anual. Es contenido estático sin estado ni props — se extrajo
 * de `UvtEditor.vue` (auditoría FE-08) porque su CSS era el 40 % del archivo y
 * no comparte ninguna regla con el editor.
 */
</script>

<template>
  <div class="ds-stack ds-stack--16">
    <div class="explain">
      <div class="explain-glow" />
      <div class="explain-body">
        <div class="explain-kicker">// ¿QUÉ ES LA UVT?</div>
        <p>
          La <strong>Unidad de Valor Tributario</strong> es la medida que la DIAN actualiza cada año
          para estandarizar valores tributarios. Lumbre la usa para calcular topes y referencias en
          la <strong>facturación electrónica</strong>.
        </p>
      </div>
    </div>
    <div class="note">
      <div class="note-ic"><component :is="ICONS.INFO" :size="16" /></div>
      <div>
        <div class="note-title">Importante</div>
        <p>
          Actualiza este valor cada inicio de año con la cifra oficial publicada por la DIAN. Un
          valor incorrecto afecta directamente los cálculos de facturación.
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.explain {
  background: linear-gradient(135deg, var(--amatista-700), var(--amatista-800));
  border-radius: 14px;
  padding: 22px 24px;
  color: #fff;
  position: relative;
  overflow: hidden;
}

.explain-glow {
  position: absolute;
  top: -40px;
  right: -40px;
  width: 160px;
  height: 160px;
  border-radius: 50%;
  background: radial-gradient(circle, rgb(170 175 254 / 25%), transparent 70%);
}

.explain-body {
  position: relative;
}

.explain-kicker {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--amatista-200);
  letter-spacing: 0.08em;
  margin-bottom: 10px;
}

.explain p {
  font-size: 13px;
  color: var(--amatista-100);
  line-height: 1.55;
  margin: 0;
}

.explain strong {
  color: #fff;
}

.note {
  background: #fff;
  border: 1px solid var(--info-border);
  border-radius: 12px;
  padding: 18px 20px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.note-ic {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--amatista-100);
  color: var(--amatista-600);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.note-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 4px;
}

.note p {
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.5;
  margin: 0;
}
</style>
