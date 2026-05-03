# Handoff: VetSoftware — Login (variación Card centrada)

## Overview
Pantalla de **inicio de sesión** del panel super-admin de VetSoftware. Variación elegida: **Card centrada** — card minimalista flotando sobre fondo amatista difuminado. Misma identidad visual que el dashboard administrativo.

**El formulario solicita únicamente correo electrónico y contraseña.** No incluye login con proveedores externos (Google, etc.) ni recuperación de contraseña.

---

## About the Design Files
Los archivos en `reference/` son una **referencia de diseño hecha en HTML + React (vía Babel inline)** — un prototipo que muestra el aspecto y comportamiento finales, **no código de producción para copiar tal cual**.

La tarea es **recrear este diseño dentro del entorno existente del codebase** (probablemente React/Next.js/Vue/Angular según lo que ya esté en el repo) usando los componentes, sistema de estilos y patrones que ya existen. Si no hay un sistema establecido, elige el framework/UI library apropiado (React + Tailwind, MUI, shadcn/ui, etc.) y aplica los specs de abajo con precisión.

## Fidelity
**Alta fidelidad (hi-fi).** Colores, tipografías, espaciados e interacciones están definidos. Implementa pixel-perfect siguiendo los tokens y specs de abajo.

---

## Pantalla — Login

### Propósito
Punto de entrada al panel administrativo. El usuario introduce email + contraseña y presiona "Iniciar sesión" para acceder al dashboard.

### Layout general
Layout vertical de 3 zonas, full-viewport:

```
┌──────────────────────────────────────────────────────────┐
│  TOP BAR  (logo · "¿Eres nuevo? Solicita acceso")        │
├──────────────────────────────────────────────────────────┤
│                                                          │
│                  ┌──────────────────┐                    │
│                  │                  │                    │
│                  │   CARD (440px)   │                    │
│                  │                  │                    │
│                  │   eyebrow        │                    │
│                  │   H1 "Inicia…"   │                    │
│                  │   subtítulo      │                    │
│                  │   campo email    │                    │
│                  │   campo password │                    │
│                  │   [Iniciar ses.] │                    │
│                  │                  │                    │
│                  └──────────────────┘                    │
│                                                          │
├──────────────────────────────────────────────────────────┤
│  FOOTER  (© 2026 · Privacidad · Términos · Soporte)      │
└──────────────────────────────────────────────────────────┘
```

- **Background del viewport**: `radial-gradient(ellipse at top, #f3e8ff 0%, #f5f1fa 50%, #ede8f4 100%)`
- **Decoración**: dos blobs radial difuminados, posicionados absolute fuera del viewport para crear ambient amatista (no son interactivos):
  - Top-right: `500×500`, `top: -150 right: -150`, `radial-gradient(circle, rgba(192,132,252,.25), transparent 60%)`
  - Bottom-left: `450×450`, `bottom: -150 left: -150`, `radial-gradient(circle, rgba(168,85,247,.18), transparent 60%)`

---

## Componentes

### 1. Top bar
- Padding `24px 40px`, display flex, space-between
- **Brand (izquierda)**: cuadrado `30×30`, `border-radius: 8`, fondo `linear-gradient(135deg, #a855f7, #581c87)`, ícono pata blanco, shadow `0 2px 6px -1px rgba(126,34,206,.4)` — al lado: "VetSoftware" (`Inter 700 14px`, letter-spacing `-.01em`)
- **Link (derecha)**: "¿Eres nuevo? Solicita acceso" — texto `Inter 400 13px #6b5b80`, "Solicita acceso" como `<a>` con `Inter 600 13px #7e22ce`, sin subrayado

### 2. Card (formulario)
- `width: 100%; max-width: 440px;`
- Background `#fff`, `border-radius: 16`, `border: 1px solid #ece5f4`
- Padding `40px 44px`
- Sombra: `0 24px 48px -16px rgba(91,33,182,.18), 0 4px 12px -4px rgba(91,33,182,.08)`

