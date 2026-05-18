import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

function dataBR(data) {
  if (!data) return '-'
  const [ano, mes, dia] = String(data).split('-')
  return `${dia}/${mes}/${ano}`
}

function dinheiro(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  })
}

export default function Familia() {
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')
  const tipoUsuario = localStorage.getItem('tipo_usuario')

  const admin = usuario?.nivel_acesso === 'Administradora'

  const [pacientes, setPacientes] = useState([])
  const [pacienteSelecionado, setPacienteSelecionado] = useState(null)

  const [agenda, setAgenda] = useState([])
  const [prontuarios, setProntuarios] = useState([])
  const [financeiro, setFinanceiro] = useState([])
  const [anexos, setAnexos] = useState([])

  async function carregarDados() {
    if (admin) {
      const { data } = await supabase
        .from('pacientes')
        .select('*')
        .order('nome')

      setPacientes(data || [])

      if (data?.length && !pacienteSelecionado) {
        setPacienteSelecionado(data[0])
      }

      return
    }

    setPacienteSelecionado(usuario)
  }

  useEffect(() => {
    carregarDados()
  }, [])

  async function carregarPaciente(id) {
    if (!id) return

    const { data: agendaData } = await supabase
      .from('agenda')
      .select(`
        *,
        profissionais(nome)
      `)
      .eq('paciente_id', id)
      .order('data', { ascending: false })

    const { data: prontuarioData } = await supabase
      .from('prontuarios')
      .select('*')
      .eq('paciente_id', id)
      .eq('liberar_familia', true)
      .order('data_sessao', { ascending: false })

    const { data: financeiroData } = await supabase
      .from('financeiro')
      .select('*')
      .eq('paciente_id', id)
      .order('created_at', { ascending: false })

    const { data: anexosData } = await supabase
      .from('prontuario_anexos')
      .select('*')
      .eq('paciente_id', id)
      .order('created_at', { ascending: false })

    setAgenda(agendaData || [])
    setProntuarios(prontuarioData || [])
    setFinanceiro(financeiroData || [])
    setAnexos(anexosData || [])
  }

  useEffect(() => {
    if (pacienteSelecionado?.id) {
      carregarPaciente(pacienteSelecionado.id)
    }
  }, [pacienteSelecionado])

  const proximosAtendimentos = useMemo(() => {
    const hoje = new Date().toISOString().slice(0, 10)

    return agenda.filter((a) => a.data >= hoje)
  }, [agenda])

  const financeiroPendente = useMemo(() => {
    return financeiro.filter((f) => f.status !== 'Pago')
  }, [financeiro])

  function sair() {
    localStorage.clear()
    window.location.href = '/'
  }

  return (
    <div style={pagina}>
      <div style={topo}>
        <div>
          <h1>App Família</h1>

          <p style={{ color: '#666' }}>
            Agenda, evolução terapêutica, orientações e documentos.
          </p>
        </div>

        <button onClick={sair} style={botaoSair}>
          Sair
        </button>
      </div>

      {admin && (
        <div style={box}>
          <h2>Visualização administradora</h2>

          <select
            value={pacienteSelecionado?.id || ''}
            onChange={(e) => {
              const paciente = pacientes.find((p) => p.id === e.target.value)
              setPacienteSelecionado(paciente)
            }}
            style={select}
          >
            {pacientes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </div>
      )}

      {pacienteSelecionado && (
        <>
          <div style={boxPaciente}>
            <div style={fotoBox}>
              {pacienteSelecionado?.foto_url ? (
                <img
                  src={pacienteSelecionado.foto_url}
                  alt={pacienteSelecionado.nome}
                  style={foto}
                />
              ) : (
                <span>Sem foto</span>
              )}
            </div>

            <div>
              <h2>{pacienteSelecionado.nome}</h2>

              <p>
                <strong>Responsável:</strong>{' '}
                {pacienteSelecionado.responsavel || '-'}
              </p>

              <p>
                <strong>Área principal:</strong>{' '}
                {pacienteSelecionado.area_atendimento || '-'}
              </p>

              <p>
                <strong>Escola:</strong>{' '}
                {pacienteSelecionado.escola || '-'}
              </p>

              <p>
                <strong>Série:</strong>{' '}
                {pacienteSelecionado.serie || '-'}
              </p>
            </div>
          </div>

          <div style={gridResumo}>
            <ResumoCard
              titulo="Próximos atendimentos"
              valor={proximosAtendimentos.length}
            />

            <ResumoCard
              titulo="Registros liberados"
              valor={prontuarios.length}
            />

            <ResumoCard
              titulo="Pendências financeiras"
              valor={financeiroPendente.length}
            />

            <ResumoCard
              titulo="Documentos"
              valor={anexos.length}
            />
          </div>

          <div style={duasColunas}>
            <div style={box}>
              <h2>Agenda</h2>

              {agenda.length === 0 && (
                <p>Nenhum atendimento encontrado.</p>
              )}

              {agenda.map((item) => (
                <div key={item.id} style={card}>
                  <h3>
                    {dataBR(item.data)} às {item.horario}
                  </h3>

                  <p>
                    <strong>Serviço:</strong>{' '}
                    {item.servico || '-'}
                  </p>

                  <p>
                    <strong>Profissional:</strong>{' '}
                    {item.profissionais?.nome || '-'}
                  </p>

                  <p>
                    <strong>Status:</strong>{' '}
                    {item.status || '-'}
                  </p>

                  <p>
                    <strong>Modalidade:</strong>{' '}
                    {item.modalidade || '-'}
                  </p>
                </div>
              ))}
            </div>

            <div style={box}>
              <h2>Financeiro</h2>

              {financeiro.length === 0 && (
                <p>Nenhum registro financeiro encontrado.</p>
              )}

              {financeiro.map((item) => (
                <div key={item.id} style={card}>
                  <h3>{item.descricao || 'Sessão'}</h3>

                  <p>
                    <strong>Valor:</strong>{' '}
                    {dinheiro(item.valor)}
                  </p>

                  <p>
                    <strong>Status:</strong>{' '}
                    {item.status || '-'}
                  </p>

                  <p>
                    <strong>Vencimento:</strong>{' '}
                    {dataBR(item.vencimento)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div style={box}>
            <h2>Resumo das sessões</h2>

            {prontuarios.length === 0 && (
              <p>Nenhum registro liberado para família.</p>
            )}

            {prontuarios.map((item) => (
              <div key={item.id} style={cardGrande}>
                <h3>
                  {dataBR(item.data_sessao)} — {item.servico || 'Sessão'}
                </h3>

                <div style={secao}>
                  <h4>Resumo da sessão</h4>

                  <p style={texto}>
                    {item.resumo_sessao ||
                      item.resumo_familia ||
                      '-'}
                  </p>
                </div>

                <div style={secao}>
                  <h4>Orientações para família</h4>

                  <p style={texto}>
                    {item.orientacoes_familia || '-'}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div style={box}>
            <h2>Documentos e anexos</h2>

            {anexos.length === 0 && (
              <p>Nenhum documento anexado.</p>
            )}

            {anexos.map((item) => (
              <div key={item.id} style={card}>
                <h3>{item.nome_arquivo}</h3>

                <a href={item.url} target="_blank">
                  Abrir documento
                </a>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function ResumoCard({ titulo, valor }) {
  return (
    <div style={cardResumo}>
      <span>{titulo}</span>
      <strong>{valor}</strong>
    </div>
  )
}

const pagina = {
  padding: 30,
  background: '#f5f7fb',
  minHeight: '100vh',
  fontFamily: 'Arial'
}

const topo = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 20,
  flexWrap: 'wrap',
  marginBottom: 25
}

const box = {
  background: '#fff',
  borderRadius: 16,
  padding: 24,
  marginBottom: 24,
  boxShadow: '0 2px 12px rgba(0,0,0,0.08)'
}

const boxPaciente = {
  ...box,
  display: 'flex',
  gap: 25,
  alignItems: 'center',
  flexWrap: 'wrap'
}

const fotoBox = {
  width: 140,
  height: 140,
  borderRadius: 20,
  overflow: 'hidden',
  background: '#f1f5f9',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
}

const foto = {
  width: '100%',
  height: '100%',
  objectFit: 'cover'
}

const gridResumo = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: 15,
  marginBottom: 25
}

const cardResumo = {
  background: '#fff',
  borderRadius: 16,
  padding: 20,
  boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
  display: 'grid',
  gap: 8
}

const duasColunas = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 20,
  marginBottom: 25
}

const card = {
  background: '#f8fafc',
  border: '1px solid #e5e7eb',
  borderRadius: 14,
  padding: 16,
  marginBottom: 15
}

const cardGrande = {
  background: '#f8fafc',
  border: '1px solid #e5e7eb',
  borderRadius: 16,
  padding: 20,
  marginBottom: 20
}

const secao = {
  marginTop: 18
}

const texto = {
  whiteSpace: 'pre-line',
  lineHeight: 1.7
}

const select = {
  width: '100%',
  padding: 14,
  borderRadius: 12,
  border: '1px solid #ccc'
}

const botaoSair = {
  background: '#dc2626',
  color: '#fff',
  border: 'none',
  borderRadius: 12,
  padding: 12,
  cursor: 'pointer',
  fontWeight: 'bold'
}
