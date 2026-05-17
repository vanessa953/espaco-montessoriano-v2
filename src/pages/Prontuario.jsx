import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Prontuario() {
  const [pacientes, setPacientes] = useState([])
  const [profissionais, setProfissionais] = useState([])
  const [registros, setRegistros] = useState([])
  const [busca, setBusca] = useState('')
  const [aba, setAba] = useState('sessao')
  const [arquivos, setArquivos] = useState([])

  const [form, setForm] = useState({
    paciente_id: '',
    profissional_id: '',
    profissional_nome: '',
    tipo_registro: 'Sessão',
    tipo_reuniao: '',
    participantes: '',
    servico: '',
    data_sessao: '',
    evolucao: '',
    conduta: '',
    resumo_familia: '',
    observacoes_internas: '',
    encaminhamentos: '',
    metas: '',
    indicadores_evolucao: '',
    relatorio_grafico: '',
    anamnese: '',
    plano_trimestral: '',
    plano_semestral: '',
    plano_anual: '',
    liberar_familia: false,
    permitir_ia: false
  })

  async function carregarDados() {
    const { data: pacientesData } = await supabase
      .from('pacientes')
      .select('id, nome')
      .order('nome')

    const { data: profissionaisData } = await supabase
      .from('profissionais')
      .select('id, nome')
      .order('nome')

    const { data: prontuariosData, error } = await supabase
      .from('prontuarios')
      .select(`
        *,
        pacientes(nome),
        profissionais(nome)
      `)
      .order('created_at', { ascending: false })

    if (error) console.log(error)

    setPacientes(pacientesData || [])
    setProfissionais(profissionaisData || [])
    setRegistros(prontuariosData || [])
  }

  useEffect(() => {
    carregarDados()
  }, [])

  function atualizarCampo(campo, valor) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
  }

  function selecionarArquivos(e) {
    setArquivos(Array.from(e.target.files || []))
  }

  async function enviarAnexos(prontuarioId, pacienteId) {
    if (!arquivos.length) return []

    const anexos = []

    for (const arquivo of arquivos) {
      const ext = arquivo.name.split('.').pop()
      const caminho = `${pacienteId}/${prontuarioId}/${Date.now()}-${arquivo.name}`

      const { error } = await supabase.storage
        .from('prontuario-documentos')
        .upload(caminho, arquivo, {
          cacheControl: '3600',
          upsert: true
        })

      if (error) {
        console.log(error)
        continue
      }

      const { data } = supabase.storage
        .from('prontuario-documentos')
        .getPublicUrl(caminho)

      anexos.push({
        prontuario_id: prontuarioId,
        paciente_id: pacienteId,
        nome_arquivo: arquivo.name,
        tipo: ext,
        url: data.publicUrl
      })
    }

    if (anexos.length) {
      await supabase.from('prontuario_anexos').insert(anexos)
    }

    return anexos
  }

  async function salvarProntuario() {
  if (!form.paciente_id) {
    alert('Selecione o paciente')
    return
  }

  if (!form.resumo_familia?.trim()) {
    alert(
      'O resumo para família é obrigatório.'
    )
    return
  }

  const profissionalSelecionado = profissionais.find(
    (p) => p.id === form.profissional_id
  )

  const dados = {
    ...form,
    profissional_nome:
      profissionalSelecionado?.nome ||
      form.profissional_nome ||
      '',
    data_sessao: form.data_sessao || null
  }

  const { data, error } = await supabase
    .from('prontuarios')
    .insert([dados])
    .select()

  if (error) {
    console.log(error)
    alert('Erro ao salvar prontuário')
    return
  }

  const prontuarioCriado = data?.[0]

  if (prontuarioCriado) {
    await enviarAnexos(
      prontuarioCriado.id,
      form.paciente_id
    )
  }

  alert('Registro salvo com sucesso')

  limparFormulario()
  carregarDados()
}
    if (!form.paciente_id) {
      alert('Selecione o paciente')
      return
    }

    const profissionalSelecionado = profissionais.find(
      (p) => p.id === form.profissional_id
    )

    const dados = {
      ...form,
      profissional_nome:
        profissionalSelecionado?.nome || form.profissional_nome || '',
      data_sessao: form.data_sessao || null
    }

    const { data, error } = await supabase
      .from('prontuarios')
      .insert([dados])
      .select()

    if (error) {
      console.log(error)
      alert('Erro ao salvar prontuário')
      return
    }

    const prontuarioCriado = data?.[0]

    if (prontuarioCriado) {
      await enviarAnexos(prontuarioCriado.id, form.paciente_id)
    }

    alert('Registro salvo com sucesso')

    limparFormulario()
    carregarDados()
  }

  function limparFormulario() {
    setArquivos([])
    setForm({
      paciente_id: '',
      profissional_id: '',
      profissional_nome: '',
      tipo_registro: 'Sessão',
      tipo_reuniao: '',
      participantes: '',
      servico: '',
      data_sessao: '',
      evolucao: '',
      conduta: '',
      resumo_familia: '',
      observacoes_internas: '',
      encaminhamentos: '',
      metas: '',
      indicadores_evolucao: '',
      relatorio_grafico: '',
      anamnese: '',
      plano_trimestral: '',
      plano_semestral: '',
      plano_anual: '',
      liberar_familia: false,
      permitir_ia: false
    })
  }

  function gerarTextoIA() {
    if (!form.permitir_ia) {
      alert('Marque "Permitir apoio da IA" primeiro.')
      return
    }

    const sugestao = `
Síntese estruturada:
Paciente acompanhado em contexto interdisciplinar. Recomenda-se observar resposta à mediação, nível de autonomia, atenção sustentada, comunicação funcional, participação nas atividades, habilidades acadêmicas e regulação comportamental.

Sugestões de acompanhamento:
1. Manter objetivos terapêuticos graduais.
2. Registrar evolução por sessão.
3. Integrar família, escola e equipe.
4. Definir indicadores mensuráveis de progresso.
5. Reavaliar metas periodicamente.
`

    atualizarCampo(
      'relatorio_grafico',
      `${form.relatorio_grafico}\n\n${sugestao}`
    )
  }

  const registrosFiltrados = useMemo(() => {
    const texto = busca.toLowerCase()

    return registros.filter((r) =>
      r.pacientes?.nome?.toLowerCase().includes(texto) ||
      r.servico?.toLowerCase().includes(texto) ||
      r.tipo_registro?.toLowerCase().includes(texto)
    )
  }, [registros, busca])

  return (
    <div style={pagina}>
      <h1>Prontuário Clínico Integrado</h1>

      <p style={{ color: '#666', marginBottom: 30 }}>
        Evolução, anamnese, reuniões, anexos, relatórios, planos de intervenção e apoio de IA.
      </p>

      <div style={abas}>
        <button onClick={() => setAba('sessao')} style={aba === 'sessao' ? abaAtiva : abaBotao}>Sessão</button>
        <button onClick={() => setAba('anamnese')} style={aba === 'anamnese' ? abaAtiva : abaBotao}>Anamnese</button>
        <button onClick={() => setAba('reuniao')} style={aba === 'reuniao' ? abaAtiva : abaBotao}>Reuniões</button>
        <button onClick={() => setAba('planos')} style={aba === 'planos' ? abaAtiva : abaBotao}>Planos</button>
        <button onClick={() => setAba('relatorios')} style={aba === 'relatorios' ? abaAtiva : abaBotao}>Relatórios</button>
        <button onClick={() => setAba('anexos')} style={aba === 'anexos' ? abaAtiva : abaBotao}>Anexos</button>
      </div>

      <div style={box}>
        <h2>Novo registro</h2>

        <div style={grid}>
          <select
            value={form.paciente_id}
            onChange={(e) => atualizarCampo('paciente_id', e.target.value)}
          >
            <option value="">Selecione o paciente</option>
            {pacientes.map((p) => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>

          <select
            value={form.profissional_id}
            onChange={(e) => atualizarCampo('profissional_id', e.target.value)}
          >
            <option value="">Profissional que realizou o atendimento</option>
            {profissionais.map((p) => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>

          <input
            type="date"
            value={form.data_sessao}
            onChange={(e) => atualizarCampo('data_sessao', e.target.value)}
          />

          <select
            value={form.servico}
            onChange={(e) => atualizarCampo('servico', e.target.value)}
          >
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
            <option>Reunião</option>
          </select>
        </div>

        {aba === 'sessao' && (
          <div style={gridTextos}>
            <textarea placeholder="Evolução clínica da sessão" value={form.evolucao} onChange={(e) => atualizarCampo('evolucao', e.target.value)} />
            <textarea placeholder="Conduta / intervenção realizada" value={form.conduta} onChange={(e) => atualizarCampo('conduta', e.target.value)} />
            <textarea placeholder="Resumo para família" value={form.resumo_familia} onChange={(e) => atualizarCampo('resumo_familia', e.target.value)} />
            <textarea placeholder="Observações internas protegidas" value={form.observacoes_internas} onChange={(e) => atualizarCampo('observacoes_internas', e.target.value)} />
          </div>
        )}

        {aba === 'anamnese' && (
          <textarea
            style={textareaGrande}
            placeholder="Anamnese completa: queixa principal, histórico gestacional, desenvolvimento neuropsicomotor, linguagem, alimentação, sono, comportamento, escola, socialização, terapias anteriores, medicamentos, rotina, família, autonomia e observações relevantes."
            value={form.anamnese}
            onChange={(e) => atualizarCampo('anamnese', e.target.value)}
          />
        )}

        {aba === 'reuniao' && (
          <div style={gridTextos}>
            <select value={form.tipo_reuniao} onChange={(e) => atualizarCampo('tipo_reuniao', e.target.value)}>
              <option value="">Tipo de reunião</option>
              <option>Família</option>
              <option>Escola</option>
              <option>Profissionais</option>
              <option>Todos</option>
            </select>

            <textarea placeholder="Participantes" value={form.participantes} onChange={(e) => atualizarCampo('participantes', e.target.value)} />
            <textarea placeholder="Pontos discutidos / encaminhamentos" value={form.encaminhamentos} onChange={(e) => atualizarCampo('encaminhamentos', e.target.value)} />
            <textarea placeholder="Metas combinadas" value={form.metas} onChange={(e) => atualizarCampo('metas', e.target.value)} />
          </div>
        )}

        {aba === 'planos' && (
          <div style={gridTextos}>
            <textarea placeholder="Plano trimestral" value={form.plano_trimestral} onChange={(e) => atualizarCampo('plano_trimestral', e.target.value)} />
            <textarea placeholder="Plano semestral" value={form.plano_semestral} onChange={(e) => atualizarCampo('plano_semestral', e.target.value)} />
            <textarea placeholder="Plano anual" value={form.plano_anual} onChange={(e) => atualizarCampo('plano_anual', e.target.value)} />
            <textarea placeholder="Indicadores de evolução" value={form.indicadores_evolucao} onChange={(e) => atualizarCampo('indicadores_evolucao', e.target.value)} />
          </div>
        )}

        {aba === 'relatorios' && (
          <div>
            <textarea
              style={textareaGrande}
              placeholder="Campo para relatório clínico, evolução, gráficos e análise longitudinal."
              value={form.relatorio_grafico}
              onChange={(e) => atualizarCampo('relatorio_grafico', e.target.value)}
            />

            <button onClick={gerarTextoIA} style={botaoIA}>
              Gerar apoio textual com IA
            </button>
          </div>
        )}

        {aba === 'anexos' && (
          <div style={{ marginTop: 20 }}>
            <input type="file" multiple onChange={selecionarArquivos} />
            <p style={{ color: '#666' }}>
              Anexe laudos, relatórios, avaliações, documentos escolares, imagens ou PDFs.
            </p>
          </div>
        )}

        <div style={checks}>
          <label>
            <input
              type="checkbox"
              checked={form.liberar_familia}
              onChange={(e) => atualizarCampo('liberar_familia', e.target.checked)}
            />
            Liberar resumo para App Família
          </label>

          <label>
            <input
              type="checkbox"
              checked={form.permitir_ia}
              onChange={(e) => atualizarCampo('permitir_ia', e.target.checked)}
            />
            Permitir apoio da IA neste registro
          </label>
        </div>

        <button onClick={salvarProntuario} style={botaoPrincipal}>
          Salvar registro no prontuário
        </button>
      </div>

      <div style={box}>
        <h2>Buscar registros</h2>
        <input
          placeholder="Buscar por paciente, serviço ou tipo de registro"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          style={inputBusca}
        />
      </div>

      <h2>Registros do prontuário</h2>

      <div style={{ display: 'grid', gap: 15 }}>
        {registrosFiltrados.map((r) => (
          <div key={r.id} style={card}>
            <h3>{r.pacientes?.nome || 'Paciente não informado'}</h3>
            <p><strong>Profissional:</strong> {r.profissionais?.nome || r.profissional_nome || '-'}</p>
            <p><strong>Data:</strong> {r.data_sessao || '-'}</p>
            <p><strong>Serviço:</strong> {r.servico || '-'}</p>
            <p><strong>Tipo:</strong> {r.tipo_registro || 'Sessão'}</p>
            <p><strong>Evolução:</strong> {r.evolucao || '-'}</p>
            <p><strong>Resumo família:</strong> {r.resumo_familia || '-'}</p>
            <p><strong>IA permitida:</strong> {r.permitir_ia ? 'Sim' : 'Não'}</p>
            <p><strong>Liberado família:</strong> {r.liberar_familia ? 'Sim' : 'Não'}</p>
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

const abas = {
  display: 'flex',
  gap: 10,
  flexWrap: 'wrap',
  marginBottom: 20
}

const abaBotao = {
  padding: 10,
  borderRadius: 10,
  border: '1px solid #ccc',
  background: '#fff',
  cursor: 'pointer'
}

const abaAtiva = {
  ...abaBotao,
  background: '#0f766e',
  color: '#fff'
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
  gap: 15,
  marginBottom: 20
}

const gridTextos = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 15,
  marginTop: 20
}

const textareaGrande = {
  width: '100%',
  minHeight: 260,
  padding: 14,
  borderRadius: 10,
  border: '1px solid #ccc',
  marginTop: 20
}

const checks = {
  display: 'flex',
  gap: 25,
  flexWrap: 'wrap',
  marginTop: 25,
  marginBottom: 20
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

const botaoIA = {
  marginTop: 15,
  background: '#7c3aed',
  color: '#fff',
  border: 'none',
  borderRadius: 10,
  padding: 12,
  cursor: 'pointer',
  fontWeight: 'bold'
}

const inputBusca = {
  width: '100%',
  padding: 14,
  borderRadius: 10,
  border: '1px solid #ccc'
}

const card = {
  background: '#fff',
  borderRadius: 16,
  padding: 20,
  boxShadow: '0 2px 10px rgba(0,0,0,0.08)'
}
