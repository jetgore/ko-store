// KO Store — página de tienda: filtros, búsqueda, orden y tarjetas de producto

(function () {
  const CATS = window.KO_CATEGORIES;
  const ALL = window.KO_CATALOG;
  const fmt = window.KOCart.format;

  const grid = document.getElementById('grid');
  const chips = document.getElementById('chips');
  const q = document.getElementById('q');
  const sort = document.getElementById('sort');
  const resultCount = document.getElementById('resultCount');
  const noResults = document.getElementById('noResults');

  document.getElementById('year').textContent = new Date().getFullYear();
  document.getElementById('shopLead').textContent =
    `${ALL.length} productos de taekwondo WT, desde doboks hasta sistemas electrónicos. Despachamos a todo Chile.`;

  const fromHash = () => {
    const h = location.hash.replace('#', '');
    return CATS[h] ? h : 'todo';
  };
  let state = { cat: fromHash(), q: '', sort: 'destacados' };

  // ---------- Chips de categoría ----------
  const countBy = (cat) => ALL.filter((p) => p.cat === cat).length;
  chips.innerHTML = [
    `<button type="button" class="chip" data-cat="todo">Todo <span>${ALL.length}</span></button>`,
    ...Object.entries(CATS).map(([key, label]) =>
      `<button type="button" class="chip" data-cat="${key}">${label} <span>${countBy(key)}</span></button>`),
  ].join('');

  chips.addEventListener('click', (e) => {
    const btn = e.target.closest('.chip');
    if (!btn) return;
    state.cat = btn.dataset.cat;
    history.replaceState(null, '', state.cat === 'todo' ? location.pathname : '#' + state.cat);
    render();
  });
  window.addEventListener('hashchange', () => { state.cat = fromHash(); render(); });

  q.addEventListener('input', () => { state.q = q.value.trim().toLowerCase(); render(); });
  sort.addEventListener('change', () => { state.sort = sort.value; render(); });
  document.getElementById('resetFilters').addEventListener('click', () => {
    state = { cat: 'todo', q: '', sort: state.sort };
    q.value = '';
    history.replaceState(null, '', location.pathname);
    render();
  });

  // ---------- Tarjetas ----------
  const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  function card(p) {
    const label = p.etiqueta
      ? `<span class="badge badge-${p.etiqueta}">${p.etiqueta === 'oferta' ? 'Oferta' : 'Nuevo'}</span>` : '';
    const price = p.oldPrice
      ? `<p class="price on-sale">${fmt(p.price)}<s class="price-old">${fmt(p.oldPrice)}</s></p>`
      : `<p class="price">${fmt(p.price)}</p>`;
    const media = p.img
      ? `<div class="ph ph-photo${p.img2 ? ' ph-swap' : ''}">${label}
           <img src="${p.img}" alt="${p.name}" class="${p.fit === 'cover' ? 'cover' : ''}" loading="lazy">
           ${p.img2 ? `<img src="${p.img2}" alt="" aria-hidden="true" loading="lazy">` : ''}
         </div>`
      : `<div class="ph" role="img" aria-label="${p.name}, foto pendiente">${label}<span>${p.short}</span></div>`;
    const size = p.sizes.length
      ? `<div class="pick-size">
           <label for="size-${p.id}">Talla</label>
           <select id="size-${p.id}">
             <option value="">Elegir talla</option>
             ${p.sizes.map((s) => `<option>${s}</option>`).join('')}
           </select>
         </div>`
      : '<p class="pick-size one">Talla única</p>';
    return `
      <article class="product" data-id="${p.id}">
        ${media}
        <p class="tag${p.badge ? ' tag-wt' : ''}">${p.badge || CATS[p.cat]}</p>
        <h3>${p.name}</h3>
        <p class="spec">${p.spec}</p>
        ${price}
        ${size}
        <p class="size-error" aria-live="polite"></p>
        <button class="btn btn-add" type="button">Agregar al carro</button>
      </article>`;
  }

  function render() {
    chips.querySelectorAll('.chip').forEach((c) =>
      c.setAttribute('aria-pressed', String(c.dataset.cat === state.cat)));

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
