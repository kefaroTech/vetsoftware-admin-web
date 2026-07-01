// ============ CONFIGURACIÓN VIEW — editor de UVT ============
// Permite ver y modificar el valor de la UVT (Unidad de Valor Tributario)
// del año en curso, requerido para los cálculos de facturación electrónica.

function UvtEditor() {
  const { uvt, saveUvt, formatCOP, formatDate, currentYear } = useApp();
  const cur = uvt.byYear[currentYear];
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(String(cur.value));
  const [err, setErr] = React.useState('');

  React.useEffect(() => { setDraft(String(cur.value)); }, [cur.value]);

  const startEdit = () => { setDraft(String(cur.value)); setErr(''); setEditing(true); };
  const onSave = () => {
    const n = Number(String(draft).replace(/[^\d]/g, ''));
    if (!n || n < 1000) { setErr('Ingresa un valor válido en pesos (COP).'); return; }
    saveUvt(currentYear, n);
    setEditing(false);
  };

  // años históricos (excluye el actual) ordenados desc
  const history = Object.keys(uvt.byYear).map(Number).filter(y => y !== currentYear).sort((a, b) => b - a);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 20, alignItems: 'start' }}>
      {/* Card principal — UVT año en curso */}
      <div style={{ background: '#fff', border: '1px solid #ece5f4', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #ece5f4', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: '#f3e8ff', color: '#7e22ce', display: 'grid', placeItems: 'center' }}>
            <IconReceipt size={18} stroke={1.6} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1325' }}>Valor UVT — {currentYear}</div>
            <div style={{ fontSize: 12, color: '#6b5b80', marginTop: 2 }}>Unidad de Valor Tributario vigente para facturación electrónica</div>
          </div>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: '#dcfce7', color: '#166534' }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }} />Vigente
          </span>
        </div>

        <div style={{ padding: '28px 24px' }}>
          {!editing ? (
            <>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, marginBottom: 8 }}>
                <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: 56, fontWeight: 400, color: '#1a1325', lineHeight: 1, letterSpacing: '-.02em' }}>{formatCOP(cur.value)}</div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: '#a89bbd', paddingBottom: 8 }}>COP / UVT</div>
              </div>
              <div style={{ display: 'flex', gap: 24, marginTop: 20, paddingTop: 20, borderTop: '1px solid #f3eef9' }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#a89bbd', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 5 }}>Vigencia desde</div>
                  <div style={{ fontSize: 13, color: '#1a1325' }}>{formatDate(cur.vigencia)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#a89bbd', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 5 }}>Última actualización</div>
                  <div style={{ fontSize: 13, color: '#1a1325' }}>{cur.updatedAt ? formatDate(cur.updatedAt) : 'Sin modificar'}</div>
                </div>
                <div style={{ flex: 1 }} />
                <button onClick={startEdit} style={{ alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 9, border: 'none', background: 'linear-gradient(180deg,#9333ea,#7e22ce)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px -2px rgba(126,34,206,.4), inset 0 1px 0 rgba(255,255,255,.15)' }}>
                  <IconEdit size={14} stroke={1.9} />Modificar valor
                </button>
              </div>
            </>
          ) : (
            <>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#3d2e57', display: 'block', marginBottom: 8 }}>Nuevo valor de la UVT {currentYear} (COP)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: '#fff', border: `1px solid ${err ? '#dc2626' : '#a855f7'}`, borderRadius: 9, boxShadow: err ? 'none' : '0 0 0 4px rgba(168,85,247,.12)' }}>
                <span style={{ fontFamily: "'Instrument Serif',serif", fontSize: 28, color: '#7e22ce' }}>$</span>
                <input
                  autoFocus
                  value={Number(String(draft).replace(/[^\d]/g, '') || 0).toLocaleString('es-CO')}
                  onChange={e => { setDraft(e.target.value); setErr(''); }}
                  onKeyDown={e => { if (e.key === 'Enter') onSave(); if (e.key === 'Escape') setEditing(false); }}
                  inputMode="numeric"
                  style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontFamily: "'Instrument Serif',serif", fontSize: 40, color: '#1a1325', minWidth: 0, lineHeight: 1 }}
                />
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: '#a89bbd' }}>COP</span>
              </div>
              {err && <div style={{ fontSize: 12, color: '#dc2626', marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}><IconInfo size={13} stroke={1.8} />{err}</div>}
              <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
                <button onClick={onSave} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 9, border: 'none', background: '#1a1325', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  <IconCheck size={14} stroke={2.4} />Guardar cambios
                </button>
                <button onClick={() => setEditing(false)} style={{ padding: '10px 18px', borderRadius: 9, border: '1px solid #ece5f4', background: '#fff', color: '#3d2e57', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Cancelar</button>
                <div style={{ flex: 1 }} />
                <div style={{ fontSize: 11, color: '#a89bbd', alignSelf: 'center' }}>Enter para guardar · Esc para cancelar</div>
              </div>
            </>
          )}
        </div>

        {/* Histórico */}
        <div style={{ padding: '18px 24px', borderTop: '1px solid #ece5f4', background: '#fbfaff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <IconHistory size={14} stroke={1.7} style={{ color: '#7e22ce' }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: '#3d2e57', letterSpacing: '.06em', textTransform: 'uppercase' }}>Histórico de vigencias</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {history.map(y => {
              const r = uvt.byYear[y];
              return (
                <div key={y} style={{ display: 'grid', gridTemplateColumns: '70px 1fr auto', alignItems: 'center', gap: 12, padding: '8px 0' }}>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 500, color: '#1a1325' }}>{y}</span>
                  <span style={{ fontSize: 12, color: '#6b5b80' }}>Vigencia desde {formatDate(r.vigencia)}</span>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: '#3d2e57' }}>{formatCOP(r.value)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Lateral — explicación */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ background: 'linear-gradient(135deg,#581c87,#3b0764)', borderRadius: 14, padding: '22px 24px', color: '#fff', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle,rgba(216,180,254,.25),transparent 70%)' }} />
          <div style={{ position: 'relative' }}>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#d8b4fe', letterSpacing: '.08em', marginBottom: 10 }}>// ¿QUÉ ES LA UVT?</div>
            <p style={{ fontSize: 13, color: '#e9d5ff', lineHeight: 1.55, margin: 0 }}>
              La <strong style={{ color: '#fff' }}>Unidad de Valor Tributario</strong> es la medida que la DIAN actualiza cada año para estandarizar valores tributarios. VetSoftware la usa para calcular topes y referencias en la <strong style={{ color: '#fff' }}>facturación electrónica</strong>.
            </p>
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #ece5f4', borderRadius: 12, padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f3e8ff', color: '#7e22ce', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              <IconInfo size={16} stroke={1.7} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1325', marginBottom: 4 }}>Importante</div>
              <p style={{ fontSize: 12, color: '#6b5b80', lineHeight: 1.5, margin: 0 }}>
                Actualiza este valor cada inicio de año con la cifra oficial publicada por la DIAN. Un valor incorrecto afecta directamente los cálculos de facturación.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConfigView() {
  const tabs = [
    { k: 'facturacion', label: 'Facturación electrónica', icon: 'IconReceipt' },
    { k: 'general', label: 'General', icon: 'IconSettings' },
    { k: 'seguridad', label: 'Seguridad', icon: 'IconShieldCheck' },
  ];
  const [tab, setTab] = React.useState('facturacion');
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <AppTopBar placeholder="Buscar ajustes…" />
      <div style={{ padding: '28px 32px', flex: 1, overflow: 'auto' }}>
        <PageHeader eyebrow="Sistema" title="Configuración" />
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #ece5f4', marginBottom: 24 }}>
          {tabs.map(t => {
            const Ico = window[t.icon];
            const active = t.k === tab;
            return (
              <button key={t.k} onClick={() => setTab(t.k)} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
                background: 'transparent', border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: active ? 600 : 500, fontFamily: 'inherit',
                color: active ? '#7e22ce' : '#6b5b80', position: 'relative',
              }}>
                <Ico size={15} stroke={1.7} />{t.label}
                {active && <div style={{ position: 'absolute', left: 0, right: 0, bottom: -1, height: 2, background: '#7e22ce', borderRadius: 2 }} />}
              </button>
            );
          })}
        </div>
        {tab === 'facturacion' && <UvtEditor />}
        {tab === 'general' && <div style={{ padding: 40, textAlign: 'center', color: '#a89bbd', fontSize: 13 }}>Ajustes generales — en construcción.</div>}
        {tab === 'seguridad' && <div style={{ padding: 40, textAlign: 'center', color: '#a89bbd', fontSize: 13 }}>Ajustes de seguridad — en construcción.</div>}
      </div>
    </div>
  );
}

window.ConfigView = ConfigView;
