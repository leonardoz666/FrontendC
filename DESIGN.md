---
name: ControlaÊ
description: Gestão de restaurantes com uma interface operacional clara, firme e adaptável à marca de cada estabelecimento.
colors:
  controlae-orange: "#ea580c"
  controlae-orange-bright: "#f97316"
  operational-navy: "#0f172a"
  installation-navy: "#172033"
  canvas: "#ffffff"
  warm-canvas: "#f4f1ea"
  ink: "#171717"
  border: "#d1d5db"
  navigation-surface: "#e9f0f7"
  navigation-muted: "#3f4b5a"
typography:
  display:
    fontFamily: "Geist, Segoe UI, sans-serif"
    fontSize: "clamp(2.4rem, 5vw, 5.4rem)"
    fontWeight: 900
    lineHeight: 0.98
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Geist, Segoe UI, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Geist, Segoe UI, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.75
  label:
    fontFamily: "Geist, Segoe UI, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 700
    lineHeight: 1.25
rounded:
  control: "8px"
  field: "12px"
  surface: "16px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
scale:
  interface: "1.1"
components:
  button-primary:
    backgroundColor: "{colors.controlae-orange}"
    textColor: "{colors.canvas}"
    typography: "{typography.label}"
    rounded: "{rounded.field}"
    padding: "16px 24px"
    height: "56px"
  input:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.operational-navy}"
    typography: "{typography.body}"
    rounded: "{rounded.field}"
    padding: "0 16px"
    height: "56px"
  card:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.operational-navy}"
    rounded: "{rounded.surface}"
    padding: "24px"
---

# Design System: ControlaÊ

## Overview

**Creative North Star: "Confiança operacional acolhedora"**

O ControlaÊ combina a precisão exigida por uma operação de restaurante com uma presença humana e direta. A base é clara e funcional; a personalidade aparece no contraste entre azul-marinho e laranja, na tipografia firme e em detalhes de profundidade contidos.

A marca do estabelecimento pode substituir os tokens de identidade dentro da aplicação operacional. As telas anteriores à resolução do tenant — como instalação e ativação — usam exclusivamente a identidade neutra ControlaÊ.

**Key Characteristics:**

- Hierarquia forte e leitura rápida em ambientes de trabalho.
- Laranja reservado a ação, seleção e foco.
- Superfícies claras, controles generosos e estados explícitos.
- Cantos suavemente arredondados, sem aparência infantil.

## Colors

A paleta une um laranja energético a azuis profundos e superfícies claras; cores semânticas permanecem reservadas a sucesso, atenção, informação e perigo.

### Primary

- **Laranja ControlaÊ:** ação primária, foco e pequenos acentos de marca.
- **Laranja Vivo:** seleção ativa na navegação, cursor e detalhes de apoio; não compete com a ação principal.

### Secondary

- **Azul Operacional:** texto de alta ênfase, navegação e contraste institucional.
- **Azul de Instalação:** grandes campos de marca em superfícies anteriores ao tenant.

### Neutral

- **Tela Clara:** plano padrão e fundo de controles.
- **Tela Quente:** fundo especial da ativação, mantendo leitura confortável.
- **Tinta:** texto global quando não há token de tenant aplicado.
- **Borda:** separação discreta de controles e cartões.

**The One Orange Rule.** O laranja indica ação, seleção ou foco; não deve virar preenchimento decorativo dominante.

## Typography

**Display Font:** Geist (com Segoe UI e sans-serif como fallback)  
**Body Font:** Geist (com Segoe UI e sans-serif como fallback)

**Character:** Uma única família geométrica mantém velocidade de leitura. Pesos extrafortes sustentam títulos; corpo e instruções preservam espaçamento e contraste para uso prolongado.

### Hierarchy

- **Display:** peso 900, escala fluida e entrelinha compacta; apenas promessas ou estados de primeira ordem.
- **Headline:** peso 800; títulos de páginas, painéis e modais.
- **Body:** peso 400, 15px e entrelinha aberta; instruções e conteúdo operacional.
- **Label:** peso 700, 14px; rótulos, botões e navegação.

**The Functional Floor Rule.** Texto funcional nunca fica abaixo de 11px; instruções e metadados preferem 13px ou mais.

## Layout

