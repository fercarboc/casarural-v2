export function TenantInactive() {
  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.icon}>🔒</div>
        <h1 style={s.title}>Sitio temporalmente desactivado</h1>
        <p style={s.desc}>
          Este sitio está pausado en este momento. Si eres el propietario,
          accede al panel de administración para reactivarlo.
        </p>
        <a href="/admin/login" style={s.link}>
          Acceder al panel de administración
        </a>
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  page: {
    display:         'flex',
    alignItems:      'center',
    justifyContent:  'center',
    minHeight:       '100vh',
    backgroundColor: '#fafaf9',
    padding:         '24px',
    fontFamily:      'system-ui, sans-serif',
  },
  card: {
    maxWidth:     '420px',
    width:        '100%',
    textAlign:    'center',
    padding:      '48px 32px',
    background:   '#fff',
    borderRadius: '16px',
    border:       '1px solid #e7e5e4',
    boxShadow:    '0 1px 4px rgba(0,0,0,0.06)',
  },
  icon: {
    fontSize:     '40px',
    marginBottom: '16px',
  },
  title: {
    margin:     '0 0 12px',
    fontSize:   '20px',
    fontWeight: 600,
    color:      '#1c1917',
  },
  desc: {
    margin:     '0 0 24px',
    fontSize:   '15px',
    color:      '#78716c',
    lineHeight: 1.6,
  },
  link: {
    display:      'inline-block',
    padding:      '10px 24px',
    background:   '#1c1917',
    color:        '#fff',
    borderRadius: '8px',
    fontSize:     '14px',
    fontWeight:   500,
    textDecoration: 'none',
  },
}
