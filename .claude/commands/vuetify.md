# Vuetify 3 Design System

Apply Vuetify 3 best practices to all UI work in this project. Replace any existing Tailwind CSS markup with Vuetify components. Follow these rules strictly:

## Stack

- **Vuetify 3** (with Material Design 3) for all UI components
- **Vue 3 Composition API** with `<script setup lang="ts">`
- No Tailwind CSS classes in components — use Vuetify's layout system instead

## Layout & Navigation

- Use `<v-app>` as root wrapper in App.vue
- `<v-navigation-drawer>` for the sidebar (AppSidebar)
- `<v-app-bar>` for the top header (AppHeader)
- `<v-main>` as the main content area (AppLayout)
- `<v-container fluid>` inside `<v-main>` for page content

## Components mapping (replace custom components)

| Current custom component | Vuetify replacement                               |
| ------------------------ | ------------------------------------------------- |
| `AppButton`              | `<v-btn>` with `variant="elevated/outlined/text"` |
| `AppInput`               | `<v-text-field>` with `variant="outlined"`        |
| `AppTable`               | `<v-data-table>`                                  |
| `AppModal`               | `<v-dialog>` with `<v-card>` inside               |
| `AppBadge`               | `<v-chip>`                                        |
| `AppSpinner`             | `<v-progress-circular indeterminate>`             |
| `AppPagination`          | `<v-pagination>`                                  |
| select elements          | `<v-select>`                                      |
| checkbox inputs          | `<v-checkbox>`                                    |

## Forms

- Wrap forms in `<v-form ref="formRef">` to enable validation
- Use `:rules` prop on each field for inline validation
- Use `v-model` on all form fields
- Example validation rule: `:rules="[v => !!v || 'Campo requerido']"`

## Spacing & Typography

- Use Vuetify spacing utilities: `class="ma-4 pa-2"` (margin/padding scale 0-16)
- Headings: `<v-card-title>`, `class="text-h5"`, `class="text-h6"`, `class="text-body-1"`
- Colors via theme: `color="primary"`, `color="error"`, `color="success"`

## Cards & Containers

- Wrap page content in `<v-card>` or `<v-sheet>` with `rounded="lg" elevation="1"`
- Use `<v-card-title>`, `<v-card-text>`, `<v-card-actions>` for card structure
- Toolbars inside cards: `<v-toolbar flat>`

## Data Tables

- Use `<v-data-table :headers="headers" :items="items" :loading="loading">`
- Define headers as: `{ title: 'Nombre', key: 'name', sortable: true }`
- Use `item.actions` slot for action buttons

## Buttons

- Primary action: `<v-btn color="primary" variant="elevated">`
- Secondary: `<v-btn variant="outlined">`
- Destructive: `<v-btn color="error" variant="text">`
- Icon buttons: `<v-btn icon="mdi-pencil" size="small">`

## Notifications / Snackbar

- Replace `useNotification` toast with `<v-snackbar>` component
- Colors: `color="success"`, `color="error"`, `color="warning"`

## Dialogs / Confirm

- Use `<v-dialog v-model="dialog" max-width="400">` for modals and confirmations
- Always include a `<v-card>` with title, text and actions inside the dialog

## Theme configuration (vuetify plugin)

Define a custom theme in `src/plugins/vuetify.ts`:

```ts
import { createVuetify } from 'vuetify'
const theme = {
  dark: false,
  colors: {
    primary: '#4F46E5', // indigo-600
    secondary: '#6B7280',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
  },
}
export default createVuetify({ theme: { defaultTheme: 'custom', themes: { custom: theme } } })
```

## File conventions

- Register Vuetify in `src/main.ts` with `app.use(vuetify)`
- Import icons from `mdi` (MaterialDesign icons are bundled with Vuetify)
- Do NOT use `vuetify/styles` global import — use tree-shaking via Vite plugin

## General rules

- Always prefer Vuetify semantic components over raw HTML elements
- Use `density="comfortable"` on inputs and tables for a clean look
- Keep components small — extract reusable pieces if a template exceeds ~80 lines
- When refactoring existing components, preserve all existing logic/props/emits — only change the template markup
