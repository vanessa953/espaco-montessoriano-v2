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

  const [agenda, setAgenda] = useState([])
  const [financeiro, setFinanceiro] = useState([])
  const [servicos, setServicos] = useState([])
  const [profissionais, setProfissionais] = useState([])
  const [profValores, setProfValores] = useState([])

  const [mes, setMes] = useState(
    new Date().toISOString().slice(0, 7)
  )

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
        pacientes(nome),
        profissionais(nome)
      `)
      .order('data')

    const { data: financeiroData } = await supabase
      .from('financeiro')
      .select(`
        *,
        pacientes(nome),
        profissionais(nome)
      `)
      .order('created_at', { ascending: false })

    const { data: servicosData } = await supabase
      .from('servicos_valores')
      .select('*')
      .order('nome')

    const { data: profissionaisData } = await supabase
      .from('profissionais')
      .select('*')
      .order('nome')

    const { data: profValoresData } = await supabase
      .from('profissionais_valores')
      .select(`
        *,
        profissionais(nome)
      `)

    setAgenda(agendaData || [])
    setFinanceiro(financeiroData || [])
    setServicos(servicosData || [])
    setProfissionais(profissionaisData || [])
    setProfValores(profValoresData || [])
  }

  useEffect(() => {
    carregarDados()
  }, [])

  async function salvarServico() {
    const { error } = await supabase
      .from('servicos_valores')
      .insert([{
        ...servicoForm,
        valor_cliente: Number(servicoForm.valor_cliente || 0),
        valor_domiciliar: Number(servicoForm.valor_domiciliar || 0)
      }])

    if (error) {
      console.log(error)
      alert('Erro ao salvar serviço')
      return
    }

    alert('Serviço salvo')

    setServicoForm({
      nome: '',
      categoria: '',
      valor_cliente: '',
      valor_domiciliar: '',
      observacoes: ''
    })

    carregarDados()
  }

  async function salvarProfissional() {
    const { error } = await supabase
      .from('profissionais_valores')
      .insert([{
        ...profForm,
        valor_repasse: Number(profForm.valor_repasse || 0),
        percentual_repasse: Number(profForm.percentual_repasse || 0)
      }])

    if (error) {
      console.log(error)
      alert('Erro ao salvar profissional')
      return
    }

    alert('Repasse salvo')

    setProfForm({
      profissional_id: '',
      servico: '',
      valor_repasse: '',
      percentual_repasse: '',
      observacoes: ''
    })

    carregarDados()
  }

  async function salvarDespesa() {
    const { error } = await supabase
      .from('financeiro')
      .insert([{
        tipo_movimento: 'Despesa',
        descricao: despesaForm.descricao,
        categoria_despesa: despesaForm.categoria_despesa,
        fornecedor: despesaForm.fornecedor,
        forma_pagamento: despesaForm.forma_pagamento,
        centro_custo: despesaForm.centro_custo,
        valor: Number(despesaForm.valor || 0),
        vencimento: despesaForm.vencimento || null,
        data_pagamento: despesaForm.data_pagamento || null,
        status: despesaForm.status,
        observacoes: despesaForm.observacoes,
        recorrente: despesaForm.recorrente
      }])

    if (error) {
      console.log(error)
      alert('Erro ao salvar despesa')
      return
    }

    alert('Despesa salva')

    setDespesaForm({
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

    carregarDados()
  }

  function valorServico(servico, modalidade) {
    const encontrado = servicos.find(
      (s) => s.nome === servico
    )

    if (!encontrado) return 0

    if (
      modalidade === 'Domiciliar' &&
      Number(encontrado.valor_domiciliar || 0) > 0
    ) {
      return Number(encontrado.valor_domiciliar || 0)
    }

    return Number(encontrado.valor_cliente || 0)
  }

  function repasseProfissional(
    profissionalId,
    servico,
    valorCliente
  ) {
    const encontrado = profValores.find(
      (p) =>
        p.profissional_id === profissionalId &&
        p.servico === servico
    )

    if (!encontrado) return 0

    if (Number(encontrado.valor_repasse || 0) > 0) {
      return Number(encontrado.valor_repasse || 0)
    }

    if (Number(encontrado.percentual_repasse || 0) > 0) {
      return (
        valorCliente *
        (Number(encontrado.percentual_repasse) / 100)
      )
    }

    return 0
  }

  const atendimentosMes = useMemo(() => {
    return agenda.filter(
      (a) =>
        String(a.data || '').slice(0, 7) === mes
    )
  }, [agenda, mes])

  const relatorioMensal = useMemo(() => {
    return atendimentosMes.map((a) => {
      const valorCliente = valorServico(
        a.servico,
        a.modalidade
      )

      const deslocamento = Number(
        a.taxa_deslocamento || 0
      )

      const totalCliente =
        valorCliente + deslocamento

      const repasse = repasseProfissional(
        a.profissional_id,
        a.servico,
        valorCliente
      )

      const liquido = totalCliente - repasse

      return {
        ...a,
        valorCliente,
        deslocamento,
        totalCliente,
        repasse,
        liquido
      }
    })
  }, [agenda, servicos, profValores, mes])

  const resumo = useMemo(() => {
    const faturamento = relatorioMensal.reduce(
      (s, i) => s + i.totalCliente,
      0
    )

    const repasses = relatorioMensal.reduce(
      (s, i) => s + i.repasse,
      0
    )

    const liquido = relatorioMensal.reduce(
      (s, i) => s + i.liquido,
      0
    )

    const despesas = financeiro
      .filter((f) => f.tipo_movimento === 'Despesa')
      .reduce((s, i) => s + Number(i.valor || 0), 0)

    return {
      faturamento,
      repasses,
      liquido,
      despesas,
      saldoFinal: liquido - despesas
    }
  }, [relatorioMensal, financeiro])

  async function gerarFinanceiroMes() {
    const registros = relatorioMensal.map((r) => ({
      paciente_id: r.paciente_id,
      profissional_id: r.profissional_id,
      tipo_movimento: 'Receita',
      servico: r.servico,
      descricao: `Atendimento automático ${r.data}`,
      valor: r.valorCliente,
      taxa_deslocamento: r.deslocamento,
      modalidade: r.modalidade,
      status: 'Pendente',
      vencimento: r.data
    }))

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

      <div style={abas}>
        <button
          onClick={() => setAba('relatorio')}
          style={aba === 'relatorio' ? abaAtiva : abaBotao}
        >
          Relatório mensal
        </button>

        <button
          onClick={() => setAba('servicos')}
          style={aba === 'servicos' ? abaAtiva : abaBotao}
        >
          Serviços
        </button>

        <button
          onClick={() => setAba('profissionais')}
          style={aba === 'profissionais' ? abaAtiva : abaBotao}
        >
          Profissionais
        </button>

        <button
          onClick={() => setAba('despesas')}
          style={aba === 'despesas' ? abaAtiva : abaBotao}
        >
          Despesas
        </button>
      </div>

      {aba === 'relatorio' && (
        <>
          <div style={box}>
            <h2>Relatório automático</h2>

            <input
              type="month"
              value={mes}
              onChange={(e) => setMes(e.target.value)}
              style={input}
            />

            <div style={cards}>
              <Resumo titulo="Faturamento" valor={dinheiro(resumo.faturamento)} />
              <Resumo titulo="Repasses" valor={dinheiro(resumo.repasses)} />
              <Resumo titulo="Líquido clínica" valor={dinheiro(resumo.liquido)} />
              <Resumo titulo="Despesas" valor={dinheiro(resumo.despesas)} />
              <Resumo titulo="Saldo final" valor={dinheiro(resumo.saldoFinal)} />
            </div>

            <button
              onClick={gerarFinanceiroMes}
              style={botaoPrincipal}
            >
              Gerar financeiro automático
            </button>
          </div>

          <div style={box}>
            <h2>Atendimentos do mês</h2>

            {relatorioMensal.map((r) => (
              <div key={r.id} style={card}>
                <h3>{r.pacientes?.nome}</h3>

                <p><strong>Profissional:</strong> {r.profissionais?.nome}</p>
                <p><strong>Serviço:</strong> {r.servico}</p>
                <p><strong>Modalidade:</strong> {r.modalidade}</p>
                <p><strong>Valor:</strong> {dinheiro(r.valorCliente)}</p>
                <p><strong>Repasse:</strong> {dinheiro(r.repasse)}</p>
                <p><strong>Líquido:</strong> {dinheiro(r.liquido)}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {aba === 'servicos' && (
        <div style={box}>
          <h2>Cadastro de serviços</h2>

          <div style={grid}>
            <input placeholder="Nome serviço" value={servicoForm.nome} onChange={(e) => setServicoForm({ ...servicoForm, nome: e.target.value })} />
            <input placeholder="Categoria" value={servicoForm.categoria} onChange={(e) => setServicoForm({ ...servicoForm, categoria: e.target.value })} />
            <input type="number" placeholder="Valor cliente" value={servicoForm.valor_cliente} onChange={(e) => setServicoForm({ ...servicoForm, valor_cliente: e.target.value })} />
            <input type="number" placeholder="Valor domiciliar" value={servicoForm.valor_domiciliar} onChange={(e) => setServicoForm({ ...servicoForm, valor_domiciliar: e.target.value })} />

            <textarea
              placeholder="Observações"
              value={servicoForm.observacoes}
              onChange={(e) => setServicoForm({ ...servicoForm, observacoes: e.target.value })}
              style={{
                gridColumn: '1 / span 2',
                minHeight: 100
              }}
            />

            <button onClick={salvarServico} style={botaoPrincipal}>
              Salvar serviço
            </button>
          </div>

          {servicos.map((s) => (
            <div key={s.id} style={card}>
              <h3>{s.nome}</h3>
              <p><strong>Categoria:</strong> {s.categoria}</p>
              <p><strong>Cliente:</strong> {dinheiro(s.valor_cliente)}</p>
              <p><strong>Domiciliar:</strong> {dinheiro(s.valor_domiciliar)}</p>
            </div>
          ))}
        </div>
      )}

      {aba === 'profissionais' && (
        <div style={box}>
          <h2>Repasse profissionais</h2>

          <div style={grid}>
            <select
              value={profForm.profissional_id}
              onChange={(e) =>
                setProfForm({
                  ...profForm,
                  profissional_id: e.target.value
                })
              }
            >
              <option value="">Selecione profissional</option>

              {profissionais.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>

            <select
              value={profForm.servico}
              onChange={(e) =>
                setProfForm({
                  ...profForm,
                  servico: e.target.value
                })
              }
            >
              <option value="">Selecione serviço</option>

              {servicos.map((s) => (
                <option key={s.id}>
                  {s.nome}
                </option>
              ))}
            </select>

            <input
              type="number"
              placeholder="Valor fixo"
              value={profForm.valor_repasse}
              onChange={(e) =>
                setProfForm({
                  ...profForm,
                  valor_repasse: e.target.value
                })
              }
            />

            <input
              type="number"
              placeholder="% repasse"
              value={profForm.percentual_repasse}
              onChange={(e) =>
                setProfForm({
                  ...profForm,
                  percentual_repasse: e.target.value
                })
              }
            />

            <textarea
              placeholder="Observações"
              value={profForm.observacoes}
              onChange={(e) =>
                setProfForm({
                  ...profForm,
                  observacoes: e.target.value
                })
              }
              style={{
                gridColumn: '1 / span 2',
                minHeight: 100
              }}
            />

            <button
              onClick={salvarProfissional}
              style={botaoPrincipal}
            >
              Salvar repasse
            </button>
          </div>

          {profValores.map((p) => (
            <div key={p.id} style={card}>
              <h3>{p.profissionais?.nome}</h3>

              <p><strong>Serviço:</strong> {p.servico}</p>
              <p><strong>Valor:</strong> {dinheiro(p.valor_repasse)}</p>
              <p><strong>%:</strong> {p.percentual_repasse}%</p>
            </div>
          ))}
        </div>
      )}

      {aba === 'despesas' && (
        <div style={box}>
          <h2>Despesas e outros pagamentos</h2>

          <div style={grid}>
            <input
              placeholder="Descrição"
              value={despesaForm.descricao}
              onChange={(e) =>
                setDespesaForm({
                  ...despesaForm,
                  descricao: e.target.value
                })
              }
            />

            <select
              value={despesaForm.categoria_despesa}
              onChange={(e) =>
                setDespesaForm({
                  ...despesaForm,
                  categoria_despesa: e.target.value
                })
              }
            >
              <option value="">Categoria</option>
              <option>Aluguel</option>
              <option>Impostos</option>
              <option>Marketing</option>
              <option>Material</option>
              <option>Software</option>
              <option>Manutenção</option>
              <option>Salários</option>
              <option>Repasse</option>
              <option>Contador</option>
              <option>Outros</option>
            </select>

            <input
              placeholder="Fornecedor"
              value={despesaForm.fornecedor}
              onChange={(e) =>
                setDespesaForm({
                  ...despesaForm,
                  fornecedor: e.target.value
                })
              }
            />

            <input
              placeholder="Centro de custo"
              value={despesaForm.centro_custo}
              onChange={(e) =>
                setDespesaForm({
                  ...despesaForm,
                  centro_custo: e.target.value
                })
              }
            />

            <input
              type="number"
              placeholder="Valor"
              value={despesaForm.valor}
              onChange={(e) =>
                setDespesaForm({
                  ...despesaForm,
                  valor: e.target.value
                })
              }
            />

            <select
              value={despesaForm.forma_pagamento}
              onChange={(e) =>
                setDespesaForm({
                  ...despesaForm,
                  forma_pagamento: e.target.value
                })
              }
            >
              <option value="">Forma pagamento</option>
              <option>PIX</option>
              <option>Dinheiro</option>
              <option>Cartão</option>
              <option>Boleto</option>
              <option>Transferência</option>
            </select>

            <input
              type="date"
              value={despesaForm.vencimento}
              onChange={(e) =>
                setDespesaForm({
                  ...despesaForm,
                  vencimento: e.target.value
                })
              }
            />

            <input
              type="date"
              value={despesaForm.data_pagamento}
              onChange={(e) =>
                setDespesaForm({
                  ...despesaForm,
                  data_pagamento: e.target.value
                })
              }
            />

            <textarea
              placeholder="Observações"
              value={despesaForm.observacoes}
              onChange={(e) =>
                setDespesaForm({
                  ...despesaForm,
                  observacoes: e.target.value
                })
              }
              style={{
                gridColumn: '1 / span 2',
                minHeight: 100
              }}
            />

            <label>
              <input
                type="checkbox"
                checked={despesaForm.recorrente}
                onChange={(e) =>
                  setDespesaForm({
                    ...despesaForm,
                    recorrente: e.target.checked
                  })
                }
              />{' '}
              Pagamento recorrente
            </label>

            <button
              onClick={salvarDespesa}
              style={botaoPrincipal}
            >
              Salvar despesa
            </button>
          </div>

          {financeiro
            .filter((f) => f.tipo_movimento === 'Despesa')
            .map((f) => (
              <div key={f.id} style={card}>
                <h3>{f.descricao}</h3>

                <p><strong>Categoria:</strong> {f.categoria_despesa}</p>
                <p><strong>Fornecedor:</strong> {f.fornecedor}</p>
                <p><strong>Valor:</strong> {dinheiro(f.valor)}</p>
                <p><strong>Status:</strong> {f.status}</p>
              </div>
            ))}
        </div>
      )}
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

const abas = {
  display: 'flex',
  gap: 10,
  marginBottom: 20,
  flexWrap: 'wrap'
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

const cards = {
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
  padding: 18,
  borderRadius: 14,
  border: '1px solid #e5e7eb',
  marginTop: 15
}

const grid = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 15
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
