import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

const horarios = []

for (let h = 8; h <= 19; h++) {
  horarios.push(`${String(h).padStart(2, '0')}:00`)

  if (h !== 19) {
    horarios.push(`${String(h).padStart(2, '0')}:30`)
  }
}

export default function Agenda() {
  const [agenda, setAgenda] = useState([])
  const [pacientes, setPacientes] = useState([])
  const [profissionais, setProfissionais] = useState([])
  const [pacientesGrupo, setPacientesGrupo] = useState([])

  const [form, setForm] = useState({
    paciente_id: '',
    profissional_id: '',
    servico: '',
    data: '',
    horario: '',
    modalidade: 'Clínica',
    tipo_atendimento: 'Individual',
    status: 'Agendado',

    observacoes: '',
    repetir: false,

    link_videochamada: '',
    taxa_deslocamento: 0,

    duracao_horas: 1,

    valor_hora_profissional: 0,
    valor_sessao_profissional: 0,
    percentual_profissional: 0,

    valor_por_paciente: 0,
    valor_total_familia: 0,
    valor_total_profissional: 0,
    lucro_clinica: 0,

    tipo_pagamento_profissional: 'Por hora'
  })

  async function carregarDados() {
    const { data: agendaData } = await supabase
      .from('agenda')
      .select(`
        *,
        pacientes(nome, telefone),
        profissionais(nome)
      `)
      .order('data')

    const { data: pacientesData } = await supabase
      .from('pacientes')
      .select('*')
      .order('nome')

    const { data: profissionaisData } = await supabase
      .from('profissionais')
      .select('*')
      .order('nome')

    setAgenda(agendaData || [])
    setPacientes(pacientesData || [])
    setProfissionais(profissionaisData || [])
  }

  useEffect(() => {
    carregarDados()
  }, [])

  useEffect(() => {
    calcularFinanceiro()
  }, [
    form.tipo_atendimento,
    form.valor_por_paciente,
    form.duracao_horas,
    form.valor_hora_profissional,
    form.valor_sessao_profissional,
    form.percentual_profissional,
    form.tipo_pagamento_profissional,
    pacientesGrupo
  ])

  function atualizarCampo(campo, valor) {
    setForm((prev) => ({
      ...prev,
      [campo]: valor
    }))
  }

  function selecionarProfissional(id) {
    const prof = profissionais.find(
      (p) => p.id === id
    )

    if (!prof) return

    setForm((prev) => ({
      ...prev,
      profissional_id: id,

      tipo_pagamento_profissional:
        prof.tipo_pagamento || 'Por hora',

      valor_hora_profissional:
        Number(prof.valor_hora || 0),

      valor_sessao_profissional:
        Number(prof.valor_sessao || 0),

      percentual_profissional:
        Number(prof.percentual_repasse || 0)
    }))
  }

  function calcularFinanceiro() {
    const quantidadePacientes =
      form.tipo_atendimento === 'Grupo'
        ? pacientesGrupo.length
        : 1

    const receitaFamilia =
      Number(form.valor_por_paciente || 0) *
      quantidadePacientes

    let pagamentoProfissional = 0

    if (
      form.tipo_pagamento_profissional ===
      'Por hora'
    ) {
      pagamentoProfissional =
        Number(form.valor_hora_profissional || 0) *
        Number(form.duracao_horas || 1)
    }

    if (
      form.tipo_pagamento_profissional ===
      'Por sessão'
    ) {
      pagamentoProfissional =
        Number(form.valor_sessao_profissional || 0)
    }

    if (
      form.tipo_pagamento_profissional ===
      'Percentual'
    ) {
      pagamentoProfissional =
        receitaFamilia *
        (Number(
          form.percentual_profissional || 0
        ) /
          100)
    }

    const lucro =
      receitaFamilia - pagamentoProfissional

    setForm((prev) => ({
      ...prev,
      valor_total_familia: receitaFamilia,
      valor_total_profissional:
        pagamentoProfissional,
      lucro_clinica: lucro
    }))
  }

  function togglePacienteGrupo(id) {
    if (pacientesGrupo.includes(id)) {
      setPacientesGrupo(
        pacientesGrupo.filter((p) => p !== id)
      )
    } else {
      setPacientesGrupo([...pacientesGrupo, id])
    }
  }

  async function salvarAgenda() {
    if (!form.profissional_id) {
      alert('Selecione profissional')
      return
    }

    if (
      form.tipo_atendimento === 'Individual' &&
      !form.paciente_id
    ) {
      alert('Selecione paciente')
      return
    }

    const dados = {
      ...form,

      taxa_deslocamento:
        Number(form.taxa_deslocamento || 0),

      duracao_horas:
        Number(form.duracao_horas || 1),

      valor_hora_profissional:
        Number(form.valor_hora_profissional || 0),

      valor_sessao_profissional:
        Number(
          form.valor_sessao_profissional || 0
        ),

      percentual_profissional:
        Number(
          form.percentual_profissional || 0
        ),

      valor_por_paciente:
        Number(form.valor_por_paciente || 0),

      valor_total_familia:
        Number(form.valor_total_familia || 0),

      valor_total_profissional:
        Number(
          form.valor_total_profissional || 0
        ),

      lucro_clinica:
        Number(form.lucro_clinica || 0)
    }

    const { data, error } = await supabase
      .from('agenda')
      .insert([dados])
      .select()

    if (error) {
      console.log(error)
      alert('Erro ao salvar')
      return
    }

    const agendaId = data?.[0]?.id

    if (
      agendaId &&
      form.tipo_atendimento === 'Grupo'
    ) {
      const registros = pacientesGrupo.map(
        (p) => ({
          agenda_id: agendaId,
          paciente_id: p,
          valor_cobrado:
            Number(
              form.valor_por_paciente || 0
            )
        })
      )

      await supabase
        .from('agenda_pacientes')
        .insert(registros)
    }

    alert('Agenda salva')

    limparFormulario()

    carregarDados()
  }

  function limparFormulario() {
    setPacientesGrupo([])

    setForm({
      paciente_id: '',
      profissional_id: '',
      servico: '',
      data: '',
      horario: '',
      modalidade: 'Clínica',
      tipo_atendimento: 'Individual',
      status: 'Agendado',

      observacoes: '',
      repetir: false,

      link_videochamada: '',
      taxa_deslocamento: 0,

      duracao_horas: 1,

      valor_hora_profissional: 0,
      valor_sessao_profissional: 0,
      percentual_profissional: 0,

      valor_por_paciente: 0,
      valor_total_familia: 0,
      valor_total_profissional: 0,
      lucro_clinica: 0,

      tipo_pagamento_profissional:
        'Por hora'
    })
  }

  const agendaOrdenada = useMemo(() => {
    return [...agenda].sort((a, b) => {
      return (
        new Date(a.data) - new Date(b.data)
      )
    })
  }, [agenda])

  return (
    <div style={pagina}>
      <h1>Agenda Inteligente</h1>

      <div style={box}>
        <h2>Novo atendimento</h2>

        <div style={grid}>
          <select
            value={form.tipo_atendimento}
            onChange={(e) =>
              atualizarCampo(
                'tipo_atendimento',
                e.target.value
              )
            }
          >
            <option>Individual</option>
            <option>Grupo</option>
          </select>

          <select
            value={form.profissional_id}
            onChange={(e) =>
              selecionarProfissional(
                e.target.value
              )
            }
          >
            <option value="">
              Profissional
            </option>

            {profissionais.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>

          <select
            value={form.servico}
            onChange={(e) =>
              atualizarCampo(
                'servico',
                e.target.value
              )
            }
          >
            <option value="">Serviço</option>

            <option>Fonoaudiologia</option>
            <option>Psicopedagogia</option>
            <option>
              Acompanhamento Pedagógico
            </option>
            <option>Psicologia</option>
            <option>ABA</option>
            <option>Nutrição</option>
          </select>

          <select
            value={form.modalidade}
            onChange={(e) =>
              atualizarCampo(
                'modalidade',
                e.target.value
              )
            }
          >
            <option>Clínica</option>
            <option>Domiciliar</option>
            <option>Vídeo</option>
          </select>

          <input
            type="date"
            value={form.data}
            onChange={(e) =>
              atualizarCampo(
                'data',
                e.target.value
              )
            }
          />

          <select
            value={form.horario}
            onChange={(e) =>
              atualizarCampo(
                'horario',
                e.target.value
              )
            }
          >
            <option value="">
              Horário
            </option>

            {horarios.map((h) => (
              <option key={h}>{h}</option>
            ))}
          </select>

          {form.tipo_atendimento ===
            'Individual' && (
            <select
              value={form.paciente_id}
              onChange={(e) =>
                atualizarCampo(
                  'paciente_id',
                  e.target.value
                )
              }
            >
              <option value="">
                Paciente
              </option>

              {pacientes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          )}

          <input
            type="number"
            placeholder="Valor cobrado da família"
            value={form.valor_por_paciente}
            onChange={(e) =>
              atualizarCampo(
                'valor_por_paciente',
                e.target.value
              )
            }
          />

          <input
            type="number"
            placeholder="Duração em horas"
            value={form.duracao_horas}
            onChange={(e) =>
              atualizarCampo(
                'duracao_horas',
                e.target.value
              )
            }
          />

          <input
            type="number"
            placeholder="Taxa deslocamento"
            value={form.taxa_deslocamento}
            onChange={(e) =>
              atualizarCampo(
                'taxa_deslocamento',
                e.target.value
              )
            }
          />

          <select
            value={form.status}
            onChange={(e) =>
              atualizarCampo(
                'status',
                e.target.value
              )
            }
          >
            <option>Agendado</option>
            <option>Confirmado</option>
            <option>Realizado</option>
            <option>Falta</option>
            <option>Cancelado</option>
            <option>Reposição</option>
          </select>

          <input
            placeholder="Link videochamada"
            value={form.link_videochamada}
            onChange={(e) =>
              atualizarCampo(
                'link_videochamada',
                e.target.value
              )
            }
          />

          <textarea
            placeholder="Observações"
            value={form.observacoes}
            onChange={(e) =>
              atualizarCampo(
                'observacoes',
                e.target.value
              )
            }
            style={{
              gridColumn: '1 / span 2',
              minHeight: 100
            }}
          />

          <label>
            <input
              type="checkbox"
              checked={form.repetir}
              onChange={(e) =>
                atualizarCampo(
                  'repetir',
                  e.target.checked
                )
              }
            />{' '}
            Repetir semanalmente
          </label>
        </div>

        {form.tipo_atendimento === 'Grupo' && (
          <div style={grupoBox}>
            <h3>Pacientes grupo</h3>

            <div style={grupoLista}>
              {pacientes.map((p) => (
                <label
                  key={p.id}
                  style={grupoItem}
                >
                  <input
                    type="checkbox"
                    checked={pacientesGrupo.includes(
                      p.id
                    )}
                    onChange={() =>
                      togglePacienteGrupo(p.id)
                    }
                  />{' '}
                  {p.nome}
                </label>
              ))}
            </div>
          </div>
        )}

        <div style={financeiroBox}>
          <h2>Financeiro automático</h2>

          <p>
            <strong>Tipo pagamento:</strong>{' '}
            {
              form.tipo_pagamento_profissional
            }
          </p>

          <p>
            <strong>Família:</strong>{' '}
            R$ {form.valor_total_familia}
          </p>

          <p>
            <strong>Profissional:</strong>{' '}
            R$ {form.valor_total_profissional}
          </p>

          <p>
            <strong>Lucro clínica:</strong>{' '}
            R$ {form.lucro_clinica}
          </p>
        </div>

        <button
          onClick={salvarAgenda}
          style={botaoPrincipal}
        >
          Salvar atendimento
        </button>
      </div>

      <div style={box}>
        <h2>Agenda cadastrada</h2>

        {agendaOrdenada.map((item) => (
          <div key={item.id} style={card}>
            <h3>{item.servico}</h3>

            <p>
              <strong>Data:</strong>{' '}
              {item.data}
            </p>

            <p>
              <strong>Horário:</strong>{' '}
              {item.horario}
            </p>

            <p>
              <strong>Profissional:</strong>{' '}
              {item.profissionais?.nome}
            </p>

            <p>
              <strong>Paciente:</strong>{' '}
              {item.pacientes?.nome ||
                'Grupo'}
            </p>

            <p>
              <strong>Receita família:</strong>{' '}
              R$ {item.valor_total_familia}
            </p>

            <p>
              <strong>Pagamento profissional:</strong>{' '}
              R${' '}
              {
                item.valor_total_profissional
              }
            </p>

            <p>
              <strong>Lucro clínica:</strong>{' '}
              R$ {item.lucro_clinica}
            </p>
          </div>
        ))}
      </div>
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
  padding: 25,
  borderRadius: 16,
  marginBottom: 25,
  boxShadow: '0 2px 10px rgba(0,0,0,0.08)'
}

const grid = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 15
}

const grupoBox = {
  marginTop: 25,
  background: '#f8fafc',
  padding: 20,
  borderRadius: 14
}

const grupoLista = {
  display: 'grid',
  gridTemplateColumns:
    '1fr 1fr 1fr',
  gap: 10,
  marginTop: 15
}

const grupoItem = {
  background: '#fff',
  padding: 10,
  borderRadius: 10,
  border: '1px solid #ddd'
}

const financeiroBox = {
  marginTop: 25,
  background: '#ecfeff',
  border: '1px solid #a5f3fc',
  borderRadius: 14,
  padding: 20
}

const card = {
  background: '#f8fafc',
  padding: 20,
  borderRadius: 16,
  marginTop: 15,
  border: '1px solid #e5e7eb'
}

const botaoPrincipal = {
  marginTop: 25,
  background: '#0f766e',
  color: '#fff',
  border: 'none',
  padding: 14,
  borderRadius: 10,
  cursor: 'pointer',
  fontWeight: 'bold'
}
