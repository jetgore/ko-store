// KO Store — piezas comunes de los pedidos simulados (no es ruta: empieza con "_").
// Cada pedido se guarda como un issue "[Pedido] KO-0012 Nombre" en el repositorio de pedidos,
// con los datos en <!-- ko-pedido {...} -->. El panel (admin.html → Pedidos) cambia el estado
// reescribiendo el cuerpo del issue con el mismo formato (ver pedidos-comun.js).

const PREFIJO = '[Pedido]';
const fmt = (n) => '$' + Number(n).toLocaleString('es-CL');
const numero = (n) => `KO-${String(n).padStart(4, '0')}`;

// Repositorio donde se guardan los pedidos. Debe ser PRIVADO: los issues llevan nombre,
// correo, teléfono y dirección de quien compra. Sin la variable, no se reciben pedidos.
const repoPedidos = () => process.env.GITHUB_REPO_PEDIDOS || '';

function leer(issue) {
  const m = /<!-- ko-pedido (\{[\s\S]*\}) -->/.exec((issue && issue.body) || '');
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch (e) { return null; }
}

const lineas = (p) => p.items.map((i) =>
  `- ${i.qty} x ${i.name}${i.size ? ` (talla ${i.size})` : ''}: ${fmt(i.price * i.qty)}`);

// Cuerpo del issue: resumen legible en GitHub + datos para el panel
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

// Correo para quien compra, según el estado del pedido
function correo(p, n, enlace) {
  const num = numero(n);
  const intro = {
    recibido: `Recibimos tu pedido ${num}. Lo estamos revisando: te avisaremos cuando confirmemos el pago y el stock.`,
    pagado: `Confirmamos el pago de tu pedido ${num}.`,
    confirmado: `Tu pedido ${num} fue ingresado correctamente. Ahora lo preparamos para el despacho.`,
    boleta: `Emitimos la boleta N° ${p.boleta ? p.boleta.folio : ''} de tu pedido ${num}. Puedes verla e imprimirla en el enlace de más abajo.`,
    despachado: `Tu pedido ${num} fue despachado${p.despacho ? ` con ${p.despacho.transportista}. Número de seguimiento: ${p.despacho.seguimiento}` : ''}.`,
    entregado: `Tu pedido ${num} figura como entregado. ¡Gracias por tu compra!`,
    anulado: `Tu pedido ${num} fue anulado. Si tienes dudas, responde este correo.`,
  }[p.estado] || `Tu pedido ${num} cambió de estado.`;
  const asunto = {
    recibido: `Recibimos tu pedido ${num}`,
    pagado: `Pago confirmado: pedido ${num}`,
    confirmado: `Pedido ${num} ingresado correctamente`,
    boleta: `Boleta de tu pedido ${num}`,
    despachado: `Tu pedido ${num} va en camino`,
    entregado: `Pedido ${num} entregado`,
    anulado: `Pedido ${num} anulado`,
  }[p.estado] || `Tu pedido ${num}`;
  const text = [
    `Hola ${p.cliente.nombre}:`,
    '',
    intro,
    '',
    ...lineas(p),
    `Total: ${fmt(p.total)}`,
    '',
    `Sigue tu pedido aquí: ${enlace}`,
    '',
    '—',
    'KO Store. Esta es una compra simulada: no se cobró dinero real ni se despachan productos.',
  ].join('\n');
  return { subject: `${asunto} | KO Store (simulación)`, text };
}

// Dirección de la página de seguimiento para quien compra
function enlaceSeguimiento(req, n, clave) {
  const host = req.headers['x-forwarded-host'] || req.headers.host || '';
  const proto = /^(localhost|127\.0\.0\.1)(:|$)/.test(host) ? 'http' : 'https';
  return `${proto}://${host}/pedido.html?n=${n}&c=${clave}`;
}

module.exports = { PREFIJO, fmt, numero, repoPedidos, leer, lineas, cuerpo, correo, enlaceSeguimiento };
