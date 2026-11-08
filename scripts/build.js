// KO Store — arma el sitio publicado en la carpeta dist/
// Vercel lo ejecuta en cada publicación (ver vercel.json), así que cada cambio
// guardado desde el panel regenera solo:
//   - una página por producto:        producto/<id>.html
//   - una página por categoría:       doboks.html, protecciones.html…
//   - datos estructurados para Google en la tienda y las categorías
//   - sitemap.xml con todas las páginas
// Para probarlo en tu computador: node scripts/build.js  (o node scripts/serve.js)

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SITE = 'https://ko-store.vercel.app';
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'dist');

// ---------- Textos de cada categoría (título, descripción y texto para Google) ----------
const CAT_SEO = {
  doboks: {
    h1: 'Doboks de taekwondo',
    title: 'Doboks de taekwondo WT para combate y poomsae | KO Store',
    desc: 'Doboks de taekwondo WT para combate y poomsae, de talla 110 a 200. Envío a todo Chile y cambio de talla gratis por 30 días.',
    lead: 'Uniformes de taekwondo WT para combate y poomsae, con cuello blanco, negro y poom.',
    intro: ['Cómo elegir tu dobok',
      'El dobok de combate usa tela liviana y respirable, con corte holgado para moverte con las protecciones puestas. El de poomsae usa tela más pesada, con caída firme, para que la técnica se vea limpia frente a los jueces.',
      'La talla del dobok se elige por estatura, en tramos de 10 cm (de 110 a 200). Si estás entre dos tallas, elige la mayor: el algodón encoge un poco con el primer lavado.'],
  },
  protecciones: {
    h1: 'Protecciones de taekwondo',
    title: 'Protecciones de taekwondo WT | KO Store',
    desc: 'Pecheras, cabezales, antebraceras, canilleras, guantes y protectores bucales para taekwondo WT. Envío a todo Chile y cambio de talla gratis.',
    lead: 'Pecheras, cabezales, antebraceras, canilleras, guantes y protectores bucales para entrenar y competir.',
    intro: ['Protecciones para entrenar y competir',
      'Para combatir en taekwondo WT se usa pechera, cabezal, antebraceras, canilleras, guantes y protector bucal. Las pecheras se eligen por talla numerada y el resto de las protecciones por talla de XS a XL.',
      'Si tienes dudas con la talla, escríbenos antes de comprar. Puedes cambiarla sin costo hasta 30 días después de recibir tu pedido.'],
  },
  electronicos: {
    h1: 'Sistemas electrónicos de taekwondo',
    title: 'Petos y sistemas electrónicos de taekwondo | KO Store',
    desc: 'Petos y cabezales electrónicos, empeineras con sensores y repuestos para taekwondo WT. Envío a todo Chile y precios para clubes.',
    lead: 'Petos y cabezales electrónicos, empeineras con sensores y repuestos.',
    intro: ['Equipos electrónicos para clubes y torneos',
      'Entrena con el mismo sistema de puntuación que se usa en competencia: petos y cabezales electrónicos, empeineras con sensores y repuestos.',
      'Si vas a equipar a tu club o academia, pide una cotización: tenemos precios por volumen desde 10 unidades.'],
  },
  entrenamiento: {
    h1: 'Material de entrenamiento de taekwondo',
    title: 'Material de entrenamiento de taekwondo | KO Store',
    desc: 'Paos, escudos, sacos de pie, conos y escaleras de coordinación para entrenar taekwondo. Envío a todo Chile.',
    lead: 'Paos, escudos, sacos de pie, conos y escaleras de coordinación.',
    intro: ['Material para el dojang',
      'Todo lo que se usa en una clase de taekwondo para trabajar potencia, precisión y velocidad de pies: paos, escudos, sacos de pie, conos y escaleras de coordinación.'],
  },
  cinturones: {
    h1: 'Cinturones de taekwondo',
    title: 'Cinturones de taekwondo de color, poom y dan | KO Store',
    desc: 'Cinturones de taekwondo de color, poom y dan, con bordado de nombre y grado a pedido. Envío a todo Chile.',
    lead: 'De color, poom y dan, con bordado personalizado a pedido.',
    intro: ['Cinturones bordados',
      'Bordamos cinturones de color, poom y dan a pedido, con tu nombre y grado. Para clubes también bordamos el nombre del club.'],
  },
  accesorios: {
    h1: 'Bolsos y accesorios de taekwondo',
    title: 'Bolsos y accesorios de taekwondo | KO Store',
    desc: 'Bolsos de equipo, cintas, vendas y elementos de primeros auxilios para taekwondo. Envío a todo Chile.',
    lead: 'Bolsos de equipo, cintas, vendas y elementos de primeros auxilios.',
    intro: ['Accesorios para el día a día',
      'Bolsos para llevar todo el equipo, cintas, vendas y elementos de primeros auxilios para el dojang y los torneos.'],
  },
};

