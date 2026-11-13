// KO Store — avisa por correo a quien compró que su pedido cambió de estado.
// Lo llama el panel (admin.html → Pedidos) después de cada cambio, con el token de GitHub
// del administrador en la cabecera Authorization. Solo se acepta si ese token es de la
// cuenta dueña del repositorio de pedidos; el correo se arma con lo que está guardado en
// el issue, así que la función no sirve para mandar correos arbitrarios.
// Variables de entorno: GITHUB_REPO_PEDIDOS, RESEND_API_KEY, CONTACTO_EMAIL (para las respuestas).

const { mismoSitio, ghHeaders, enviarCorreo } = require('./_lib');
const P = require('./_pedidos');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Método no permitido.' });
  }
  if (!mismoSitio(req)) return res.status(403).json({ ok: false, error: 'Origen no permitido.' });

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = null; }
  }
  const n = Number(body && body.n);
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!Number.isInteger(n) || n < 1 || !token) {
    return res.status(400).json({ ok: false, error: 'Datos inválidos.' });
  }

  const repo = P.repoPedidos();
  if (!repo || !process.env.RESEND_API_KEY) {
    return res.status(503).json({ ok: false, error: 'Los correos de aviso no están configurados.' });
  }

  try {
    const gh = ghHeaders(token);
    const owner = repo.split('/')[0].toLowerCase();
    const quien = await fetch('https://api.github.com/user', { headers: gh });
    if (!quien.ok || String((await quien.json()).login).toLowerCase() !== owner) {
      return res.status(403).json({ ok: false, error: 'No autorizado.' });
    }
    const r = await fetch(`https://api.github.com/repos/${repo}/issues/${n}`, { headers: gh });
    if (!r.ok) return res.status(404).json({ ok: false, error: 'No se encontró el pedido.' });
    const issue = await r.json();
    const p = P.leer(issue);
    if (!p || String(issue.user && issue.user.login).toLowerCase() !== owner) {
      return res.status(404).json({ ok: false, error: 'No se encontró el pedido.' });
    }
    const enviado = await enviarCorreo({
      to: p.cliente.email,
      replyTo: process.env.CONTACTO_EMAIL,
      ...P.correo(p, n, P.enlaceSeguimiento(req, n, p.clave)),
    });
    if (!enviado) return res.status(502).json({ ok: false, error: 'No se pudo enviar el correo.' });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Aviso de pedido:', err.message);
    return res.status(502).json({ ok: false, error: 'No se pudo enviar el correo.' });
  }
};
