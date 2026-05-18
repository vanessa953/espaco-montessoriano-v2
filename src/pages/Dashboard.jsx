import { useEffect, useMemo, useState } from 'react'
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
    window.location.href = '/'
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
    return agenda.filter(
      (item) => String(item.data || '').slice(0, 7) === mesAtual
    )
  }, [agenda, mesAtual])

  const financeiroMes = useMemo(() => {
    return financeiro.filter((item) => {
      const competencia =
        item.competencia ||
        String(item.vencimento || item.created_at || '').slice(0, 7)

      return competencia === mesAtual
    })
  }, [financeiro, mesAtual])

  const resumoFinanceiro = useMemo(() => {
    const receitas = financeiroMes
      .filter((item) => item.tipo_movimento === 'Receita')
      .reduce(
        (soma, item) =>
          soma +
          Number(item.valor || 0) +
          Number(item.taxa_deslocamento || 0),
        0
      )

    const recebido = financeiroMes
      .filter(
        (item) =>
          item.tipo_movimento === 'Receita' &&
          item.status === 'Pago'
      )
      .reduce(
        (soma, item) =>
          soma +
          Number(item.valor || 0) +
          Number(item.taxa_deslocamento || 0),
        0
      )

    const pendente = financeiroMes
      .filter(
        (item) =>
          item.tipo_movimento === 'Receita' &&
          item.status !== 'Pago'
      )
      .reduce(
        (soma, item) =>
          soma +
          Number(item.valor || 0) +
          Number(item.taxa_deslocamento || 0),
        0
      )

    const despesas = financeiroMes
      .filter((item) => item.tipo_movimento === 'Despesa')
      .reduce(
        (soma, item) => soma + Number(item.valor || 0),
        0
      )

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

  const pacientesAtivos = pacientes.filter(
    (p) => (p.status || 'Ativo') === 'Ativo'
  ).length

  const profissionaisAtivos = profissionais.filter(
    (p) => p.ativo !== false
  ).length

  const prontuariosSemResumo = prontuarios.filter(
    (p) => !p.resumo_familia
  ).length

  const relatorioIA = useMemo(() => {
    const faltasAltas = indicadoresAgenda.faltas > 3
    const pendenciaAlta =
      resumoFinanceiro.pendente > resumoFinanceiro.recebido

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
• Despesas: ${dinheiro
