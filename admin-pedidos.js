// KO Store — panel de pedidos simulados (admin.html → Pedidos y → Boleta y despacho).
// checkout.html crea cada pedido (api/pedidos.js) como un issue "[Pedido] Nombre" en el
// repositorio privado KO_CONFIG.repoPedidos. Aquí se avanza por las etapas reescribiendo
// el issue: revisar stock → confirmar pago → confirmar pedido (descuenta stock y avisa a
// quien compró) → emitir boleta → registrar despacho → entregado. Todo es simulado.

(function () {
  const A = window.KOAdmin;
  const K = window.KOPedidos;
  const cfg = window.KO_CONFIG;
  const REPO = cfg.repoPedidos || '';
  const PREFIJO = '[Pedido]';
  const { esc, fmt } = K;
  const $ = (id) => document.getElementById(id);

  let pedidos = []; // { n, ...datos del pedido }

  $('repoPedidosName').textContent = REPO || '(sin configurar)';

  // ---------- Carga ----------
  async function cargar() {
    $('pedError').textContent = '';
    try {
      if (!REPO) throw Object.assign(new Error('sin repositorio'), { status: 404 });
      // Solo issues creados por la cuenta dueña (la del token de la función de Vercel)
      const owner = REPO.split('/')[0];
      const issues = await A.ghRepo(REPO, `/issues?state=all&creator=${encodeURIComponent(owner)}&per_page=100`);
      pedidos = issues
        .filter((i) => !i.pull_request && i.title.startsWith(PREFIJO))
        .map((i) => {
          const p = K.leer(i);
          return p && Array.isArray(p.items) && p.cliente ? { n: i.number, ...p } : null;
        })
        .filter(Boolean);
    } catch (err) {
      pedidos = [];
      $('pedError').textContent = err.status === 403 || err.status === 404
        ? `No se pudo abrir el repositorio de pedidos ${REPO}. Créalo como repositorio privado y dale a tu token "Issues: Read and write" sobre él (ver "Cómo crear el token" al entrar).`
        : err.status === 401 ? 'Tu token expiró. Sal y vuelve a entrar.'
          : 'No se pudieron cargar los pedidos. Revisa tu conexión y presiona "Actualizar".';
    }
    render();
  }

  // ---------- Vista ----------
  const enEstado = (...estados) => pedidos.filter((p) => estados.includes(p.estado));
  const antiguosPrimero = (a, b) => a.n - b.n;

  // Stock del producto frente a lo que pide la línea
  function stockDe(i) {
    const prod = A.products().find((x) => x.id === i.id);
    if (!prod) return '<span class="stock-mal">Ya no existe</span>';
    if (!Number.isInteger(prod.stock)) return '<span class="stock-nd">Sin control</span>';
    return `<span class="${prod.stock >= i.qty ? 'stock-ok' : 'stock-mal'}">${prod.stock} en stock</span>`;
  }

  const enlaceComprador = (p, texto, ancla = '') =>
    `<a class="link-btn" href="pedido.html?n=${p.n}&c=${encodeURIComponent(p.clave)}${ancla}" target="_blank" rel="noopener">${texto}</a>`;

  function acciones(p) {
    const anular = '<button type="button" class="link-btn danger" data-ped="anular">Anular pedido</button>';
    if (p.estado === 'recibido') {
      return `<button type="button" class="btn btn-primary btn-sm" data-ped="pago">Confirmar pago (simulado)</button>${anular}`;
    }
    if (p.estado === 'pagado') {
      return `<button type="button" class="btn btn-primary btn-sm" data-ped="confirmar">Confirmar pedido y avisar</button>${anular}`;
    }
    if (p.estado === 'confirmado') {
      return `<button type="button" class="btn btn-primary btn-sm" data-ped="boleta">Emitir boleta</button>${anular}`;
    }
    if (p.estado === 'boleta') {
      return `
        <div class="desp-form">
          <div class="field">
            <label for="desp-t-${p.n}">Transportista</label>
            <input id="desp-t-${p.n}" data-campo="transportista" maxlength="60" placeholder="Ej: retiro en tienda, courier…">
          </div>
          <div class="field">
            <label for="desp-s-${p.n}">N° de seguimiento (ficticio)</label>
            <input id="desp-s-${p.n}" data-campo="seguimiento" maxlength="40" value="SIM-${p.n}-${Math.random().toString(36).slice(2, 8).toUpperCase()}">
          </div>
          <button type="button" class="btn btn-primary btn-sm" data-ped="despachar">Registrar despacho</button>
        </div>
        ${enlaceComprador(p, `Ver boleta N° ${p.boleta.folio}`, '#boleta')}`;
    }
    if (p.estado === 'despachado') {
      return `<button type="button" class="btn btn-primary btn-sm" data-ped="entregar">Marcar como entregado</button>
        ${enlaceComprador(p, `Ver boleta N° ${p.boleta.folio}`, '#boleta')}`;
    }
    return '';
  }

  function tarjeta(p) {
    const revision = p.estado === 'recibido' || p.estado === 'pagado';
    return `
      <li class="com-item ped-card" data-n="${p.n}">
        <div class="ped-top">
          <p class="ped-num">${esc(K.numero(p.n))}</p>
          <span class="ped-estado ped-e-${esc(p.estado)}">${esc(K.ESTADOS[p.estado] || p.estado)}</span>
          <span class="ped-fecha">${esc(K.fecha(p.fecha, true))}</span>
        </div>
        <p class="com-meta"><strong>${esc(p.cliente.nombre)}</strong> · ${esc(p.cliente.email)} · ${esc(p.cliente.telefono)}</p>
        <p class="com-meta">${esc(`${p.cliente.direccion}, ${p.cliente.comuna}, ${p.cliente.region}`)}</p>
        ${p.notas ? `<p class="com-meta">Indicaciones: ${esc(p.notas)}</p>` : ''}
        ${K.tablaItems(p, revision ? { extra: stockDe, extraTitulo: 'Stock' } : {})}
        <p class="ped-total">Envío: ${esc(K.envioTexto(p))} · Total: <strong>${fmt(p.total)}</strong> · ${esc(K.MEDIOS[p.pago.medio] || p.pago.medio)}${p.pago.confirmado ? `, pago confirmado el ${esc(K.fecha(p.pago.confirmado))}` : ', pago por confirmar'}</p>
        ${p.despacho ? `<p class="com-meta">Despacho: ${esc(p.despacho.transportista)} · ${esc(p.despacho.seguimiento)}</p>` : ''}
        <div class="com-actions">${acciones(p)}${enlaceComprador(p, 'Ver como comprador')}</div>
      </li>`;
  }

  const lista = (id, items, vacio) => {
    $(id).innerHTML = items.map(tarjeta).join('') || `<li class="com-empty">${vacio}</li>`;
  };

  function render() {
    const revision = enEstado('recibido', 'pagado').sort(antiguosPrimero);
    const porBoleta = enEstado('confirmado').sort(antiguosPrimero);
    const porDespachar = enEstado('boleta').sort(antiguosPrimero);
    const enCamino = enEstado('despachado').sort(antiguosPrimero);
    const cerrados = enEstado('entregado', 'anulado');

    $('pedSummary').textContent = `${revision.length} por revisar · ${cerrados.length} cerrados`;
    $('despSummary').textContent = `${porBoleta.length} por emitir boleta · ${porDespachar.length} por despachar · ${enCamino.length} en camino`;
    const cuenta = (id, num) => { $(id).textContent = num; $(id).hidden = !num; };
    cuenta('pedCount', revision.length);
    cuenta('despCount', porBoleta.length + porDespachar.length);

    lista('pedRevision', revision, 'No hay pedidos por revisar.');
    lista('pedCerrados', cerrados, 'Todavía no hay pedidos cerrados.');
    lista('despBoleta', porBoleta, 'No hay pedidos esperando boleta.');
    lista('despEnvio', porDespachar, 'No hay pedidos por despachar.');
    lista('despCamino', enCamino, 'No hay despachos en camino.');
  }

  // ---------- Cambios de estado ----------
  // Correo de aviso a quien compró (api/pedido-aviso.js). Devuelve false si no se pudo enviar.
  async function avisar(n) {
    try {
      const res = await fetch('/api/pedido-aviso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${A.token()}` },
        body: JSON.stringify({ n }),
      });
      const out = await res.json().catch(() => ({}));
      return res.ok && out.ok === true;
    } catch (e) {
      return false;
    }
  }

  async function guardar(p, estado, extra = {}) {
    const { n, ...datos } = p;
    const ahora = new Date().toISOString();
    const nuevo = { ...datos, ...extra, estado, historial: [...(datos.historial || []), { estado, fecha: ahora }] };
    const cierre = estado === 'entregado' ? { state: 'closed', state_reason: 'completed' }
      : estado === 'anulado' ? { state: 'closed', state_reason: 'not_planned' } : {};
    await A.ghRepo(REPO, `/issues/${n}`, { method: 'PATCH', body: JSON.stringify({ body: K.cuerpo(nuevo), ...cierre }) });
  }

  const ahora = () => new Date().toISOString();
  const controlados = (p) => p.items.filter((i) => {
    const prod = A.products().find((x) => x.id === i.id);
    return prod && Number.isInteger(prod.stock);
  });

  // Cada acción devuelve el texto del aviso, o null si se canceló
  const ACCIONES = {
    async pago(p) {
      await guardar(p, 'pagado', { pago: { ...p.pago, confirmado: ahora() } });
      return 'Pago confirmado (simulado)';
    },

    async confirmar(p) {
      const conStock = controlados(p);
      const falta = conStock.filter((i) => A.products().find((x) => x.id === i.id).stock < i.qty);
      if (falta.length && !confirm(`No alcanza el stock de: ${falta.map((i) => i.name).join(', ')}. ¿Confirmar el pedido igual?`)) return null;
      const num = K.numero(p.n);
      // Lista de { id, qty } que se descontó de verdad; se guarda en el pedido por si se anula
      const descontado = conStock.length
        ? await A.ajustarStock(p.items, -1, `Descuenta stock del pedido ${num}`) : [];
      try {
        await guardar(p, 'confirmado', { stockDescontado: descontado.length ? descontado : false });
      } catch (err) {
        // El pedido no cambió de estado: se devuelve el stock para no descontarlo dos veces
        if (descontado.length) await A.ajustarStock(descontado, 1, `Repone stock del pedido ${num}`).catch(() => {});
        throw err;
      }
      return descontado.length ? 'Pedido confirmado y stock descontado' : 'Pedido confirmado';
    },

    async boleta(p) {
      const folio = pedidos.reduce((max, x) => Math.max(max, (x.boleta && x.boleta.folio) || 0), 0) + 1;
      await guardar(p, 'boleta', { boleta: K.calcularBoleta(p, folio) });
      return `Boleta N° ${folio} emitida (simulada)`;
    },

    async despachar(p, card) {
      const transportista = card.querySelector('[data-campo="transportista"]').value.trim();
      const seguimiento = card.querySelector('[data-campo="seguimiento"]').value.trim();
      if (!transportista || !seguimiento) {
        A.toast('Escribe el transportista y el número de seguimiento.', true);
        return null;
      }
      await guardar(p, 'despachado', { despacho: { transportista, seguimiento, fecha: ahora() } });
      return 'Despacho registrado (ficticio)';
    },

    async entregar(p) {
      await guardar(p, 'entregado');
      return 'Pedido entregado y cerrado';
    },

    async anular(p) {
      const num = K.numero(p.n);
      if (!confirm(`¿Anular el pedido ${num} de ${p.cliente.nombre}?`)) return null;
      if (p.stockDescontado) await A.ajustarStock(p.stockDescontado, 1, `Repone stock del pedido ${num} (anulado)`);
      await guardar(p, 'anulado', { stockDescontado: false });
      return p.stockDescontado ? 'Pedido anulado y stock repuesto' : 'Pedido anulado';
    },
  };

  async function onClick(e) {
    if (e.target.closest('[data-ped-reload]')) return void cargar();
    const btn = e.target.closest('button[data-ped]');
    if (!btn) return;
    const card = btn.closest('.ped-card');
    const p = pedidos.find((x) => x.n === Number(card.dataset.n));
    if (!p) return;
    const texto = btn.textContent;
    card.querySelectorAll('button').forEach((b) => { b.disabled = true; });
    btn.textContent = 'Guardando…';
    let hecho = null;
    let fallo = false;
    try {
      hecho = await ACCIONES[btn.dataset.ped](p, card);
      if (hecho) {
        const avisado = await avisar(p.n);
        A.toast(`${hecho}. ${avisado
          ? `Se avisó por correo a ${p.cliente.email}.`
          : 'No se pudo enviar el correo de aviso; quien compró ve el cambio en su página de seguimiento.'}`);
      }
    } catch (err) {
      fallo = !err.dirty;
      if (err.dirty) A.toast('Publica o descarta los cambios de productos antes de mover stock desde un pedido.', true);
      else if (err.status === 401) A.toast('Tu token expiró. Sal y vuelve a entrar.', true);
      else if (err.status === 403 || err.status === 404) A.toast('El token no tiene permiso para esta acción (necesita Contents e Issues en Read and write, también sobre el repositorio de pedidos).', true);
      else if (err.status === 409 || err.status === 422) A.toast('Los datos cambiaron mientras tanto. Presiona "Actualizar" e intenta de nuevo.', true);
      else A.toast('No se pudo guardar. Revisa tu conexión e intenta de nuevo.', true);
    }
    // Si se guardó (o falló a medias), se vuelve a leer desde GitHub; si se canceló, se deja como estaba
    if (hecho || fallo) return void cargar();
    card.querySelectorAll('button').forEach((b) => { b.disabled = false; });
    btn.textContent = texto;
  }

  $('pedidos').addEventListener('click', onClick);
  $('despachos').addEventListener('click', onClick);
  document.addEventListener('ko-admin-entra', cargar);
})();
