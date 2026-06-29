(function () {
  const BACKEND_BASE = "https://mercado-turbo-system.vercel.app";
  const PANEL_ID = "mta-panel";
  const BUTTON_ID = "mta-analyze-button";

  let currentItemId = null;
  let lastAnalyzedItemId = null;

  const formatCurrency = (value, currency = "BRL") =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency
    }).format(Number(value || 0));

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function extractItemId() {
    const canonical = document.querySelector('link[rel="canonical"]')?.href || location.href;
    const metaUrl = document.querySelector('meta[property="og:url"]')?.content || "";
    const candidates = [canonical, location.href, metaUrl, document.body.innerText.slice(0, 2000)];

    for (const value of candidates) {
      const match = value.match(/MLB-?(\d{7,})/i);
      if (match) return `MLB${match[1]}`;
    }

    return null;
  }

  async function fetchJson(url, options = {}) {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));

    if (!response.ok || data.ok === false) {
      throw new Error(data.error || `Erro ${response.status} ao consultar ${url}`);
    }

    return data;
  }

  async function getMarketData(itemId) {
    return fetchJson(`${BACKEND_BASE}/api/mercadolivre/analyze?itemId=${encodeURIComponent(itemId)}`, {
      credentials: "include"
    });
  }

  function createButton() {
    const existing = document.getElementById(BUTTON_ID);
    if (existing) return existing;

    const button = document.createElement("button");
    button.id = BUTTON_ID;
    button.type = "button";
    button.textContent = "Analisar mercado";
    button.addEventListener("click", analyzeCurrentItem);
    document.documentElement.appendChild(button);
    return button;
  }

  function removeButton() {
    document.getElementById(BUTTON_ID)?.remove();
  }

  function createPanel() {
    const existing = document.getElementById(PANEL_ID);
    if (existing) return existing;

    const panel = document.createElement("aside");
    panel.id = PANEL_ID;
    panel.innerHTML = `
      <div class="mta-header">
        <div>
          <strong>Analise de mercado</strong>
          <span>Mercado Livre</span>
        </div>
        <button class="mta-close" aria-label="Fechar painel">x</button>
      </div>
      <div class="mta-body">
        <div class="mta-loading">Preparando analise...</div>
      </div>
    `;
    document.documentElement.appendChild(panel);
    panel.querySelector(".mta-close").addEventListener("click", () => panel.remove());
    return panel;
  }

  function metric(label, value) {
    return `
      <div class="mta-metric">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
      </div>
    `;
  }

  function renderLoading(panel) {
    panel.querySelector(".mta-body").innerHTML = `
      <div class="mta-loading">
        Buscando no backend categoria, faixa de preco e vendedores da amostra...
      </div>
    `;
  }

  function renderData(panel, data) {
    const categoryPath = data.category.path_from_root?.map((part) => part.name).join(" > ") || data.category.name;
    const sellers = data.topSellers.length
      ? data.topSellers
          .map(
            (seller, index) => `
              <li>
                <strong>${index + 1}. ${escapeHtml(seller.sellerName)}</strong>
                <span>${seller.sold || "N/D"} vendas estimadas | ${seller.listings} anuncios na amostra</span>
              </li>
            `
          )
          .join("")
      : `<li><strong>Sem ranking confiavel</strong><span>A API nao retornou vendas por vendedor nessa amostra.</span></li>`;

    panel.querySelector(".mta-body").innerHTML = `
      <section class="mta-section">
        <span class="mta-label">Categoria</span>
        <h2>${escapeHtml(data.category.name)}</h2>
        <p>${escapeHtml(categoryPath)}</p>
      </section>
      <section class="mta-grid">
        ${metric("Menor preco", formatCurrency(data.minPrice, data.currency))}
        ${metric("Maior preco", formatCurrency(data.maxPrice, data.currency))}
        ${metric("Preco medio", formatCurrency(data.average, data.currency))}
        ${metric("Amostra", `${data.products.length} anuncios`)}
      </section>
      <section class="mta-section">
        <span class="mta-label">10 vendedores que mais vendem esse tipo</span>
        <ol class="mta-competitors">${sellers}</ol>
      </section>
      <p class="mta-note">Fonte: ${escapeHtml(data.authenticated ? "backend autenticado" : "API publica")}. Ranking estimado pela amostra retornada para a categoria.</p>
    `;
  }

  function renderError(panel, message) {
    panel.querySelector(".mta-body").innerHTML = `
      <div class="mta-error">
        <strong>Nao consegui analisar este anuncio</strong>
        <p>${escapeHtml(message)}</p>
      </div>
    `;
  }

  async function analyzeCurrentItem() {
    if (!currentItemId) return;

    const panel = createPanel();
    renderLoading(panel);
    lastAnalyzedItemId = currentItemId;

    try {
      const data = await getMarketData(currentItemId);
      if (lastAnalyzedItemId === currentItemId) {
        renderData(panel, data);
      }
    } catch (error) {
      renderError(panel, error.message);
    }
  }

  function syncButtonWithPage() {
    const itemId = extractItemId();
    currentItemId = itemId;

    if (itemId) {
      createButton();
      return;
    }

    removeButton();
    document.getElementById(PANEL_ID)?.remove();
  }

  syncButtonWithPage();
  setInterval(syncButtonWithPage, 1200);
})();
