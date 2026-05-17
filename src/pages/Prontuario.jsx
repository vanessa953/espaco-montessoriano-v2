import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Prontuario() {
  const [pacientes, setPacientes] = useState([])
  const [pacienteSelecionado, setPacienteSelecionado] = useState('')
  const [dadosPaciente, setDadosPaciente] = useState(null)
  const [historico, setHistorico] = useState([])
  const [aba, setAba] = useState('anamnese')

  const [form, setForm] = useState({
    profissional_nome: '',
    servico: '',
    data_sessao: '',
    permitir_ia: true,

    queixa_principal: '',
    historico_gestacional: '',
    historico_parto: '',
    desenvolvimento_motor: '',
    desenvolvimento_linguagem: '',
    sono: '',
    alimentacao: '',
    saude_geral: '',
    escola_anamnese: '',
    aprendizagem: '',
    comportamento: '',
    socializacao: '',
    autonomia: '',
    terapias: '',
    rotina_familiar: '',
    observacoes_anamnese: '',
    relatorio_anamnese_ia: '',

    evolucao: '',
    conduta: '',
    resumo_familia: '',
    observacoes_internas: '',

    tipo_reuniao: '',
    participantes: '',
    encaminhamentos: '',
    metas: '',

    plano_trimestral: '',
    plano_semestral: '',
    plano_anual: '',
    indicadores_evolucao: '',

    relatorio_grafico: ''
  })

  function atualizarCampo(campo, valor) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
  }

  async function carregarPacientes() {
    const { data } = await supabase
      .from('pacientes')
      .select('*')
      .order('nome')

    setPacientes(data || [])
  }

  async function selecionarPaciente(id) {
    setPacienteSelecionado(id)

    const { data } = await supabase
      .from('pacientes')
      .select('*')
      .eq('id', id)
      .single()

    setDadosPaciente(data || null)
    carregarHistorico(id)
  }

  async function carregarHistorico(id) {
    const { data } = await supabase
      .from('prontuarios')
      .select('*')
      .eq('paciente_id', id)
      .order('created_at', { ascending: false })

    setHistorico(data || [])
  }

  function gerarRelatorioAnamneseIA() {
    if (!form.permitir_ia) {
      alert('Marque a opção Permitir IA para gerar o relatório.')
      return
    }

    const nome = dadosPaciente?.nome || 'Paciente'

    const texto = `
RELATÓRIO ORGANIZADO DE ANAMNESE

Paciente: ${nome}
Data: ${new Date().toLocaleDateString('pt-BR')}

1. QUEIXA PRINCIPAL
${form.queixa_principal || 'Não informado.'}

2. HISTÓRICO GESTACIONAL
${form.historico_gestacional || 'Não informado.'}

3. HISTÓRICO DO PARTO
${form.historico_parto || 'Não informado.'}

4. DESENVOLVIMENTO MOTOR
${form.desenvolvimento_motor || 'Não informado.'}

5. DESENVOLVIMENTO DA LINGUAGEM
${form.desenvolvimento_linguagem || 'Não informado.'}

6. SONO
${form.sono || 'Não informado.'}

7. ALIMENTAÇÃO
${form.alimentacao || 'Não informado.'}

8. SAÚDE GERAL
${form.saude_geral || 'Não informado.'}

9. ESCOLA
${form.escola_anamnese || 'Não informado.'}

10. APRENDIZAGEM
${form.aprendizagem || 'Não informado.'}

11. COMPORTAMENTO
${form.comportamento || 'Não informado.'}

12. SOCIALIZAÇÃO
${form.socializacao || 'Não informado.'}

13. AUTONOMIA
${form.autonomia || 'Não informado.'}

14. TERAPIAS ANTERIORES/ATUAIS
${form.terapias || 'Não informado.'}

15. ROTINA FAMILIAR
${form.rotina_familiar || 'Não informado.'}

16. OBSERVAÇÕES CLÍNICAS
${form.observacoes_anamnese || 'Não informado.'}

SÍNTESE CLÍNICA INICIAL
Com base nas informações apresentadas, recomenda-se organizar o acompanhamento de forma interdisciplinar, considerando o desenvolvimento global, comunicação, aprendizagem, comportamento, autonomia, rotina familiar e contexto escolar. Os dados devem orientar a definição de metas terapêuticas, plano de intervenção e acompanhamento longitudinal.

ENCAMINHAMENTOS SUGERIDOS
- Definir objetivos terapêuticos iniciais.
- Realizar acompanhamento sistemático da evolução.
- Integrar família, escola e equipe terapêutica.
- Registrar indicadores observáveis de progresso.
- Reavaliar o plano periodicamente.
`

    atualizarCampo('relatorio_anamnese_ia', texto)
  }

  async function salvarProntuario() {
    if (!pacienteSelecionado) {
      alert('Selecione o paciente.')
      return
    }

    if (!form.resumo_familia?.trim()) {
      alert('Resumo para família é obrigatório.')
      return
    }

    const dados = {
      paciente_id: pacienteSelecionado,
      ...form,
      data_sessao: form.data_sessao || null,
      liberar_familia: true
    }

    const { error } = await supabase
      .from('prontuarios')
      .insert([dados])

    if (error) {
      console.log(error)
      alert('Erro ao salvar prontuário.')
      return
    }

    alert('Prontuário salvo com sucesso.')

    setForm({
      profissional_nome: '',
      servico: '',
      data_sessao: '',
      permitir_ia: true,

      queixa_principal: '',
      historico_gestacional: '',
      historico_parto: '',
      desenvolvimento_motor: '',
      desenvolvimento_linguagem: '',
      sono: '',
      alimentacao: '',
      saude_geral: '',
      escola_anamnese: '',
      aprendizagem: '',
      comportamento: '',
      socializacao: '',
      autonomia: '',
      terapias: '',
      rotina_familiar: '',
      observacoes_anamnese: '',
      relatorio_anamnese_ia: '',

      evolucao: '',
      conduta: '',
      resumo_familia: '',
      observacoes_internas: '',

      tipo_reuniao: '',
      participantes: '',
      encaminhamentos: '',
      metas: '',

      plano_trimestral: '',
      plano_semestral: '',
      plano_anual: '',
      indicadores_evolucao: '',

      relatorio_grafico: ''
    })

    carregarHistorico(pacienteSelecionado)
  }

  useEffect(() => {
    carregarPacientes()
  }, [])

  return (
    <div style={pagina}>
      <h1>Prontuário Integrado do Paciente</h1>

      <p style={{ color: '#666' }}>
        Anamnese completa, sessões, reuniões, planos, relatórios e resumo obrigatório para a família.
      </p>

      <div style={box}>
        <h2>Selecionar paciente</h2>

        <select
          value={pacienteSelecionado}
          onChange={(e) => selecionarPaciente(e.target.value)}
          style={input}
        >
          <option value="">Selecione o paciente</option>
          {pacientes.map((p) => (
            <option key={p.id} value={p.id}>{p.nome}</option>
          ))}
        </select>
      </div>

      {dadosPaciente && (
        <div style={box}>
          <h2>Dados do paciente</h2>

          {dadosPaciente.foto_url && (
            <img
              src={dadosPaciente.foto_url}
              alt={dadosPaciente.nome}
              style={{
                width: 120,
                height: 120,
                borderRadius: 18,
                objectFit: 'cover'
              }}
            />
          )}

          <p><strong>Nome:</strong> {dadosPaciente.nome}</p>
          <p><strong>Responsável:</strong> {dadosPaciente.responsavel}</p>
          <p><strong>WhatsApp:</strong> {dadosPaciente.telefone}</p>
          <p><strong>Escola:</strong> {dadosPaciente.escola}</p>
          <p><strong>Série:</strong> {dadosPaciente.serie}</p>
          <p><strong>Diagnóstico:</strong> {dadosPaciente.diagnostico}</p>
          <p><strong>Observações:</strong> {dadosPaciente.observacoes}</p>
        </div>
      )}

      <div style={abas}>
        {['anamnese', 'sessao', 'reuniao', 'planos', 'relatorios'].map((item) => (
          <button
            key={item}
            onClick={() => setAba(item)}
            style={aba === item ? abaAtiva : abaBotao}
          >
            {item === 'anamnese' && 'Anamnese'}
            {item === 'sessao' && 'Sessão'}
            {item === 'reuniao' && 'Reuniões'}
            {item === 'planos' && 'Planos'}
            {item === 'relatorios' && 'Relatórios'}
          </button>
        ))}
      </div>

      <div style={box}>
        <h2>Novo registro</h2>

        <div style={grid}>
          <input
            placeholder="Profissional que realizou o atendimento"
            value={form.profissional_nome}
            onChange={(e) => atualizarCampo('profissional_nome', e.target.value)}
            style={input}
          />

          <select
            value={form.servico}
            onChange={(e) => atualizarCampo('servico', e.target.value)}
            style={input}
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
            <option>Reunião</option>
          </select>

          <input
            type="date"
            value={form.data_sessao}
            onChange={(e) => atualizarCampo('data_sessao', e.target.value)}
            style={input}
          />
        </div>

        <label style={{ display: 'block', marginTop: 15 }}>
          <input
            type="checkbox"
            checked={form.permitir_ia}
            onChange={(e) => atualizarCampo('permitir_ia', e.target.checked)}
          />{' '}
          Permitir IA neste registro
        </label>

        {aba === 'anamnese' && (
          <>
            <h3>Anamnese profissional completa</h3>

            <div style={grid}>
              <Campo titulo="Queixa principal" campo="queixa_principal" form={form} atualizarCampo={atualizarCampo} />
              <Campo titulo="Histórico gestacional" campo="historico_gestacional" form={form} atualizarCampo={atualizarCampo} />
              <Campo titulo="Histórico do parto" campo="historico_parto" form={form} atualizarCampo={atualizarCampo} />
              <Campo titulo="Desenvolvimento motor" campo="desenvolvimento_motor" form={form} atualizarCampo={atualizarCampo} />
              <Campo titulo="Desenvolvimento da linguagem" campo="desenvolvimento_linguagem" form={form} atualizarCampo={atualizarCampo} />
              <Campo titulo="Sono" campo="sono" form={form} atualizarCampo={atualizarCampo} />
              <Campo titulo="Alimentação" campo="alimentacao" form={form} atualizarCampo={atualizarCampo} />
              <Campo titulo="Saúde geral" campo="saude_geral" form={form} atualizarCampo={atualizarCampo} />
              <Campo titulo="Escola" campo="escola_anamnese" form={form} atualizarCampo={atualizarCampo} />
              <Campo titulo="Aprendizagem" campo="aprendizagem" form={form} atualizarCampo={atualizarCampo} />
              <Campo titulo="Comportamento" campo="comportamento" form={form} atualizarCampo={atualizarCampo} />
              <Campo titulo="Socialização" campo="socializacao" form={form} atualizarCampo={atualizarCampo} />
              <Campo titulo="Autonomia" campo="autonomia" form={form} atualizarCampo={atualizarCampo} />
              <Campo titulo="Terapias anteriores/atuais" campo="terapias" form={form} atualizarCampo={atualizarCampo} />
              <Campo titulo="Rotina familiar" campo="rotina_familiar" form={form} atualizarCampo={atualizarCampo} />
              <Campo titulo="Observações clínicas" campo="observacoes_anamnese" form={form} atualizarCampo={atualizarCampo} />
            </div>

            <button onClick={gerarRelatorioAnamneseIA} style={botaoIA}>
              Gerar relatório da anamnese com IA
            </button>

            <textarea
              placeholder="Relatório completo da anamnese gerado com apoio de IA"
              value={form.relatorio_anamnese_ia}
              onChange={(e) => atualizarCampo('relatorio_anamnese_ia', e.target.value)}
              style={textareaGrande}
            />
          </>
        )}

        {aba === 'sessao' && (
          <>
            <textarea
              placeholder="Evolução clínica da sessão"
              value={form.evolucao}
              onChange={(e) => atualizarCampo('evolucao', e.target.value)}
              style={textarea}
            />

            <textarea
              placeholder="Conduta / intervenção realizada"
              value={form.conduta}
              onChange={(e) => atualizarCampo('conduta', e.target.value)}
              style={textarea}
            />
          </>
        )}

        {aba === 'reuniao' && (
          <>
            <select
              value={form.tipo_reuniao}
              onChange={(e) => atualizarCampo('tipo_reuniao', e.target.value)}
              style={input}
            >
              <option value="">Tipo de reunião</option>
              <option>Família</option>
              <option>Escola</option>
              <option>Profissionais</option>
              <option>Todos</option>
            </select>

            <textarea placeholder="Participantes" value={form.participantes} onChange={(e) => atualizarCampo('participantes', e.target.value)} style={textarea} />
            <textarea placeholder="Encaminhamentos" value={form.encaminhamentos} onChange={(e) => atualizarCampo('encaminhamentos', e.target.value)} style={textarea} />
            <textarea placeholder="Metas combinadas" value={form.metas} onChange={(e) => atualizarCampo('metas', e.target.value)} style={textarea} />
          </>
        )}

        {aba === 'planos' && (
          <>
            <textarea placeholder="Plano trimestral" value={form.plano_trimestral} onChange={(e) => atualizarCampo('plano_trimestral', e.target.value)} style={textarea} />
            <textarea placeholder="Plano semestral" value={form.plano_semestral} onChange={(e) => atualizarCampo('plano_semestral', e.target.value)} style={textarea} />
            <textarea placeholder="Plano anual" value={form.plano_anual} onChange={(e) => atualizarCampo('plano_anual', e.target.value)} style={textarea} />
            <textarea placeholder="Indicadores de evolução" value={form.indicadores_evolucao} onChange={(e) => atualizarCampo('indicadores_evolucao', e.target.value)} style={textarea} />
          </>
        )}

        {aba === 'relatorios' && (
          <textarea
            placeholder="Relatórios clínicos, gráficos, evolução e análise longitudinal"
            value={form.relatorio_grafico}
            onChange={(e) => atualizarCampo('relatorio_grafico', e.target.value)}
            style={textareaGrande}
          />
        )}

        <h3>Resumo obrigatório para família</h3>

        <textarea
          placeholder="Resumo claro e acolhedor para o App Família"
          value={form.resumo_familia}
          onChange={(e) => atualizarCampo('resumo_familia', e.target.value)}
          style={{
            ...textarea,
            border: '2px solid #0f766e'
          }}
        />

        <textarea
          placeholder="Observações internas protegidas"
          value={form.observacoes_internas}
          onChange={(e) => atualizarCampo('observacoes_internas', e.target.value)}
          style={textarea}
        />

        <button onClick={salvarProntuario} style={botaoPrincipal}>
          Salvar prontuário
        </button>
      </div>

      <div style={box}>
        <h2>Histórico completo do paciente</h2>

        {historico.map((item) => (
          <div key={item.id} style={card}>
            <p><strong>Data:</strong> {item.data_sessao || '-'}</p>
            <p><strong>Profissional:</strong> {item.profissional_nome || '-'}</p>
            <p><strong>Serviço:</strong> {item.servico || '-'}</p>
            <p><strong>Queixa principal:</strong> {item.queixa_principal || '-'}</p>
            <p><strong>Evolução:</strong> {item.evolucao || '-'}</p>
            <p><strong>Resumo família:</strong> {item.resumo_familia || '-'}</p>
            <p><strong>Relatório IA:</strong> {item.relatorio_anamnese_ia || '-'}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function Campo({ titulo, campo, form, atualizarCampo }) {
  return (
    <div>
      <label style={{ fontWeight: 'bold' }}>{titulo}</label>
      <textarea
        value={form[campo]}
        onChange={(e) => atualizarCampo(campo, e.target.value)}
        style={textarea}
      />
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

const input = {
  width: '100%',
  padding: 12,
  borderRadius: 10,
  border: '1px solid #ccc'
}

const textarea = {
  width: '100%',
  minHeight: 100,
  padding: 12,
  borderRadius: 10,
  border: '1px solid #ccc',
  marginTop: 10
}

const textareaGrande = {
  width: '100%',
  minHeight: 250,
  padding: 12,
  borderRadius: 10,
  border: '1px solid #ccc',
  marginTop: 15
}

const abas = {
  display: 'flex',
  gap: 10,
  marginBottom: 20,
  flexWrap: 'wrap'
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

const botaoPrincipal = {
  marginTop: 20,
  background: '#0f766e',
  color: '#fff',
  border: 'none',
  borderRadius: 10,
  padding: 14,
  cursor: 'pointer',
  fontWeight: 'bold'
}

const botaoIA = {
  marginTop: 20,
  background: '#7c3aed',
  color: '#fff',
  border: 'none',
  borderRadius: 10,
  padding: 14,
  cursor: 'pointer',
  fontWeight: 'bold'
}

const card = {
  background: '#f8fafc',
  borderRadius: 14,
  padding: 18,
  marginTop: 15,
  border: '1px solid #e5e7eb'
}
