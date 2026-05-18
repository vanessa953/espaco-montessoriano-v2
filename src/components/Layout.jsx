import { useState } from 'react'

export default function Layout({ children }) {
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')
  const tipo = localStorage.getItem('tipo_usuario')
  const nivel = usuario?.nivel_acesso || 'Colaborador'
  const [menuAberto, setMenuAberto] = useState(false)

  function sair() {
    localStorage.clear()
    window.location.href = '/'
  }

  function irPara(rota) {
    window.location.href = rota
  }

  const menuFamilia = [
    { nome: 'App Família', rota: '/familia' }
  ]

  const menusPorPerfil = {
    Administradora: [
      { nome: 'Dashboard', rota: '/dashboard' },
      { nome: 'Pacientes', rota: '/pacientes' },
      { nome: 'Agenda', rota: '/agenda' },
      { nome: 'Prontuário', rota: '/prontuario' },
      { nome: 'Financeiro', rota: '/financeiro' },
      { nome: 'Profissionais', rota: '/profissionais' },
      { nome: 'Configurações', rota: '/configuracoes' },
      { nome: 'Ver App Família', rota: '/familia' }
    ],
    Coordenação: [
      { nome: 'Dashboard', rota: '/dashboard' },
      { nome: 'Pacientes', rota: '/pacientes' },
      { nome: 'Agenda', rota: '/agenda' },
      { nome: 'Prontuário', rota: '/prontuario' },
      { nome: 'Profissionais', rota: '/profissionais' }
    ],
    'Auxiliar ADM': [
      { nome: 'Dashboard', rota: '/dashboard' },
      { nome: 'Pacientes', rota: '/pacientes' },
      { nome: 'Agenda', rota: '/agenda' }
    ],
    Recepção: [
      { nome: 'Dashboard', rota: '/dashboard' },
      { nome: 'Pacientes', rota: '/pacientes' },
      { nome: 'Agenda', rota: '/agenda' }
    ],
    Financeiro: [
      { nome: 'Dashboard', rota: '/dashboard' },
      { nome: 'Financeiro', rota: '/financeiro' }
    ],
    Supervisor: [
      { nome: 'Dashboard', rota: '/dashboard' },
      { nome: 'Pacientes', rota: '/pacientes' },
      { nome: 'Agenda', rota: '/agenda' },
      { nome: 'Prontuário', rota: '/prontuario' }
    ],
    Colaborador: [
      { nome: 'Dashboard', rota: '/dashboard' },
      { nome: 'Pacientes', rota: '/pacientes' },
      { nome: 'Agenda', rota: '/agenda' },
      { nome: 'Prontuário', rota: '/prontuario' }
    ],
    Estagiário: [
      { nome: 'Dashboard', rota: '/dashboard' },
      { nome: 'Pacientes', rota: '/pacientes' },
      { nome: 'Agenda', rota: '/agenda' }
    ]
  }

  const menus =
    tipo === 'familia'
      ? menuFamilia
      : menusPorPerfil[nivel] || menusPorPerfil.Colaborador

  return (
    <div style={pagina}>
      <header style={topbar}>
        <button onClick={() => setMenuAberto(!menuAberto)} style={botaoMobile}>
          ☰
        </button>

        <strong>Espaço Montessoriano</strong>

        <button onClick={sair} style={sairTopo}>
          Sair
        </button>
      </header>

      <aside style={menuAberto ? sidebarMobileAberta : sidebar}>
        <h2 style={logo}>Espaço Montessoriano</h2>

        <div style={perfil}>
          <strong>{usuario?.nome || 'Usuário'}</strong>
          <br />
          <small>{tipo === 'familia' ? 'Família' : nivel}</small>
        </div>

        <nav style={menu}>
          {menus.map((item) => (
            <button
              key={item.rota}
              onClick={() => irPara(item.rota)}
              style={botaoMenu}
            >
              {item.nome}
            </button>
          ))}
        </nav>

        <button onClick={sair} style={botaoSair}>
          Sair
        </button>
      </aside>

      {menuAberto && (
        <button
          onClick={() => setMenuAberto(false)}
          style={fundoEscuro}
        />
      )}

      <main style={conteudo}>
        {children}
      </main>
    </div>
  )
}

const pagina = {
  display: 'flex',
  minHeight: '100vh',
  background: '#f5f7fb',
  fontFamily: 'Arial'
}

const topbar = {
  display: 'none',
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  height: 58,
  background: '#0f766e',
  color: '#fff',
  zIndex: 50,
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 14px'
}

const botaoMobile = {
  background: 'rgba(255,255,255,0.15)',
  color: '#fff',
  border: 'none',
  borderRadius: 10,
  padding: 10,
  cursor: 'pointer',
  fontSize: 20
}

const sairTopo = {
  background: '#dc2626',
  color: '#fff',
  border: 'none',
  borderRadius: 10,
  padding: '8px 10px',
  cursor: 'pointer',
  fontWeight: 'bold'
}

const sidebar = {
  width: 260,
  background: '#0f766e',
  color: '#fff',
  padding: 24,
  display: 'flex',
  flexDirection: 'column',
  gap: 20,
  position: 'sticky',
  top: 0,
  height: '100vh',
  zIndex: 60
}

const sidebarMobileAberta = {
  ...sidebar,
  position: 'fixed',
  left: 0
}

const logo = {
  fontSize: 24,
  margin: 0
}

const perfil = {
  background: 'rgba(255,255,255,0.12)',
  padding: 14,
  borderRadius: 14,
  lineHeight: 1.5
}

const menu = {
  display: 'grid',
  gap: 10
}

const botaoMenu = {
  background: 'rgba(255,255,255,0.15)',
  color: '#fff',
  border: 'none',
  borderRadius: 12,
  padding: 12,
  cursor: 'pointer',
  textAlign: 'left',
  fontWeight: 'bold'
}

const botaoSair = {
  marginTop: 'auto',
  background: '#dc2626',
  color: '#fff',
  border: 'none',
  borderRadius: 12,
  padding: 12,
  cursor: 'pointer',
  fontWeight: 'bold'
}

const fundoEscuro = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.35)',
  border: 'none',
  zIndex: 55
}

const conteudo = {
  flex: 1,
  minWidth: 0
}
