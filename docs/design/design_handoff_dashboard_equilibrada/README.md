# Handoff: VetSoftware — Dashboard administrativo (variación Equilibrada)

## Overview
Rediseño de la pantalla principal del **panel super-admin de VetSoftware** (SaaS multi-tenant para clínicas veterinarias). Reemplaza el dashboard actual — una rejilla de 8 cards vacíos sobre fondo blanco — por un layout moderno con sidebar agrupado, top bar con buscador, hero de bienvenida y tiles de módulos con descripciones útiles.

Foco: **accesos rápidos a módulos**, datos mínimos, jerarquía clara, color **amatista** (violeta).

---

## About the Design Files
Los archivos en `reference/` son una **referencia de diseño hecha en HTML + React (vía Babel inline)** — un prototipo que muestra el aspecto y comportamiento finales, **no código de producción para copiar tal cual**.

La tarea es **recrear este diseño dentro del entorno existente del codebase** (probablemente React/Next.js/Vue/Angular, según lo que ya esté en el repo) usando los componentes, sistema de estilos y patrones que ya existen. Si no hay un sistema establecido, elige el framework/UI library apropiado (React + Tailwind, MUI, shadcn/ui, etc.) y aplica los specs de abajo con precisión.

## Fidelity
**Alta fidelidad (hi-fi).** Colores, tipografías, espaciados e interacciones están definidos. Implementa pixel-perfect siguiendo los tokens y specs del documento.

---

## Pantalla — Dashboard

### Propósito
Es la **landing del panel administrativo**. El super-admin entra, ve una bienvenida visual, busca cualquier recurso del sistema con `⌘K`, y accede rápidamente a cualquiera de los 8 módulos con su contador y descripción.

### Layout general
Grid de 2 columnas:
- **Sidebar izquierdo:** ancho fijo `244px`, altura completa, `background: #fff`, `border-right: 1px solid #ece5f4`
- **Main derecho:** flex, fila superior (top bar) + contenido scrollable

```
┌─────────────┬──────────────────────────────────────────────┐
│             │   TOP BAR (busc, notif, acción primaria)     │
│   SIDEBAR   ├──────────────────────────────────────────────┤
│   244px     │   HERO (gradient amatista, h1 + CTAs)        │
│             │                                              │
│             │   "Módulos del sistema"                      │
│             │   ┌──┬──┬──┬──┐                              │
│             │   │  │  │  │  │  4 columnas, gap 12px        │
│             │   ├──┼──┼──┼──┤                              │
│             │   │  │  │  │  │                              │
│             │   └──┴──┴──┴──┘                              │
└─────────────┴──────────────────────────────────────────────┘
```

---

## Componentes

### 1. Sidebar (244px wide)

**Header del sidebar** — contiene el logo:
- Padding: `0 12px 22px`
- Border-bottom: `1px solid #ece5f4`
- Logo: cuadrado `30×30`, `border-radius: 8`, fondo `linear-gradient(135deg, #a855f7, #581c87)`, ícono de pata (`IconPaw` blanco), shadow `0 2px 6px -1px rgba(126,34,206,.4)`
- Texto "VetSoftware" — `Inter 700 14px`, color `#1a1325`
- Subtítulo "Panel administrativo" — `Inter 400 10px`, color `#6b5b80`

**Grupos de navegación** — el sidebar agrupa los items en 3 secciones:

1. **General**
   - Dashboard (activo)
   - Empresas — count `128`
   - Empleados — count `1.8k`
2. **Suscripciones**
   - Membresías — count `6`
   - Membresías · Submódulos
3. **Configuración**
   - Módulos — count `14`
   - Submódulos — count `52`
   - Permisos base — count `38`
   - Roles base — count `9`
   - Permisos de roles

**NavGroup heading**:
- `Inter 600 10px`, `letter-spacing: .1em`, `text-transform: uppercase`
- Color `#a89bbd`, padding `0 12px 6px`
- Margin-bottom entre grupos: `18px`

**NavItem (estado normal)**:
- Padding `7px 12px`, gap `10px`, border-radius `7px`
- Texto: `Inter 500 13px`, color `#3d2e57`
- Ícono 15×15 stroke 1.6
- Count (lado derecho): `JetBrains Mono 500 10px`, color `#a89bbd`
- Hover: `background: #faf5ff`

