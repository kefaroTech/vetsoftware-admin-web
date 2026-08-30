import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import AppTable from '@/components/ui/AppTable.vue'

/**
 * Guarda de EST-10 — WCAG 2.2 §1.4.10 Reflow (AA).
 *
 * `AppTable` es la tabla de las 19 vistas de listado de la consola. Su caja
 * exterior declaraba `overflow: hidden` para redondear las esquinas, y ese
 * recorte hacía literalmente inalcanzables las últimas columnas en cuanto la
 * tabla era más ancha que el contenedor: no había scroll horizontal, había
 * amputación. En `BaseRolePermissionsListView` o `SubModulesListView`
 * —las más anchas— eso se traduce en que a 320–640 px de ancho la columna de
 * acciones simplemente no existe para el usuario. No es incomodidad: es
 * contenido perdido, y §1.4.10 lo prohíbe.
 *
 * El arreglo envuelve el `<table>` en `.ds-table-scroll` (que aporta
 * `overflow-x: auto`) y quita el `overflow: hidden` de `.tabla-caja`.
 *
 * Esta prueba sujeta las TRES piezas del arreglo, porque cada una se puede
 * deshacer por separado y las tres son necesarias:
 *
 *   1. el envoltorio existe y está DONDE debe (entre la caja y la tabla);
 *   2. la caja ya no recorta;
 *   3. `.ds-table-scroll` sigue siendo un contenedor con scroll y no una clase
 *      vacía — sin esto, 1 y 2 juntos dan una tabla que se desborda de la
 *      tarjeta en vez de desplazarse dentro de ella.
 *
 * Lo que NO mide: el criterio de verdad se cumple a 320 px con contenido real,
 * y eso pide un navegador. Ver la nota al pie de este archivo.
 */

const ROOT = path.resolve(import.meta.dirname, '../..')

/** Contenido de `<style scoped>` de un SFC, sin comentarios. */
function scopedStyle(sfcRelativePath: string): string {
  const source = readFileSync(path.join(ROOT, sfcRelativePath), 'utf8')
  const match = /<style scoped>([\s\S]*?)<\/style>/.exec(source)
  if (match === null) throw new Error(`${sfcRelativePath} no declara <style scoped>`)
  const contenido = match[1]
  if (contenido === undefined)
    throw new Error(`${sfcRelativePath}: <style scoped> sin grupo capturado`)
  // Los comentarios explican precisamente el `overflow: hidden` que se retiró;
  // dejarlos dentro haría que la búsqueda encontrara su propia lápida.
  return contenido.replace(/\/\*[\s\S]*?\*\//g, '')
}

/** Cuerpo de una regla de primer nivel dentro de una hoja de estilos. */
function ruleBlock(css: string, selector: string, where: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`).exec(css)
  if (match === null) throw new Error(`${where} no declara la regla ${selector}`)
  const cuerpo = match[1]
  if (cuerpo === undefined) throw new Error(`${where}: la regla ${selector} no capturó cuerpo`)
  return cuerpo
}

const APP_TABLE_CSS = scopedStyle('src/components/ui/AppTable.vue')
const PRIMITIVES = readFileSync(
  path.join(ROOT, 'src/assets/styles/primitives.css'),
  'utf8',
).replace(/\/\*[\s\S]*?\*\//g, '')

const montar = () =>
  mount(AppTable, {
    props: { headers: ['Rol base', 'Permiso', 'Módulo', 'Submódulo', 'Estado', 'Acciones'] },
    slots: {
      default: '<tr><td>Administrador</td><td>company.read</td><td colspan="4">—</td></tr>',
    },
  })

describe('AppTable — scroll horizontal (EST-10 / WCAG 2.2 §1.4.10, AA)', () => {
  it('envuelve la tabla en un contenedor .ds-table-scroll', () => {
    const table = montar().find('table')
    expect(table.exists()).toBe(true)

    const scroll = table.element.closest('.ds-table-scroll')
    expect(scroll, 'el <table> no tiene ningún ancestro .ds-table-scroll').not.toBeNull()
  })

  it('el contenedor de scroll está ENTRE la caja y la tabla', () => {
    // El orden importa: un `.ds-table-scroll` por fuera de `.tabla-caja` no
    // sirve de nada, porque quien recortaría seguiría siendo la caja.
    const wrapper = montar()
    const table = wrapper.find('table').element
    const scroll = table.closest('.ds-table-scroll')
    const caja = table.closest('.tabla-caja')

    expect(caja, 'se perdió la caja .tabla-caja').not.toBeNull()
    expect(scroll, 'se perdió el envoltorio .ds-table-scroll').not.toBeNull()
    expect(scroll).not.toBe(caja)
    expect(
      (caja as Element).contains(scroll),
      '.ds-table-scroll debe estar dentro de .tabla-caja, no al revés',
    ).toBe(true)
  })

  it('.tabla-caja ya no declara overflow: hidden', () => {
    const caja = ruleBlock(APP_TABLE_CSS, '.tabla-caja', 'AppTable.vue')
    expect(caja, '.tabla-caja volvió a recortar y amputa las últimas columnas').not.toMatch(
      /overflow[^:]*:\s*hidden/,
    )
  })

  it('.ds-table-scroll sigue aportando overflow-x: auto', () => {
    // Sin esto, quitar el recorte de la caja no arregla nada: cambia una tabla
    // amputada por una tabla que se sale de la tarjeta.
    const scroll = ruleBlock(PRIMITIVES, '.ds-table-scroll', 'primitives.css')
    expect(scroll).toMatch(/overflow-x\s*:\s*auto/)
  })
})

/*
 * PENDIENTE — el complemento que mide el criterio de verdad.
 *
 * Lo anterior comprueba la ESTRUCTURA del arreglo, que es lo que se puede
 * romper en una revisión distraída. Lo que no comprueba es el comportamiento:
 * que a ~640 px de ancho el contenedor tenga `scrollWidth > clientWidth` y que
 * la última columna sea alcanzable tras desplazar. Eso exige un navegador con
 * layout real —jsdom no calcula ninguna de las dos medidas— y una vista de
 * listado con datos, es decir, sesión iniciada contra `localdev`.
 *
 * Este repositorio no tiene hoy arnés de E2E de flujo: `playwright.config.ts`
 * apunta a `./e2e`, un directorio que no existe, y no hay fixture de sesión ni
 * datos sembrados. Escribir esa prueba aquí significa crear el arnés entero
 * (login, `storageState`, datos de roles/permisos), no añadir un spec.
 */
