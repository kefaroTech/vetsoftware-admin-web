// Variación 1 — LISTA + DRAWER LATERAL
// Tabla a ancho completo. Click en empleado abre un drawer deslizante
// desde la derecha con sus datos básicos y editor de rol.

function EmpDrawer({ employee, onClose, onChangeRole }) {
  const [editing, setEditing] = React.useState(false);
  if (!employee) return null;
  return (
    <>
      <div onClick={onClose} style={{
        position:'absolute',inset:0,background:'rgba(26,19,37,.32)',
        backdropFilter:'blur(2px)',animation:'fadeIn .15s ease',zIndex:5,
      }}/>
      <aside style={{
        position:'absolute',top:0,right:0,bottom:0,width:440,zIndex:6,
        background:'#fff',borderLeft:'1px solid #ece5f4',
        boxShadow:'-24px 0 48px -16px rgba(91,33,182,.18)',
        display:'flex',flexDirection:'column',
        animation:'slideIn .22s cubic-bezier(.2,.8,.2,1)',
      }}>
        <style>{`@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}@keyframes fadeIn{from{opacity:0}to{opacity:1}}`}</style>
        {/* Header */}
        <div style={{padding:'20px 24px',borderBottom:'1px solid #ece5f4',display:'flex',alignItems:'center',gap:12}}>
          <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:'#7e22ce',letterSpacing:'.06em'}}>{employee.code}</span>
          <div style={{flex:1}}/>
          <button onClick={onClose} style={{width:30,height:30,borderRadius:7,border:'1px solid #ece5f4',background:'#fff',cursor:'pointer',display:'grid',placeItems:'center',color:'#6b5b80'}}>✕</button>
        </div>

        {/* Hero */}
        <div style={{padding:'24px',borderBottom:'1px solid #ece5f4'}}>
          <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:16}}>
            <Avatar initials={employee.initials} size={64} status={employee.status}/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontFamily:"'Instrument Serif',serif",fontSize:24,fontWeight:400,letterSpacing:'-.01em',lineHeight:1.1}}>{employee.name}</div>
              <div style={{fontSize:13,color:'#6b5b80',marginTop:4,overflow:'hidden',textOverflow:'ellipsis'}}>{employee.email}</div>
            </div>
          </div>
          <div style={{display:'flex',gap:8}}>
            <StatusPill status={employee.status}/>
            <RolePill code={employee.role}/>
          </div>
        </div>

        {/* Datos */}
        <div style={{padding:'20px 24px',borderBottom:'1px solid #ece5f4'}}>
          <div style={{fontSize:11,fontWeight:600,color:'#3d2e57',letterSpacing:'.06em',textTransform:'uppercase',marginBottom:14}}>Datos básicos</div>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {[
              ['Código', employee.code, 'mono'],
              ['Correo', employee.email],
              ['Estado', employee.status === 'ACTIVE' ? 'Activo' : 'Inactivo'],
              ['Empresa', 'PawCare Veterinaria'],
              ['Ingreso', employee.joined, 'mono'],
              ['Última actividad', employee.lastActive],
            ].map(([k,v,mono]) => (
              <div key={k} style={{display:'grid',gridTemplateColumns:'130px 1fr',gap:12}}>
                <span style={{fontSize:12,color:'#6b5b80'}}>{k}</span>
                <span style={{fontSize:13,color:'#1a1325',fontFamily:mono?"'JetBrains Mono',monospace":'inherit'}}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Rol */}
        <div style={{padding:'20px 24px',flex:1,overflow:'auto'}}>
          <div style={{display:'flex',alignItems:'center',marginBottom:14}}>
            <span style={{fontSize:11,fontWeight:600,color:'#3d2e57',letterSpacing:'.06em',textTransform:'uppercase'}}>Rol asignado</span>
            <div style={{flex:1}}/>
            {!editing && (
              <button onClick={() => setEditing(true)} style={{fontSize:12,color:'#7e22ce',fontWeight:600,background:'transparent',border:'none',cursor:'pointer',padding:0}}>Cambiar →</button>
            )}
          </div>
          {!editing ? (
            <div style={{padding:14,borderRadius:9,background:'#faf5ff',border:'1px solid #e9d5ff'}}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6}}>
                <RolePill code={employee.role} size="lg"/>
              </div>
              <div style={{fontSize:12,color:'#6b5b80',lineHeight:1.5}}>
                {empData.roles.find(r=>r.code===employee.role)?.desc}
              </div>
            </div>
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {empData.roles.map(r => {
                const sel = r.code === employee.role;
                return (
                  <button key={r.code} onClick={() => { onChangeRole(employee.code, r.code); setEditing(false); }} style={{
                    textAlign:'left',padding:'12px 14px',borderRadius:9,
                    background: sel?'#faf5ff':'#fff',
                    border:`1px solid ${sel?'#a855f7':'#ece5f4'}`,
                    cursor:'pointer',display:'flex',alignItems:'center',gap:12,
                    fontFamily:'inherit',
                  }}>
                    <span style={{
                      width:18,height:18,borderRadius:'50%',
                      border:`1.5px solid ${sel?'#7e22ce':'#d8b4fe'}`,
                      display:'grid',placeItems:'center',flexShrink:0,
                    }}>
                      {sel && <span style={{width:8,height:8,borderRadius:'50%',background:'#7e22ce'}}/>}
                    </span>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:600,color:'#1a1325',marginBottom:2}}>{r.name}</div>
                      <div style={{fontSize:11,color:'#6b5b80'}}>{r.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

function EmpListDrawer() {
  const [employees, setEmployees] = React.useState(empData.employees);
  const [selected, setSelected] = React.useState(null);
  const handleChangeRole = (code, role) => {
    setEmployees(prev => prev.map(e => e.code === code ? {...e, role} : e));
    setSelected(prev => prev ? {...prev, role} : prev);
  };
  return (
    <div style={{width:'100%',height:'100%',overflow:'hidden',background:'#fbfaff',display:'grid',gridTemplateColumns:'244px 1fr',fontFamily:"'Inter',sans-serif",color:'#1a1325',position:'relative'}}>
      <Sidebar active="empleados"/>
      <main style={{display:'flex',flexDirection:'column',overflow:'hidden'}}>
        <TopBar>
          <button style={{display:'flex',alignItems:'center',gap:8,padding:'8px 14px',borderRadius:8,border:'none',background:'#1a1325',fontSize:13,fontWeight:600,color:'#fff',cursor:'pointer'}}>
            <IconPlus size={14} stroke={2.2}/>Invitar empleado
          </button>
        </TopBar>
        <div style={{padding:'28px 32px',flex:1,overflow:'auto'}}>
          <PageHeader eyebrow="Panel administrativo" title="Empleados" count={`${employees.length} registros`} primary={
            <div style={{display:'flex',gap:8}}>
              <button style={{padding:'8px 12px',borderRadius:8,border:'1px solid #ece5f4',background:'#fff',fontSize:12,fontWeight:500,color:'#3d2e57',cursor:'pointer'}}>Filtrar</button>
              <button style={{padding:'8px 12px',borderRadius:8,border:'1px solid #ece5f4',background:'#fff',fontSize:12,fontWeight:500,color:'#3d2e57',cursor:'pointer'}}>Exportar</button>
            </div>
          }/>
          <div style={{background:'#fff',border:'1px solid #ece5f4',borderRadius:12,overflow:'hidden'}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 200px 160px 130px 36px',padding:'10px 18px',background:'#faf5ff',borderBottom:'1px solid #ece5f4',fontSize:10,fontWeight:600,color:'#6b5b80',letterSpacing:'.08em',textTransform:'uppercase'}}>
              <span>Empleado</span><span>Correo</span><span>Rol</span><span>Estado</span><span/>
            </div>
            {employees.map(e => {
              const sel = selected?.code === e.code;
              return (
                <div key={e.code} onClick={() => setSelected(e)} style={{
                  display:'grid',gridTemplateColumns:'1fr 200px 160px 130px 36px',
                  padding:'12px 18px',borderBottom:'1px solid #f3eef9',
                  alignItems:'center',cursor:'pointer',
                  background: sel?'#faf5ff':'#fff',
                  transition:'background .12s',
                }}
                onMouseEnter={(ev)=>{if(!sel)ev.currentTarget.style.background='#fbfaff';}}
                onMouseLeave={(ev)=>{if(!sel)ev.currentTarget.style.background='#fff';}}>
                  <div style={{display:'flex',alignItems:'center',gap:12,minWidth:0}}>
                    <Avatar initials={e.initials} size={32} status={e.status}/>
                    <div style={{minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:600,color:'#1a1325',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{e.name}</div>
                      <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:'#a89bbd',marginTop:2}}>{e.code}</div>
                    </div>
                  </div>
                  <span style={{fontSize:12,color:'#6b5b80',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{e.email}</span>
                  <span><RolePill code={e.role}/></span>
                  <span><StatusPill status={e.status}/></span>
                  <span style={{color:'#a89bbd'}}><IconChevron size={14}/></span>
                </div>
              );
            })}
          </div>
        </div>
      </main>
      <EmpDrawer employee={selected} onClose={() => setSelected(null)} onChangeRole={handleChangeRole}/>
    </div>
  );
}

window.EmpListDrawer = EmpListDrawer;
