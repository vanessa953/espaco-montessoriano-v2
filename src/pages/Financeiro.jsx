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

export default function Financeiro() {
  const [financeiro, setFinanceiro] = useState([])
  const [agenda, setAgenda] = useState([])
  const [pacientes, setPacientes] = useState([])
  const [profissionais, setProfissionais] = useState([])

  const [mesReferencia, setMesReferencia] = useState(
    new Date().toISOString().slice(0, 7)
  )

  const [form, setForm] = useState({
    paciente_id: '',
    profissional_id: '',
    descricao: '',
    valor: '',
    vencimento: '',
    status: 'Pendente',
    tipo_movimento: 'Receita',
    tipo_lancamento: 'Manual',
    origem: 'Manual',
    modalidade: '',
    observacoes: ''
  })

  async function carregarDados() {
    const { data: financeiroData } = await supabase
      .from('financeiro')
      .select(`
        *,
        pacientes(nome),
        profissionais(nome)
      `)
      .order('created_at', { ascending: false })

    const { data: agendaData } = await supabase
      .from('agenda')
      .select(`
        *,
        pacientes(nome),
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

    setFinanceiro(financeiroData || [])
    setAgenda(agendaData || [])
    setPacientes(pacientesData || [])
    setProfissionais(profissionaisData || [])
  }

  useEffect(() => {
    carregarDados()
  }, [])

  function atualizarCampo(campo, valor) {
    setForm((prev) => ({
      ...prev,
      [campo]: valor
    }))
  }

  async function salvarManual() {
    if (!form.descricao || !form.valor) {
      alert('Preencha descrição e valor.')
      return
    }

    const { error } = await supabase
      .from('financeiro')
      .insert([
        {
          ...form,
          valor: Number(form.valor || 0)
        }
      ])

    if (error) {
      console.log(error)
      alert('Erro ao salvar lançamento.')
      return
    }

    alert('Lançamento salvo.')
    carregarDados()

    setForm({
      paciente_id: '',
      profissional_id: '',
      descricao: '',
      valor: '',
      vencimento: '',
      status: 'Pendente',
      tipo_movimento: 'Receita',
      tipo_lancamento: 'Manual',
      origem: 'Manual',
      modalidade: '',
      observacoes: ''
    })
  }

  async function gerarFinanceiroAutomatico() {
    const agendaMes = agenda.filter(
      (item) =>
        String(item.data || '').slice(0, 7) === mesReferencia &&
        item.status !== 'Cancelado'
    )

    if (!agendaMes.length) {
      alert('Nenhum atendimento encontrado no mês.')
      return
    }

    let receitasCriadas = 0
    let repassesCriados = 0

    for (const item of agendaMes) {
      const { data: existenteReceita } = await supabase
        .from('financeiro')
        .select('id')
        .eq('agenda_id', item.id)
        .eq('tipo_movimento', 'Receita')
        .maybeSingle()

      if (!existenteReceita) {
        const receita = {
          agenda_id: item.id,
          paciente_id: item.paciente_id,
          profissional_id: item.profissional_id,
          descricao: `${item.servico || 'Atendimento'} - ${item.pacientes?.nome || 'Paciente'}`,
          valor: Number(item.valor_total_familia || 0),
          vencimento: item.data,
          status: item.status === 'Realizado' ? 'Pago' : 'Pendente',
          tipo_movimento: 'Receita',
          tipo_lancamento: 'Automático',
          origem: 'Agenda',
          modalidade: item.modalidade || '',
          observacoes: 'Gerado automaticamente pela agenda.'
        }

        const { error } = await supabase
          .from('financeiro')
          .insert([receita])

        if (!error) receitasCriadas++
      }

      const { data: existenteRepasse } = await supabase
        .from('financeiro')
        .select('id')
        .eq('agenda_id', item.id)
        .eq('tipo_movimento', 'Despesa')
        .maybeSingle()

      if (!existenteRepasse) {
        const repasse = {
          agenda_id: item.id,
          paciente_id: item.paciente_id,
          profissional_id: item.profissional_id,
          descricao: `Repasse profissional - ${item.profissionais?.nome || 'Profissional'}`,
          valor: Number(item.valor_total_profissional || 0),
          vencimento: item.data,
          status: item.status === 'Realizado' ? 'Pago' : 'Pendente',
          tipo_movimento: 'Despesa',
          tipo_lancamento: 'Automático',
          origem: 'Agenda',
          modalidade: item.modalidade || '',
          observacoes: 'Repasse automático do profissional.'
        }

        const { error } = await supabase
          .from('financeiro')
          .insert([repasse])

        if (!error) repassesCriados++
      }
    }

    alert(`
Financeiro automático concluído.

Receitas criadas: ${receitasCriadas}
Repasses criados: ${repassesCriados}

Lançamentos duplicados foram ignorados.
    `)

    carregarDados()
  }

  async function atualizarStatus(id, status) {
    const { error } = await supabase
      .from('financeiro')
      .update({ status })
      .eq('id', id)

    if (error) {
      console.log(error)
      return
    }

    carregarDados()
  }

  async function excluirLancamento(id) {
    const confirmar = confirm('Deseja excluir este lançamento?')
    if (!confirmar) return

    const { error } = await supabase
      .from('financeiro')
      .delete()
      .eq('id', id)

    if (error) {
      console.log(error)
      return
    }

    carregarDados()
  }

  const financeiroMes = useMemo(() => {
    return financeiro.filter(
      (item) =>
        String(item.vencimento || item.created_at || '').slice(0, 7) === mesReferencia
    )
  }, [financeiro, mesReferencia])

  const resumo = useMemo(() => {
    const receitas = financeiroMes
      .filter((i) => i.tipo_movimento === 'Receita')
      .reduce((soma, item) => soma + Number(item.valor || 0), 0)

    const despesas = financeiroMes
      .filter((i) => i.tipo_movimento === 'Despesa')
      .reduce((soma, item) => soma + Number(item.valor || 0), 0)

    const recebido = financeiroMes
      .filter((i) => i.status === 'Pago')
      .reduce((soma, item) => soma + Number(item.valor || 0), 0)

    const pendente = financeiroMes
      .filter((i) => i.status !== 'Pago')
      .reduce((soma, item) => soma + Number(item.valor || 0), 0)

    return {
      receitas,
      despesas,
      recebido,
      pendente,
      saldo: receitas - despesas
    }
  }, [financeiroMes])

  return (
    <div style={pagina}>
      <h1>Financeiro Inteligente</h1>

      <p style={{ color: '#666', marginBottom: 25 }}>
        Controle financeiro integrado com agenda, pacientes e profissionais.
      </p>

      <div style={box}>
        <h2>Gerar financeiro automático</h2>

        <div style={linha}>
          <input
            type="month"
            value={mesReferencia}
            onChange={(e) => setMesReferencia(e.target.value)}
          />

          <button onClick={gerarFinanceiroAutomatico} style={botaoPrincipal}>
            Gerar automático
          </button>
        </div>

        <p style={{ color: '#666', marginTop: 10 }}>
          O sistema ignora lançamentos já existentes e evita duplicidade.
        </p>
      </div>

      <div style={cards}>
        <Resumo titulo="Receitas" valor={dinheiro(resumo.receitas)} />
        <Resumo titulo="Despesas" valor={dinheiro(resumo.despesas)} />
        <Resumo titulo="Recebido" valor={dinheiro(resumo.recebido)} />
        <Resumo titulo="Pendente" valor={dinheiro(resumo.pendente)} />
        <Resumo titulo="Saldo" valor={dinheiro(resumo.saldo)} />
      </div>

      <div style={box}>
        <h2>Lançamento manual</h2>

        <div style={grid}>
          <select
            value={form.tipo_movimento}
            onChange={(e) => atualizarCampo('tipo_movimento', e.target.value)}
          >
            <option>Receita</option>
            <option>Despesa</option>
          </select>

          <select
            value={form.paciente_id}
            onChange={(e) => atualizarCampo('paciente_id', e.target.value)}
          >
            <option value="">Paciente</option>

            {pacientes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>

          <select
            value={form.profissional_id}
            onChange={(e) => atualizarCampo('profissional_id', e.target.value)}
          >
            <option value="">Profissional</option>

            {profissionais.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>

          <input
            placeholder="Descrição"
            value={form.descricao}
            onChange={(e) => atualizarCampo('descricao', e.target.value)}
          />

          <input
            type="number"
            placeholder="Valor"
            value={form.valor}
            onChange={(e) => atualizarCampo('valor', e.target.value)}
          />

          <input
            type="date"
            value={form.vencimento}
            onChange={(e) => atualizarCampo('vencimento', e.target.value)}
          />

          <select
            value={form.status}
            onChange={(e) => atualizarCampo('status', e.target.value)}
          >
            <option>Pendente</option>
            <option>Pago</option>
            <option>Atrasado</option>
          </select>

          <input
            placeholder="Modalidade"
            value={form.modalidade}
            onChange={(e) => atualizarCampo('modalidade', e.target.value)}
          />

          <textarea
            placeholder="Observações"
            value={form.observacoes}
            onChange={(e) => atualizarCampo('observacoes', e.target.value)}
            style={{ gridColumn: '1 / span 2', minHeight: 100 }}
          />
        </div>

        <button onClick={salvarManual} style={botaoPrincipal}>
          Salvar lançamento
        </button>
      </div>

      <div style={box}>
        <h2>Lançamentos financeiros</h2>

        {financeiroMes.map((item) => (
          <div key={item.id} style={card}>
            <h3>{item.descricao || '-'}</h3>

            <p><strong>Paciente:</strong> {item.pacientes?.nome || '-'}</p>
            <p><strong>Profissional:</strong> {item.profissionais?.nome || '-'}</p>
            <p><strong>Valor:</strong> {dinheiro(item.valor)}</p>
            <p><strong>Vencimento:</strong> {dataBR(item.vencimento)}</p>
            <p><strong>Status:</strong> {item.status || '-'}</p>
            <p><strong>Tipo:</strong> {item.tipo_movimento || '-'}</p>
            <p><strong>Origem:</strong> {item.origem || '-'}</p>
            <p><strong>Lançamento:</strong> {item.tipo_lancamento || '-'}</p>

            <div style={acoes}>
              <button
                onClick={() => atualizarStatus(item.id, 'Pago')}
                style={botaoPago}
              >
                Marcar pago
              </button>

              <button
                onClick={() => atualizarStatus(item.id, 'Pendente')}
                style={botaoPendente}
              >
                Pendente
              </button>

              <button
                onClick={() => excluirLancamento(item.id)}
                style={botaoExcluir}
              >
                Excluir
              </button>
            </div>
          </div>
        ))}
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

const pagina = {
  padding: 30,
  background: '#f5f7fb',
  minHeight: '100vh',
  fontFamily: 'Arial'
}

const box = {
  background: '#fff',
  padding: 24,
  borderRadius: 16,
  marginBottom: 24,
  boxShadow: '0 2px 12px rgba(0,0,0,0.08)'
}

const linha = {
  display: 'flex',
  gap: 12,
  flexWrap: 'wrap',
  alignItems: 'center'
}

const grid = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 15
}

const cards = {
  display: 'grid',
  gridTemplateColumns: 'repeat(5, 1fr)',
  gap: 15,
  marginBottom: 24
}

const cardResumo = {
  background: '#fff',
  padding: 20,
  borderRadius: 14,
  boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
  display: 'grid',
  gap: 8
}

const card = {
  background: '#f8fafc',
  border: '1px solid #e5e7eb',
  padding: 18,
  borderRadius: 14,
  marginTop: 15
}

const acoes = {
  display: 'flex',
  gap: 10,
  flexWrap: 'wrap',
  marginTop: 12
}

const botaoPrincipal = {
  marginTop: 20,
  background: '#0f766e',
  color: '#fff',
  border: 'none',
  borderRadius: 12,
  padding: 14,
  cursor: 'pointer',
  fontWeight: 'bold'
}

const botaoPago = {
  background: '#16a34a',
  color: '#fff',
  border: 'none',
  borderRadius: 10,
  padding: 10,
  cursor: 'pointer'
}

const botaoPendente = {
  background: '#eab308',
  color: '#fff',
  border: 'none',
  borderRadius: 10,
  padding: 10,
  cursor: 'pointer'
}

const botaoExcluir = {
  background: '#dc2626',
  color: '#fff',
  border: 'none',
  borderRadius: 10,
  padding: 10,
  cursor: 'pointer'
}
