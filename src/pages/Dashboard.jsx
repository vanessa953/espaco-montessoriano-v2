import Layout from '../components/Layout'
import { Link } from 'react-router-dom'

const cards = [
  ['Pacientes', 'Cadastro, responsáveis e dados clínicos', '/pacientes', '👧'],
  ['Agenda', 'Atendimentos, horários e confirmações', '/agenda', '🗓️'],
  ['Prontuário', 'Sessões, evolução e relatórios', '/prontuario', '🧠'],
  ['Financeiro', 'Receitas, previsões e fechamento', '/financeiro', '💰'],
  ['App Família', 'Resumo de sessão e agenda do paciente', '/familia', '👨‍👩‍👧'],
  ['Profissionais', 'Equipe, permissões e vínculos', '/profissionais', '👩‍⚕️']
]

export default function Dashboard() {
  return (
    <Layout title="Dashboard Geral" subtitle="Visão executiva do Espaço Montessoriano">
      <div className="kpis">
        <div><span>Pacientes</span><strong>0</strong><small>Base pronta para Supabase</small></div>
        <div><span>Agenda</span><strong>0</strong><small>Sessões da semana</small></div>
        <div><span>Financeiro</span><strong>R$ 0,00</strong><small>Previsão mensal</small></div>
        <div><span>Prontuários</span><strong>0</strong><small>Registros clínicos</small></div>
      </div>

      <div className="moduleGrid">
        {cards.map(([title, desc, href, icon]) => (
          <Link className="moduleCard" to={href} key={href}>
            <div className="icon">{icon}</div>
            <h3>{title}</h3>
            <p>{desc}</p>
          </Link>
        ))}
      </div>
    </Layout>
  )
}
