// KO Store — piezas de los pedidos simulados compartidas por la página de seguimiento
// (pedido.html) y el panel (admin.html): estados, formatos y la boleta.
// El formato del issue debe coincidir con api/_pedidos.js.

(function () {
  const cfg = window.KO_CONFIG;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const fmt = (n) => '$' + Number(n).toLocaleString('es-CL');
  const numero = (n) => `KO-${String(n).padStart(4, '0')}`;
  const fecha = (iso, conHora = false) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })
      + (conHora ? `, ${d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}` : '');
  };

  // Etapas en orden. "anulado" queda fuera de la línea de avance.
  const PASOS = ['recibido', 'pagado', 'confirmado', 'boleta', 'despachado', 'entregado'];
  const ESTADOS = {
    recibido: 'Pedido recibido',
    pagado: 'Pago confirmado',
    confirmado: 'Pedido confirmado',
    boleta: 'Boleta emitida',
    despachado: 'Despachado',
    entregado: 'Entregado',
    anulado: 'Anulado',
  };
  const MEDIOS = { webpay: 'Webpay (simulado)', transferencia: 'Transferencia (simulada)' };

  const lineas = (p) => p.items.map((i) =>
    `- ${i.qty} x ${i.name}${i.size ? ` (talla ${i.size})` : ''}: ${fmt(i.price * i.qty)}`);

  function leer(issue) {
    const m = /<!-- ko-pedido (\{[\s\S]*\}) -->/.exec((issue && issue.body) || '');
    if (!m) return null;
    try { return JSON.parse(m[1]); } catch (e) { return null; }
  }

  // Mismo formato que api/_pedidos.js
  function cuerpo(p) {
    const datos = JSON.stringify(p).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
    const vista = [
      `Estado: ${p.estado}`,
      `${p.cliente.nombre} · ${p.cliente.email} · ${p.cliente.telefono}`,
      `${p.cliente.direccion}, ${p.cliente.comuna}, ${p.cliente.region}`,
      '',
      ...lineas(p),
      `Total: ${fmt(p.total)}`,
    ].join('\n').replace(/`{3,}/g, "'''");
    return `Pedido simulado desde la web (sin cobro real). Se gestiona en admin.html → Pedidos.\n\n\`\`\`text\n${vista}\n\`\`\`\n\n<!-- ko-pedido ${datos} -->\n`;
  }

  // Tabla con las líneas del pedido. extra(i) agrega una celda por línea (el panel muestra el stock).
  function tablaItems(p, { extra = null, extraTitulo = '' } = {}) {
    return `
      <table class="ped-items">
        <thead><tr>
          <th scope="col">Producto</th><th scope="col">Cant.</th>
          ${extra ? `<th scope="col">${esc(extraTitulo)}</th>` : ''}
          <th scope="col">Precio</th>
        </tr></thead>
        <tbody>${p.items.map((i) => `
          <tr>
            <td>${esc(i.name)}${i.size ? ` <span class="ped-talla">Talla ${esc(i.size)}</span>` : ''}</td>
            <td>${i.qty}</td>
            ${extra ? `<td>${extra(i)}</td>` : ''}
            <td>${fmt(i.price * i.qty)}</td>
          </tr>`).join('')}</tbody>
      </table>`;
  }

  const envioTexto = (p) => (p.envio === 0 ? 'Gratis' : p.envio ? fmt(p.envio) : 'Por confirmar');

  // Boleta simulada: los precios incluyen IVA (19 %)
  function calcularBoleta(p, folio) {
    const neto = Math.round(p.total / 1.19);
    return { folio, fecha: new Date().toISOString(), neto, iva: p.total - neto, total: p.total };
  }

  function boletaHtml(p, n) {
    const b = p.boleta;
    const e = cfg.boleta || {};
    const emisor = [e.rut ? `RUT ${e.rut}` : '', e.giro, e.direccion].filter(Boolean).map(esc).join(' · ');
    return `
      <article class="boleta" aria-label="Boleta número ${b.folio}">
        <header class="boleta-head">
          <div>
            <p class="boleta-emisor">${esc(e.razonSocial || 'KO Store')}</p>
            ${emisor ? `<p class="boleta-dato">${emisor}</p>` : ''}
          </div>
          <div class="boleta-folio">
            <p>Boleta electrónica</p>
            <p><strong>N° ${String(b.folio).padStart(6, '0')}</strong></p>
          </div>
        </header>
        <p class="boleta-aviso">Documento simulado, sin validez tributaria</p>
        <dl class="boleta-datos">
          <div><dt>Fecha de emisión</dt><dd>${esc(fecha(b.fecha))}</dd></div>
          <div><dt>Pedido</dt><dd>${esc(numero(n))}</dd></div>
          <div><dt>Cliente</dt><dd>${esc(p.cliente.nombre)}</dd></div>
          <div><dt>Medio de pago</dt><dd>${esc(MEDIOS[p.pago.medio] || p.pago.medio)}</dd></div>
        </dl>
        ${tablaItems(p)}
        <dl class="boleta-totales">
          <div><dt>Neto</dt><dd>${fmt(b.neto)}</dd></div>
          <div><dt>IVA (19 %)</dt><dd>${fmt(b.iva)}</dd></div>
          <div class="total"><dt>Total</dt><dd>${fmt(b.total)}</dd></div>
        </dl>
      </article>`;
  }

  window.KOPedidos = {
    esc, fmt, numero, fecha, PASOS, ESTADOS, MEDIOS,
    leer, cuerpo, tablaItems, envioTexto, calcularBoleta, boletaHtml,
  };
})();
