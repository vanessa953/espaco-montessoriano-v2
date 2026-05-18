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
    observacao_pagamento: '',
    tipo_vinculo: 'Atendimento'
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
        profissionais(nome),
        pacientes(nome)
      `)
      .eq('ativo', true)
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
      tipo_vinculo: form.tipo_vinculo || 'Atendimento',
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
      nome: form.nome,
      cpf: form.cpf,
      email: form.email,
      telefone: form.telefone,
      cargo: form.cargo,
      especialidade: form.especialidade,
      conselho: form.conselho,
      nivel_acesso: form.nivel_acesso,
      observacoes: form.observacoes,
      ativo: form.ativo,
      foto_url: fotoUrl,
      login_app: acesso.login_app,
      senha_app: acesso.senha_app,
      tipo_pagamento: form.tipo_pagamento,
      valor_hora: Number(form.valor_hora || 0),
      valor_sessao: Number(form.valor_sessao || 0),
      percentual_repasse: Number(form.percentual_repasse || 0),
      observacao_pagamento: form.observacao_pagamento
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
      await salvarVinculos(profissionalId)
      await salvarDocumentos(profissionalId)
      await salvarNotasFiscais(profissionalId)
    }

    alert(editandoId ? 'Profissional atualizado com sucesso.' : 'Profissional cadastrado com sucesso.')

    limparFormulario()
    carregarDados()
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
            observacoes: 'Nota fiscal anexada ao cadastro.'
          }])
      }
    }
  }

  function limparFormulario() {
    setEditandoId(null)
    setFotoArquivo(null)
    setDocumentos([])
    setNotasFiscais([])
    setPacientesSelecionados([])

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
      observacao_pagamento: '',
      tipo_vinculo: 'Atendimento'
    })
  }

  function editarProfissional(prof) {
    setEditandoId(prof.id)

    const pacientesDoProfissional = vinculos
      .filter((v) => v.profissional_id === prof.id && v.ativo)
      .map((v) => v.paciente_id)

    setPacientesSelecionados(pacientesDoProfissional)

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
      senha_app: prof.senha_app || '',
      tipo_pagamento: prof.tipo_pagamento || 'Por hora',
      valor_hora: prof.valor_hora || 0,
      valor_sessao: prof.valor_sessao || 0,
      percentual_repasse: prof.percentual_repasse || 0,
      observacao_pagamento: prof.observacao_pagamento || '',
      tipo_vinculo: 'Atendimento'
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

  function copiarAcesso(prof) {
    const texto = `Acesso ao App Espaço Montessoriano

