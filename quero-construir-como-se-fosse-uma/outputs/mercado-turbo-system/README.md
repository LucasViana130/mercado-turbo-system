# Mercado Turbo System

Backend Vercel para conectar a extensao Mercado Turbo Analytics ao OAuth do Mercado Livre sem expor `client_secret` no navegador.

## Variaveis na Vercel

Cadastre estas variaveis no projeto da Vercel:

```text
MELI_CLIENT_ID=7264957717671006
MELI_CLIENT_SECRET=seu_secret_do_mercado_livre
MELI_REDIRECT_URI=https://mercado-turbo-system.vercel.app/auth/mercadolivre/callback
```

## URLs

- Iniciar login: `https://mercado-turbo-system.vercel.app/auth/mercadolivre/start`
- Callback cadastrado no Mercado Livre: `https://mercado-turbo-system.vercel.app/auth/mercadolivre/callback`
- Analise usada pela extensao: `https://mercado-turbo-system.vercel.app/api/mercadolivre/analyze?itemId=MLB1234567890`
- Health check: `https://mercado-turbo-system.vercel.app/api/health`
- Config check seguro: `https://mercado-turbo-system.vercel.app/api/config-check`

## Fluxo

1. Acesse `/auth/mercadolivre/start`.
2. Autorize sua conta do Mercado Livre.
3. O callback troca o `code` por token.
4. O backend salva o `refresh_token` em cookie seguro `HttpOnly`.
5. O token nao aparece na tela e nao fica disponivel para JavaScript.
6. A extensao chama `/api/mercadolivre/analyze` ao clicar em "Analisar mercado".

## Seguranca

- O `client_secret` fica somente nas variaveis de ambiente da Vercel.
- O `refresh_token` fica somente em cookie `HttpOnly`, `Secure` e `SameSite=None` no seu navegador.
- O endpoint de analise nao usa `MELI_REFRESH_TOKEN` global. Sem o cookie do navegador autorizado, ele retorna `401`.
- CORS so permite chamadas vindas das paginas do Mercado Livre e do dominio `https://mercado-turbo-system.vercel.app`.

## Observacao importante

O token melhora chamadas autorizadas da sua conta, mas nao revela dados privados dos concorrentes. O ranking dos vendedores concorrentes continua sendo uma estimativa baseada nos dados retornados pela busca publica da categoria.
