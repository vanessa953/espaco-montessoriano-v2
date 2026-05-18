import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

const HORARIOS = []

for (let h = 8; h <= 19; h++) {
  HORARIOS.push(`${String(h).padStart(2, '0')}:00`)

  if (h !== 19) {
    HORARIOS.push(`${String(h).padStart(2, '0')}:30`)
  }
}

const SERVICOS = [
  'ABA',
  'Psicologia',
  'Fonoaudiologia',
  'Psicopedagogia',
  'Terapia Ocupacional',
  'Nutrição',
  'Psicomotricidade',
  'Acompanhamento Pedagógico',
  'Avaliação Neuropsicológica Cognitiva',
  'Mapeamento Cerebral',
  'Neuromodulação',
  'Reunião com família',
  'Reunião com escola',
  'Visita escolar',
  'Supervisão',
  'Grupo terapêutico',
  'Outros'
]

function dataBR(data) {
  if (!data) return '-'

  const [ano, mes, dia] = String(data).split('-')

  return `${dia}/${mes}/${ano}`
}

function hojeISO() {
  return new Date().toISOString().slice(0, 10)
}

function somarDias(data, dias) {
  const d = new Date(data + 'T12:00:00')
  d.setDate(d.getDate() + dias)
  return d.toISOString().slice(0, 10)
}

function inicioSemana(data) {
  const d = new Date(data + 'T12:00:00')
  const dia = d.getDay()
  const diff = dia === 0 ? -6 : 1 - dia
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}

function fimSemana(data) {
  return somarDias(inicioSemana(data), 5)
}

