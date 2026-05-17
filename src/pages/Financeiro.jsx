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
  const [aba, setAba] = useState('dashboard')
  const [agenda, setAgenda] = useState([])
  const [financeiro, setFinanceiro] = useState([])
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7))

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
    const { data: agendaData, error: agendaError } = await supabase
      .from('agenda')
      .select(`
        *,
        pacientes(nome, responsavel, telefone),
        profissionais(nome),
        agenda_pacientes(
          id,
          paciente_id,
          valor_cobrado,
          pacientes(nome, responsavel, telefone)
        )
      `)
      .order('data')

    if (agendaError) {
      console.log(agendaError)
    }

    const { data: financeiroData, error: financeiroError } = await supabase
      .from('financeiro')
      .select(`
        *,
        pacientes(nome, responsavel, telefone),
        profissionais(nome)
      `)
      .order('created_at', { ascending: false })

    if (financeiroError) {
      console.log(financeiroError)
    }

    setAgenda(agendaData || [])
    setFinanceiro(financeiroData || [])
  }

  useEffect(() => {
    carregarDados()
  }, [])

  const agendaMes = useMemo(() => {
    return agenda.filter((item) => String(item.data || '').slice(0, 7) === mes)
  }, [agenda, mes])

  const despesasMes = useMemo(() => {
    return financeiro.filter((item) => {
      const competencia = item.competencia || String(item.vencimento || item.created_at || '').slice(0, 7)
      return item.tipo_movimento === 'Despesa' && competencia === mes
    })
  }, [financeiro, mes])

  const fechamentoFamilias = useMemo(() => {
    const mapa = {}

    agendaMes.forEach((item) => {
      const ehGrupo = item.tipo_atendimento === 'Grupo'
      const pacientesGrupo = item.agenda_pacientes || []

      if (ehGrupo && pacientesGrupo.length > 0) {
        pacientesGrupo.forEach((ap) => {
          const pacienteId = ap.paciente_id
          const pacienteNome = ap.pacientes?.nome || 'Paciente não informado'

          if (!mapa[pacienteId]) {
            mapa[pacienteId] = {
              paciente_id: pacienteId,
              paciente: pacienteNome,
              responsavel: ap.pacientes?.responsavel || '',
              telefone: ap.pacientes?.telefone || '',
              sessoes: [],
              total: 0
            }
          }

          const valor = Number(ap.valor_cobrado || item.valor_por_paciente || 0)

          mapa[pacienteId].sessoes.push({
            data: item.data,
            horario: item.horario,
            servico: item.servico,
            modalidade: item.modalidade,
            status: item.status,
            tipo: item.tipo_atendimento,
            valor
          })

          mapa[pacienteId].total += valor
        })

        return
      }

      const pacienteId = item.paciente_id || item.id
      const pacienteNome = item.pacientes?.nome || 'Paciente não informado'

      if (!mapa[pacienteId]) {
        mapa[pacienteId] = {
          paciente_id: item.paciente_id,
          paciente: pacienteNome,
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
        tipo: item.tipo_atendimento,
        valor
      })

      mapa[pacienteId].total += valor
    })

    return Object.values(mapa)
  }, [agendaMes])

  const pagamentoProfissionais = useMemo(() => {
    const mapa = {}

    agendaMes.forEach((item) => {
      const profissionalId = item.profissional_id || 'sem-profissional'
      const profissionalNome = item.profissionais?.nome || 'Profissional não informado'

      if (!mapa[profissionalId]) {
        mapa[profissionalId] = {
          profissional_id: item.profissional_id,
          profissional: profissionalNome,
          atendimentos: [],
          totalHoras: 0,
          totalRepasse: 0
        }
      }

      const horas = Number(item.duracao_horas || 1)
      const repasse = Number(item.valor_total_profissional || 0)

      mapa[profissionalId].atendimentos.push({
        data: item.data,
        horario: item.horario,
        servico: item.servico,
        tipo: item.tipo_atendimento,
        horas,
        repasse
      })

      mapa[profissionalId].totalHoras += horas
      mapa[profissionalId].totalRepasse += repasse
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
      atendimentos: agendaMes.length,
      familias: fechamentoFamilias.length,
      profissionais: pagamentoProfissionais.length,
      receitaFamilias,
      repasseProfissionais,
      despesas,
      lucroBruto: receitaFamilias - repasseProfissionais,
      lucroLiquido: receitaFamilias - repasseProfissionais - despesas
    }
  }, [agendaMes, fechamentoFamilias, pagamentoProfissionais, despesasMes])

  const relatorioIA = useMemo(() => {
    const profissionalMaiorRepasse = [...pagamentoProfissionais].sort(
      (a, b) => b.totalRepasse - a.totalRepasse
    )[0]

    const familiaMaiorFaturamento = [...fechamentoFamilias].sort(
      (a, b) => b.total - a.total
    )[0]

    const despesasAltas = resumo.despesas > resumo.receitaFamilias * 0.4
    const repassesAltos = resumo.repasseProfissionais > resumo.receitaFamilias * 0.65
    const lucroBaixo = resumo.lucroLiquido < resumo.receitaFamilias * 0.25

    return `RELATÓRIO MENSAL INTELIGENTE — ${mes}

VISÃO GERAL

Total de atendimentos: ${resumo.atendimentos}
Famílias atendidas: ${resumo.familias}
Profissionais com atendimentos: ${resumo.profissionais}

Receita das famílias: ${dinheiro(resumo.receitaFamilias)}
Repasses profissionais: ${dinheiro(resumo.repasseProfissionais)}
Despesas gerais: ${dinheiro(resumo.despesas)}
Lucro bruto: ${dinheiro(resumo.lucroBruto)}
Lucro líquido: ${dinheiro(resumo.lucroLiquido)}

ANÁLISE AUTOMÁTICA

${resumo.receitaFamilias > 0 ? 'Houve movimentação financeira no mês analisado.' : 'Não houve receita registrada no mês analisado.'}

${despesasAltas ? 'As despesas estão elevadas em relação ao faturamento.' : 'As despesas estão proporcionalmente controladas.'}

${repassesAltos ? 'Os repasses profissionais representam uma parcela alta da receita. Recomenda-se revisar margens por serviço.' : 'Os repasses profissionais estão dentro de uma proporção administrável.'}

${lucroBaixo ? 'O lucro líquido ficou abaixo da margem ideal. É importante observar custos, faltas e composição da agenda.' : 'O lucro líquido apresenta margem positiva para o período.'}

${profissionalMaiorRepasse ? `Profissional com maior repasse: ${profissionalMaiorRepasse.profissional} — ${dinheiro(profissionalMaiorRepasse.totalRepasse)}.` : ''}

${familiaMaiorFaturamento ? `Família/paciente com maior faturamento: ${familiaMaiorFaturamento.paciente} — ${dinheiro(familiaMaiorFaturamento.total)}.` : ''}

PONTOS DE ATENÇÃO

- Verificar atendimentos cancelados, faltas e reposições.
- Conferir se todos os atendimentos realizados foram lançados na agenda.
- Revisar se os valores de família e profissional estão corretos nos cadastros.
- Avaliar margem dos atendimentos em grupo.
- Monitorar despesas recorrentes.
- Conferir repasses antes do pagamento dos profissionais.

SUGESTÕES PARA O PRÓXIMO MÊS

- Priorizar agenda com melhor aproveitamento de horários.
- Ampliar atendimentos em grupo quando clinicamente adequado.
- Confirmar sessões pelo WhatsApp para reduzir faltas.
- Revisar serviços com baixa margem.
- Separar despesas fixas e variáveis.
- Acompanhar previsão financeira pela agenda.
- Manter atualização dos valores dos profissionais e dos serviços.

CONCLUSÃO

${resumo.lucroLiquido > 0 ? 'O mês apresentou resultado financeiro positivo.' : 'O mês exige atenção financeira e revisão de custos/receitas.'}

Este relatório é uma análise automática baseada nos registros do sistema e deve ser conferido pela administração antes de decisões financeiras.`
  }, [mes, resumo, pagamentoProfissionais, fechamentoFamilias])

  async function salvarDespesa() {
    if (!despesaForm.descricao || !despesaForm.valor) {
      alert('Preencha descrição e valor.')
      return
    }

    const { error } = await supabase.from('financeiro').insert([
      {
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
        recorrente: despesaForm.recorrente,
        competencia: mes
      }
    ])

    if (error) {
      console.log(error)
      alert('Erro ao salvar despesa.')
      return
    }

    alert('Despesa salva com sucesso.')

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

  async function gerarFinanceiroAutomatico() {
    if (!agendaMes.length) {
      alert('Não há atendimentos no mês selecionado.')
      return
    }

    const registros = []

    agendaMes.forEach((item) => {
      const ehGrupo = item.tipo_atendimento === 'Grupo'
      const pacientesGrupo = item.agenda_pacientes || []

      if (ehGrupo && pacientesGrupo.length > 0) {
        pacientesGrupo.forEach((ap) => {
          registros.push({
            paciente_id: ap.paciente_id || null,
            profissional_id: item.profissional_id || null,
            tipo_movimento: 'Receita',
            servico: item.servico,
            descricao: `Receita automática - ${item.servico} - ${dataBR(item.data)} ${item.horario}`,
            valor: Number(ap.valor_cobrado || item.valor_por_paciente || 0),
            valor_familia: Number(ap.valor_cobrado || item.valor_por_paciente || 0),
            valor_profissional: Number(item.valor_total_profissional || 0),
            lucro_clinica: Number(item.lucro_clinica || 0),
            taxa_deslocamento: Number(item.taxa_deslocamento || 0),
            modalidade: item.modalidade,
            status: 'Pendente',
            vencimento: item.data || null,
            competencia: mes,
            quantidade_sessoes: 1,
            previsao: false,
            observacoes: `Gerado pela agenda. Atendimento em grupo.`
          })
        })
      } else {
        registros.push({
          paciente_id: item.paciente_id || null,
          profissional_id: item.profissional_id || null,
          tipo_movimento: 'Receita',
          servico: item.servico,
          descricao: `Receita automática - ${item.servico} - ${dataBR(item.data)} ${item.horario}`,
          valor: Number(item.valor_por_paciente || item.valor_total_familia || 0),
          valor_familia: Number(item.valor_total_familia || item.valor_por_paciente || 0),
          valor_profissional: Number(item.valor_total_profissional || 0),
          lucro_clinica: Number(item.lucro_clinica || 0),
          taxa_deslocamento: Number(item.taxa_deslocamento || 0),
          modalidade: item.modalidade,
          status: 'Pendente',
          vencimento: item.data || null,
          competencia: mes,
          quantidade_sessoes: 1,
          previsao: false,
          observacoes: `Gerado pela agenda.`
        })
      }

      if (Number(item.valor_total_profissional || 0) > 0) {
        registros.push({
          profissional_id: item.profissional_id || null,
          tipo_movimento: 'Despesa',
          servico: item.servico,
          descricao: `Repasse profissional - ${item.profissionais?.nome || '-'} - ${dataBR(item.data)}`,
          valor: Number(item.valor_total_profissional || 0),
          valor_profissional: Number(item.valor_total_profissional || 0),
          categoria_despesa: 'Repasse profissional',
          status: 'Pendente',
          vencimento: item.data || null,
          competencia: mes,
          quantidade_sessoes: 1,
          previsao: false,
          observacoes: `Repasse automático pela agenda.`
        })
      }
    })

    const { error } = await supabase.from('financeiro').insert(registros)

    if (error) {
      console.log(error)
      alert('Erro ao gerar financeiro automático.')
      return
    }

    alert('Financeiro automático gerado com sucesso.')
    carregarDados()
  }

  function textoWhatsAppFamilia(item) {
    const linhas = item.sessoes.map((sessao) => {
      return `• ${dataBR(sessao.data)} às ${sessao.horario} — ${sessao.servico} — ${dinheiro(sessao.valor)}`
    })

    return `Olá! 😊
Fechamento do mês — ${item.paciente}

Responsável: ${item.responsavel || '-'}

Atendimentos:
${linhas.join('\n')}

Total do mês: ${dinheiro(item.total)}

PIX (CNPJ):
O pagamento deverá ser realizado até o 5º dia útil.

Qualquer dúvida, estou à disposição. 💛`
  }

  function copiarFechamentoFamilia(item) {
    navigator.clipboard.writeText(textoWhatsAppFamilia(item))
    alert('Fechamento copiado.')
  }

  function abrirWhatsAppFamilia(item) {
    if (!item.telefone) {
      alert('Paciente sem telefone cadastrado.')
      return
    }

    const telefone = item.telefone.replace(/\D/g, '')
    const mensagem = encodeURIComponent(textoWhatsAppFamilia(item))
    window.open(`https://wa.me/55${telefone}?text=${mensagem}`, '_blank')
  }

  return (
    <div style={pagina}>
      <h1>Financeiro Inteligente</h1>

      <p style={{ color: '#666' }}>
        Fechamento mensal, pagamento de profissionais, despesas, dashboard e relatório inteligente.
      </p>

      <div style={box}>
        <h2>Mês de referência</h2>

        <input
          type="month"
          value={mes}
          onChange={(e) => setMes(e.target.value)}
          style={input}
        />
      </div>

      <div style={abas}>
        <button onClick={() => setAba('dashboard')} style={aba === 'dashboard' ? abaAtiva : abaBotao}>
          Dashboard
        </button>

        <button onClick={() => setAba('fechamento')} style={aba === 'fechamento' ? abaAtiva : abaBotao}>
          Fechamento famílias
        </button>

        <button onClick={() => setAba('profissionais')} style={aba === 'profissionais' ? abaAtiva : abaBotao}>
          Pagamento profissionais
        </button>

        <button onClick={() => setAba('despesas')} style={aba === 'despesas' ? abaAtiva : abaBotao}>
          Despesas
        </button>

        <button onClick={() => setAba('ia')} style={aba === 'ia' ? abaAtiva : abaBotao}>
          Relatório IA
        </button>
      </div>

      {aba === 'dashboard' && (
        <div style={box}>
          <h2>Resumo executivo</h2>

          <div style={cards}>
            <Resumo titulo="Atendimentos" valor={resumo.atendimentos} />
            <Resumo titulo="Famílias" valor={resumo.familias} />
            <Resumo titulo="Receita famílias" valor={dinheiro(resumo.receitaFamilias)} />
            <Resumo titulo="Repasses" valor={dinheiro(resumo.repasseProfissionais)} />
            <Resumo titulo="Despesas" valor={dinheiro(resumo.despesas)} />
            <Resumo titulo="Lucro líquido" valor={dinheiro(resumo.lucroLiquido)} />
          </div>

          <button onClick={gerarFinanceiroAutomatico} style={botaoPrincipal}>
            Gerar financeiro automático do mês
          </button>

          <button onClick={() => window.print()} style={botaoSecundario}>
            Imprimir / Salvar PDF
          </button>
        </div>
      )}

      {aba === 'fechamento' && (
        <div style={box}>
          <h2>Fechamento automático das famílias</h2>

          {fechamentoFamilias.map((item) => (
            <div key={item.paciente_id || item.paciente} style={card}>
              <h3>{item.paciente}</h3>

              <p><strong>Responsável:</strong> {item.responsavel || '-'}</p>
              <p><strong>Telefone:</strong> {item.telefone || '-'}</p>

              <h4>Sessões do mês</h4>

              {item.sessoes.map((sessao, index) => (
                <p key={index}>
                  {dataBR(sessao.data)} às {sessao.horario} — {sessao.servico} — {sessao.modalidade} — {dinheiro(sessao.valor)}
                </p>
              ))}

              <h3>Total: {dinheiro(item.total)}</h3>

              <div style={acoes}>
                <button onClick={() => copiarFechamentoFamilia(item)} style={botaoAzul}>
                  Copiar WhatsApp
                </button>

                <button onClick={() => abrirWhatsAppFamilia(item)} style={botaoWhats}>
                  Enviar WhatsApp
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {aba === 'profissionais' && (
        <div style={box}>
          <h2>Pagamento automático dos profissionais</h2>

          {pagamentoProfissionais.map((item) => (
            <div key={item.profissional_id || item.profissional} style={card}>
              <h3>{item.profissional}</h3>

              <p><strong>Total de horas:</strong> {item.totalHoras}</p>
              <p><strong>Total de repasse:</strong> {dinheiro(item.totalRepasse)}</p>

              <h4>Atendimentos</h4>

              {item.atendimentos.map((atendimento, index) => (
                <p key={index}>
                  {dataBR(atendimento.data)} às {atendimento.horario} — {atendimento.servico} — {atendimento.tipo} — {atendimento.horas}h — {dinheiro(atendimento.repasse)}
                </p>
              ))}
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
              onChange={(e) => setDespesaForm({ ...despesaForm, descricao: e.target.value })}
            />

            <select
              value={despesaForm.categoria_despesa}
              onChange={(e) => setDespesaForm({ ...despesaForm, categoria_despesa: e.target.value })}
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
              onChange={(e) => setDespesaForm({ ...despesaForm, fornecedor: e.target.value })}
            />

            <input
              placeholder="Centro de custo"
              value={despesaForm.centro_custo}
              onChange={(e) => setDespesaForm({ ...despesaForm, centro_custo: e.target.value })}
            />

            <input
              type="number"
              placeholder="Valor"
              value={despesaForm.valor}
              onChange={(e) => setDespesaForm({ ...despesaForm, valor: e.target.value })}
            />

            <select
              value={despesaForm.forma_pagamento}
              onChange={(e) => setDespesaForm({ ...despesaForm, forma_pagamento: e.target.value })}
            >
              <option value="">Forma de pagamento</option>
              <option>PIX</option>
              <option>Dinheiro</option>
              <option>Cartão</option>
              <option>Boleto</option>
              <option>Transferência</option>
            </select>

            <input
              type="date"
              value={despesaForm.vencimento}
              onChange={(e) => setDespesaForm({ ...despesaForm, vencimento: e.target.value })}
            />

            <input
              type="date"
              value={despesaForm.data_pagamento}
              onChange={(e) => setDespesaForm({ ...despesaForm, data_pagamento: e.target.value })}
            />

            <select
              value={despesaForm.status}
              onChange={(e) => setDespesaForm({ ...despesaForm, status: e.target.value })}
            >
              <option>Pendente</option>
              <option>Pago</option>
              <option>Parcial</option>
              <option>Cancelado</option>
            </select>

            <label>
              <input
                type="checkbox"
                checked={despesaForm.recorrente}
                onChange={(e) => setDespesaForm({ ...despesaForm, recorrente: e.target.checked })}
              />{' '}
              Pagamento recorrente
            </label>

            <textarea
              placeholder="Observações"
              value={despesaForm.observacoes}
              onChange={(e) => setDespesaForm({ ...despesaForm, observacoes: e.target.value })}
              style={{ gridColumn: '1 / span 2', minHeight: 100 }}
            />

            <button onClick={salvarDespesa} style={botaoPrincipal}>
              Salvar despesa
            </button>
          </div>

          <h3>Despesas do mês</h3>

          {despesasMes.map((item) => (
            <div key={item.id} style={card}>
              <h3>{item.descricao}</h3>
              <p><strong>Categoria:</strong> {item.categoria_despesa || '-'}</p>
              <p><strong>Fornecedor:</strong> {item.fornecedor || '-'}</p>
              <p><strong>Valor:</strong> {dinheiro(item.valor)}</p>
              <p><strong>Vencimento:</strong> {dataBR(item.vencimento)}</p>
              <p><strong>Status:</strong> {item.status}</p>
            </div>
          ))}
        </div>
      )}

      {aba === 'ia' && (
        <div style={box}>
          <h2>Relatório Mensal Inteligente IA</h2>

          <textarea
            value={relatorioIA}
            readOnly
            style={{
              width: '100%',
              minHeight: 700,
              padding: 20,
              borderRadius: 14,
              border: '1px solid #ddd',
              background: '#f8fafc',
              lineHeight: 1.7,
              fontSize: 15
            }}
          />

          <div style={acoes}>
            <button
              onClick={() => {
                navigator.clipboard.writeText(relatorioIA)
                alert('Relatório IA copiado.')
              }}
              style={botaoAzul}
            >
              Copiar relatório
            </button>

            <button onClick={() => window.print()} style={botaoPrincipal}>
              Imprimir / PDF
            </button>
          </div>
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

const box = {
  background: '#fff',
  padding: 25,
  borderRadius: 16,
  boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
  marginBottom: 25
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

const cards = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
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

const acoes = {
  display: 'flex',
  gap: 10,
  flexWrap: 'wrap',
  marginTop: 15
}

const botaoPrincipal = {
  background: '#0f766e',
  color: '#fff',
  border: 'none',
  borderRadius: 10,
  padding: 14,
  cursor: 'pointer',
  fontWeight: 'bold',
  marginTop: 15
}

const botaoSecundario = {
  background: '#64748b',
  color: '#fff',
  border: 'none',
  borderRadius: 10,
  padding: 14,
  cursor: 'pointer',
  fontWeight: 'bold',
  marginTop: 15,
  marginLeft: 10
}

const botaoAzul = {
  background: '#2563eb',
  color: '#fff',
  border: 'none',
  borderRadius: 10,
  padding: 10,
  cursor: 'pointer'
}

const botaoWhats = {
  background: '#22c55e',
  color: '#fff',
  border: 'none',
  borderRadius: 10,
  padding: 10,
  cursor: 'pointer'
}
