<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Icon } from '@iconify/vue'
import { ICONS } from '@/constants/icons'
import { useNotification } from '@/composables/useNotification'
import { useSystemConfig } from '../composables/useSystemConfig'

const { uvtConfig, uvtValue, fetch, saveUvt } = useSystemConfig()
const { notifyError } = useNotification()

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
    notifyError('No se pudo guardar el valor de la UVT', e)
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
        <div class="head-ic"><Icon :icon="ICONS.RECEIPT" width="18" height="18" /></div>
        <div class="head-text">
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
              <Icon :icon="ICONS.EDIT" width="14" height="14" />Modificar valor
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
          <div v-if="err" class="edit-err">
            <Icon :icon="ICONS.INFO" width="13" height="13" />{{ err }}
          </div>
          <div class="edit-actions">
            <button class="btn-save" :disabled="saving" @click="onSave">
              <Icon :icon="ICONS.CHECK" width="14" height="14" />{{
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
        <div class="history-head">
          <Icon :icon="ICONS.HISTORY" width="14" height="14" />
          <span>Histórico de vigencias</span>
        </div>
        <div class="history-empty">
          Aún no se registran vigencias anteriores. El sistema mantiene el valor vigente del año en
          curso.
        </div>
      </div>
    </div>

    <!-- Lateral explicativo -->
    <div class="aside">
      <div class="explain">
        <div class="explain-glow" />
        <div class="explain-body">
          <div class="explain-kicker">// ¿QUÉ ES LA UVT?</div>
          <p>
            La <strong>Unidad de Valor Tributario</strong> es la medida que la DIAN actualiza cada
            año para estandarizar valores tributarios. VetSoftware la usa para calcular topes y
            referencias en la <strong>facturación electrónica</strong>.
          </p>
        </div>
      </div>
      <div class="note">
        <div class="note-ic"><Icon :icon="ICONS.INFO" width="16" height="16" /></div>
        <div>
          <div class="note-title">Importante</div>
          <p>
            Actualiza este valor cada inicio de año con la cifra oficial publicada por la DIAN. Un
            valor incorrecto afecta directamente los cálculos de facturación.
          </p>
        </div>
      </div>
    </div>
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
  border: 1px solid #ece5f4;
  border-radius: 14px;
  overflow: hidden;
}

.card-head {
  padding: 18px 24px;
  border-bottom: 1px solid #ece5f4;
  display: flex;
  align-items: center;
  gap: 12px;
}

.head-ic {
  width: 36px;
  height: 36px;
  border-radius: 9px;
  background: #f3e8ff;
  color: #7e22ce;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.head-text {
  flex: 1;
  min-width: 0;
}

.head-title {
  font-size: 14px;
  font-weight: 600;
  color: #1a1325;
}

.head-sub {
  font-size: 12px;
  color: #6b5b80;
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
  background: #dcfce7;
  color: #166534;
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
  font-family: 'Instrument Serif', Georgia, serif;
  font-size: 56px;
  font-weight: 400;
  color: #1a1325;
  line-height: 1;
  letter-spacing: -0.02em;
}

.value-unit {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: #a89bbd;
  padding-bottom: 8px;
}

.info-row {
  display: flex;
  gap: 24px;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #f3eef9;
}

.info-lab {
  font-size: 10px;
  font-weight: 600;
  color: #a89bbd;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 5px;
}

.info-val {
  font-size: 13px;
  color: #1a1325;
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
  background: linear-gradient(180deg, #9333ea, #7e22ce);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  box-shadow:
    0 4px 12px -2px rgb(126 34 206 / 40%),
    inset 0 1px 0 rgb(255 255 255 / 15%);
}

.edit-label {
  font-size: 12px;
  font-weight: 600;
  color: #3d2e57;
  display: block;
  margin-bottom: 8px;
}

.edit-box {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: #fff;
  border: 1px solid #a855f7;
  border-radius: 9px;
  box-shadow: 0 0 0 4px rgb(168 85 247 / 12%);
}

.edit-box.error {
  border-color: #dc2626;
  box-shadow: none;
}

.edit-prefix {
  font-family: 'Instrument Serif', Georgia, serif;
  font-size: 28px;
  color: #7e22ce;
}

.edit-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-family: 'Instrument Serif', Georgia, serif;
  font-size: 40px;
  color: #1a1325;
  min-width: 0;
  line-height: 1;
}

.edit-suffix {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: #a89bbd;
}

.edit-err {
  font-size: 12px;
  color: #dc2626;
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.edit-actions {
  display: flex;
  gap: 8px;
  margin-top: 18px;
  align-items: center;
}

.btn-save {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 9px;
  border: none;
  background: #1a1325;
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
  border: 1px solid #ece5f4;
  background: #fff;
  color: #3d2e57;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
}

.edit-hint {
  font-size: 11px;
  color: #a89bbd;
}

.history {
  padding: 18px 24px;
  border-top: 1px solid #ece5f4;
  background: #fbfaff;
}

.history-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
  color: #7e22ce;
}

.history-head span {
  font-size: 11px;
  font-weight: 600;
  color: #3d2e57;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.history-empty {
  font-size: 12px;
  color: #a89bbd;
  line-height: 1.5;
}

.aside {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.explain {
  background: linear-gradient(135deg, #581c87, #3b0764);
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
  background: radial-gradient(circle, rgb(216 180 254 / 25%), transparent 70%);
}

.explain-body {
  position: relative;
}

.explain-kicker {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: #d8b4fe;
  letter-spacing: 0.08em;
  margin-bottom: 10px;
}

.explain p {
  font-size: 13px;
  color: #e9d5ff;
  line-height: 1.55;
  margin: 0;
}

.explain strong {
  color: #fff;
}

.note {
  background: #fff;
  border: 1px solid #ece5f4;
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
  background: #f3e8ff;
  color: #7e22ce;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.note-title {
  font-size: 13px;
  font-weight: 600;
  color: #1a1325;
  margin-bottom: 4px;
}

.note p {
  font-size: 12px;
  color: #6b5b80;
  line-height: 1.5;
  margin: 0;
}
</style>
