// Variación 3 — TABLA DENSA + MODAL DE ROL
// Layout estilo data-grid con cards expandibles. Click en empleado
// expande inline una sección con datos básicos + cambio de rol.

function EmpTableModal() {
  const [employees, setEmployees] = React.useState(empData.employees);
  const [expanded, setExpanded] = React.useState(empData.employees[0].code);

  const toggleExpand = (code) => setExpanded(prev => prev === code ? null : code);
  const handleChangeRole = (code, role) => {
    setEmployees(prev => prev.map(e => e.code === code ? {...e, role} : e));
  };

  return (
    <div style={{width:'100%',height:'100%',overflow:'hidden',background:'#fbfaff',display:'grid',gridTemplateColumns:'244px 1fr',fontFamily:"'Inter',sans-serif",color:'#1a1325'}}>
      <Sidebar active="empleados"/>
      <main style={{display:'flex',flexDirection:'column',overflow:'hidden'}}>
        <TopBar>
          <button style={{display:'flex',alignItems:'center',gap:8,padding:'8px 14px',borderRadius:8,border:'none',background:'#1a1325',fontSize:13,fontWeight:600,color:'#fff',cursor:'pointer'}}>
            <IconPlus size={14} stroke={2.2}/>Invitar empleado
          </button>
        </TopBar>
        <div style={{padding:'28px 32px',flex:1,overflow:'auto'}}>
          <PageHeader eyebrow="Panel administrativo" title="Empleados" count={`${employees.length} registros`}/>

          {/* Stats strip */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:20}}>
            {[
              {l:'Activos',v:employees.filter(e=>e.status==='ACTIVE').length,c:'#7e22ce'},
              {l:'Inactivos',v:employees.filter(e=>e.status==='INACTIVE').length,c:'#a89bbd'},
              {l:'Veterinarios',v:employees.filter(e=>e.role==='VET').length,c:'#7e22ce'},
              {l:'Admins',v:employees.filter(e=>e.role==='ADMIN').length,c:'#1a1325'},
            ].map(s => (
              <div key={s.l} style={{padding:'14px 16px',background:'#fff',border:'1px solid #ece5f4',borderRadius:10}}>
                <div style={{fontSize:11,color:'#6b5b80',marginBottom:6}}>{s.l}</div>
                <div style={{fontFamily:"'Instrument Serif',serif",fontSize:28,fontWeight:400,color:s.c,lineHeight:1}}>{s.v}</div>
              </div>
            ))}
          </div>

          <div style={{background:'#fff',border:'1px solid #ece5f4',borderRadius:12,overflow:'hidden'}}>
            <div style={{padding:'12px 18px',background:'#faf5ff',borderBottom:'1px solid #ece5f4',display:'flex',alignItems:'center'}}>
              <span style={{fontSize:11,fontWeight:600,color:'#3d2e57',letterSpacing:'.06em',textTransform:'uppercase'}}>Listado</span>
              <div style={{flex:1}}/>
              <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:'#6b5b80'}}>Click para expandir</span>
            </div>
            {employees.map(e => {
              const isExp = expanded === e.code;
              return (
                <div key={e.code} style={{borderBottom:'1px solid #f3eef9'}}>
                  <div onClick={() => toggleExpand(e.code)} style={{
                    display:'grid',gridTemplateColumns:'1fr 200px 160px 120px 36px',
                    padding:'14px 18px',alignItems:'center',cursor:'pointer',
                    background:isExp?'#faf5ff':'#fff',transition:'background .12s',
                  }}>
                    <div style={{display:'flex',alignItems:'center',gap:12,minWidth:0}}>
                      <Avatar initials={e.initials} size={34} status={e.status}/>
                      <div style={{minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:600,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{e.name}</div>
                        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:'#a89bbd',marginTop:2}}>{e.code}</div>
                      </div>
                    </div>
                    <span style={{fontSize:12,color:'#6b5b80',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{e.email}</span>
                    <span><RolePill code={e.role}/></span>
                    <span><StatusPill status={e.status}/></span>
                    <span style={{color:'#a89bbd',transform:isExp?'rotate(90deg)':'rotate(0)',transition:'transform .15s',display:'grid',placeItems:'center'}}><IconChevron size={14}/></span>
                  </div>
                  {isExp && (
                    <div style={{padding:'20px 24px 24px 64px',background:'#faf5ff',borderTop:'1px solid #ece5f4'}}>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:24}}>
                        <div>
                          <div style={{fontSize:11,fontWeight:600,color:'#3d2e57',letterSpacing:'.06em',textTransform:'uppercase',marginBottom:14}}>Datos básicos</div>
                          <div style={{display:'flex',flexDirection:'column',gap:10}}>
                            {[
                              ['Empresa','PawCare Veterinaria'],
                              ['Correo',e.email],
                              ['Ingreso',e.joined,true],
                              ['Última actividad',e.lastActive],
                            ].map(([k,v,mono]) => (
                              <div key={k} style={{display:'grid',gridTemplateColumns:'130px 1fr',gap:12}}>
                                <span style={{fontSize:12,color:'#6b5b80'}}>{k}</span>
                                <span style={{fontSize:12,color:'#1a1325',fontFamily:mono?"'JetBrains Mono',monospace":'inherit'}}>{v}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div style={{fontSize:11,fontWeight:600,color:'#3d2e57',letterSpacing:'.06em',textTransform:'uppercase',marginBottom:14}}>Cambiar rol</div>
                          <div style={{display:'flex',flexDirection:'column',gap:6}}>
                            {empData.roles.map(r => {
                              const sel = r.code === e.role;
                              return (
                                <button key={r.code} onClick={(ev) => { ev.stopPropagation(); handleChangeRole(e.code, r.code); }} style={{
                                  textAlign:'left',padding:'8px 12px',borderRadius:7,
                                  background:sel?'#fff':'transparent',
                                  border:`1px solid ${sel?'#a855f7':'transparent'}`,
                                  cursor:'pointer',fontFamily:'inherit',
                                  display:'flex',alignItems:'center',gap:10,
                                }}>
                                  <span style={{width:14,height:14,borderRadius:'50%',border:`1.5px solid ${sel?'#7e22ce':'#d8b4fe'}`,display:'grid',placeItems:'center',flexShrink:0}}>
                                    {sel && <span style={{width:6,height:6,borderRadius:'50%',background:'#7e22ce'}}/>}
                                  </span>
                                  <span style={{fontSize:12,fontWeight:sel?600:500,color:sel?'#1a1325':'#3d2e57',flex:1}}>{r.name}</span>
                                  {sel && <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:'#7e22ce',letterSpacing:'.06em'}}>ACTUAL</span>}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}

window.EmpTableModal = EmpTableModal;