**NavItem (activo)**:
- Background `#f3e8ff`, texto `Inter 600 13px` color `#1a1325`
- Stripe vertical: pseudo-elemento `2px` de ancho, color `#7e22ce`, posicionado absolute `left: -16px`, `top: 4px`, `bottom: 4px`, `border-radius: 2px`
- Count color `#7e22ce`

**Footer del sidebar (chip de usuario)**:
- Margin-top: auto (pegado abajo)
- Padding `10px 12px`, `border: 1px solid #ece5f4`, `border-radius: 8`
- Avatar circular `28×28`, fondo `#3d2e57`, texto blanco "AD" (`Inter 600 11px`)
- Nombre "Admin" (`Inter 600 12px`) + rol "Super administrador" (`Inter 400 10px #6b5b80`)
- Ícono logout 14×14 stroke 1.7

---

### 2. Top Bar

- Padding `16px 32px`, `border-bottom: 1px solid #ece5f4`, `background: #fff`
- Display flex, gap `14px`, align-items center

**Buscador (izquierda, max-width 400)**:
- Padding `8px 12px`, `border-radius: 8`, `background: #f5f1fa`
- Ícono lupa 14×14 stroke 1.8
- Placeholder "Buscar empresas, módulos, permisos…" (`Inter 400 13px`, color `#a89bbd`)
- Atajo de teclado `⌘K` a la derecha: chip `2px 6px`, `border: 1px solid #ece5f4`, `background: #fff`, `JetBrains Mono 600 10px`, color `#6b5b80`, `border-radius: 4`

**Botón notificaciones (icono bell)**:
- `34×34` cuadrado, `border-radius: 8`, `border: 1px solid #ece5f4`, fondo `#fff`
- Punto rojo (notificación pendiente): círculo `6×6`, `background: #7e22ce`, `border: 2px solid #fff`, posicionado `top: 6px right: 7px`

**Botón primario "Nueva empresa"**:
- Padding `8px 14px`, `border-radius: 8`, `background: #1a1325`, color `#fff`
- `Inter 600 13px`, ícono plus 14×14 stroke 2.2 a la izquierda

---

### 3. Hero (bienvenida)

- Padding `28px 32px`, `border-radius: 14px`, `margin-bottom: 24px`
- Background: `linear-gradient(135deg, #581c87 0%, #3b0764 100%)`
- Color de texto blanco
- **Decoración**: círculo difuminado top-right, `220×220`, `border-radius: 50%`, `background: radial-gradient(circle, rgba(216,180,254,.25), transparent 70%)`, posicionado `top: -40px right: -40px`
- Eyebrow "BIENVENIDO DE VUELTA": `Inter 600 11px`, `letter-spacing: .1em`, `text-transform: uppercase`, color `#d8b4fe`
- H1 "Dashboard administrativo": `Instrument Serif 400 36px`, color `#fff`, `letter-spacing: -.01em`, line-height 1.1
- Párrafo: `Inter 400 14px`, color `#e9d5ff`, max-width `540px`
- **Botones**:
  - Primario "Ver empresas →": `background: #fff`, color `#3b0764`, `Inter 600 13px`, padding `8px 14px`, `border-radius: 7`, ícono arrow al final
  - Secundario "Configurar membresías": `background: rgba(255,255,255,.1)`, `border: 1px solid rgba(255,255,255,.2)`, color `#fff`, `Inter 500 13px`

---

### 4. Encabezado de sección "Módulos del sistema"

- Display flex, align-items center, gap `12px`, `margin-bottom: 14px`
- Título "Módulos del sistema": `Inter 600 14px`, color `#1a1325`
- Contador "8 disponibles": `JetBrains Mono 400 11px`, color `#a89bbd`
- Botón texto "Personalizar →" alineado a la derecha: `Inter 500 12px`, color `#7e22ce`, sin background

---

### 5. Grid de Módulos (8 tiles, 4 columnas)

- `display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;`

**Tile (estado normal)**:
- Padding `18px`, `border-radius: 12`
- Background `#fbfaff`, `border: 1px solid #ece5f4`
- Display flex, flex-direction column, gap `12px`

**Tile estructura interna**:
- Fila superior:
  - Cuadrado de ícono `32×32`, `border-radius: 8`, `background: #fff`, `border: 1px solid #ece5f4`, color amatista `#7e22ce`
  - (En hover) ícono arrow-up al lado derecho aparece, color `#7e22ce`
- Bloque texto:
  - Línea 1: título (`Inter 600 14px #1a1325`) + count (`JetBrains Mono 500 11px #a89bbd`), gap `8px`, baseline aligned
  - Línea 2: descripción (`Inter 400 12px #6b5b80`), line-height `1.45`

