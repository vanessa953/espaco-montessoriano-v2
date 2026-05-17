import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Agenda() {
  const [agenda, setAgenda] = useState([])
  const [pacientes, setPacientes] = useState([])

  const [form, setForm] = useState({
    paciente_id: '',
    titulo: '',
    descricao: '',
    data: '',
    horario: '',
    status: 'agendado',
    modalidade: 'Clínica'
  })

  async function carregarPacientes() {
    const { data } = await supabase
      .from('pacientes')
      .select('id, nome')
      .order('nome')

    setPacientes(data || [])
  }

  async function carregarAgenda() {
    const { data, error } = await supabase
      .from('agenda')
      .select(`
        *,
        pacientes (
          nome
        )
      `)
      .order('data', { ascending: true })

    if (error) {
      console.log(error)
      return
    }

    setAgenda(data || [])
  }

  async function cadastrarAtendimento() {
    if (!form.paciente_id || !form.data || !form.horario) {
      alert('Preencha paciente, data e horário')
      return
    }

    const { error } = await supabase
      .from('agenda')
      .insert([form])

    if (error) {
      console.log(error)
      alert('Erro ao cadastrar atendimento')
      return
    }

    alert('Atendimento cadastrado com sucesso')

    setForm({
      paciente_id: '',
      titulo: '',
      descricao: '',
      data: '',
      horario: '',
      status: 'agendado',
      modalidade: 'Clínica'
    })

    carregarAgenda()
  }

  useEffect(() => {
    carregarPacientes()
    carregarAgenda()
  }, [])

  function atualizarCampo(campo, valor) {
    setForm((prev) => ({
      ...prev,
      [campo]: valor
    }))
  }

  return (
    <div
      style={{
        padding: 30,
        fontFamily: 'Arial',
        background: '#f5f7fb',
        minHeight: '100vh'
      }}
    >
      <h1>Agenda Clínica</h1>

      <p style={{ color: '#666', marginBottom: 30 }}>
        Controle profissional de atendimentos e sessões.
      </p>

      <div
        style={{
          background: '#fff',
          padding: 25,
          borderRadius: 16,
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 15
        }}
      >
        <select
          value={form.paciente_id}
          onChange={(e) =>
            atualizarCampo('paciente_id', e.target.value)
          }
        >
          <option value="">Selecione o paciente</option>

          {pacientes.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>

        <input
          placeholder="Título do atendimento"
          value={form.titulo}
          onChange={(e) =>
            atualizarCampo('titulo', e.target.value)
          }
        />

        <input
          type="date"
          value={form.data}
          onChange={(e) =>
            atualizarCampo('data', e.target.value)
          }
        />

        <input
          type="time"
          value={form.horario}
          onChange={(e) =>
            atualizarCampo('horario', e.target.value)
          }
        />

        <select
          value={form.status}
          onChange={(e) =>
            atualizarCampo('status', e.target.value)
          }
        >
          <option value="agendado">Agendado</option>
          <option value="confirmado">Confirmado</option>
          <option value="realizado">Realizado</option>
          <option value="cancelado">Cancelado</option>
          <option value="falta">Falta</option>
          <option value="reposicao">Reposição</option>
        </select>

        <select
          value={form.modalidade}
          onChange={(e) =>
            atualizarCampo('modalidade', e.target.value)
          }
        >
          <option value="Clínica">Clínica</option>
          <option value="Domiciliar">Domiciliar</option>
          <option value="Vídeo">Vídeo</option>
        </select>

        <textarea
          placeholder="Descrição / observações"
          value={form.descricao}
          onChange={(e) =>
            atualizarCampo('descricao', e.target.value)
          }
          style={{
            gridColumn: '1 / span 2',
            minHeight: 100
          }}
        />

        <button
          onClick={cadastrarAtendimento}
          style={{
            gridColumn: '1 / span 2',
            background: '#0f766e',
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            padding: 14,
            fontWeight: 'bold',
            cursor: 'pointer',
            fontSize: 15
          }}
        >
          Cadastrar Atendimento
        </button>
      </div>

      <h2 style={{ marginTop: 40 }}>
        Atendimentos cadastrados
      </h2>

      <div
        style={{
          display: 'grid',
          gap: 15,
          marginTop: 20
        }}
      >
        {agenda.map((item) => (
          <div
            key={item.id}
            style={{
              background: '#fff',
              borderRadius: 16,
              padding: 20,
              boxShadow: '0 2px 10px rgba(0,0,0,0.08)'
            }}
          >
            <h3 style={{ margin: 0 }}>
              {item.pacientes?.nome ||
                'Paciente não informado'}
            </h3>

            <p>
              <strong>Data:</strong> {item.data}
            </p>

            <p>
              <strong>Horário:</strong> {item.horario}
            </p>

            <p>
              <strong>Título:</strong> {item.titulo}
            </p>

            <p>
              <strong>Status:</strong> {item.status}
            </p>

            <p>
              <strong>Modalidade:</strong> {item.modalidade}
            </p>

            <p>
              <strong>Observações:</strong> {item.descricao}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
