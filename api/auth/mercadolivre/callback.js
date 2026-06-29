const { exchangeCodeForToken } = require("../../_shared/meli");
const { htmlPage, setRefreshTokenCookie } = require("../../_shared/http");

module.exports = async function handler(req, res) {
  const { code, error, error_description: errorDescription } = req.query || {};

  if (error) {
    res.status(400).send(
      htmlPage(
        "Autorizacao recusada",
        `<h1>Autorizacao recusada</h1><p>${errorDescription || error}</p>`
      )
    );
    return;
  }

  if (!code) {
    res.status(400).send(htmlPage("Code ausente", "<h1>Code ausente</h1><p>O Mercado Livre nao enviou o parametro code.</p>"));
    return;
  }

  try {
    const token = await exchangeCodeForToken(code);
    setRefreshTokenCookie(res, token.refresh_token);
    res.status(200).send(
      htmlPage(
        "Mercado Livre conectado",
        `<h1>Mercado Livre conectado</h1>
        <p>Seu navegador recebeu um cookie seguro <code>HttpOnly</code> para a extensao usar o backend.</p>
        <p>O refresh token nao foi exibido na pagina e nao fica disponivel para JavaScript no navegador.</p>
        <p>Depois disso, volte para um anuncio do Mercado Livre e clique em <strong>Analisar mercado</strong>.</p>`
      )
    );
  } catch (error) {
    res.status(500).send(
      htmlPage(
        "Erro ao conectar",
        `<h1>Erro ao conectar Mercado Livre</h1><p>${error.message}</p><p>Confira se <code>MELI_CLIENT_ID</code>, <code>MELI_CLIENT_SECRET</code> e <code>MELI_REDIRECT_URI</code> estao corretos na Vercel.</p>`
      )
    );
  }
};
