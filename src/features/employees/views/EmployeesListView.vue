<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useEmployees } from '../composables/useEmployees'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import AppLayout from '@/components/layout/AppLayout.vue'
import AppTable from '@/components/ui/AppTable.vue'
import AppModal from '@/components/ui/AppModal.vue'
import EmployeeForm from '../components/EmployeeForm.vue'
import EmployeeStatusBadge from '../components/EmployeeStatusBadge.vue'
import type { CreateEmployeeCommand, UpdateEmployeeCommand } from '../types/employees.types'

const { employees, loading, fetchAll, create, remove } = useEmployees()
const { confirm } = useConfirmDialog()
const showModal = ref(false)
const formLoading = ref(false)

onMounted(fetchAll)

async function handleCreate(data: CreateEmployeeCommand | UpdateEmployeeCommand) {
  formLoading.value = true
  try {
    await create(data as CreateEmployeeCommand)
    showModal.value = false
  } finally {
    formLoading.value = false
  }
}

async function handleDelete(id: number, name: string) {
  const ok = await confirm(`¿Eliminar al empleado "${name}"?`)
  if (ok) await remove(id)
}
</script>

<template>
  <AppLayout>
    <div class="d-flex align-center justify-space-between mb-6">
      <h1 class="text-h4 font-weight-bold">Empleados</h1>
      <v-btn color="primary" prepend-icon="mdi-plus" @click="showModal = true">
        Nuevo empleado
      </v-btn>
    </div>

    <AppTable
      :headers="['Código', 'Nombre', 'Email', 'Estado', 'Acciones']"
      :loading="loading"
      :empty="employees.length === 0"
    >
      <tr v-for="emp in employees" :key="emp.id">
        <td class="text-body-2 font-mono">{{ emp.employeeCode }}</td>
        <td class="font-weight-medium">{{ emp.name }}</td>
        <td>{{ emp.email }}</td>
        <td><EmployeeStatusBadge :status="emp.status" /></td>
        <td>
          <div class="d-flex ga-1">
            <v-btn
              :to="`/empleados/${emp.id}`"
              size="small"
              variant="text"
              color="primary"
              icon="mdi-pencil"
            />
            <v-btn
              size="small"
              variant="text"
              color="error"
              icon="mdi-delete"
              @click="handleDelete(emp.id, emp.name)"
            />
          </div>
        </td>
      </tr>
    </AppTable>

    <AppModal :open="showModal" title="Nuevo empleado" @close="showModal = false">
      <EmployeeForm
        mode="create"
        :loading="formLoading"
        @submit="handleCreate"
        @cancel="showModal = false"
      />
    </AppModal>
  </AppLayout>
</template>
