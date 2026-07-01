// ============ LOGIN VIEW (card centrada, conectado al store) ============

function LoginField({ label, icon, type, placeholder, value, onChange, focused, onFocus, onBlur }) {
  const Ico = window[icon];
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 600, color: '#3d2e57', letterSpacing: '.01em', display: 'block', marginBottom: 6 }}>{label}</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#fff', border: `1px solid ${focused ? '#a855f7' : '#ece5f4'}`, borderRadius: 8, transition: 'all .15s', boxShadow: focused ? '0 0 0 4px rgba(168,85,247,.12)' : 'none' }}>
        <Ico size={15} stroke={1.7} style={{ color: focused ? '#7e22ce' : '#a89bbd', flexShrink: 0 }} />
        <input type={type} placeholder={placeholder} value={value} onChange={onChange} onFocus={onFocus} onBlur={onBlur} style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 14, color: '#1a1325', minWidth: 0, outline: 'none' }} />
      </div>
    </div>
  );
}

function LoginView() {
  const { login } = useApp();
  const [email, setEmail] = React.useState('admin@vetsoftware.com');
  const [pwd, setPwd] = React.useState('demo1234');
  const [showPwd, setShowPwd] = React.useState(false);
  const [focus, setFocus] = React.useState('');
  const submit = (e) => { if (e) e.preventDefault(); login(); };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: 'radial-gradient(ellipse at top,#f3e8ff 0%,#f5f1fa 50%,#ede8f4 100%)', fontFamily: "'Inter',sans-serif", display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'absolute', top: -150, right: -150, width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle,rgba(192,132,252,.25),transparent 60%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -150, left: -150, width: 450, height: 450, borderRadius: '50%', background: 'radial-gradient(circle,rgba(168,85,247,.18),transparent 60%)', pointerEvents: 'none' }} />

      <div style={{ padding: '24px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg,#a855f7,#581c87)', display: 'grid', placeItems: 'center', color: '#fff', boxShadow: '0 2px 6px -1px rgba(126,34,206,.4)' }}><IconPaw size={16} stroke={2} /></div>
          <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-.01em' }}>VetSoftware</span>
        </div>
        <div style={{ fontSize: 13, color: '#6b5b80' }}>¿Eres nuevo? <a href="#" onClick={e => e.preventDefault()} style={{ color: '#7e22ce', fontWeight: 600, textDecoration: 'none' }}>Solicita acceso</a></div>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, position: 'relative' }}>
        <form onSubmit={submit} style={{ width: '100%', maxWidth: 440, background: '#fff', borderRadius: 16, padding: '40px 44px', border: '1px solid #ece5f4', boxShadow: '0 24px 48px -16px rgba(91,33,182,.18), 0 4px 12px -4px rgba(91,33,182,.08)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#7e22ce', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 8 }}>Panel administrativo</div>
          <h1 style={{ fontFamily: "'Instrument Serif',serif", fontSize: 34, fontWeight: 400, margin: 0, letterSpacing: '-.02em', lineHeight: 1.05 }}>Inicia sesión</h1>
          <p style={{ fontSize: 13, color: '#6b5b80', margin: '10px 0 28px', lineHeight: 1.5 }}>Accede al panel para administrar VetSoftware.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <LoginField label="Correo electrónico" icon="IconMail" type="email" placeholder="admin@vetsoftware.com" value={email} onChange={e => setEmail(e.target.value)} focused={focus === 'email'} onFocus={() => setFocus('email')} onBlur={() => setFocus('')} />
            <LoginField label="Contraseña" icon="IconLock" type={showPwd ? 'text' : 'password'} placeholder="••••••••" value={pwd} onChange={e => setPwd(e.target.value)} focused={focus === 'pwd'} onFocus={() => setFocus('pwd')} onBlur={() => setFocus('')} />
            <button type="submit" style={{ marginTop: 6, padding: '12px 16px', borderRadius: 9, background: 'linear-gradient(180deg,#9333ea,#7e22ce)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 12px -2px rgba(126,34,206,.4), inset 0 1px 0 rgba(255,255,255,.15)', transition: 'transform .12s, box-shadow .15s' }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 20px -4px rgba(126,34,206,.5), inset 0 1px 0 rgba(255,255,255,.15)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px -2px rgba(126,34,206,.4), inset 0 1px 0 rgba(255,255,255,.15)'; }}>
              Iniciar sesión <IconArrow size={14} stroke={2.2} />
            </button>
          </div>
        </form>
      </div>

      <div style={{ padding: '20px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: '#6b5b80', position: 'relative' }}>
        <span>© 2026 VetSoftware</span>
        <div style={{ display: 'flex', gap: 16 }}>
          <a href="#" onClick={e => e.preventDefault()} style={{ color: '#6b5b80', textDecoration: 'none' }}>Privacidad</a>
          <a href="#" onClick={e => e.preventDefault()} style={{ color: '#6b5b80', textDecoration: 'none' }}>Términos</a>
          <a href="#" onClick={e => e.preventDefault()} style={{ color: '#6b5b80', textDecoration: 'none' }}>Soporte</a>
        </div>
      </div>
    </div>
  );
}

window.LoginView = LoginView;
