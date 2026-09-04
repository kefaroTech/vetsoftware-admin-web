import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import {
  bloquearFuentesRemotas,
  esperarPantalla,
  interceptarApi,
  inventariarEndpoints,
  sembrarSesion,
  type Control,
} from './arnes'

/**
 * Dos comprobaciones de VALIDEZ del arnés, no de la aplicación.
 *
 * 1. Que las capturas se pintan con las familias del producto y no con la de
 *    respaldo del sistema. `document.fonts.check()` no sirve de guarda: devuelve
 *    `true` para cualquier familia sin `@font-face`, así que un contador de
 *    ausencias da cero aunque no haya cargado ninguna. Aquí se cuentan las caras
 *    DECLARADAS y se comprueba el `status` de cada una, y además se mide el
 *    ancho de una cadena contra el de una familia inexistente: si los dos
 *    coinciden, se está pintando con el respaldo.
 *
 * 2. Si al pulsar el relleno del envoltorio de un campo se enfoca su `<input>`.
 *    De eso depende que un input de 19,5 px de alto sea un objetivo táctil real
 *    de 19,5 px (hallazgo de §2.5.8) o la caja interior de un control de 41 px
 *    (falso positivo).
 */

const SCRATCH =
  process.env.UXA_SCRATCH ??
  'C:/Users/ORLAND~1/AppData/Local/Temp/claude/C--Users-Orlando-Velasquez-Documents-Proyectos-MainVetSoftware/f56969b5-ac11-4b7e-87fc-3e60aee284b8/scratchpad'

test('valida tipografía real y objetivo táctil del campo de formulario', async ({
  page,
}, testInfo) => {
  const configuracion = testInfo.config.configFile
  const raiz = configuracion === undefined ? process.cwd() : join(configuracion, '..')
  const control: Control = { modo: 'lleno' }
  await bloquearFuentesRemotas(page)
  await interceptarApi(page, inventariarEndpoints(raiz), control)
  await sembrarSesion(page)
  await page.goto('/login')
  await esperarPantalla(page)

  const tipografia = await page.evaluate(() => {
    const caras = [...document.fonts].map((f) => ({
      family: f.family,
      weight: f.weight,
      status: f.status,
    }))
    const medir = (familia: string): number => {
      const lienzo = document.createElement('canvas')
      const ctx = lienzo.getContext('2d')
      if (ctx === null) return 0
      ctx.font = `600 16px ${familia}`
      return Math.round(ctx.measureText('Gestiona lo que cuidas — 0123456789').width * 100) / 100
    }
    const campo = document.querySelector('#login-code')
    return {
      carasDeclaradas: caras.length,
      carasCargadas: caras.filter((c) => c.status === 'loaded').length,
      caras,
      anchoInter: medir("'Inter'"),
      anchoPoppins: medir("'Poppins'"),
      anchoRespaldo: medir("'UXA Familia Inexistente'"),
      familiaComputadaDelCampo:
        campo === null ? null : getComputedStyle(campo).fontFamily.slice(0, 80),
    }
  })

  const objetivo = await page.evaluate(() => {
    const input = document.querySelector<HTMLElement>('#login-code')
    const envoltorio = input?.parentElement ?? null
    if (input === null || envoltorio === null) return null
    const ri = input.getBoundingClientRect()
    const re = envoltorio.getBoundingClientRect()
    const s = getComputedStyle(envoltorio)
    return {
      input: { width: ri.width, height: ri.height, top: ri.top, left: ri.left },
      envoltorio: {
        clase: envoltorio.className,
        width: re.width,
        height: re.height,
        top: re.top,
        left: re.left,
        paddingTop: s.paddingTop,
        paddingBottom: s.paddingBottom,
      },
      // El punto que se va a pulsar: dentro del envoltorio, encima del input.
      puntoRelleno: { x: re.left + re.width / 2, y: re.top + 3 },
      envueltoEnLabel: input.closest('label') !== null,
    }
  })
  expect(objetivo).not.toBeNull()

  await page.evaluate(() => {
    ;(document.activeElement as HTMLElement | null)?.blur()
  })
  await page.mouse.click(objetivo?.puntoRelleno.x ?? 0, objetivo?.puntoRelleno.y ?? 0)
  const trasPulsarRelleno = await page.evaluate(() => {
    const activo = document.activeElement
    return activo === null ? null : `${activo.tagName.toLowerCase()}#${activo.id}`
  })

  await page.evaluate(() => {
    ;(document.activeElement as HTMLElement | null)?.blur()
  })
  const centro = objetivo?.input
  await page.mouse.click(
    (centro?.left ?? 0) + (centro?.width ?? 0) / 2,
    (centro?.top ?? 0) + (centro?.height ?? 0) / 2,
  )
  const trasPulsarInput = await page.evaluate(() => {
    const activo = document.activeElement
    return activo === null ? null : `${activo.tagName.toLowerCase()}#${activo.id}`
  })

  const veredicto = {
    tipografia,
    objetivoTactilDeCampo: {
      ...objetivo,
      focoTrasPulsarElRellenoDelEnvoltorio: trasPulsarRelleno,
      focoTrasPulsarElInput: trasPulsarInput,
      elRellenoEnfoca: trasPulsarRelleno === trasPulsarInput,
    },
  }
  writeFileSync(
    join(SCRATCH, 'uxa-verificacion-admin.json'),
    JSON.stringify(veredicto, null, 2),
    'utf8',
  )
  console.log(JSON.stringify(veredicto, null, 2))
})
