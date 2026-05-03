// Variación 2 — EQUILIBRADA
// Estructura moderna estilo Linear/Stripe-light:
// sidebar agrupado por secciones, top bar con buscador prominente,
// hero con resumen visual, módulos como tiles tipo Notion,
// micro-interacciones limpias.

const balancedStyles = {};

const BalNavGroup = ({ title, children }) => (
  <div style={{ marginBottom: 18 }}>
    <div style={{
      fontSize: 10, fontWeight: 600,
      color: '#a89bbd',
      letterSpacing: '.1em', textTransform: 'uppercase',
      padding: '0 12px 6px',
    }}>{title}</div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {children}
    </div>
  </div>
);

const BalNavItem = ({ icon: I, label, active, count }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '7px 12px', borderRadius: 7,
    fontSize: 13, fontWeight: active ? 600 : 500,
    color: active ? '#1a1325' : '#3d2e57',
    background: active ? '#f3e8ff' : 'transparent',
    cursor: 'pointer', position: 'relative',
    transition: 'background .12s',
  }}
  onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = '#faf5ff'; }}
  onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
  >
    {active && <div style={{
      position: 'absolute', left: -16, top: 4, bottom: 4, width: 2,
      background: '#7e22ce', borderRadius: 2,
    }} />}
    <I size={15} stroke={active ? 1.9 : 1.6} />
    <span style={{ flex: 1 }}>{label}</span>
    {count && (
      <span style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10, color: active ? '#7e22ce' : '#a89bbd',
        fontWeight: 500,
      }}>{count}</span>
    )}
  </div>
);

const BalModuleTile = ({ icon: I, title, desc, count, large }) => {
  const [hover, setHover] = React.useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        gridColumn: large ? 'span 2' : 'auto',
        padding: 18,
        borderRadius: 12,
        background: hover ? '#fff' : '#fbfaff',
        border: `1px solid ${hover ? '#d8b4fe' : '#ece5f4'}`,
        cursor: 'pointer',
        transition: 'all .15s',
        display: 'flex', flexDirection: 'column', gap: 12,
        position: 'relative',
        boxShadow: hover ? '0 4px 16px -6px rgba(126,34,206,.15)' : 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: hover ? '#f3e8ff' : '#fff',
          border: '1px solid #ece5f4',
          color: '#7e22ce',
          display: 'grid', placeItems: 'center',
          transition: 'background .15s',
        }}>
          <I size={16} stroke={1.7} />
        </div>
        <div style={{
          opacity: hover ? 1 : 0, transition: 'opacity .15s',
          color: '#7e22ce',
        }}>
          <IconArrowUp size={14} stroke={2} />
        </div>
      </div>
      <div>
        <div style={{
          display: 'flex', alignItems: 'baseline', gap: 8,
          marginBottom: 3,
        }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#1a1325' }}>{title}</span>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11, color: '#a89bbd', fontWeight: 500,
          }}>{count}</span>
        </div>
        <div style={{ fontSize: 12, color: '#6b5b80', lineHeight: 1.45 }}>{desc}</div>
      </div>
    </div>
  );
};

