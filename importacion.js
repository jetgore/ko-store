/* KO Store — simulador de importación (pestaña "Importación" de admin.html).
   Calcula el costo puesto en Chile y el margen de cada producto. No publica nada:
   el pedido en curso y los escenarios se guardan solo en localStorage (ko-importacion). */
(function () {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const KEY = 'ko-importacion';
  const IVA = 0.19;

  // Pedido de ejemplo: cotización de Woosung Sports (Alibaba), tope de cada rango de precio, noviembre 2026.
  // Flete y agente son estimaciones: reemplazarlos por cotizaciones reales.
  const EJEMPLO = {
    params: { proveedor: 'Woosung Sports (Alibaba)', tc: 960, flete: 600, seguro: 2, arancel: 0, agente: 300, banco: 50, local: 0, objetivo: 50 },
    items: [
      { name: 'Dobok de entrenamiento', qty: 50, fob: 6.5, venta: 24990 },
      { name: 'Dobok de combate', qty: 50, fob: 7, venta: 34990 },
      { name: 'Pechera reversible', qty: 20, fob: 8.5, venta: 29990 },
      { name: 'Cabezal', qty: 20, fob: 7.9, venta: 27990 },
      { name: 'Antebraceras (par)', qty: 50, fob: 3.7, venta: 14990 },
      { name: 'Canilleras con empeine (par)', qty: 50, fob: 6.5, venta: 16990 },
      { name: 'Guantes (par)', qty: 100, fob: 5.6, venta: 13990 },
      { name: 'Protector bucal', qty: 200, fob: 1, venta: 3990 },
    ],
  };
  const copia = (o) => JSON.parse(JSON.stringify(o));

  // ---------- Guardado local ----------
  function leer() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
  }
  function escribir(data) {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* sin almacenamiento: el simulador sigue funcionando */ }
  }
  const datos = leer();
  datos.escenarios = datos.escenarios || {};
  let actual = datos.actual || copia(EJEMPLO);
  let nombreActual = datos.nombre || '';
  const guardar = () => { datos.actual = actual; datos.nombre = nombreActual; escribir(datos); };

  // ---------- Formato ----------
  const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) && n > 0 ? n : 0; };
  const clp = (n) => '$' + Math.round(n).toLocaleString('es-CL');
  const usd = (n) => 'US$' + n.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  const pct = (n) => Math.round(n * 100) + ' %';
  // Precio sugerido terminado en 990, como los del sitio
  const redondear990 = (n) => Math.ceil((n + 10) / 1000) * 1000 - 10;

  // ---------- Cálculo ----------
  function calcular() {
    const p = actual.params;
    const tc = num(p.tc);
    const fob = actual.items.reduce((s, it) => s + num(it.qty) * num(it.fob), 0);
    const seguro = fob * num(p.seguro) / 100;
    const cif = fob + num(p.flete) + seguro;
    const arancel = cif * num(p.arancel) / 100;
    const ivaImport = (cif + arancel) * IVA * tc;
    const totalUsd = cif + arancel + num(p.agente) + num(p.banco);
    const total = totalUsd * tc + num(p.local);
    // Cuántos pesos cuesta en Chile cada peso de FOB (reparto por valor)
    const factor = fob > 0 && tc > 0 ? total / (fob * tc) : 0;
    const objetivo = Math.min(num(p.objetivo), 95) / 100;

    let ventaNeta = 0, unidades = 0;
    const filas = actual.items.map((it) => {
      const qty = num(it.qty);
      const costo = num(it.fob) * tc * factor;
      const neto = num(it.venta) / (1 + IVA);
      ventaNeta += qty * neto;
      unidades += qty;
      return {
        costo,
        margen: neto > 0 ? (neto - costo) / neto : null,
        sugerido: costo > 0 ? redondear990(costo / (1 - objetivo) * (1 + IVA)) : 0,
      };
    });
    return { fob, seguro, cif, arancel, ivaImport, total, factor, ventaNeta, unidades, filas, objetivo };
  }

  // ---------- Dibujo ----------
  function drawParams() {
    document.querySelectorAll('#importacion [data-param]').forEach((el) => {
      el.value = actual.params[el.dataset.param] ?? '';
    });
  }

  function drawRows() {
    $('simRows').innerHTML = actual.items.map((it, i) => `
      <tr data-i="${i}">
        <td data-label="Producto"><input class="sim-name" data-f="name" value="${esc(it.name)}" aria-label="Producto"></td>
        <td data-label="Cantidad"><input type="number" inputmode="numeric" min="0" step="1" data-f="qty" value="${esc(it.qty)}" aria-label="Cantidad de ${esc(it.name)}"></td>
        <td data-label="FOB (US$)"><input type="number" inputmode="decimal" min="0" step="any" data-f="fob" value="${esc(it.fob)}" aria-label="FOB unitario en dólares de ${esc(it.name)}"></td>
        <td data-label="Venta (CLP)"><input type="number" inputmode="numeric" min="0" step="10" data-f="venta" value="${esc(it.venta)}" aria-label="Precio de venta con IVA de ${esc(it.name)}"></td>
        <td data-label="Costo unitario" class="sim-out" data-o="costo"></td>
        <td data-label="Margen" class="sim-out" data-o="margen"></td>
        <td data-label="Precio sugerido" class="sim-out" data-o="sugerido"></td>
        <td class="sim-del"><button type="button" class="link-btn danger" data-quitar aria-label="Quitar ${esc(it.name)}">Quitar</button></td>
      </tr>`).join('') || '<tr><td colspan="8" class="empty">Sin productos. Agrega uno para empezar.</td></tr>';
  }

  function drawResultados() {
    const r = calcular();
    const p = actual.params;
    const util = r.ventaNeta - r.total;
    const filasResumen = [
      ['FOB total', usd(r.fob)],
      ['Seguro', usd(r.seguro)],
      ['CIF (FOB + flete + seguro)', usd(r.cif)],
      ['Arancel', usd(r.arancel)],
      [`Total puesto en bodega${p.tc ? '' : ' (falta el dólar)'}`, clp(r.total), 'sim-total'],
      ['Cada US$1 de FOB termina costando', r.factor ? `US$${r.factor.toLocaleString('es-CL', { maximumFractionDigits: 2 })}` : '—'],
      ['IVA de importación (crédito fiscal)', clp(r.ivaImport)],
      ['Unidades', Math.round(r.unidades).toLocaleString('es-CL')],
      ['Venta neta si se vende todo', clp(r.ventaNeta)],
      ['Utilidad bruta', clp(util), util < 0 ? 'neg' : 'pos'],
      ['Margen global', r.ventaNeta > 0 ? pct(util / r.ventaNeta) : '—', util < 0 ? 'neg' : 'pos'],
    ];
    $('simResumen').innerHTML = filasResumen.map(([k, v, cls]) =>
      `<div class="${cls || ''}"><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('');

    $('simRows').querySelectorAll('tr[data-i]').forEach((tr) => {
      const f = r.filas[+tr.dataset.i];
      const out = (o) => tr.querySelector(`[data-o="${o}"]`);
      out('costo').textContent = f.costo ? clp(f.costo) : '—';
      const m = out('margen');
      m.textContent = f.margen === null ? '—' : pct(f.margen);
      m.className = 'sim-out ' + (f.margen === null ? '' : f.margen < 0 ? 'neg' : f.margen < r.objetivo ? 'warn' : 'pos');
      out('sugerido').textContent = f.sugerido ? clp(f.sugerido) : '—';
    });
  }

  function drawEscenarios() {
    const nombres = Object.keys(datos.escenarios).sort((a, b) => a.localeCompare(b, 'es'));
    $('simEscenario').innerHTML = '<option value="">Pedido en curso</option>' +
      nombres.map((n) => `<option value="${esc(n)}"${n === nombreActual ? ' selected' : ''}>${esc(n)}</option>`).join('');
    $('simBorrar').hidden = !nombreActual;
  }

  function drawTodo() { drawParams(); drawRows(); drawResultados(); drawEscenarios(); }

  // ---------- Eventos ----------
  $('importacion').addEventListener('input', (e) => {
    const el = e.target;
    if (el.dataset.param) {
      actual.params[el.dataset.param] = el.value;
    } else if (el.dataset.f) {
      const it = actual.items[+el.closest('tr').dataset.i];
      it[el.dataset.f] = el.dataset.f === 'name' ? el.value : el.value === '' ? '' : Number(el.value);
    } else return;
    guardar();
    drawResultados();
  });

  $('simRows').addEventListener('click', (e) => {
    if (!e.target.closest('[data-quitar]')) return;
    actual.items.splice(+e.target.closest('tr').dataset.i, 1);
    guardar();
    drawRows();
    drawResultados();
  });

  $('simAgregar').addEventListener('click', () => {
    actual.items.push({ name: '', qty: 50, fob: '', venta: '' });
    guardar();
    drawRows();
    drawResultados();
    const inputs = $('simRows').querySelectorAll('.sim-name');
    inputs[inputs.length - 1]?.focus();
  });

  $('simReset').addEventListener('click', () => {
    if (!confirm('¿Reemplazar el pedido en curso por el pedido de ejemplo?')) return;
    actual = copia(EJEMPLO);
    nombreActual = '';
    guardar();
    drawTodo();
  });

  $('simGuardar').addEventListener('click', () => {
    const n = (prompt('Nombre del escenario (ej: Woosung con flete aéreo):', nombreActual) || '').trim();
    if (!n) return;
    if (datos.escenarios[n] && n !== nombreActual && !confirm(`Ya existe "${n}". ¿Reemplazarlo?`)) return;
    datos.escenarios[n] = copia(actual);
    nombreActual = n;
    guardar();
    drawEscenarios();
  });

  $('simEscenario').addEventListener('change', (e) => {
    const n = e.target.value;
    if (!n) { nombreActual = ''; guardar(); drawEscenarios(); return; }
    actual = copia(datos.escenarios[n]);
    nombreActual = n;
    guardar();
    drawTodo();
  });

  $('simBorrar').addEventListener('click', () => {
    if (!nombreActual || !confirm(`¿Borrar el escenario "${nombreActual}"? El pedido en curso no cambia.`)) return;
    delete datos.escenarios[nombreActual];
    nombreActual = '';
    guardar();
    drawEscenarios();
  });

  drawTodo();
})();
