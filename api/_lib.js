// KO Store — utilidades de las funciones de Vercel.
// Los archivos que empiezan con "_" no se publican como rutas.

// Quita caracteres de control (deja saltos de línea y tabulaciones) y corta al largo máximo
const limpiar = (v, max) => String(v ?? '')
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
  .trim()
  .slice(0, max);

const emailValido = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);

// Revisa método, origen y trampas para bots. Devuelve el cuerpo o null si ya respondió.
function revisarEnvio(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ ok: false, error: 'Método no permitido.' });
    return null;
  }

  // Solo se aceptan envíos desde el mismo sitio
  const origin = req.headers.origin;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  if (origin) {
    let mismoSitio = false;
    try { mismoSitio = new URL(origin).host === host; } catch (e) { /* origen inválido */ }
    if (!mismoSitio) {
      res.status(403).json({ ok: false, error: 'Origen no permitido.' });
      return null;
    }
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = null; }
  }
  if (!body || typeof body !== 'object') {
    res.status(400).json({ ok: false, error: 'Datos inválidos.' });
    return null;
  }

  // Trampas para bots: campo oculto "sitio" relleno o formulario enviado en menos de 3 segundos.
  // Se responde como si todo hubiera salido bien para no darles pistas.
  const ms = Number(body.ms);
  if (body.sitio || !Number.isFinite(ms) || ms < 3000) {
    res.status(200).json({ ok: true });
    return null;
  }
  return body;
}

module.exports = { limpiar, emailValido, revisarEnvio };