Login: ${prof.login_app}
Senha: ${prof.senha_app}`

    navigator.clipboard.writeText(texto)
    alert('Acesso copiado.')
  }

  const profissionaisFiltrados = useMemo(() => {
    const texto = busca.toLowerCase()

    return profissionais.filter((p) => {
      return (
        p.nome?.toLowerCase().includes(texto) ||
        p.cargo?.toLowerCase().includes(texto) ||
        p.especialidade?.toLowerCase().includes(texto) ||
        p.nivel_acesso?.toLowerCase().includes(texto)
      )
    })
  }, [profissionais, busca])

  function pacientesVinculadosTexto(profissionalId) {
    const lista = vinculos.filter(
      (v) => v.profissional_id === profissionalId && v.ativo
    )

    if (!lista.length) return 'Nenhum paciente vinculado.'

    return lista.map((v) => v.pacientes?.nome).filter(Boolean).join(', ')
  }

  return (
    <div style={pagina}>
      <h1>Profissionais</h1>

      <p style={{ color: '#666', marginBottom: 25 }}>
        Cadastro da equipe, permissões, documentos, notas fiscais, pagamentos e vínculos com pacientes.
      </p>

      <div style={box}>
        <h2>{editandoId ? 'Editar profissional' : 'Cadastrar profissional'}</h2>

        <div style={grid}>
          <input placeholder="Nome completo" value={form.nome} onChange={(e) => atualizarCampo('nome', e.target.value)} />
          <input placeholder="CPF" value={form.cpf} onChange={(e) => atualizarCampo('cpf', e.target.value)} />
          <input placeholder="E-mail" value={form.email} onChange={(e) => atualizarCampo('email', e.target.value)} />
          <input placeholder="Telefone / WhatsApp" value={form.telefone} onChange={(e) => atualizarCampo('telefone', e.target.value)} />
          <input placeholder="Cargo / função" value={form.cargo} onChange={(e) => atualizarCampo('cargo', e.target.value)} />
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

          <div style={boxInterno}>
            <h3>Acesso ao app</h3>

            <input placeholder="Login do app" value={form.login_app} onChange={(e) => atualizarCampo('login_app', e.target.value)} />

            <input
              placeholder="Senha do app"
              value={form.senha_app}
              onChange={(e) => atualizarCampo('senha_app', e.target.value)}
              style={{ marginTop: 10 }}
            />

            <p style={small}>
              Se deixar em branco, o sistema gera automaticamente.
            </p>
          </div>

          <div style={boxInterno}>
            <h3>Pagamento</h3>

            <select value={form.tipo_pagamento} onChange={(e) => atualizarCampo('tipo_pagamento', e.target.value)}>
              <option>Por hora</option>
              <option>Por sessão</option>
              <option>Percentual</option>
            </select>

            <input type="number" placeholder="Valor hora" value={form.valor_hora} onChange={(e) => atualizarCampo('valor_hora', e.target.value)} style={{ marginTop: 10 }} />
            <input type="number" placeholder="Valor sessão" value={form.valor_sessao} onChange={(e) => atualizarCampo('valor_sessao', e.target.value)} style={{ marginTop: 10 }} />
            <input type="number" placeholder="% repasse" value={form.percentual_repasse} onChange={(e) => atualizarCampo('percentual_repasse', e.target.value)} style={{ marginTop: 10 }} />

            <textarea
              placeholder="Observações sobre pagamento"
              value={form.observacao_pagamento}
              onChange={(e) => atualizarCampo('observacao_pagamento', e.target.value)}
              style={{ marginTop: 10, width: '100%', minHeight: 90 }}
            />
          </div>

          <div style={boxInterno}>
            <h3>Foto e anexos</h3>

            <label style={label}>Foto</label>
            <input type="file" accept="image/*" onChange={(e) => setFotoArquivo(e.target.files?.[0])} />

            <label style={label}>Documentos</label>
            <input type="file" multiple onChange={(e) => setDocumentos(Array.from(e.target.files || []))} />

            <label style={label}>Notas fiscais</label>
            <input type="file" multiple onChange={(e) => setNotasFiscais(Array.from(e.target.files || []))} />
          </div>

          <textarea
            placeholder="Observações gerais"
            value={form.observacoes}
            onChange={(e) => atualizarCampo('observacoes', e.target.value)}
            style={{ minHeight: 180 }}
          />
        </div>
      </div>

      <div style={box}>
        <h2>Pacientes vinculados ao profissional</h2>

        <p style={{ color: '#666' }}>
          Selecione quais pacientes este profissional pode visualizar e atender no sistema.
        </p>

        <select
          value={form.tipo_vinculo}
          onChange={(e) => atualizarCampo('tipo_vinculo', e.target.value)}
          style={{ marginBottom: 15 }}
        >
          <option>Atendimento</option>
          <option>Supervisão</option>
          <option>Acompanhamento Pedagógico</option>
          <option>Avaliação</option>
          <option>Coordenação</option>
        </select>

        <div style={listaPacientes}>
          {pacientes.map((p) => (
            <label key={p.id} style={pacienteItem}>
              <input
                type="checkbox"
                checked={pacientesSelecionados.includes(p.id)}
                onChange={() => togglePaciente(p.id)}
              />
              <span>
                {p.nome}
                <br />
                <small>{p.responsavel || ''}</small>
              </span>
            </label>
          ))}
        </div>
      </div>

      <div style={acoesFormulario}>
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
          placeholder="Buscar por nome, cargo, especialidade ou nível de acesso"
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
              <div style={fotoBox}>
                {p.foto_url ? (
                  <img src={p.foto_url} alt={p.nome} style={fotoImg} />
                ) : (
                  <span>Sem foto</span>
                )}
              </div>

              <div style={{ flex: 1 }}>
                <h3>{p.nome}</h3>
                <p><strong>Cargo:</strong> {p.cargo || '-'}</p>
                <p><strong>Especialidade:</strong> {p.especialidade || '-'}</p>
                <p><strong>Nível:</strong> {p.nivel_acesso || '-'}</p>
                <p><strong>Status:</strong> {p.ativo ? 'Ativo' : 'Inativo'}</p>
                <p><strong>Tipo pagamento:</strong> {p.tipo_pagamento || '-'}</p>
                <p><strong>Valor hora:</strong> R$ {p.valor_hora || 0}</p>
                <p><strong>Valor sessão:</strong> R$ {p.valor_sessao || 0}</p>
                <p><strong>% repasse:</strong> {p.percentual_repasse || 0}%</p>
                <p><strong>Login:</strong> {p.login_app || '-'}</p>
                <p><strong>Pacientes vinculados:</strong> {pacientesVinculadosTexto(p.id)}</p>
              </div>

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

const boxInterno = {
  background: '#f8fafc',
  border: '1px solid #e5e7eb',
  borderRadius: 14,
  padding: 15
}

const listaPacientes = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr 1fr',
  gap: 12
}

const pacienteItem = {
  display: 'flex',
  gap: 10,
  alignItems: 'center',
  background: '#f8fafc',
  border: '1px solid #e5e7eb',
  borderRadius: 12,
  padding: 12
}

const acoesFormulario = {
  display: 'flex',
  gap: 12,
  marginBottom: 25,
  flexWrap: 'wrap'
}

const card = {
  background: '#fff',
  borderRadius: 16,
  padding: 20,
  boxShadow: '0 2px 10px rgba(0,0,0,0.08)'
}

const fotoBox = {
  width: 100,
  height: 100,
  borderRadius: 16,
  background: '#f1f5f9',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  color: '#777',
  fontSize: 12
}

const fotoImg = {
  width: '100%',
  height: '100%',
  objectFit: 'cover'
}

const acoes = {
  display: 'flex',
  gap: 10,
  alignItems: 'flex-start',
  flexWrap: 'wrap'
}

const inputBusca = {
  width: '100%',
  padding: 14,
  borderRadius: 10,
  border: '1px solid #ccc'
}

const label = {
  display: 'block',
  fontWeight: 'bold',
  marginTop: 12,
  marginBottom: 6
}

const small = {
  color: '#666',
  fontSize: 13
}

const botaoPrincipal = {
  background: '#0f766e',
  color: '#fff',
  border: 'none',
  borderRadius: 12,
  padding: 14,
  cursor: 'pointer',
  fontWeight: 'bold'
}

const botaoSecundario = {
  background: '#ddd',
  border: 'none',
  borderRadius: 12,
  padding: 14,
  cursor: 'pointer',
  fontWeight: 'bold'
