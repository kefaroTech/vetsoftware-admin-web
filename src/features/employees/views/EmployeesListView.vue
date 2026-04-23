<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useEmployees } from '../composables/useEmployees'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import AppLayout from '@/components/layout/AppLayout.vue'
import AppTable from '@/components/ui/AppTable.vue'
import AppButton from '@/components/ui/AppButton.vue'
import EmployeeStatusBadge from '../components/EmployeeStatusBadge.vue'

const { employees, loading, fetchAll, remove } = useEmployees()
const { confirm } = useConfirmDialog()

onMounted(fetchAll)

async function handleDelete(id: number, name: string) {
  const ok = await confirm(`¿Eliminar al empleado "${name}"?`)
  if (ok) await remove(id)
}
</script>

<template>
  <AppLayout>
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-bold text-gray-900">Empleados</h1>
      <RouterLink to="/empleados/nuevo">
        <AppButton>+ Nuevo empleado</AppButton>
      </RouterLink>
    </div>

    <AppTable
      :headers="['Código', 'Nombre', 'Email', 'Estado', 'Acciones']"
      :loading="loading"
      :empty="employees.length === 0"
    >
      <tr v-for="emp in employees" :key="emp.id" class="border-t border-gray-100 hover:bg-gray-50">
        <td class="px-4 py-3 font-mono text-sm text-gray-600">{{ emp.employeeCode }}</td>
        <td class="px-4 py-3 font-medium text-gray-900">{{ emp.name }}</td>
        <td class="px-4 py-3 text-gray-600">{{ emp.email }}</td>
        <td class="px-4 py-3"><EmployeeStatusBadge :status="emp.status" /></td>
        <td class="px-4 py-3">
          <div class="flex gap-2">
            <RouterLink :to="`/empleados/${emp.id}`" class="text-xs text-indigo-600 hover:underline">
              Editar
            </RouterLink>
            <button class="text-xs text-red-500 hover:underline" @click="handleDelete(emp.id, emp.name)">
              Eliminar
            </button>
          </div>
        </td>
      </tr>
    </AppTable>
  </AppLayout>
</template>
