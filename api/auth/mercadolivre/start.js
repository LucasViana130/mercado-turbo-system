const { buildAuthUrl } = require("../../_shared/meli");

module.exports = async function handler(req, res) {
  try {
    res.redirect(302, buildAuthUrl());
  } catch (error) {
    res.status(500).send(`
      <h1>Erro</h1>
      <pre>${error.stack}</pre>
    `);
  }
};
