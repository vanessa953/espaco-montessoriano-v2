import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

function dinheiro(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  })
}

export default function Financeiro() {
  const [aba, setAba] = useState('relatorio')
  const [pacientes, setPacientes] = useState([])
  const [profissionais, setProfissionais] = useState([])
  const [agenda, setAgenda] = useState([])
  const [servicos, setServicos] = useState([])
  const [profValores, setProfValores] = useState([])
  const [financeiro, setFinanceiro] = useState([])
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7))

  const [servicoForm, setServicoForm] = useState({
    nome: '',
    categoria: '',
    valor_cliente: '',
    valor_domiciliar: '',
    observacoes: ''
  })

  const [profForm, setProfForm] = useState({
    profissional_id: '',
    servico: '',
    valor_repasse: '',
    percentual_repasse: '',
    observacoes: ''
  })

  async function carregarDados() {
    const { data: pacientesData } = await supabase.from('pacientes').select('id, nome').order('nome')
    const { data: profissionaisData } = await supabase.from('profissionais').select('id, nome').order('nome')
    const { data: servicosData } = await supabase.from('servicos_valores').select('*').order('nome')
    const { data: profValoresData } = await supabase.from('profissionais_valores').select('*, profissionais(nome)').order('created_at', { ascending: false })
    const { data: agendaData } = await supabase.from('agenda').select('*, pacientes(nome), profissionais(nome)').order('data', { ascending: true })
    const { data: financeiroData } = await supabase.from('financeiro').select('*, pacientes(nome), profissionais(nome)').order('created_at', { ascending: false })

    setPacientes(pacientesData || [])
    setProfissionais(profissionaisData || [])
    setServicos(servicosData || [])
    setProfValores(profValoresData || [])
    setAgenda(agendaData || [])
    setFinanceiro(financeiroData || [])
  }

  useEffect(() => {
    carregarDados()
  }, [])

  async function salvarServico() {
    if (!servicoForm.nome || !servicoForm.valor_cliente) {
      alert('Preencha nome do serviço e valor ao cliente.')
      return
    }

    const { error } = await supabase.from('servicos_valores').insert([{
      ...servicoForm,
      valor_cliente: Number(servicoForm.valor_cliente || 0),
      valor_domiciliar: Number(servicoForm.valor_domiciliar || 0)
    }])

    if (error) {
      console.log(error)
      alert('Erro ao salvar serviço.')
      return
    }

    setServicoForm({
      nome: '',
      categoria: '',
      valor_cliente: '',
      valor_domiciliar: '',
      observacoes: ''
    })

    carregarDados()
  }

  async function salvarValorProfissional() {
    if (!profForm.profissional_id || !profForm.servico) {
      alert('Selecione profissional e serviço.')
      return
    }

    const { error } = await supabase.from('profissionais_valores').insert([{
      ...profForm,
      valor_repasse: Number(profForm.valor_repasse || 0),
      percentual_repasse: Number(profForm.percentual_repasse || 0)
    }])

    if (error) {
      console.log(error)
      alert('Erro ao salvar valor do profissional.')
      return
    }

    setProfForm({
      profissional_id: '',
      servico: '',
      valor_repasse: '',
      percentual_repasse: '',
      observacoes: ''
    })

    carregarDados()
  }

  function valorServico(nomeServico, modalidade) {
    const item = servicos.find((s) => s.nome === nomeServico)

    if (!item) return 0

    if (modalidade === 'Domiciliar' && Number(item.valor_domiciliar || 0) > 0) {
      return Number(item.valor_domiciliar || 0)
    }

    return Number(item.valor_cliente || 0)
  }

  function valorProfissional(profissionalId, servico, valorCliente) {
    const item = profValores.find(
      (p) => p.profissional_id === profissionalId && p.servico === servico
    )

    if (!item) return 0

    if (Number(item.valor_repasse || 0) > 0) {
      return Number(item.valor_repasse || 0)
    }

    if (Number(item.percentual_repasse || 0) > 0) {
      return valorCliente * (Number(item.percentual_repasse) / 100)
    }

    return 0
  }

  const atendimentosMes = useMemo(() => {
    return agenda.filter((a) => String(a.data || '').slice(0, 7) === mes)
  }, [agenda, mes])

  const relatorioMensal = useMemo(() => {
    return atendimentosMes.map((a) => {
      const valorCliente = valorServico(a.servico, a.modalidade)
      const taxa = Number(a.taxa_deslocamento || 0)
      const totalCliente = valorCliente + taxa
      const repasse = valorProfissional(a.profissional_id, a.servico, valorCliente)
      const liquidoClinica = totalCliente - repasse

      return {
        ...a,
        valorCliente,
        taxa,
        totalCliente,
        repasse,
        liquidoClinica
      }
    })
  }, [atendimentosMes, servicos, profValores])

  const resumo = useMemo(() => {
    const faturamento = relatorioMensal.reduce((s, i) => s + i.totalCliente, 0)
    const repasses = relatorioMensal.reduce((s, i) => s + i.repasse, 0)
    const deslocamentos = relatorioMensal.reduce((s, i) => s + i.taxa, 0)
    const liquido = relatorioMensal.reduce((s, i) => s + i.liquidoClinica, 0)

    return {
      atendimentos: relatorioMensal.length,
      faturamento,
      repasses,
      deslocamentos,
      liquido
    }
  }, [relatorioMensal])

  async function gerarFinanceiroDoMes() {
    if (!relatorioMensal.length) {
      alert('Não há atendimentos para gerar financeiro.')
      return
    }

    const registros = relatorioMensal.map((item) => ({
      paciente_id: item.paciente_id || null,
      profissional_id: item.profissional_id || null,
      tipo_movimento: 'Receita',
      servico: item.servico || item.titulo || 'Atendimento',
      descricao: `Gerado automaticamente pela agenda - ${item.data} ${item.horario}`,
      valor: item.valorCliente,
      taxa_deslocamento: item.taxa,
      modalidade: item.modalidade,
      vencimento: item.data || null,
      status: 'Pendente',
      observacoes: `Paciente: ${item.pacientes?.nome || '-'} | Profissional: ${item.profissionais?.nome || '-'}`
    }))

    const { error } = await supabase.from('financeiro').insert(registros)

    if (error) {
      console.log(error)
      alert('Erro ao gerar financeiro.')
      return
    }

    alert('Financeiro do mês gerado com sucesso.')
    carregarDados()
  }

  return (
    <div style={pagina}>
      <h1>Financeiro Integrado</h1>

      <p style={{ color: '#666' }}>
        Serviços, valores, profissionais, agenda e relatório financeiro mensal automático.
      </p>

      <div style={abas}>
        <button onClick={() => setAba('relatorio')} style={aba === 'relatorio' ? abaAtiva : abaBotao}>Relatório mensal</button>
        <button onClick={() => setAba('servicos')} style={aba === 'servicos' ? abaAtiva : abaBotao}>Serviços e valores</button>
        <button onClick={() => setAba('profissionais')} style={aba === 'profissionais' ? abaAtiva : abaBotao}>Valores profissionais</button>
        <button onClick={() => setAba('lancamentos')} style={aba === 'lancamentos' ? abaAtiva : abaBotao}>Lançamentos</button>
      </div>

      {aba === 'relatorio' && (
        <>
          <div style={box}>
            <h2>Relatório automático do mês</h2>

            <input
              type="month"
              value={mes}
              onChange={(e) => setMes(e.target.value)}
              style={input}
            />

            <div style={cardsResumo}>
              <Card titulo="Atendimentos" valor={resumo.atendimentos} />
              <Card titulo="Faturamento" valor={dinheiro(resumo.faturamento)} />
              <Card titulo="Repasses" valor={dinheiro(resumo.repasses)} />
              <Card titulo="Deslocamentos" valor={dinheiro(resumo.deslocamentos)} />
              <Card titulo="Líquido clínica" valor={dinheiro(resumo.liquido)} />
            </div>

            <button onClick={gerarFinanceiroDoMes} style={botaoPrincipal}>
              Gerar financeiro automático do mês
            </button>
          </div>

          <div style={box}>
            <h2>Atendimentos integrados da agenda</h2>

            <div style={{ display: 'grid', gap: 12 }}>
              {relatorioMensal.map((item) => (
                <div key={item.id} style={card}>
                  <h3>{item.pacientes?.nome || 'Paciente não informado'}</h3>
                  <p><strong>Data:</strong> {item.data} às {item.horario}</p>
                  <p><strong>Profissional:</strong> {item.profissionais?.nome || '-'}</p>
                  <p><strong>Serviço:</strong> {item.servico}</p>
                  <p><strong>Modalidade:</strong> {item.modalidade}</p>
                  <p><strong>Valor ao cliente:</strong> {dinheiro(item.valorCliente)}</p>
                  <p><strong>Taxa deslocamento:</strong> {dinheiro(item.taxa)}</p>
                  <p><strong>Total cliente:</strong> {dinheiro(item.totalCliente)}</p>
                  <p><strong>Repasse profissional:</strong> {dinheiro(item.repasse)}</p>
                  <p><strong>Líquido clínica:</strong> {dinheiro(item.liquidoClinica)}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {aba === 'servicos' && (
        <>
          <div style={box}>
            <h2>Cadastro de serviços prestados</h2>

            <div style={grid}>
              <input placeholder="Nome do serviço" value={servicoForm.nome} onChange={(e) => setServicoForm({ ...servicoForm, nome: e.target.value })} />
              <input placeholder="Categoria" value={servicoForm.categoria} onChange={(e) => setServicoForm({ ...servicoForm, categoria: e.target.value })} />
              <input type="number" placeholder="Valor ao cliente" value={servicoForm.valor_cliente} onChange={(e) => setServicoForm({ ...servicoForm, valor_cliente: e.target.value })} />
              <input type="number" placeholder="Valor domiciliar" value={servicoForm.valor_domiciliar} onChange={(e) => setServicoForm({ ...servicoForm, valor_domiciliar: e.target.value })} />
              <textarea placeholder="Observações" value={servicoForm.observacoes} onChange={(e) => setServicoForm({ ...servicoForm, observacoes: e.target.value })} style={{ gridColumn: '1 / span 2', minHeight: 90 }} />

              <button onClick={salvarServico} style={botaoPrincipal}>
                Salvar serviço
              </button>
            </div>
          </div>

          <div style={box}>
            <h2>Serviços cadastrados</h2>

            {servicos.map((s) => (
              <div key={s.id} style={card}>
                <h3>{s.nome}</h3>
                <p><strong>Categoria:</strong> {s.categoria}</p>
                <p><strong>Valor cliente:</strong> {dinheiro(s.valor_cliente)}</p>
                <p><strong>Valor domiciliar:</strong> {dinheiro(s.valor_domiciliar)}</p>
                <p><strong>Observações:</strong> {s.observacoes}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {aba === 'profissionais' && (
        <>
          <div style={box}>
            <h2>Valores dos profissionais</h2>

            <div style={grid}>
              <select value={profForm.profissional_id} onChange={(e) => setProfForm({ ...profForm, profissional_id: e.target.value })}>
                <option value="">Selecione o profissional</option>
                {profissionais.map((p) => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </select>

              <select value={profForm.servico} onChange={(e) => setProfForm({ ...profForm, servico: e.target.value })}>
                <option value="">Selecione o serviço</option>
                {servicos.map((s) => (
                  <option key={s.id}>{s.nome}</option>
                ))}
              </select>

              <input type="number" placeholder="Valor fixo de repasse" value={profForm.valor_repasse} onChange={(e) => setProfForm({ ...profForm, valor_repasse: e.target.value })} />
              <input type="number" placeholder="% de repasse" value={profForm.percentual_repasse} onChange={(e) => setProfForm({ ...profForm, percentual_repasse: e.target.value })} />

              <textarea placeholder="Observações" value={profForm.observacoes} onChange={(e) => setProfForm({ ...profForm, observacoes: e.target.value })} style={{ gridColumn: '1 / span 2', minHeight: 90 }} />

              <button onClick={salvarValorProfissional} style={botaoPrincipal}>
                Salvar valor profissional
              </button>
            </div>
          </div>

          <div style={box}>
            <h2>Repasses cadastrados</h2>

            {profValores.map((p) => (
              <div key={p.id} style={card}>
                <h3>{p.profissionais?.nome || '-'}</h3>
                <p><strong>Serviço:</strong> {p.servico}</p>
                <p><strong>Valor fixo:</strong> {dinheiro(p.valor_repasse)}</p>
                <p><strong>Percentual:</strong> {p.percentual_repasse || 0}%</p>
                <p><strong>Observações:</strong> {p.observacoes}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {aba === 'lancamentos' && (
        <div style={box}>
          <h2>Lançamentos financeiros</h2>

          {financeiro.map((f) => (
            <div key={f.id} style={card}>
              <h3>{f.servico}</h3>
              <p><strong>Paciente:</strong> {f.pacientes?.nome || '-'}</p>
              <p><strong>Profissional:</strong> {f.profissionais?.nome || '-'}</p>
              <p><strong>Valor:</strong> {dinheiro(f.valor)}</p>
              <p><strong>Taxa:</strong> {dinheiro(f.taxa_deslocamento)}</p>
              <p><strong>Status:</strong> {f.status}</p>
              <p><strong>Vencimento:</strong> {f.vencimento || '-'}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Card({ titulo, valor }) {
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

const abas = {
  display: 'flex',
  gap: 10,
  flexWrap: 'wrap',
  marginBottom: 20
}

const abaBotao = {
  padding: 10,
  borderRadius: 10,
  border: '1px solid #ccc',
  background: '#fff',
  cursor: 'pointer'
}

const abaAtiva = {
  ...abaBotao,
  background: '#0f766e',
  color: '#fff'
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

const cardsResumo = {
  display: 'grid',
  gridTemplateColumns: 'repeat(5, 1fr)',
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
  borderRadius: 14,
  padding: 18,
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
  fontWeight: 'bold'
}
