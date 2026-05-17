import { Link, useLocation, useNavigate } from 'react-router-dom'

const menu = [
  ['Dashboard', '/dashboard'],
  ['Pacientes', '/pacientes'],
  ['Agenda', '/agenda'],
  ['Prontuário', '/prontuario'],
  ['Financeiro', '/financeiro'],
  ['App Família', '/familia'],
  ['Profissionais', '/profissionais'],
  ['Configurações', '/configuracoes']
]

export default function Layout({ title, subtitle, children }) {
  const location = useLocation()
  const navigate = useNavigate()

  function sair() {
    localStorage.removeItem('em_session')
    navigate('/')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Arial' }}>
      <aside style={{ width: 260, background: '#0f766e', color: 'white', padding: 20 }}>
        <h2>Espaço Montessoriano</h2>

        <nav style={{ display: 'grid', gap: 10, marginTop: 30 }}>
          {menu.map(([label, href]) => (
            <Link
              key={href}
              to={href}
              style={{
                color: 'white',
                padding: 10,
                borderRadius: 8,
                textDecoration: 'none',
                background:
                  location.pathname === href
                    ? 'rgba(255,255,255,0.2)'
                    : 'transparent'
              }}
            >
              {label}
            </Link>
          ))}
        </nav>

        <button
          onClick={sair}
          style={{
            marginTop: 30,
            padding: 10,
            width: '100%'
          }}
        >
          Sair
        </button>
      </aside>

      <main style={{ flex: 1, background: '#f5f5f5' }}>
        <header
          style={{
            background: 'white',
            padding: 25,
            borderBottom: '1px solid #ddd'
          }}
        >
          <h1 style={{ margin: 0 }}>{title}</h1>
          <p>{subtitle}</p>
        </header>

        <section style={{ padding: 30 }}>
          {children}
        </section>
      </main>
    </div>
  )
}
