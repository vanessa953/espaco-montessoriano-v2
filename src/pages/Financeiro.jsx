import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

function dinheiro(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  })
}

export default function Financeiro() {
  const [agenda, setAgenda] = useState([])
  const [financeiro, setFinanceiro] = useState([])
  const [mes, setMes] = useState(
    new Date().toISOString().slice(0, 7)
  )

  async function carregarDados() {
    const { data: agendaData } = await supabase
      .from('agenda')
      .select(`
        *,
        pacientes(nome),
        profissionais(nome)
      `)
      .order('data')

    const { data: financeiroData } = await supabase
      .from('financeiro')
      .select('*')
      .order('created_at', {
        ascending: false
      })

    setAgenda(agendaData || [])
    setFinanceiro(financeiroData || [])
  }

  useEffect(() => {
    carregarDados()
  }, [])

  const atendimentosMes = useMemo(() => {
    return agenda.filter(
      (a) =>
        String(a.data || '').slice(0, 7) === mes
    )
  }, [agenda, mes])

  const relatorio = useMemo(() => {
    return atendimentosMes.map((a) => {
      const quantidadePacientes =
        a.tipo_atendimento === 'Grupo'
          ? Number(a.quantidade_pacientes || 0)
          : 1

      const receitaPacientes =
        Number(a.valor_por_paciente || 0) *
        quantidadePacientes

      const taxa =
        Number(a.taxa_deslocamento || 0)

      const receitaTotal =
        receitaPacientes + taxa

      const repasseProfissional =
        Number(a.valor_hora_profissional || 0) *
        Number(a.duracao_horas || 1)

      const saldoClinica =
        receitaTotal - repasseProfissional

      return {
        ...a,
        quantidadePacientes,
        receitaPacientes,
        taxa,
        receitaTotal,
        repasseProfissional,
        saldoClinica
      }
    })
  }, [atendimentosMes])

  const resumo = useMemo(() => {
    const receita = relatorio.reduce(
      (s, i) => s + i.receitaTotal,
      0
    )

    const repasses = relatorio.reduce(
      (s, i) => s + i.repasseProfissional,
      0
    )

    const saldo = relatorio.reduce(
      (s, i) => s + i.saldoClinica,
      0
    )

    const despesas = financeiro
      .filter((f) => f.tipo_movimento === 'Despesa')
      .reduce(
        (s, i) => s + Number(i.valor || 0),
        0
      )

    return {
      receita,
      repasses,
      despesas,
      saldoFinal: saldo - despesas
    }
  }, [relatorio, financeiro])

  async function gerarFinanceiroAutomatico() {
    const registros = []

    for (const item of relatorio) {
      registros.push({
        paciente_id: item.paciente_id || null,
        profissional_id: item.profissional_id,
        tipo_movimento: 'Receita',
        servico: item.servico,
        descricao: `${item.servico} - ${item.data}`,
        valor: item.receitaPacientes,
        taxa_deslocamento: item.taxa,
        modalidade: item.modalidade,
        status: 'Pendente',
        vencimento: item.data,
        observacoes: `Receita automática`
      })

      registros.push({
        profissional_id: item.profissional_id,
        tipo_movimento: 'Despesa',
        servico: item.servico,
        descricao: `Repasse profissional - ${item.data}`,
        valor: item.repasseProfissional,
        status: 'Pendente',
        vencimento: item.data,
        categoria_despesa: 'Repasse',
        observacoes: `Pagamento automático profissional`
      })
    }

    const { error } = await supabase
      .from('financeiro')
      .insert(registros)

    if (error) {
      console.log(error)
      alert('Erro ao gerar financeiro')
      return
    }

    alert('Financeiro gerado automaticamente')
    carregarDados()
  }

  return (
    <div style={pagina}>
      <h1>Financeiro Inteligente</h1>

      <div style={box}>
        <h2>Resumo mensal automático</h2>

        <input
          type="month"
          value={mes}
          onChange={(e) =>
            setMes(e.target.value)
          }
          style={input}
        />

        <div style={cards}>
          <Resumo
            titulo="Receita total"
            valor={dinheiro(resumo.receita)}
          />

          <Resumo
            titulo="Repasses"
            valor={dinheiro(resumo.repasses)}
          />

          <Resumo
            titulo="Despesas"
            valor={dinheiro(resumo.despesas)}
          />

          <Resumo
            titulo="Saldo final"
            valor={dinheiro(resumo.saldoFinal)}
          />
        </div>

        <button
          onClick={gerarFinanceiroAutomatico}
          style={botaoPrincipal}
        >
          Gerar financeiro automático
        </button>
      </div>

      <div style={box}>
        <h2>Atendimentos integrados</h2>

        {relatorio.map((item) => (
          <div key={item.id} style={card}>
            <h3>{item.servico}</h3>

            <p>
              <strong>Profissional:</strong>{' '}
              {item.profissionais?.nome}
            </p>

            <p>
              <strong>Paciente:</strong>{' '}
              {item.pacientes?.nome || 'Grupo'}
            </p>

            <p>
              <strong>Tipo:</strong>{' '}
              {item.tipo_atendimento}
            </p>

            <p>
              <strong>Quantidade pacientes:</strong>{' '}
              {item.quantidadePacientes}
            </p>

            <p>
              <strong>Valor por paciente:</strong>{' '}
              {dinheiro(item.valor_por_paciente)}
            </p>

            <p>
              <strong>Receita pacientes:</strong>{' '}
              {dinheiro(item.receitaPacientes)}
            </p>

            <p>
              <strong>Duração:</strong>{' '}
              {item.duracao_horas}h
            </p>

            <p>
              <strong>Valor hora profissional:</strong>{' '}
              {dinheiro(
                item.valor_hora_profissional
              )}
            </p>

            <p>
              <strong>Repasse profissional:</strong>{' '}
              {dinheiro(
                item.repasseProfissional
              )}
            </p>

            <p>
              <strong>Saldo clínica:</strong>{' '}
              {dinheiro(item.saldoClinica)}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

function Resumo({ titulo, valor }) {
  return (
    <div style={cardResumo}>
      <strong>{valor}</strong>
      <span>{titulo}</span>
    </div>
  )
}

const pagina = {
  padding: 30,
  fontFamily: 'Arial',
  background: '#f5f7fb',
  minHeight: '100vh'
}

const box = {
  background: '#fff',
  padding: 25,
  borderRadius: 16,
  marginBottom: 25,
  boxShadow: '0 2px 10px rgba(0,0,0,0.08)'
}

const cards = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: 15,
  marginTop: 20,
  marginBottom: 20
}

const cardResumo = {
  background: '#f8fafc',
  padding: 18,
  borderRadius: 14,
  border: '1px solid #e5e7eb',
  display: 'grid',
  gap: 5
}

const card = {
  background: '#f8fafc',
  padding: 20,
  borderRadius: 16,
  marginTop: 15,
  border: '1px solid #e5e7eb'
}

const input = {
  padding: 12,
  borderRadius: 10,
  border: '1px solid #ccc'
}

const botaoPrincipal = {
  background: '#0f766e',
  color: '#fff',
  border: 'none',
  borderRadius: 10,
  padding: 14,
  cursor: 'pointer',
  fontWeight: 'bold',
  marginTop: 20
}
