interface Props {
  networkError?: boolean
}

export function TenantNotFound({ networkError = false }: Props) {
  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.icon}>{networkError ? '⚠️' : '🔍'}</div>
        <h1 style={s.title}>
          {networkError ? 'Error de conexión' : 'Sitio no encontrado'}
        </h1>
        <p style={s.desc}>
          {networkError
            ? 'No se pudo conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.'
            : 'El dominio que has introducido no está asociado a ningún sitio activo en nuestra plataforma.'}
        </p>
        {networkError && (
          <button style={s.btn} onClick={() => window.location.reload()}>
            Reintentar
          </button>
        )}
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
    maxWidth:      '420px',
    width:         '100%',
    textAlign:     'center',
    padding:       '48px 32px',
    background:    '#fff',
    borderRadius:  '16px',
    border:        '1px solid #e7e5e4',
    boxShadow:     '0 1px 4px rgba(0,0,0,0.06)',
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
  btn: {
    padding:       '10px 24px',
    background:    '#1c1917',
    color:         '#fff',
    border:        'none',
    borderRadius:  '8px',
    fontSize:      '14px',
    cursor:        'pointer',
    fontWeight:    500,
  },
}
