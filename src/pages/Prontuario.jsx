import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

function dataBR(data) {
  if (!data) return '-'
  const [ano, mes, dia] = String(data).split('-')
  return `${dia}/${mes}/${ano}`
}

const ABAS = [
  'Identificação',
  'Registro da sessão',
  'Resumo família',
  'Anamnese',
  'Plano de intervenção',
  'Reuniões / visita escolar',
  'Anexos',
  'Relatório IA',
  'Histórico'
]

export default function Prontuario() {
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')

  const [aba, setAba] = useState('Identificação')
  const [pacientes, setPacientes] = useState([])
  const [vinculos, setVinculos] = useState([])
  const [prontuarios, setProntuarios] = useState([])
  const [anexos, setAnexos] = useState([])
  const [arquivos, setArquivos] = useState([])
  const [pacienteFiltro, setPacienteFiltro] = useState('')

  const [form, setForm] = useState({
    paciente_id: '',
    data_sessao: new Date().toISOString().slice(0, 10),
    servico: '',
    tipo_registro: 'Sessão',
    area_atendimento: '',

    identificacao_paciente: '',

    registro_sessao: '',
    observacoes: '',

    resumo_sessao: '',
    resumo_familia: '',
    orientacoes_familia: '',
    liberar_familia: true,

    queixa_principal: '',
    historico_gestacional: '',
    historico_parto: '',
    desenvolvimento_motor: '',
    desenvolvimento_linguagem: '',
    sono: '',
    alimentacao: '',
    saude_geral: '',
    escola: '',
    aprendizagem: '',
    comportamento: '',
    socializacao: '',
    autonomia: '',
    terapias_anteriores: '',
    rotina_familiar: '',
    observacoes_clinicas: '',

    plano_trimestral: '',
    plano_semestral: '',
    plano_anual: '',

    reuniao_familia: '',
    reuniao_escola: '',
    reuniao_profissionais: '',
    visita_escolar: '',

    relatorio_ia: ''
  })

  async function carregarDados() {
    const { data: pacientesData } = await supabase
      .from('pacientes')
      .select('*')
      .order('nome')

    const { data: vinculosData } = await supabase
      .from('profissional_pacientes')
      .select('*')
      .eq('ativo', true)

    const { data: prontuarioData } = await supabase
      .from('prontuarios')
      .select(`
        *,
        pacientes(nome, responsavel, area_atendimento)
      `)
      .order('created_at', { ascending: false })

    const { data: anexosData } = await supabase
      .from('prontuario_anexos')
      .select('*')
      .order('created_at', { ascending: false })

    setPacientes(pacientesData || [])
    setVinculos(vinculosData || [])
    setProntuarios(prontuarioData || [])
    setAnexos(anexosData || [])
  }

  useEffect(() => {
    carregarDados()
  }, [])

  function atualizarCampo(campo, valor) {
    setForm((prev) => ({
      ...prev,
      [campo]: valor
    }))
  }

  const pacientesPermitidos = useMemo(() => {
    const nivel = usuario?.nivel_acesso || 'Colaborador'

    if (['Administradora', 'Coordenação'].includes(nivel)) {
      return pacientes
    }

    if (nivel === 'Supervisor') {
      return pacientes.filter(
        (p) => p.area_atendimento === usuario?.area_supervisao
      )
    }

    if (nivel === 'Colaborador') {
      const ids = vinculos
        .filter((v) => v.profissional_id === usuario?.id)
        .map((v) => v.paciente_id)

      return pacientes.filter((p) => ids.includes(p.id))
    }

    return []
  }, [pacientes, vinculos, usuario])

  const pacienteAtual = useMemo(() => {
    return pacientes.find((p) => p.id === form.paciente_id)
  }, [pacientes, form.paciente_id])

  function selecionarPaciente(id) {
    const paciente = pacientes.find((p) => p.id === id)

    setForm((prev) => ({
      ...prev,
      paciente_id: id,
      area_atendimento: paciente?.area_atendimento || '',
      identificacao_paciente: paciente
        ? `Paciente: ${paciente.nome || '-'}
Responsável: ${paciente.responsavel || '-'}
Área principal: ${paciente.area_atendimento || '-'}
Escola: ${paciente.escola || '-'}
Série: ${paciente.serie || '-'}
Status: ${paciente.status || '-'}`
        : ''
    }))
  }

  function selecionarArquivos(e) {
    setArquivos(Array.from(e.target.files || []))
  }

  async function enviarAnexos(prontuarioId, pacienteId) {
    if (!arquivos.length) return

    const registros = []

    for (const arquivo of arquivos) {
      const caminho = `${pacienteId}/${Date.now()}-${arquivo.name}`

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

      registros.push({
        prontuario_id: prontuarioId,
        paciente_id: pacienteId,
        nome_arquivo: arquivo.name,
        tipo: arquivo.type,
        url: data.publicUrl,
        categoria: 'Anexo'
      })
    }

    if (registros.length) {
      await supabase.from('prontuario_anexos').insert(registros)
    }
  }

  function gerarResumoFamilia() {
    const texto = `Resumo da sessão:
${form.registro_sessao || form.observacoes || ''}

Orientações:
${form.orientacoes_familia || ''}`

    atualizarCampo('resumo_familia', texto)
  }

  function gerarRelatorioIA() {
    const texto = `RELATÓRIO CLÍNICO INTELIGENTE

IDENTIFICAÇÃO
${form.identificacao_paciente || '-'}

ÁREA DE ATENDIMENTO
${form.area_atendimento || '-'}

REGISTRO DA SESSÃO
${form.registro_sessao || '-'}

RESUMO PARA FAMÍLIA
${form.resumo_sessao || form.resumo_familia || '-'}

ORIENTAÇÕES À FAMÍLIA
${form.orientacoes_familia || '-'}

ANAMNESE
Queixa principal: ${form.queixa_principal || '-'}
Histórico gestacional: ${form.historico_gestacional || '-'}
Histórico do parto: ${form.historico_parto || '-'}
Desenvolvimento motor: ${form.desenvolvimento_motor || '-'}
Desenvolvimento da linguagem: ${form.desenvolvimento_linguagem || '-'}
Sono: ${form.sono || '-'}
Alimentação: ${form.alimentacao || '-'}
Saúde geral: ${form.saude_geral || '-'}
Escola: ${form.escola || '-'}
Aprendizagem: ${form.aprendizagem || '-'}
Comportamento: ${form.comportamento || '-'}
Socialização: ${form.socializacao || '-'}
Autonomia: ${form.autonomia || '-'}

PLANO DE INTERVENÇÃO
Plano trimestral: ${form.plano_trimestral || '-'}
Plano semestral: ${form.plano_semestral || '-'}
Plano anual: ${form.plano_anual || '-'}

REUNIÕES / VISITA ESCOLAR
Família: ${form.reuniao_familia || '-'}
Escola: ${form.reuniao_escola || '-'}
Profissionais: ${form.reuniao_profissionais || '-'}
Visita escolar: ${form.visita_escolar || '-'}

ANÁLISE IA
• Recomenda-se manter acompanhamento contínuo das habilidades funcionais, acadêmicas, comunicativas e socioemocionais.
• O plano deve priorizar objetivos mensuráveis, funcionais e individualizados.
• É importante alinhar família, escola e equipe clínica.
• O resumo familiar deve permanecer claro, objetivo e com orientações práticas.
• A evolução deve ser monitorada por registros periódicos e metas de intervenção.

CONCLUSÃO
Paciente segue em acompanhamento, com necessidade de continuidade das intervenções propostas e revisão periódica dos objetivos terapêuticos.`
    atualizarCampo('relatorio_ia', texto)
  }

  async function salvarProntuario() {
    if (!form.paciente_id) {
      alert('Selecione o paciente.')
      return
    }

    if (!form.resumo_sessao && !form.resumo_familia) {
      alert('Preencha o resumo da sessão para família.')
      return
    }

    const dados = {
      ...form,
      resumo_familia: form.resumo_familia || form.resumo_sessao,
      profissional_nome: usuario?.nome || '-',
      area_atendimento: form.area_atendimento || pacienteAtual?.area_atendimento || ''
    }

    const { data, error } = await supabase
      .from('prontuarios')
      .insert([dados])
      .select()

    if (error) {
      console.log(error)
      alert('Erro ao salvar prontuário.')
      return
    }

    const prontuarioId = data?.[0]?.id

    if (prontuarioId) {
      await enviarAnexos(prontuarioId, form.paciente_id)
    }

    alert('Prontuário salvo com sucesso.')

    limparFormulario()
    carregarDados()
  }

  function limparFormulario() {
    setArquivos([])

    setForm({
      paciente_id: '',
      data_sessao: new Date().toISOString().slice(0, 10),
      servico: '',
      tipo_registro: 'Sessão',
      area_atendimento: '',
      identificacao_paciente: '',
      registro_sessao: '',
      observacoes: '',
      resumo_sessao: '',
      resumo_familia: '',
      orientacoes_familia: '',
      liberar_familia: true,

      queixa_principal: '',
      historico_gestacional: '',
      historico_parto: '',
      desenvolvimento_motor: '',
      desenvolvimento_linguagem: '',
      sono: '',
      alimentacao: '',
      saude_geral: '',
      escola: '',
      aprendizagem: '',
      comportamento: '',
      socializacao: '',
      autonomia: '',
      terapias_anteriores: '',
      rotina_familiar: '',
      observacoes_clinicas: '',

      plano_trimestral: '',
      plano_semestral: '',
      plano_anual: '',

      reuniao_familia: '',
      reuniao_escola: '',
      reuniao_profissionais: '',
      visita_escolar: '',

      relatorio_ia: ''
    })

    setAba('Identificação')
  }

  const prontuariosFiltrados = useMemo(() => {
    const idsPermitidos = pacientesPermitidos.map((p) => p.id)

    return prontuarios.filter((p) => {
      const permitido = idsPermitidos.includes(p.paciente_id)
      const filtroOk = !pacienteFiltro || p.paciente_id === pacienteFiltro
      return permitido && filtroOk
    })
  }, [prontuarios, pacientesPermitidos, pacienteFiltro])

  const anexosPaciente = useMemo(() => {
    if (!form.paciente_id) return []
    return anexos.filter((a) => a.paciente_id === form.paciente_id)
  }, [anexos, form.paciente_id])

  return (
    <div style={pagina}>
      <h1>Prontuário Inteligente</h1>

      <p style={{ color: '#666', marginBottom: 25 }}>
        Identificação, registro de sessão, resumo para família, anamnese, planos, reuniões, anexos e relatório IA.
      </p>

      <div style={box}>
        <h2>Paciente</h2>

        <div style={grid}>
          <select
            value={form.paciente_id}
            onChange={(e) => selecionarPaciente(e.target.value)}
          >
            <option value="">Selecione o paciente</option>
            {pacientesPermitidos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome} — {p.area_atendimento || 'sem área'}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={form.data_sessao}
            onChange={(e) => atualizarCampo('data_sessao', e.target.value)}
          />

          <input
            placeholder="Serviço / terapia"
            value={form.servico}
            onChange={(e) => atualizarCampo('servico', e.target.value)}
          />

          <select
            value={form.tipo_registro}
            onChange={(e) => atualizarCampo('tipo_registro', e.target.value)}
          >
            <option>Sessão</option>
            <option>Anamnese</option>
            <option>Plano de intervenção</option>
            <option>Reunião</option>
            <option>Visita escolar</option>
            <option>Relatório</option>
          </select>
        </div>
      </div>

      <div style={abas}>
        {ABAS.map((item) => (
          <button
            key={item}
            onClick={() => setAba(item)}
            style={aba === item ? abaAtiva : abaBotao}
          >
            {item}
          </button>
        ))}
      </div>

      {aba === 'Identificação' && (
        <div style={box}>
          <h2>Identificação do paciente</h2>

          <textarea
            value={form.identificacao_paciente}
            onChange={(e) => atualizarCampo('identificacao_paciente', e.target.value)}
            style={textareaGrande}
            placeholder="Identificação do paciente"
          />
        </div>
      )}

      {aba === 'Registro da sessão' && (
        <div style={box}>
          <h2>Registro clínico da sessão</h2>

          <textarea
            placeholder="Registro técnico da sessão, evolução, respostas observadas, estratégias utilizadas e condutas."
            value={form.registro_sessao}
            onChange={(e) => atualizarCampo('registro_sessao', e.target.value)}
            style={textareaGrande}
          />

          <textarea
            placeholder="Observações internas complementares"
            value={form.observacoes}
            onChange={(e) => atualizarCampo('observacoes', e.target.value)}
            style={textareaGrande}
          />
        </div>
      )}

      {aba === 'Resumo família' && (
        <div style={box}>
          <h2>Resumo da sessão para família</h2>

          <textarea
            placeholder="Resumo simples e claro da sessão para aparecer no App Família"
            value={form.resumo_sessao}
            onChange={(e) => atualizarCampo('resumo_sessao', e.target.value)}
            style={textareaGrande}
          />

          <textarea
            placeholder="Orientações para família"
            value={form.orientacoes_familia}
            onChange={(e) => atualizarCampo('orientacoes_familia', e.target.value)}
            style={textareaGrande}
          />

          <button onClick={gerarResumoFamilia} style={botaoAzul}>
            Organizar resumo + orientações
          </button>

          <textarea
            placeholder="Texto final liberado para a família"
            value={form.resumo_familia}
            onChange={(e) => atualizarCampo('resumo_familia', e.target.value)}
            style={textareaGrande}
          />

          <label style={check}>
            <input
              type="checkbox"
              checked={form.liberar_familia}
              onChange={(e) => atualizarCampo('liberar_familia', e.target.checked)}
            />
            Liberar no App Família
          </label>
        </div>
      )}

      {aba === 'Anamnese' && (
        <div style={box}>
          <h2>Anamnese completa</h2>

          <div style={grid}>
            <textarea placeholder="Queixa principal" value={form.queixa_principal} onChange={(e) => atualizarCampo('queixa_principal', e.target.value)} />
            <textarea placeholder="Histórico gestacional" value={form.historico_gestacional} onChange={(e) => atualizarCampo('historico_gestacional', e.target.value)} />
            <textarea placeholder="Histórico do parto" value={form.historico_parto} onChange={(e) => atualizarCampo('historico_parto', e.target.value)} />
            <textarea placeholder="Desenvolvimento motor" value={form.desenvolvimento_motor} onChange={(e) => atualizarCampo('desenvolvimento_motor', e.target.value)} />
            <textarea placeholder="Desenvolvimento da linguagem" value={form.desenvolvimento_linguagem} onChange={(e) => atualizarCampo('desenvolvimento_linguagem', e.target.value)} />
            <textarea placeholder="Sono" value={form.sono} onChange={(e) => atualizarCampo('sono', e.target.value)} />
            <textarea placeholder="Alimentação" value={form.alimentacao} onChange={(e) => atualizarCampo('alimentacao', e.target.value)} />
            <textarea placeholder="Saúde geral" value={form.saude_geral} onChange={(e) => atualizarCampo('saude_geral', e.target.value)} />
            <textarea placeholder="Escola" value={form.escola} onChange={(e) => atualizarCampo('escola', e.target.value)} />
            <textarea placeholder="Aprendizagem" value={form.aprendizagem} onChange={(e) => atualizarCampo('aprendizagem', e.target.value)} />
            <textarea placeholder="Comportamento" value={form.comportamento} onChange={(e) => atualizarCampo('comportamento', e.target.value)} />
            <textarea placeholder="Socialização" value={form.socializacao} onChange={(e) => atualizarCampo('socializacao', e.target.value)} />
            <textarea placeholder="Autonomia" value={form.autonomia} onChange={(e) => atualizarCampo('autonomia', e.target.value)} />
            <textarea placeholder="Terapias anteriores/atuais" value={form.terapias_anteriores} onChange={(e) => atualizarCampo('terapias_anteriores', e.target.value)} />
            <textarea placeholder="Rotina familiar" value={form.rotina_familiar} onChange={(e) => atualizarCampo('rotina_familiar', e.target.value)} />
            <textarea placeholder="Observações clínicas" value={form.observacoes_clinicas} onChange={(e) => atualizarCampo('observacoes_clinicas', e.target.value)} />
          </div>
        </div>
      )}

      {aba === 'Plano de intervenção' && (
        <div style={box}>
          <h2>Plano de intervenção</h2>

          <textarea placeholder="Plano trimestral" value={form.plano_trimestral} onChange={(e) => atualizarCampo('plano_trimestral', e.target.value)} style={textareaGrande} />
          <textarea placeholder="Plano semestral" value={form.plano_semestral} onChange={(e) => atualizarCampo('plano_semestral', e.target.value)} style={textareaGrande} />
          <textarea placeholder="Plano anual" value={form.plano_anual} onChange={(e) => atualizarCampo('plano_anual', e.target.value)} style={textareaGrande} />
        </div>
      )}

      {aba === 'Reuniões / visita escolar' && (
        <div style={box}>
          <h2>Reuniões e visita escolar</h2>

          <textarea placeholder="Reunião com família" value={form.reuniao_familia} onChange={(e) => atualizarCampo('reuniao_familia', e.target.value)} style={textareaGrande} />
          <textarea placeholder="Reunião com escola" value={form.reuniao_escola} onChange={(e) => atualizarCampo('reuniao_escola', e.target.value)} style={textareaGrande} />
          <textarea placeholder="Reunião com profissionais" value={form.reuniao_profissionais} onChange={(e) => atualizarCampo('reuniao_profissionais', e.target.value)} style={textareaGrande} />
          <textarea placeholder="Visita escolar / observação escolar" value={form.visita_escolar} onChange={(e) => atualizarCampo('visita_escolar', e.target.value)} style={textareaGrande} />
        </div>
      )}

      {aba === 'Anexos' && (
        <div style={box}>
          <h2>Anexos do paciente</h2>

          <input type="file" multiple onChange={selecionarArquivos} />

          {arquivos.length > 0 && (
            <div style={{ marginTop: 15 }}>
              {arquivos.map((a, index) => (
                <p key={index}>📎 {a.name}</p>
              ))}
            </div>
          )}

          <h3>Anexos já cadastrados</h3>

          {anexosPaciente.length === 0 && (
            <p>Nenhum anexo encontrado para este paciente.</p>
          )}

          {anexosPaciente.map((item) => (
            <div key={item.id} style={card}>
              <strong>{item.nome_arquivo}</strong>
              <br />
              <a href={item.url} target="_blank">
                Abrir documento
              </a>
            </div>
          ))}
        </div>
      )}

      {aba === 'Relatório IA' && (
        <div style={box}>
          <h2>Relatório IA</h2>

          <button onClick={gerarRelatorioIA} style={botaoAzul}>
            Gerar relatório IA
          </button>

          <textarea
            value={form.relatorio_ia}
            onChange={(e) => atualizarCampo('relatorio_ia', e.target.value)}
            style={textareaIA}
          />
        </div>
      )}

      {aba === 'Histórico' && (
        <div style={box}>
          <h2>Histórico de prontuários</h2>

          <select
            value={pacienteFiltro}
            onChange={(e) => setPacienteFiltro(e.target.value)}
            style={{ marginBottom: 20 }}
          >
            <option value="">Todos os pacientes permitidos</option>
            {pacientesPermitidos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>

          {prontuariosFiltrados.map((item) => (
            <div key={item.id} style={card}>
              <h3>{item.pacientes?.nome || '-'}</h3>
              <p><strong>Data:</strong> {dataBR(item.data_sessao)}</p>
              <p><strong>Tipo:</strong> {item.tipo_registro || '-'}</p>
              <p><strong>Serviço:</strong> {item.servico || '-'}</p>
              <p><strong>Profissional:</strong> {item.profissional_nome || '-'}</p>
              <p><strong>Resumo família:</strong> {item.resumo_familia || item.resumo_sessao || '-'}</p>
              <p><strong>Orientações:</strong> {item.orientacoes_familia || '-'}</p>
              <p><strong>Liberado família:</strong> {item.liberar_familia ? 'Sim' : 'Não'}</p>
            </div>
          ))}
        </div>
      )}

      <button onClick={salvarProntuario} style={botaoPrincipal}>
        Salvar prontuário
      </button>
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
  marginBottom: 25,
  boxShadow: '0 2px 12px rgba(0,0,0,0.08)'
}

const grid = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 15
}

const abas = {
  display: 'flex',
  gap: 10,
  flexWrap: 'wrap',
  marginBottom: 20
}

const abaBotao = {
  background: '#fff',
  border: '1px solid #ddd',
  borderRadius: 12,
  padding: 12,
  cursor: 'pointer',
  fontWeight: 'bold'
}

const abaAtiva = {
  ...abaBotao,
  background: '#0f766e',
  color: '#fff',
  border: 'none'
}

const textareaGrande = {
  width: '100%',
  minHeight: 150,
  marginBottom: 15,
  padding: 14,
  borderRadius: 10,
  border: '1px solid #ccc',
  lineHeight: 1.6
}

const textareaIA = {
  width: '100%',
  minHeight: 420,
  marginTop: 15,
  padding: 14,
  borderRadius: 10,
  border: '1px solid #ccc',
  lineHeight: 1.7
}

const botaoPrincipal = {
  background: '#0f766e',
  color: '#fff',
  border: 'none',
  padding: 16,
  borderRadius: 14,
  cursor: 'pointer',
  fontWeight: 'bold',
  fontSize: 16,
  marginBottom: 30
}

const botaoAzul = {
  background: '#2563eb',
  color: '#fff',
  border: 'none',
  padding: 12,
  borderRadius: 12,
  cursor: 'pointer',
  fontWeight: 'bold',
  marginBottom: 15
}

const check = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  marginTop: 10
}

const card = {
  background: '#f8fafc',
  border: '1px solid #e5e7eb',
  padding: 18,
  borderRadius: 14,
  marginBottom: 15
}
