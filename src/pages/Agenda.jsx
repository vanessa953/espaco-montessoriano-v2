import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

const horarios = []

for (let h = 8; h <= 19; h++) {
  horarios.push(`${String(h).padStart(2, '0')}:00`)
  if (h !== 19) {
    horarios.push(`${String(h).padStart(2, '0')}:30`)
  }
}

const diasSemana = [
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado'
]

export default function Agenda() {
  const [agenda, setAgenda] = useState([])
  const [pacientes, setPacientes] = useState([])
  const [profissionais, setProfissionais] = useState([])

  const [filtroProfissional, setFiltroProfissional] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')

  const [pacientesGrupo, setPacientesGrupo] = useState([])

  const [form, setForm] = useState({
    titulo: '',
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
    valor_por_paciente: 0
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

  function atualizarCampo(campo, valor) {
    setForm((prev) => ({
      ...prev,
      [campo]: valor
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
      alert('Selecione o profissional')
      return
    }

    if (!form.data || !form.horario) {
      alert('Preencha data e horário')
      return
    }

    if (
      form.tipo_atendimento === 'Individual' &&
      !form.paciente_id
    ) {
      alert('Selecione o paciente')
      return
    }

    if (
      form.tipo_atendimento === 'Grupo' &&
      pacientesGrupo.length === 0
    ) {
      alert('Selecione os pacientes do grupo')
      return
    }

    const { data, error } = await supabase
      .from('agenda')
      .insert([{
        ...form,
        taxa_deslocamento:
          Number(form.taxa_deslocamento || 0),
        duracao_horas:
          Number(form.duracao_horas || 1),
        valor_hora_profissional:
          Number(form.valor_hora_profissional || 0),
        valor_por_paciente:
          Number(form.valor_por_paciente || 0)
      }])
      .select()

    if (error) {
      console.log(error)
      alert('Erro ao salvar agenda')
      return
    }

    const agendaId = data?.[0]?.id

    if (
      agendaId &&
      form.tipo_atendimento === 'Grupo'
    ) {
      const registros = pacientesGrupo.map((p) => ({
        agenda_id: agendaId,
        paciente_id: p,
        valor_cobrado:
          Number(form.valor_por_paciente || 0)
      }))

      await supabase
        .from('agenda_pacientes')
        .insert(registros)
    }

    alert('Atendimento salvo')

    setForm({
      titulo: '',
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
      valor_por_paciente: 0
    })

    setPacientesGrupo([])

    carregarDados()
  }

  async function atualizarStatus(id, status) {
    await supabase
      .from('agenda')
      .update({ status })
      .eq('id', id)

    carregarDados()
  }

  function abrirWhatsapp(item) {
    const telefone =
      item?.pacientes?.telefone || ''

    const mensagem = encodeURIComponent(
      `Olá! Confirmando seu atendimento no Espaço Montessoriano em ${item.data} às ${item.horario}.`
    )

    window.open(
      `https://wa.me/55${telefone}?text=${mensagem}`,
      '_blank'
    )
  }

  const agendaFiltrada = useMemo(() => {
    return agenda.filter((a) => {
      const profissionalOk =
        !filtroProfissional ||
        a.profissional_id === filtroProfissional

      const statusOk =
        !filtroStatus ||
        a.status === filtroStatus

      return profissionalOk && statusOk
    })
  }, [agenda, filtroProfissional, filtroStatus])

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
              atualizarCampo(
                'profissional_id',
                e.target.value
              )
            }
          >
            <option value="">
              Selecione profissional
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
            <option>Acompanhamento Pedagógico</option>
            <option>Psicologia</option>
            <option>ABA</option>
            <option>Nutrição</option>
            <option>Psicomotricidade</option>
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
              atualizarCampo('data', e.target.value)
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
            <option value="">Horário</option>

            {horarios.map((h) => (
              <option key={h}>{h}</option>
            ))}
          </select>

          {form.tipo_atendimento === 'Individual' && (
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
                Selecione paciente
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
            placeholder="Valor hora profissional"
            value={form.valor_hora_profissional}
            onChange={(e) =>
              atualizarCampo(
                'valor_hora_profissional',
                e.target.value
              )
            }
          />

          <input
            type="number"
            placeholder="Valor por paciente"
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
            <h3>Pacientes do grupo</h3>

            <div style={grupoLista}>
              {pacientes.map((p) => (
                <label key={p.id} style={grupoItem}>
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

        <button
          onClick={salvarAgenda}
          style={botaoPrincipal}
        >
          Salvar atendimento
        </button>
      </div>

      <div style={box}>
        <h2>Filtros</h2>

        <div style={grid}>
          <select
            value={filtroProfissional}
            onChange={(e) =>
              setFiltroProfissional(e.target.value)
            }
          >
            <option value="">
              Todos profissionais
            </option>

            {profissionais.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>

          <select
            value={filtroStatus}
            onChange={(e) =>
              setFiltroStatus(e.target.value)
            }
          >
            <option value="">
              Todos status
            </option>

            <option>Agendado</option>
            <option>Confirmado</option>
            <option>Realizado</option>
            <option>Falta</option>
            <option>Cancelado</option>
            <option>Reposição</option>
          </select>
        </div>
      </div>

      <div style={box}>
        <h2>Agenda semanal</h2>

        <p>
          Segunda a sábado — 08h às 19h
        </p>

        {agendaFiltrada.map((item) => (
          <div key={item.id} style={card}>
            <h3>
              {item.servico}
            </h3>

            <p>
              <strong>Data:</strong> {item.data}
            </p>

            <p>
              <strong>Horário:</strong> {item.horario}
            </p>

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
              <strong>Modalidade:</strong>{' '}
              {item.modalidade}
            </p>

            <p>
              <strong>Status:</strong>{' '}
              {item.status}
            </p>

            <p>
              <strong>Duração:</strong>{' '}
              {item.duracao_horas}h
            </p>

            <p>
              <strong>Valor hora profissional:</strong>{' '}
              R$ {item.valor_hora_profissional}
            </p>

            <p>
              <strong>Valor por paciente:</strong>{' '}
              R$ {item.valor_por_paciente}
            </p>

            <div style={acoes}>
              <button
                onClick={() =>
                  atualizarStatus(
                    item.id,
                    'Confirmado'
                  )
                }
                style={botaoConfirmar}
              >
                Confirmar
              </button>

              <button
                onClick={() =>
                  atualizarStatus(
                    item.id,
                    'Realizado'
                  )
                }
                style={botaoRealizado}
              >
                Realizado
              </button>

              <button
                onClick={() =>
                  abrirWhatsapp(item)
                }
                style={botaoWhatsapp}
              >
                WhatsApp
              </button>

              {item.link_videochamada && (
                <a
                  href={item.link_videochamada}
                  target="_blank"
                  style={botaoVideo}
                >
                  Videochamada
                </a>
              )}
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
  gridTemplateColumns: '1fr 1fr 1fr',
  gap: 10,
  marginTop: 15
}

const grupoItem = {
  background: '#fff',
  padding: 10,
  borderRadius: 10,
  border: '1px solid #ddd'
}

const card = {
  background: '#f8fafc',
  padding: 20,
  borderRadius: 16,
  marginTop: 15,
  border: '1px solid #e5e7eb'
}

const acoes = {
  display: 'flex',
  gap: 10,
  marginTop: 15,
  flexWrap: 'wrap'
}

const botaoPrincipal = {
  marginTop: 25,
  background: '#0f766e',
  color: '#fff',
  border: 'none',
  borderRadius: 10,
  padding: 14,
  cursor: 'pointer',
  fontWeight: 'bold'
}

const botaoConfirmar = {
  background: '#2563eb',
  color: '#fff',
  border: 'none',
  borderRadius: 10,
  padding: 10,
  cursor: 'pointer'
}

const botaoRealizado = {
  background: '#16a34a',
  color: '#fff',
  border: 'none',
  borderRadius: 10,
  padding: 10,
  cursor: 'pointer'
}

const botaoWhatsapp = {
  background: '#22c55e',
  color: '#fff',
  border: 'none',
  borderRadius: 10,
  padding: 10,
  cursor: 'pointer'
}

const botaoVideo = {
  background: '#7c3aed',
  color: '#fff',
  borderRadius: 10,
  padding: 10,
  textDecoration: 'none'
}
