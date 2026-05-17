import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Login() {
  const navigate = useNavigate()

  const [tipoAcesso, setTipoAcesso] =
    useState('familia')

  const [login, setLogin] = useState('')
  const [senha, setSenha] = useState('')

  const [carregando, setCarregando] =
    useState(false)

  async function entrar() {
    if (!login || !senha) {
      alert('Preencha login e senha')
      return
    }

    setCarregando(true)

    try {
      if (tipoAcesso === 'profissional') {
        const { data, error } =
          await supabase
            .from('profissionais')
            .select('*')
            .eq('login_app', login)
            .eq('senha_app', senha)
            .maybeSingle()

        if (error || !data) {
          alert('Login inválido')
          setCarregando(false)
          return
        }

        localStorage.setItem(
          'usuario',
          JSON.stringify(data)
        )

        localStorage.setItem(
          'tipo_usuario',
          'profissional'
        )

        navigate('/dashboard')

        return
      }

      const { data, error } =
        await supabase
          .from('pacientes')
          .select('*')
          .eq('login_familia', login)
          .eq('senha_familia', senha)
          .single()

      if (error || !data) {
        alert('Login inválido')
        setCarregando(false)
        return
      }

      localStorage.setItem(
        'usuario',
        JSON.stringify(data)
      )

      localStorage.setItem(
        'tipo_usuario',
        'familia'
      )

      navigate('/familia')
    } catch (err) {
      console.log(err)
      alert('Erro ao entrar')
    }

    setCarregando(false)
  }

  return (
    <div style={pagina}>
      <div style={card}>
        <h1 style={titulo}>
          Espaço Montessoriano
        </h1>

        <p style={subtitulo}>
          Plataforma clínica integrada
        </p>

        <div style={tabs}>
          <button
            onClick={() =>
              setTipoAcesso('familia')
            }
            style={
              tipoAcesso === 'familia'
                ? tabAtiva
                : tab
            }
          >
            Área da Família
          </button>

          <button
            onClick={() =>
              setTipoAcesso(
                'profissional'
              )
            }
            style={
              tipoAcesso ===
              'profissional'
                ? tabAtiva
                : tab
            }
          >
            Área Profissional
          </button>
        </div>

        <div style={boxInfo}>
          {tipoAcesso ===
          'profissional'
            ? 'Acesso exclusivo para equipe clínica e administrativa.'
            : 'Acompanhe agenda, resumos e evolução terapêutica.'}
        </div>

        <div style={form}>
          <input
            placeholder="Login"
            value={login}
            onChange={(e) =>
              setLogin(e.target.value)
            }
            style={input}
          />

          <input
            type="password"
            placeholder="Senha"
            value={senha}
            onChange={(e) =>
              setSenha(e.target.value)
            }
            style={input}
          />

          <button
            onClick={entrar}
            style={botao}
          >
            {carregando
              ? 'Entrando...'
              : 'Entrar'}
          </button>
        </div>
      </div>
    </div>
  )
}

const pagina = {
  minHeight: '100vh',
  background:
    'linear-gradient(135deg, #ecfeff 0%, #f0fdf4 100%)',
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
  boxShadow:
    '0 10px 30px rgba(0,0,0,0.08)'
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
