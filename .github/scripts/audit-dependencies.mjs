#!/usr/bin/env node
import { spawnSync } from 'node:child_process'

/**
 * `npm audit` devuelve el mismo codigo de salida 1 para dos situaciones que no
 * se parecen en nada: hay vulnerabilidades, o el registro no contesta. Como los
 * pasos del workflow corren bajo `bash -e`, un 503 de npmjs —que no dice nada
 * sobre este codigo— cancelaba el resto del job y, por `needs:`, tambien la
 * auditoria del sistema de diseno y la regresion visual. La disponibilidad de un
 * tercero no puede decidir si se puede mergear o publicar una release.
 *
 * Aqui los dos casos se separan leyendo el informe en vez del codigo de salida:
 * una vulnerabilidad high o critical sigue rompiendo el build, y un fallo del
 * registro sale como aviso anotado en el job. Se avisa y se sigue en lugar de
 * fallar porque npm ya reintenta por su cuenta antes de rendirse: si la ejecucion
 * llega hasta aqui, el registro lleva minutos caido y esperar mas no lo arregla.
 */

const NIVELES_QUE_ROMPEN = ['critical', 'high']

const audit = spawnSync('npm', ['audit', '--json'], {
  encoding: 'utf8',
  shell: process.platform === 'win32',
  maxBuffer: 32 * 1024 * 1024,
})

if (audit.error || audit.status === null) {
  console.error(
    `audit — no se pudo ejecutar npm audit: ${audit.error?.message ?? 'terminado por senal'}`,
  )
  process.exit(1)
}

let informe = null
try {
  informe = JSON.parse(audit.stdout)
} catch {
  /* Sin informe legible no hay nada que interpretar: se trata como fallo de registro. */
}

if (informe === null || informe.error !== undefined) {
  const ultimasLineas = (audit.stderr.trim() || audit.stdout.trim())
    .split(/\r?\n/)
    .slice(-2)
    .join(' ')
  const detalle = informe?.error?.summary || ultimasLineas || 'sin detalle'
  console.log(
    `::warning title=Auditoria de dependencias omitida::npm audit no pudo consultar el registro: ${detalle}`,
  )
  process.exit(0)
}

const recuento = informe.metadata?.vulnerabilities ?? {}
const bloqueantes = NIVELES_QUE_ROMPEN.reduce((total, nivel) => total + (recuento[nivel] ?? 0), 0)

if (bloqueantes === 0) {
  const resumen = Object.entries(recuento)
    .filter(([nivel, n]) => n > 0 && nivel !== 'total')
    .map(([nivel, n]) => `${n} ${nivel}`)
    .join(', ')
  console.log(`audit — sin vulnerabilidades high ni critical${resumen ? ` (${resumen})` : ''}.`)
  process.exit(0)
}

console.error(`\naudit — ${bloqueantes} vulnerabilidad(es) de nivel high o critical:\n`)
for (const [paquete, aviso] of Object.entries(informe.vulnerabilities ?? {})) {
  if (!NIVELES_QUE_ROMPEN.includes(aviso.severity)) continue
  console.error(`  ${paquete}  ${aviso.severity}  ${aviso.range ?? ''}`)
  for (const via of aviso.via ?? []) {
    if (typeof via !== 'string' && via.title) console.error(`    · ${via.title}`)
  }
}
console.error('')
process.exit(1)
