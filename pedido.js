// KO Store — seguimiento de un pedido simulado (pedido.html?n=12&c=clave).
// Muestra el estado, el detalle, la boleta (cuando el panel la emite) y el despacho.
// Sin parámetros, lista los pedidos hechos desde este navegador.

(function () {
  const K = window.KOPedidos;
  const { esc, fmt } = K;
  const box = document.getElementById('pedido');
  const lead = document.getElementById('pedLead');
  const params = new URLSearchParams(location.search);
  const n = params.get('n');
  const c = params.get('c');

  function guardados() {
    try {
      const list = JSON.parse(localStorage.getItem('ko-pedidos'));
      return Array.isArray(list) ? list : [];
    } catch (e) { return []; }
  }

  function sinPedido(texto) {
    lead.textContent = texto;
    const list = guardados();
    box.innerHTML = `
      ${list.length ? `
        <h2 class="ped-h">Pedidos hechos desde este navegador</h2>
        <ul class="ped-guardados">${list.map((p) =>
          `<li><a href="pedido.html?n=${encodeURIComponent(p.n)}&c=${encodeURIComponent(p.c)}">Pedido ${esc(K.numero(p.n))}</a></li>`).join('')}</ul>` : ''}
      <a href="tienda.html" class="btn btn-primary">Ir a la tienda</a>`;
  }

  function pasos(p) {
    if (p.estado === 'anulado') {
      return '<p class="ped-anulado">Este pedido fue anulado.</p>';
    }
    const actual = K.PASOS.indexOf(p.estado);
    const cuando = (estado) => {
      const h = (p.historial || []).find((x) => x.estado === estado);
      return h ? K.fecha(h.fecha, true) : '';
    };
    return `<ol class="ped-pasos">${K.PASOS.map((estado, i) => `
      <li class="${i < actual ? 'hecho' : i === actual ? 'hecho actual' : ''}"${i === actual ? ' aria-current="step"' : ''}>
        <span class="ped-paso">${esc(K.ESTADOS[estado])}</span>
        <span class="ped-cuando">${i <= actual ? esc(cuando(estado)) : 'Pendiente'}</span>
      </li>`).join('')}</ol>`;
  }

  function draw(p, num) {
    document.getElementById('pedTitulo').textContent = `Pedido ${num}`;
    document.title = `Pedido ${num} | KO Store`;
    lead.textContent = `${K.ESTADOS[p.estado] || p.estado} · Ingresado el ${K.fecha(p.fecha, true)}`;
    box.innerHTML = `
      <div class="ped-grid">
        <div class="ped-col">
          <h2 class="ped-h">Estado</h2>
          ${pasos(p)}
          <button type="button" class="btn btn-ghost btn-update" id="pedActualizar">Actualizar estado</button>
          ${p.despacho ? `
            <h2 class="ped-h">Despacho</h2>
            <dl class="ped-datos">
              <div><dt>Transportista</dt><dd>${esc(p.despacho.transportista)}</dd></div>
              <div><dt>N° de seguimiento</dt><dd>${esc(p.despacho.seguimiento)}</dd></div>
              <div><dt>Despachado</dt><dd>${esc(K.fecha(p.despacho.fecha, true))}</dd></div>
            </dl>
            <p class="ped-nota">Despacho ficticio: el número de seguimiento no corresponde a un envío real.</p>` : ''}
        </div>
        <div class="ped-col">
          <h2 class="ped-h">Detalle</h2>
          ${K.tablaItems(p)}
          <dl class="ped-datos">
            <div><dt>Envío</dt><dd>${esc(K.envioTexto(p))}</dd></div>
            <div class="total"><dt>Total</dt><dd>${fmt(p.total)}</dd></div>
            <div><dt>Medio de pago</dt><dd>${esc(K.MEDIOS[p.pago.medio] || p.pago.medio)}</dd></div>
            <div><dt>Despacho a</dt><dd>${esc(`${p.cliente.direccion}, ${p.cliente.comuna}, ${p.cliente.region}`)}</dd></div>
            <div><dt>Avisos a</dt><dd>${esc(p.cliente.email)}</dd></div>
          </dl>
        </div>
      </div>
      ${p.boleta ? `
        <div class="ped-boleta" id="boleta">
          <div class="ped-boleta-head">
            <h2 class="ped-h">Boleta</h2>
            <button type="button" class="btn btn-ghost" id="pedImprimir">Imprimir boleta</button>
          </div>
          ${K.boletaHtml(p, n)}
        </div>` : ''}`;
    document.getElementById('pedActualizar').addEventListener('click', load);
    const imprimir = document.getElementById('pedImprimir');
    if (imprimir) imprimir.addEventListener('click', () => window.print());
  }

  async function load() {
    const btn = document.getElementById('pedActualizar');
    if (btn) { btn.disabled = true; btn.textContent = 'Actualizando…'; }
    try {
      const res = await fetch(`/api/pedidos?n=${encodeURIComponent(n)}&c=${encodeURIComponent(c)}`, { cache: 'no-store' });
      const out = await res.json().catch(() => ({}));
      if (!res.ok || !out.ok) throw new Error(out.error || '');
      draw(out.pedido, out.numero);
    } catch (err) {
      sinPedido(`${err.message || 'No pudimos cargar tu pedido.'} Si necesitas ayuda, escríbenos a ${window.KO_CONFIG.email}.`);
    }
  }

  if (n && c) load();
  else sinPedido('Abre el enlace que te mostramos al terminar tu compra para ver el estado de tu pedido.');
})();
