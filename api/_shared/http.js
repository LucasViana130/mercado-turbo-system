const ALLOWED_ORIGINS = new Set([
  "https://produto.mercadolivre.com.br",
  "https://www.mercadolivre.com.br",
  "https://mercado-turbo-system.vercel.app"
]);

function setCors(req, res) {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  res.setHeader("Vary", "Origin");
}

function handleOptions(req, res) {
  if (req.method === "OPTIONS") {
    setCors(req, res);
    res.status(204).end();
    return true;
  }
  return false;
}

function sendJson(req, res, status, data) {
  setCors(req, res);
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.status(status).send(JSON.stringify(data));
}

function parseCookies(req) {
  const header = req.headers.cookie || "";
  return Object.fromEntries(
    header
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        return [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
      })
  );
}

function setRefreshTokenCookie(res, refreshToken) {
  if (!refreshToken) return;
  const maxAge = 60 * 60 * 24 * 180;
  res.setHeader(
    "Set-Cookie",
    `meli_refresh_token=${encodeURIComponent(refreshToken)}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=None`
  );
}

function htmlPage(title, body) {
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>
    body { font-family: Arial, Helvetica, sans-serif; margin: 0; background: #f6f7f9; color: #18202a; }
    main { max-width: 760px; margin: 48px auto; padding: 28px; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; }
    h1 { margin: 0 0 12px; font-size: 24px; }
    p { line-height: 1.5; color: #526070; }
    code, pre { background: #f1f5f9; border-radius: 6px; }
    code { padding: 2px 5px; }
    pre { padding: 14px; overflow: auto; }
    a { color: #2968c8; }
  </style>
</head>
<body><main>${body}</main></body>
</html>`;
}

module.exports = {
  handleOptions,
  sendJson,
  parseCookies,
  setRefreshTokenCookie,
  htmlPage
};
