import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

const DIAS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

function gerarHorarios() {
  const horarios = []
  for (let h = 8; h <= 19; h++) {
    horarios.push(`${String(h).padStart(2, '0')}:00`)
    if (h < 19) horarios.push(`${String(h).padStart(2, '0')}:30`)
  }
  return horarios
}

function diaSemanaBR(data) {
  if (!data) return ''
  const d = new Date(data + 'T12:00:00')
  const nomes = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
  return nomes[d.getDay()]
}

function somarSemanas(data, semanas) {
  const d = new Date(data + 'T12:00:00')
  d.setDate(d.getDate() + semanas * 7)
  return d.toISOString().slice(0, 10)
}

function formatarData(data) {
  if (!data) return '-'
  const [ano, mes, dia] = data.split('-')
  return `${dia}/${mes}/${ano}`
}

function dinheiro(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  })
}

export default function Agenda() {
  const [agenda, setAgenda] = useState([])
  const [pacientes, setPacientes] = useState([])
  const [profissionais, setProfissionais] = useState([])

  const [filtros, setFiltros] = useState({
    status: '',
    modalidade: '',
    profissional_id: '',
    data: ''
  })

  const [form, setForm] = useState({
    paciente_id: '',
    profissional_id: '',
    servico: '',
    titulo: '',
    descricao: '',
    data: '',
    horario: '',
    status: 'agendado',
    modalidade: 'Clínica',
    taxa_deslocamento: 0,
    link_video: '',
    repetir: 'nao'
  })

  const horarios = gerarHorarios()

  async function carregarPacientes() {
    const { data } = await supabase
      .from('pacientes')
      .select('id, nome, telefone')
      .order('nome')

    setPacientes(data || [])
  }

  async function carregarProfissionais() {
    const { data } = await supabase
      .from('profissionais')
      .select('id, nome, cargo, especialidade')
      .order('nome')

    setProfissionais(data || [])
  }

  async function carregarAgenda() {
    const { data, error } = await supabase
      .from('agenda')
      .select(`
        *,
        pacientes (
          nome,
          telefone
        ),
        profissionais (
          nome
        )
      `)
      .order('data', { ascending: true })
      .order('horario', { ascending: true })

    if (error) {
      console.log(error)
      return
    }

    setAgenda(data || [])
  }

  useEffect(() => {
    carregarPacientes()
    carregarProfissionais()
    carregarAgenda()
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

  async function cadastrarAtendimento() {
    if (!form.paciente_id || !form.data || !form.horario || !form.servico) {
      alert('Preencha paciente, serviço, data e horário.')
      return
    }

    if (form.modalidade === 'Vídeo' && !form.link_video) {
      alert('Para atendimento por vídeo, informe o link da videochamada.')
      return
    }

    const quantidade =
      form.repetir === '4' ? 4 :
      form.repetir === '8' ? 8 :
      form.repetir === '12' ? 12 :
      1

    const recorrenciaId = quantidade > 1 ? String(Date.now()) : null

    const registros = []

    for (let i = 0; i < quantidade; i++) {
      const dataFinal = i === 0 ? form.data : somarSemanas(form.data, i)

      registros.push({
        paciente_id: form.paciente_id,
        profissional_id: form.profissional_id || null,
        servico: form.servico,
        titulo: form.titulo || form.servico,
        descricao: form.descricao,
        data: dataFinal,
        horario: form.horario,
        status: form.status,
        modalidade: form.modalidade,
        taxa_deslocamento: Number(form.taxa_deslocamento || 0),
        link_video: form.link_video,
        repetir_semanal: quantidade > 1,
        recorrencia_id: recorrenciaId
      })
    }

    const { error } = await supabase
      .from('agenda')
      .insert(registros)

    if (error) {
      console.log(error)
      alert('Erro ao cadastrar atendimento.')
      return
    }

    alert(
      quantidade > 1
        ? 'Atendimentos recorrentes cadastrados com sucesso.'
        : 'Atendimento cadastrado com sucesso.'
    )

    setForm({
      paciente_id: '',
      profissional_id: '',
      servico: '',
      titulo: '',
      descricao: '',
      data: '',
      horario: '',
      status: 'agendado',
      modalidade: 'Clínica',
      taxa_deslocamento: 0,
      link_video: '',
      repetir: 'nao'
    })

    carregarAgenda()
  }

  function enviarWhatsApp(item) {
    const telefone = item.pacientes?.telefone

    if (!telefone) {
      alert('Paciente sem WhatsApp cadastrado.')
      return
    }

    const numero = telefone.replace(/\D/g, '')

    const mensagem = `Olá! Confirmamos o atendimento no Espaço Montessoriano.%0A%0APaciente: ${item.pacientes?.nome}%0AData: ${formatarData(item.data)}%0AHorário: ${item.horario}%0AServiço: ${item.servico || item.titulo}%0AModalidade: ${item.modalidade}%0AStatus: ${item.status}${item.link_video ? `%0ALink: ${item.link_video}` : ''}%0A%0AQualquer dúvida, estamos à disposição.`

    window.open(`https://wa.me/55${numero}?text=${mensagem}`, '_blank')
  }

  const agendaFiltrada = useMemo(() => {
    return agenda.filter((item) => {
      if (filtros.status && item.status !== filtros.status) return false
      if (filtros.modalidade && item.modalidade !== filtros.modalidade) return false
      if (filtros.profissional_id && item.profissional_id !== filtros.profissional_id) return false
      if (filtros.data && item.data !== filtros.data) return false
      return true
    })
  }, [agenda, filtros])

  const resumoFinanceiro = useMemo(() => {
    const totalDomiciliar = agendaFiltrada
      .filter((item) => item.modalidade === 'Domiciliar')
      .reduce((soma, item) => soma + Number(item.taxa_deslocamento || 0), 0)

    return {
      totalSessoes: agendaFiltrada.length,
      clinica: agendaFiltrada.filter((i) => i.modalidade === 'Clínica').length,
      domiciliar: agendaFiltrada.filter((i) => i.modalidade === 'Domiciliar').length,
      video: agendaFiltrada.filter((i) => i.modalidade === 'Vídeo').length,
      deslocamento: totalDomiciliar
    }
  }, [agendaFiltrada])

  return (
    <div style={{ padding: 30, fontFamily: 'Arial', background: '#f5f7fb', minHeight: '100vh' }}>
      <h1>Agenda Profissional</h1>

      <p style={{ color: '#666', marginBottom: 30 }}>
        Visão semanal, atendimentos recorrentes, modalidade, profissional, serviço, WhatsApp e financeiro da agenda.
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: 12,
        marginBottom: 25
      }}>
        <div style={cardResumo}>
          <strong>{resumoFinanceiro.totalSessoes}</strong>
          <span>Total de sessões</span>
        </div>

        <div style={cardResumo}>
          <strong>{resumoFinanceiro.clinica}</strong>
          <span>Clínica</span>
        </div>

        <div style={cardResumo}>
          <strong>{resumoFinanceiro.domiciliar}</strong>
          <span>Domiciliar</span>
        </div>

        <div style={cardResumo}>
          <strong>{resumoFinanceiro.video}</strong>
          <span>Vídeo</span>
        </div>

        <div style={cardResumo}>
          <strong>{dinheiro(resumoFinanceiro.deslocamento)}</strong>
          <span>Taxas deslocamento</span>
        </div>
      </div>

      <div style={box}>
        <h2>Cadastrar atendimento</h2>

        <div style={grid}>
          <select value={form.paciente_id} onChange={(e) => atualizarCampo('paciente_id', e.target.value)}>
            <option value="">Selecione o paciente</option>
            {pacientes.map((p) => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>

          <select value={form.profissional_id} onChange={(e) => atualizarCampo('profissional_id', e.target.value)}>
            <option value="">Selecione o profissional</option>
            {profissionais.map((p) => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>

          <select value={form.servico} onChange={(e) => atualizarCampo('servico', e.target.value)}>
            <option value="">Serviço/Terapia</option>
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
            <option>Reunião com Família</option>
            <option>Reunião Escolar</option>
            <option>Visita Escolar</option>
          </select>

          <input
            placeholder="Título do atendimento"
            value={form.titulo}
            onChange={(e) => atualizarCampo('titulo', e.target.value)}
          />

          <input
            type="date"
            value={form.data}
            onChange={(e) => atualizarCampo('data', e.target.value)}
          />

          <input
            type="time"
            value={form.horario}
            onChange={(e) => atualizarCampo('horario', e.target.value)}
          />

          <select value={form.status} onChange={(e) => atualizarCampo('status', e.target.value)}>
            <option value="agendado">Agendado</option>
            <option value="confirmado">Confirmado</option>
            <option value="realizado">Realizado</option>
            <option value="falta">Falta</option>
            <option value="cancelado">Cancelado</option>
            <option value="reposicao">Reposição</option>
          </select>

          <select value={form.modalidade} onChange={(e) => atualizarCampo('modalidade', e.target.value)}>
            <option value="Clínica">Clínica</option>
            <option value="Domiciliar">Domiciliar</option>
            <option value="Vídeo">Vídeo</option>
          </select>

          <input
            type="number"
            placeholder="Taxa de deslocamento"
            value={form.taxa_deslocamento}
            onChange={(e) => atualizarCampo('taxa_deslocamento', e.target.value)}
            disabled={form.modalidade !== 'Domiciliar'}
          />

          <input
            placeholder="Link de videochamada"
            value={form.link_video}
            onChange={(e) => atualizarCampo('link_video', e.target.value)}
          />

          <select value={form.repetir} onChange={(e) => atualizarCampo('repetir', e.target.value)}>
            <option value="nao">Não repetir</option>
            <option value="4">Repetir semanalmente por 4 semanas</option>
            <option value="8">Repetir semanalmente por 8 semanas</option>
            <option value="12">Repetir semanalmente por 12 semanas</option>
          </select>

          <textarea
            placeholder="Observações"
            value={form.descricao}
            onChange={(e) => atualizarCampo('descricao', e.target.value)}
            style={{ gridColumn: '1 / span 2', minHeight: 90 }}
          />

          <button onClick={cadastrarAtendimento} style={botaoPrincipal}>
            Cadastrar Atendimento
          </button>
        </div>
      </div>

      <div style={box}>
        <h2>Filtros da agenda</h2>

        <div style={grid}>
          <input
            type="date"
            value={filtros.data}
            onChange={(e) => setFiltros({ ...filtros, data: e.target.value })}
          />

          <select value={filtros.status} onChange={(e) => setFiltros({ ...filtros, status: e.target.value })}>
            <option value="">Todos os status</option>
            <option value="agendado">Agendado</option>
            <option value="confirmado">Confirmado</option>
            <option value="realizado">Realizado</option>
            <option value="falta">Falta</option>
            <option value="cancelado">Cancelado</option>
            <option value="reposicao">Reposição</option>
          </select>

          <select value={filtros.modalidade} onChange={(e) => setFiltros({ ...filtros, modalidade: e.target.value })}>
            <option value="">Todas as modalidades</option>
            <option value="Clínica">Clínica</option>
            <option value="Domiciliar">Domiciliar</option>
            <option value="Vídeo">Vídeo</option>
          </select>

          <select value={filtros.profissional_id} onChange={(e) => setFiltros({ ...filtros, profissional_id: e.target.value })}>
            <option value="">Todos os profissionais</option>
            {profissionais.map((p) => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>

          <button onClick={() => setFiltros({ status: '', modalidade: '', profissional_id: '', data: '' })}>
            Limpar filtros
          </button>
        </div>
      </div>

      <h2>Visão semanal</h2>

      <div style={{ overflowX: 'auto' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '90px repeat(6, minmax(180px, 1fr))',
          background: '#fff',
          borderRadius: 16,
          overflow: 'hidden',
          border: '1px solid #ddd'
        }}>
          <div style={cabecalho}>Horário</div>

          {DIAS.map((dia) => (
            <div key={dia} style={cabecalho}>{dia}</div>
          ))}

          {horarios.map((hora) => (
            <>
              <div key={`hora-${hora}`} style={celulaHora}>{hora}</div>

              {DIAS.map((dia) => {
                const itens = agendaFiltrada.filter(
                  (item) => item.horario === hora && diaSemanaBR(item.data) === dia
                )

                return (
                  <div key={`${dia}-${hora}`} style={celula}>
                    {itens.map((item) => (
                      <div key={item.id} style={evento}>
                        <strong>{item.pacientes?.nome}</strong>
                        <span>{item.servico || item.titulo}</span>
                        <small>{item.modalidade} • {item.status}</small>

                        {item.link_video && (
                          <a href={item.link_video} target="_blank">
                            Abrir vídeo
                          </a>
                        )}

                        <button onClick={() => enviarWhatsApp(item)}>
                          WhatsApp
                        </button>
                      </div>
                    ))}
                  </div>
                )
              })}
            </>
          ))}
        </div>
      </div>

      <h2 style={{ marginTop: 40 }}>Lista de atendimentos</h2>

      <div style={{ display: 'grid', gap: 15, marginTop: 20 }}>
        {agendaFiltrada.map((item) => (
          <div key={item.id} style={cardAtendimento}>
            <h3>{item.pacientes?.nome || 'Paciente não informado'}</h3>

            <p><strong>Profissional:</strong> {item.profissionais?.nome || '-'}</p>
            <p><strong>Serviço:</strong> {item.servico}</p>
            <p><strong>Data:</strong> {formatarData(item.data)} às {item.horario}</p>
            <p><strong>Status:</strong> {item.status}</p>
            <p><strong>Modalidade:</strong> {item.modalidade}</p>
            <p><strong>Taxa deslocamento:</strong> {dinheiro(item.taxa_deslocamento)}</p>

            {item.link_video && (
              <p>
                <strong>Vídeo:</strong>{' '}
                <a href={item.link_video} target="_blank">
                  abrir link
                </a>
              </p>
            )}

            <p><strong>Observações:</strong> {item.descricao}</p>

            <button onClick={() => enviarWhatsApp(item)} style={botaoWhats}>
              Confirmar por WhatsApp
            </button>
          </div>
        ))}
      </div>
    </div>
  )
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

const botaoPrincipal = {
  gridColumn: '1 / span 2',
  background: '#0f766e',
  color: '#fff',
  border: 'none',
  borderRadius: 10,
  padding: 14,
  fontWeight: 'bold',
  cursor: 'pointer'
}

const cardResumo = {
  background: '#fff',
  padding: 18,
  borderRadius: 14,
  boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
  display: 'grid',
  gap: 5
}

const cabecalho = {
  padding: 10,
  background: '#0f766e',
  color: '#fff',
  fontWeight: 'bold',
  textAlign: 'center',
  border: '1px solid #0f766e'
}

const celulaHora = {
  padding: 8,
  background: '#eef7f4',
  fontWeight: 'bold',
  border: '1px solid #ddd'
}

const celula = {
  minHeight: 70,
  padding: 6,
  border: '1px solid #eee'
}

const evento = {
  background: '#dff7ef',
  borderLeft: '4px solid #0f766e',
  padding: 8,
  borderRadius: 8,
  display: 'grid',
  gap: 4,
  fontSize: 12,
  marginBottom: 6
}

const cardAtendimento = {
  background: '#fff',
  borderRadius: 16,
  padding: 20,
  boxShadow: '0 2px 10px rgba(0,0,0,0.08)'
}

const botaoWhats = {
  background: '#22c55e',
  color: '#fff',
  border: 'none',
  borderRadius: 10,
  padding: 10,
  fontWeight: 'bold',
  cursor: 'pointer'
}
