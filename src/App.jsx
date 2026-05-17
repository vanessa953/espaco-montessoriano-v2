import Login from './pages/Login'
import Dashboard from './pages/Dashboard'

export default function App() {
  const path = window.location.pathname

  if (path === '/dashboard') {
    return <Dashboard />
  }

  return <Login />
}