// ---------- Utilidades ----------
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const abs = (p) => SITE + '/' + encodeURI(p.replace(/^\//, ''));
const money = (n) => '$' + Number(n).toLocaleString('es-CL');
const jsonLd = (data) =>
  `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
const clip = (s, max) => {
  s = s.replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s;
  return s.slice(0, s.lastIndexOf(' ', max - 1)).replace(/[,.;:]$/, '') + '…';
};
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const write = (f, s) => {
  fs.mkdirSync(path.dirname(path.join(OUT, f)), { recursive: true });
  fs.writeFileSync(path.join(OUT, f), s);
};
const must = (html, find, label) => {
  if (!html.includes(find)) throw new Error(`No se encontró ${label} en la plantilla`);
};

// ---------- Datos: los mismos archivos que usa el sitio ----------
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(read('productos.js'), ctx);
vm.runInContext(read('catalogo.js'), ctx);
const CATS = ctx.window.KO_CATEGORIES;
const PRODUCTS = ctx.window.KO_CATALOG;
for (const p of PRODUCTS) {
  if (!/^[a-z0-9-]+$/.test(p.id)) throw new Error(`Código de producto no válido: ${p.id}`);
}
const inCat = (cat) => PRODUCTS.filter((p) => p.cat === cat);

// ---------- 1. Copiar el sitio ----------
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT);
for (const f of fs.readdirSync(ROOT)) {
  if (/\.(html|js|css|txt)$/.test(f)) fs.copyFileSync(path.join(ROOT, f), path.join(OUT, f));
}
fs.cpSync(path.join(ROOT, 'recursosgraficos'), path.join(OUT, 'recursosgraficos'), { recursive: true });

// ---------- Piezas comunes ----------
const tienda = read('tienda.html');
const header = tienda.slice(tienda.indexOf('<header class="site-header">'), tienda.indexOf('</header>') + 9)
  .replace(' aria-current="page"', '');
const footer = tienda.slice(tienda.indexOf('<footer class="site-footer">'), tienda.indexOf('</footer>') + 9);
const fontLinks = `<link rel="icon" type="image/png" href="recursosgraficos/favicon.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..900&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="styles.css">`;

const breadcrumbLd = (items) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map(([name, url], i) => ({ '@type': 'ListItem', position: i + 1, name, item: url })),
});
const crumbsHtml = (items) => `<nav class="crumbs" aria-label="Ruta de navegación"><ol>${items.map(([name, href], i) =>
  i === items.length - 1
    ? `<li><span aria-current="page">${esc(name)}</span></li>`
    : `<li><a href="${href}">${esc(name)}</a></li>`).join('')}</ol></nav>`;
const itemListLd = (list) => ({
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  itemListElement: list.map((p, i) => ({
    '@type': 'ListItem', position: i + 1, url: `${SITE}/producto/${p.id}.html`, name: p.name,
  })),
});

// Cambia título, descripción y URL en una página basada en tienda.html
function retarget(html, { title, desc, url }) {
  return html
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(desc)}">`)
    .replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${url}">`)
    .replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${esc(title)}">`)
    .replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${esc(desc)}">`)
    .replace(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${url}">`);
}

// ---------- 2. Tienda: lista de productos para Google ----------
must(tienda, '</head>', '</head>');
write('tienda.html', tienda.replace('</head>', `  ${jsonLd(itemListLd(PRODUCTS))}\n</head>`));

// ---------- 3. Páginas de categoría ----------
must(tienda, '<h1>Tienda</h1>', 'el título de la tienda');
must(tienda, '<section class="service"', 'la franja de servicio');
for (const [key, label] of Object.entries(CATS)) {
  const seo = CAT_SEO[key] || { h1: label, title: `${label} | KO Store`, desc: `${label} de taekwondo WT. Envío a todo Chile.`, lead: '' };
  const list = inCat(key);
  const url = `${SITE}/${key}.html`;
  const crumbs = [['Inicio', './'], ['Tienda', 'tienda.html'], [seo.h1, '']];
  let html = retarget(tienda, { title: seo.title, desc: seo.desc, url });
  const head = [
    jsonLd(breadcrumbLd([['Inicio', `${SITE}/`], ['Tienda', `${SITE}/tienda.html`], [seo.h1, url]])),
    list.length ? jsonLd(itemListLd(list)) : '<meta name="robots" content="noindex, follow">',
  ];
  html = html
    .replace('</head>', `  ${head.join('\n  ')}\n</head>`)
    .replace('<body>', `<body data-cat="${key}">`)
    .replace('<h1>Tienda</h1>', `${crumbsHtml(crumbs)}\n        <h1>${esc(seo.h1)}</h1>`)
    .replace(/(<p class="lead" id="shopLead">)[^<]*(<\/p>)/,
      `$1${esc(`${seo.lead} ${list.length} producto${list.length === 1 ? '' : 's'}. Despachamos a todo Chile.`.trim())}$2`);
  if (seo.intro) {
    const [h2, ...ps] = seo.intro;
    html = html.replace('<section class="service"', `<section class="cat-intro">
      <div class="wrap">
        <h2>${esc(h2)}</h2>
        ${ps.map((t) => `<p>${esc(t)}</p>`).join('\n        ')}
      </div>
    </section>

    <section class="service"`);
  }
  write(`${key}.html`, html);
}

