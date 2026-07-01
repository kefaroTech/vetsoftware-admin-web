// ============ DASHBOARD VIEW ============

function DashTile({ navKey, icon, title, desc, count }) {
  const { navigate } = useApp();
  const [hover, setHover] = React.useState(false);
  const Ico = window[icon];
  return (
    <div onClick={() => navigate(navKey)} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        padding: 18, borderRadius: 12,
        background: hover ? '#fff' : '#fbfaff',
        border: `1px solid ${hover ? '#d8b4fe' : '#ece5f4'}`,
        cursor: 'pointer', transition: 'all .15s',
        display: 'flex', flexDirection: 'column', gap: 12,
        boxShadow: hover ? '0 4px 16px -6px rgba(126,34,206,.15)' : 'none',
      }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: hover ? '#f3e8ff' : '#fff', border: '1px solid #ece5f4', color: '#7e22ce', display: 'grid', placeItems: 'center', transition: 'background .15s' }}>
          <Ico size={16} stroke={1.7} />
        </div>
        <div style={{ opacity: hover ? 1 : 0, transition: 'opacity .15s', color: '#7e22ce' }}><IconArrowUp size={14} stroke={2} /></div>
      </div>
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 3 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#1a1325' }}>{title}</span>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#a89bbd', fontWeight: 500 }}>{count}</span>
        </div>
        <div style={{ fontSize: 12, color: '#6b5b80', lineHeight: 1.45 }}>{desc}</div>
      </div>
    </div>
  );
}

function DashboardView() {
  const { navigate, uvt, formatCOP } = useApp();
  const cur = uvt.byYear[uvt.currentYear];
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <AppTopBar placeholder="Buscar empresas, módulos, permisos…">
        <button onClick={() => navigate('empresas')} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 8, border: 'none', background: '#1a1325', fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer' }}>
          <IconPlus size={14} stroke={2.2} />Nueva empresa
        </button>
      </AppTopBar>
      <div style={{ padding: '28px 32px', flex: 1, overflow: 'auto' }}>
        {/* Hero */}
        <div style={{ background: 'linear-gradient(135deg,#581c87 0%,#3b0764 100%)', borderRadius: 14, padding: '28px 32px', color: '#fff', marginBottom: 20, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -40, right: -40, width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle,rgba(216,180,254,.25),transparent 70%)' }} />
          <div style={{ position: 'relative' }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: '#d8b4fe', marginBottom: 8 }}>Bienvenido de vuelta</div>
            <h1 style={{ fontFamily: "'Instrument Serif',serif", fontSize: 36, fontWeight: 400, margin: 0, letterSpacing: '-.01em', lineHeight: 1.1 }}>Dashboard administrativo</h1>
            <p style={{ fontSize: 14, color: '#e9d5ff', margin: '10px 0 18px', maxWidth: 540 }}>Administra empresas, membresías, módulos y permisos del sistema VetSoftware desde un solo lugar.</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => navigate('empresas')} style={{ padding: '8px 14px', borderRadius: 7, background: '#fff', color: '#3b0764', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>Ver empresas <IconArrow size={13} stroke={2} /></button>
              <button onClick={() => navigate('membresias')} style={{ padding: '8px 14px', borderRadius: 7, background: 'rgba(255,255,255,.1)', color: '#fff', border: '1px solid rgba(255,255,255,.2)', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>Configurar membresías</button>
            </div>
          </div>
        </div>

        {/* UVT billing strip — feature destacada */}
        <div onClick={() => navigate('configuracion')} style={{
          display: 'flex', alignItems: 'center', gap: 18, padding: '16px 22px', marginBottom: 24,
          background: '#fff', border: '1px solid #e9d5ff', borderRadius: 12, cursor: 'pointer',
          transition: 'border-color .15s, box-shadow .15s',
        }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#c084fc'; e.currentTarget.style.boxShadow = '0 4px 16px -6px rgba(126,34,206,.15)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e9d5ff'; e.currentTarget.style.boxShadow = 'none'; }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f3e8ff', color: '#7e22ce', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
            <IconReceipt size={20} stroke={1.6} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#7e22ce', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 3 }}>Facturación electrónica</div>
            <div style={{ fontSize: 13, color: '#3d2e57' }}>Valor UVT vigente {uvt.currentYear} para cálculos de facturación</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: 28, fontWeight: 400, color: '#1a1325', lineHeight: 1 }}>{formatCOP(cur.value)}</div>
            <div style={{ fontSize: 11, color: '#a89bbd', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>Configurar <IconArrow size={11} stroke={2} /></div>
          </div>
        </div>

        {/* Módulos */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0, color: '#1a1325' }}>Módulos del sistema</h2>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#a89bbd' }}>8 disponibles</span>
          <div style={{ flex: 1 }} />
          <button onClick={() => navigate('configuracion')} style={{ fontSize: 12, fontWeight: 500, color: '#7e22ce', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>Personalizar →</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
          <DashTile navKey="empresas" icon="IconBuilding" title="Empresas" count="128" desc="Clínicas y centros veterinarios registrados en la plataforma." />
          <DashTile navKey="empleados" icon="IconUsers" title="Empleados" count="1,847" desc="Veterinarios, recepcionistas y personal administrativo." />
          <DashTile navKey="membresias" icon="IconTicket" title="Membresías" count="6" desc="Planes de suscripción disponibles." />
          <DashTile navKey="modulos" icon="IconModule" title="Módulos" count="14" desc="Funcionalidades del sistema." />
          <DashTile navKey="modulos" icon="IconSubmodule" title="Submódulos" count="52" desc="Componentes detallados dentro de cada módulo." />
          <DashTile navKey="permisos" icon="IconKey" title="Permisos base" count="38" desc="Catálogo de permisos asignables." />
          <DashTile navKey="roles" icon="IconShield" title="Roles base" count="9" desc="Plantillas de roles predefinidas." />
          <DashTile navKey="configuracion" icon="IconSettings" title="Configuración" count="" desc="UVT, facturación electrónica y ajustes del sistema." />
        </div>
      </div>
    </div>
  );
}

window.DashboardView = DashboardView;
