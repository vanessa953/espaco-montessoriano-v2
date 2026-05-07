import { useState } from 'react'

export default function Login() {
  const [mostrarSenha, setMostrarSenha] = useState(false)

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: '#0f7f68'
      }}
    >
      <div
        style={{
          background: 'white',
          padding: '40px',
          borderRadius: '20px',
          width: '350px',
          display: 'flex',
          flexDirection: 'column',
          gap: '15px'
        }}
      >
        <h2>Espaço Montessoriano</h2>

        <input
          type="email"
          placeholder="E-mail"
          style={{
            padding: '12px',
            borderRadius: '10px',
            border: '1px solid #ccc'
          }}
        />

        <input
          type={mostrarSenha ? 'text' : 'password'}
          placeholder="Senha"
          style={{
            padding: '12px',
            borderRadius: '10px',
            border: '1px solid #ccc'
          }}
        />

        <button
          onClick={() => setMostrarSenha(!mostrarSenha)}
          style={{
            padding: '10px',
            borderRadius: '10px',
            border: 'none',
            background: '#ddd'
          }}
        >
          {mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
        </button>

        <button
          style={{
            padding: '14px',
            borderRadius: '10px',
            border: 'none',
            background: '#0f7f68',
            color: 'white',
            fontWeight: 'bold'
          }}
        >
          Entrar
        </button>
      </div>
    </div>
  )
}
