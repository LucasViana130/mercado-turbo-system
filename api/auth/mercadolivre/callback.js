const { exchangeCodeForToken } = require("../../_shared/meli");

module.exports = async function handler(req, res) {
  const { code, error } = req.query;

  if (error) {
    return res.json(req.query);
  }

  try {
    const token = await exchangeCodeForToken(code);

    return res.json(token);
  } catch (e) {
    return res.status(500).json({
      message: e.message,
      stack: e.stack
    });
  }
};