**Contenido vertical (en orden)**:

1. **Eyebrow** "PANEL ADMINISTRATIVO" — `Inter 600 11px`, color `#7e22ce`, `letter-spacing: .1em`, `text-transform: uppercase`, `margin-bottom: 8px`
2. **H1** "Inicia sesión" — `Instrument Serif 400 34px`, `letter-spacing: -.02em`, `line-height: 1.05`, color `#1a1325`
3. **Subtítulo** "Accede al panel para administrar VetSoftware." — `Inter 400 13px #6b5b80`, `line-height: 1.5`, `margin: 10px 0 28px`
4. **Campos** (display flex column, gap `14px`):
   - Campo "Correo electrónico" (input email)
   - Campo "Contraseña" (input password con toggle mostrar/ocultar)
5. **Botón "Iniciar sesión"** — `margin-top: 6px`

> **Importante**: NO se incluye link de "¿Olvidaste tu contraseña?" ni botón "Continuar con Google" ni divisor "O".

### 3. Campo de formulario (`FormField`)
Estructura:
- **Label** arriba: `Inter 600 12px`, color `#3d2e57`, `letter-spacing: .01em`, `margin-bottom: 6px`
- **Caja del input**:
  - Display flex, align-items center, gap `10px`
  - Padding `10px 12px`
  - Background `#fff`, `border-radius: 8`
  - Border: `1px solid #ece5f4` (normal) → `1px solid #a855f7` (focus)
  - Box-shadow on focus: `0 0 0 4px rgba(168,85,247,.12)` (focus ring amatista difuminado)
  - Transition: `all .15s`
- **Icono leading** (15×15 stroke 1.7):
  - Color `#a89bbd` (normal) → `#7e22ce` (focus)
  - Email: `IconMail` (envelope)
  - Password: `IconLock` (candado)
- **Input nativo**: `Inter 400 14px #1a1325`, `border: none`, `background: transparent`, sin outline

**Campo password — toggle mostrar/ocultar**:
- Botón posicionado en el header del campo (donde antes iba el "olvidaste"). Es opcional pero recomendado.
- Al click, alterna `type="password"` ↔ `type="text"`
- En esta versión final del diseño, el toggle se eliminó del header del campo (no hay action al lado del label). Si quieres mantener UX de "mostrar contraseña", agrega un ícono `IconEye` dentro de la caja del input al final, color `#a89bbd`, hover `#7e22ce`.

### 4. Botón primario "Iniciar sesión"
- Padding `12px 16px`, `border-radius: 9px`
- Background: `linear-gradient(180deg, #9333ea, #7e22ce)` (gradient amatista vertical)
- Color `#fff`, `Inter 600 14px`
- Display flex, align-items center, justify-content center, gap `8px`, ícono arrow al final (14×14 stroke 2.2)
- Border `none`, cursor pointer
- **Sombra normal**: `0 4px 12px -2px rgba(126,34,206,.4), inset 0 1px 0 rgba(255,255,255,.15)` (la sombra inset crea highlight superior)
- **Hover**:
  - `transform: translateY(-1px)`
  - Sombra más amplia: `0 8px 20px -4px rgba(126,34,206,.5), inset 0 1px 0 rgba(255,255,255,.15)`
- Transition: `transform .12s, box-shadow .15s`

### 5. Footer
- Padding `20px 40px`, display flex, space-between, align-items center
- Texto `Inter 400 12px #6b5b80`
- Izquierda: "© 2026 VetSoftware"
- Derecha: 3 links inline (gap `16px`) → "Privacidad", "Términos", "Soporte" — color `#6b5b80`, sin subrayado

---

## Interactions & Behavior

### Estados de los inputs
- **Normal**: borde `#ece5f4`, ícono `#a89bbd`
- **Focus**: borde `#a855f7`, ícono `#7e22ce`, focus-ring `0 0 0 4px rgba(168,85,247,.12)`
- **Error** (sugerido para implementación): borde `#dc2626`, mensaje rojo `Inter 400 11px` debajo del campo con `margin-top: 6px`

