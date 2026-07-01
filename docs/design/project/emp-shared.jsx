// Shared shell — sidebar + topbar idéntico al Dashboard equilibrada
const empData = {
  roles: [
    { code: 'ADMIN', name: 'Administrador', desc: 'Acceso total al sistema' },
    { code: 'VET', name: 'Veterinario', desc: 'Consultas, historiales, prescripciones' },
    { code: 'VET_ASSIST', name: 'Asistente veterinario', desc: 'Apoyo en consultas y procedimientos' },
    { code: 'RECEPTION', name: 'Recepción', desc: 'Citas, propietarios, agenda' },
    { code: 'GROOMER', name: 'Spa / Estética', desc: 'Servicios de spa y peluquería' },
    { code: 'LAB', name: 'Laboratorio', desc: 'Pruebas y resultados de laboratorio' },
  ],
  employees: [
    { code: 'EMP-0014', name: 'María Fernanda López', email: 'maria.lopez@pawcare.vet', status: 'ACTIVE', role: 'VET', initials: 'MF', joined: '2024-08-12', lastActive: 'hace 5 min' },
    { code: 'EMP-0028', name: 'Carlos Andrés Ríos', email: 'carlos.rios@pawcare.vet', status: 'ACTIVE', role: 'VET', initials: 'CR', joined: '2024-11-03', lastActive: 'hace 1 h' },
    { code: 'EMP-0031', name: 'Lucía Mendoza Vargas', email: 'lucia.mendoza@pawcare.vet', status: 'ACTIVE', role: 'RECEPTION', initials: 'LM', joined: '2025-01-20', lastActive: 'hace 12 min' },
    { code: 'EMP-0042', name: 'Diego Alejandro Salas', email: 'diego.salas@pawcare.vet', status: 'ACTIVE', role: 'VET_ASSIST', initials: 'DS', joined: '2025-03-08', lastActive: 'hace 2 h' },
    { code: 'EMP-0047', name: 'Ana Paula Restrepo', email: 'ana.restrepo@pawcare.vet', status: 'ACTIVE', role: 'GROOMER', initials: 'AR', joined: '2025-04-14', lastActive: 'hace 30 min' },
    { code: 'EMP-0053', name: 'Jorge Iván Castaño', email: 'jorge.castano@pawcare.vet', status: 'INACTIVE', role: 'LAB', joined: '2024-05-22', lastActive: 'hace 14 días' },
    { code: 'EMP-0061', name: 'Valentina Suárez', email: 'valentina.suarez@pawcare.vet', status: 'ACTIVE', role: 'VET', initials: 'VS', joined: '2025-02-11', lastActive: 'hace 3 h' },
    { code: 'EMP-0068', name: 'Sebastián Ortiz Pineda', email: 'sebastian.ortiz@pawcare.vet', status: 'ACTIVE', role: 'ADMIN', initials: 'SO', joined: '2024-02-06', lastActive: 'ahora' },
    { code: 'EMP-0072', name: 'Camila Andrea Vélez', email: 'camila.velez@pawcare.vet', status: 'ACTIVE', role: 'RECEPTION', initials: 'CV', joined: '2025-05-02', lastActive: 'hace 8 min' },
    { code: 'EMP-0079', name: 'Andrés Felipe Henao', email: 'andres.henao@pawcare.vet', status: 'INACTIVE', role: 'VET_ASSIST', initials: 'AH', joined: '2024-09-18', lastActive: 'hace 1 mes' },
  ],
};
empData.employees.forEach(e => { if (!e.initials) e.initials = e.name.split(' ').map(p=>p[0]).slice(0,2).join(''); });
const roleColor = (c) => ({
  ADMIN: { bg:'#1a1325', fg:'#fff' }, VET:{bg:'#7e22ce',fg:'#fff'}, VET_ASSIST:{bg:'#f3e8ff',fg:'#7e22ce'},
  RECEPTION:{bg:'#ede8f4',fg:'#3d2e57'}, GROOMER:{bg:'#fce7f3',fg:'#a21caf'}, LAB:{bg:'#dcfce7',fg:'#166534'},
}[c] || {bg:'#ede8f4',fg:'#3d2e57'});
const roleName = (c) => empData.roles.find(r => r.code === c)?.name || c;

