import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Pacientes() {
  const [pacientes, setPacientes] = useState([])
  const [nome, setNome] = useState('')
  const [responsavel, setResponsavel] = useState('')
  const [telefone, setTelefone] = useState('')

  async function carregarPacientes() {
    const { data, error } = await supabase
      .from('pacientes')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error) setPacientes(data || [])
  }

  async function cadastrarPaciente() {
    if (!nome) {
      alert('Digite o nome do paciente')
      return
    }

    const { error } = await supabase.from('pacientes').insert([
      {
        nome,
        responsavel,
        telefone
      }
    ])

    if (error) {
      alert('Erro ao cadastrar paciente')
      console.log(error)
      return
    }

    setNome('')
    setResponsavel('')
    setTelefone('')
    carregarPacientes()
  }

  useEffect(() => {
    carregarPacientes()
  }, [])

  return (
    <div style={{ padding: 30, fontFamily: 'Arial' }}>
      <h1>Pacientes</h1>
      <p>Cadastro e gerenciamento de pacientes.</p>

      <div style={{ display: 'grid', gap: 12, maxWidth: 500, marginTop: 30 }}>
        <input placeholder="Nome do paciente" value={nome} onChange={(e) => setNome(e.target.value)} />
        <input placeholder="Responsável" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} />
        <input placeholder="WhatsApp" value={telefone} onChange={(e) => setTelefone(e.target.value)} />

        <button onClick={cadastrarPaciente}>
          Cadastrar paciente
        </button>
      </div>

      <h2 style={{ marginTop: 40 }}>Pacientes cadastrados</h2>

      {pacientes.map((p) => (
        <div key={p.id} style={{ border: '1px solid #ccc', padding: 12, marginTop: 10 }}>
          <strong>{p.nome}</strong>
          <p>Responsável: {p.responsavel}</p>
          <p>WhatsApp: {p.telefone}</p>
        </div>
      ))}
    </div>
  )
}
