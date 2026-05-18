import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

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
    return <Navigate to="/" replace />
  }

  if (tipo === 'familia') {
    return permitido.includes('Família')
      ? <Layout>{children}</Layout>
      : <Navigate to="/familia" replace />
  }

  const nivel = usuario?.nivel_acesso || 'Terapeuta'

  const autorizado =
    permitido.length === 0 ||
    permitido.includes(nivel) ||
    nivel === 'Administradora'

  if (!autorizado) {
    return <Navigate to="/dashboard" replace />
  }

  return <Layout>{children}</Layout>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />

        <Route
          path="/dashboard"
          element={
            <Protegida permitido={['Administradora', 'Coordenação', 'Recepção', 'Financeiro', 'Supervisor', 'Terapeuta']}>
              <Dashboard />
            </Protegida>
          }
        />

        <Route
          path="/pacientes"
          element={
            <Protegida permitido={['Administradora', 'Coordenação', 'Recepção', 'Supervisor', 'Terapeuta']}>
              <Pacientes />
            </Protegida>
          }
        />

        <Route
          path="/agenda"
          element={
            <Protegida permitido={['Administradora', 'Coordenação', 'Recepção', 'Supervisor', 'Terapeuta']}>
              <Agenda />
            </Protegida>
          }
        />

        <Route
          path="/prontuario"
          element={
            <Protegida permitido={['Administradora', 'Coordenação', 'Supervisor', 'Terapeuta']}>
              <Prontuario />
            </Protegida>
          }
        />

        <Route
          path="/financeiro"
          element={
            <Protegida permitido={['Administradora', 'Financeiro']}>
              <Financeiro />
            </Protegida>
          }
        />

        <Route
          path="/familia"
          element={
            <Protegida permitido={['Família']}>
              <Familia />
            </Protegida>
          }
        />

        <Route
          path="/profissionais"
          element={
            <Protegida permitido={['Administradora', 'Coordenação']}>
              <Profissionais />
            </Protegida>
          }
        />

        <Route
          path="/configuracoes"
          element={
            <Protegida permitido={['Administradora']}>
              <Configuracoes />
            </Protegida>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
