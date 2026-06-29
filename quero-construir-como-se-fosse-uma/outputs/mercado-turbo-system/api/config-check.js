const { sendJson } = require("./_shared/http");

module.exports = async function handler(req, res) {
  sendJson(req, res, 200, {
    ok: true,
    clientId: process.env.MELI_CLIENT_ID || null,
    redirectUri: process.env.MELI_REDIRECT_URI || null,
    hasClientSecret: Boolean(process.env.MELI_CLIENT_SECRET)
  });
};