### Validación sugerida
- Email: requerido + formato email válido
- Contraseña: requerido + mínimo 8 caracteres
- Validar al submit; mostrar mensajes de error inline debajo de cada campo
- Si las credenciales son inválidas, mostrar mensaje de error general arriba del formulario (chip rojo claro `background: #fee2e2`, borde `#fca5a5`, texto `#991b1b`)

### Submit del formulario
- Click en "Iniciar sesión" o `Enter` en cualquier input
- Durante la petición: deshabilitar el botón, cambiar texto a "Iniciando…", mostrar spinner pequeño (opcional)
- Éxito → redirigir a `/dashboard`
- Error → mostrar mensaje arriba del form

### Navegación
- "Solicita acceso" (top bar) → `/signup` o página de contacto
- "Privacidad" / "Términos" / "Soporte" → respectivas páginas legales
- (No hay flujo de "olvidaste contraseña" en esta versión)

### Animaciones
- Botón primario: hover `translateY(-1px)` + sombra expandida (`.12s` / `.15s`)
- Botón Google: borde amatista en hover (`.15s`)
- Inputs: focus ring (`.15s`)

---

## State Management

```ts
type LoginState = {
  email: string;
  password: string;
  loading: boolean;
  error: string | null;
};
```

API sugerida:
```
POST /api/auth/login
body: { email, password }
→ 200: { token, user } → guardar token, redirigir a /dashboard
→ 401: { error: "Credenciales inválidas" } → mostrar error
→ 422: { errors: { email?: string, password?: string } } → mostrar errores por campo
```

---

## Design Tokens

### Colores
| Token | Hex | Uso |
|---|---|---|
| `amatista-300` | `#d8b4fe` | Borde hover sutil |
| `amatista-500` | `#a855f7` | Focus border, gradient |
| `amatista-600` | `#9333ea` | Gradient botón primario (top) |
| `amatista-700` | `#7e22ce` | Eyebrow, link "Solicita acceso", gradient botón (bottom) |
| `amatista-900` | `#581c87` | Logo gradient (bottom) |
| `ink-900` | `#1a1325` | Texto principal (H1, inputs) |
| `ink-700` | `#3d2e57` | Labels |
| `ink-500` | `#6b5b80` | Texto secundario, footer |
| `ink-300` | `#a89bbd` | Iconos normales, divisores |
| `ink-100` | `#ede8f4` | Borde sutil |
| `paper`   | `#fbfaff` | — |
| `surface` | `#ffffff` | Fondo card, input |
| `line`    | `#ece5f4` | Borde por defecto |
| `line-2`  | `#e0d5ee` | Borde más visible |
| Background gradient | `radial-gradient(ellipse at top, #f3e8ff 0%, #f5f1fa 50%, #ede8f4 100%)` | Fondo de viewport |

### Tipografía
- **Sans**: `Inter` (Google Fonts) — pesos 400/500/600/700
- **Serif (display)**: `Instrument Serif` (Google Fonts) — peso 400, solo H1
- **Mono**: `JetBrains Mono` (Google Fonts) — pesos 400/500 (no usado en este login, pero parte del design system general)

| Uso | Familia | Tamaño | Weight | Otros |
|---|---|---|---|---|
| H1 "Inicia sesión" | Instrument Serif | 34px | 400 | letter-spacing -.02em, line-height 1.05 |
| Subtítulo | Inter | 13px | 400 | line-height 1.5 |
| Eyebrow | Inter | 11px | 600 | letter-spacing .1em, uppercase |
| Label de campo | Inter | 12px | 600 | letter-spacing .01em |
| Input | Inter | 14px | 400 | — |
| Botón primario | Inter | 14px | 600 | — |
| Footer / links | Inter | 12-13px | 400/600 | — |

### Spacing
Valores usados: `4, 6, 8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 40, 44px`

### Border-radius
- `8px` — inputs
- `9px` — botones
- `16px` — card

