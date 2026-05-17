import { Link } from 'react-router-dom'

export default function Dashboard() {
  return (
    <div style={{ padding: 30, fontFamily: 'Arial' }}>
      <h1>Espaço Montessoriano</h1>
      <p>Sistema Clínico Integrado</p>

      <div style={{ display: 'grid', gap: 16, marginTop: 30 }}>

        <Link to="/pacientes">
          <button style={{ width: '100%', padding: 12 }}>
            Pacientes
          </button>
        </Link>

        <button>Agenda</button>

        <button>Prontuário</button>

        <button>Financeiro</button>

        <button>App Família</button>

      </div>
    </div>
  )
}
