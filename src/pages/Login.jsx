import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
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

window.location.href = '/'
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #0f766e, #115e59)',
        fontFamily: 'Arial'
      }}
    >
      <div
        style={{
          background: 'white',
          padding: '40px',
          borderRadius: '25px',
          width: '380px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1
            style={{
              color: '#0f766e',
              marginBottom: '10px'
            }}
          >
            Espaço Montessoriano
          </h1>

          <p
            style={{
              color: '#666',
              fontSize: '14px'
            }}
          >
            Sistema Clínico Integrado
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '15px'
          }}
        >
          <input
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              padding: '14px',
              borderRadius: '12px',
              border: '1px solid #ccc',
              fontSize: '15px'
            }}
          />

          <div style={{ position: 'relative' }}>
            <input
              type={mostrarSenha ? 'text' : 'password'}
              placeholder="Senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              style={{
                padding: '14px',
                borderRadius: '12px',
                border: '1px solid #ccc',
                width: '100%',
                fontSize: '15px'
              }}
            />

            <button
              onClick={() => setMostrarSenha(!mostrarSenha)}
              style={{
                position: 'absolute',
                right: '10px',
                top: '10px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                color: '#0f766e'
              }}
            >
              {mostrarSenha ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>

          {erro && (
            <div
              style={{
                background: '#fee2e2',
                color: '#b91c1c',
                padding: '10px',
                borderRadius: '10px',
                fontSize: '14px'
              }}
            >
              {erro}
            </div>
          )}

          <button
            onClick={fazerLogin}
            disabled={carregando}
            style={{
              padding: '14px',
              borderRadius: '12px',
              border: 'none',
              background: '#0f766e',
              color: 'white',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '15px'
            }}
          >
            {carregando ? 'Entrando...' : 'Entrar'}
          </button>
        </div>

        <div
          style={{
            marginTop: '25px',
            textAlign: 'center',
            fontSize: '13px',
            color: '#777'
          }}
        >
          © Espaço Montessoriano
        </div>
      </div>
    </div>
  )
}