export default function Agenda() {
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')

  const [pacientes, setPacientes] = useState([])
  const [profissionais, setProfissionais] = useState([])
  const [agenda, setAgenda] = useState([])
  const [vinculos, setVinculos] = useState([])

  const [visualizacao, setVisualizacao] = useState('Diária')

  const [form, setForm] = useState({
    paciente_id: '',
    profissional_id: '',
    servico: '',
    servico_outros: '',
    area_atendimento: '',
    data: hojeISO(),
    horario: '08:00',
    hora_fim: '08:50',
    modalidade: 'Presencial',
    status: 'Agendado',
    observacoes: '',
    sala: '',
    recorrente: false,
    quantidade_repeticoes: 1
  })

  async function carregarDados() {
    const { data: pacientesData } = await supabase
      .from('pacientes')
      .select('*')
      .order('nome')

    const { data: profissionaisData } = await supabase
      .from('profissionais')
      .select('*')
      .eq('ativo', true)
      .order('nome')

    const { data: agendaData } = await supabase
      .from('agenda')
      .select(`
        *,
        pacientes(nome),
        profissionais(nome)
      `)
      .order('data', { ascending: true })

    const { data: vinculosData } = await supabase
      .from('profissional_pacientes')
      .select('*')
      .eq('ativo', true)

    setPacientes(pacientesData || [])
    setProfissionais(profissionaisData || [])
    setAgenda(agendaData || [])
    setVinculos(vinculosData || [])
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

  const agendaPermitida = useMemo(() => {
    const nivel = usuario?.nivel_acesso || 'Colaborador'

    if (
      [
        'Administradora',
        'Coordenação',
        'Recepção',
        'Auxiliar ADM'
      ].includes(nivel)
    ) {
      return agenda
    }

    if (nivel === 'Supervisor') {
      return agenda.filter(
        (item) =>
          item.area_atendimento === usuario?.area_supervisao
      )
    }

    if (
      ['Colaborador', 'Estagiário'].includes(nivel)
    ) {
      return agenda.filter(
        (item) =>
          item.profissional_id === usuario?.id
      )
    }

    return []
  }, [agenda, usuario])

  const pacientesPermitidos = useMemo(() => {
    const nivel = usuario?.nivel_acesso || 'Colaborador'

    if (
      [
        'Administradora',
        'Coordenação',
        'Recepção',
        'Auxiliar ADM'
      ].includes(nivel)
    ) {
      return pacientes
    }

    if (nivel === 'Supervisor') {
      return pacientes.filter(
        (p) =>
          p.area_atendimento === usuario?.area_supervisao
      )
    }

    if (
      ['Colaborador', 'Estagiário'].includes(nivel)
    ) {
      const ids = vinculos
        .filter((v) => v.profissional_id === usuario?.id)
        .map((v) => v.paciente_id)

      return pacientes.filter((p) => ids.includes(p.id))
    }

    return []
  }, [pacientes, vinculos, usuario])

  const profissionaisPermitidos = useMemo(() => {
    const nivel = usuario?.nivel_acesso || 'Colaborador'

    if (
      [
        'Administradora',
        'Coordenação',
        'Recepção',
        'Auxiliar ADM'
      ].includes(nivel)
    ) {
      return profissionais
    }

    return profissionais.filter((p) => p.id === usuario?.id)
  }, [profissionais, usuario])

  const agendaFiltrada = useMemo(() => {
    const hoje = hojeISO()

    if (visualizacao === 'Diária') {
      return agendaPermitida.filter(
        (a) => a.data === hoje
      )
    }

    if (visualizacao === 'Semanal') {
      const inicio = inicioSemana(hoje)
      const fim = fimSemana(hoje)

      return agendaPermitida.filter(
        (a) => a.data >= inicio && a.data <= fim
      )
    }

    const mes = hoje.slice(0, 7)

    return agendaPermitida.filter(
      (a) => String(a.data).slice(0, 7) === mes
    )
  }, [agendaPermitida, visualizacao])

  async function salvarAgenda() {
    if (!form.paciente_id) {
      alert('Selecione o paciente.')
      return
    }

    if (!form.profissional_id) {
      alert('Selecione o profissional.')
      return
    }

    if (!form.servico) {
      alert('Selecione o serviço.')
      return
    }

    const paciente = pacientes.find(
      (p) => p.id === form.paciente_id
    )

    const servicoFinal =
      form.servico === 'Outros'
        ? form.servico_outros
        : form.servico

    const registros = []

    const repeticoes = form.recorrente
      ? Number(form.quantidade_repeticoes || 1)
      : 1

    for (let i = 0; i < repeticoes; i++) {
      registros.push({
        paciente_id: form.paciente_id,
        profissional_id: form.profissional_id,
        servico: servicoFinal,
        area_atendimento:
          paciente?.area_atendimento || '',
        data: somarDias(form.data, i * 7),
        horario: form.horario,
        hora_fim: form.hora_fim,
        modalidade: form.modalidade,
        status: form.status,
        observacoes: form.observacoes,
        sala: form.sala,
        recorrente: form.recorrente,
        quantidade_repeticoes:
          form.quantidade_repeticoes
      })
    }

    const { error } = await supabase
      .from('agenda')
      .insert(registros)

    if (error) {
      console.log(error)
      alert('Erro ao salvar agenda.')
      return
    }

    alert('Agenda salva com sucesso.')

    limparFormulario()
    carregarDados()
  }

  function limparFormulario() {
    setForm({
      paciente_id: '',
      profissional_id: '',
      servico: '',
      servico_outros: '',
      area_atendimento: '',
      data: hojeISO(),
      horario: '08:00',
      hora_fim: '08:50',
      modalidade: 'Presencial',
      status: 'Agendado',
      observacoes: '',
      sala: '',
      recorrente: false,
      quantidade_repeticoes: 1
    })
  }

  return (
    <div style={pagina}>
      <h1>Agenda Inteligente</h1>

      <p style={{ color: '#666', marginBottom: 25 }}>
        Visualização diária, semanal e mensal com permissões por perfil.
      </p>

      <div style={box}>
        <h2>Novo agendamento</h2>

        <div style={grid}>
          <div>
            <label style={label}>
              Paciente
            </label>

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
                Selecione o paciente
              </option>

              {pacientesPermitidos.map((p) => (
                <option
                  key={p.id}
                  value={p.id}
                >
                  {p.nome}
                </option>
              ))}
            </select>

            <small style={descricao}>
              Escolha o paciente que será atendido.
            </small>
          </div>

          <div>
            <label style={label}>
              Serviço
            </label>

            <select
              value={form.servico}
              onChange={(e) =>
                atualizarCampo(
                  'servico',
                  e.target.value
                )
              }
            >
              <option value="">
                Selecione o serviço
              </option>

              {SERVICOS.map((s) => (
                <option key={s}>
                  {s}
                </option>
              ))}
            </select>

            <small style={descricao}>
              Tipo principal do atendimento.
            </small>
          </div>

          {form.servico === 'Outros' && (
            <div>
              <label style={label}>
                Descreva o serviço
              </label>

              <input
                value={form.servico_outros}
                onChange={(e) =>
                  atualizarCampo(
                    'servico_outros',
                    e.target.value
                  )
                }
                placeholder="Exemplo: devolutiva, orientação..."
              />

              <small style={descricao}>
                Informe manualmente o nome do serviço.
              </small>
            </div>
          )}

          <div>
            <label style={label}>
              Profissional
            </label>

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
                Selecione o profissional
              </option>

              {profissionaisPermitidos.map((p) => (
                <option
                  key={p.id}
                  value={p.id}
                >
                  {p.nome}
                </option>
              ))}
            </select>

            <small style={descricao}>
              Profissional responsável pelo atendimento.
            </small>
          </div>

          <div>
            <label style={label}>
              Data
            </label>

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

            <small style={descricao}>
              Dia do atendimento.
            </small>
          </div>

          <div>
            <label style={label}>
              Horário inicial
            </label>

            <select
              value={form.horario}
              onChange={(e) =>
                atualizarCampo(
                  'horario',
                  e.target.value
                )
              }
            >
              {HORARIOS.map((h) => (
                <option key={h}>
                  {h}
                </option>
              ))}
            </select>

            <small style={descricao}>
              Horário de início.
            </small>
          </div>

          <div>
            <label style={label}>
              Horário final
            </label>

            <select
              value={form.hora_fim}
              onChange={(e) =>
                atualizarCampo(
                  'hora_fim',
                  e.target.value
                )
              }
            >
              {HORARIOS.map((h) => (
                <option key={h}>
                  {h}
                </option>
              ))}
            </select>

            <small style={descricao}>
              Horário de término do atendimento.
            </small>
          </div>

          <div>
            <label style={label}>
              Modalidade
            </label>

            <select
              value={form.modalidade}
              onChange={(e) =>
                atualizarCampo(
                  'modalidade',
                  e.target.value
                )
              }
            >
              <option>
                Presencial
              </option>

              <option>
                Online
              </option>

              <option>
                Domiciliar
              </option>

              <option>
                Escolar
              </option>

              <option>
                Grupo
              </option>
            </select>

            <small style={descricao}>
              Forma como o atendimento ocorrerá.
            </small>
          </div>

          <div>
            <label style={label}>
              Status
            </label>

            <select
              value={form.status}
              onChange={(e) =>
                atualizarCampo(
                  'status',
                  e.target.value
                )
              }
            >
              <option>
                Agendado
              </option>

              <option>
                Confirmado
              </option>

              <option>
                Realizado
              </option>

              <option>
                Falta
              </option>

              <option>
                Cancelado
              </option>

              <option>
                Reposição
              </option>
            </select>

            <small style={descricao}>
              Situação atual do atendimento.
            </small>
          </div>

          <div>
            <label style={label}>
              Sala
            </label>

            <input
              value={form.sala}
              onChange={(e) =>
                atualizarCampo(
                  'sala',
                  e.target.value
                )
              }
              placeholder="Exemplo: Sala 1"
            />

            <small style={descricao}>
              Sala utilizada no atendimento.
            </small>
          </div>

          <div>
            <label style={label}>
              Repetir semanalmente
            </label>

            <select
              value={
                form.recorrente
                  ? 'Sim'
                  : 'Não'
              }
              onChange={(e) =>
                atualizarCampo(
                  'recorrente',
                  e.target.value === 'Sim'
                )
              }
            >
              <option>
                Não
              </option>

              <option>
                Sim
              </option>
            </select>

            <small style={descricao}>
              Repete automaticamente toda semana.
            </small>
          </div>

          {form.recorrente && (
            <div>
              <label style={label}>
                Quantidade de semanas
              </label>

              <input
                type="number"
                min="1"
                value={
                  form.quantidade_repeticoes
                }
                onChange={(e) =>
                  atualizarCampo(
                    'quantidade_repeticoes',
                    e.target.value
                  )
                }
              />

              <small style={descricao}>
                Quantas semanas repetir.
              </small>
            </div>
          )}
        </div>

        <div style={{ marginTop: 20 }}>
          <label style={label}>
            Observações
          </label>

          <textarea
            value={form.observacoes}
            onChange={(e) =>
              atualizarCampo(
                'observacoes',
                e.target.value
              )
            }
            placeholder="Informações importantes do atendimento"
            style={textarea}
          />

          <small style={descricao}>
            Informações extras relevantes para equipe.
          </small>
        </div>

        <button
          onClick={salvarAgenda}
          style={botaoPrincipal}
        >
          Salvar agendamento
        </button>
      </div>

      <div style={box}>
        <div style={topoAgenda}>
          <h2>
            Visualização da agenda
          </h2>

          <div style={visualizacaoBox}>
            {['Diária', 'Semanal', 'Mensal'].map(
              (v) => (
                <button
                  key={v}
                  onClick={() =>
                    setVisualizacao(v)
                  }
                  style={
                    visualizacao === v
                      ? botaoAtivo
                      : botaoVisualizacao
                  }
                >
                  {v}
                </button>
              )
            )}
          </div>
        </div>

        {agendaFiltrada.length === 0 && (
          <p>
            Nenhum atendimento encontrado.
          </p>
        )}

        {agendaFiltrada.map((item) => (
          <div
            key={item.id}
            style={card}
          >
            <h3>
              {dataBR(item.data)} às{' '}
              {item.horario}
            </h3>

            <p>
              <strong>Paciente:</strong>{' '}
              {item.pacientes?.nome ||
                '-'}
            </p>

            <p>
              <strong>Serviço:</strong>{' '}
              {item.servico || '-'}
            </p>

            <p>
              <strong>Profissional:</strong>{' '}
              {item.profissionais?.nome ||
                '-'}
            </p>

            <p>
              <strong>Modalidade:</strong>{' '}
              {item.modalidade || '-'}
            </p>

            <p>
              <strong>Status:</strong>{' '}
              {item.status || '-'}
            </p>

            <p>
              <strong>Sala:</strong>{' '}
              {item.sala || '-'}
            </p>

            <p>
              <strong>Observações:</strong>{' '}
              {item.observacoes || '-'}
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
  boxShadow:
    '0 2px 12px rgba(0,0,0,0.08)'
}

const grid = {
  display: 'grid',
  gridTemplateColumns:
    '1fr 1fr',
  gap: 15
}

const label = {
  display: 'block',
  fontWeight: 'bold',
  marginBottom: 6
}

const descricao = {
  display: 'block',
  marginTop: 6,
  color: '#666',
  fontSize: 12,
  lineHeight: 1.4
}

const textarea = {
  width: '100%',
  minHeight: 120,
  padding: 12,
  borderRadius: 10,
  border: '1px solid #ccc'
}

const botaoPrincipal = {
  marginTop: 25,
  background: '#0f766e',
  color: '#fff',
  border: 'none',
  padding: 16,
  borderRadius: 14,
  cursor: 'pointer',
  fontWeight: 'bold',
  fontSize: 16
}

const topoAgenda = {
  display: 'flex',
  justifyContent:
    'space-between',
  alignItems: 'center',
  gap: 20,
  flexWrap: 'wrap',
  marginBottom: 20
}

const visualizacaoBox = {
  display: 'flex',
  gap: 10
}

const botaoVisualizacao = {
  background: '#fff',
  border: '1px solid #ccc',
  borderRadius: 12,
  padding: 12,
  cursor: 'pointer',
  fontWeight: 'bold'
}

const botaoAtivo = {
  ...botaoVisualizacao,
  background: '#0f766e',
  color: '#fff',
  border: 'none'
}

const card = {
  background: '#f8fafc',
  border:
    '1px solid #e5e7eb',
  padding: 18,
  borderRadius: 14,
  marginBottom: 15
}
