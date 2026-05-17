import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

export default function Configuracoes() {
  const navigate = useNavigate()
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')

  const [aba, setAba] = useState('perfil')
  const [salvando, setSalvando] = useState(false)
  const [mostrarSenha, setMostrarSenha] = useState(false)

  const [form, setForm] = useState({
    nome: '',
    email: '',
    telefone: '',
    login_app: '',
    senha_app: '',
    foto_url: '',
    nivel_acesso: 'Administradora',

    clinica_nome: 'Espaço Montessoriano',
    clinica_cnpj: '',
    clinica_pix: '',
    clinica_whatsapp: '',
    clinica_endereco: '',
    clinica_instagram: '',
    clinica_site: '',
    logo_url: '',

    dia_vencimento: 5,
    multa_atraso: 0,
    juros_atraso: 0,
    mensagem_cobranca: '',

    horario_inicio: '08:00',
    horario_fim: '19:00',
    dias_funcionamento: 'Segunda a sábado',
    duracao_padrao: 50,

    app_familia_ativo: true,
    familia_ver_agenda: true,
    familia_ver_resumo: true,
    familia_ver_financeiro: true,

    ia_ativa: true,
    resumo_automatico: true,
    relatorio_automatico: true,

    mensagem_confirmacao: '',
    mensagem_resumo_familia: ''
  })

  useEffect(() => {
    carregarConfiguracoes()
  }, [])

  async function carregarConfiguracoes() {
    if (!usuario?.id) return

    const { data, error } = await supabase
      .from('profissionais')
      .select('*')
      .eq('id', usuario.id)
      .maybeSingle()

    if (error) {
      console.log(error)
      return
    }

    if (data) {
      setForm((prev) => ({
        ...prev,
        ...data
      }))
    }
  }

  function atualizarCampo(campo, valor) {
    setForm((prev) => ({
      ...prev,
      [campo]: valor
    }))
  }

  async function salvarConfiguracoes() {
    if (!usuario?.id) {
      alert('Usuário administrador não identificado.')
      return
    }

    setSalvando(true)

    const dados = {
      nome: form.nome,
      email: form.email,
      telefone: form.telefone,
      login_app: form.login_app,
      senha_app: form.senha_app,
      foto_url: form.foto_url,
      nivel_acesso: form.nivel_acesso,

      clinica_nome: form.clinica_nome,
      clinica_cnpj: form.clinica_cnpj,
      clinica_pix: form.clinica_pix,
      clinica_whatsapp: form.clinica_whatsapp,
      clinica_endereco: form.clinica_endereco,
      clinica_instagram: form.clinica_instagram,
      clinica_site: form.clinica_site,
      logo_url: form.logo_url,

      dia_vencimento: Number(form.dia_vencimento || 5),
      multa_atraso: Number(form.multa_atraso || 0),
      juros_atraso: Number(form.juros_atraso || 0),
      mensagem_cobranca: form.mensagem_cobranca,

      horario_inicio: form.horario_inicio,
      horario_fim: form.horario_fim,
      dias_funcionamento: form.dias_funcionamento,
      duracao_padrao: Number(form.duracao_padrao || 50),

      app_familia_ativo: form.app_familia_ativo,
      familia_ver_agenda: form.familia_ver_agenda,
      familia_ver_resumo: form.familia_ver_resumo,
      familia_ver_financeiro: form.familia_ver_financeiro,

      ia_ativa: form.ia_ativa,
      resumo_automatico: form.resumo_automatico,
      relatorio_automatico: form.relatorio_automatico,

      mensagem_confirmacao: form.mensagem_confirmacao,
      mensagem_resumo_familia: form.mensagem_resumo_familia
    }

    const { error } = await supabase
      .from('profissionais')
      .update(dados)
      .eq('id', usuario.id)

    setSalvando(false)

    if (error) {
      console.log(error)
      alert('Erro ao salvar configurações.')
      return
    }

    localStorage.setItem('usuario', JSON.stringify({ ...usuario, ...dados }))
    alert('Configurações salvas com sucesso.')
  }

  function sair() {
    localStorage.removeItem('em_session')
    localStorage.removeItem('usuario')
    localStorage.removeItem('tipo_usuario')
    navigate('/')
  }

  return (
    <div style={pagina}>
      <h1>Configurações Administrativas</h1>

      <p style={{ color: '#666', marginBottom: 25 }}>
        Controle geral do sistema, clínica, financeiro, app família, IA, WhatsApp e segurança.
      </p>

      <div style={abas}>
        <button onClick={() => setAba('perfil')} style={aba === 'perfil' ? abaAtiva : abaBotao}>Perfil</button>
        <button onClick={() => setAba('clinica')} style={aba === 'clinica' ? abaAtiva : abaBotao}>Clínica</button>
        <button onClick={() => setAba('financeiro')} style={aba === 'financeiro' ? abaAtiva : abaBotao}>Financeiro</button>
        <button onClick={() => setAba('agenda')} style={aba === 'agenda' ? abaAtiva : abaBotao}>Agenda</button>
        <button onClick={() => setAba('familia')} style={aba === 'familia' ? abaAtiva : abaBotao}>App Família</button>
        <button onClick={() => setAba('ia')} style={aba === 'ia' ? abaAtiva : abaBotao}>IA</button>
        <button onClick={() => setAba('whatsapp')} style={aba === 'whatsapp' ? abaAtiva : abaBotao}>WhatsApp</button>
        <button onClick={() => setAba('seguranca')} style={aba === 'seguranca' ? abaAtiva : abaBotao}>Segurança</button>
      </div>

      {aba === 'perfil' && (
        <div style={box}>
          <h2>Perfil administrador</h2>

          <div style={grid}>
            <input placeholder="Nome" value={form.nome || ''} onChange={(e) => atualizarCampo('nome', e.target.value)} />
            <input placeholder="E-mail" value={form.email || ''} onChange={(e) => atualizarCampo('email', e.target.value)} />
            <input placeholder="Telefone" value={form.telefone || ''} onChange={(e) => atualizarCampo('telefone', e.target.value)} />
            <input placeholder="Login" value={form.login_app || ''} onChange={(e) => atualizarCampo('login_app', e.target.value)} />

            <div style={senhaBox}>
              <input
                type={mostrarSenha ? 'text' : 'password'}
                placeholder="Senha"
                value={form.senha_app || ''}
                onChange={(e) => atualizarCampo('senha_app', e.target.value)}
                style={inputSenha}
              />
              <button type="button" onClick={() => setMostrarSenha(!mostrarSenha)} style={botaoSenha}>
                {mostrarSenha ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>

            <select value={form.nivel_acesso || 'Administradora'} onChange={(e) => atualizarCampo('nivel_acesso', e.target.value)}>
              <option>Administradora</option>
              <option>Coordenação</option>
              <option>Financeiro</option>
              <option>Recepção</option>
              <option>Supervisor</option>
              <option>Terapeuta</option>
            </select>

            <input placeholder="URL da foto/avatar" value={form.foto_url || ''} onChange={(e) => atualizarCampo('foto_url', e.target.value)} />
          </div>
        </div>
      )}

      {aba === 'clinica' && (
        <div style={box}>
          <h2>Dados da clínica</h2>

          <div style={grid}>
            <input placeholder="Nome da clínica" value={form.clinica_nome || ''} onChange={(e) => atualizarCampo('clinica_nome', e.target.value)} />
            <input placeholder="CNPJ" value={form.clinica_cnpj || ''} onChange={(e) => atualizarCampo('clinica_cnpj', e.target.value)} />
            <input placeholder="PIX" value={form.clinica_pix || ''} onChange={(e) => atualizarCampo('clinica_pix', e.target.value)} />
            <input placeholder="WhatsApp da clínica" value={form.clinica_whatsapp || ''} onChange={(e) => atualizarCampo('clinica_whatsapp', e.target.value)} />
            <input placeholder="Instagram" value={form.clinica_instagram || ''} onChange={(e) => atualizarCampo('clinica_instagram', e.target.value)} />
            <input placeholder="Site" value={form.clinica_site || ''} onChange={(e) => atualizarCampo('clinica_site', e.target.value)} />
            <input placeholder="URL da logo" value={form.logo_url || ''} onChange={(e) => atualizarCampo('logo_url', e.target.value)} />

            <textarea
              placeholder="Endereço completo"
              value={form.clinica_endereco || ''}
              onChange={(e) => atualizarCampo('clinica_endereco', e.target.value)}
              style={{ gridColumn: '1 / span 2', minHeight: 100 }}
            />
          </div>
        </div>
      )}

      {aba === 'financeiro' && (
        <div style={box}>
          <div style={box}>
  <h2>Configurações financeiras</h2>

  <p style={descricao}>
    Configure regras automáticas de cobrança,
    vencimento e mensagens enviadas às famílias.
  </p>

  <div style={grid}>
    <div>
      <label style={label}>
        Dia padrão de vencimento
      </label>

      <small style={small}>
        Exemplo: 5 = pagamento até dia 5.
      </small>

      <input
        type="number"
        value={form.dia_vencimento || 5}
        onChange={(e) =>
          atualizarCampo(
            'dia_vencimento',
            e.target.value
          )
        }
      />
    </div>

    <div>
      <label style={label}>
        Multa por atraso (%)
      </label>

      <small style={small}>
        Multa fixa aplicada após vencimento.
      </small>

      <input
        type="number"
        value={form.multa_atraso || 0}
        onChange={(e) =>
          atualizarCampo(
            'multa_atraso',
            e.target.value
          )
        }
      />
    </div>

    <div>
      <label style={label}>
        Juros mensal (%)
      </label>

      <small style={small}>
        Juros aplicados em caso de atraso.
      </small>

      <input
        type="number"
        value={form.juros_atraso || 0}
        onChange={(e) =>
          atualizarCampo(
            'juros_atraso',
            e.target.value
          )
        }
      />
    </div>
  </div>

  <div style={{ marginTop: 20 }}>
    <label style={label}>
      Mensagem padrão de cobrança
    </label>

    <small style={small}>
      Texto automático enviado para as famílias
      junto ao fechamento mensal.
    </small>

    <textarea
      placeholder="Digite a mensagem padrão"
      value={form.mensagem_cobranca || ''}
      onChange={(e) =>
        atualizarCampo(
          'mensagem_cobranca',
          e.target.value
        )
      }
      style={textarea}
    />
  </div>
</div>
          <h2>Configurações da agenda</h2>

          <div style={grid}>
            <input type="time" value={form.horario_inicio || '08:00'} onChange={(e) => atualizarCampo('horario_inicio', e.target.value)} />
            <input type="time" value={form.horario_fim || '19:00'} onChange={(e) => atualizarCampo('horario_fim', e.target.value)} />
            <input placeholder="Dias de funcionamento" value={form.dias_funcionamento || ''} onChange={(e) => atualizarCampo('dias_funcionamento', e.target.value)} />
            <input type="number" placeholder="Duração padrão em minutos" value={form.duracao_padrao || 50} onChange={(e) => atualizarCampo('duracao_padrao', e.target.value)} />
          </div>
        </div>
      )}

      {aba === 'familia' && (
        <div style={box}>
          <h2>App Família</h2>

          <div style={toggleBox}>
            <label><input type="checkbox" checked={!!form.app_familia_ativo} onChange={(e) => atualizarCampo('app_familia_ativo', e.target.checked)} /> App Família ativo</label>
            <label><input type="checkbox" checked={!!form.familia_ver_agenda} onChange={(e) => atualizarCampo('familia_ver_agenda', e.target.checked)} /> Família pode ver agenda</label>
            <label><input type="checkbox" checked={!!form.familia_ver_resumo} onChange={(e) => atualizarCampo('familia_ver_resumo', e.target.checked)} /> Família pode ver resumo da sessão</label>
            <label><input type="checkbox" checked={!!form.familia_ver_financeiro} onChange={(e) => atualizarCampo('familia_ver_financeiro', e.target.checked)} /> Família pode ver financeiro</label>
          </div>
        </div>
      )}

      {aba === 'ia' && (
        <div style={box}>
          <h2>Inteligência Artificial</h2>

          <div style={toggleBox}>
            <label><input type="checkbox" checked={!!form.ia_ativa} onChange={(e) => atualizarCampo('ia_ativa', e.target.checked)} /> IA ativa no sistema</label>
            <label><input type="checkbox" checked={!!form.resumo_automatico} onChange={(e) => atualizarCampo('resumo_automatico', e.target.checked)} /> Resumo família automático</label>
            <label><input type="checkbox" checked={!!form.relatorio_automatico} onChange={(e) => atualizarCampo('relatorio_automatico', e.target.checked)} /> Relatório mensal inteligente automático</label>
          </div>
        </div>
      )}

      {aba === 'whatsapp' && (
        <div style={box}>
          <h2>Modelos de WhatsApp</h2>

          <textarea
            placeholder="Mensagem de confirmação de atendimento"
            value={form.mensagem_confirmacao || ''}
            onChange={(e) => atualizarCampo('mensagem_confirmacao', e.target.value)}
            style={textarea}
          />

          <textarea
            placeholder="Mensagem de resumo para família"
            value={form.mensagem_resumo_familia || ''}
            onChange={(e) => atualizarCampo('mensagem_resumo_familia', e.target.value)}
            style={textarea}
          />

          <textarea
            placeholder="Mensagem de cobrança"
            value={form.mensagem_cobranca || ''}
            onChange={(e) => atualizarCampo('mensagem_cobranca', e.target.value)}
            style={textarea}
          />
        </div>
      )}

      {aba === 'seguranca' && (
        <div style={box}>
          <h2>Segurança e sessão</h2>

          <p><strong>Usuário atual:</strong> {form.nome || '-'}</p>
          <p><strong>Nível de acesso:</strong> {form.nivel_acesso || '-'}</p>

          <button onClick={sair} style={botaoSair}>
            Sair do sistema
          </button>
        </div>
      )}

      <button onClick={salvarConfiguracoes} style={botaoSalvar}>
        {salvando ? 'Salvando...' : 'Salvar configurações'}
      </button>
    </div>
  )
}

const pagina = {
  padding: 30,
  background: '#f5f7fb',
  minHeight: '100vh',
  fontFamily: 'Arial'
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

const senhaBox = {
  display: 'flex',
  gap: 10
}

const inputSenha = {
  flex: 1
}

const botaoSenha = {
  background: '#e2e8f0',
  border: 'none',
  padding: '10px 14px',
  borderRadius: 10,
  cursor: 'pointer',
  fontWeight: 'bold'
}

const toggleBox = {
  display: 'grid',
  gap: 15,
  fontSize: 16
}

const textarea = {
  width: '100%',
  minHeight: 140,
  marginBottom: 15,
  padding: 14,
  borderRadius: 10,
  border: '1px solid #ccc'
}

const botaoSalvar = {
  background: '#0f766e',
  color: '#fff',
  border: 'none',
  padding: 16,
  borderRadius: 14,
  cursor: 'pointer',
  fontWeight: 'bold',
  fontSize: 16
}

const botaoSair = {
  background: '#dc2626',
  color: '#fff',
  border: 'none',
  padding: 14,
  borderRadius: 12,
  cursor: 'pointer',
  fontWeight: 'bold'
}
const label = {
  display: 'block',
  fontWeight: 'bold',
  marginBottom: 6
}

const small = {
  display: 'block',
  color: '#666',
  marginBottom: 8,
  fontSize: 13
}

const descricao = {
  color: '#666',
  marginBottom: 20
}