function BalancedDashboard() {
  return (
    <div style={{
      width: '100%', height: '100%', overflow: 'hidden',
      background: '#fbfaff', display: 'grid',
      gridTemplateColumns: '244px 1fr',
      fontFamily: "'Inter', sans-serif", color: '#1a1325',
    }}>
      {/* Sidebar */}
      <aside style={{
        background: '#fff',
        borderRight: '1px solid #ece5f4',
        padding: '20px 16px',
        display: 'flex', flexDirection: 'column',
        overflow: 'auto',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '0 12px 22px',
          marginBottom: 4,
          borderBottom: '1px solid #ece5f4',
        }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: 'linear-gradient(135deg, #a855f7, #581c87)',
            display: 'grid', placeItems: 'center', color: '#fff',
            boxShadow: '0 2px 6px -1px rgba(126,34,206,.4)',
          }}>
            <IconPaw size={16} stroke={2} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1325', letterSpacing: '-.01em', lineHeight: 1.1 }}>
              VetSoftware
            </div>
            <div style={{ fontSize: 10, color: '#6b5b80', letterSpacing: '.04em', marginTop: 1 }}>
              Panel administrativo
            </div>
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <BalNavGroup title="General">
            <BalNavItem icon={IconGrid} label="Dashboard" active />
            <BalNavItem icon={IconBuilding} label="Empresas" count="128" />
            <BalNavItem icon={IconUsers} label="Empleados" count="1.8k" />
          </BalNavGroup>

          <BalNavGroup title="Suscripciones">
            <BalNavItem icon={IconTicket} label="Membresías" count="6" />
            <BalNavItem icon={IconSubmodule} label="Membresías · Submódulos" />
          </BalNavGroup>

          <BalNavGroup title="Configuración">
            <BalNavItem icon={IconModule} label="Módulos" count="14" />
            <BalNavItem icon={IconSubmodule} label="Submódulos" count="52" />
            <BalNavItem icon={IconKey} label="Permisos base" count="38" />
            <BalNavItem icon={IconShield} label="Roles base" count="9" />
            <BalNavItem icon={IconShieldCheck} label="Permisos de roles" />
          </BalNavGroup>
        </div>

        <div style={{ flex: 1 }} />

        <div style={{
          padding: '10px 12px',
          display: 'flex', alignItems: 'center', gap: 10,
          borderRadius: 8,
          border: '1px solid #ece5f4',
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: '#3d2e57', color: '#fff',
            display: 'grid', placeItems: 'center',
            fontSize: 11, fontWeight: 600,
          }}>AD</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.1 }}>Admin</div>
            <div style={{ fontSize: 10, color: '#6b5b80', marginTop: 2 }}>Super administrador</div>
          </div>
          <IconLogout size={14} stroke={1.7} />
        </div>
      </aside>

      {/* Main */}
      <main style={{ overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        {/* Top bar */}
        <div style={{
          padding: '16px 32px',
          borderBottom: '1px solid #ece5f4',
          background: '#fff',
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 12px', borderRadius: 8,
            background: '#f5f1fa',
            flex: 1, maxWidth: 400,
          }}>
            <IconSearch size={14} stroke={1.8} />
            <span style={{ fontSize: 13, color: '#a89bbd' }}>Buscar empresas, módulos, permisos…</span>
            <div style={{ flex: 1 }} />
            <span style={{
              fontSize: 10, fontWeight: 600,
              padding: '2px 6px', borderRadius: 4,
              background: '#fff', color: '#6b5b80',
              border: '1px solid #ece5f4',
              fontFamily: "'JetBrains Mono', monospace",
            }}>⌘K</span>
          </div>
          <div style={{ flex: 1 }} />
          <button style={{
            width: 34, height: 34, borderRadius: 8,
            border: '1px solid #ece5f4', background: '#fff',
            display: 'grid', placeItems: 'center', cursor: 'pointer',
            position: 'relative',
          }}>
            <IconBell size={15} stroke={1.7} />
            <span style={{
              position: 'absolute', top: 6, right: 7,
              width: 6, height: 6, borderRadius: '50%',
              background: '#7e22ce', border: '2px solid #fff',
            }} />
          </button>
          <button style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 14px', borderRadius: 8,
            border: 'none', background: '#1a1325',
            fontSize: 13, fontWeight: 600, color: '#fff',
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            <IconPlus size={14} stroke={2.2} />
            Nueva empresa
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '28px 32px', flex: 1 }}>
          {/* Hero */}
          <div style={{
            background: 'linear-gradient(135deg, #581c87 0%, #3b0764 100%)',
            borderRadius: 14,
            padding: '28px 32px',
            color: '#fff',
            marginBottom: 24,
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: -40, right: -40,
              width: 220, height: 220, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(216,180,254,.25), transparent 70%)',
            }} />
            <div style={{ position: 'relative' }}>
              <div style={{
                fontSize: 11, fontWeight: 600, letterSpacing: '.1em',
                textTransform: 'uppercase', color: '#d8b4fe',
                marginBottom: 8,
              }}>Bienvenido de vuelta</div>
              <h1 style={{
                fontFamily: "'Instrument Serif', serif",
                fontSize: 36, fontWeight: 400, margin: 0,
                letterSpacing: '-.01em', lineHeight: 1.1,
              }}>Dashboard administrativo</h1>
              <p style={{
                fontSize: 14, color: '#e9d5ff',
                margin: '10px 0 18px', maxWidth: 540,
              }}>
                Administra empresas, membresías, módulos y permisos del sistema VetSoftware desde un solo lugar.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={{
                  padding: '8px 14px', borderRadius: 7,
                  background: '#fff', color: '#3b0764',
                  border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  Ver empresas <IconArrow size={13} stroke={2} />
                </button>
                <button style={{
                  padding: '8px 14px', borderRadius: 7,
                  background: 'rgba(255,255,255,.1)', color: '#fff',
                  border: '1px solid rgba(255,255,255,.2)',
                  cursor: 'pointer', fontSize: 13, fontWeight: 500, fontFamily: 'inherit',
                }}>
                  Configurar membresías
                </button>
              </div>
            </div>
          </div>

          {/* Modules grid */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            marginBottom: 14,
          }}>
            <h2 style={{
              fontSize: 14, fontWeight: 600, margin: 0,
              color: '#1a1325',
            }}>Módulos del sistema</h2>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11, color: '#a89bbd',
            }}>8 disponibles</span>
            <div style={{ flex: 1 }} />
            <button style={{
              fontSize: 12, fontWeight: 500, color: '#7e22ce',
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontFamily: 'inherit', padding: 0,
            }}>Personalizar →</button>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 12,
          }}>
            <BalModuleTile icon={IconBuilding} title="Empresas" count="128" desc="Clínicas y centros veterinarios registrados en la plataforma." />
            <BalModuleTile icon={IconUsers} title="Empleados" count="1,847" desc="Veterinarios, recepcionistas y personal administrativo." />
            <BalModuleTile icon={IconTicket} title="Membresías" count="6" desc="Planes de suscripción disponibles." />
            <BalModuleTile icon={IconModule} title="Módulos" count="14" desc="Funcionalidades del sistema." />
            <BalModuleTile icon={IconSubmodule} title="Submódulos" count="52" desc="Componentes detallados dentro de cada módulo." />
            <BalModuleTile icon={IconKey} title="Permisos base" count="38" desc="Catálogo de permisos asignables." />
            <BalModuleTile icon={IconShield} title="Roles base" count="9" desc="Plantillas de roles predefinidas." />
            <BalModuleTile icon={IconShieldCheck} title="Permisos de roles" count="—" desc="Configuración de permisos por rol." />
          </div>
        </div>
      </main>
    </div>
  );
}

window.BalancedDashboard = BalancedDashboard;
