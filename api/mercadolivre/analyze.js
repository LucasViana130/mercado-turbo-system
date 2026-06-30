const { analyzeItem, refreshAccessToken } = require("../_shared/meli");
const { handleOptions, parseCookies, sendJson, setRefreshTokenCookie } = require("../_shared/http");

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) return;

  const itemId = req.query?.itemId;
  const cookies = parseCookies(req);
  const refreshToken = cookies.meli_refresh_token;

  try {
    if (!refreshToken) {
      sendJson(req, res, 401, {
        ok: false,
        error: "Voce precisa conectar sua conta em /auth/mercadolivre/start neste navegador."
      });
      return;
    }

    const refreshed = await refreshAccessToken(refreshToken);
    const accessToken = refreshed.access_token;
    if (refreshed.refresh_token) {
      setRefreshTokenCookie(res, refreshed.refresh_token);
    }

    const data = await analyzeItem(itemId, accessToken);
    sendJson(req, res, 200, {
      ok: true,
      authenticated: true,
      ...data
    });
  } catch (error) {
    console.error(error);
    sendJson(req, res, 500, {
      ok: false,
      error: error.message
    });
  }
};
