const { sendJson } = require("./_shared/http");

module.exports = async function handler(req, res) {
  sendJson(req, res, 200, {
    ok: true,
    service: "mercado-turbo-system"
  });
};
