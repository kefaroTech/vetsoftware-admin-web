# docs/ux — reglas de interfaz de VetSoftware

Aquí viven las **reglas ejecutables de interfaz y accesibilidad**: lo que hay que hacer para que un
defecto ya corregido no vuelva a entrar. No es el histórico de la auditoría ni un manual de estilo
visual — para lo primero está el informe 08 (`proporsal/08-auditoria-ux-frontend.html`), y para lo
segundo, `AGENTS.md`.

- **[reglas-de-interfaz.md](reglas-de-interfaz.md)** — las quince reglas que salieron de las dos
  tandas del informe 08, cada una con la forma correcta y la incorrecta lado a lado, el criterio que
  la exige, la puerta que la sujeta hoy —**y en qué repo vive**— y lo que sigue sin sujetarse. Cierra
  con lo que quedó abierto y su issue.

## Resumen: regla, defecto que la originó, puerta que la sujeta hoy

`T` = app del tenant (`VetSoftwarePublicFront`) · `C` = consola de plataforma (`VetSoftwareFront`).

| #   | Regla                                                                       | Origen  | Repo  | Puerta hoy                                                     |
| --- | --------------------------------------------------------------------------- | ------- | ----- | -------------------------------------------------------------- |
| R01 | Activar con `@click`, nunca con `@mousedown`                                | A11Y-03 | T     | por componente (`searchable-select`, `date-input`)             |
| R02 | Quien cierra una capa flotante devuelve el foco al disparador               | A11Y-03 | T     | por componente (`searchable-select`)                           |
| R03 | Anillo de foco medido: ≥ 3:1 contra la superficie real                      | A11Y-01 | T + C | por token (`tokens-contrast`, **copias divergentes**)          |
| R04 | El nombre accesible lleva el sujeto de la fila                              | A11Y-11 | T     | por componente (`stepper-aria-labels`, `lab-results-adjuntos`) |
| R05 | El error de red lleva traza, y se pinta **antes** que el vacío              | EST-13 · EST-01 | T | por composable + componente (`use-server-paged`, `list-body-error`) |
| R06 | `PawLoader` es el único loader; el movimiento reducido se apaga desde arriba | EST-11 · #111 | T | **de rejilla** (`loader-guard`), con lista de deuda             |
| R07 | La especificidad se resuelve con `:not()` o tono, nunca `!important`        | DS-08   | T + C | **de rejilla** (`stylelint declaration-no-important`)          |
| R08 | Idioma declarado y título que describa la pantalla                          | EST-03  | C     | solo la consola, y solo el `lang`                              |
| R09 | Sellar con `pagehide`, nunca con `beforeunload`                             | VUE-09  | T     | por store (`nueva-consulta-draft`)                             |
| R10 | El color de texto se mide antes de entrar, y el remedio va en un solo sitio | A11Y-02 | **C** | por token + 3 primitivas (`tokens-contrast`)                   |
| R11 | Un estado no reescribe un token a mano: lo consume                          | A11Y-02 | **C** | por primitiva (`tokens-contrast`)                              |
| R12 | La clave de un `v-for` es identidad: ni posición, ni contenido              | VUE-08 · FE-20 | T | por composable + componente (`row-uid`, `lab-results-adjuntos`) |
| R13 | Un apagado de regla se acota a la línea y lleva motivo                      | VUE-11  | T + C | solo la mitad de CSS. **ESLint: ninguna**                      |
| R14 | Un hueco honesto antes que un dato inventado                                | EST-12  | **C** | por componente (`sidebar-sin-cifras-inventadas`)               |
| R15 | Una tabla ancha se desplaza, no se recorta                                  | EST-10  | **C** | por componente (`app-table-scroll`)                            |

Tres cosas que conviene leer en esa tabla antes que las reglas:

