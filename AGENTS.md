# Política obligatoria de GitFlow

Esta política es obligatoria para cualquier persona, agente de IA, automatización o herramienta que realice operaciones Git en este repositorio. No se permiten atajos, incluso para cambios pequeños, documentación, configuración o mantenimiento.

## Ramas permanentes

- `main` representa únicamente código liberado o listo para producción.
- `develop` es la rama de integración del siguiente ciclo de desarrollo.
- Está prohibido crear commits directamente en `main` o `develop`.
- Está prohibido desarrollar con el árbol de trabajo posicionado en `main` o `develop`.

## Ramas temporales permitidas

- `feature/<descripcion>`: nace exclusivamente desde `develop` y se integra exclusivamente en `develop`. Todo trabajo normal usa este tipo, incluyendo funcionalidades, correcciones no urgentes, refactorizaciones, documentación, pruebas, CI/CD y mantenimiento.
- `release/<version>`: nace exclusivamente desde `develop`. Solo puede contener preparación de versión, correcciones de estabilización y metadatos de release. Se integra en `main` y después en `develop`.
- `hotfix/<version-o-descripcion>`: nace exclusivamente desde `main` para una corrección urgente de producción. Se integra en `main` y después en `develop`.

No se permiten ramas de trabajo creadas desde otra rama temporal ni ramas con flujo distinto a los anteriores.

## Procedimiento obligatorio

1. Antes de cualquier operación, inspeccionar el estado, la rama actual, las ramas existentes y los remotos. Nunca descartar, sobrescribir ni mezclar cambios locales ajenos.
2. Actualizar la rama base correspondiente mediante un avance seguro antes de crear la rama temporal. No continuar si existen cambios sin confirmar o divergencias inesperadas.
3. Crear la rama temporal correcta antes de modificar archivos o generar commits.
4. Hacer commits atómicos, verificables y con el formato de mensajes exigido por el repositorio. No omitir hooks con `--no-verify`.
5. Ejecutar las validaciones proporcionales al cambio antes de integrar. No integrar con conflictos, pruebas fallidas o un árbol de trabajo sucio.
6. Integrar siempre con un merge explícito `--no-ff`. Están prohibidos los merges fast-forward para cerrar ramas, el squash merge y el rebase de ramas compartidas.
7. Eliminar la rama temporal local y remota solo después de confirmar que quedó integrada en todos sus destinos obligatorios.

## Aprobación humana obligatoria antes de todo commit

- Ningún agente de IA, automatización o herramienta puede crear un commit por iniciativa propia. Todo commit requiere aprobación previa, explícita y escrita de un developer humano autorizado.
- Una solicitud para implementar, modificar, corregir, documentar o preparar cambios no constituye aprobación para crear el commit.
- Antes de solicitar aprobación se debe presentar: repositorio y rama, archivos preparados, resumen del diff, validaciones ejecutadas, tipo de commit y mensaje exacto propuesto.
- La aprobación debe identificar inequívocamente el commit autorizado. Una forma válida es: `Apruebo el commit propuesto en <repositorio> con el mensaje <mensaje>`.
- El silencio, una aprobación implícita, una autorización general anterior o la aprobación emitida por otro agente o automatización no son válidos.
- Una aprobación puede cubrir varios commits únicamente si enumera explícitamente cada repositorio, rama, alcance y mensaje propuesto.
- La aprobación solo sirve para el contenido y mensaje presentados. Si cambia el diff, el alcance, la rama o el mensaje, se debe solicitar una nueva aprobación escrita.
- La regla aplica también a commits creados por `merge --no-ff`, `revert`, `cherry-pick` o `commit --amend`. Antes de un merge se debe presentar su origen, destino y mensaje, y obtener una aprobación específica para el commit de merge.
- Después de preparar los cambios, el agente debe detenerse antes de ejecutar cualquier comando que cree un commit y esperar la aprobación escrita. El agente nunca puede aprobar su propio commit.

## Flujo de integración

### Feature

1. Crear `feature/*` desde `develop`.
2. Realizar y validar los commits en `feature/*`.
3. Integrar `feature/*` en `develop` con `--no-ff`.
4. Eliminar `feature/*` después de verificar el merge.

### Release

1. Crear `release/<version>` desde `develop`.
2. Estabilizar y validar la versión sin añadir funcionalidades nuevas.
3. Integrar `release/<version>` en `main` con `--no-ff`.
4. Crear en `main` una etiqueta anotada de versión, siguiendo SemVer cuando aplique.
5. Integrar `release/<version>` en `develop` con `--no-ff` para devolver cualquier ajuste de release.
6. Eliminar `release/<version>` después de verificar ambos merges y la etiqueta.

