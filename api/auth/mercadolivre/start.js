const { buildAuthUrl } = require("../../_shared/meli");

module.exports = async function handler(req, res) {
  res.json({
    clientId: process.env.MELI_CLIENT_ID,
    redirectUri: process.env.MELI_REDIRECT_URI,
    authUrl: buildAuthUrl()
  });
};