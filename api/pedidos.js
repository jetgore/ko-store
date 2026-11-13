// KO Store — pedidos simulados (sin cobro real).
//   POST /api/pedidos            crea el pedido desde checkout.html
//   GET  /api/pedidos?n=12&c=…   devuelve el estado del pedido a quien compra (pedido.html)
// Cada pedido queda como un issue en el repositorio PRIVADO de pedidos y se gestiona en
// admin.html → Pedidos (revisión, pago, confirmación) y → Boleta y despacho.
// Variables de entorno en Vercel:
//   GITHUB_TOKEN          token fine-grained del dueño con "Issues: Read and write" sobre el repo de pedidos
//   GITHUB_REPO_PEDIDOS   repositorio privado de pedidos, por ejemplo "jetgore/ko-store-pedidos"
//   RESEND_API_KEY, CONTACTO_EMAIL, CONTACTO_REMITENTE   opcionales: correos de aviso

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { limpiar, emailValido, revisarEnvio, ghHeaders, enviarCorreo } = require('./_lib');
const P = require('./_pedidos');

const MAX_ABIERTOS = 100; // pedidos sin cerrar antes de dejar de recibir (freno al spam)
const MAX_LINEAS = 30;
const MAX_UNIDADES = 20;  // por línea
const ENVIO_GRATIS = 60000;
const RM = 'Metropolitana de Santiago';
const MEDIOS = ['webpay', 'transferencia'];
const REGIONES = [
  'Arica y Parinacota', 'Tarapacá', 'Antofagasta', 'Atacama', 'Coquimbo', 'Valparaíso',
  RM, "O'Higgins", 'Maule', 'Ñuble', 'Biobío', 'La Araucanía', 'Los Ríos', 'Los Lagos',
  'Aysén', 'Magallanes',
];

// Productos publicados: los precios se toman de aquí, nunca de lo que manda el navegador
async function catalogo(req) {
  let text;
  try {
    text = fs.readFileSync(path.join(__dirname, '..', 'productos.js'), 'utf8');
  } catch (e) {
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const r = await fetch(`https://${host}/productos.js`);
    if (!r.ok) throw new Error(`No se pudo leer productos.js (${r.status})`);
    text = await r.text();
  }
  const start = text.indexOf('[', text.indexOf('KO_PRODUCTOS'));
  return JSON.parse(text.slice(start, text.lastIndexOf(']') + 1)).filter((p) => p.activo !== false);
}

// Estado del pedido para quien compra: necesita el número y la clave del enlace
async function consultar(req, res, repo, token) {
  res.setHeader('Cache-Control', 'no-store');
  const noEsta = () => res.status(404).json({ ok: false, error: 'No encontramos ese pedido. Revisa el enlace.' });
  const n = Number(req.query && req.query.n);
  const clave = String((req.query && req.query.c) || '');
  if (!Number.isInteger(n) || n < 1 || !/^[a-f0-9]{24}$/.test(clave)) return noEsta();
  try {
    const r = await fetch(`https://api.github.com/repos/${repo}/issues/${n}`, { headers: ghHeaders(token) });
    if (!r.ok) return noEsta();
    const issue = await r.json();
    const p = P.leer(issue);
    const owner = repo.split('/')[0].toLowerCase();
    if (!p || !issue.user || String(issue.user.login).toLowerCase() !== owner) return noEsta();
    const a = Buffer.from(String(p.clave || ''));
    const b = Buffer.from(clave);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return noEsta();
    const { clave: _, stockDescontado: __, ...publico } = p;
    return res.status(200).json({ ok: true, n, numero: P.numero(n), pedido: publico });
  } catch (err) {
    console.error('Pedidos (consulta):', err.message);
    return res.status(502).json({ ok: false, error: 'No pudimos consultar el pedido. Intenta de nuevo en unos minutos.' });
  }
}

