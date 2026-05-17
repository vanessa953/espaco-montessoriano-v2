import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function dinheiro(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  })
}

function dataBR(data) {
  if (!data) return '-'
  const [ano, mes, dia] = String(data).split('-')
  return `${dia}/${mes}/${ano}`
}

export default function Familia() {
  const navigate = useNavigate()
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')

  const [paciente, setPaciente] = useState(null)
  const [agenda, setAgenda] = useState([])
  const [prontuarios, setProntuarios] = useState([])
  const [financeiro, setFinanceiro] = useState([])
  const [aba, setAba] = useState('inicio')

  async function carregarDados() {
    if (!usuario?.id) return

    const { data: pacienteData } = await supabase
      .from('pacientes')
      .select('*')
      .eq('id', usuario.id)
      .maybeSingle()

    const { data: agendaData } = await supabase
      .from('agenda')
      .select(`
        *,
        profissionais(nome)
      `)
      .eq('paciente_id', usuario.id)
      .order('data', { ascending: true })

    const { data: prontuarioData } = await supabase
      .from('prontuarios')
      .select('*')
      .eq('paciente_id', usuario.id)
      .eq('liberar_familia', true)
      .order('created_at', { ascending: false })

    const { data: financeiroData } = await supabase
      .from('financeiro')
      .select('*')
      .eq('paciente_id', usuario.id)
      .order('vencimento', { ascending: false })

    setPaciente(pacienteData || usuario)
    setAgenda(agendaData || [])
    setProntuarios(prontuarioData || [])
    setFinanceiro(financeiroData || [])
  }

  useEffect(() => {
    carregarDados()
  }, [])

  const totalPendente = useMemo(() => {
    return financeiro
      .filter((item) => item.status !== 'Pago')
      .reduce((soma, item) => soma + Number(item.valor || 0), 0)
  }, [financeiro])

  function sair() {
    localStorage.removeItem('em_session')
    localStorage.removeItem('usuario')
    localStorage.removeItem('tipo_usuario')
    navigate('/')
  }

  function abrirWhatsAppClinica() {
    const telefone = '5561993183351'
    const mensagem = encodeURIComponent(
      `Olá! Sou responsável por ${paciente?.nome || 'paciente'} e gostaria de falar com o Espaço Montessoriano.`
    )

    window.open(`https://wa.me/${telefone}?text=${mensagem}`, '_blank')
  }

  return (
    <div style={pagina}>
      <div style={cabecalho}>
        <div>
          <h1>App Família</h1>
          <p style={{ color: '#666' }}>
            Acompanhamento de agenda, resumos e financeiro.
          </p>
        </div>

        <button onClick={sair} style={botaoSair}>
          Sair
        </button>
      </div>

      {paciente && (
        <div style={boxPerfil}>
          {paciente.foto_url ? (
            <img src={paciente.foto_url} alt={paciente.nome} style={foto} />
          ) : (
            <div style={fotoVazia}>Sem foto</div>
          )}

          <div>
            <h2>{paciente.nome}</h2>
            <p><strong>Responsável:</strong> {paciente.responsavel || '-'}</p>
            <p><strong>Escola:</strong> {paciente.escola || '-'}</p>
            <p><strong>Série:</strong> {paciente.serie || '-'}</p>
            <p><strong>Status:</strong> {paciente.status || 'Ativo'}</p>
          </div>
        </div>
      )}

      <div style={abas}>
        <button onClick={() => setAba('inicio')} style={aba === 'inicio' ? abaAtiva : abaBotao}>Início</button>
        <button onClick={() => setAba('agenda')} style={aba === 'agenda' ? abaAtiva : abaBotao}>Agenda</button>
        <button onClick={() => setAba('resumos')} style={aba === 'resumos' ? abaAtiva : abaBotao}>Resumos</button>
        <button onClick={() => setAba('financeiro')} style={aba === 'financeiro' ? abaAtiva : abaBotao}>Financeiro</button>
      </div>

      {aba === 'inicio' && (
        <div style={cards}>
          <Resumo titulo="Atendimentos agendados" valor={agenda.length} />
          <Resumo titulo="Resumos disponíveis" valor={prontuarios.length} />
          <Resumo titulo="Financeiro pendente" valor={dinheiro(totalPendente)} />

          <div style={box}>
            <h2>Contato com a clínica</h2>
            <p>
              Use este botão para falar diretamente com o Espaço Montessoriano.
            </p>

            <button onClick={abrirWhatsAppClinica} style={botaoWhats}>
              Falar no WhatsApp
            </button>
          </div>
        </div>
      )}

      {aba === 'agenda' && (
        <div style={box}>
          <h2>Agenda do paciente</h2>

          {agenda.length === 0 && (
            <p>Nenhum atendimento agendado no momento.</p>
          )}

          {agenda.map((item) => (
            <div key={item.id} style={card}>
              <h3>{item.servico || 'Atendimento'}</h3>
              <p><strong>Data:</strong> {dataBR(item.data)}</p>
              <p><strong>Horário:</strong> {item.horario || '-'}</p>
              <p><strong>Profissional:</strong> {item.profissionais?.nome || '-'}</p>
              <p><strong>Modalidade:</strong> {item.modalidade || '-'}</p>
              <p><strong>Status:</strong> {item.status || '-'}</p>

              {item.link_videochamada && (
                <a href={item.link_videochamada} target="_blank" style={botaoVideo}>
                  Acessar videochamada
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {aba === 'resumos' && (
        <div style={box}>
          <h2>Resumos das sessões</h2>

          {prontuarios.length === 0 && (
            <p>Nenhum resumo liberado até o momento.</p>
          )}

          {prontuarios.map((item) => (
            <div key={item.id} style={card}>
              <h3>{item.servico || 'Sessão'}</h3>
              <p><strong>Data:</strong> {dataBR(item.data_sessao)}</p>
              <p><strong>Profissional:</strong> {item.profissional_nome || '-'}</p>

              <h4>Resumo para família</h4>
              <p>{item.resumo_familia || '-'}</p>
            </div>
          ))}
        </div>
      )}

      {aba === 'financeiro' && (
        <div style={box}>
          <h2>Financeiro</h2>

          <h3>Total pendente: {dinheiro(totalPendente)}</h3>

          {financeiro.length === 0 && (
            <p>Nenhum lançamento financeiro disponível.</p>
          )}

          {financeiro.map((item) => (
            <div key={item.id} style={card}>
              <h3>{item.servico || item.descricao || 'Lançamento'}</h3>
              <p><strong>Valor:</strong> {dinheiro(item.valor)}</p>
              <p><strong>Vencimento:</strong> {dataBR(item.vencimento)}</p>
              <p><strong>Status:</strong> {item.status || '-'}</p>
              <p><strong>Modalidade:</strong> {item.modalidade || '-'}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Resumo({ titulo, valor }) {
  return (
    <div style={box}>
      <h3>{titulo}</h3>
      <h2>{valor}</h2>
    </div>
  )
}

const pagina = {
  padding: 30,
  fontFamily: 'Arial',
  background: '#f5f7fb',
  minHeight: '100vh'
}

const cabecalho = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 20,
  alignItems: 'center',
  marginBottom: 25
}

const boxPerfil = {
  background: '#fff',
  padding: 25,
  borderRadius: 18,
  display: 'flex',
  gap: 20,
  alignItems: 'center',
  boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
  marginBottom: 25
}

const foto = {
  width: 110,
  height: 110,
  borderRadius: 18,
  objectFit: 'cover'
}

const fotoVazia = {
  width: 110,
  height: 110,
  borderRadius: 18,
  background: '#e2e8f0',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#666'
}

const abas = {
  display: 'flex',
  gap: 10,
  flexWrap: 'wrap',
  marginBottom: 20
}

const abaBotao = {
  padding: 12,
  borderRadius: 12,
  border: '1px solid #ddd',
  background: '#fff',
  cursor: 'pointer',
  fontWeight: 'bold'
}

const abaAtiva = {
  ...abaBotao,
  background: '#0f766e',
  color: '#fff',
  border: 'none'
}

const cards = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: 15
}

const box = {
  background: '#fff',
  padding: 22,
  borderRadius: 16,
  boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
  marginBottom: 20
}

const card = {
  background: '#f8fafc',
  border: '1px solid #e5e7eb',
  padding: 18,
  borderRadius: 14,
  marginTop: 15
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

const botaoWhats = {
  background: '#22c55e',
  color: '#fff',
  border: 'none',
  borderRadius: 12,
  padding: 12,
  cursor: 'pointer',
  fontWeight: 'bold'
}

const botaoVideo = {
  display: 'inline-block',
  background: '#7c3aed',
  color: '#fff',
  borderRadius: 12,
  padding: 12,
  textDecoration: 'none',
  marginTop: 10,
  fontWeight: 'bold'
}
