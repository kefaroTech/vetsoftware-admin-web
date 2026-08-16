import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
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
  Fish,
  History,
  Info,
  Key,
  LayoutDashboard,
  LayoutGrid,
  Lock,
  LogOut,
  Mail,
  Palette,
  PawPrint,
  Pencil,
  Plus,
  Receipt,
  Replace,
  ScanLine,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  Slice,
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
  MEMBERSHIP: Ticket,
  MEMBERSHIP_SUBMODULE: Replace,
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

  ADD: Plus,
  EDIT: Pencil,
  DELETE: Trash2,
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
  CHECKED: CheckCircle2,
  UNCHECKED: Circle,
} as const
