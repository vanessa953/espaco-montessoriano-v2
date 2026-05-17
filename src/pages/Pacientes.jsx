import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Pacientes() {
  const [pacientes, setPacientes] = useState([])
  const [busca, setBusca] = useState('')
  const [editandoId, setEditandoId] = useState(null)

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
    status: 'Ativo',
    login_familia: '',
    senha_familia: ''
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

  useEffect(() => {
    carregarPacientes()
  }, [])

  function atualizarCampo(campo, valor) {
    setForm((prev) => ({
      ...prev,
      [campo]: valor
    }))
  }

  function gerarAcessoFamilia() {
    const primeiroNome =
      form.nome
        ?.trim()
        ?.split(' ')[0]
        ?.toLowerCase()
        ?.normalize('NFD')
        ?.replace(/[\u0300-\u036f]/g, '') || 'familia'

    const cpfLimpo =
      form.cpf_responsavel?.replace(/\D/g, '')

    const login =
      cpfLimpo && cpfLimpo.length >= 6
        ? cpfLimpo
        : `${primeiroNome}${Math.floor(Math.random() * 9999)}`

    const senha = `${primeiroNome}123`

    return {
      login_familia: login,
      senha_familia: senha
    }
  }

  async function salvarPaciente() {
    if (!form.nome) {
      alert('Digite o nome do paciente')
      return
    }

    const acessos = gerarAcessoFamilia()

    const dados = {
      ...form,
      ...acessos
    }

    if (editandoId) {
      const { error } = await supabase
        .from('pacientes')
        .update(dados)
        .eq('id', editandoId)

      if (error) {
        console.log(error)
        alert('Erro ao atualizar paciente')
        return
      }

      alert('Paciente atualizado com sucesso')
    } else {
      const { error } = await supabase
        .from('pacientes')
        .insert([dados])

      if (error) {
        console.log(error)
        alert('Erro ao cadastrar paciente')
        return
      }

      alert('Paciente cadastrado com sucesso')
    }

    limparFormulario()
    carregarPacientes()
  }

  function limparFormulario() {
    setEditandoId(null)

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
      status: 'Ativo',
      login_familia: '',
      senha_familia: ''
    })
  }

  async function excluirPaciente(id) {
    const confirmar = confirm(
      'Deseja realmente excluir este paciente?'
    )

    if (!confirmar) return

    const { error } = await supabase
      .from('pacientes')
      .delete()
      .eq('id', id)

    if (error) {
      console.log(error)
      alert('Erro ao excluir')
      return
    }

    carregarPacientes()
  }

  function editarPaciente(paciente) {
    setEditandoId(paciente.id)

    setForm({
      nome: paciente.nome || '',
      data_nascimento: paciente.data_nascimento || '',
      cpf: paciente.cpf || '',
      responsavel: paciente.responsavel || '',
      cpf_responsavel: paciente.cpf_responsavel || '',
      telefone: paciente.telefone || '',
      email: paciente.email || '',
      endereco: paciente.endereco || '',
      escola: paciente.escola || '',
      serie: paciente.serie || '',
      diagnostico: paciente.diagnostico || '',
      observacoes: paciente.observacoes || '',
      status: paciente.status || 'Ativo',
      login_familia: paciente.login_familia || '',
      senha_familia: paciente.senha_familia || ''
    })

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

  function copiarAcesso(login, senha) {
    navigator.clipboard.writeText(
      `Login: ${login}\nSenha: ${senha}`
    )

    alert('Acesso copiado')
  }

  function abrirWhatsApp(numero) {
    if (!numero) {
      alert('Paciente sem telefone cadastrado')
      return
    }

    const telefone = numero.replace(/\D/g, '')

    window.open(
      `https://wa.me/55${telefone}`,
      '_blank'
    )
  }

  const pacientesFiltrados = useMemo(() => {
    return pacientes.filter((p) => {
      const texto = busca.toLowerCase()

      return (
        p.nome?.toLowerCase().includes(texto) ||
        p.responsavel?.toLowerCase().includes(texto)
      )
    })
  }, [pacientes, busca])

  return (
    <div
      style={{
        padding: 30,
        fontFamily: 'Arial',
        background: '#f5f7fb',
        minHeight: '100vh'
      }}
    >
      <h1>Pacientes</h1>

      <p style={{ color: '#666', marginBottom: 30 }}>
        Cadastro profissional de pacientes e acesso automático do App Família.
      </p>

      <div style={box}>
        <h2>
          {editandoId
            ? 'Editar paciente'
            : 'Cadastrar paciente'}
        </h2>

        <div style={grid}>
          <input
            placeholder="Nome do paciente"
            value={form.nome}
            onChange={(e) =>
              atualizarCampo('nome', e.target.value)
            }
          />

          <input
            type="date"
            value={form.data_nascimento}
            onChange={(e) =>
              atualizarCampo(
                'data_nascimento',
                e.target.value
              )
            }
          />

          <input
            placeholder="CPF do paciente"
            value={form.cpf}
            onChange={(e) =>
              atualizarCampo('cpf', e.target.value)
            }
          />

          <input
            placeholder="Responsável"
            value={form.responsavel}
            onChange={(e) =>
              atualizarCampo(
                'responsavel',
                e.target.value
              )
            }
          />

          <input
            placeholder="CPF do responsável"
            value={form.cpf_responsavel}
            onChange={(e) =>
              atualizarCampo(
                'cpf_responsavel',
                e.target.value
              )
            }
          />

          <input
            placeholder="WhatsApp"
            value={form.telefone}
            onChange={(e) =>
              atualizarCampo(
                'telefone',
                e.target.value
              )
            }
          />

          <input
            placeholder="E-mail"
            value={form.email}
            onChange={(e) =>
              atualizarCampo('email', e.target.value)
            }
          />

          <input
            placeholder="Endereço"
            value={form.endereco}
            onChange={(e) =>
              atualizarCampo(
                'endereco',
                e.target.value
              )
            }
          />

          <input
            placeholder="Escola"
            value={form.escola}
            onChange={(e) =>
              atualizarCampo('escola', e.target.value)
            }
          />

          <input
            placeholder="Série"
            value={form.serie}
            onChange={(e) =>
              atualizarCampo('serie', e.target.value)
            }
          />

          <select
            value={form.status}
            onChange={(e) =>
              atualizarCampo('status', e.target.value)
            }
          >
            <option>Ativo</option>
            <option>Inativo</option>
          </select>

          <div />

          <textarea
            placeholder="Diagnóstico / hipótese diagnóstica"
            value={form.diagnostico}
            onChange={(e) =>
              atualizarCampo(
                'diagnostico',
                e.target.value
              )
            }
            style={{
              gridColumn: '1 / span 2',
              minHeight: 90
            }}
          />

          <textarea
            placeholder="Observações clínicas"
            value={form.observacoes}
            onChange={(e) =>
              atualizarCampo(
                'observacoes',
                e.target.value
              )
            }
            style={{
              gridColumn: '1 / span 2',
              minHeight: 120
            }}
          />

          <button
            onClick={salvarPaciente}
            style={botaoPrincipal}
          >
            {editandoId
              ? 'Atualizar Paciente'
              : 'Cadastrar Paciente'}
          </button>

          <button
            onClick={limparFormulario}
            style={botaoSecundario}
          >
            Limpar
          </button>
        </div>
      </div>

      <div style={box}>
        <h2>Buscar pacientes</h2>

        <input
          placeholder="Buscar por paciente ou responsável"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          style={{
            width: '100%',
            padding: 14,
            borderRadius: 10,
            border: '1px solid #ccc'
          }}
        />
      </div>

      <h2 style={{ marginTop: 30 }}>
        Pacientes cadastrados
      </h2>

      <div
        style={{
          display: 'grid',
          gap: 15,
          marginTop: 20
        }}
      >
        {pacientesFiltrados.map((p) => (
          <div
            key={p.id}
            style={cardPaciente}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 20,
                flexWrap: 'wrap'
              }}
            >
              <div>
                <h3 style={{ margin: 0 }}>
                  {p.nome}
                </h3>

                <p>
                  <strong>Responsável:</strong>{' '}
                  {p.responsavel}
                </p>

                <p>
                  <strong>WhatsApp:</strong>{' '}
                  {p.telefone}
                </p>

                <p>
                  <strong>Escola:</strong>{' '}
                  {p.escola}
                </p>

                <p>
                  <strong>Série:</strong>{' '}
                  {p.serie}
                </p>

                <p>
                  <strong>Status:</strong>{' '}
                  {p.status}
                </p>
              </div>

              <div>
                <p>
                  <strong>Login Família:</strong>{' '}
                  {p.login_familia}
                </p>

                <p>
                  <strong>Senha Família:</strong>{' '}
                  {p.senha_familia}
                </p>

                <div
                  style={{
                    display: 'flex',
                    gap: 10,
                    marginTop: 20,
                    flexWrap: 'wrap'
                  }}
                >
                  <button
                    onClick={() =>
                      copiarAcesso(
                        p.login_familia,
                        p.senha_familia
                      )
                    }
                    style={botaoCopiar}
                  >
                    Copiar acesso
                  </button>

                  <button
                    onClick={() =>
                      abrirWhatsApp(p.telefone)
                    }
                    style={botaoWhats}
                  >
                    WhatsApp
                  </button>

                  <button
                    onClick={() =>
                      editarPaciente(p)
                    }
                    style={botaoEditar}
                  >
                    Editar
                  </button>

                  <button
                    onClick={() =>
                      excluirPaciente(p.id)
                    }
                    style={botaoExcluir}
                  >
                    Excluir
                  </button>
                </div>
              </div>
            </div>
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

const cardPaciente = {
  background: '#fff',
  borderRadius: 16,
  padding: 20,
  boxShadow: '0 2px 10px rgba(0,0,0,0.08)'
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

const botaoSecundario = {
  background: '#ddd',
  border: 'none',
  borderRadius: 10,
  padding: 14,
  cursor: 'pointer'
}

const botaoCopiar = {
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

const botaoEditar = {
  background: '#f59e0b',
  color: '#fff',
  border: 'none',
  borderRadius: 10,
  padding: 10,
  cursor: 'pointer'
}

const botaoExcluir = {
  background: '#dc2626',
  color: '#fff',
  border: 'none',
  borderRadius: 10,
  padding: 10,
  cursor: 'pointer'
}
