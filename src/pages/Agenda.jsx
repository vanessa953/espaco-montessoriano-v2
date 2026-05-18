import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

const horarios = []

for (let h = 8; h <= 19; h++) {
  horarios.push(`${String(h).padStart(2, '0')}:00`)
  if (h !== 19) horarios.push(`${String(h).padStart(2, '0')}:30`)
}

function somarSemanas(data, semanas) {
  const d = new Date(data + 'T12:00:00')
  d.setDate(d.getDate() + semanas * 7)
  return d.toISOString().slice(0, 10)
}

function dataBR(data) {
  if (!data) return '-'
  const [ano, mes, dia] = String(data).split('-')
  return `${dia}/${mes}/${ano}`
}

export default function Agenda() {
  const [agenda, setAgenda] = useState([])
  const [pacientes, setPacientes] = useState([])
  const [profissionais, setProfissionais] = useState([])
  const [pacientesGrupo, setPacientesGrupo] = useState([])
  const [conflito, setConflito] = useState('')

  const [form, setForm] = useState({
    paciente_id: '',
    profissional_id: '',
    servico: '',
    data: '',
    horario: '',
    hora_fim: '',
    sala: '',
    modalidade: 'Clínica',
    tipo_atendimento: 'Individual',
    status: 'Agendado',
    observacoes: '',
    link_videochamada: '',
    taxa_deslocamento: 0,

    recorrente: false,
    quantidade_repeticoes: 1,

    duracao_horas: 1,
    valor_por_paciente: 0,

    valor_hora_profissional: 0,
    valor_sessao_profissional: 0,
    percentual_profissional: 0,
    tipo_pagamento_profissional: 'Por hora',

    valor_total_familia: 0,
    valor_total_profissional: 0,
    lucro_clinica: 0,
    observacao_conflito: ''
  })

  async function carregarDados() {
    const { data: agendaData } = await supabase
      .from('agenda')
      .select(`
        *,
        pacientes(nome, telefone),
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

    setAgenda(agendaData || [])
    setPacientes(pacientesData || [])
    setProfissionais(profissionaisData || [])
  }

  useEffect(() => {
    carregarDados()
  }, [])

  useEffect(() => {
    calcularFinanceiro()
    verificarConflito()
  }, [
    form.profissional_id,
    form.data,
    form.horario,
    form.hora_fim,
    form.sala,
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
    const prof = profissionais.find((p) => p.id === id)

    if (!prof) {
      atualizarCampo('profissional_id', id)
      return
    }

    setForm((prev) => ({
      ...prev,
      profissional_id: id,
      tipo_pagamento_profissional: prof.tipo_pagamento || 'Por hora',
      valor_hora_profissional: Number(prof.valor_hora || 0),
      valor_sessao_profissional: Number(prof.valor_sessao || 0),
      percentual_profissional: Number(prof.percentual_repasse || 0)
    }))
  }

  function calcularFinanceiro() {
    const quantidadePacientes =
      form.tipo_atendimento === 'Grupo'
        ? pacientesGrupo.length
        : 1

    const receitaFamilia =
      Number(form.valor_por_paciente || 0) * quantidadePacientes

    let pagamentoProfissional = 0

    if (form.tipo_pagamento_profissional === 'Por hora') {
      pagamentoProfissional =
        Number(form.valor_hora_profissional || 0) *
        Number(form.duracao_horas || 1)
    }

    if (form.tipo_pagamento_profissional === 'Por sessão') {
      pagamentoProfissional = Number(form.valor_sessao_profissional || 0)
    }

    if (form.tipo_pagamento_profissional === 'Percentual') {
      pagamentoProfissional =
        receitaFamilia *
        (Number(form.percentual_profissional || 0) / 100)
    }

    setForm((prev) => ({
      ...prev,
      valor_total_familia: receitaFamilia,
      valor_total_profissional: pagamentoProfissional,
      lucro_clinica: receitaFamilia - pagamentoProfissional
    }))
  }

  function verificarConflito() {
    if (!form.data || !form.horario) {
      setConflito('')
      return
    }

    const conflitos = agenda.filter((item) => {
      if (item.data !== form.data) return false

      const mesmoHorario =
        item.horario === form.horario ||
        (form.hora_fim && item.hora_fim === form.hora_fim)

      const mesmoProfissional =
        form.profissional_id &&
        item.profissional_id === form.profissional_id

      const mesmaSala =
        form.sala &&
        item.sala &&
        item.sala === form.sala

      return mesmoHorario && (mesmoProfissional || mesmaSala)
    })

    if (!conflitos.length) {
      setConflito('')
      atualizarCampo('observacao_conflito', '')
      return
    }

    const mensagem = `Atenção: já existe atendimento neste horário para ${
      conflitos[0].profissionais?.nome || 'profissional/sala'
    }. Verifique antes de salvar.`

    setConflito(mensagem)
    setForm((prev) => ({
      ...prev,
      observacao_conflito: mensagem
    }))
  }

  function togglePacienteGrupo(id) {
    if (pacientesGrupo.includes(id)) {
      setPacientesGrupo(pacientesGrupo.filter((p) => p !== id))
    } else {
      setPacientesGrupo([...pacientesGrupo, id])
    }
  }

  async function salvarAgenda() {
    if (!form.profissional_id) {
      alert('Selecione o profissional.')
      return
    }

    if (!form.data || !form.horario) {
      alert('Preencha data e horário inicial.')
      return
    }

    if (form.tipo_atendimento === 'Individual' && !form.paciente_id) {
      alert('Selecione o paciente.')
      return
    }

    if (form.tipo_atendimento === 'Grupo' && pacientesGrupo.length === 0) {
      alert('Selecione os pacientes do grupo.')
      return
    }

    if (conflito) {
      const continuar = confirm(
        `${conflito}\n\nDeseja salvar mesmo assim?`
      )
      if (!continuar) return
    }

    const repeticoes = form.recorrente
      ? Number(form.quantidade_repeticoes || 1)
      : 1

    for (let i = 0; i < repeticoes; i++) {
      const dataFinal = i === 0 ? form.data : somarSemanas(form.data, i)

      const dados = {
        ...form,
        data: dataFinal,
        taxa_deslocamento: Number(form.taxa_deslocamento || 0),
        duracao_horas: Number(form.duracao_horas || 1),
        valor_por_paciente: Number(form.valor_por_paciente || 0),
        valor_hora_profissional: Number(form.valor_hora_profissional || 0),
        valor_sessao_profissional: Number(form.valor_sessao_profissional || 0),
        percentual_profissional: Number(form.percentual_profissional || 0),
        valor_total_familia: Number(form.valor_total_familia || 0),
        valor_total_profissional: Number(form.valor_total_profissional || 0),
        lucro_clinica: Number(form.lucro_clinica || 0),
        quantidade_repeticoes: repeticoes
      }

      const { data, error } = await supabase
        .from('agenda')
        .insert([dados])
        .select()

      if (error) {
        console.log(error)
        alert('Erro ao salvar agenda.')
        return
      }

      const agendaId = data?.[0]?.id

      if (agendaId && form.tipo_atendimento === 'Grupo') {
        const registros = pacientesGrupo.map((p) => ({
          agenda_id: agendaId,
          paciente_id: p,
          valor_cobrado: Number(form.valor_por_paciente || 0)
        }))

        await supabase.from('agenda_pacientes').insert(registros)
      }
    }

    alert('Atendimento salvo com sucesso.')
    limparFormulario()
    carregarDados()
  }

  function limparFormulario() {
    setPacientesGrupo([])
    setConflito('')

    setForm({
      paciente_id: '',
      profissional_id: '',
      servico: '',
      data: '',
      horario: '',
      hora_fim: '',
      sala: '',
      modalidade: 'Clínica',
      tipo_atendimento: 'Individual',
      status: 'Agendado',
      observacoes: '',
      link_videochamada: '',
      taxa_deslocamento: 0,

      recorrente: false,
      quantidade_repeticoes: 1,

      duracao_horas: 1,
      valor_por_paciente: 0,

      valor_hora_profissional: 0,
      valor_sessao_profissional: 0,
      percentual_profissional: 0,
      tipo_pagamento_profissional: 'Por hora',

      valor_total_familia: 0,
      valor_total_profissional: 0,
      lucro_clinica: 0,
      observacao_conflito: ''
    })
  }

  const agendaOrdenada = useMemo(() => {
    return [...agenda].sort((a, b) => {
      const da = `${a.data || ''} ${a.horario || ''}`
      const db = `${b.data || ''} ${b.horario || ''}`
      return da.localeCompare(db)
    })
  }, [agenda])

  return (
    <div style={pagina}>
      <h1>Agenda Inteligente</h1>

      <p style={{ color: '#666', marginBottom: 25 }}>
        Agenda com conflito de horários, recorrência semanal, grupo, valores automáticos e integração financeira.
      </p>

      <div style={box}>
        <h2>Novo atendimento</h2>

        {conflito && (
          <div style={alertaConflito}>
            {conflito}
          </div>
        )}

        <div style={grid}>
          <select
            value={form.tipo_atendimento}
            onChange={(e) => atualizarCampo('tipo_atendimento', e.target.value)}
          >
            <option>Individual</option>
            <option>Grupo</option>
          </select>

          <select
            value={form.profissional_id}
            onChange={(e) => selecionarProfissional(e.target.value)}
          >
            <option value="">Profissional</option>
            {profissionais.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>

          <select
            value={form.servico}
            onChange={(e) => atualizarCampo('servico', e.target.value)}
          >
            <option value="">Serviço</option>
            <option>Fonoaudiologia</option>
            <option>Psicopedagogia</option>
            <option>Acompanhamento Pedagógico</option>
            <option>Psicologia</option>
            <option>ABA</option>
            <option>Nutrição</option>
            <option>Psicomotricidade</option>
            <option>Reunião</option>
            <option>Visita Escolar</option>
          </select>

          <select
            value={form.modalidade}
            onChange={(e) => atualizarCampo('modalidade', e.target.value)}
          >
            <option>Clínica</option>
            <option>Domiciliar</option>
            <option>Vídeo</option>
          </select>

          <input
            type="date"
            value={form.data}
            onChange={(e) => atualizarCampo('data', e.target.value)}
          />

          <select
            value={form.horario}
            onChange={(e) => atualizarCampo('horario', e.target.value)}
          >
            <option value="">Hora inicial</option>
            {horarios.map((h) => (
              <option key={h}>{h}</option>
            ))}
          </select>

          <select
            value={form.hora_fim}
            onChange={(e) => atualizarCampo('hora_fim', e.target.value)}
          >
            <option value="">Hora final</option>
            {horarios.map((h) => (
              <option key={h}>{h}</option>
            ))}
          </select>

          <input
            placeholder="Sala / ambiente"
            value={form.sala}
            onChange={(e) => atualizarCampo('sala', e.target.value)}
          />

          {form.tipo_atendimento === 'Individual' && (
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
          )}

          <input
            type="number"
            placeholder="Valor cobrado da família"
            value={form.valor_por_paciente}
            onChange={(e) => atualizarCampo('valor_por_paciente', e.target.value)}
          />

          <input
            type="number"
            placeholder="Duração em horas"
            value={form.duracao_horas}
            onChange={(e) => atualizarCampo('duracao_horas', e.target.value)}
          />

          <input
            type="number"
            placeholder="Taxa deslocamento"
            value={form.taxa_deslocamento}
            onChange={(e) => atualizarCampo('taxa_deslocamento', e.target.value)}
          />

          <select
            value={form.status}
            onChange={(e) => atualizarCampo('status', e.target.value)}
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
            onChange={(e) => atualizarCampo('link_videochamada', e.target.value)}
          />

          <label style={check}>
            <input
              type="checkbox"
              checked={form.recorrente}
              onChange={(e) => atualizarCampo('recorrente', e.target.checked)}
            />
            Repetir semanalmente
          </label>

          {form.recorrente && (
            <input
              type="number"
              placeholder="Quantidade de repetições"
              value={form.quantidade_repeticoes}
              onChange={(e) => atualizarCampo('quantidade_repeticoes', e.target.value)}
            />
          )}

          <textarea
            placeholder="Observações"
            value={form.observacoes}
            onChange={(e) => atualizarCampo('observacoes', e.target.value)}
            style={{ gridColumn: '1 / span 2', minHeight: 100 }}
          />
        </div>

        {form.tipo_atendimento === 'Grupo' && (
          <div style={grupoBox}>
            <h3>Pacientes do grupo</h3>

            <div style={grupoLista}>
              {pacientes.map((p) => (
                <label key={p.id} style={grupoItem}>
                  <input
                    type="checkbox"
                    checked={pacientesGrupo.includes(p.id)}
                    onChange={() => togglePacienteGrupo(p.id)}
                  />
                  {p.nome}
                </label>
              ))}
            </div>
          </div>
        )}

        <div style={financeiroBox}>
          <h2>Financeiro automático</h2>

          <p><strong>Tipo pagamento profissional:</strong> {form.tipo_pagamento_profissional}</p>
          <p><strong>Total família:</strong> R$ {form.valor_total_familia}</p>
          <p><strong>Total profissional:</strong> R$ {form.valor_total_profissional}</p>
          <p><strong>Lucro clínica:</strong> R$ {form.lucro_clinica}</p>
        </div>

        <button onClick={salvarAgenda} style={botaoPrincipal}>
          Salvar atendimento
        </button>
      </div>

      <div style={box}>
        <h2>Agenda cadastrada</h2>

        {agendaOrdenada.map((item) => (
          <div key={item.id} style={card}>
            <h3>{item.servico || 'Atendimento'}</h3>

            <p><strong>Data:</strong> {dataBR(item.data)}</p>
            <p><strong>Horário:</strong> {item.horario || '-'} até {item.hora_fim || '-'}</p>
            <p><strong>Profissional:</strong> {item.profissionais?.nome || '-'}</p>
            <p><strong>Paciente:</strong> {item.pacientes?.nome || 'Grupo'}</p>
            <p><strong>Tipo:</strong> {item.tipo_atendimento || '-'}</p>
            <p><strong>Sala:</strong> {item.sala || '-'}</p>
            <p><strong>Status:</strong> {item.status || '-'}</p>

            {item.observacao_conflito && (
              <p style={{ color: '#b45309' }}>
                <strong>Conflito:</strong> {item.observacao_conflito}
              </p>
            )}

            <p><strong>Receita família:</strong> R$ {item.valor_total_familia || 0}</p>
            <p><strong>Pagamento profissional:</strong> R$ {item.valor_total_profissional || 0}</p>
            <p><strong>Lucro clínica:</strong> R$ {item.lucro_clinica || 0}</p>
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

const alertaConflito = {
  background: '#fff7ed',
  border: '1px solid #fed7aa',
  color: '#9a3412',
  padding: 14,
  borderRadius: 12,
  marginBottom: 18,
  fontWeight: 'bold'
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
  border: '1px solid #ddd',
  display: 'flex',
  gap: 8,
  alignItems: 'center'
}

const financeiroBox = {
  marginTop: 25,
  background: '#ecfeff',
  border: '1px solid #a5f3fc',
  borderRadius: 14,
  padding: 20
}

const check = {
  display: 'flex',
  alignItems: 'center',
  gap: 8
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
