import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Banknote,
  Bath,
  Bell,
  Building2,
  Cat,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  ClipboardPlus,
  Component,
  Copy,
  Dog,
  Eye,
  EyeOff,
  FileText,
  Fish,
  Globe,
  History,
  Inbox,
  Info,
  Key,
  LayoutDashboard,
  LayoutGrid,
  Lock,
  LogOut,
  Mail,
  Palette,
  PauseCircle,
  PawPrint,
  Pencil,
  Pill,
  Plus,
  Receipt,
  Replace,
  RotateCcw,
  ScanLine,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  Slice,
  SlidersHorizontal,
  Stethoscope,
  Syringe,
  TestTube,
  Ticket,
  Trash2,
  User,
  Users,
  X,
} from 'lucide-vue-next'

/**
 * Los iconos de la consola, como componentes de Lucide.
 *
 * Antes eran cadenas `'tabler:...'` que resolvía Iconify en tiempo de ejecución
 * contra un subconjunto generado por `scripts/build-icon-subset.mjs`. Eso tenía
 * dos costes: un chunk de 183 kB —la mitad del bundle de esta consola— y un
 * paso de generación que había que recordar correr; y además nada comprobaba que
 * el nombre existiera, así que un icono mal escrito salía como un hueco en la
 * interfaz (le pasó a `SURGERY_TYPE`).
 *
 * Con componentes, un nombre inexistente no compila y el bundler se lleva solo
 * los que se usan. El front operativo ya usaba Lucide: TR-02 los deja iguales.
 */
export const ICONS = {
  DASHBOARD: LayoutDashboard,
  COMPANY: Building2,
  EMPLOYEE: Users,
  COMMERCIAL_CATALOG: Ticket,
  // Las tres entradas que §2 de la especificación de suscripciones añade al
  // menú: el asistente, la oferta y las políticas de facturación.
  CONFIGURATOR: SlidersHorizontal,
  QUOTE: FileText,
  PLATFORM_BILLING: Banknote,
  SUBSCRIPTION: Replace,
  MODULE: LayoutGrid,
  SUBMODULE: Component,
  BASE_PERMISSION: Key,
  BASE_ROLE: Shield,
  BASE_ROLE_PERMISSION: ShieldCheck,

  ANIMAL_SETTINGS: Dog,
  SPECIES: Cat,
  BREED: Fish,
  COLOR: Palette,
  CHEVRON_DOWN: ChevronDown,

  CLINICAL_CATALOGS: ClipboardPlus,
  CONSULTATION_TYPE: Stethoscope,
  VACCINATION_TYPE: Syringe,
  SURGERY_TYPE: Slice,
  LABORATORY_TEST_TYPE: TestTube,
  DIAGNOSTIC_IMAGING_TYPE: ScanLine,
  SPA_TYPE: Bath,
  /** Vademécum: el catálogo de medicamentos de la plataforma. */
  MEDICAMENT: Pill,

  ADD: Plus,
  EDIT: Pencil,
  DELETE: Trash2,
  /**
   * Retirar del recetario sin borrar. NO se reutiliza `DELETE` a propósito: el
   * `DELETE` del backend es una baja lógica y la interfaz la llama «pausar»,
   * así que un cubo de basura prometería algo irreversible que no lo es.
   */
  PAUSE: PauseCircle,
  CLOSE: X,
  COPY: Copy,
  BACK: ArrowLeft,
  LOGOUT: LogOut,
  CHECK: Check,

  SETTINGS: Settings,
  RECEIPT: Receipt,
  HISTORY: History,

  USER: User,
  LOCK: Lock,
  MAIL: Mail,
  EYE: Eye,
  EYE_OFF: EyeOff,

  SEARCH: Search,
  /** Ámbito global: lo que comparte toda la plataforma, frente a lo de una empresa. */
  GLOBE: Globe,
  BELL: Bell,
  PAW: PawPrint,
  ARROW_RIGHT: ArrowRight,
  ARROW_UP_RIGHT: ArrowUpRight,

  CHEVRON_LEFT: ChevronLeft,
  CHEVRON_RIGHT: ChevronRight,

  SUCCESS: CheckCircle2,
  ERROR: AlertCircle,
  WARNING: AlertTriangle,
  INFO: Info,
  RETRY: RotateCcw,
  EMPTY: Inbox,
  CHECKED: CheckCircle2,
  UNCHECKED: Circle,
} as const
