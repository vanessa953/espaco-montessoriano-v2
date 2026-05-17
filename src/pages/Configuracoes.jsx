import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Configuracoes() {
  const usuario = JSON.parse(
    localStorage.getItem('usuario') || '{}'
  )

  const [salvando, setSalvando] =
    useState(false)

  const [mostrarSenha, setMostrarSenha] =
    useState(false)

  const [form, setForm] = useState({
    nome: '',
    email: '',
    telefone: '',
    login_app: '',
    senha_app: '',
    foto_url: '',

    clinica_nome:
      'Espaço Montessoriano',

    clinica_cnpj: '',
    clinica_pix: '',
    clinica_whatsapp: '',
    clinica_endereco: '',
    clinica_instagram: '',
    clinica_site: '',

    horario_inicio: '08:00',
    horario_fim: '19:00',

    ia_ativa: true,
    resumo_automatico: true,
    relatorio_automatico: true
  })

  useEffect(() => {
    carregarConfiguracoes()
  }, [])

  async function carregarConfiguracoes() {
    if (!usuario?.id) return

    const { data } = await supabase
      .from('profissionais')
      .select('*')
      .eq('id', usuario.id)
      .maybeSingle()

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
    setSalvando(true)

    const { error } = await supabase
      .from('profissionais')
      .update({
        nome: form.nome,
        email: form.email,
        telefone: form.telefone,
        login_app: form.login_app,
        senha_app: form.senha_app,
        foto_url: form.foto_url,

        clinica_nome:
          form.clinica_nome,

        clinica_cnpj:
          form.clinica_cnpj,

        clinica_pix:
          form.clinica_pix,

        clinica_whatsapp:
          form.clinica_whatsapp,

        clinica_endereco:
          form.clinica_endereco,

        clinica_instagram:
          form.clinica_instagram,

        clinica_site:
          form.clinica_site,

        horario_inicio:
          form.horario_inicio,

        horario_fim:
          form.horario_fim,

        ia_ativa: form.ia_ativa,

        resumo_automatico:
          form.resumo_automatico,

        relatorio_automatico:
          form.relatorio_automatico
      })
      .eq('id', usuario.id)

    setSalvando(false)

    if (error) {
      console.log(error)
      alert('Erro ao salvar')
      return
    }

    localStorage.setItem(
      'usuario',
      JSON.stringify({
        ...usuario,
        ...form
      })
    )

    alert(
      'Configurações salvas com sucesso.'
    )
  }

  return (
    <div style={pagina}>
      <h1>Configurações</h1>

      <div style={box}>
        <h2>
          Perfil administrador
        </h2>

        <div style={grid}>
          <input
            placeholder="Nome"
            value={form.nome}
            onChange={(e) =>
              atualizarCampo(
                'nome',
                e.target.value
              )
            }
          />

          <input
            placeholder="E-mail"
            value={form.email}
            onChange={(e) =>
              atualizarCampo(
                'email',
                e.target.value
              )
            }
          />

          <input
            placeholder="Telefone"
            value={form.telefone}
            onChange={(e) =>
              atualizarCampo(
                'telefone',
                e.target.value
              )
            }
          />

          <input
            placeholder="Login"
            value={form.login_app}
            onChange={(e) =>
              atualizarCampo(
                'login_app',
                e.target.value
              )
            }
          />

          <div style={senhaBox}>
            <input
              type={
                mostrarSenha
                  ? 'text'
                  : 'password'
              }
              placeholder="Senha"
              value={form.senha_app}
              onChange={(e) =>
                atualizarCampo(
                  'senha_app',
                  e.target.value
                )
              }
              style={inputSenha}
            />

            <button
              onClick={() =>
                setMostrarSenha(
                  !mostrarSenha
                )
              }
              style={botaoSenha}
            >
              {mostrarSenha
                ? 'Ocultar'
                : 'Mostrar'}
            </button>
          </div>

          <input
            placeholder="URL foto"
            value={form.foto_url}
            onChange={(e) =>
              atualizarCampo(
                'foto_url',
                e.target.value
              )
            }
          />
        </div>
      </div>

      <div style={box}>
        <h2>Clínica</h2>

        <div style={grid}>
          <input
            placeholder="Nome clínica"
            value={form.clinica_nome}
            onChange={(e) =>
              atualizarCampo(
                'clinica_nome',
                e.target.value
              )
            }
          />

          <input
            placeholder="CNPJ"
            value={form.clinica_cnpj}
            onChange={(e) =>
              atualizarCampo(
                'clinica_cnpj',
                e.target.value
              )
            }
          />

          <input
            placeholder="PIX"
            value={form.clinica_pix}
            onChange={(e) =>
              atualizarCampo(
                'clinica_pix',
                e.target.value
              )
            }
          />

          <input
            placeholder="WhatsApp"
            value={
              form.clinica_whatsapp
            }
            onChange={(e) =>
              atualizarCampo(
                'clinica_whatsapp',
                e.target.value
              )
            }
          />

          <input
            placeholder="Instagram"
            value={
              form.clinica_instagram
            }
            onChange={(e) =>
              atualizarCampo(
                'clinica_instagram',
                e.target.value
              )
            }
          />

          <input
            placeholder="Site"
            value={form.clinica_site}
            onChange={(e) =>
              atualizarCampo(
                'clinica_site',
                e.target.value
              )
            }
          />

          <textarea
            placeholder="Endereço"
            value={
              form.clinica_endereco
            }
            onChange={(e) =>
              atualizarCampo(
                'clinica_endereco',
                e.target.value
              )
            }
            style={{
              gridColumn:
                '1 / span 2',
              minHeight: 100
            }}
          />
        </div>
      </div>

      <div style={box}>
        <h2>Agenda</h2>

        <div style={grid}>
          <input
            type="time"
            value={
              form.horario_inicio
            }
            onChange={(e) =>
              atualizarCampo(
                'horario_inicio',
                e.target.value
              )
            }
          />

          <input
            type="time"
            value={form.horario_fim}
            onChange={(e) =>
              atualizarCampo(
                'horario_fim',
                e.target.value
              )
            }
          />
        </div>
      </div>

      <div style={box}>
        <h2>IA</h2>

        <div style={toggleBox}>
          <label>
            <input
              type="checkbox"
              checked={form.ia_ativa}
              onChange={(e) =>
                atualizarCampo(
                  'ia_ativa',
                  e.target.checked
                )
              }
            />{' '}
            IA ativa
          </label>

          <label>
            <input
              type="checkbox"
              checked={
                form.resumo_automatico
              }
              onChange={(e) =>
                atualizarCampo(
                  'resumo_automatico',
                  e.target.checked
                )
              }
            />{' '}
            Resumo família automático
          </label>

          <label>
            <input
              type="checkbox"
              checked={
                form.relatorio_automatico
              }
              onChange={(e) =>
                atualizarCampo(
                  'relatorio_automatico',
                  e.target.checked
                )
              }
            />{' '}
            Relatório IA automático
          </label>
        </div>
      </div>

      <button
        onClick={
          salvarConfiguracoes
        }
        style={botaoSalvar}
      >
        {salvando
          ? 'Salvando...'
          : 'Salvar configurações'}
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
  gap: 15
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
