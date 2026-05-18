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

function Protegida({ children, permitido = [] }) {
  const logado = localStorage.getItem('em_session') === 'ativo'
  const tipo = localStorage.getItem('tipo_usuario')
  const usuario = getUsuario()

  if (!logado) {
    window.location.href = '/'
    return null
  }

  if (tipo === 'familia') {
    if (permitido.includes('Família')) {
      return <Layout>{children}</Layout>
    }

    window.location.href = '/familia'
    return null
  }

  const nivel = usuario?.nivel_acesso || 'Colaborador'

  const autorizado =
    permitido.length === 0 ||
    permitido.includes(nivel) ||
    nivel === 'Administradora'

  if (!autorizado) {
    window.location.href = '/dashboard'
    return null
  }

  return <Layout>{children}</Layout>
}

export default function App() {
  const path = window.location.pathname

  if (path === '/') {
    return <Login />
  }

  if (path === '/dashboard') {
    return (
      <Protegida permitido={[
        'Administradora',
        'Coordenação',
        'Auxiliar ADM',
        'Recepção',
        'Financeiro',
        'Supervisor',
        'Colaborador',
        'Estagiário'
      ]}>
        <Dashboard />
      </Protegida>
    )
  }

  if (path === '/pacientes') {
    return (
      <Protegida permitido={[
        'Administradora',
        'Coordenação',
        'Auxiliar ADM',
        'Recepção',
        'Supervisor',
        'Colaborador',
        'Estagiário'
      ]}>
        <Pacientes />
      </Protegida>
    )
  }

  if (path === '/agenda') {
    return (
      <Protegida permitido={[
        'Administradora',
        'Coordenação',
        'Auxiliar ADM',
        'Recepção',
        'Supervisor',
        'Colaborador',
        'Estagiário'
      ]}>
        <Agenda />
      </Protegida>
    )
  }

  if (path === '/prontuario') {
    return (
      <Protegida permitido={[
        'Administradora',
        'Coordenação',
        'Supervisor',
        'Colaborador'
      ]}>
        <Prontuario />
      </Protegida>
    )
  }

  if (path === '/financeiro') {
    return (
      <Protegida permitido={[
        'Administradora',
        'Financeiro'
      ]}>
        <Financeiro />
      </Protegida>
    )
  }

  if (path === '/profissionais') {
    return (
      <Protegida permitido={[
        'Administradora',
        'Coordenação'
      ]}>
        <Profissionais />
      </Protegida>
    )
  }

  if (path === '/configuracoes') {
    return (
      <Protegida permitido={[
        'Administradora'
      ]}>
        <Configuracoes />
      </Protegida>
    )
  }

  if (path === '/familia') {
    return (
      <Protegida permitido={[
        'Família',
        'Administradora'
      ]}>
        <Familia />
      </Protegida>
    )
  }

  window.location.href = '/'
  return null
}