**Tile (estado hover)**:
- Background cambia a `#fff`
- Border cambia a `#d8b4fe`
- Box-shadow: `0 4px 16px -6px rgba(126,34,206,.15)`
- Icon background cambia a `#f3e8ff`
- Aparece el ícono arrow-up (opacity 0 → 1)
- Transición: `all .15s`

**Contenido de los 8 tiles**:
| # | Título | Count | Descripción |
|---|--------|-------|-------------|
| 1 | Empresas | 128 | Clínicas y centros veterinarios registrados en la plataforma. |
| 2 | Empleados | 1,847 | Veterinarios, recepcionistas y personal administrativo. |
| 3 | Membresías | 6 | Planes de suscripción disponibles. |
| 4 | Módulos | 14 | Funcionalidades del sistema. |
| 5 | Submódulos | 52 | Componentes detallados dentro de cada módulo. |
| 6 | Permisos base | 38 | Catálogo de permisos asignables. |
| 7 | Roles base | 9 | Plantillas de roles predefinidas. |
| 8 | Permisos de roles | — | Configuración de permisos por rol. |

---

## Interactions & Behavior

- **Sidebar nav items**: hover suaviza el background, el activo muestra stripe izquierdo amatista permanente. Click navega al módulo correspondiente (rutas: `/empresas`, `/empleados`, etc.)
- **Buscador**: al hacer click o `Cmd/Ctrl+K`, abrir modal de Command Palette (no implementado en el mock — el codebase puede tener uno; si no, usar `cmdk` library)
- **Notificaciones**: dropdown al click (no implementado en el mock)
- **"Nueva empresa"**: navega a `/empresas/new` o abre modal (depende del flujo del codebase)
- **Hero CTAs**: "Ver empresas" → `/empresas`, "Configurar membresías" → `/membresias`
- **Module tiles**: hover anima `transform`, color e ícono según specs. Click navega a la ruta del módulo.
- Transiciones: `transition: all .15s` o `.18s cubic-bezier(.2,.8,.2,1)` en interacciones suaves
- **Persistencia**: el sidebar marca activo el item correspondiente a la ruta actual

---

## State Management

Este es el dashboard, principalmente estático en la mayoría de su superficie. Estado mínimo:
- `searchQuery: string` — para el command palette
- Los counts (128, 1847, etc.) deberían venir del backend; mostrar skeleton mientras cargan
- Estado de notificaciones: `unreadCount: number` (controla el punto amatista)

Carga de datos sugerida (React Query / SWR / equivalente):
```
GET /api/admin/stats
→ {
  empresas: 128,
  empleados: 1847,
  membresias: 6,
  modulos: 14,
  submodulos: 52,
  permisos_base: 38,
  roles_base: 9,
  unreadNotifications: 3,
}
```

---

## Design Tokens

### Colores — paleta Amatista
| Token | Hex |
|---|---|
| `amatista-50`  | `#faf5ff` |
| `amatista-100` | `#f3e8ff` |
| `amatista-200` | `#e9d5ff` |
| `amatista-300` | `#d8b4fe` |
| `amatista-400` | `#c084fc` |
| `amatista-500` | `#a855f7` |
| `amatista-600` | `#9333ea` |
| `amatista-700` | `#7e22ce` (color primario de marca) |
| `amatista-800` | `#6b21a8` |
| `amatista-900` | `#581c87` |
| `amatista-950` | `#3b0764` |

### Colores — neutrales (tono violeta)
| Token | Hex | Uso |
|---|---|---|
| `ink-900` | `#1a1325` | Texto principal, botón "Nueva empresa" |
| `ink-700` | `#3d2e57` | Texto secundario, avatar fondo |
| `ink-500` | `#6b5b80` | Texto de apoyo, descripciones |
| `ink-300` | `#a89bbd` | Placeholder, counts inactivos |
| `ink-100` | `#ede8f4` | Borders muy sutiles |
| `paper`   | `#fbfaff` | Background principal del app |
| `surface` | `#ffffff` | Cards, sidebar, top bar |
| `line`    | `#ece5f4` | Borders por defecto |
| `line-2`  | `#e0d5ee` | Borders más visibles |
| `search-bg` | `#f5f1fa` | Background del campo de búsqueda |