### Hotfix

1. Crear `hotfix/*` desde `main`.
2. Aplicar y validar únicamente la corrección urgente.
3. Integrar `hotfix/*` en `main` con `--no-ff` y crear la etiqueta de versión correspondiente.
4. Integrar `hotfix/*` en `develop` con `--no-ff`.
5. Eliminar `hotfix/*` después de verificar ambos merges.

## Excepción controlada para versionado automático

- Únicamente `.github/workflows/prepare-release.yml` puede crear un commit automático, y solo en una rama existente `release/X.Y.Z` que descienda de `develop`.
- La aprobación manual registrada por un developer autorizado en el environment protegido `release-preparation` constituye la aprobación escrita y auditable de ese commit concreto. La rama determina la versión y el mensaje autorizado es `:bookmark: chore(release): prepare X.Y.Z`.
- Ese commit solo puede modificar `package.json`, `package-lock.json` y `CHANGELOG.md`. Debe sincronizar la misma versión SemVer, ejecutar todos los controles de calidad y finalizar sin commit si no existe un diff.
- Únicamente `.github/workflows/publish-release.yml`, después de la aprobación del environment protegido `production`, puede crear el tag anotado inmutable `vX.Y.Z` y el GitHub Release correspondiente sobre el commit ya integrado en `main`.
- La automatización nunca puede aprobar su propio pull request, hacer merge, evadir reglas de protección, hacer force-push, modificar código funcional ni crear una versión que no coincida con la rama.
- Cualquier otro commit automático permanece prohibido y sujeto a la política general de aprobación humana.

## Prohibiciones

- No hacer commits directos, cherry-picks rutinarios ni pushes directos a `main` o `develop`.
- No actualizar `main` directamente desde `develop`; toda promoción normal debe pasar por `release/*`.
- No usar `push --force`, reescribir historial publicado ni eliminar ramas no integradas.
- No mezclar una feature directamente en `main`.
- No saltarse ramas, validaciones, commits, merges o etiquetas obligatorias aunque el repositorio todavía no tenga remoto configurado.
- Si una petición contradice esta política, detener la operación y explicar el flujo GitFlow correcto antes de continuar.

## CSS: consumir el design system, no reescribirlo (FE-08)

El CSS de un SFC se escribe **consumiendo** `src/assets/styles/primitives.css`
(capa 2) y `tokens.css` (capa 1) desde el `template`, nunca reescribiendo sus
declaraciones dentro del `<style>` scoped del componente. Dos puertas lo
comprueban, en dos momentos distintos:

- **`vetsoftware/no-duplicate-primitive`** (stylelint, regla propia en
  `stylelint-plugins/`) — al escribir el código. Rechaza cualquier bloque CSS
  de un SFC cuyo cuerpo normalizado (dos declaraciones o más) sea idéntico al
  de una clase ya definida en `primitives.css`, aunque sólo ocurra una vez:
  es más estricta que el presupuesto, que exige repetición.
- **`scripts/css-budget.mjs`** (`npm run css:budget`) — sobre el agregado del
  repo. Falla cuando el `<style>` de todos los SFC pesa más que el `<script>`,
  cuando un cuerpo de regla se repite en varios componentes, o cuando un SFC
  pasa de 500 líneas.

**La trampa que costó tres tandas descubrir**: una primitiva global de una
sola clase pesa (0,1,0). La regla base de un componente en CSS _scoped_ de
Vue lleva el atributo `[data-v-…]` que añade la compilación y pesa (0,2,0) —
le gana siempre a la primitiva, sin importar el orden en el bundle. Por eso
la base de un componente se queda SÓLO con la geometría (tamaño, padding,
layout); el color viaja SIEMPRE en una clase de tono (`ds-tone--*`,
`ds-field-*`…) aplicada desde el marcado — incluido el estado por defecto,
no sólo los condicionales.

Para reglas de **estado** (`:hover`, `:focus-visible`) una clase de tono
plana no sirve: aplicada siempre desde el marcado, tiñe también el reposo.
Las salidas que ya usa el repo:

- Una primitiva de estado dedicada, con el pseudo-selector en su propio
  nombre (`.ds-hover-accent:hover:not(:disabled)`,
  `.ds-icon-btn--accent:hover:not(:disabled)`, `.ds-btn:focus-visible`).
- Una variable CSS de escape cuando el color depende de más de un estado
  excluyente sobre el mismo elemento (`--ds-btn-solid-bg` en
  `.ds-btn--solid`): el componente fija la variable en cada estado y una
  única declaración de base la lee con `var(--x, fallback)`.
