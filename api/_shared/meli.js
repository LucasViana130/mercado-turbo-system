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

  if (!/^MLB\d{7,}$/.test(normalizedItemId)) {
    throw new Error("ID de anuncio invalido.");
  }

  console.log("1 - Buscando item");
  const item = await getMercadoLivreJson(`/items/${normalizedItemId}`);

  console.log("2 - Buscando categoria");
  const category = await getMercadoLivreJson(`/categories/${item.category_id}`);

  console.log("3 - Buscando anúncios");
  const rawProducts = await getCategoryProducts(item.category_id);

  console.log("4 - Produtos encontrados:", rawProducts.length);

  const products = rawProducts
    .filter(result => Number(result.price) > 0)
    .map(result => ({
      id: result.id,
      title: result.title,
      sellerId: result.seller?.id || result.seller_id,
      sellerName:
        result.seller?.nickname ||
        `Vendedor ${result.seller?.id || result.seller_id || ""}`.trim(),
      price: Number(result.price),
      sold: Number(result.sold_quantity || 0),
      currency: result.currency_id || item.currency_id || "BRL"
    }));

  const currency = item.currency_id || "BRL";

  const prices = products.map(p => p.price);

  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;

  const average =
    prices.reduce((a, b) => a + b, 0) / Math.max(prices.length, 1);

  const sellers = new Map();

  for (const p of products) {
    if (!p.sellerId) continue;

    const current = sellers.get(p.sellerId) || {
      sellerId: p.sellerId,
      sellerName: p.sellerName,
      sold: 0,
      listings: 0,
      revenueEstimate: 0
    };

    current.sold += p.sold;
    current.listings++;
    current.revenueEstimate += p.price * p.sold;

    sellers.set(p.sellerId, current);
  }

  const topSellers = [...sellers.values()]
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 10);

  return {
    source: "public",
    item,
    category,
    products,
    topSellers,
    currency,
    average,
    minPrice,
    maxPrice
  };
}
module.exports = {
  buildAuthUrl,
  exchangeCodeForToken,
  refreshAccessToken,
  analyzeItem
};
