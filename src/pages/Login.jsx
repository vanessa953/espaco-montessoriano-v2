import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('vanessa@espacomontessoriano.com')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  async function fazerLogin() {
    setErro('')
    setCarregando(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha
    })

    setCarregando(false)

    if (error) {
      setErro('E-mail ou senha inválidos')
      return
    }

    localStorage.setItem('em_session', 'ativo')
    navigate('/dashboard')
  }

  return (
    <div className="loginPage">
      <div className="loginCard">
        <div className="loginHero">
          <h1>Espaço Montessoriano</h1>
          <p>Centro Integrado de Neurodesenvolvimento, Aprendizagem e Inclusão.</p>
          <small>App clínico profissional com Supabase</small>
        </div>

        <div className="loginForm">
          <h2>Acesso ao sistema</h2>
          <p>Entre com seu e-mail e senha cadastrados.</p>

          <label>E-mail</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} />

          <label>Senha</label>
          <div className="passwordBox">
            <input type={mostrarSenha ? 'text' : 'password'} value={senha} onChange={(e) => setSenha(e.target.value)} />
            <button type="button" onClick={() => setMostrarSenha(!mostrarSenha)}>
              {mostrarSenha ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>

          {erro && <div className="error">{erro}</div>}

          <button className="primary" onClick={fazerLogin} disabled={carregando}>
            {carregando ? 'Entrando...' : 'Entrar'}
          </button>
        </div>
      </div>
    </div>
  )
}

        >
          © Espaço Montessoriano
        </div>
      </div>
    </div>
  )
}