// ---------- 4. Páginas de producto ----------
const perks = `<ul class="pdp-perks">
            <li><strong>Envío a todo Chile.</strong> Gratis sobre $60.000 en Santiago.</li>
            <li><strong>Cambio de talla sin costo</strong> hasta 30 días después de recibir tu pedido. <a href="ayuda.html#cambios">Ver condiciones</a></li>
            <li><strong>Pago seguro</strong> con Webpay, débito o transferencia.</li>
          </ul>`;

function relatedCard(p) {
  const img = p.fotos[0]
    ? `<div class="ph ph-photo"><img src="${esc(p.fotos[0])}" alt="${esc(p.name)}" class="${p.fit === 'cover' ? 'cover' : ''}" loading="lazy"></div>`
    : `<div class="ph" role="img" aria-label="${esc(p.name)}, foto pendiente"><span>${esc(p.short)}</span></div>`;
  return `<article class="product" data-id="${esc(p.id)}">
          <a href="producto/${p.id}.html" tabindex="-1" aria-hidden="true">${img}</a>
          <p class="tag${p.badge ? ' tag-wt' : ''}">${esc(p.badge || CATS[p.cat])}</p>
          <h3><a href="producto/${p.id}.html">${esc(p.name)}</a></h3>
          <p class="spec">${esc(p.spec)}</p>
          <p class="price">${money(p.price)}</p>
          <button class="btn btn-add" type="button">Agregar al carro</button>
        </article>`;
}

