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
  const [ano, mes, dia] = data.split('-')
  return `${dia}/${mes}/${ano}`
}

export default function Financeiro() {
  const [aba, setAba] = useState('fechamento')
  const [agenda, setAgenda] = useState([])
  const [financeiro, setFinanceiro] = useState([])
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7))
  const [relatorioIA, setRelatorioIA] = useState('')

  const [despesaForm, setDespesaForm] = useState({
    descricao: '',
    categoria_despesa: '',
    fornecedor: '',
    forma_pagamento: '',
    centro_custo: '',
    valor: '',
    vencimento: '',
    data_pagamento: '',
    status: 'Pendente',
    observacoes: '',
    recorrente: false
  })

  async function carregarDados() {
    const { data: agendaData } = await supabase
      .from('agenda')
      .select(`
        *,
        pacientes(nome, responsavel, telefone),
        profissionais(nome)
      `)
      .order('data')

    const { data: financeiroData } = await supabase
      .from('financeiro')
      .select(`
        *,
        pacientes(nome, responsavel, telefone),
        profissionais(nome)
      `)
      .order('created_at', { ascending: false })

    setAgenda(agendaData || [])
    setFinanceiro(financeiroData || [])
  }

  useEffect(() => {
    carregarDados()
  }, [])

  const agendaMes = useMemo(() => {
    return agenda.filter((a) => String(a.data || '').slice(0, 7) === mes)
  }, [agenda, mes])

  const despesasMes = useMemo(() => {
    return financeiro.filter(
      (f) =>
        f.tipo_movimento === 'Despesa' &&
        String(f.vencimento || f.created_at || '').slice(0, 7) === mes
    )
  }, [financeiro, mes])

  const fechamentoFamilias = useMemo(() => {
    const mapa = {}

    agendaMes.forEach((item) => {
      const pacienteId = item.paciente_id || item.id
      const nomePaciente = item.pacientes?.nome || 'Grupo / Paciente não informado'

      if (!mapa[pacienteId]) {
        mapa[pacienteId] = {
          paciente_id: item.paciente_id,
          paciente: nomePaciente,
          responsavel: item.pacientes?.responsavel || '',
          telefone: item.pacientes?.telefone || '',
          sessoes: [],
          total: 0
        }
      }

      const valor = Number(item.valor_por_paciente || item.valor_total_familia || 0)

      mapa[pacienteId].sessoes.push({
        data: item.data,
        horario: item.horario,
        servico: item.servico,
        modalidade: item.modalidade,
        status: item.status,
        valor
      })

      mapa[pacienteId].total += valor
    })

    return Object.values(mapa)
  }, [agendaMes])

  const pagamentoProfissionais = useMemo(() => {
    const mapa = {}

    agendaMes.forEach((item) => {
      const profId = item.profissional_id || 'sem-profissional'
      const nomeProfissional = item.profissionais?.nome || 'Profissional não informado'

      if (!mapa[profId]) {
        mapa[profId] = {
          profissional_id: item.profissional_id,
          profissional: nomeProfissional,
          atendimentos: [],
          totalHoras: 0,
          totalRepasse: 0
        }
      }

      const horas = Number(item.duracao_horas || 1)
      const repasse = Number(item.valor_total_profissional || 0)

      mapa[profId].atendimentos.push({
        data: item.data,
        horario: item.horario,
        servico: item.servico,
        tipo: item.tipo_atendimento,
        horas,
        repasse
      })

      mapa[profId].totalHoras += horas
      mapa[profId].totalRepasse += repasse
    })

    return Object.values(mapa)
  }, [agendaMes])

  const resumo = useMemo(() => {
    const receitaFamilias = fechamentoFamilias.reduce(
      (soma, item) => soma + Number(item.total || 0),
      0
    )

    const repasseProfissionais = pagamentoProfissionais.reduce(
      (soma, item) => soma + Number(item.totalRepasse || 0),
      0
    )

    const despesas = despesasMes.reduce(
      (soma, item) => soma + Number(item.valor || 0),
      0
    )

    return {
      receitaFamilias,
      repasseProfissionais,
      despesas,
      lucroBruto: receitaFamilias - repasseProfissionais,
      lucroLiquido: receitaFamilias - repasseProfissionais - despesas,
      atendimentos: agendaMes.length
    }
  }, [fechamentoFamilias, pagamentoProfissionais, despesasMes, agendaMes])

  useEffect(() => {
    gerarRelatorioIA()
  }, [resumo, fechamentoFamilias, pagamentoProfissionais, mes])

  function gerarRelatorioIA() {
    const totalPacientes = fechamentoFamilias.length
    const totalProfissionais = pagamentoProfissionais.length

    const profissionalMaiorRepasse = [...pagamentoProfissionais].sort(
      (a, b) => b.totalRepasse - a.totalRepasse
    )[0]

    const familiaMaiorFaturamento = [...fechamentoFamilias].sort(
      (a, b) => b.total - a.total
    )[0]

    const despesasAltas = resumo.despesas > resumo.receitaFamilias * 0.4
    const lucroBaixo = resumo.lucroLiquido < resumo.receitaFamilias * 0.25

    const texto = `
RELATÓRIO MENSAL INTELIGENTE — ${mes}

VISÃO GERAL

• Total de atendimentos: ${resumo.atendimentos}
• Total de famílias atendidas: ${totalPacientes}
• Total de profissionais com atendimentos: ${totalProfissionais}

• Receita total das famílias: ${dinheiro(resumo.receitaFamilias)}
• Repasse total dos profissionais: ${dinheiro(resumo.repasseProfissionais)}
• Despesas gerais: ${dinheiro(resumo.despesas)}
• Lucro bruto: ${dinheiro(resumo.lucroBruto)}
• Lucro líquido: ${dinheiro(resumo.lucroLiquido)}

ANÁLISE AUTOMÁTICA

${
  resumo.receitaFamilias > 0
    ? '• Houve movimentação financeira positiva no período.'
    : '• Não houve movimentação financeira significativa no período.'
}

${
  despesasAltas
    ? '• As despesas estão elevadas em relação ao faturamento.'
    : '• As despesas estão proporcionais ao faturamento.'
}

${
  lucroBaixo
    ? '• O lucro líquido está abaixo da margem ideal e precisa de atenção.'
    : '• O lucro líquido está dentro de uma margem mais saudável.'
}

${
  profissionalMaiorRepasse
    ? `• Profissional com maior repasse: ${profissionalMaiorRepasse.profissional} — ${dinheiro(profissionalMaiorRepasse.totalRepasse)}.`
    : '• Ainda não há dados suficientes sobre repasses profissionais.'
}

${
  familiaMaiorFaturamento
    ? `• Família/paciente com maior faturamento: ${familiaMaiorFaturamento.paciente} — ${dinheiro(familiaMaiorFaturamento.total)}.`
    : '• Ainda não há dados suficientes sobre faturamento por família.'
}

PONTOS DE ATENÇÃO

${
  resumo.repasseProfissionais > resumo.receitaFamilias * 0.65
    ? '• O percentual de repasses está alto. Avaliar margem dos serviços e precificação.'
    : '• Os repasses profissionais estão dentro de uma margem mais equilibrada.'
}

${
  resumo.despesas > resumo.receitaFamilias * 0.5
    ? '• As despesas fixas e variáveis precisam ser revisadas.'
    : '• As despesas parecem controladas neste mês.'
}

SUGESTÕES PARA O PRÓXIMO MÊS

• Monitorar faltas, cancelamentos e reposições.
• Priorizar serviços com maior margem de lucro.
• Ampliar atendimentos em grupo quando clinicamente adequado.
• Revisar valores cobrados das famílias quando houver baixa rentabilidade.
• Acompanhar despesas recorrentes.
• Conferir repasses profissionais antes do fechamento.
• Usar confirmação por WhatsApp para reduzir faltas.
• Comparar este mês com o próximo para observar crescimento ou queda.

CONCLUSÃO

${
  resumo.lucroLiquido > 0
    ? 'O mês apresentou resultado financeiro positivo.'
    : 'O mês exige atenção financeira e revisão de custos, repasses ou precificação.'
}
`

    setRelatorioIA(texto)
  }

  async function salvarDespesa() {
    if (!despesaForm.descricao || !despesaForm.valor) {
      alert('Preencha descrição e valor.')
      return
    }

    const { error } = await supabase.from('finance