### Shadows
- Card: `0 24px 48px -16px rgba(91,33,182,.18), 0 4px 12px -4px rgba(91,33,182,.08)`
- Logo: `0 2px 6px -1px rgba(126,34,206,.4)`
- Botón primario normal: `0 4px 12px -2px rgba(126,34,206,.4), inset 0 1px 0 rgba(255,255,255,.15)`
- Botón primario hover: `0 8px 20px -4px rgba(126,34,206,.5), inset 0 1px 0 rgba(255,255,255,.15)`
- Focus ring inputs: `0 0 0 4px rgba(168,85,247,.12)`

---

## Assets

- **Iconos**: SVGs lineales hechos a mano (stroke 1.7). Ver `reference/icons.jsx`. Mapping recomendado a `lucide-react`:
  - `IconPaw` → `PawPrint`
  - `IconMail` → `Mail`
  - `IconLock` → `Lock`
  - `IconEye` → `Eye` (para toggle de mostrar contraseña, opcional)
  - `IconArrow` → `ArrowRight`
- **Logo**: gradient amatista con ícono pata — placeholder. Sustituir por logo oficial de VetSoftware si existe.
- **Fonts**: Google Fonts (Inter, Instrument Serif). Importar en `<head>` o configurar via `next/font` / equivalente.

---

## Files

```
design_handoff_login_centered/
├── README.md                            ← este documento
└── reference/
    ├── Login-preview.html               ← abre en browser para ver el diseño en vivo
    ├── login-centered.jsx               ← componente React de referencia (versión final, sin Google ni "olvidaste contraseña")
    ├── login-split.jsx                  ← define <FormField> reusado por LoginCentered
    └── icons.jsx                        ← íconos SVG inline
```

> **Nota técnica**: el componente `FormField` está definido en `login-split.jsx` y exportado a `window`. `login-centered.jsx` lo reusa. Si trasplantas el código a un codebase real, mueve `FormField` a su propio archivo (`components/FormField.tsx`).

Para ver el diseño en vivo:
- Abre `reference/Login-preview.html` en un navegador (requiere conexión para CDNs)

---

## Notas para el desarrollador

1. **Si el codebase ya tiene un design system / UI kit** (shadcn, MUI, AntD, etc.): usa sus componentes (`Button`, `Card`, `Input`, etc.) y aplica los tokens de color y tipografía como overrides. No reinventes los componentes.

2. **Si no hay design system**: configura Tailwind con la paleta amatista (extender `theme.colors.amatista` con la escala 50–950) e importa Inter + Instrument Serif desde Google Fonts.

3. **Consistencia con el dashboard**: los tokens de color, tipografía y radii son **idénticos** a los del Dashboard. Si ya implementaste el `design_handoff_dashboard_equilibrada`, reutiliza esos tokens y la fuente.

4. **Layout responsive**:
   - Tablet (≥640px): la card mantiene `max-width: 440px` centrada, padding lateral del wrapper se reduce a 16px
   - Móvil (<640px): card pasa a `width: 100%`, padding interno reduce a `28px 24px`, H1 a `28px`, top bar y footer pasan a `padding: 16px 20px`

5. **Accesibilidad**:
   - Cada input necesita `<label>` asociado correctamente (`htmlFor` / `aria-labelledby`)
   - Iconos decorativos: `aria-hidden="true"`
   - Mensajes de error: `aria-live="polite"` o `role="alert"` para screen readers
   - Focus visible en todos los elementos interactivos (el focus-ring amatista de los inputs cumple)
   - Contraste: amatista 700 (`#7e22ce`) sobre blanco cumple AA
   - Soporte para `prefers-reduced-motion`: deshabilitar `translateY` del hover

6. **Seguridad**:
   - Nunca enviar la contraseña por GET; usar HTTPS + POST
   - Implementar rate-limiting del lado del backend
   - Considerar 2FA en una iteración futura
   - Token JWT/session cookie según convenciones del backend
