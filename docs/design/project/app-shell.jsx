// ============ SHELL — sidebar navegable + topbar + toast ============

const NAV = [
  { k: 'dashboard', label: 'Dashboard', icon: 'IconGrid', group: 'General' },
  { k: 'empresas', label: 'Empresas', icon: 'IconBuilding', group: 'General', count: '128' },
  { k: 'empleados', label: 'Empleados', icon: 'IconUsers', group: 'General', count: '1.8k' },
  { k: 'membresias', label: 'Membresías', icon: 'IconTicket', group: 'Suscripciones', count: '6' },
  { k: 'modulos', label: 'Módulos', icon: 'IconModule', group: 'Configuración', count: '14' },
  { k: 'permisos', label: 'Permisos base', icon: 'IconKey', group: 'Configuración', count: '38' },
  { k: 'roles', label: 'Roles base', icon: 'IconShield', group: 'Configuración', count: '9' },
  { k: 'configuracion', label: 'Configuración', icon: 'IconSettings', group: 'Sistema' },
];

function AppSidebar() {
  const { view, navigate, logout } = useApp();
  const groups = [...new Set(NAV.map(i => i.group))];
  return (
    <aside style={{ background: '#fff', borderRight: '1px solid #ece5f4', padding: '20px 16px', display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
      <div onClick={() => navigate('dashboard')} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px 22px', borderBottom: '1px solid #ece5f4', cursor: 'pointer' }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg,#a855f7,#581c87)', display: 'grid', placeItems: 'center', color: '#fff', boxShadow: '0 2px 6px -1px rgba(126,34,206,.4)' }}>
          <IconPaw size={16} stroke={2} />
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-.01em', lineHeight: 1.1 }}>VetSoftware</div>
          <div style={{ fontSize: 10, color: '#6b5b80', marginTop: 1 }}>Panel administrativo</div>
        </div>
      </div>
      <div style={{ marginTop: 18 }}>
        {groups.map(g => (
          <div key={g} style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#a89bbd', letterSpacing: '.1em', textTransform: 'uppercase', padding: '0 12px 6px' }}>{g}</div>
            {NAV.filter(i => i.group === g).map(it => {
              const isActive = it.k === view;
              const Ico = window[it.icon];
              return (
                <div key={it.k} onClick={() => navigate(it.k)} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '7px 12px', borderRadius: 7,
                  fontSize: 13, fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#1a1325' : '#3d2e57',
                  background: isActive ? '#f3e8ff' : 'transparent',
                  cursor: 'pointer', position: 'relative', transition: 'background .12s',
                }}
                  onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = '#faf5ff'; }}
                  onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}>
                  {isActive && <div style={{ position: 'absolute', left: -16, top: 4, bottom: 4, width: 2, background: '#7e22ce', borderRadius: 2 }} />}
                  <Ico size={15} stroke={isActive ? 1.9 : 1.6} />
                  <span style={{ flex: 1 }}>{it.label}</span>
                  {it.count && <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: isActive ? '#7e22ce' : '#a89bbd', fontWeight: 500 }}>{it.count}</span>}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, borderRadius: 8, border: '1px solid #ece5f4' }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#3d2e57', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 600 }}>AD</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.1 }}>Admin</div>
          <div style={{ fontSize: 10, color: '#6b5b80', marginTop: 2 }}>Super administrador</div>
        </div>
        <button onClick={logout} title="Cerrar sesión" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#6b5b80', padding: 4, display: 'grid', placeItems: 'center' }}>
          <IconLogout size={14} stroke={1.7} />
        </button>
      </div>
    </aside>
  );
}

function AppTopBar({ children, placeholder = 'Buscar empleados, roles…' }) {
  return (
    <div style={{ padding: '16px 32px', borderBottom: '1px solid #ece5f4', background: '#fff', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: '#f5f1fa', flex: 1, maxWidth: 400 }}>
        <IconSearch size={14} stroke={1.8} />
        <span style={{ fontSize: 13, color: '#a89bbd' }}>{placeholder}</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: '#fff', color: '#6b5b80', border: '1px solid #ece5f4', fontFamily: "'JetBrains Mono',monospace" }}>⌘K</span>
      </div>
      <div style={{ flex: 1 }} />
      <button style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid #ece5f4', background: '#fff', display: 'grid', placeItems: 'center', cursor: 'pointer', position: 'relative' }}>
        <IconBell size={15} stroke={1.7} />
        <span style={{ position: 'absolute', top: 6, right: 7, width: 6, height: 6, borderRadius: '50%', background: '#7e22ce', border: '2px solid #fff' }} />
      </button>
      {children}
    </div>
  );
}

function Toast() {
  const { toast } = useApp();
  if (!toast) return null;
  return (
    <div style={{
      position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)', zIndex: 100,
      display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px', borderRadius: 10,
      background: '#1a1325', color: '#fff', boxShadow: '0 12px 32px -8px rgba(26,19,37,.5)',
      animation: 'toastIn .25s cubic-bezier(.2,.8,.2,1)', fontSize: 13, fontWeight: 500,
    }}>
      <style>{`@keyframes toastIn{from{opacity:0;transform:translate(-50%,12px)}to{opacity:1;transform:translate(-50%,0)}}`}</style>
      <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#22c55e', display: 'grid', placeItems: 'center', color: '#fff' }}>
        <IconCheck size={12} stroke={3} />
      </span>
      {toast.msg}
    </div>
  );
}

// Vista placeholder elegante para módulos aún no construidos
function PlaceholderView({ icon, title, desc }) {
  const Ico = window[icon];
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <AppTopBar />
      <div style={{ flex: 1, display: 'grid', placeItems: 'center', padding: 40 }}>
        <div style={{ textAlign: 'center', maxWidth: 380 }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: '#f3e8ff', color: '#7e22ce', display: 'grid', placeItems: 'center', margin: '0 auto 20px' }}>
            <Ico size={30} stroke={1.6} />
          </div>
          <h1 style={{ fontFamily: "'Instrument Serif',serif", fontSize: 32, fontWeight: 400, margin: 0, letterSpacing: '-.02em' }}>{title}</h1>
          <p style={{ fontSize: 14, color: '#6b5b80', margin: '10px 0 0', lineHeight: 1.5 }}>{desc}</p>
          <div style={{ marginTop: 20, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 999, background: '#faf5ff', border: '1px solid #e9d5ff', fontSize: 12, color: '#7e22ce', fontWeight: 600 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#c084fc' }} />
            Módulo en construcción
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { AppSidebar, AppTopBar, Toast, PlaceholderView });
