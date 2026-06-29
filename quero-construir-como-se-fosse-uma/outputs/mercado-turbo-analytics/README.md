# Mercado Turbo Analytics

MVP de extensao Chrome/Edge para analisar anuncios do Mercado Livre.

## O que ela mostra

- Categoria do anuncio aberto.
- Menor preco, maior preco e preco medio dos anuncios encontrados na mesma categoria.
- Os 10 vendedores com maior volume estimado naquele tipo de produto, agrupados por vendedor quando a API retorna dados suficientes.

## Como instalar no Chrome ou Edge

1. Abra `chrome://extensions` ou `edge://extensions`.
2. Ative o modo de desenvolvedor.
3. Clique em "Carregar sem compactacao".
4. Selecione esta pasta: `mercado-turbo-analytics`.
5. Abra um anuncio do Mercado Livre em `produto.mercadolivre.com.br`.
6. Clique no botao "Analisar mercado" que aparece no canto da tela.

## Como funciona

A extensao fica em segundo plano na pagina e detecta o ID do anuncio na URL. Quando voce clica em "Analisar mercado", ela chama o backend:

- `GET https://mercado-turbo-system.vercel.app/api/mercadolivre/analyze?itemId={ITEM_ID}`

O backend consulta o Mercado Livre usando, quando disponivel, o OAuth da sua conta:

- `GET https://api.mercadolibre.com/items/{ITEM_ID}`
- `GET https://api.mercadolibre.com/categories/{CATEGORY_ID}`
- `GET https://api.mercadolibre.com/sites/MLB/search?category={CATEGORY_ID}&limit=50&offset={OFFSET}`

Depois calcula os indicadores no proprio navegador.

## Limitacoes importantes

Os dados de concorrentes e vendas dependem do que a API retorna publicamente para a categoria. Para um produto comercial mais forte, o ideal e criar uma aplicacao no Mercado Livre Developers, implementar OAuth em um backend e respeitar limites, permissoes e termos de uso da API.

Nao coloque `client_secret`, `access_token` ou `refresh_token` diretamente nesta extensao. Extensoes rodam no navegador e o codigo pode ser inspecionado. O fluxo correto e a extensao chamar um backend seu, e o backend guardar e renovar os tokens com seguranca.

## Como usar sua conta com mais seguranca

Para deixar a pesquisa mais precisa, o caminho recomendado e:

1. Criar uma aplicacao no Mercado Livre Developers.
2. Guardar no backend o `client_id`, `client_secret` e `redirect_uri`.
3. Abrir a URL de autorizacao do Mercado Livre para sua conta aprovar o app.
4. Receber o `code` no `redirect_uri`.
5. Trocar esse `code` por `access_token` e `refresh_token` no backend.
6. Renovar o token pelo backend quando expirar.
7. Fazer a extensao chamar o backend, nao a API privada direto.

Dados que voce vai precisar ter, sem me enviar segredo aqui:

- `APP_ID` ou `client_id`
- `SECRET_KEY` ou `client_secret`
- `redirect_uri` cadastrado exatamente igual no app
- `code` temporario gerado depois que voce autoriza o app
- `refresh_token`, guardado somente no backend

## Proximos passos recomendados

- Adicionar backend com cache para evitar excesso de chamadas.
- Implementar OAuth do Mercado Livre.
- Salvar historico de categorias e precos por dia.
- Comparar anuncios por atributos como marca, modelo, condicao e frete.
- Separar anuncios patrocinados, catalogo, Full, Flex e Turbo quando esses campos estiverem disponiveis.
