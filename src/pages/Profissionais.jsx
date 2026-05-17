import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Profissionais() {
  const [profissionais, setProfissionais] = useState([])
  const [busca, setBusca] = useState('')
  const [editandoId, setEditandoId] = useState(null)

  const [fotoArquivo, setFotoArquivo] = useState(null)
  const [documentos, setDocumentos] = useState([])
  const [notasFiscais, setNotasFiscais] = useState([])

  const [form, setForm] = useState({
    nome: '',
    cpf: '',
    email: '',
    telefone: '',
    cargo: '',
    especialidade: '',
    conselho: '',
    nivel_acesso: 'Terapeuta',
    observacoes: '',
    ativo: true,
    foto_url: '',
    login_app: '',
    senha_app: ''
  })

  async function carregarProfissionais() {
    const { data, error } = await supabase
      .from('profissionais')
      .select('*')
      .order('nome')

    if (error) {
      console.log(error)
      return
    }

    setProfissionais(data || [])
  }

  useEffect(() => {
    carregarProfissionais()
  }, [])

  function limparTexto(texto) {
    return String(texto || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '')
  }

  function gerarAcessoProfissional(dados) {
    const primeiroNome =
      limparTexto(dados.nome?.split(' ')[0]) || 'profissional'

    const login =
      dados.email?.trim() ||
      `${primeiroNome}${Math.floor(Math.random() * 9999)}@espacomontessoriano.com`

    const senha = `${primeiroNome}123`

    return {
      login_app: dados.login_app || login,
      senha_app: dados.senha_app || senha
    }
  }

  function atualizarCampo(campo, valor) {
    setForm((prev) => ({
      ...prev,
      [campo]: valor
    }))
  }

  async function enviarArquivo(bucket, arquivo, pasta) {
    if (!arquivo) return ''

    const nomeArquivo = `${pasta}/${Date.now()}-${arquivo.name}`

    const { error } = await supabase.storage
      .from(bucket)
      .upload(nomeArquivo, arquivo, {
        cacheControl: '3600',
        upsert: true
      })

    if (error) {
      console.log(error)
      alert('Erro ao enviar arquivo')
      return ''
    }

    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(nomeArquivo)

    return data.publicUrl
  }

  async function salvarProfissional() {
    if (!form.nome) {
      alert('Digite o nome do profissional')
      return
    }

    let fotoUrl = form.foto_url

    if (fotoArquivo) {
      fotoUrl = await enviarArquivo(
        'profissionais-documentos',
        fotoArquivo,
        'fotos'
      )
    }

    const acesso = gerarAcessoProfissional(form)

    const dados = {
      ...form,
      ...acesso,
      foto_url: fotoUrl
    }

    let profissionalId = editandoId

    if (editandoId) {
      const { error } = await supabase
        .from('profissionais')
        .update(dados)
        .eq('id', editandoId)

      if (error) {
        console.log(error)
        alert('Erro ao atualizar profissional')
        return
      }
    } else {
      const { data, error } = await supabase
        .from('profissionais')
        .insert([dados])
        .select()

      if (error) {
        console.log(error)
        alert('Erro ao cadastrar profissional')
        return
      }

      profissionalId = data?.[0]?.id
    }

    if (profissionalId) {
      await salvarDocumentos(profissionalId)
      await salvarNotasFiscais(profissionalId)
    }

    alert(
      editandoId
        ? 'Profissional atualizado com sucesso'
        : 'Profissional cadastrado com sucesso'
    )

    limparFormulario()
    carregarProfissionais()
  }

  async function salvarDocumentos(profissionalId) {
    for (const arquivo of documentos) {
      const url = await enviarArquivo(
        'profissionais-documentos',
        arquivo,
        profissionalId
      )

      if (url) {
        await supabase
          .from('profissionais_documentos')
          .insert([{
            profissional_id: profissionalId,
            nome_arquivo: arquivo.name,
            tipo: arquivo.type,
            url,
            categoria: 'Documento'
          }])
      }
    }
  }

  async function salvarNotasFiscais(profissionalId) {
    for (const arquivo of notasFiscais) {
      const url = await enviarArquivo(
        'profissionais-notas-fiscais',
        arquivo,
        profissionalId
      )

      if (url) {
        await supabase
          .from('profissionais_notas_fiscais')
          .insert([{
            profissional_id: profissionalId,
            nome_arquivo: arquivo.name,
            tipo: arquivo.type,
            url,
            competencia: new Date().toISOString().slice(0, 7),
            valor: 0,
            observacoes: 'Nota fiscal anexada no cadastro do profissional'
          }])
      }
    }
  }

  function editarProfissional(prof) {
    setEditandoId(prof.id)

    setForm({
      nome: prof.nome || '',
      cpf: prof.cpf || '',
      email: prof.email || '',
      telefone: prof.telefone || '',
      cargo: prof.cargo || '',
      especialidade: prof.especialidade || '',
      conselho: prof.conselho || '',
      nivel_acesso: prof.nivel_acesso || 'Terapeuta',
      observacoes: prof.observacoes || '',
      ativo: prof.ativo ?? true,
      foto_url: prof.foto_url || '',
      login_app: prof.login_app || '',
      senha_app: prof.senha_app || ''
    })

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

  async function excluirProfissional(id) {
    const confirmar = confirm(
      'Deseja realmente excluir este profissional?'
    )

    if (!confirmar) return

    const { error } = await supabase
      .from('profissionais')
      .delete()
      .eq('id', id)

    if (error) {
      console.log(error)
      alert('Erro ao excluir profissional')
      return
    }

    carregarProfissionais()
  }

  function limparFormulario() {
    setEditandoId(null)
    setFotoArquivo(null)
    setDocumentos([])
    setNotasFiscais([])

    setForm({
      nome: '',
      cpf: '',
      email: '',
      telefone: '',
      cargo: '',
      especialidade: '',
      conselho: '',
      nivel_acesso: 'Terapeuta',
      observacoes: '',
      ativo: true,
      foto_url: '',
      login_app: '',
      senha_app: ''
    })
  }

  function copiarAcesso(prof) {
    const texto = `Acesso ao App Espaço Montessoriano

Login: ${prof.login_app}
Senha: ${prof.senha_app}

Link: https://app.espacomontessoriano.com`

    navigator.clipboard.writeText(texto)
    alert('Acesso copiado')
  }

  function gerarAcessoManual() {
    const acesso = gerarAcessoProfissional(form)

    setForm((prev) => ({
      ...prev,
      ...acesso
    }))
  }

  const profissionaisFiltrados = useMemo(() => {
    const texto = busca.toLowerCase()

    return profissionais.filter((p) => {
      return (
        p.nome?.toLowerCase().includes(texto) ||
        p.email?.toLowerCase().includes(texto) ||
        p.cargo?.toLowerCase().includes(texto) ||
        p.especialidade?.toLowerCase().includes(texto) ||
        p.nivel_acesso?.toLowerCase().includes(texto)
      )
    })
  }, [profissionais, busca])

  return (
    <div style={pagina}>
      <h1>Profissionais</h1>

      <p style={{ color: '#666', marginBottom: 30 }}>
        Cadastro da equipe, documentos, notas fiscais, login automático, permissões e vínculos futuros com pacientes e financeiro.
      </p>

      <div style={box}>
        <h2>
          {editandoId
            ? 'Editar profissional'
            : 'Cadastrar profissional'}
        </h2>

        <div style={{ display: 'flex', gap: 25, marginBottom: 25, flexWrap: 'wrap' }}>
          <div style={fotoBox}>
            {form.foto_url ? (
              <img
                src={form.foto_url}
                alt={form.nome}
                style={fotoImg}
              />
            ) : (
              <span>Sem foto</span>
            )}
          </div>

          <div>
            <label>Foto do profissional</label>
            <br />
            <input
              type="file"
              accept="image/*"
              onChange={(e) =>
                setFotoArquivo(e.target.files[0])
              }
            />
          </div>
        </div>

        <div style={grid}>
          <input
            placeholder="Nome completo"
            value={form.nome}
            onChange={(e) =>
              atualizarCampo('nome', e.target.value)
            }
          />

          <input
            placeholder="CPF"
            value={form.cpf}
            onChange={(e) =>
              atualizarCampo('cpf', e.target.value)
            }
          />

          <input
            placeholder="E-mail / login"
            value={form.email}
            onChange={(e) =>
              atualizarCampo('email', e.target.value)
            }
          />

          <input
            placeholder="Telefone / WhatsApp"
            value={form.telefone}
            onChange={(e) =>
              atualizarCampo('telefone', e.target.value)
            }
          />

          <input
            placeholder="Cargo / função"
            value={form.cargo}
            onChange={(e) =>
              atualizarCampo('cargo', e.target.value)
            }
          />

          <input
            placeholder="Especialidade"
            value={form.especialidade}
            onChange={(e) =>
              atualizarCampo('especialidade', e.target.value)
            }
          />

          <input
            placeholder="Conselho profissional"
            value={form.conselho}
            onChange={(e) =>
              atualizarCampo('conselho', e.target.value)
            }
          />

          <select
            value={form.nivel_acesso}
            onChange={(e) =>
              atualizarCampo('nivel_acesso', e.target.value)
            }
          >
            <option>Administradora</option>
            <option>Coordenação</option>
            <option>Recepção</option>
            <option>Financeiro</option>
            <option>Supervisor</option>
            <option>Terapeuta</option>
            <option>Família</option>
          </select>

          <select
            value={form.ativo ? 'Ativo' : 'Inativo'}
            onChange={(e) =>
              atualizarCampo(
                'ativo',
                e.target.value === 'Ativo'
              )
            }
          >
            <option>Ativo</option>
            <option>Inativo</option>
          </select>

          <div />

          <div style={acessoBox}>
            <h3>Acesso automático ao App</h3>

            <input
              placeholder="Login do app"
              value={form.login_app}
              onChange={(e) =>
                atualizarCampo('login_app', e.target.value)
              }
              style={{ marginBottom: 10 }}
            />

            <input
              placeholder="Senha do app"
              value={form.senha_app}
              onChange={(e) =>
                atualizarCampo('senha_app', e.target.value)
              }
              style={{ marginBottom: 10 }}
            />

            <button
              type="button"
              onClick={gerarAcessoManual}
              style={botaoCopiar}
            >
              Gerar login e senha
            </button>
          </div>

          <textarea
            placeholder="Observações sobre o profissional"
            value={form.observacoes}
            onChange={(e) =>
              atualizarCampo('observacoes', e.target.value)
            }
            style={{
              minHeight: 140
            }}
          />

          <div>
            <label>Documentos do profissional</label>
            <input
              type="file"
              multiple
              onChange={(e) =>
                setDocumentos(
                  Array.from(e.target.files || [])
                )
              }
            />
          </div>

          <div>
            <label>Notas fiscais</label>
            <input
              type="file"
              multiple
              onChange={(e) =>
                setNotasFiscais(
                  Array.from(e.target.files || [])
                )
              }
            />
          </div>

          <button
            onClick={salvarProfissional}
            style={botaoPrincipal}
          >
            {editandoId
              ? 'Atualizar profissional'
              : 'Cadastrar profissional'}
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
        <h2>Buscar profissional</h2>

        <input
          placeholder="Buscar por nome, e-mail, cargo, especialidade ou nível de acesso"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          style={inputBusca}
        />
      </div>

      <h2>Profissionais cadastrados</h2>

      <div style={{ display: 'grid', gap: 15 }}>
        {profissionaisFiltrados.map((p) => (
          <div key={p.id} style={card}>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              <div style={miniFotoBox}>
                {p.foto_url ? (
                  <img
                    src={p.foto_url}
                    alt={p.nome}
                    style={miniFotoImg}
                  />
                ) : (
                  <span>Sem foto</span>
                )}
              </div>

              <div style={{ flex: 1 }}>
                <h3>{p.nome}</h3>
                <p><strong>Cargo:</strong> {p.cargo}</p>
                <p><strong>Especialidade:</strong> {p.especialidade}</p>
                <p><strong>E-mail:</strong> {p.email}</p>
                <p><strong>Telefone:</strong> {p.telefone}</p>
                <p><strong>Nível:</strong> {p.nivel_acesso}</p>
                <p><strong>Status:</strong> {p.ativo ? 'Ativo' : 'Inativo'}</p>
                <p><strong>Login App:</strong> {p.login_app}</p>
                <p><strong>Senha App:</strong> {p.senha_app}</p>
              </div>

              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <button
                  onClick={() => copiarAcesso(p)}
                  style={botaoCopiar}
                >
                  Copiar acesso
                </button>

                <button
                  onClick={() => editarProfissional(p)}
                  style={botaoEditar}
                >
                  Editar
                </button>

                <button
                  onClick={() => excluirProfissional(p.id)}
                  style={botaoExcluir}
                >
                  Excluir
                </button>
              </div>
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
  boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
  marginBottom: 25
}

const grid = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 15
}

const fotoBox = {
  width: 140,
  height: 140,
  borderRadius: 18,
  background: '#f1f5f9',
  border: '1px dashed #bbb',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  color: '#777'
}

const fotoImg = {
  width: '100%',
  height: '100%',
  objectFit: 'cover'
}

const miniFotoBox = {
  width: 95,
  height: 95,
  borderRadius: 16,
  background: '#f1f5f9',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  color: '#777',
  fontSize: 12
}

const miniFotoImg = {
  width: '100%',
  height: '100%',
  objectFit: 'cover'
}

const acessoBox = {
  background: '#f8fafc',
  border: '1px solid #e5e7eb',
  borderRadius: 14,
  padding: 15
}

const card = {
  background: '#fff',
  borderRadius: 16,
  padding: 20,
  boxShadow: '0 2px 10px rgba(0,0,0,0.08)'
}

const inputBusca = {
  width: '100%',
  padding: 14,
  borderRadius: 10,
  border: '1px solid #ccc'
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
