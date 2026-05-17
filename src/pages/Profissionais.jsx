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
    senha_app: '',

    tipo_pagamento: 'Por hora',
    valor_hora: 0,
    valor_sessao: 0,
    percentual_repasse: 0,
    observacao_pagamento: ''
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
      alert('Digite o nome')
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
      foto_url: fotoUrl,

      valor_hora: Number(form.valor_hora || 0),
      valor_sessao: Number(form.valor_sessao || 0),
      percentual_repasse: Number(
        form.percentual_repasse || 0
      )
    }

    let profissionalId = editandoId

    if (editandoId) {
      const { error } = await supabase
        .from('profissionais')
        .update(dados)
        .eq('id', editandoId)

      if (error) {
        console.log(error)
        alert('Erro ao atualizar')
        return
      }
    } else {
      const { data, error } = await supabase
        .from('profissionais')
        .insert([dados])
        .select()

      if (error) {
        console.log(error)
        alert('Erro ao cadastrar')
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
        ? 'Profissional atualizado'
        : 'Profissional cadastrado'
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
            valor: 0
          }])
      }
    }
  }

  function editarProfissional(prof) {
    setEditandoId(prof.id)

    setForm({
      ...form,
      ...prof
    })

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

  async function excluirProfissional(id) {
    const confirmar = confirm(
      'Deseja excluir este profissional?'
    )

    if (!confirmar) return

    await supabase
      .from('profissionais')
      .delete()
      .eq('id', id)

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
      senha_app: '',

      tipo_pagamento: 'Por hora',
      valor_hora: 0,
      valor_sessao: 0,
      percentual_repasse: 0,
      observacao_pagamento: ''
    })
  }

  function copiarAcesso(prof) {
    const texto = `Acesso App Espaço Montessoriano

Login: ${prof.login_app}
Senha: ${prof.senha_app}`

    navigator.clipboard.writeText(texto)

    alert('Acesso copiado')
  }

  const profissionaisFiltrados = useMemo(() => {
    const texto = busca.toLowerCase()

    return profissionais.filter((p) => {
      return (
        p.nome?.toLowerCase().includes(texto) ||
        p.cargo?.toLowerCase().includes(texto) ||
        p.especialidade?.toLowerCase().includes(texto)
      )
    })
  }, [profissionais, busca])

  return (
    <div style={pagina}>
      <h1>Profissionais</h1>

      <div style={box}>
        <h2>
          {editandoId
            ? 'Editar profissional'
            : 'Cadastrar profissional'}
        </h2>

        <div style={grid}>
          <input
            placeholder="Nome"
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
            placeholder="E-mail"
            value={form.email}
            onChange={(e) =>
              atualizarCampo('email', e.target.value)
            }
          />

          <input
            placeholder="Telefone"
            value={form.telefone}
            onChange={(e) =>
              atualizarCampo(
                'telefone',
                e.target.value
              )
            }
          />

          <input
            placeholder="Cargo"
            value={form.cargo}
            onChange={(e) =>
              atualizarCampo('cargo', e.target.value)
            }
          />

          <input
            placeholder="Especialidade"
            value={form.especialidade}
            onChange={(e) =>
              atualizarCampo(
                'especialidade',
                e.target.value
              )
            }
          />

          <input
            placeholder="Conselho"
            value={form.conselho}
            onChange={(e) =>
              atualizarCampo(
                'conselho',
                e.target.value
              )
            }
          />

          <select
            value={form.nivel_acesso}
            onChange={(e) =>
              atualizarCampo(
                'nivel_acesso',
                e.target.value
              )
            }
          >
            <option>Administradora</option>
            <option>Coordenação</option>
            <option>Recepção</option>
            <option>Financeiro</option>
            <option>Supervisor</option>
            <option>Terapeuta</option>
          </select>

          <select
            value={form.tipo_pagamento}
            onChange={(e) =>
              atualizarCampo(
                'tipo_pagamento',
                e.target.value
              )
            }
          >
            <option>Por hora</option>
            <option>Por sessão</option>
            <option>Percentual</option>
          </select>

          <input
            type="number"
            placeholder="Valor hora"
            value={form.valor_hora}
            onChange={(e) =>
              atualizarCampo(
                'valor_hora',
                e.target.value
              )
            }
          />

          <input
            type="number"
            placeholder="Valor sessão"
            value={form.valor_sessao}
            onChange={(e) =>
              atualizarCampo(
                'valor_sessao',
                e.target.value
              )
            }
          />

          <input
            type="number"
            placeholder="% repasse"
            value={form.percentual_repasse}
            onChange={(e) =>
              atualizarCampo(
                'percentual_repasse',
                e.target.value
              )
            }
          />

          <textarea
            placeholder="Observações pagamento"
            value={form.observacao_pagamento}
            onChange={(e) =>
              atualizarCampo(
                'observacao_pagamento',
                e.target.value
              )
            }
            style={{
              minHeight: 100
            }}
          />

          <div style={acessoBox}>
            <h3>Acesso app</h3>

            <input
              placeholder="Login"
              value={form.login_app}
              onChange={(e) =>
                atualizarCampo(
                  'login_app',
                  e.target.value
                )
              }
            />

            <input
              placeholder="Senha"
              value={form.senha_app}
              onChange={(e) =>
                atualizarCampo(
                  'senha_app',
                  e.target.value
                )
              }
            />
          </div>

          <div>
            <label>Foto</label>

            <input
              type="file"
              accept="image/*"
              onChange={(e) =>
                setFotoArquivo(e.target.files[0])
              }
            />
          </div>

          <div>
            <label>Documentos</label>

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
              ? 'Atualizar'
              : 'Cadastrar'}
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
        <input
          placeholder="Buscar profissional"
          value={busca}
          onChange={(e) =>
            setBusca(e.target.value)
          }
          style={inputBusca}
        />
      </div>

      <div style={{ display: 'grid', gap: 15 }}>
        {profissionaisFiltrados.map((p) => (
          <div key={p.id} style={card}>
            <h3>{p.nome}</h3>

            <p>
              <strong>Cargo:</strong> {p.cargo}
            </p>

            <p>
              <strong>Especialidade:</strong>{' '}
              {p.especialidade}
            </p>

            <p>
              <strong>Tipo pagamento:</strong>{' '}
              {p.tipo_pagamento}
            </p>

            <p>
              <strong>Valor hora:</strong>{' '}
              R$ {p.valor_hora}
            </p>

            <p>
              <strong>Valor sessão:</strong>{' '}
              R$ {p.valor_sessao}
            </p>

            <p>
              <strong>% repasse:</strong>{' '}
              {p.percentual_repasse}%
            </p>

            <p>
              <strong>Login:</strong>{' '}
              {p.login_app}
            </p>

            <div style={acoes}>
              <button
                onClick={() =>
                  copiarAcesso(p)
                }
                style={botaoAzul}
              >
                Copiar acesso
              </button>

              <button
                onClick={() =>
                  editarProfissional(p)
                }
                style={botaoEditar}
              >
                Editar
              </button>

              <button
                onClick={() =>
                  excluirProfissional(p.id)
                }
                style={botaoExcluir}
              >
                Excluir
              </button>
            </div>
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

const acessoBox = {
  background: '#f8fafc',
  border: '1px solid #e5e7eb',
  borderRadius: 14,
  padding: 15
}

const card = {
  background: '#fff',
  padding: 20,
  borderRadius: 16,
  boxShadow: '0 2px 10px rgba(0,0,0,0.08)'
}

const acoes = {
  display: 'flex',
  gap: 10,
  marginTop: 15,
  flexWrap: 'wrap'
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
  padding: 14,
  borderRadius: 10,
  cursor: 'pointer'
}

const botaoSecundario = {
  background: '#ddd',
  border: 'none',
  padding: 14,
  borderRadius: 10,
  cursor: 'pointer'
}

const botaoAzul = {
  background: '#2563eb',
  color: '#fff',
  border: 'none',
  padding: 10,
  borderRadius: 10,
  cursor: 'pointer'
}

const botaoEditar = {
  background: '#f59e0b',
  color: '#fff',
  border: 'none',
  padding: 10,
  borderRadius: 10,
  cursor: 'pointer'
}

const botaoExcluir = {
  background: '#dc2626',
  color: '#fff',
  border: 'none',
  padding: 10,
  borderRadius: 10,
  cursor: 'pointer'
}
