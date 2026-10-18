# FrontendC

Aplicação operacional desktop do ControlaÊ, construída com Next.js 15 e React 19.

## Ativação da instalação

No primeiro acesso, o middleware bloqueia todas as telas e envia o usuário para `/instalacao`. O responsável informa:

1. a URL HTTPS da API do BackendC;
2. o código temporário gerado no Painel ControlaÊ.

O código expira em 15 minutos. Depois da validação, o FrontendC guarda um vínculo criptografado em cookie `httpOnly`; o código digitado não é persistido. A URL e o tenant usados pelo proxy vêm exclusivamente desse vínculo.

Cada estabelecimento possui seu próprio vínculo e sua própria sessão. O mesmo navegador pode manter vários restaurantes ativados simultaneamente; cada aba seleciona o tenant pelo link `/e/<slug>` sem compartilhar login, cache ou arquivos com as outras.

Depois da ativação, o slug permanece visível em todas as páginas operacionais. A entrada `/e/<slug>` continua sendo o link distribuído pelo Painel, enquanto a navegação usa URLs canônicas como `/e/<slug>/login`, `/e/<slug>/inicio` e `/e/<slug>/admin/produtos`. O middleware reescreve essas URLs para as páginas internas compartilhadas sem duplicar a aplicação. Endereços antigos sem o prefixo são redirecionados para a forma canônica quando o vínculo do estabelecimento pode ser identificado.

Configure `FRONTEND_INSTALLATION_SECRET` com pelo menos 32 caracteres no ambiente que executará o aplicativo. Distribuições diferentes devem usar segredos diferentes.

## Desenvolvimento

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`. Em desenvolvimento, a tela aceita uma API em `http://localhost`; qualquer outro endereço precisa usar HTTPS.

## Verificação

```bash
npm run typecheck
npm run build
npm run test:ci
```