for (const p of PRODUCTS) {
  const catLabel = CATS[p.cat] || p.cat;
  const catH1 = (CAT_SEO[p.cat] && CAT_SEO[p.cat].h1) || catLabel;
  const url = `${SITE}/producto/${p.id}.html`;
  const longTitle = `${p.name} – Taekwondo WT | KO Store`;
  const title = longTitle.length <= 60 ? longTitle : `${p.name} | KO Store`;
  const summary = p.spec || (CAT_SEO[p.cat] && CAT_SEO[p.cat].lead) || '';
  const desc = clip(`${p.name} a ${money(p.price)}. ${summary} Envío a todo Chile y cambio de talla gratis por 30 días.`, 155);
  const fotos = p.fotos;
  const ogImage = fotos[0] ? abs(fotos[0]) : `${SITE}/recursosgraficos/og-kostore.jpg`;
  const sizes = p.sizes || [];

  const productLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    description: p.desc || summary || p.name,
    sku: p.id,
    category: catLabel,
    url,
    offers: {
      '@type': 'Offer',
      url,
      price: String(p.price),
      priceCurrency: 'CLP',
      availability: 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@type': 'Organization', name: 'KO Store', url: `${SITE}/` },
      hasMerchantReturnPolicy: {
        '@type': 'MerchantReturnPolicy',
        applicableCountry: 'CL',
        returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
        merchantReturnDays: 30,
        refundType: 'https://schema.org/ExchangeRefund',
        returnFees: 'https://schema.org/FreeReturn',
      },
    },
  };
  if (fotos.length) productLd.image = fotos.map(abs);
  if (sizes.length) productLd.size = sizes.join(', ');

  const crumbs = [['Inicio', './'], [catH1, `${p.cat}.html`], [p.name, '']];
  const label = p.etiqueta ? `<span class="badge badge-${esc(p.etiqueta)}">${p.etiqueta === 'oferta' ? 'Oferta' : 'Nuevo'}</span>` : '';
  const gallery = fotos.length
    ? `<div class="pdp-main ph">${label}<img src="${esc(fotos[0])}" alt="${esc(p.name)}" class="${p.fit === 'cover' ? 'cover' : ''}" fetchpriority="high"></div>
          ${fotos.length > 1 ? `<div class="pdp-thumbs" aria-label="Fotos del producto">${fotos.map((f, i) =>
            `<button type="button" data-src="${esc(f)}" aria-current="${i === 0}" aria-label="Ver foto ${i + 1}"><img src="${esc(f)}" alt="" loading="lazy"></button>`).join('')}</div>` : ''}`
    : `<div class="pdp-main ph" role="img" aria-label="${esc(p.name)}, foto pendiente">${label}<span>${esc(p.short)}</span></div>`;
  const price = p.oldPrice
    ? `<p class="price on-sale">${money(p.price)}<s class="price-old">${money(p.oldPrice)}</s></p>`
    : `<p class="price">${money(p.price)}</p>`;
  const sizePick = sizes.length
    ? `<div class="pick-size">
              <label for="size">Talla</label>
              <select id="size">
                <option value="">Elegir talla</option>
                ${sizes.map((s) => `<option>${esc(s)}</option>`).join('')}
              </select>
            </div>`
    : '<p class="pick-size one">Talla única</p>';
  const descParas = (p.desc || '').split(/\n\s*\n|\n/).map((t) => t.trim()).filter(Boolean);
  const descBlock = [
    ...descParas.map((t) => `<p>${esc(t)}</p>`),
    sizes.length ? `<p><strong>Tallas disponibles:</strong> ${esc(sizes.join(', '))}.</p>` : '',
    p.cat === 'doboks' ? '<p>¿No sabes qué talla pedir? Usa nuestra <a href="./#tallas">calculadora de tallas de dobok</a>.</p>' : '',
  ].filter(Boolean);
  const related = [...inCat(p.cat).filter((x) => x.id !== p.id), ...PRODUCTS.filter((x) => x.cat !== p.cat)].slice(0, 4);

  const html = `<!doctype html>
<html lang="es-CL">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <base href="/">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(desc)}">
  <link rel="canonical" href="${url}">
  <meta name="theme-color" content="#000000">
  <meta property="og:type" content="product">
  <meta property="og:site_name" content="KO Store">
  <meta property="og:locale" content="es_CL">
  <meta property="og:title" content="${esc(p.name)}">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${ogImage}">
  <meta property="product:price:amount" content="${p.price}">
  <meta property="product:price:currency" content="CLP">
  <meta name="twitter:card" content="summary_large_image">
  ${fontLinks}
  ${jsonLd(productLd)}
  ${jsonLd(breadcrumbLd([['Inicio', `${SITE}/`], [catH1, `${SITE}/${p.cat}.html`], [p.name, url]]))}
</head>
<body>
  <a class="skip" href="producto/${p.id}.html#main">Saltar al contenido</a>

  ${header}

  <main id="main">
    <section class="pdp">
      <div class="wrap">
        ${crumbsHtml(crumbs)}
        <div class="pdp-grid">
          <div class="pdp-gallery">
          ${gallery}
          </div>
          <div class="pdp-info">
            <p class="tag${p.badge ? ' tag-wt' : ''}">${esc(p.badge || catLabel)}</p>
            <h1>${esc(p.name)}</h1>
            ${price}
            ${p.spec ? `<p class="spec">${esc(p.spec)}</p>` : ''}
            <div class="pdp-buy" data-id="${esc(p.id)}">
              ${sizePick}
              <p class="size-error" aria-live="polite"></p>
              <button class="btn btn-add" type="button">Agregar al carro</button>
            </div>
            ${perks}
            ${descBlock.length ? `<div class="pdp-desc">
              <h2>Descripción</h2>
              ${descBlock.join('\n              ')}
            </div>` : ''}
          </div>
        </div>
      </div>
    </section>
${related.length ? `
    <section class="pdp-related" aria-labelledby="relTitle">
      <div class="wrap">
        <h2 id="relTitle">También te puede servir</h2>
        <div class="products">
        ${related.map(relatedCard).join('\n        ')}
        </div>
      </div>
    </section>` : ''}
  </main>

  ${footer}

  <script src="config.js"></script>
  <script src="productos.js"></script>
  <script src="catalogo.js"></script>
  <script src="comun.js"></script>
  <script src="cart.js"></script>
  <script src="producto.js"></script>
</body>
</html>
`;
  write(`producto/${p.id}.html`, html);
}

// ---------- 5. Sitemap ----------
const urls = [
  [`${SITE}/`, '1.0'],
  [`${SITE}/tienda.html`, '0.9'],
  ...Object.keys(CATS).filter((k) => inCat(k).length).map((k) => [`${SITE}/${k}.html`, '0.8']),
  ...PRODUCTS.map((p) => [`${SITE}/producto/${p.id}.html`, '0.7']),
  [`${SITE}/ayuda.html`, '0.4'],
];
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(([u, pr]) => `  <url><loc>${u}</loc><priority>${pr}</priority></url>`).join('\n')}
</urlset>
`);

console.log(`Sitio armado en dist/: ${PRODUCTS.length} productos, ${Object.keys(CATS).length} categorías, ${urls.length} URLs en el sitemap.`);