function Sidebar({ active = 'empleados' }) {
  const items = [
    { k:'dashboard', label:'Dashboard', icon:IconGrid, group:'General' },
    { k:'empresas', label:'Empresas', icon:IconBuilding, group:'General', count:'128' },
    { k:'empleados', label:'Empleados', icon:IconUsers, group:'General', count:'1.8k' },
    { k:'membresias', label:'Membresías', icon:IconTicket, group:'Suscripciones', count:'6' },
    { k:'modulos', label:'Módulos', icon:IconModule, group:'Configuración', count:'14' },
    { k:'permisos', label:'Permisos base', icon:IconKey, group:'Configuración', count:'38' },
    { k:'roles', label:'Roles base', icon:IconShield, group:'Configuración', count:'9' },
  ];
  const groups = [...new Set(items.map(i=>i.group))];
  return (
    <aside style={{
      background:'#fff', borderRight:'1px solid #ece5f4', padding:'20px 16px',
      display:'flex', flexDirection:'column', overflow:'auto',
    }}>
      <div style={{display:'flex',alignItems:'center',gap:10,padding:'0 12px 22px',borderBottom:'1px solid #ece5f4'}}>
        <div style={{width:30,height:30,borderRadius:8,background:'linear-gradient(135deg,#a855f7,#581c87)',display:'grid',placeItems:'center',color:'#fff',boxShadow:'0 2px 6px -1px rgba(126,34,206,.4)'}}>
          <IconPaw size={16} stroke={2}/>
        </div>
        <div>
          <div style={{fontSize:14,fontWeight:700,letterSpacing:'-.01em',lineHeight:1.1}}>VetSoftware</div>
          <div style={{fontSize:10,color:'#6b5b80',marginTop:1}}>Panel administrativo</div>
        </div>
      </div>
      <div style={{marginTop:18}}>
      {groups.map(g => (
        <div key={g} style={{marginBottom:18}}>
          <div style={{fontSize:10,fontWeight:600,color:'#a89bbd',letterSpacing:'.1em',textTransform:'uppercase',padding:'0 12px 6px'}}>{g}</div>
          {items.filter(i=>i.group===g).map(it => {
            const isActive = it.k === active;
            return (
              <div key={it.k} style={{
                display:'flex',alignItems:'center',gap:10,padding:'7px 12px',borderRadius:7,
                fontSize:13,fontWeight:isActive?600:500,
                color:isActive?'#1a1325':'#3d2e57',
                background:isActive?'#f3e8ff':'transparent',
                cursor:'pointer',position:'relative',
              }}>
                {isActive && <div style={{position:'absolute',left:-16,top:4,bottom:4,width:2,background:'#7e22ce',borderRadius:2}}/>}
                <it.icon size={15} stroke={isActive?1.9:1.6}/>
                <span style={{flex:1}}>{it.label}</span>
                {it.count && <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:isActive?'#7e22ce':'#a89bbd',fontWeight:500}}>{it.count}</span>}
              </div>
            );
          })}
        </div>
      ))}
      </div>
      <div style={{flex:1}}/>
      <div style={{padding:'10px 12px',display:'flex',alignItems:'center',gap:10,borderRadius:8,border:'1px solid #ece5f4'}}>
        <div style={{width:28,height:28,borderRadius:'50%',background:'#3d2e57',color:'#fff',display:'grid',placeItems:'center',fontSize:11,fontWeight:600}}>AD</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:12,fontWeight:600,lineHeight:1.1}}>Admin</div>
          <div style={{fontSize:10,color:'#6b5b80',marginTop:2}}>Super administrador</div>
        </div>
        <IconLogout size={14} stroke={1.7}/>
      </div>
    </aside>
  );
}

function TopBar({ children }) {
  return (
    <div style={{padding:'16px 32px',borderBottom:'1px solid #ece5f4',background:'#fff',display:'flex',alignItems:'center',gap:14}}>
      <div style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',borderRadius:8,background:'#f5f1fa',flex:1,maxWidth:400}}>
        <IconSearch size={14} stroke={1.8}/>
        <span style={{fontSize:13,color:'#a89bbd'}}>Buscar empleados, roles…</span>
        <div style={{flex:1}}/>
        <span style={{fontSize:10,fontWeight:600,padding:'2px 6px',borderRadius:4,background:'#fff',color:'#6b5b80',border:'1px solid #ece5f4',fontFamily:"'JetBrains Mono',monospace"}}>⌘K</span>
      </div>
      <div style={{flex:1}}/>
      {children}
    </div>
  );
}

function PageHeader({ title, eyebrow, count, primary }) {
  return (
    <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',marginBottom:24}}>
      <div>
        <div style={{fontSize:11,fontWeight:600,color:'#7e22ce',letterSpacing:'.08em',textTransform:'uppercase',marginBottom:6}}>{eyebrow}</div>
        <div style={{display:'flex',alignItems:'baseline',gap:14}}>
          <h1 style={{fontFamily:"'Instrument Serif',serif",fontSize:38,fontWeight:400,margin:0,letterSpacing:'-.02em',lineHeight:1}}>{title}</h1>
          {count && <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:13,color:'#a89bbd'}}>{count}</span>}
        </div>
      </div>
      {primary}
    </div>
  );
}

const StatusPill = ({ status }) => {
  const active = status === 'ACTIVE';
  return (
    <span style={{
      display:'inline-flex',alignItems:'center',gap:6,padding:'2px 8px',borderRadius:999,
      fontSize:11,fontWeight:600,
      background: active?'#dcfce7':'#fee2e2',
      color: active?'#166534':'#991b1b',
    }}>
      <span style={{width:5,height:5,borderRadius:'50%',background:'currentColor'}}/>
      {active?'Activo':'Inactivo'}
    </span>
  );
};

const Avatar = ({ initials, size = 36, status }) => (
  <div style={{position:'relative',flexShrink:0}}>
    <div style={{
      width:size,height:size,borderRadius:'50%',
      background:'linear-gradient(135deg,#9333ea,#581c87)',
      color:'#fff',display:'grid',placeItems:'center',
      fontSize:size*0.36,fontWeight:600,letterSpacing:'.02em',
    }}>{initials}</div>
    {status && (
      <span style={{
        position:'absolute',bottom:0,right:0,
        width:Math.max(8,size*0.28),height:Math.max(8,size*0.28),borderRadius:'50%',
        background: status==='ACTIVE'?'#22c55e':'#a3a3a3',
        border:'2px solid #fff',
      }}/>
    )}
  </div>
);

const RolePill = ({ code, size = 'sm' }) => {
  const c = roleColor(code);
  const s = size === 'lg';
  return (
    <span style={{
      display:'inline-flex',alignItems:'center',gap:6,
      padding: s?'4px 10px':'2px 8px',borderRadius:999,
      fontSize: s?12:11,fontWeight:600,
      background:c.bg,color:c.fg,
    }}>{roleName(code)}</span>
  );
};

Object.assign(window, { empData, roleColor, roleName, Sidebar, TopBar, PageHeader, StatusPill, Avatar, RolePill });
