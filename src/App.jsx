import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Pacientes from './pages/Pacientes'
import Agenda from './pages/Agenda'
import Prontuario from './pages/Prontuario'
import Financeiro from './pages/Financeiro'
import Familia from './pages/Familia'
import Profissionais from './pages/Profissionais'
import Configuracoes from './pages/Configuracoes'
import Layout from './components/Layout'

function getUsuario() {
  try {
    return JSON.parse(localStorage.getItem('usuario') || '{}')
  } catch {
    return {}
  }
}

function Protegida({ children }) {
  const logado = localStorage.getItem('em_session') === 'ativo'

  if (!logado) {
    return <Login />
  }

  return <Layout>{children}</Layout>
}

export default function App() {
  const path = window.location.pathname
  const usuario = getUsuario()
  const tipo = localStorage.getItem('tipo_usuario')

  if (path === '/') {
    return <Login />
  }

  if (path === '/familia') {
    return (
      <Protegida>
        <Familia />
      </Protegida>
    )
  }

  if (path === '/pacientes') {
    return (
      <Protegida>
        <Pacientes />
      </Protegida>
    )
  }

  if (path === '/agenda') {
    return (
      <Protegida>
        <Agenda />
      </Protegida>
    )
  }

  if (path === '/prontuario') {
    return (
      <Protegida>
        <Prontuario />
      </Protegida>
    )
  }

  if (path === '/financeiro') {
    return (
      <Protegida>
        <Financeiro />
      </Protegida>
    )
  }

  if (path === '/profissionais') {
    return (
      <Protegida>
        <Profissionais />
      </Protegida>
    )
  }

  if (path === '/configuracoes') {
    return (
      <Protegida>
        <Configuracoes />
      </Protegida>
    )
  }

  if (tipo === 'familia') {
    return (
      <Protegida>
        <Familia />
      </Protegida>
    )
  }

  return (
    <Protegida>
      <Dashboard />
    </Protegida>
  )
}
