import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

function dinheiro(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  })
}

export default function Financeiro() {
  const [lancamentos, setLancamentos] = useState([])
  const [pacientes, setPacientes] = useState([])
  const [profissionais, setProfissionais] = useState([])
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [editandoId, setEditandoId] = useState(null)

  const [form, setForm] = useState({
    paciente_id: '',
    profissional_id: '',
    tipo_movimento: 'Receita',
    servico: '',
    descricao: '',
    valor: '',
    vencimento: '',
    data_pagamento: '',
    modalidade: 'Clínica',
    taxa_deslocamento: 0,
    status: 'Pendente',
    observacoes: ''
  })

  async function carregarDados() {
    const { data: pacientesData } = await supabase
      .from('pacientes')
      .select('id, nome')
      .order('nome')

    const { data: profissionaisData } = await supabase
      .from('profissionais')
      .select('id, nome')
      .order('nome')

    const { data: financeiroData, error } = await supabase
      .from('financeiro')
      .select(`
        *,
        pacientes(nome),
        profissionais(nome)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.log(error)
      return
    }

    setPacientes(pacientesData || [])
    setProfissionais(profissionaisData || [])
    setLancamentos(financeiroData || [])
  }

  useEffect(() => {
    carregarDados()
  }, [])

  function atualizarCampo(campo, valor) {
    setForm((prev) => {
      const novo = { ...prev, [campo]: valor }

      if (campo === 'modalidade') {
        if (valor === 'Domiciliar') {
          novo.taxa_deslocamento = prev.taxa_deslocamento || 50
        } else {
          novo.taxa_deslocamento = 0
        }
      }

      return novo
    })
  }

  async function salvarLancamento() {
    if (!form.tipo_movimento || !form.servico || !form.valor) {
      alert('Preencha tipo, serviço e valor.')
      return
    }

    const dados = {
      ...form,
      paciente_id: form.paciente_id || null,
      profissional_id: form.profissional_id || null,
      valor: Number(form.valor || 0),
      taxa_deslocamento: Number(form.taxa_deslocamento || 0),
      vencimento: form.vencimento || null,
      data_pagamento: form.data_pagamento || null,
      pago: form.status === 'Pago'
    }

    if (editandoId) {
      const { error } = await supabase
        .from('financeiro')
        .update(dados)
        .eq('id', editandoId)

      if (error) {
        console.log(error)
        alert('Erro ao atualizar lançamento.')
        return
      }

      alert('Lançamento atualizado com sucesso.')
    } else {
      const { error } = await supabase
        .from('financeiro')
        .insert([dados])

      if (error) {
        console.log(error)
        alert('Erro ao salvar lançamento.')
        return
      }

      alert('Lançamento salvo com sucesso.')
    }

    limparFormulario()
    carregarDados()
  }

  function limparFormulario() {
    setEditandoId(null)

    setForm({
      paciente_id: '',
      profissional_id: '',
      tipo_movimento: 'Receita',
      servico: '',
      descricao: '',
      valor: '',
      vencimento: '',
      data_pagamento: '',
      modalidade: 'Clínica',
      taxa_deslocamento: 0,
      status: 'Pendente',
      observacoes: ''
    })
  }

  function editarLancamento(item) {
    setEditandoId(item.id)

    setForm({
      paciente_id: item.paciente_id || '',
      profissional_id: item.profissional_id || '',
      tipo_movimento: item.tipo_movimento || 'Receita',
      servico: item.servico || '',
      descricao: item.descricao || '',
      valor: item.valor || '',
      vencimento: item.vencimento || '',
      data_pagamento: item.data_pagamento || '',
      modalidade: item.modalidade || 'Clínica',
      taxa_deslocamento: item.taxa_deslocamento || 0,
      status: item.status || (item.pago ? 'Pago' : 'Pendente'),
      observacoes: item.observacoes || ''
    })

    window.scrollTo({ top: 0, behavior: 'smooth' })
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
      alert('Erro ao excluir lançamento.')
      return
    }

    carregarDados()
  }

  const lancamentosFiltrados = useMemo(() => {
    return lancamentos.filter((item) => {
      const texto = busca.toLowerCase()

      const bateBusca =
        item.pacientes?.nome?.toLowerCase().includes(texto) ||
        item.servico?.toLowerCase().includes(texto) ||
        item.descricao?.toLowerCase().includes(texto) ||
        item.observacoes?.toLowerCase().includes(texto)

      if (busca && !bateBusca) return false
      if (filtroStatus && item.status !== filtroStatus) return false
      if (filtroTipo && item.tipo_movimento !== filtroTipo) return false

      return true
    })
  }, [lancamentos, busca, filtroStatus, filtroTipo])

  const resumo = useMemo(() => {
    const receitas = lancamentosFiltrados.filter(
      (i) => i.tipo_movimento === 'Receita'
    )

    const despesas = lancamentosFiltrados.filter(
      (i) => i.tipo_movimento === 'Despesa'
    )

    const totalReceitas = receitas.reduce(
      (s, i) => s + Number(i.valor || 0) + Number(i.taxa_deslocamento || 0),
      0
    )

    const totalDespesas = despesas.reduce(
      (s, i) => s + Number(i.valor || 0),
      0
    )

    const recebido = receitas
      .filter((i) => i.status === 'Pago' || i.pago)
      .reduce(
        (s, i) => s + Number(i.valor || 0) + Number(i.taxa_deslocamento || 0),
        0
      )

    const pendente = receitas
      .filter((i) => i.status !== 'Pago' && !i.pago)
      .reduce(
        (s, i) => s + Number(i.valor || 0) + Number(i.taxa_deslocamento || 0),
        0
      )

    return {
      totalReceitas,
      totalDespesas,
      recebido,
      pendente,
      saldo: totalReceitas - totalDespesas
    }
  }, [lancamentosFiltrados])

  return (
    <div style={pagina}>
      <h1>Financeiro</h1>

      <p style={{ color: '#666', marginBottom: 30 }}>
        Controle financeiro integrado a pacientes, serviços, profissionais,
        modalidades e fechamento mensal.
      </p>

      <div style={cardsResumo}>
        <div style={cardResumo}>
          <strong>{dinheiro(resumo.totalReceitas)}</strong>
          <span>Receitas previstas</span>
        </div>

        <div style={cardResumo}>
          <strong>{dinheiro(resumo.recebido)}</strong>
          <span>Recebido</span>
        </div>

        <div style={cardResumo}>
          <strong>{dinheiro(resumo.pendente)}</strong>
          <span>Pendente</span>
        </div>

        <div style={cardResumo}>
          <strong>{dinheiro(resumo.totalDespesas)}</strong>
          <span>Despesas</span>
        </div>

        <div style={cardResumo}>
          <strong>{dinheiro(resumo.saldo)}</strong>
          <span>Saldo previsto</span>
        </div>
      </div>

      <div style={box}>
        <h2>{editandoId ? 'Editar lançamento' : 'Novo lançamento'}</h2>

        <div style={grid}>
          <select
            value={form.tipo_movimento}
            onChange={(e) =>
              atualizarCampo('tipo_movimento', e.target.value)
            }
          >
            <option>Receita</option>
            <option>Despesa</option>
          </select>

          <select
            value={form.paciente_id}
            onChange={(e) =>
              atualizarCampo('paciente_id', e.target.value)
            }
          >
            <option value="">Paciente vinculado</option>
            {pacientes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>

          <select
            value={form.profissional_id}
            onChange={(e) =>
              atualizarCampo('profissional_id', e.target.value)
            }
          >
            <option value="">Profissional vinculado</option>
            {profissionais.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>

          <select
            value={form.servico}
            onChange={(e) =>
              atualizarCampo('servico', e.target.value)
            }
          >
            <option value="">Serviço / categoria</option>
            <option>Fonoaudiologia</option>
            <option>Psicopedagogia</option>
            <option>Psicologia</option>
            <option>ABA</option>
            <option>Psicomotricidade</option>
            <option>Nutrição</option>
            <option>Acompanhamento Pedagógico</option>
            <option>Avaliação Neuropsicológica</option>
            <option>Mapeamento Cerebral</option>
            <option>Neuromodulação</option>
            <option>Reunião</option>
            <option>Visita Escolar</option>
            <option>Material</option>
            <option>Aluguel</option>
            <option>Salário / Repasse</option>
            <option>Marketing</option>
            <option>Impostos</option>
            <option>Outro</option>
          </select>

          <input
            placeholder="Descrição"
            value={form.descricao}
            onChange={(e) =>
              atualizarCampo('descricao', e.target.value)
            }
          />

          <input
            type="number"
            placeholder="Valor"
            value={form.valor}
            onChange={(e) =>
              atualizarCampo('valor', e.target.value)
            }
          />

          <input
            type="date"
            value={form.vencimento}
            onChange={(e) =>
              atualizarCampo('vencimento', e.target.value)
            }
          />

          <input
            type="date"
            value={form.data_pagamento}
            onChange={(e) =>
              atualizarCampo('data_pagamento', e.target.value)
            }
          />

          <select
            value={form.modalidade}
            onChange={(e) =>
              atualizarCampo('modalidade', e.target.value)
            }
          >
            <option>Clínica</option>
            <option>Domiciliar</option>
            <option>Vídeo</option>
          </select>

          <input
            type="number"
            placeholder="Taxa de deslocamento"
            value={form.taxa_deslocamento}
            disabled={form.modalidade !== 'Domiciliar'}
            onChange={(e) =>
              atualizarCampo('taxa_deslocamento', e.target.value)
            }
          />

          <select
            value={form.status}
            onChange={(e) =>
              atualizarCampo('status', e.target.value)
            }
          >
            <option>Pendente</option>
            <option>Pago</option>
            <option>Parcial</option>
            <option>Cancelado</option>
          </select>

          <textarea
            placeholder="Observações"
            value={form.observacoes}
            onChange={(e) =>
              atualizarCampo('observacoes', e.target.value)
            }
            style={{
              gridColumn: '1 / span 2',
              minHeight: 90
            }}
          />

          <button onClick={salvarLancamento} style={botaoPrincipal}>
            {editandoId ? 'Atualizar lançamento' : 'Salvar lançamento'}
          </button>

          <button onClick={limparFormulario} style={botaoSecundario}>
            Limpar
          </button>
        </div>
      </div>

      <div style={box}>
        <h2>Filtros</h2>

        <div style={gridFiltros}>
          <input
            placeholder="Buscar por paciente, serviço ou descrição"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />

          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
          >
            <option value="">Todos os tipos</option>
            <option>Receita</option>
            <option>Despesa</option>
          </select>

          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
          >
            <option value="">Todos os status</option>
            <option>Pendente</option>
            <option>Pago</option>
            <option>Parcial</option>
            <option>Cancelado</option>
          </select>

          <button
            onClick={() => {
              setBusca('')
              setFiltroStatus('')
              setFiltroTipo('')
            }}
          >
            Limpar filtros
          </button>
        </div>
      </div>

      <h2>Lançamentos</h2>

      <div style={{ display: 'grid', gap: 15 }}>
        {lancamentosFiltrados.map((item) => (
          <div key={item.id} style={card}>
            <h3>{item.servico}</h3>

            <p>
              <strong>Tipo:</strong> {item.tipo_movimento}
            </p>

            <p>
              <strong>Paciente:</strong>{' '}
              {item.pacientes?.nome || '-'}
            </p>

            <p>
              <strong>Profissional:</strong>{' '}
              {item.profissionais?.nome || '-'}
            </p>

            <p>
              <strong>Descrição:</strong> {item.descricao || '-'}
            </p>

            <p>
              <strong>Valor:</strong> {dinheiro(item.valor)}
            </p>

            <p>
              <strong>Taxa deslocamento:</strong>{' '}
              {dinheiro(item.taxa_deslocamento)}
            </p>

            <p>
              <strong>Vencimento:</strong>{' '}
              {item.vencimento || '-'}
            </p>

            <p>
              <strong>Data pagamento:</strong>{' '}
              {item.data_pagamento || '-'}
            </p>

            <p>
              <strong>Status:</strong> {item.status}
            </p>

            <p>
              <strong>Modalidade:</strong> {item.modalidade}
            </p>

            <div style={{ display: 'flex', gap: 10, marginTop: 15 }}>
              <button
                onClick={() => editarLancamento(item)}
                style={botaoEditar}
              >
                Editar
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

const pagina = {
  padding: 30,
  fontFamily: 'Arial',
  background: '#f5f7fb',
  minHeight: '100vh'
}

const cardsResumo = {
  display: 'grid',
  gridTemplateColumns: 'repeat(5, 1fr)',
  gap: 15,
  marginBottom: 25
}

const cardResumo = {
  background: '#fff',
  padding: 18,
  borderRadius: 16,
  boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
  display: 'grid',
  gap: 5
}

const box = {
  background: '#fff',
  padding: 25,
  borderRadius: 16,
  boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
  marginBottom: 25
}

const grid = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 15
}

const gridFiltros = {
  display: 'grid',
  gridTemplateColumns: '2fr 1fr 1fr 1fr',
  gap: 15
}

const card = {
  background: '#fff',
  borderRadius: 16,
  padding: 20,
  boxShadow: '0 2px 10px rgba(0,0,0,0.08)'
}

const botaoPrincipal = {
  background: '#0f766e',
  color: '#fff',
  border: 'none',
  borderRadius: 10,
  padding: 14,
  cursor: 'pointer',
  fontWeight: 'bold'
}

const botaoSecundario = {
  background: '#ddd',
  border: 'none',
  borderRadius: 10,
  padding: 14,
  cursor: 'pointer'
}

const botaoEditar = {
  background: '#f59e0b',
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
