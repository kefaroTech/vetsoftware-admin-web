// Variación 1 — SPLIT PANEL
// Formulario izquierda + panel amatista derecha con marca y mensaje.
// Login formal estilo SaaS clásico (Linear, Notion).

const FormField = ({ label, icon: I, type = 'text', placeholder, value, onChange, action, focused, onFocus, onBlur }) => (
  <div>
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      marginBottom: 6,
    }}>
      <label style={{
        fontSize: 12, fontWeight: 600, color: '#3d2e57',
        letterSpacing: '.01em',
      }}>{label}</label>
      {action}
    </div>
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 12px',
      background: '#fff',
      border: `1px solid ${focused ? '#a855f7' : '#ece5f4'}`,
      borderRadius: 8,
      transition: 'all .15s',
      boxShadow: focused ? '0 0 0 4px rgba(168,85,247,.12)' : 'none',
    }}>
      <I size={15} stroke={1.7} style={{ color: focused ? '#7e22ce' : '#a89bbd', flexShrink: 0 }} />
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onFocus={onFocus}
        onBlur={onBlur}
        style={{
          flex: 1, border: 'none', background: 'transparent',
          fontSize: 14, color: '#1a1325',
          minWidth: 0,
        }}
      />
    </div>
  </div>
);

function LoginSplit() {
  const [email, setEmail] = React.useState('');
  const [pwd, setPwd] = React.useState('');
  const [showPwd, setShowPwd] = React.useState(false);
  const [remember, setRemember] = React.useState(true);
  const [focus, setFocus] = React.useState('');

  return (
    <div style={{
      width: '100%', height: '100%', overflow: 'hidden',
      display: 'grid', gridTemplateColumns: '1fr 1.05fr',
      background: '#fff', fontFamily: "'Inter',sans-serif",
    }}>
      {/* Form side */}
      <div style={{
        padding: '48px 64px',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, #a855f7, #581c87)',
            display: 'grid', placeItems: 'center', color: '#fff',
            boxShadow: '0 2px 6px -1px rgba(126,34,206,.4)',
          }}>
            <IconPaw size={17} stroke={2} />
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-.01em' }}>VetSoftware</span>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: 380 }}>
          <div style={{
            fontSize: 11, fontWeight: 600, color: '#7e22ce',
            letterSpacing: '.1em', textTransform: 'uppercase',
            marginBottom: 10,
          }}>Panel administrativo</div>
          <h1 style={{
            fontFamily: "'Instrument Serif',serif",
            fontSize: 40, fontWeight: 400, margin: 0,
            letterSpacing: '-.02em', lineHeight: 1.05,
            color: '#1a1325',
          }}>Bienvenido de vuelta</h1>
          <p style={{
            fontSize: 14, color: '#6b5b80',
            margin: '12px 0 32px', lineHeight: 1.5,
          }}>Ingresa con tus credenciales para administrar empresas, membresías y permisos.</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <FormField
              label="Correo electrónico"
              icon={IconMail}
              type="email"
              placeholder="admin@vetsoftware.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              focused={focus === 'email'}
              onFocus={() => setFocus('email')}
              onBlur={() => setFocus('')}
            />
            <FormField
              label="Contraseña"
              icon={IconLock}
              type={showPwd ? 'text' : 'password'}
              placeholder="••••••••"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              focused={focus === 'pwd'}
              onFocus={() => setFocus('pwd')}
              onBlur={() => setFocus('')}
              action={
                <button onClick={() => setShowPwd(!showPwd)} style={{
                  fontSize: 11, color: '#7e22ce', fontWeight: 500,
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: 0,
                }}>
                  <IconEye size={12} stroke={1.7} />
                  {showPwd ? 'Ocultar' : 'Mostrar'}
                </button>
              }
            />

            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginTop: 4,
            }}>
              <label style={{
                display: 'flex', alignItems: 'center', gap: 8,
                fontSize: 13, color: '#3d2e57', cursor: 'pointer',
                userSelect: 'none',
              }}>
                <span
                  onClick={() => setRemember(!remember)}
                  style={{
                    width: 16, height: 16, borderRadius: 4,
                    border: `1.5px solid ${remember ? '#7e22ce' : '#d8b4fe'}`,
                    background: remember ? '#7e22ce' : '#fff',
                    display: 'grid', placeItems: 'center',
                    color: '#fff', transition: 'all .15s',
                  }}>
                  {remember && <IconCheck size={11} stroke={2.6} />}
                </span>
                Recordar sesión
              </label>
              <a href="#" style={{
                fontSize: 13, color: '#7e22ce',
                textDecoration: 'none', fontWeight: 500,
              }}>¿Olvidaste tu contraseña?</a>
            </div>

            <button style={{
              marginTop: 8,
              padding: '12px 16px', borderRadius: 9,
              background: '#1a1325', color: '#fff',
              border: 'none', cursor: 'pointer',
              fontSize: 14, fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'transform .12s, box-shadow .15s',
            }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 20px -8px rgba(26,19,37,.5)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              Iniciar sesión
              <IconArrow size={14} stroke={2.2} />
            </button>

            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              margin: '8px 0',
            }}>
              <div style={{ flex: 1, height: 1, background: '#ece5f4' }} />
              <span style={{ fontSize: 11, color: '#a89bbd', letterSpacing: '.04em' }}>O CONTINÚA CON</span>
              <div style={{ flex: 1, height: 1, background: '#ece5f4' }} />
            </div>

            <button style={{
              padding: '10px 16px', borderRadius: 9,
              background: '#fff', color: '#1a1325',
              border: '1px solid #ece5f4', cursor: 'pointer',
              fontSize: 13, fontWeight: 500,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              transition: 'border-color .15s',
            }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#d8b4fe'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#ece5f4'; }}
            >
              <IconGoogle size={16} />
              Continuar con Google
            </button>
          </div>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: 12, color: '#6b5b80',
        }}>
          <span>© 2026 VetSoftware</span>
          <div style={{ display: 'flex', gap: 16 }}>
            <a href="#" style={{ color: '#6b5b80', textDecoration: 'none' }}>Privacidad</a>
            <a href="#" style={{ color: '#6b5b80', textDecoration: 'none' }}>Términos</a>
            <a href="#" style={{ color: '#6b5b80', textDecoration: 'none' }}>Soporte</a>
          </div>
        </div>
      </div>

      {/* Visual side */}
      <div style={{
        background: 'linear-gradient(135deg, #581c87 0%, #3b0764 100%)',
        position: 'relative', overflow: 'hidden',
        padding: 48,
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        color: '#fff',
      }}>
        {/* Decorative glow */}
        <div style={{
          position: 'absolute', top: -100, right: -100,
          width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(216,180,254,.3), transparent 65%)',
        }} />
        <div style={{
          position: 'absolute', bottom: -80, left: -80,
          width: 320, height: 320, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(168,85,247,.25), transparent 65%)',
        }} />

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: '#86efac',
          }} />
          <span style={{
            fontSize: 11, color: '#d8b4fe',
            letterSpacing: '.08em', textTransform: 'uppercase',
            fontWeight: 600,
          }}>Sistema operativo</span>
        </div>

        <div style={{ position: 'relative' }}>
          <div style={{
            fontFamily: "'Instrument Serif',serif",
            fontSize: 56, fontWeight: 400,
            letterSpacing: '-.02em', lineHeight: 1.05,
            marginBottom: 20,
          }}>
            Administra<br />
            <span style={{ color: '#d8b4fe', fontStyle: 'italic' }}>la salud</span> de cada<br />
            clínica.
          </div>
          <p style={{
            fontSize: 15, color: '#e9d5ff',
            lineHeight: 1.5, maxWidth: 460,
          }}>
            VetSoftware centraliza empresas, membresías y permisos en un solo panel administrativo.
          </p>
        </div>

        <div style={{
          position: 'relative',
          padding: '20px 22px',
          background: 'rgba(216,180,254,.08)',
          border: '1px solid rgba(216,180,254,.2)',
          borderRadius: 12,
          backdropFilter: 'blur(10px)',
        }}>
          <div style={{
            fontFamily: "'JetBrains Mono',monospace",
            fontSize: 11, color: '#d8b4fe',
            letterSpacing: '.06em', marginBottom: 8,
          }}>// EN ESTE MOMENTO</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 24 }}>
            <div>
              <div style={{
                fontFamily: "'Instrument Serif',serif",
                fontSize: 32, fontWeight: 400, lineHeight: 1,
              }}>128</div>
              <div style={{ fontSize: 11, color: '#c4b5d4', marginTop: 4 }}>clínicas activas</div>
            </div>
            <div style={{ width: 1, height: 32, background: 'rgba(216,180,254,.2)' }} />
            <div>
              <div style={{
                fontFamily: "'Instrument Serif',serif",
                fontSize: 32, fontWeight: 400, lineHeight: 1,
              }}>1,847</div>
              <div style={{ fontSize: 11, color: '#c4b5d4', marginTop: 4 }}>profesionales</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.LoginSplit = LoginSplit;
window.FormField = FormField;