### Tipografía
- **Sans**: `Inter` (Google Fonts), pesos 400/500/600/700
- **Serif (display)**: `Instrument Serif` (Google Fonts), peso 400 — solo para el H1 del hero
- **Mono**: `JetBrains Mono` (Google Fonts), pesos 400/500 — para counts, atajos de teclado, eyebrows técnicos

Escala usada:
| Uso | Familia | Tamaño | Weight | Otros |
|---|---|---|---|---|
| H1 hero | Instrument Serif | 36px | 400 | letter-spacing -.01em, line-height 1.1 |
| Section title | Inter | 14px | 600 | — |
| Body | Inter | 14px | 400 | — |
| Body small | Inter | 13px | 400/500 | — |
| Caption | Inter | 12px | 400 | line-height 1.45 |
| Eyebrow | Inter | 11px | 600 | letter-spacing .1em, uppercase |
| Group heading | Inter | 10px | 600 | letter-spacing .1em, uppercase |
| Mono small | JetBrains Mono | 10–11px | 500 | — |

### Spacing
Sin escala explícita — valores usados en el mock: `4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 28, 32px`. Idealmente mapear a una escala de 4 (`0.25rem` step) en Tailwind.

### Border-radius
- `4px` — chips pequeños (kbd shortcut)
- `7px` — botones medianos, nav items
- `8px` — botones, inputs, cards pequeños
- `9px` — íconos chip
- `12px` — module tiles
- `14px` — hero
- `50%` — avatar

### Shadows
- Tile hover: `0 4px 16px -6px rgba(126,34,206,.15)`
- Logo del sidebar: `0 2px 6px -1px rgba(126,34,206,.4)`
- Hero glow: `radial-gradient(circle, rgba(216,180,254,.25), transparent 70%)`

---

## Assets

- **Iconos**: hechos a mano como SVGs lineales (stroke 1.6–1.8). Ver `reference/icons.jsx`. En producción reemplazar por una librería (recomendado: **lucide-react** — la mayoría de los íconos usados existen ahí: `LayoutGrid`, `Building2`, `Users`, `Ticket`, `Component`, `Boxes`, `Key`, `Shield`, `ShieldCheck`, `LogOut`, `Search`, `Bell`, `ArrowRight`, `ArrowUpRight`, `Plus`).
- **Logo**: cuadrado con ícono de pata sobre gradient amatista — placeholder. Si VetSoftware tiene logo oficial, sustituir.
- **Fonts**: Google Fonts (Inter, Instrument Serif, JetBrains Mono).

---

## Files

```
design_handoff_dashboard_equilibrada/
├── README.md                                  ← este documento
└── reference/
    ├── Dashboard-preview.html                 ← abrir en browser para ver el diseño funcional
    ├── variation-balanced.jsx                 ← componente React de referencia (Babel JSX)
    └── icons.jsx                              ← íconos SVG inline (referencia para mapping a lucide-react)
```

Para ver el diseño en vivo: abre `reference/Dashboard-preview.html` en un navegador (requiere conexión para cargar React + Babel + Google Fonts desde CDN).

---

## Notas para el desarrollador

1. **Si el codebase ya tiene un design system / UI kit** (shadcn, MUI, AntD, etc.): usa sus componentes (`Button`, `Card`, `Input`, etc.) y aplica los tokens de color y tipografía de arriba como overrides. No reinventes los componentes.

2. **Si no hay design system**: empieza por configurar Tailwind con la paleta amatista (extender `theme.colors.amatista` con la escala 50–950 de arriba) e importa las 3 fuentes de Google Fonts en el head.

3. **Layout responsive**: el mock está diseñado para escritorio (≥1280px). Para tablet (768–1279), colapsar el grid de módulos a 2 columnas y considerar sidebar colapsable. Para móvil, sidebar como drawer + grid de 1 columna.

4. **Accesibilidad**:
   - Navegación con teclado: el activo del sidebar debe coincidir con el focus visible.
   - Contraste: amatista 700 (`#7e22ce`) sobre blanco y blanco sobre amatista 900 (`#581c87`) cumplen AA.
   - El buscador debe responder a `Cmd/Ctrl+K` global.
   - Todos los íconos decorativos deben tener `aria-hidden="true"`; los que son acción (notif, logout) necesitan `aria-label`.

5. **Implementar el Command Palette**: usar [`cmdk`](https://cmdk.paco.me/) — el placeholder del input debe activar un modal full-page con búsqueda fuzzy entre empresas, módulos, permisos, etc.
