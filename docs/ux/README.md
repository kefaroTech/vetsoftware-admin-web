# docs/ux — reglas de interfaz de VetSoftware

Aquí viven las **reglas ejecutables de interfaz y accesibilidad**: lo que hay que hacer para que un
defecto ya corregido no vuelva a entrar. No es el histórico de la auditoría ni un manual de estilo
visual — para lo primero está el informe 08 (`proporsal/08-auditoria-ux-frontend.html`), y para lo
segundo, `AGENTS.md`.

- **[reglas-de-interfaz.md](reglas-de-interfaz.md)** — las nueve reglas que salieron de la 2.ª pasada
  del informe 08, cada una con la forma correcta y la incorrecta lado a lado, el criterio que la
  exige, la puerta que la sujeta hoy y lo que sigue sin sujetarse. Cierra con lo que quedó abierto y
  su issue.

## Resumen: regla, defecto que la originó, puerta que la sujeta hoy

| #   | Regla                                                                | Origen  | Puerta hoy                                                |
| --- | -------------------------------------------------------------------- | ------- | --------------------------------------------------------- |
| R01 | Activar con `@click`, nunca con `@mousedown`                         | A11Y-03 | por componente (`searchable-select`, `date-input`)        |
| R02 | Quien cierra una capa flotante devuelve el foco al disparador        | A11Y-03 | por componente (`searchable-select`)                      |
| R03 | Anillo de foco medido: ≥ 3:1 contra la superficie real               | A11Y-01 | por token (`tokens-contrast`, los dos repos)              |
| R04 | El nombre accesible lleva el sujeto de la fila                       | A11Y-11 | por componente (`stepper-aria-labels`, `tienda-controls`) |
| R05 | El error de red nunca se aplasta a un literal, y lleva traza         | EST-13  | por composable (`use-server-paged`)                       |
| R06 | `PawLoader` es el único loader; toda animación con guarda            | EST-11  | **de rejilla** (`loader-guard`), con lista de deuda       |
| R07 | La especificidad se resuelve con `:not()` o tono, nunca `!important` | DS-08   | **de rejilla** (`stylelint declaration-no-important`)     |
| R08 | Idioma declarado y título que describa la pantalla                   | EST-03  | solo la consola, y solo el `lang`                         |
| R09 | Sellar con `pagehide`, nunca con `beforeunload`                      | VUE-09  | por store (`nueva-consulta-draft`)                        |

Las nueve tienen algo que las sujeta, y eso es nuevo. Pero **solo dos son de rejilla**: las otras
siete vigilan el componente que ya se arregló, no la regla, así que un componente nuevo entra sin que
nada lo mire. La razón de fondo sigue siendo la misma: **este proyecto no tiene ninguna puerta de
accesibilidad en el pipeline** — ni `axe-core`, ni `eslint-plugin-vuejs-accessibility`, ni
Lighthouse. Está abierto en
[public-web #57](https://github.com/kefaroTech/vetsoftware-public-web/issues/57) y
[admin-web #44](https://github.com/kefaroTech/vetsoftware-admin-web/issues/44).

Y un matiz que conviene no perder: `tests/` está fuera de `tsconfig` y de ESLint
([public-web #117](https://github.com/kefaroTech/vetsoftware-public-web/issues/117)), así que un spec
con los tipos rotos pasa en verde. Mientras eso siga así, estas puertas valen menos de lo que la
tabla sugiere.

## Gemelo por contenido

Este fichero y `reglas-de-interfaz.md` son **idénticos en los dos fronts**
(`VetSoftwareFront/docs/ux/` y `VetSoftwarePublicFront/docs/ux/`): las reglas son del sistema de
diseño, no de un repositorio, y cada ejemplo cita la ruta con el nombre del repositorio delante para
que no haya ambigüedad. **Si editas uno, edita el otro.**

No están en el manifiesto de gemelos TR-02, que cubre `src/` y el tooling. Darlos de alta es una
propuesta pendiente; ver el cierre de `reglas-de-interfaz.md`.

## Lo que NO va aquí

- El criterio de CSS del design system → `AGENTS.md`, sección «CSS: consumir el design system, no
  reescribirlo (FE-08)».
- El criterio de contraste del anillo de foco → `AGENTS.md`, sección «Indicador de foco: 3:1 contra
  la superficie, siempre (A11Y-01)». Aquí solo se enlaza, no se repite.
- Handoffs y lienzos de diseño → `docs/design/`.
