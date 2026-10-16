# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Funcionários e responsáveis de restaurantes usam o FrontendC em computadores do estabelecimento. A ativação inicial pode ser feita por uma pessoa sem conhecimento técnico avançado.

## Product Purpose

O FrontendC é a aplicação operacional desktop do ControlaÊ. Antes do primeiro uso, cada instalação precisa ser vinculada à API e ao estabelecimento corretos; o sucesso da ativação é identificar o estabelecimento e liberar o login operacional.

## Operating Context

O programa é instalado em um computador do restaurante. No primeiro acesso, o instalador informa a URL HTTPS exclusiva daquele estabelecimento e um código de ativação temporário gerado no Painel ControlaÊ. Depois da validação, o vínculo fica armazenado localmente e não precisa ser digitado novamente.

## Capabilities and Constraints

- Não existe API, tenant, login ou senha padrão.
- Nenhuma tela operacional pode aparecer antes de uma ativação válida.
- O código de ativação é temporário e não é armazenado depois do uso.
- A URL configurada deve usar HTTPS em produção; HTTP é aceito somente em desenvolvimento local.
- Credenciais operacionais continuam sendo exigidas depois da ativação.

## Brand Commitments

O nome do produto é ControlaÊ. Cada restaurante mantém sua própria identidade visual depois que a instalação identifica o estabelecimento.

## Product Principles

- Vínculo explícito antes de qualquer operação.
- Segurança compreensível para quem instala.
- Um estabelecimento por instalação ativa.
- Erros devem dizer o que corrigir, sem expor detalhes sensíveis.
