import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiUrl = env.VITE_API_URL?.trim()
  const configuredProfile = env.VETSOFTWARE_PROFILE?.trim()

  if (mode !== 'test' && configuredProfile !== mode) {
    throw new Error(`Missing or mismatched environment file for Vite mode "${mode}".`)
  }

  if (mode !== 'localdev' && mode !== 'test' && !apiUrl) {
    throw new Error(`VITE_API_URL is required for Vite mode "${mode}".`)
  }

  return {
    plugins: [vue(), vuetify({ autoImport: true })],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
    server: {
      port: 5173,
      strictPort: true,
    },
  }
})
