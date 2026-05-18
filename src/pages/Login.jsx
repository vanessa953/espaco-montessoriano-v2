import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [tipoAcesso, setTipoAcesso] = useState('familia')
  const [login, setLogin] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [carregando, setCarregando] = useState(false)

  async function buscarProfissional(loginLimpo, senhaLimpa) {
    let resultado = await supabase
      .from('profissionais')
      .select('*')
      .eq('login_app', loginLimpo)
      .eq('senha_app', senhaLimpa)
      .maybeSingle()

    if (resultado.data) return resultado

    resultado = await supabase
      .from('profissionais')
      .select('*')
      .eq('email', loginLimpo)
      .eq('senha_app', senhaLimpa)
      .maybeSingle()

    return resultado
  }

  async function buscarFamilia(loginLimpo, senhaLimpa) {
    let resultado = await supabase
      .from('pacientes')
      .select('*')
      .eq('login_familia', loginLimpo)
      .eq('senha_familia', senhaLimpa)
      .maybeSingle()

    if (resultado.data) return resultado

    resultado = await supabase
      .from('pacientes')
      .select('*')
      .eq('email', loginLimpo)
      .eq('senha_familia', senhaLimpa)
      .maybeSingle()

    return resultado
  }

  async function entrar() {
    const loginLimpo = login.trim()
    const senhaLimpa = senha.trim()

    if (!loginLimpo || !senhaLimpa) {
      alert('Preencha login e senha.')
      return
    }

    setCarregando(true)

    try {
      if (tipoAcesso === 'profissional') {
        const { data, error } = await buscarProfissional(loginLimpo, senhaLimpa)

        if (error) {
          console.log('Erro Supabase profissional:', error)
          alert('Erro ao consultar profissional. Veja o console.')
          setCarregando(false)
          return
        }

        if (!data) {
          alert('Login ou senha do profissional inválidos.')
          setCarregando(false)
          return
        }

        if (data.ativo === false) {
          alert('Usuário profissional inativo.')
          setCarregando(false)
          return
        }

        localStorage.clear()
        localStorage.setItem('em_session', 'ativo')
        localStorage.setItem('tipo_usuario', 'profissional')
        localStorage.setItem('usuario', JSON.stringify(data))

        window.location.href = '/dashboard'
        return
      }

      const { data, error } = await buscarFamilia(loginLimpo, senhaLimpa)

      if (error) {
        console.log('Erro Supabase família:', error)
        alert('Erro ao consultar família. Veja o console.')
        setCarregando(false)
        return
      }

      if (!data) {
        alert('Login ou senha da família inválidos.')
        setCarregando(false)
        return
      }

      localStorage.clear()
      localStorage.setItem('em_session', 'ativo')
      localStorage.setItem('tipo_usuario', 'familia')
      localStorage.setItem('usuario', JSON.stringify(data))

      window.location.href = '/familia'
    } catch (err) {
      console.log('Erro geral login:', err)
      alert('Erro ao entrar. Veja o console.')
    }

    setCarregando(false)
  }

  return (
    <div style={pagina}>
      <div style={card}>
        <h1 style={titulo}>Espaço Montessoriano</h1>

        <p style={subtitulo}>Plataforma clínica integrada</p>

        <div style={tabs}>
          <button
            onClick={() => setTipoAcesso('familia')}
            style={tipoAcesso === 'familia' ? tabAtiva : tab}
          >
            Área da Família
          </button>

          <button
            onClick={() => setTipoAcesso('profissional')}
            style={tipoAcesso === 'profissional' ? tabAtiva : tab}
          >
            Área Profissional
          </button>
        </div>

        <div style={boxInfo}>
          {tipoAcesso === 'profissional'
            ? 'Acesso exclusivo para equipe clínica e administrativa.'
            : 'Acompanhe agenda, resumos e evolução terapêutica.'}
        </div>

        <div style={form}>
          <input
            placeholder="Login ou e-mail"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') entrar()
            }}
            style={input}
          />

          <div style={senhaBox}>
            <input
              type={mostrarSenha ? 'text' : 'password'}
              placeholder="Senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') entrar()
              }}
              style={inputSenha}
            />

            <button
              type="button"
              onClick={() => setMostrarSenha(!mostrarSenha)}
              style={botaoSenha}
            >
              {mostrarSenha ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>

          <button onClick={entrar} style={botao}>
            {carregando ? 'Entrando...' : 'Entrar'}
          </button>
        </div>
      </div>
    </div>
  )
}

const pagina = {
  minHeight: '100vh',
  background: 'linear-gradient(135deg, #ecfeff 0%, #f0fdf4 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 20,
  fontFamily: 'Arial'
}

const card = {
  width: '100%',
  maxWidth: 460,
  background: '#fff',
  borderRadius: 24,
  padding: 40,
  boxShadow: '0 10px 30px rgba(0,0,0,0.08)'
}

const titulo = {
  margin: 0,
  fontSize: 34,
  color: '#0f766e',
  textAlign: 'center'
}

const subtitulo = {
  textAlign: 'center',
  color: '#666',
  marginTop: 10,
  marginBottom: 30
}

const tabs = {
  display: 'flex',
  gap: 10,
  marginBottom: 20
}

const tab = {
  flex: 1,
  padding: 14,
  borderRadius: 12,
  border: '1px solid #ddd',
  background: '#fff',
  cursor: 'pointer',
  fontWeight: 'bold'
}

const tabAtiva = {
  ...tab,
  background: '#0f766e',
  color: '#fff',
  border: 'none'
}

const boxInfo = {
  background: '#f8fafc',
  padding: 15,
  borderRadius: 14,
  color: '#555',
  marginBottom: 20,
  fontSize: 14,
  lineHeight: 1.5
}

const form = {
  display: 'grid',
  gap: 15
}

const input = {
  padding: 15,
  borderRadius: 12,
  border: '1px solid #ccc',
  fontSize: 15
}

const senhaBox = {
  display: 'flex',
  gap: 10,
  alignItems: 'center'
}

const inputSenha = {
  flex: 1,
  padding: 15,
  borderRadius: 12,
  border: '1px solid #ccc',
  fontSize: 15
}

const botaoSenha = {
  background: '#e2e8f0',
  border: 'none',
  padding: '15px 16px',
  borderRadius: 12,
  cursor: 'pointer',
  fontWeight: 'bold'
}

const botao = {
  background: '#0f766e',
  color: '#fff',
  border: 'none',
  borderRadius: 12,
  padding: 16,
  cursor: 'pointer',
  fontWeight: 'bold',
  fontSize: 16
}
