// Variación 2 — MASTER-DETAIL SPLIT
// Lista compacta a la izquierda, detalle persistente a la derecha.
// Ideal para revisar varios empleados rápidamente.

function EmpMasterDetail() {
  const [employees, setEmployees] = React.useState(empData.employees);
  const [selectedCode, setSelectedCode] = React.useState(employees[0].code);
  const [editingRole, setEditingRole] = React.useState(false);
  const [filter, setFilter] = React.useState('');
  const selected = employees.find(e => e.code === selectedCode);

  const filtered = employees.filter(e =>
    !filter || e.name.toLowerCase().includes(filter.toLowerCase()) || e.code.toLowerCase().includes(filter.toLowerCase())
  );

  const handleChangeRole = (role) => {
    setEmployees(prev => prev.map(e => e.code === selectedCode ? {...e, role} : e));
    setEditingRole(false);
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
        <div style={{padding:'24px 32px 12px'}}>
          <PageHeader eyebrow="Panel administrativo" title="Empleados" count={`${employees.length} registros`}/>
        </div>
        <div style={{flex:1,minHeight:0,padding:'0 32px 28px',display:'grid',gridTemplateColumns:'380px 1fr',gap:16,overflow:'hidden'}}>
          {/* Master list */}
          <div style={{background:'#fff',border:'1px solid #ece5f4',borderRadius:12,display:'flex',flexDirection:'column',overflow:'hidden'}}>
            <div style={{padding:'12px',borderBottom:'1px solid #ece5f4'}}>
              <div style={{display:'flex',alignItems:'center',gap:8,padding:'7px 10px',borderRadius:7,background:'#f5f1fa'}}>
                <IconSearch size={13} stroke={1.8}/>
                <input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Buscar empleado…" style={{flex:1,border:'none',background:'transparent',outline:'none',fontSize:12,fontFamily:'inherit'}}/>
              </div>
            </div>
            <div style={{flex:1,overflow:'auto'}}>
              {filtered.map(e => {
                const sel = e.code === selectedCode;
                return (
                  <div key={e.code} onClick={() => { setSelectedCode(e.code); setEditingRole(false); }} style={{
                    display:'flex',alignItems:'center',gap:12,padding:'12px 16px',
                    cursor:'pointer',position:'relative',
                    background: sel?'#faf5ff':'#fff',
                    borderBottom:'1px solid #f3eef9',
                    transition:'background .12s',
                  }}
                  onMouseEnter={(ev)=>{if(!sel)ev.currentTarget.style.background='#fbfaff';}}
                  onMouseLeave={(ev)=>{if(!sel)ev.currentTarget.style.background='#fff';}}>
                    {sel && <div style={{position:'absolute',left:0,top:8,bottom:8,width:3,background:'#7e22ce',borderRadius:'0 2px 2px 0'}}/>}
                    <Avatar initials={e.initials} size={36} status={e.status}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <span style={{fontSize:13,fontWeight:600,color:'#1a1325',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{e.name}</span>
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:8,marginTop:3}}>
                        <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:'#a89bbd'}}>{e.code}</span>
                        <span style={{width:3,height:3,borderRadius:'50%',background:'#d8b4fe'}}/>
                        <span style={{fontSize:11,color:'#6b5b80'}}>{roleName(e.role)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detail */}
          <div style={{background:'#fff',border:'1px solid #ece5f4',borderRadius:12,padding:'28px 32px',overflow:'auto'}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:16}}>
              <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:'#7e22ce',letterSpacing:'.06em'}}>{selected.code}</span>
              <div style={{flex:1}}/>
              <button style={{padding:'6px 10px',borderRadius:7,border:'1px solid #ece5f4',background:'#fff',fontSize:12,color:'#3d2e57',cursor:'pointer'}}>Editar datos</button>
              <button style={{padding:'6px 10px',borderRadius:7,border:'1px solid #fecaca',background:'#fff',fontSize:12,color:'#991b1b',cursor:'pointer'}}>Desactivar</button>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:18,marginBottom:24}}>
              <Avatar initials={selected.initials} size={72} status={selected.status}/>
              <div style={{flex:1}}>
                <div style={{fontFamily:"'Instrument Serif',serif",fontSize:30,fontWeight:400,letterSpacing:'-.02em',lineHeight:1.1}}>{selected.name}</div>
                <div style={{fontSize:13,color:'#6b5b80',marginTop:6}}>{selected.email}</div>
                <div style={{display:'flex',gap:8,marginTop:10}}>
                  <StatusPill status={selected.status}/>
                  <RolePill code={selected.role}/>
                </div>
              </div>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:24,paddingBottom:24,borderBottom:'1px solid #ece5f4'}}>
              {[
                ['Código', selected.code, true],
                ['Empresa', 'PawCare Veterinaria'],
                ['Correo', selected.email],
                ['Estado', selected.status === 'ACTIVE' ? 'Activo' : 'Inactivo'],
                ['Ingreso', selected.joined, true],
                ['Última actividad', selected.lastActive],
              ].map(([k,v,mono]) => (
                <div key={k}>
                  <div style={{fontSize:10,fontWeight:600,color:'#a89bbd',letterSpacing:'.08em',textTransform:'uppercase',marginBottom:4}}>{k}</div>
                  <div style={{fontSize:14,color:'#1a1325',fontFamily:mono?"'JetBrains Mono',monospace":'inherit'}}>{v}</div>
                </div>
              ))}
            </div>

            <div>
              <div style={{display:'flex',alignItems:'center',marginBottom:14}}>
                <span style={{fontSize:12,fontWeight:600,color:'#1a1325'}}>Rol asignado</span>
                <div style={{flex:1}}/>
                {!editingRole && (
                  <button onClick={() => setEditingRole(true)} style={{fontSize:12,color:'#7e22ce',fontWeight:600,background:'transparent',border:'none',cursor:'pointer',padding:0}}>Cambiar rol →</button>
                )}
                {editingRole && (
                  <button onClick={() => setEditingRole(false)} style={{fontSize:12,color:'#6b5b80',background:'transparent',border:'none',cursor:'pointer',padding:0}}>Cancelar</button>
                )}
              </div>
              {!editingRole ? (
                <div style={{padding:'16px 18px',borderRadius:10,background:'linear-gradient(135deg,#faf5ff,#f3e8ff)',border:'1px solid #e9d5ff'}}>
                  <RolePill code={selected.role} size="lg"/>
                  <div style={{fontSize:12,color:'#6b5b80',marginTop:10,lineHeight:1.5}}>{empData.roles.find(r=>r.code===selected.role)?.desc}</div>
                </div>
              ) : (
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                  {empData.roles.map(r => {
                    const sel = r.code === selected.role;
                    return (
                      <button key={r.code} onClick={() => handleChangeRole(r.code)} style={{
                        textAlign:'left',padding:'12px 14px',borderRadius:9,
                        background: sel?'#faf5ff':'#fff',
                        border:`1px solid ${sel?'#a855f7':'#ece5f4'}`,
                        cursor:'pointer',fontFamily:'inherit',
                        display:'flex',alignItems:'center',gap:10,
                      }}>
                        <span style={{width:16,height:16,borderRadius:'50%',border:`1.5px solid ${sel?'#7e22ce':'#d8b4fe'}`,display:'grid',placeItems:'center',flexShrink:0}}>
                          {sel && <span style={{width:7,height:7,borderRadius:'50%',background:'#7e22ce'}}/>}
                        </span>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:12,fontWeight:600,color:'#1a1325'}}>{r.name}</div>
                          <div style={{fontSize:10,color:'#6b5b80',marginTop:2,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{r.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

window.EmpMasterDetail = EmpMasterDetail;
