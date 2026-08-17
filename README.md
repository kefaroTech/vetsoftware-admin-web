# VetSoftwareFront — consola de plataforma

Front de **administración de la plataforma** VetSoftware: Vue 3 + TypeScript +
Vite, sobre el backend Spring Boot compartido (`/api/v1`). La aplicación del
tenant —la que usan las veterinarias— es el otro repositorio,
**VetSoftwarePublicFront**.

Las convenciones de código (Pinia obligatorio, estructura por feature, paridad
TR-02 con el otro front) están en [`CLAUDE.md`](./CLAUDE.md). Este README cubre
cómo levantar el proyecto y cómo se prueba.

---

## Puesta en marcha

```bash
nvm use                       # Node 24 (ver .nvmrc); npm >= 11
npm ci
cp .env.local.example .env.local
npm run dev                   # http://localhost:5173
```

`npm run dev` es `vite --mode localdev`. **`vite.config.ts` aborta si ningún
fichero de entorno declara ese perfil**, así que el `cp` no es opcional: sin
`.env.local` el servidor muere antes de servir nada. El fichero no está
versionado porque lleva la URL del backend de cada quien.

Perfiles alternativos: `npm run dev:dev` y `npm run dev:prod`.

---

## Pruebas

Este repositorio tiene **dos** suites, y ninguna de las dos es un E2E de flujo.

| Suite            | Motor            | Dónde           | Casos hoy   | Corre en CI |
| ---------------- | ---------------- | --------------- | ----------- | ----------- |
| Unitarias        | Vitest 4 + jsdom | `tests/unit/**` | 15 ficheros | sí          |
| Regresión visual | Playwright 1.61  | `visual/**`     | 8           | sí          |
| E2E de flujo     | Playwright 1.61  | `e2e/**`        | **0**       | no          |

### Unitarias

```bash
npm run test:unit         # una pasada
npm run test              # modo watch
npm run test:coverage     # con cobertura — es lo que ejecuta el CI
```

Los umbrales de cobertura de `vitest.config.ts` son **por ruta, no globales**:
se exige 100 % sobre lo que ya está cubierto para que no pueda regresar, en vez
de un porcentaje global que castigaría añadir código nuevo. Cubrir un módulo
nuevo se declara añadiéndolo a esa lista.

### Regresión visual

La galería de `visual/` pinta las primitivas del sistema de diseño y compara
contra líneas base en PNG. No habla con el backend.

```bash
npm run visual:docker            # comparar contra la base
npm run visual:docker:update     # regenerar la base tras un cambio querido
```

> **Usa siempre la variante `:docker`.** Las líneas base son de Linux y se
> generan con la misma imagen que el CI
> (`mcr.microsoft.com/playwright:v1.61.1-noble`). Una captura hecha en Windows o
> macOS no coincide: cambian el antialiasing y las métricas de fuente, y el diff
> resultante no significa nada. `npm run visual` / `npm run visual:update`
> existen para depurar dentro de un Linux, no para generar bases desde el
> portátil.
>
> Requiere Docker corriendo. Si no hay líneas base, el CI las genera, falla a
> propósito y las sube como artefacto `visual-baseline`.

Nunca actualices una línea base sin decir en el PR **qué cambió visualmente y
por qué es correcto**.

### E2E de flujo

**No hay ninguno en este repositorio, y `playwright.config.ts` está aquí como
guarda, no como suite.** Los recorridos de usuario viven en
`VetSoftwarePublicFront/e2e/` (11 specs, ~342 casos) porque es allí donde está
la aplicación que los usuarios recorren; consulta
[su `e2e/README.md`](../VetSoftwarePublicFront/e2e/README.md).

Si el fichero de configuración se borrase, `npx playwright test` no encontraría
configuración, escanearía el directorio de trabajo, haría match con
`tests/unit/*.spec.ts` e intentaría ejecutar las pruebas de Vitest como si
fueran suyas. Con él delante, el mismo comando responde «No tests found». Es
además el sitio donde aterrizarían los E2E de la consola si algún día se
escriben: basta con crear `e2e/` y dejar los specs dentro.

**Los E2E de flujo no corren en GitHub Actions, por decisión del proyecto**: se
ejecutan a mano, en local, contra el entorno `localdev`. El CI de este repo
ejecuta la puerta de calidad, las unitarias con cobertura, el build, el
presupuesto de bundle y la regresión visual.

---

## Calidad

```bash
npm run quality      # lint + stylelint + formato + contrato de API, todo estricto
npm run lint:fix
npm run format
npm run api:check    # los tipos TS no han derivado del contrato del backend
npm run budget       # presupuesto de tamaño de bundle
npm run ds:audit     # auditoría del sistema de diseño
```

El gancho de pre-commit corre un escaneo de secretos con **Gitleaks en
contenedor** y después `lint-staged`. **Docker tiene que estar arriba para poder
commitear**: sin demonio al que hablar, el escaneo bloquea el commit a
propósito.
