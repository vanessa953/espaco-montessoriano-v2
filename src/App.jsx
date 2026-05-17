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

function Protegida({ children }) {
  const logado = localStorage.getItem('em_session') === 'ativo'
  return logado ? children : <Navigate to="/" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Protegida><Dashboard /></Protegida>} />
        <Route path="/pacientes" element={<Protegida><Pacientes /></Protegida>} />
        <Route path="/agenda" element={<Protegida><Agenda /></Protegida>} />
        <Route path="/prontuario" element={<Protegida><Prontuario /></Protegida>} />
        <Route path="/financeiro" element={<Protegida><Financeiro /></Protegida>} />
        <Route path="/familia" element={<Protegida><Familia /></Protegida>} />
        <Route path="/profissionais" element={<Protegida><Profissionais /></Protegida>} />
        <Route path="/configuracoes" element={<Protegida><Configuracoes /></Protegida>} />
      </Routes>
    </BrowserRouter>
  )
}
