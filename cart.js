// KO Store — carro de compras compartido entre páginas
// Guarda el carro en el navegador (localStorage) y dibuja el panel lateral.

(function () {
  const KEY = 'ko-cart';
  const ENVIO_GRATIS = 60000;
  const fmt = (n) => '$' + n.toLocaleString('es-CL');
  const byId = (id) => window.KO_CATALOG.find((p) => p.id === id);
  const esc = window.KOEsc;

  let items = load();

  function load() {
    try {
      const data = JSON.parse(localStorage.getItem(KEY));
      return Array.isArray(data) ? data.filter((i) => byId(i.id)) : [];
    } catch (e) { return []; }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) { /* sin almacenamiento */ }
    render();
  }

  // ---------- Panel ----------
  const overlay = document.createElement('div');
  overlay.className = 'drawer-overlay';
  const drawer = document.createElement('aside');
  drawer.className = 'drawer';
  drawer.setAttribute('aria-label', 'Carro de compras');
  drawer.setAttribute('aria-hidden', 'true');
  drawer.innerHTML = `
    <div class="drawer-head">
      <h2>Tu carro</h2>
      <button type="button" class="drawer-close" aria-label="Cerrar carro">
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
      </button>
    </div>
    <ul class="drawer-list"></ul>
    <div class="drawer-empty">
      <p>Tu carro está vacío.</p>
      <a href="tienda.html" class="btn btn-primary">Ir a la tienda</a>
    </div>
    <div class="drawer-foot">
      <div class="drawer-total"><span>Subtotal</span><strong class="drawer-subtotal">$0</strong></div>
      <p class="drawer-ship"></p>
      <button type="button" class="btn btn-primary drawer-pay">Enviar pedido</button>
      <p class="drawer-msg" aria-live="polite"></p>
    </div>`;
  document.body.append(overlay, drawer);

  const list = drawer.querySelector('.drawer-list');
  const msg = drawer.querySelector('.drawer-msg');
  let lastFocus = null;

  function open() {
    lastFocus = document.activeElement;
    document.body.classList.add('drawer-open');
    drawer.setAttribute('aria-hidden', 'false');
    drawer.querySelector('.drawer-close').focus();
  }
  function close() {
    document.body.classList.remove('drawer-open');
    drawer.setAttribute('aria-hidden', 'true');
    msg.textContent = '';
    if (lastFocus) lastFocus.focus();
  }
  overlay.addEventListener('click', close);
  drawer.querySelector('.drawer-close').addEventListener('click', close);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.body.classList.contains('drawer-open')) close();
  });
  document.querySelectorAll('.cart').forEach((btn) => btn.addEventListener('click', open));

  function thumb(p) {
    return p.img
      ? `<img src="${p.img}" alt="" class="${p.fit === 'cover' ? 'cover' : ''}">`
      : `<span>${esc(p.short)}</span>`;
  }

  function render() {
    const count = items.reduce((s, i) => s + i.qty, 0);
    document.querySelectorAll('.cart-count').forEach((el) => { el.textContent = count; });
    document.querySelectorAll('.cart').forEach((el) => {
      el.setAttribute('aria-label', `Abrir carro, ${count} producto${count === 1 ? '' : 's'}`);
    });

    drawer.classList.toggle('is-empty', items.length === 0);
    list.innerHTML = items.map((i, idx) => {
      const p = byId(i.id);
      const sizeCtl = p.sizes.length
        ? `<label class="line-size">Talla
             <select data-idx="${idx}" class="${i.size ? '' : 'needs-size'}">
               <option value="">Elegir</option>
               ${p.sizes.map((s) => `<option ${s === i.size ? 'selected' : ''}>${esc(s)}</option>`).join('')}
             </select>
           </label>`
        : '<span class="line-size">Talla única</span>';
      return `
        <li class="line">
          <div class="line-thumb">${thumb(p)}</div>
          <div class="line-info">
            <p class="line-name">${esc(p.name)}</p>
            ${sizeCtl}
            <div class="line-qty">
              <button type="button" data-act="dec" data-idx="${idx}" aria-label="Quitar una unidad">−</button>
              <span aria-label="Cantidad">${i.qty}</span>
              <button type="button" data-act="inc" data-idx="${idx}" aria-label="Agregar una unidad">+</button>
              <button type="button" class="line-remove" data-act="del" data-idx="${idx}">Quitar</button>
            </div>
          </div>
          <p class="line-price">${fmt(p.price * i.qty)}</p>
        </li>`;
    }).join('');

    const subtotal = items.reduce((s, i) => s + byId(i.id).price * i.qty, 0);
    drawer.querySelector('.drawer-subtotal').textContent = fmt(subtotal);
    drawer.querySelector('.drawer-ship').textContent = subtotal >= ENVIO_GRATIS
      ? 'Tu pedido tiene envío gratis en Santiago.'
      : `Te faltan ${fmt(ENVIO_GRATIS - subtotal)} para envío gratis en Santiago.`;
  }

  list.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const idx = Number(btn.dataset.idx);
    const act = btn.dataset.act;
    if (act === 'inc') items[idx].qty += 1;
    if (act === 'dec') items[idx].qty -= 1;
    if (act === 'del' || items[idx].qty < 1) items.splice(idx, 1);
    msg.textContent = '';
    save();
  });

  list.addEventListener('change', (e) => {
    const sel = e.target.closest('select[data-idx]');
    if (!sel) return;
    const idx = Number(sel.dataset.idx);
    const line = items[idx];
    const size = sel.value || null;
    const twin = items.find((i, j) => j !== idx && i.id === line.id && i.size === size);
    if (twin && size) { twin.qty += line.qty; items.splice(idx, 1); }
    else line.size = size;
    msg.textContent = '';
    save();
  });

  drawer.querySelector('.drawer-pay').addEventListener('click', () => {
    const missing = items.find((i) => byId(i.id).sizes.length && !i.size);
    msg.classList.toggle('error', Boolean(missing));
    if (missing) {
      msg.textContent = `Elige la talla de "${byId(missing.id).name}" antes de pagar.`;
      return;
    }
    // Sin pago en línea todavía: el pedido se envía armado por WhatsApp o, si no hay número, por correo
    const cfg = window.KO_CONFIG;
    const lines = items.map((i) => {
      const p = byId(i.id);
      return `- ${i.qty} x ${p.name}${i.size ? ` (talla ${i.size})` : ''}: ${fmt(p.price * i.qty)}`;
    });
    const subtotal = items.reduce((s, i) => s + byId(i.id).price * i.qty, 0);
    const text = `Hola KO Store, quiero hacer este pedido:\n${lines.join('\n')}\nSubtotal: ${fmt(subtotal)}`;
    if (cfg.whatsapp) {
      window.open(window.KOContact.waLink(text), '_blank', 'noopener');
      msg.textContent = 'Abrimos WhatsApp con tu pedido listo. Envíalo y te confirmamos el pago y el despacho.';
    } else {
      location.href = `mailto:${cfg.email}?subject=${encodeURIComponent('Pedido KO Store')}&body=${encodeURIComponent(text)}`;
      msg.textContent = `Abrimos tu correo con el pedido listo. Envíalo a ${cfg.email} y te confirmamos el pago y el despacho.`;
    }
  });

  // ---------- API pública ----------
  window.KOCart = {
    add(id, size = null, { openDrawer = false } = {}) {
      if (!byId(id)) return;
      const line = items.find((i) => i.id === id && i.size === size);
      if (line) line.qty += 1;
      else items.push({ id, size, qty: 1 });
      save();
      if (openDrawer) open();
    },
    open,
    format: fmt,
  };

  render();
})();