O ritmo base usa passos de 8, 12, 16, 24 e 32px. Cabeçalhos e barras operacionais são densos, mas alvos interativos preservam ao menos 40px de altura; formulários centrais usam 48–56px. Conteúdo longo fica em contêineres limitados e alinhados à grade.

No desktop, fluxos de primeira utilização podem dividir contexto e ação em duas colunas. Em telas compactas, o contexto vira uma faixa curta e a tarefa aparece no primeiro viewport. Navegação lateral e cabeçalhos se adaptam sem introduzir rolagem horizontal.

A interface usa escala global de 1.1 para que o tamanho padrão do navegador tenha a mesma presença visual de 110% de zoom. A largura mínima lógica e os breakpoints do Tailwind são compensados pela mesma razão, preservando o suporte visual a telas de 320px e fazendo o reflow acontecer nos mesmos pontos do zoom real.

## Elevation & Depth

A interface é plana por padrão. Bordas e mudanças tonais organizam a maior parte da hierarquia; sombras pequenas separam cabeçalhos, cartões e controles, enquanto sombras maiores ficam restritas a diálogos ou ações temporariamente elevadas.

**The Flat-by-Default Rule.** Sombra comunica camada ou resposta de interação, nunca enfeite permanente.

## Shapes

Controles usam cantos de 8px, campos e cartões operacionais usam 12px e superfícies especiais ou modais chegam a 16px. Círculos são reservados a avatares, indicadores e botões flutuantes. Bordas são finas e neutras; seleção pode reforçá-las com a cor primária.

## Components

### Buttons

- **Shape:** canto gentil de campo (12px) nas ações dominantes e 8px nos controles compactos.
- **Primary:** laranja, texto branco em negrito, altura de 48–56px conforme o contexto.
- **Hover / Focus:** escurecimento controlado; foco visível com anel laranja e offset.
- **Disabled:** mantém rótulo legível e remove elevação; nunca depende apenas de opacidade extrema.

### Cards / Containers

- **Corner Style:** 12–16px.
- **Background:** branco sobre tela clara ou quente.
- **Shadow Strategy:** sombra baixa em repouso; maior apenas em modal ou hover significativo.
- **Border:** cinza claro quando a separação tonal não basta.
- **Internal Padding:** 16–32px conforme densidade e viewport.

### Inputs / Fields

- **Style:** fundo branco, borda neutra, 12px de raio e rótulo externo explícito.
- **Focus:** borda laranja e anel suave de quatro pixels.
- **Error / Disabled:** estado textual explícito; placeholders mantêm contraste legível.

### Navigation

Itens ativos usam a cor de destaque sólida e texto de contraste calculado. Itens inativos permanecem claros, com texto derivado da superfície e hover tonal. A marca compacta usa o monograma ou logo do tenant quando ele já foi resolvido.

A superfície da barra lateral usa a cor de navegação configurada no Painel CEO. Cabeçalho, rodapé e divisórias são tons derivados automaticamente dessa base para preservar hierarquia e contraste.

Os títulos dos grupos de navegação usam 13px, peso 700 e um tom secundário de alto contraste derivado da superfície. Setas acompanham a mesma cor para que rótulo e ação sejam percebidos como um único controle.

O acesso ao Dashboard permanece em caixa normal e funciona como âncora da navegação: quando ativo, recebe superfície de destaque, contorno interno e sombra curta. Uma divisória o separa dos grupos, cujas setas ocupam pequenos campos tonais; grupos ativos ganham profundidade discreta sem transformar toda a barra em uma pilha de cartões.

Categorias consecutivas são separadas por linhas finas e recuadas, derivadas da borda da navegação. O respiro fica distribuído ao redor dessas linhas para explicitar os agrupamentos sem competir com o estado ativo.

## Do's and Don'ts

### Do:

- **Do** manter uma única ação primária clara por bloco de decisão.
- **Do** mostrar carregamento, erro, confirmação e sucesso como estados distintos.
- **Do** usar a marca neutra ControlaÊ antes de qualquer tenant ser validado.
- **Do** preservar contraste e alvos confortáveis em computadores e celulares operacionais.

### Don't:

- **Don't** usar a identidade de um restaurante como fallback universal.
- **Don't** liberar tela operacional enquanto a instalação ou o tenant não estiverem validados.
- **Don't** usar texto funcional minúsculo, placeholder pálido ou cor como único indicador de estado.
- **Don't** empilhar cartões, gradientes e sombras sem necessidade funcional.
