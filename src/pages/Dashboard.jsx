import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function dinheiro(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  })
}

function dataBR(data) {
  if (!data) return '-'
  const [ano, mes, dia] = String(data).split('-')
  return `${dia}/${mes}/${ano}`
}

function hojeISO() {
  return new Date().toISOString().slice(0, 10)
}

export default function Dashboard() {
  const navigate = useNavigate()

  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')

  const [agenda, setAgenda] = useState([])
  const [pacientes, setPacientes] = useState([])
  const [profissionais, setProfissionais] = useState([])
  const [financeiro, setFinanceiro] = useState([])
  const [prontuarios, setProntuarios] = useState([])

  const mesAtual = new Date().toISOString().slice(0, 7)
  const hoje = hojeISO()

  async function carregarDados() {
    const { data: agendaData } = await supabase
      .from('agenda')
      .select(`
        *,
        pacientes(nome, responsavel, telefone),
        profissionais(nome)
      `)
      .order('data', { ascending: true })

    const { data: pacientesData } = await supabase
      .from('pacientes')
      .select('*')
      .order('nome')

    const { data: profissionaisData } = await supabase
      .from('profissionais')
      .select('*')
      .order('nome')

    const { data: financeiroData } = await supabase
      .from('financeiro')
      .select('*')
      .order('created_at', { ascending: false })

    const { data: prontuariosData } = await supabase
      .from('prontuarios')
      .select('*')
      .order('created_at', { ascending: false })

    setAgenda(agendaData || [])
    setPacientes(pacientesData || [])
    setProfissionais(profissionaisData || [])
    setFinanceiro(financeiroData || [])
    setProntuarios(prontuariosData || [])
  }

  useEffect(() => {
    carregarDados()
  }, [])

  function sair() {
    localStorage.removeItem('em_session')
    localStorage.removeItem('usuario')
    localStorage.removeItem('tipo_usuario')
    navigate('/')
  }

  const agendaHoje = useMemo(() => {
    return agenda.filter((item) => item.data === hoje)
  }, [agenda, hoje])

  const proximosAtendimentos = useMemo(() => {
    return agenda
      .filter((item) => item.data >= hoje)
      .slice(0, 8)
  }, [agenda, hoje])

  const agendaMes = useMemo(() => {
    return agenda.filter((item) => String(item.data || '').slice(0, 7) === mesAtual)
  }, [agenda, mesAtual])

  const financeiroMes = useMemo(() => {
    return financeiro.filter((item) => {
      const competencia = item.competencia || String(item.vencimento || item.created_at || '').slice(0, 7)
      return competencia === mesAtual
    })
  }, [financeiro, mesAtual])

  const resumoFinanceiro = useMemo(() => {
    const receitas = financeiroMes
      .filter((item) => item.tipo_movimento === 'Receita')
      .reduce((soma, item) => soma + Number(item.valor || 0) + Number(item.taxa_deslocamento || 0), 0)

    const recebido = financeiroMes
      .filter((item) => item.tipo_movimento === 'Receita' && item.status === 'Pago')
      .reduce((soma, item) => soma + Number(item.valor || 0) + Number(item.taxa_deslocamento || 0), 0)

    const pendente = financeiroMes
      .filter((item) => item.tipo_movimento === 'Receita' && item.status !== 'Pago')
      .reduce((soma, item) => soma + Number(item.valor || 0) + Number(item.taxa_deslocamento || 0), 0)

    const despesas = financeiroMes
      .filter((item) => item.tipo_movimento === 'Despesa')
      .reduce((soma, item) => soma + Number(item.valor || 0), 0)

    return {
      receitas,
      recebido,
      pendente,
      despesas,
      saldo: receitas - despesas
    }
  }, [financeiroMes])

  const indicadoresAgenda = useMemo(() => {
    return {
      agendados: agendaMes.filter((i) => i.status === 'Agendado').length,
      confirmados: agendaMes.filter((i) => i.status === 'Confirmado').length,
      realizados: agendaMes.filter((i) => i.status === 'Realizado').length,
      faltas: agendaMes.filter((i) => i.status === 'Falta').length,
      cancelados: agendaMes.filter((i) => i.status === 'Cancelado').length,
      reposicoes: agendaMes.filter((i) => i.status === 'Reposição').length
    }
  }, [agendaMes])

  const pacientesAtivos = pacientes.filter((p) => (p.status || 'Ativo') === 'Ativo').length
  const profissionaisAtivos = profissionais.filter((p) => p.ativo !== false).length

  const prontuariosSemResumo = prontuarios.filter((p) => !p.resumo_familia).length

  const relatorioIA = useMemo(() => {
    const faltasAltas = indicadoresAgenda.faltas > 3
    const pendenciaAlta = resumoFinanceiro.pendente > resumoFinanceiro.recebido
    const agendaCheia = agendaMes.length > 40

    return `Resumo inteligente do mês

• Atendimentos no mês: ${agendaMes.length}
• Atendimentos realizados: ${indicadoresAgenda.realizados}
• Faltas: ${indicadoresAgenda.faltas}
• Cancelamentos: ${indicadoresAgenda.cancelados}
• Pacientes ativos: ${pacientesAtivos}
• Profissionais ativos: ${profissionaisAtivos}
• Receita prevista: ${dinheiro(resumoFinanceiro.receitas)}
• Recebido: ${dinheiro(resumoFinanceiro.recebido)}
• Pendente: ${dinheiro(resumoFinanceiro.pendente)}
• Despesas: ${dinheiro(resumoFinanceiro.despesas)}
• Saldo previsto: ${dinheiro(resumoFinanceiro.saldo)}

Análise automática:
${agendaCheia ? 'A agenda apresenta bom volume de atendimentos.' : 'A agenda ainda pode ser ampliada com novos atendimentos ou melhor ocupação dos horários.'}
${faltasAltas ? 'Há número relevante de faltas. Recomenda-se reforçar confirmação por WhatsApp.' : 'As faltas estão dentro de um volume controlável.'}
${pendenciaAlta ? 'O financeiro pendente está alto em relação ao recebido. Recomenda-se acompanhar cobranças.' : 'O fluxo financeiro está proporcionalmente equilibrado.'}
${prontuariosSemResumo > 0 ? `Existem ${prontuariosSemResumo} prontuários sem resumo para família. Recomenda-se revisar.` : 'Os registros clínicos estão com boa organização de resumo familiar.'}

Sugestões:
• Confirmar atendimentos com antecedência.
• Revisar faltas e reposições.
• Acompanhar pendências financeiras.
• Manter prontuários com resumo obrigatório.
• Avaliar margem dos atendimentos em grupo.
• Organizar agenda dos profissionais com maior demanda.`
  }, [
    agendaMes,
    indicadoresAgenda,
    pacientesAtivos,
    profissionaisAtivos,
    resumoFinanceiro,
    prontuariosSemResumo
  ])

  return (
    <div style={pagina}>
      <div style={cabecalho}>
        <div>
          <h1>Dashboard Administrativo</h1>
          <p style={{ color: '#666' }}>
            Visão geral da clínica, agenda, financeiro, pacientes e alertas inteligentes.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/configuracoes')} style={botaoCinza}>
            Configurações
          </button>

          <button onClick={sair} style={botaoSair}>
            Sair
          </button>
        </div>
      </div>

      <div style={boxUsuario}>
        <h2>Olá, {usuario?.nome || 'Vanessa'} 👋</h2>
        <p>
          Nível de acesso: <strong>{usuario?.nivel_acesso || 'Administradora'}</strong>
        </p>
      </div>

      <div style={cards}>
        <Resumo titulo="Atendimentos hoje" valor={agendaHoje.length} />
        <Resumo titulo="Atendimentos mês" valor={agendaMes.length} />
        <Resumo titulo="Pacientes ativos" valor={pacientesAtivos} />
        <Resumo titulo="Profissionais ativos" valor={profissionaisAtivos} />
        <Resumo titulo="Receita prevista" valor={dinheiro(resumoFinanceiro.receitas)} />
        <Resumo titulo="Pendente" valor={dinheiro(resumoFinanceiro.pendente)} />
        <Resumo titulo="Despesas" valor={dinheiro(resumoFinanceiro.despesas)} />
        <Resumo titulo="Saldo previsto" valor={dinheiro(resumoFinanceiro.saldo)} />
      </div>

      <div style={atalhos}>
        <button onClick={() => navigate('/pacientes')} style={botaoAtalho}>
          Novo paciente
        </button>

        <button onClick={() => navigate('/agenda')} style={botaoAtalho}>
          Novo atendimento
        </button>

        <button onClick={() => navigate('/prontuario')} style={botaoAtalho}>
          Novo prontuário
        </button>

        <button onClick={() => navigate('/financeiro')} style={botaoAtalho}>
          Financeiro
        </button>

        <button onClick={() => navigate('/profissionais')} style={botaoAtalho}>
          Profissionais
        </button>
      </div>

      <div style={duasColunas}>
        <div style={box}>
          <h2>Agenda de hoje</h2>

          {agendaHoje.length === 0 && (
            <p>Nenhum atendimento agendado para hoje.</p>
          )}

          {agendaHoje.map((item) => (
            <div key={item.id} style={card}>
              <h3>{item.horario} — {item.servico || 'Atendimento'}</h3>
              <p><strong>Paciente:</strong> {item.pacientes?.nome || 'Grupo'}</p>
              <p><strong>Profissional:</strong> {item.profissionais?.nome || '-'}</p>
              <p><strong>Status:</strong> {item.status || '-'}</p>
              <p><strong>Modalidade:</strong> {item.modalidade || '-'}</p>
            </div>
          ))}
        </div>

        <div style={box}>
          <h2>Próximos atendimentos</h2>

          {proximosAtendimentos.length === 0 && (
            <p>Nenhum próximo atendimento encontrado.</p>
          )}

          {proximosAtendimentos.map((item) => (
            <div key={item.id} style={card}>
              <h3>{dataBR(item.data)} às {item.horario}</h3>
              <p><strong>Serviço:</strong> {item.servico || '-'}</p>
              <p><strong>Paciente:</strong> {item.pacientes?.nome || 'Grupo'}</p>
              <p><strong>Profissional:</strong> {item.profissionais?.nome || '-'}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={duasColunas}>
        <div style={box}>
          <h2>Indicadores da agenda</h2>

          <div style={listaIndicadores}>
            <LinhaIndicador label="Agendados" valor={indicadoresAgenda.agendados} />
            <LinhaIndicador label="Confirmados" valor={indicadoresAgenda.confirmados} />
            <LinhaIndicador label="Realizados" valor={indicadoresAgenda.realizados} />
            <LinhaIndicador label="Faltas" valor={indicadoresAgenda.faltas} />
            <LinhaIndicador label="Cancelados" valor={indicadoresAgenda.cancelados} />
            <LinhaIndicador label="Reposições" valor={indicadoresAgenda.reposicoes} />
          </div>
        </div>

        <div style={box}>
          <h2>Alertas importantes</h2>

          <div style={alerta}>
            <strong>Prontuários sem resumo família:</strong> {prontuariosSemResumo}
          </div>

          <div style={alerta}>
            <strong>Financeiro pendente:</strong> {dinheiro(resumoFinanceiro.pendente)}
          </div>

          <div style={alerta}>
            <strong>Faltas no mês:</strong> {indicadoresAgenda.faltas}
          </div>

          <div style={alerta}>
            <strong>Cancelamentos no mês:</strong> {indicadoresAgenda.cancelados}
          </div>
        </div>
      </div>

      <div style={box}>
        <h2>Relatório inteligente IA</h2>

        <textarea
          value={relatorioIA}
          readOnly
          style={textarea}
        />

        <button
          onClick={() => {
            navigator.clipboard.writeText(relatorioIA)
            alert('Relatório copiado.')
          }}
          style={botaoAtalho}
        >
          Copiar relatório
        </button>
      </div>
    </div>
  )
}

function Resumo({ titulo, valor }) {
  return (
    <div style={cardResumo}>
      <span>{titulo}</span>
      <strong>{valor}</strong>
    </div>
  )
}

function LinhaIndicador({ label, valor }) {
  return (
    <div style={linhaIndicador}>
      <span>{label}</span>
      <strong>{valor}</strong>
    </div>
  )
}

const pagina = {
  padding: 30,
  fontFamily: 'Arial',
  background: '#f5f7fb',
  minHeight: '100vh'
}

const cabecalho = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 20,
  marginBottom: 20,
  flexWrap: 'wrap'
}

const boxUsuario = {
  background: '#ecfeff',
  border: '1px solid #a5f3fc',
  padding: 22,
  borderRadius: 18,
  marginBottom: 20
}

const cards = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: 15,
  marginBottom: 25
}

const cardResumo = {
  background: '#fff',
  borderRadius: 16,
  padding: 20,
  boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
  display: 'grid',
  gap: 8
}

const atalhos = {
  display: 'flex',
  gap: 12,
  flexWrap: 'wrap',
  marginBottom: 25
}

const botaoAtalho = {
  background: '#0f766e',
  color: '#fff',
  border: 'none',
  borderRadius: 12,
  padding: 12,
  cursor: 'pointer',
  fontWeight: 'bold'
}

const botaoCinza = {
  background: '#64748b',
  color: '#fff',
  border: 'none',
  borderRadius: 12,
  padding: 12,
  cursor: 'pointer',
  fontWeight: 'bold'
}

const botaoSair = {
  background: '#dc2626',
  color: '#fff',
  border: 'none',
  borderRadius: 12,
  padding: 12,
  cursor: 'pointer',
  fontWeight: 'bold'
}

const duasColunas = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 20,
  marginBottom: 25
}

const box = {
  background: '#fff',
  padding: 24,
  borderRadius: 18,
  boxShadow: '0 2px 12px rgba(0,0,0,0.08)'
}

const card = {
  background: '#f8fafc',
  border: '1px solid #e5e7eb',
  padding: 16,
  borderRadius: 14,
  marginTop: 12
}

const listaIndicadores = {
  display: 'grid',
  gap: 10
}

const linhaIndicador = {
  display: 'flex',
  justifyContent: 'space-between',
  borderBottom: '1px solid #e5e7eb',
  paddingBottom: 8
}

const alerta = {
  background: '#fff7ed',
  border: '1px solid #fed7aa',
  padding: 14,
  borderRadius: 12,
  marginBottom: 10
}

const textarea = {
  width: '100%',
  minHeight: 360,
  padding: 18,
  borderRadius: 14,
  border: '1px solid #ddd',
  background: '#f8fafc',
  lineHeight: 1.7,
  marginBottom: 15
}