1. **Solo dos y media son de rejilla.** R06 (todo `src/`), R07 (todo el CSS) y la mitad CSS de R13.
   Las otras doce vigilan el componente que ya se arregló, no la regla, así que un componente nuevo
   entra sin que nada lo mire.
2. **La cobertura está partida entre los dos repos, y no por donde debería.** Cinco reglas solo las
   vigila el tenant y cuatro solo la consola. En R10 y R11 **la guarda vive en el repo donde el
   defecto no se sufre**: el archivo vigilado (`tokens.css`, `primitives.css`) es gemelo byte a byte y
   los consumidores están al otro lado. Que exista ahí es correcto; que no exista también aquí es el
   primer trabajo pendiente.
3. **Ninguna es una puerta de accesibilidad en sentido estricto** — sin `axe-core`, sin
   `eslint-plugin-vuejs-accessibility`, sin Lighthouse, en ninguno de los dos repos. Está abierto en
   [public-web #57](https://github.com/kefaroTech/vetsoftware-public-web/issues/57) y
   [admin-web #44](https://github.com/kefaroTech/vetsoftware-admin-web/issues/44).

Y dos matices que rebajan lo que la tabla promete:

- **Ningún check es requerido para mergear**: seis PR entraron en `develop` con el CI en rojo
  ([public-web #130](https://github.com/kefaroTech/vetsoftware-public-web/issues/130)). Una guarda que
  falla y no bloquea el merge es un informe, no una puerta.
- `tests/` está fuera de `tsconfig` y de ESLint
  ([public-web #117](https://github.com/kefaroTech/vetsoftware-public-web/issues/117) ·
  [admin-web #76](https://github.com/kefaroTech/vetsoftware-admin-web/issues/76)), así que un spec con
  los tipos rotos pasa en verde.

## Gemelo por contenido, con las rutas cualificadas

Este fichero y `reglas-de-interfaz.md` son **idénticos byte a byte en los dos fronts**
(`VetSoftwareFront/docs/ux/` y `VetSoftwarePublicFront/docs/ux/`). Las reglas son del sistema de
diseño, y el sistema de diseño es un gemelo TR-02: una regla que solo viviera en un repo dejaría la
puerta abierta en el otro, que es exactamente lo que son hoy admin-web #74 y #81. **Si editas uno,
edita el otro, y confírmalo con `diff`.**

La 1.ª versión citaba once `tests/unit/…` sin decir de quién, y de esos once la consola solo tiene
tres ([admin-web #82](https://github.com/kefaroTech/vetsoftware-admin-web/issues/82)). La decisión
—mantener el gemelo, no partirlo— viene con tres obligaciones:

1. **Toda ruta lleva delante su repositorio.** Sin prefijo no hay ruta. Los ficheros que sí son
   gemelos (`tokens.css`, `primitives.css`, `stylelint.config.mjs`, `PawLoader.vue`, `ToastStack.vue`)
   se citan sin prefijo y se dice que lo son.
2. **Cada ficha declara en qué repo vive su guarda**, y la tabla de cobertura lo repite en su columna
   `Repo`. La asimetría deja de ser una errata y pasa a ser el backlog de paridad.
3. **Cada número lleva al lado el comando que lo reproduce.** Es el criterio que este documento le
   exige a `AGENTS.md` en public-web #131 / admin-web #83, y no puede eximirse de él.

No están en el manifiesto de gemelos TR-02, que cubre `src/` y el tooling. Darlos de alta es una
propuesta pendiente; ver el cierre de `reglas-de-interfaz.md`.

## Lo que NO va aquí

- El criterio de CSS del design system → `AGENTS.md`, sección «CSS: consumir el design system, no
  reescribirlo (FE-08)».
- El criterio de contraste del anillo de foco → `AGENTS.md`, sección «Indicador de foco: 3:1 contra
  la superficie, siempre (A11Y-01)». Aquí solo se enlaza, no se repite.
- Handoffs y lienzos de diseño → `docs/design/`.
