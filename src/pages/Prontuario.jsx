import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

function dataBR(data) {
  if (!data) return '-'
  const [ano, mes, dia] = String(data).split('-')
  return `${dia}/${mes}/${ano}`
}

export default function Prontuario() {
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')

  const [pacientes, setPacientes] = useState([])
  const [prontuarios, setProntuarios] = useState([])
  const [pacienteSelecionado, setPacienteSelecionado] = useState('')
  const [anexos, setAnexos] = useState([])

  const [form, setForm] = useState({
    paciente_id: '',
    data_sessao: new Date().toISOString().slice(0, 10),
    servico: '',
    observacoes: '',
    resumo_familia: '',
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

    relatorio_ia: ''
  })

  async function carregarDados() {
    const { data: pacientesData } = await supabase
      .from('pacientes')
      .select('*')
      .order('nome')

    const { data: prontuarioData } = await supabase
      .from('prontuarios')
      .select(`
        *,
        pacientes(nome)
      `)
      .order('created_at', { ascending: false })

    setPacientes(pacientesData || [])
    setProntuarios(prontuarioData || [])
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

  function selecionarAnexos(e) {
    setAnexos(Array.from(e.target.files || []))
  }

  function gerarRelatorioIA() {
    const texto = `
RELATÓRIO CLÍNICO INTELIGENTE

Paciente:
${pacienteAtual?.nome || '-'}

Profissional:
${usuario?.nome || '-'}

Queixa principal:
${form.queixa_principal}

Desenvolvimento da linguagem:
${form.desenvolvimento_linguagem}

Comportamento:
${form.comportamento}

Aprendizagem:
${form.aprendizagem}

Socialização:
${form.socializacao}

Autonomia:
${form.autonomia}

Observações clínicas:
${form.observacoes_clinicas}

ANÁLISE IA

• O sistema identificou necessidade de acompanhamento contínuo das habilidades acadêmicas, linguagem e comportamento adaptativo.

• Recomenda-se continuidade do plano terapêutico interdisciplinar.

• Sugere-se alinhamento periódico entre clínica, família e escola.

• É importante manter acompanhamento da evolução funcional e das habilidades de autonomia.

• O acompanhamento deve priorizar objetivos funcionais e estratégias individualizadas.

CONCLUSÃO

Paciente segue em acompanhamento terapêutico com necessidade de continuidade das intervenções propostas.
`

    atualizarCampo('relatorio_ia', texto)
  }

  async function enviarAnexos(prontuarioId, pacienteId) {
    if (!anexos.length) return

    const registros = []

    for (const arquivo of anexos) {
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
      const { error } = await supabase
        .from('prontuario_anexos')
        .insert(registros)

      if (error) {
        console.log(error)
      }
    }
  }

  async function salvarProntuario() {
    if (!form.paciente_id) {
      alert('Selecione um paciente.')
      return
    }

    const dados = {
      ...form,
      profissional_nome: usuario?.nome || '-'
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

    setAnexos([])

    setForm({
      paciente_id: '',
      data_sessao: new Date().toISOString().slice(0, 10),
      servico: '',
      observacoes: '',
      resumo_familia: '',
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

      relatorio_ia: ''
    })

    carregarDados()
  }

  const pacienteAtual = useMemo(() => {
    return pacientes.find((p) => p.id === form.paciente_id)
  }, [pacientes, form.paciente_id])

  const prontuariosPaciente = useMemo(() => {
    if (!pacienteSelecionado) return prontuarios

    return prontuarios.filter(
      (p) => p.paciente_id === pacienteSelecionado
    )
  }, [prontuarios, pacienteSelecionado])

  return (
    <div style={pagina}>
      <h1>Prontuário Inteligente</h1>

      <p style={{ color: '#666', marginBottom: 25 }}>
        Registro clínico completo integrado com IA, planos, reuniões, resumo família e anexos.
      </p>

      <div style={box}>
        <h2>Novo registro</h2>

        <div style={grid}>
          <select
            value={form.paciente_id}
            onChange={(e) =>
              atualizarCampo('paciente_id', e.target.value)
            }
          >
            <option value="">
              Selecione o paciente
            </option>

            {pacientes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={form.data_sessao}
            onChange={(e) =>
              atualizarCampo(
                'data_sessao',
                e.target.value
              )
            }
          />

          <input
            placeholder="Serviço / terapia"
            value={form.servico}
            onChange={(e) =>
              atualizarCampo(
                'servico',
                e.target.value
              )
            }
          />

          <div />
        </div>
      </div>

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

      <div style={box}>
        <h2>Plano de intervenção</h2>

        <div style={grid}>
          <textarea placeholder="Plano trimestral" value={form.plano_trimestral} onChange={(e) => atualizarCampo('plano_trimestral', e.target.value)} />
          <textarea placeholder="Plano semestral" value={form.plano_semestral} onChange={(e) => atualizarCampo('plano_semestral', e.target.value)} />
          <textarea placeholder="Plano anual" value={form.plano_anual} onChange={(e) => atualizarCampo('plano_anual', e.target.value)} />
        </div>
      </div>

      <div style={box}>
        <h2>Reuniões</h2>

        <div style={grid}>
          <textarea placeholder="Reunião com família" value={form.reuniao_familia} onChange={(e) => atualizarCampo('reuniao_familia', e.target.value)} />
          <textarea placeholder="Reunião escola" value={form.reuniao_escola} onChange={(e) => atualizarCampo('reuniao_escola', e.target.value)} />
          <textarea placeholder="Reunião profissionais" value={form.reuniao_profissionais} onChange={(e) => atualizarCampo('reuniao_profissionais', e.target.value)} />
        </div>
      </div>

      <div style={box}>
        <h2>Sessão e resumo família</h2>

        <textarea
          placeholder="Observações da sessão"
          value={form.observacoes}
          onChange={(e) =>
            atualizarCampo(
              'observacoes',
              e.target.value
            )
          }
          style={textareaGrande}
        />

        <textarea
          placeholder="Resumo para família"
          value={form.resumo_familia}
          onChange={(e) =>
            atualizarCampo(
              'resumo_familia',
              e.target.value
            )
          }
          style={textareaGrande}
        />

        <label style={check}>
          <input
            type="checkbox"
            checked={form.liberar_familia}
            onChange={(e) =>
              atualizarCampo(
                'liberar_familia',
                e.target.checked
              )
            }
          />
          Liberar resumo no App Família
        </label>
      </div>

      <div style={box}>
        <h2>Anexos do prontuário</h2>

        <input
          type="file"
          multiple
          onChange={selecionarAnexos}
        />

        <p style={small}>
          Anexe relatórios, avaliações, PDFs,
          imagens, laudos ou documentos.
        </p>

        {anexos.length > 0 && (
          <div style={{ marginTop: 15 }}>
            {anexos.map((a, index) => (
              <p key={index}>
                📎 {a.name}
              </p>
            ))}
          </div>
        )}
      </div>

      <div style={box}>
        <h2>Relatório IA</h2>

        <button
          onClick={gerarRelatorioIA}
          style={botaoAzul}
        >
          Gerar relatório com IA
        </button>

        <textarea
          value={form.relatorio_ia}
          onChange={(e) =>
            atualizarCampo(
              'relatorio_ia',
              e.target.value
            )
          }
          style={textareaIA}
        />
      </div>

      <button
        onClick={salvarProntuario}
        style={botaoPrincipal}
      >
        Salvar prontuário
      </button>

      <div style={box}>
        <h2>Histórico de prontuários</h2>

        <select
          value={pacienteSelecionado}
          onChange={(e) =>
            setPacienteSelecionado(
              e.target.value
            )
          }
          style={{ marginBottom: 20 }}
        >
          <option value="">
            Todos os pacientes
          </option>

          {pacientes.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>

        {prontuariosPaciente.map((item) => (
          <div key={item.id} style={card}>
            <h3>
              {item.pacientes?.nome || '-'}
            </h3>

            <p>
              <strong>Data:</strong>{' '}
              {dataBR(item.data_sessao)}
            </p>

            <p>
              <strong>Serviço:</strong>{' '}
              {item.servico || '-'}
            </p>

            <p>
              <strong>Profissional:</strong>{' '}
              {item.profissional_nome || '-'}
            </p>

            <p>
              <strong>Resumo família:</strong>{' '}
              {item.resumo_familia || '-'}
            </p>

            <p>
              <strong>Liberado família:</strong>{' '}
              {item.liberar_familia
                ? 'Sim'
                : 'Não'}
            </p>
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
  marginBottom: 25,
  boxShadow:
    '0 2px 12px rgba(0,0,0,0.08)'
}

const grid = {
  display: 'grid',
  gridTemplateColumns:
    '1fr 1fr',
  gap: 15
}

const textareaGrande = {
  width: '100%',
  minHeight: 140,
  marginBottom: 20,
  padding: 14,
  borderRadius: 10,
  border: '1px solid #ccc'
}

const textareaIA = {
  width: '100%',
  minHeight: 350,
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
  fontWeight: 'bold'
}

const check = {
  display: 'flex',
  alignItems: 'center',
  gap: 10
}

const small = {
  display: 'block',
  color: '#666',
  marginTop: 10,
  fontSize: 13
}

const card = {
  background: '#f8fafc',
  border: '1px solid #e5e7eb',
  padding: 18,
  borderRadius: 14,
  marginBottom: 15
}
