// ADICIONE ESTES ESTADOS JUNTO AOS OUTROS useState

const [relatorioIA, setRelatorioIA] = useState('')

// ADICIONE ESTE useEffect ABAIXO DOS OUTROS

useEffect(() => {
  gerarRelatorioIA()
}, [agendaMes, despesasMes])

// ADICIONE ESTA FUNÇÃO COMPLETA

function gerarRelatorioIA() {
  const totalPacientes = fechamentoFamilias.length

  const totalProfissionais =
    pagamentoProfissionais.length

  const profissionalMaiorRepasse =
    pagamentoProfissionais.sort(
      (a, b) =>
        b.totalRepasse - a.totalRepasse
    )[0]

  const familiaMaiorFaturamento =
    fechamentoFamilias.sort(
      (a, b) => b.total - a.total
    )[0]

  const despesasAltas =
    resumo.despesas >
    resumo.receitaFamilias * 0.4

  const lucroBaixo =
    resumo.lucroLiquido <
    resumo.receitaFamilias * 0.25

  const texto = `
RELATÓRIO MENSAL INTELIGENTE — ${mes}

VISÃO GERAL

• Total de atendimentos: ${
    resumo.atendimentos
  }

• Total de famílias atendidas: ${totalPacientes}

• Total de profissionais ativos: ${totalProfissionais}

• Receita total das famílias:
${dinheiro(resumo.receitaFamilias)}

• Repasse total profissionais:
${dinheiro(resumo.repasseProfissionais)}

• Despesas gerais:
${dinheiro(resumo.despesas)}

• Lucro bruto:
${dinheiro(resumo.lucroBruto)}

• Lucro líquido:
${dinheiro(resumo.lucroLiquido)}

ANÁLISE AUTOMÁTICA IA

${
  resumo.receitaFamilias > 0
    ? '• Houve movimentação financeira positiva no período.'
    : '• Não houve movimentação financeira significativa.'
}

${
  despesasAltas
    ? '• As despesas estão acima do ideal proporcional para o faturamento atual.'
    : '• As despesas estão controladas proporcionalmente ao faturamento.'
}

${
  lucroBaixo
    ? '• O lucro líquido está abaixo da margem considerada saudável.'
    : '• O lucro líquido está dentro de uma margem saudável.'
}

${
  profissionalMaiorRepasse
    ? `• Profissional com maior repasse:
${profissionalMaiorRepasse.profissional}
(${dinheiro(
        profissionalMaiorRepasse.totalRepasse
      )})`
    : ''
}

${
  familiaMaiorFaturamento
    ? `• Família com maior faturamento:
${familiaMaiorFaturamento.paciente}
(${dinheiro(
        familiaMaiorFaturamento.total
      )})`
    : ''
}

PONTOS DE ATENÇÃO

${
  resumo.despesas >
  resumo.receitaFamilias * 0.5
    ? '• Reduzir despesas fixas e revisar custos operacionais.'
    : '• Estrutura operacional está equilibrada.'
}

${
  resumo.repasseProfissionais >
  resumo.receitaFamilias * 0.65
    ? '• Percentual de repasse elevado. Avaliar margem de lucro dos serviços.'
    : '• Repasses profissionais dentro da margem esperada.'
}

SUGESTÕES IA PARA O PRÓXIMO MÊS

• Acompanhar faltas e cancelamentos recorrentes.
• Priorizar atendimentos com maior margem de lucro.
• Organizar agenda com mais atendimentos em grupo no acompanhamento pedagógico.
• Monitorar crescimento de despesas recorrentes.
• Investir em retenção das famílias atuais.
• Criar previsões financeiras futuras com base na agenda recorrente.
• Revisar serviços com menor rentabilidade.
• Fortalecer confirmação automática por WhatsApp para reduzir faltas.

CONCLUSÃO

O sistema identificou ${
    resumo.lucroLiquido > 0
      ? 'resultado financeiro positivo'
      : 'necessidade de atenção financeira'
  } no período analisado.

A recomendação principal é manter acompanhamento contínuo dos indicadores financeiros e operacionais para crescimento sustentável da clínica.
`

  setRelatorioIA(texto)
}

// AGORA LOCALIZE:

<div style={abas}>

// E ADICIONE ESTE BOTÃO JUNTO DOS OUTROS

<button
  onClick={() => setAba('ia')}
  style={
    aba === 'ia'
      ? abaAtiva
      : abaBotao
  }
>
  Relatório IA
</button>

// AGORA ADICIONE ESTA ABA COMPLETA
// ANTES DO ÚLTIMO </div> PRINCIPAL

{aba === 'ia' && (
  <div style={box}>
    <h2>
      Relatório Mensal Inteligente IA
    </h2>

    <p style={{ color: '#666' }}>
      Análise automática financeira,
      operacional e estratégica do mês.
    </p>

    <textarea
      value={relatorioIA}
      readOnly
      style={{
        width: '100%',
        minHeight: 700,
        marginTop: 20,
        padding: 20,
        borderRadius: 14,
        border: '1px solid #ddd',
        fontSize: 15,
        lineHeight: 1.7,
        background: '#f8fafc'
      }}
    />

    <div style={acoes}>
      <button
        onClick={() => {
          navigator.clipboard.writeText(
            relatorioIA
          )

          alert(
            'Relatório IA copiado.'
          )
        }}
        style={botaoAzul}
      >
        Copiar relatório
      </button>

      <button
        onClick={() => window.print()}
        style={botaoPrincipal}
      >
        Imprimir / PDF
      </button>
    </div>
  </div>
)}
