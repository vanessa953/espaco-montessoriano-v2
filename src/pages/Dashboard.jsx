export default function Dashboard() {
  return (
    <div style={{ padding: 30, fontFamily: 'Arial' }}>
      <h1>Espaço Montessoriano</h1>
      <p>Sistema Clínico Integrado</p>

      <div style={{ display: 'grid', gap: 16, marginTop: 30 }}>
        <button>Pacientes</button>
        <button>Agenda</button>
        <button>Prontuário</button>
        <button>Financeiro</button>
        <button>App Família</button>
      </div>
    </div>
  )
}
