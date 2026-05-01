<script setup lang="ts">
import { ref } from 'vue'
import { useAuth } from '../composables/useAuth'
import { useNotification } from '@/composables/useNotification'

const { login } = useAuth()
const { notify } = useNotification()

const form = ref({ code: '', password: '' })
const loading = ref(false)
const formValid = ref(false)

const requiredRule = (v: string) => !!v || 'Campo requerido'

async function handleSubmit() {
  if (!formValid.value) return
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
  <v-main class="bg-background">
    <v-container class="fill-height" fluid>
      <v-row align="center" justify="center">
        <v-col cols="12" sm="8" md="5" lg="4">
          <v-card rounded="xl" elevation="3" class="pa-2">
            <v-card-text class="pa-6">
              <h1 class="text-h5 font-weight-bold text-primary mb-1">VetSoftware</h1>
              <p class="text-body-2 text-medium-emphasis mb-6">Panel de administración</p>

              <v-form v-model="formValid" @submit.prevent="handleSubmit">
                <v-text-field
                  v-model="form.code"
                  label="Código de usuario"
                  placeholder="SYS001"
                  prepend-inner-icon="mdi-account"
                  :rules="[requiredRule]"
                  class="mb-2"
                />
                <v-text-field
                  v-model="form.password"
                  label="Contraseña"
                  type="password"
                  placeholder="••••••••"
                  prepend-inner-icon="mdi-lock"
                  :rules="[requiredRule]"
                  class="mb-4"
                />
                <v-btn
                  type="submit"
                  color="primary"
                  variant="elevated"
                  :loading="loading"
                  block
                  size="large"
                >
                  Ingresar
                </v-btn>
              </v-form>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </v-main>
</template>
