import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Pacientes() {
  const [pacientes, setPacientes] = useState([])

  const [form, setForm] = useState({
    nome: '',
    data_nascimento: '',
    cpf: '',
    responsavel: '',
    cpf_responsavel: '',
    telefone: '',
    email: '',
    endereco: '',
    escola: '',
    serie: '',
    diagnostico: '',
    observacoes: '',
    status: 'Ativo'
  })

  async function carregarPacientes() {
    const { data, error } = await supabase
      .from('pacientes')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.log(error)
      return
    }

    setPacientes(data || [])
  }

  async function cadastrarPaciente() {
    if (!form.nome) {
      alert('Digite o nome do paciente')
      return
    }

    const { error } = await supabase
      .from('pacientes')
      .insert([form])

    if (error) {
      console.log(error)
      alert('Erro ao cadastrar')
      return
    }

    alert('Paciente cadastrado com sucesso')

    setForm({
      nome: '',
      data_nascimento: '',
      cpf: '',
      responsavel: '',
      cpf_responsavel: '',
      telefone: '',
      email: '',
      endereco: '',
      escola: '',
      serie: '',
      diagnostico: '',
      observacoes: '',
      status: 'Ativo'
    })

    carregarPacientes()
  }

  useEffect(() => {
    carregarPacientes()
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
      <h1 style={{ marginBottom: 5 }}>
        Pacientes
      </h1>

      <p style={{ color: '#666', marginBottom: 30 }}>
        Cadastro e gerenciamento completo de pacientes.
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
        <input
          placeholder="Nome do paciente"
          value={form.nome}
          onChange={(e) => atualizarCampo('nome', e.target.value)}
        />

        <input
          type="date"
          value={form.data_nascimento}
          onChange={(e) => atualizarCampo('data_nascimento', e.target.value)}
        />

        <input
          placeholder="CPF do paciente"
          value={form.cpf}
          onChange={(e) => atualizarCampo('cpf', e.target.value)}
        />

        <input
          placeholder="Responsável"
          value={form.responsavel}
          onChange={(e) => atualizarCampo('responsavel', e.target.value)}
        />

        <input
          placeholder="CPF do responsável"
          value={form.cpf_responsavel}
          onChange={(e) => atualizarCampo('cpf_responsavel', e.target.value)}
        />

        <input
          placeholder="WhatsApp"
          value={form.telefone}
          onChange={(e) => atualizarCampo('telefone', e.target.value)}
        />

        <input
          placeholder="E-mail"
          value={form.email}
          onChange={(e) => atualizarCampo('email', e.target.value)}
        />

        <input
          placeholder="Escola"
          value={form.escola}
          onChange={(e) => atualizarCampo('escola', e.target.value)}
        />

        <input
          placeholder="Série"
          value={form.serie}
          onChange={(e) => atualizarCampo('serie', e.target.value)}
        />

        <input
          placeholder="Endereço"
          value={form.endereco}
          onChange={(e) => atualizarCampo('endereco', e.target.value)}
        />

        <textarea
          placeholder="Diagnóstico / Hipótese diagnóstica"
          value={form.diagnostico}
          onChange={(e) => atualizarCampo('diagnostico', e.target.value)}
          style={{
            gridColumn: '1 / span 2',
            minHeight: 90
          }}
        />

        <textarea
          placeholder="Observações clínicas"
          value={form.observacoes}
          onChange={(e) => atualizarCampo('observacoes', e.target.value)}
          style={{
            gridColumn: '1 / span 2',
            minHeight: 120
          }}
        />

        <select
          value={form.status}
          onChange={(e) => atualizarCampo('status', e.target.value)}
        >
          <option>Ativo</option>
          <option>Inativo</option>
        </select>

        <button
          onClick={cadastrarPaciente}
          style={{
            background: '#0f766e',
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Cadastrar Paciente
        </button>
      </div>

      <h2 style={{ marginTop: 40 }}>
        Pacientes cadastrados
      </h2>

      <div
        style={{
          display: 'grid',
          gap: 15,
          marginTop: 20
        }}
      >
        {pacientes.map((p) => (
          <div
            key={p.id}
            style={{
              background: '#fff',
              borderRadius: 16,
              padding: 20,
              boxShadow: '0 2px 10px rgba(0,0,0,0.08)'
            }}
          >
            <h3 style={{ margin: 0 }}>
              {p.nome}
            </h3>

            <p>
              <strong>Responsável:</strong> {p.responsavel}
            </p>

            <p>
              <strong>WhatsApp:</strong> {p.telefone}
            </p>

            <p>
              <strong>Escola:</strong> {p.escola}
            </p>

            <p>
              <strong>Série:</strong> {p.serie}
            </p>

            <p>
              <strong>Status:</strong> {p.status}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
