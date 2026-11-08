// KO Store — página de tienda: filtros, búsqueda, orden y tarjetas de producto

(function () {
  const CATS = window.KO_CATEGORIES;
  const ALL = window.KO_CATALOG;

  const grid = document.getElementById('grid');
  const chips = document.getElementById('chips');
  const q = document.getElementById('q');
  const sort = document.getElementById('sort');
  const resultCount = document.getElementById('resultCount');
  const noResults = document.getElementById('noResults');

  // En las páginas de categoría (doboks.html, protecciones.html…) la categoría viene fija en <body data-cat>
  const FIXED = CATS[document.body.dataset.cat] ? document.body.dataset.cat : null;

  // Enlaces antiguos tipo tienda.html#doboks: se envían a la página de la categoría
  const h = location.hash.replace('#', '');
  if (!FIXED && CATS[h]) { location.replace(`${h}.html`); return; }

  document.getElementById('year').textContent = new Date().getFullYear();
  if (!FIXED) {
    document.getElementById('shopLead').textContent =
      `${ALL.length} productos de taekwondo WT, desde doboks hasta sistemas electrónicos. Despachamos a todo Chile.`;
  }

  let state = { cat: FIXED || 'todo', q: '', sort: 'destacados' };

  // ---------- Categorías: enlaces a la página de cada una ----------
  const countBy = (cat) => ALL.filter((p) => p.cat === cat).length;
  const chip = (href, key, label, n) =>
    `<a class="chip" href="${href}"${key === state.cat ? ' aria-current="page"' : ''}>${label} <span>${n}</span></a>`;
  chips.innerHTML = [
    chip('tienda.html', 'todo', 'Todo', ALL.length),
    ...Object.entries(CATS).map(([key, label]) => chip(`${key}.html`, key, label, countBy(key))),
  ].join('');

  q.addEventListener('input', () => { state.q = q.value.trim().toLowerCase(); render(); });
  sort.addEventListener('change', () => { state.sort = sort.value; render(); });
  document.getElementById('resetFilters').addEventListener('click', () => {
    state = { cat: FIXED || 'todo', q: '', sort: state.sort };
    q.value = '';
    render();
  });

  // ---------- Tarjetas ----------
  const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  const card = (p) => window.KOProductCard(p);

  function render() {
    let list = ALL.filter((p) => state.cat === 'todo' || p.cat === state.cat);
    if (state.q) {
      const term = norm(state.q);
      list = list.filter((p) => norm(`${p.name} ${p.spec} ${CATS[p.cat]}`).includes(term));
    }
    if (state.sort === 'precio-asc') list = [...list].sort((a, b) => a.price - b.price);
    if (state.sort === 'precio-desc') list = [...list].sort((a, b) => b.price - a.price);
    if (state.sort === 'nombre') list = [...list].sort((a, b) => a.name.localeCompare(b.name, 'es'));

    grid.innerHTML = list.map(card).join('');
    noResults.hidden = list.length > 0;
    const where = state.cat === 'todo' ? '' : ` en ${CATS[state.cat]}`;
    resultCount.textContent = `${list.length} producto${list.length === 1 ? '' : 's'}${where}`;
  }

  grid.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-add');
    if (!btn) return;
    const article = btn.closest('.product');
    const p = ALL.find((x) => x.id === article.dataset.id);
    const select = article.querySelector('select');
    const err = article.querySelector('.size-error');
    if (select && !select.value) {
      select.classList.add('needs-size');
      err.textContent = 'Elige una talla para agregarlo.';
      select.focus();
      return;
    }
    window.KOCart.add(p.id, select ? select.value : null);
    btn.textContent = 'Agregado';
    btn.classList.add('added');
    setTimeout(() => { btn.textContent = 'Agregar al carro'; btn.classList.remove('added'); }, 1500);
  });

  grid.addEventListener('change', (e) => {
    const select = e.target.closest('select');
    if (!select || !select.value) return;
    select.classList.remove('needs-size');
    select.closest('.product').querySelector('.size-error').textContent = '';
  });

  render();
})();