module.exports = async (req, res) => {
  const { GITHUB_TOKEN } = process.env;
  const repo = P.repoPedidos();
  const disponible = Boolean(GITHUB_TOKEN && repo);

  if (req.method === 'GET') {
    if (!disponible) return res.status(503).json({ ok: false, error: 'El seguimiento de pedidos no está disponible en este momento.' });
    return consultar(req, res, repo, GITHUB_TOKEN);
  }

  const body = await revisarEnvio(req, res);
  if (!body) return;

  const cliente = {
    nombre: limpiar(body.nombre, 100).replace(/@/g, ''),
    email: limpiar(body.email, 160),
    telefono: limpiar(body.telefono, 30),
    direccion: limpiar(body.direccion, 160),
    comuna: limpiar(body.comuna, 60),
    region: limpiar(body.region, 40),
  };
  const notas = limpiar(body.notas, 500);
  const medio = limpiar(body.medio, 20);

  if (!cliente.nombre || !emailValido(cliente.email) || !cliente.telefono) {
    return res.status(400).json({ ok: false, error: 'Completa tu nombre, un correo válido y tu teléfono.' });
  }
  if (!cliente.direccion || !cliente.comuna || !REGIONES.includes(cliente.region)) {
    return res.status(400).json({ ok: false, error: 'Completa la dirección, la comuna y la región del despacho.' });
  }
  if (!MEDIOS.includes(medio)) {
    return res.status(400).json({ ok: false, error: 'Elige un medio de pago.' });
  }
  if (!Array.isArray(body.items) || !body.items.length || body.items.length > MAX_LINEAS) {
    return res.status(400).json({ ok: false, error: 'Tu carro está vacío.' });
  }

  if (!disponible) {
    console.error('Pedidos: faltan GITHUB_TOKEN o GITHUB_REPO_PEDIDOS');
    return res.status(503).json({ ok: false, error: 'La compra en línea no está disponible en este momento.' });
  }

  // Líneas del pedido con el nombre y el precio publicados
  let productos;
  try {
    productos = await catalogo(req);
  } catch (err) {
    console.error('Pedidos (catálogo):', err.message);
    return res.status(502).json({ ok: false, error: 'No pudimos revisar tu carro. Intenta de nuevo en unos minutos.' });
  }
  const items = [];
  for (const l of body.items) {
    const p = productos.find((x) => x.id === String(l && l.id));
    const qty = Number(l && l.qty);
    const size = l && l.size ? String(l.size) : null;
    const tallas = (p && p.sizes) || [];
    if (!p || !Number.isInteger(qty) || qty < 1 || qty > MAX_UNIDADES
      || (tallas.length ? !tallas.includes(size) : size)) {
      return res.status(400).json({ ok: false, error: 'Algún producto de tu carro cambió o ya no está disponible. Revisa el carro e intenta de nuevo.' });
    }
    items.push({ id: p.id, name: p.name, size, qty, price: p.price });
  }
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  // Envío: gratis sobre $60.000 en Santiago; en otro caso el costo queda por confirmar
  const envio = cliente.region === RM && subtotal >= ENVIO_GRATIS ? 0 : null;

  const ahora = new Date().toISOString();
  const pedido = {
    v: 1,
    clave: crypto.randomBytes(12).toString('hex'),
    fecha: ahora,
    estado: 'recibido',
    cliente,
    notas,
    pago: { medio, confirmado: null },
    items,
    subtotal,
    envio,
    total: subtotal + (envio || 0),
    boleta: null,
    despacho: null,
    historial: [{ estado: 'recibido', fecha: ahora }],
  };

  const gh = ghHeaders(GITHUB_TOKEN);
  const api = `https://api.github.com/repos/${repo}/issues`;

  // Tope de pedidos abiertos: si alguien manda spam, no se llena el repositorio
  try {
    const owner = repo.split('/')[0];
    const r = await fetch(`${api}?state=open&creator=${encodeURIComponent(owner)}&per_page=100`, { headers: gh });
    if (r.ok) {
      const abiertos = (await r.json()).filter((i) => !i.pull_request && String(i.title).startsWith(P.PREFIJO));
      if (abiertos.length >= MAX_ABIERTOS) {
        return res.status(429).json({ ok: false, error: 'Tenemos muchos pedidos por revisar. Intenta de nuevo más tarde.' });
      }
    }
  } catch (err) {
    console.error('Pedidos (conteo):', err.message); // si falla el conteo, se sigue
  }

  let n;
  try {
    const r = await fetch(api, {
      method: 'POST',
      headers: { ...gh, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: `${P.PREFIJO} ${cliente.nombre}`, body: P.cuerpo(pedido) }),
    });
    if (!r.ok) throw new Error(`GitHub respondió ${r.status}: ${await r.text()}`);
    n = (await r.json()).number;
  } catch (err) {
    console.error('Pedidos:', err.message);
    return res.status(502).json({ ok: false, error: 'No pudimos ingresar tu pedido. Intenta de nuevo en unos minutos.' });
  }

  // Avisos por correo (si Resend está configurado). Un fallo aquí no anula el pedido.
  const enlace = P.enlaceSeguimiento(req, n, pedido.clave);
  const aviso = P.correo(pedido, n, enlace);
  const [correoEnviado] = await Promise.all([
    enviarCorreo({ to: cliente.email, replyTo: process.env.CONTACTO_EMAIL, ...aviso }),
    enviarCorreo({
      to: process.env.CONTACTO_EMAIL,
      replyTo: cliente.email,
      subject: `Nuevo pedido ${P.numero(n)} (simulado): ${cliente.nombre}`,
      text: [`Nuevo pedido simulado ${P.numero(n)} de ${cliente.nombre} (${cliente.email}, ${cliente.telefono}).`, '',
        ...P.lineas(pedido), `Total: ${P.fmt(pedido.total)}`, '', 'Revísalo en admin.html → Pedidos.'].join('\n'),
    }),
  ]);

  return res.status(200).json({ ok: true, n, c: pedido.clave, numero: P.numero(n), correo: correoEnviado });
};
