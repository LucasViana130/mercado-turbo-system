const API_BASE = "https://api.mercadolibre.com";
const AUTH_BASE = "https://auth.mercadolivre.com.br";
const SITE_ID = "MLB";
const SEARCH_LIMIT = 50;
const SEARCH_OFFSETS = [0, 50, 100, 150];

function getConfig() {
  return {
    clientId: process.env.MELI_CLIENT_ID,
    clientSecret: process.env.MELI_CLIENT_SECRET,
    redirectUri: process.env.MELI_REDIRECT_URI
  };
}

function requireConfig() {
  const config = getConfig();
  const missing = Object.entries(config)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length) {
    throw new Error(`Variaveis ausentes: ${missing.join(", ")}`);
  }

  return config;
}

function buildAuthUrl() {
  const { clientId, redirectUri } = requireConfig();

  console.log("CLIENT_ID =", JSON.stringify(clientId));
  console.log("REDIRECT_URI =", JSON.stringify(redirectUri));

  const cleanRedirectUri = redirectUri.trim();

  console.log("REDIRECT_URI LIMPA =", JSON.stringify(cleanRedirectUri));

  const url = new URL(`${AUTH_BASE}/authorization`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", cleanRedirectUri);

  console.log("URL GERADA =", url.toString());

  return url.toString();
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);

  const text = await response.text();

  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    console.error("========== ERRO MERCADO LIVRE ==========");
    console.error("URL:", url);
    console.error("Status:", response.status);
    console.error("Resposta:", data);

    throw new Error(data.message || data.error || JSON.stringify(data));
  }

  return data;
}

async function exchangeCodeForToken(code) {
  const { clientId, clientSecret, redirectUri } = requireConfig();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri.trim()
  });

  return fetchJson(`${API_BASE}/oauth/token`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json"
    },
    body
  });
}

async function refreshAccessToken(refreshToken) {
  const { clientId, clientSecret } = requireConfig();
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken
  });

  return fetchJson(`${API_BASE}/oauth/token`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json"
    },
    body
  });
}

async function getMercadoLivreJson(path, accessToken) {
  console.log("====================================");
  console.log("PATH:", path);
  console.log("TOKEN:", accessToken ? "SIM" : "NAO");

  const headers = {
    Accept: "application/json"
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    headers
  });

  const text = await response.text();

  console.log("STATUS:", response.status);
  console.log("BODY:", text);

  if (!response.ok) {
    throw new Error(text);
  }

  return JSON.parse(text);
}

async function getCategoryProducts(categoryId) {
  const searches = await Promise.all(
    SEARCH_OFFSETS.map((offset) =>
      getMercadoLivreJson(
        `/sites/${SITE_ID}/search?category=${encodeURIComponent(categoryId)}&limit=${SEARCH_LIMIT}&offset=${offset}`
      )
    )
  );

  return searches.flatMap((search) => search.results || []);
}

async function analyzeItem(itemId, accessToken) {
  const normalizedItemId = String(itemId || "")
    .replace(/[^A-Z0-9]/gi, "")
    .toUpperCase();

  console.log("ITEM:", normalizedItemId);

  console.log("===== TESTE ITEM =====");
  const item = await getMercadoLivreJson(`/items/${normalizedItemId}`);
  console.log("OK ITEM");

  console.log("===== TESTE CATEGORY =====");
  const category = await getMercadoLivreJson(`/categories/${item.category_id}`);
  console.log("OK CATEGORY");

  console.log("===== TESTE SEARCH =====");
  const search = await getMercadoLivreJson(
    `/sites/MLB/search?category=${item.category_id}&limit=5`
  );
  console.log("OK SEARCH");

  return {
    item,
    category,
    products: search.results || [],
    topSellers: [],
    currency: item.currency_id,
    average: 0,
    minPrice: 0,
    maxPrice: 0
  };
}
module.exports = {
  buildAuthUrl,
  exchangeCodeForToken,
  refreshAccessToken,
  analyzeItem
};
