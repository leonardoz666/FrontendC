# FrontendC

Aplicação operacional desktop do ControlaÊ, construída com Next.js 15 e React 19.

## Ativação da instalação

No primeiro acesso, o middleware bloqueia todas as telas e envia o usuário para `/instalacao`. O responsável informa:

1. a URL HTTPS da API do BackendC;
2. o código temporário gerado no Painel ControlaÊ.

O código expira em 15 minutos. Depois da validação, o FrontendC guarda um vínculo criptografado em cookie `httpOnly`; o código digitado não é persistido. A URL e o tenant usados pelo proxy vêm exclusivamente desse vínculo.

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
