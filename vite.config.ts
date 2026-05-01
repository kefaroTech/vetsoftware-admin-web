import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'
import path from 'path'

const API_TARGET = 'http://localhost:8080'

export default defineConfig({
  plugins: [vue(), vuetify({ autoImport: true })],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/auth': API_TARGET,
      '/companies': API_TARGET,
      '/employees': API_TARGET,
      '/memberships': API_TARGET,
      '/modules': API_TARGET,
      '/sub-modules': API_TARGET,
      '/base-permissions': API_TARGET,
      '/permissions': API_TARGET,
      '/base-roles': API_TARGET,
      '/base-role-permissions': API_TARGET,
      '/membership-sub-modules': API_TARGET,
    },
  },
})
