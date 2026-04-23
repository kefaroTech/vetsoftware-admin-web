<script setup lang="ts">
import { ref } from 'vue'
import { useAuth } from '../composables/useAuth'
import { useNotification } from '@/composables/useNotification'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppToast from '@/components/feedback/AppToast.vue'

const { login } = useAuth()
const { notify } = useNotification()

const form = ref({ code: '', password: '' })
const loading = ref(false)
const errors = ref({ code: '', password: '' })

async function handleSubmit() {
  errors.value = { code: '', password: '' }
  if (!form.value.code) errors.value.code = 'Campo requerido'
  if (!form.value.password) errors.value.password = 'Campo requerido'
  if (errors.value.code || errors.value.password) return

  loading.value = true
  try {
    await login(form.value)
  } catch {
    notify('Código o contraseña incorrectos', 'error')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-gray-50">
    <div class="w-full max-w-sm rounded-xl bg-white p-8 shadow-md">
      <h1 class="mb-1 text-2xl font-bold text-gray-900">VetSoftware</h1>
      <p class="mb-6 text-sm text-gray-500">Panel de administración</p>

      <form class="flex flex-col gap-4" @submit.prevent="handleSubmit">
        <AppInput
          v-model="form.code"
          label="Código de usuario"
          placeholder="SYS001"
          :error="errors.code"
        />
        <AppInput
          v-model="form.password"
          label="Contraseña"
          type="password"
          placeholder="••••••••"
          :error="errors.password"
        />
        <AppButton type="submit" :loading="loading" class="w-full">Ingresar</AppButton>
      </form>
    </div>
    <AppToast />
  </div>
</template>
