// ============ STORE — navegación + datos compartidos ============
// Provee estado global: vista actual, sesión, empleados y configuración UVT.
// La UVT se persiste en localStorage (clave vetsoftware_uvt) para sobrevivir refresh.

const AppCtx = React.createContext(null);
const useApp = () => React.useContext(AppCtx);

const UVT_KEY = 'vetsoftware_uvt';
const CURRENT_YEAR = 2026;

// Valores históricos de referencia (UVT Colombia, COP). El año en curso es editable.
const DEFAULT_UVT = {
  currentYear: CURRENT_YEAR,
  byYear: {
    2024: { value: 47065, vigencia: '2024-01-01', updatedAt: '2023-11-30', editable: false },
    2025: { value: 49799, vigencia: '2025-01-01', updatedAt: '2024-11-28', editable: false },
    2026: { value: 52000, vigencia: '2026-01-01', updatedAt: null, editable: true },
  },
};

function loadUvt() {
  try {
    const raw = localStorage.getItem(UVT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // merge defaults con lo guardado
      return { ...DEFAULT_UVT, ...parsed, byYear: { ...DEFAULT_UVT.byYear, ...(parsed.byYear || {}) } };
    }
  } catch (e) {}
  return DEFAULT_UVT;
}

const formatCOP = (n) => '$' + Number(n).toLocaleString('es-CO');
const formatDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''));
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
};

function AppProvider({ children }) {
  const [authed, setAuthed] = React.useState(false);
  const [view, setView] = React.useState('dashboard');
  const [employees, setEmployees] = React.useState(window.empData.employees);
  const [uvt, setUvtState] = React.useState(loadUvt);
  const [toast, setToast] = React.useState(null);

  const navigate = (v) => setView(v);
  const login = () => { setAuthed(true); setView('dashboard'); };
  const logout = () => { setAuthed(false); };

  const changeRole = (code, role) => {
    setEmployees(prev => prev.map(e => e.code === code ? { ...e, role } : e));
  };

  const showToast = (msg, kind = 'success') => {
    setToast({ msg, kind, id: Date.now() });
    setTimeout(() => setToast(t => (t && t.msg === msg ? null : t)), 3200);
  };

  // Guarda el valor de la UVT para un año dado.
  const saveUvt = (year, value) => {
    setUvtState(prev => {
      const next = {
        ...prev,
        byYear: {
          ...prev.byYear,
          [year]: {
            ...prev.byYear[year],
            value: Number(value),
            updatedAt: new Date().toISOString().slice(0, 10),
            editable: true,
          },
        },
      };
      try { localStorage.setItem(UVT_KEY, JSON.stringify(next)); } catch (e) {}
      return next;
    });
    showToast(`UVT ${year} actualizada a ${formatCOP(value)}`);
  };

  const value = {
    authed, login, logout,
    view, navigate,
    employees, changeRole,
    uvt, saveUvt,
    toast, showToast,
    formatCOP, formatDate,
    currentYear: CURRENT_YEAR,
  };
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

Object.assign(window, { AppCtx, useApp, AppProvider, formatCOP, formatDate, CURRENT_YEAR });
