import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Layout({ children }) {
  const navigate = useNavigate()
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')
  const tipo = localStorage.getItem('tipo_usuario')
  const nivel = usuario?.nivel_acesso || 'Terapeuta'
  const [menuAberto, setMenuAberto] = useState(false)

  function sair() {
    localStorage.removeItem('em_session')
    localStorage.removeItem('usuario')
    localStorage.removeItem('tipo_usuario')
    navigate('/')
  }

  function irPara(rota) {
    navigate(rota)
    setMenuAberto(false)
  }

  const menusProfissionais = [
    { nome: 'Dashboard', rota: '/dashboard', perfis: ['Administradora', 'Coordenação', 'Recepção', 'Financeiro', 'Supervisor', 'Terapeuta'] },
    { nome: 'Pacientes', rota: '/pacientes', perfis: ['Administradora', 'Coordenação', 'Recepção', 'Supervisor', 'Terapeuta'] },
    { nome: 'Agenda', rota: '/agenda', perfis: ['Administradora', 'Coordenação', 'Recepção', 'Supervisor', 'Terapeuta'] },
    { nome: 'Prontuário', rota: '/prontuario', perfis: ['Administradora', 'Coordenação', 'Supervisor', 'Terapeuta'] },
    { nome: 'Financeiro', rota: '/financeiro', perfis: ['Administradora', 'Financeiro'] },
    { nome: 'Profissionais', rota: '/profissionais', perfis: ['Administradora', 'Coordenação'] },
    { nome: 'Configurações', rota: '/configuracoes', perfis: ['Administradora'] }
  ]

  const menusFamilia = [
    { nome: 'App Família', rota: '/familia' }
  ]

  const menus =
    tipo === 'familia'
      ? menusFamilia
      : menusProfissionais.filter(
          (item) =>
            nivel === 'Administradora' ||
            item.perfis.includes(nivel)
        )

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

        <p style={perfil}>
          {usuario?.nome || 'Usuário'}
          <br />
          <small>{tipo === 'familia' ? 'Família' : nivel}</small>
        </p>

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
