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

  console.log("CLIENT ID:", JSON.stringify(clientId));
  console.log("REDIRECT URI:", JSON.stringify(redirectUri));

  const url = new URL(`${AUTH_BASE}/authorization`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);

  console.log("URL FINAL:", url.toString());

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
    redirect_uri: redirectUri
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
  const headers = accessToken ? { authorization: `Bearer ${accessToken}` } : {};
  return fetchJson(`${API_BASE}${path}`, { headers });
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
  const normalizedItemId = String(itemId || "").replace(/[^A-Z0-9]/gi, "").toUpperCase();
  if (!/^MLB\d{7,}$/.test(normalizedItemId)) {
    throw new Error("ID de anuncio invalido.");
  }

 const item = await getMercadoLivreJson(`/items/${normalizedItemId}`);

const [category, rawProducts] = await Promise.all([
  getMercadoLivreJson(`/categories/${item.category_id}`),
  getCategoryProducts(item.category_id)
]);

  const products = rawProducts
    .filter((result) => Number(result.price) > 0)
    .map((result) => ({
      id: result.id,
      title: result.title,
      sellerId: result.seller?.id || result.seller_id,
      sellerName: result.seller?.nickname || `Vendedor ${result.seller?.id || result.seller_id || ""}`.trim(),
      price: Number(result.price),
      sold: Number(result.sold_quantity || result.seller?.transactions?.completed || 0),
      currency: result.currency_id || item.currency_id || "BRL"
    }));

  const currency = item.currency_id || products[0]?.currency || "BRL";
  const prices = products.map((product) => product.price);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;
  const average = prices.reduce((sum, price) => sum + price, 0) / Math.max(prices.length, 1);

  const sellers = new Map();
  for (const product of products) {
    if (!product.sellerId) continue;
    const current = sellers.get(product.sellerId) || {
      sellerId: product.sellerId,
      sellerName: product.sellerName,
      sold: 0,
      listings: 0,
      revenueEstimate: 0
    };
    current.sold += product.sold;
    current.listings += 1;
    current.revenueEstimate += product.sold * product.price;
    sellers.set(product.sellerId, current);
  }

  const topSellers = [...sellers.values()]
    .sort((a, b) => b.sold - a.sold || b.revenueEstimate - a.revenueEstimate || b.listings - a.listings)
    .slice(0, 10);

  return {
    source: accessToken ? "authenticated" : "public",
    item: {
      id: item.id,
      title: item.title,
      category_id: item.category_id
    },
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
