<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ICONS } from '@/constants/icons'
import { useToast } from '@/composables/useToast'
import { useSystemConfig } from '../composables/useSystemConfig'
import UvtHelpAside from './UvtHelpAside.vue'

const { uvtConfig, uvtValue, fetch, saveUvt } = useSystemConfig()
const { errorFrom } = useToast()

const currentYear = new Date().getFullYear()
const editing = ref(false)
const draftDigits = ref('')
const err = ref('')
const saving = ref(false)

onMounted(fetch)

const value = computed(() => uvtValue.value)
const displayDraft = computed(() => Number(draftDigits.value || 0).toLocaleString('es-CO'))

function formatCOP(n: number) {
  return '$' + Math.round(n || 0).toLocaleString('es-CO')
}
function formatDate(iso: string | null | undefined) {
  if (!iso) return 'Sin modificar'
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? 'Sin modificar'
    : d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
}

function startEdit() {
  draftDigits.value = String(value.value)
  err.value = ''
  editing.value = true
}
function onInput(e: Event) {
  draftDigits.value = (e.target as HTMLInputElement).value.replace(/\D/g, '')
  err.value = ''
}
async function onSave() {
  const n = Number(draftDigits.value)
  if (!n || n < 1000) {
    err.value = 'Ingresa un valor válido en pesos (COP).'
    return
  }
  saving.value = true
  try {
    await saveUvt(n)
    editing.value = false
  } catch (e) {
    errorFrom('No se pudo guardar el valor de la UVT', e)
  } finally {
    saving.value = false
  }
}
function onKey(e: KeyboardEvent) {
  if (e.key === 'Enter') onSave()
  if (e.key === 'Escape') editing.value = false
}
</script>

<template>
  <div class="uvt-grid">
    <!-- Card principal -->
    <div class="card">
      <div class="card-head">
        <div class="head-ic"><component :is="ICONS.RECEIPT" :size="18" /></div>
        <div class="head-text ds-flex-fill">
          <div class="head-title">Valor UVT — {{ currentYear }}</div>
          <div class="head-sub">
            Unidad de Valor Tributario vigente para facturación electrónica
          </div>
        </div>
        <span class="badge"><span class="dot" />Vigente</span>
      </div>

      <div class="card-body">
        <template v-if="!editing">
          <div class="value-row">
            <div class="value-big">{{ formatCOP(value) }}</div>
            <div class="value-unit">COP / UVT</div>
          </div>
          <div class="info-row">
            <div class="info">
              <div class="info-lab">Año de vigencia</div>
              <div class="info-val">{{ currentYear }}</div>
            </div>
            <div class="info">
              <div class="info-lab">Última actualización</div>
              <div class="info-val">{{ formatDate(uvtConfig?.createdDate) }}</div>
            </div>
            <div class="spacer" />
            <button class="btn-edit" @click="startEdit">
              <component :is="ICONS.EDIT" :size="14" />Modificar valor
            </button>
          </div>
        </template>

        <template v-else>
          <label class="edit-label">Nuevo valor de la UVT {{ currentYear }} (COP)</label>
          <div class="edit-box" :class="{ error: err }">
            <span class="edit-prefix">$</span>
            <input
              autofocus
              inputmode="numeric"
              :value="displayDraft"
              class="edit-input"
              @input="onInput"
              @keydown="onKey"
            />
            <span class="edit-suffix">COP</span>
          </div>
          <div v-if="err" class="edit-err"><component :is="ICONS.INFO" :size="13" />{{ err }}</div>
          <div class="edit-actions ds-flex-row">
            <button class="btn-save" :disabled="saving" @click="onSave">
              <component :is="ICONS.CHECK" :size="14" />{{
                saving ? 'Guardando…' : 'Guardar cambios'
              }}
            </button>
            <button class="btn-cancel" @click="editing = false">Cancelar</button>
            <div class="spacer" />
            <span class="edit-hint">Enter para guardar · Esc para cancelar</span>
          </div>
        </template>
      </div>

      <!-- Histórico -->
      <div class="history">
        <div class="history-head ds-flex-row">
          <component :is="ICONS.HISTORY" :size="14" />
          <span>Histórico de vigencias</span>
        </div>
        <div class="history-empty">
          Aún no se registran vigencias anteriores. El sistema mantiene el valor vigente del año en
          curso.
        </div>
      </div>
    </div>

    <!-- Lateral explicativo -->
    <UvtHelpAside />
  </div>
</template>

<style scoped>
.uvt-grid {
  display: grid;
  grid-template-columns: 1.3fr 1fr;
  gap: 20px;
  align-items: start;
}

@media (width <= 1100px) {
  .uvt-grid {
    grid-template-columns: 1fr;
  }
}

.card {
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 14px;
  overflow: hidden;
}

.card-head {
  padding: 18px 24px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  gap: 12px;
}

.head-ic {
  width: 36px;
  height: 36px;
  border-radius: 9px;
  background: var(--amatista-100);
  color: var(--amatista-600);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.head-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}

.head-sub {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 2px;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  background: var(--success-bg);
  color: var(--success-fg);
}

.badge .dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentcolor;
}

.card-body {
  padding: 28px 24px;
}

.value-row {
  display: flex;
  align-items: flex-end;
  gap: 16px;
  margin-bottom: 8px;
}

.value-big {
  font-family: var(--font-display);
  font-size: 56px;
  font-weight: 400;
  color: var(--text);
  line-height: 1;
  letter-spacing: -0.02em;
}

.value-unit {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: var(--text-subtle);
  padding-bottom: 8px;
}

.info-row {
  display: flex;
  gap: 24px;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--border);
}

.info-lab {
  font-size: 10px;
  font-weight: 600;
  color: var(--text-subtle);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 5px;
}

.info-val {
  font-size: 13px;
  color: var(--text);
}

.spacer {
  flex: 1;
}

.btn-edit {
  align-self: flex-end;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 9px;
  border: none;
  background: var(--gradient-primary);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  box-shadow:
    0 4px 12px -2px rgb(86 77 197 / 40%),
    inset 0 1px 0 rgb(255 255 255 / 15%);
}

.edit-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--warm-700);
  display: block;
  margin-bottom: 8px;
}

.edit-box {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: #fff;
  border: 1px solid var(--amatista-450);
  border-radius: 9px;
  box-shadow: 0 0 0 4px rgb(119 119 227 / 12%);
}

.edit-box.error {
  border-color: var(--danger-border);
  box-shadow: none;
}

.edit-prefix {
  font-family: var(--font-display);
  font-size: 28px;
  color: var(--amatista-600);
}

.edit-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-family: var(--font-display);
  font-size: 40px;
  color: var(--text);
  min-width: 0;
  line-height: 1;
}

.edit-suffix {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: var(--text-subtle);
}

.edit-err {
  font-size: 12px;
  color: var(--danger-fg);
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.edit-actions {
  margin-top: 18px;
}

.btn-save {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 9px;
  border: none;
  background: var(--warm-900);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
}

.btn-save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-cancel {
  padding: 10px 18px;
  border-radius: 9px;
  border: 1px solid var(--warm-450);
  background: #fff;
  color: var(--warm-700);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
}

.edit-hint {
  font-size: 11px;
  color: var(--text-subtle);
}

.history {
  padding: 18px 24px;
  border-top: 1px solid var(--border);
  background: var(--surface);
}

.history-head {
  margin-bottom: 14px;
  color: var(--amatista-600);
}

.history-head span {
  font-size: 11px;
  font-weight: 600;
  color: var(--warm-700);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.history-empty {
  font-size: 12px;
  color: var(--text-subtle);
  line-height: 1.5;
}
</style>
