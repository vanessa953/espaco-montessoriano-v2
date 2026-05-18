import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Profissionais() {
  const [profissionais, setProfissionais] = useState([])
  const [pacientes, setPacientes] = useState([])
  const [vinculos, setVinculos] = useState([])
  const [busca, setBusca] = useState('')
  const [editandoId, setEditandoId] = useState(null)

  const [fotoArquivo, setFotoArquivo] = useState(null)
  const [documentos, setDocumentos] = useState([])
  const [notasFiscais, setNotasFiscais] = useState([])

  const [pacientesSelecionados, setPacientesSelecionados] = useState([])
  const [tipoVinculo, setTipoVinculo] = useState('Atendimento')

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

  async function carregarDados() {
    const { data: profissionaisData } = await supabase
      .from('profissionais')
      .select('*')
      .order('nome')

    const { data: pacientesData } = await supabase
      .from('pacientes')
      .select('id, nome, responsavel')
      .order('nome')

    const { data: vinculosData } = await supabase
      .from('profissional_pacientes')
      .select(`
        *,
        pacientes(nome),
        profissionais(nome)
      `)
      .order('created_at', { ascending: false })

    setProfissionais(profissionaisData || [])
    setPacientes(pacientesData || [])
    setVinculos(vinculosData || [])
  }

  useEffect(() => {
    carregarDados()
  }, [])

  function limparTexto(texto) {
    return String(texto || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '')
  }

  function gerarAcessoProfissional(dados) {
    const primeiroNome = limparTexto(dados.nome?.split(' ')[0]) || 'profissional'

    const login =
      dados.login_app ||
      dados.email?.trim() ||
      `${primeiroNome}${Math.floor(Math.random() * 9999)}@espacomontessoriano.com`

    const senha = dados.senha_app || `${primeiroNome}123`

    return {
      login_app: login,
      senha_app: senha
    }
  }

  function atualizarCampo(campo, valor) {
    setForm((prev) => ({
      ...prev,
      [campo]: valor
    }))
  }

  function togglePaciente(id) {
    if (pacientesSelecionados.includes(id)) {
      setPacientesSelecionados(pacientesSelecionados.filter((p) => p !== id))
    } else {
      setPacientesSelecionados([...pacientesSelecionados, id])
    }
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
      alert('Erro ao enviar arquivo.')
      return ''
    }

    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(nomeArquivo)

    return data.publicUrl
  }

  async function salvarProfissional() {
    if (!form.nome) {
      alert('Digite o nome do profissional.')
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
      ativo: form.ativo,
      valor_hora: Number(form.valor_hora || 0),
      valor_sessao: Number(form.valor_sessao || 0),
      percentual_repasse: Number(form.percentual_repasse || 0)
    }

    let profissionalId = editandoId

    if (editandoId) {
      const { error } = await supabase
        .from('profissionais')
        .update(dados)
        .eq('id', editandoId)

      if (error) {
        console.log(error)
        alert('Erro ao atualizar profissional.')
        return
      }
    } else {
      const { data, error } = await supabase
        .from('profissionais')
        .insert([dados])
        .select()

      if (error) {
        console.log(error)
        alert('Erro ao cadastrar profissional.')
        return
      }

      profissionalId = data?.[0]?.id
    }

    if (profissionalId) {
      await salvarDocumentos(profissionalId)
      await salvarNotasFiscais(profissionalId)
      await salvarVinculos(profissionalId)
    }

    alert(editandoId ? 'Profissional atualizado.' : 'Profissional cadastrado.')

    limparFormulario()
    carregarDados()
  }

  async function salvarVinculos(profissionalId) {
    if (!profissionalId) return

    await supabase
      .from('profissional_pacientes')
      .update({ ativo: false })
      .eq('profissional_id', profissionalId)

    if (!pacientesSelecionados.length) return

    const registros = pacientesSelecionados.map((pacienteId) => ({
      profissional_id: profissionalId,
      paciente_id: pacienteId,
      tipo_vinculo: tipoVinculo,
      ativo: true
    }))

    const { error } = await supabase
      .from('profissional_pacientes')
      .insert(registros)

    if (error) {
      console.log(error)
      alert('Profissional salvo, mas houve erro ao salvar vínculos.')
    }
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

  function editarProfissional(profissional) {
    setEditandoId(profissional.id)

    const vinculosAtivos = vinculos
      .filter((v) => v.profissional_id === profissional.id && v.ativo !== false)
      .map((v) => v.paciente_id)

    const primeiroVinculo = vinculos.find(
      (v) => v.profissional_id === profissional.id && v.ativo !== false
    )

    setPacientesSelecionados(vinculosAtivos)
    setTipoVinculo(primeiroVinculo?.tipo_vinculo || 'Atendimento')

    setForm({
      nome: profissional.nome || '',
      cpf: profissional.cpf || '',
      email: profissional.email || '',
      telefone: profissional.telefone || '',
      cargo: profissional.cargo || '',
      especialidade: profissional.especialidade || '',
      conselho: profissional.conselho || '',
      nivel_acesso: profissional.nivel_acesso || 'Terapeuta',
      observacoes: profissional.observacoes || '',
      ativo: profissional.ativo ?? true,
      foto_url: profissional.foto_url || '',
      login_app: profissional.login_app || '',
      senha_app: profissional.senha_app || '',

      tipo_pagamento: profissional.tipo_pagamento || 'Por hora',
      valor_hora: profissional.valor_hora || 0,
      valor_sessao: profissional.valor_sessao || 0,
      percentual_repasse: profissional.percentual_repasse || 0,
      observacao_pagamento: profissional.observacao_pagamento || ''
    })

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function excluirProfissional(id) {
    const confirmar = confirm('Deseja excluir este profissional?')
    if (!confirmar) return

    const { error } = await supabase
      .from('profissionais')
      .delete()
      .eq('id', id)

    if (error) {
      console.log(error)
      alert('Erro ao excluir profissional.')
      return
    }

    carregarDados()
  }

  function limparFormulario() {
    setEditandoId(null)
    setFotoArquivo(null)
    setDocumentos([])
    setNotasFiscais([])
    setPacientesSelecionados([])
    setTipoVinculo('Atendimento')

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

  function copiarAcesso(profissional) {
    const texto = `Acesso App Espaço Montessoriano

Profissional: ${profissional.nome}
Login: ${profissional.login_app}
Senha: ${profissional.senha_app}`

    navigator.clipboard.writeText(texto)
    alert('Acesso copiado.')
  }

  const profissionaisFiltrados = useMemo(() => {
    const texto = busca.toLowerCase()

    return profissionais.filter((p) => (
      p.nome?.toLowerCase().includes(texto) ||
      p.cargo?.toLowerCase().includes(texto) ||
      p.especialidade?.toLowerCase().includes(texto) ||
      p.nivel_acesso?.toLowerCase().includes(texto)
    ))
  }, [profissionais, busca])

  function nomesVinculados(profissionalId) {
    const lista = vinculos.filter(
      (v) => v.profissional_id === profissionalId && v.ativo !== false
    )

    if (!lista.length) return 'Nenhum paciente vinculado.'

    return lista
      .map((v) => v.pacientes?.nome || 'Paciente')
      .join(', ')
  }

  return (
    <div style={pagina}>
      <h1>Profissionais</h1>

      <p style={{ color: '#666', marginBottom: 25 }}>
        Cadastro da equipe, acesso ao app, pagamento, documentos e vínculo com pacientes.
      </p>

      <div style={box}>
        <h2>{editandoId ? 'Editar profissional' : 'Cadastrar profissional'}</h2>

        <div style={grid}>
          <input placeholder="Nome" value={form.nome} onChange={(e) => atualizarCampo('nome', e.target.value)} />
          <input placeholder="CPF" value={form.cpf} onChange={(e) => atualizarCampo('cpf', e.target.value)} />
          <input placeholder="E-mail" value={form.email} onChange={(e) => atualizarCampo('email', e.target.value)} />
          <input placeholder="Telefone" value={form.telefone} onChange={(e) => atualizarCampo('telefone', e.target.value)} />
          <input placeholder="Cargo" value={form.cargo} onChange={(e) => atualizarCampo('cargo', e.target.value)} />
          <input placeholder="Especialidade" value={form.especialidade} onChange={(e) => atualizarCampo('especialidade', e.target.value)} />
          <input placeholder="Conselho profissional" value={form.conselho} onChange={(e) => atualizarCampo('conselho', e.target.value)} />

          <select value={form.nivel_acesso} onChange={(e) => atualizarCampo('nivel_acesso', e.target.value)}>
            <option>Administradora</option>
            <option>Coordenação</option>
            <option>Recepção</option>
            <option>Financeiro</option>
            <option>Supervisor</option>
            <option>Terapeuta</option>
          </select>

          <select value={form.ativo ? 'Ativo' : 'Inativo'} onChange={(e) => atualizarCampo('ativo', e.target.value === 'Ativo')}>
            <option>Ativo</option>
            <option>Inativo</option>
          </select>

          <div />
        </div>
      </div>

      <div style={box}>
        <h2>Acesso ao app</h2>

        <div style={grid}>
          <input placeholder="Login do app" value={form.login_app} onChange={(e) => atualizarCampo('login_app', e.target.value)} />
          <input placeholder="Senha do app" value={form.senha_app} onChange={(e) => atualizarCampo('senha_app', e.target.value)} />
        </div>

        <p style={small}>
          Se deixar em branco, o sistema cria login e senha automaticamente.
        </p>
      </div>

      <div style={box}>
        <h2>Pagamento do profissional</h2>

        <div style={grid}>
          <select value={form.tipo_pagamento} onChange={(e) => atualizarCampo('tipo_pagamento', e.target.value)}>
            <option>Por hora</option>
            <option>Por sessão</option>
            <option>Percentual</option>
          </select>

          <input type="number" placeholder="Valor hora" value={form.valor_hora} onChange={(e) => atualizarCampo('valor_hora', e.target.value)} />
          <input type="number" placeholder="Valor sessão" value={form.valor_sessao} onChange={(e) => atualizarCampo('valor_sessao', e.target.value)} />
          <input type="number" placeholder="% repasse" value={form.percentual_repasse} onChange={(e) => atualizarCampo('percentual_repasse', e.target.value)} />

          <textarea
            placeholder="Observações sobre pagamento"
            value={form.observacao_pagamento}
            onChange={(e) => atualizarCampo('observacao_pagamento', e.target.value)}
            style={{ gridColumn: '1 / span 2', minHeight: 100 }}
          />
        </div>
      </div>

      <div style={box}>
        <h2>Pacientes vinculados ao profissional</h2>

        <div style={grid}>
          <select value={tipoVinculo} onChange={(e) => setTipoVinculo(e.target.value)}>
            <option>Atendimento</option>
            <option>Supervisão</option>
            <option>Acompanhamento pedagógico</option>
            <option>Avaliação</option>
            <option>Equipe multidisciplinar</option>
          </select>
        </div>

        <div style={listaPacientes}>
          {pacientes.map((paciente) => (
            <label key={paciente.id} style={pacienteItem}>
              <input
                type="checkbox"
                checked={pacientesSelecionados.includes(paciente.id)}
                onChange={() => togglePaciente(paciente.id)}
              />
              <span>
                <strong>{paciente.nome}</strong>
                <br />
                <small>{paciente.responsavel || '-'}</small>
              </span>
            </label>
          ))}
        </div>
      </div>

      <div style={box}>
        <h2>Arquivos do profissional</h2>

        <div style={grid}>
          <div>
            <label style={label}>Foto</label>
            <input type="file" accept="image/*" onChange={(e) => setFotoArquivo(e.target.files[0])} />
          </div>

          <div>
            <label style={label}>Documentos</label>
            <input type="file" multiple onChange={(e) => setDocumentos(Array.from(e.target.files || []))} />
          </div>

          <div>
            <label style={label}>Notas fiscais</label>
            <input type="file" multiple onChange={(e) => setNotasFiscais(Array.from(e.target.files || []))} />
          </div>
        </div>
      </div>

      <div style={box}>
        <h2>Observações</h2>

        <textarea
          placeholder="Observações gerais sobre o profissional"
          value={form.observacoes}
          onChange={(e) => atualizarCampo('observacoes', e.target.value)}
          style={textarea}
        />

        <button onClick={salvarProfissional} style={botaoPrincipal}>
          {editandoId ? 'Atualizar profissional' : 'Cadastrar profissional'}
        </button>

        <button onClick={limparFormulario} style={botaoSecundario}>
          Limpar
        </button>
      </div>

      <div style={box}>
        <h2>Buscar profissional</h2>

        <input
          placeholder="Buscar por nome, cargo, especialidade ou nível"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          style={inputBusca}
        />
      </div>

      <h2>Profissionais cadastrados</h2>

      <div style={{ display: 'grid', gap: 15 }}>
        {profissionaisFiltrados.map((p) => (
          <div key={p.id} style={card}>
            <h3>{p.nome}</h3>

            <p><strong>Cargo:</strong> {p.cargo || '-'}</p>
            <p><strong>Especialidade:</strong> {p.especialidade || '-'}</p>
            <p><strong>Nível:</strong> {p.nivel_acesso || '-'}</p>
            <p><strong>Status:</strong> {p.ativo !== false ? 'Ativo' : 'Inativo'}</p>
            <p><strong>Tipo pagamento:</strong> {p.tipo_pagamento || '-'}</p>
            <p><strong>Valor hora:</strong> R$ {p.valor_hora || 0}</p>
            <p><strong>Valor sessão:</strong> R$ {p.valor_sessao || 0}</p>
            <p><strong>% repasse:</strong> {p.percentual_repasse || 0}%</p>
            <p><strong>Pacientes vinculados:</strong> {nomesVinculados(p.id)}</p>
            <p><strong>Login:</strong> {p.login_app || '-'}</p>

            <div style={acoes}>
              <button onClick={() => copiarAcesso(p)} style={botaoAzul}>
                Copiar acesso
              </button>

              <button onClick={() => editarProfissional(p)} style={botaoEditar}>
                Editar
              </button>

              <button onClick={() => excluirProfissional(p.id)} style={botaoExcluir}>
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
  padding: 24,
  borderRadius: 16,
  marginBottom: 24,
  boxShadow: '0 2px 12px rgba(0,0,0,0.08)'
}

const grid = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 15
}

const listaPacientes = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr 1fr',
  gap: 12,
  marginTop: 20
}

const pacienteItem = {
  background: '#f8fafc',
  border: '1px solid #e5e7eb',
  borderRadius: 12,
  padding: 12,
  display: 'flex',
  gap: 10,
  alignItems: 'flex-start',
  cursor: 'pointer'
}

const textarea = {
  width: '100%',
  minHeight: 120,
  padding: 14,
  borderRadius: 10,
  border: '1px solid #ccc',
  marginBottom: 15
}

const inputBusca = {
  width: '100%',
  padding: 14,
  borderRadius: 10,
  border: '1px solid #ccc'
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
  flexWrap: 'wrap',
  marginTop: 15
}

const small = {
  display: 'block',
  color: '#666',
  marginTop: 10,
  fontSize: 13
}

const label = {
  display: 'block',
  fontWeight: 'bold',
  marginBottom: 8
}

const botaoPrincipal = {
  background: '#0f766e',
  color: '#fff',
  border: 'none',
  padding: 14,
  borderRadius: 12,
  cursor: 'pointer',
  fontWeight: 'bold',
  marginRight: 10
}

const botaoSecundario = {
  background: '#ddd',
  border: 'none',
  padding: 14,
  borderRadius: 12,
  cursor: 'pointer',
  fontWeight: 'bold'
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
