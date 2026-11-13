// KO Store — utilidades de las funciones de Vercel.
// Los archivos que empiezan con "_" no se publican como rutas.

// Quita caracteres de control (deja saltos de línea y tabulaciones) y corta al largo máximo
const limpiar = (v, max) => String(v ?? '')
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
  .trim()
  .slice(0, max);

const emailValido = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);

// IP de quien envía (Vercel la entrega en x-real-ip / x-forwarded-for)
const ipDe = (req) => String(req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || '')
  .split(',')[0].trim() || 'desconocida';

// Límite de envíos por IP: máximo LIMITE_ENVIOS cada VENTANA_MS.
// Vive en la memoria de la función, así que es "por instancia": frena a un script que manda
// muchos envíos seguidos, pero no reemplaza a Turnstile ni a una regla de Vercel Firewall.
const LIMITE_ENVIOS = 5;
const VENTANA_MS = 10 * 60 * 1000;
const envios = new Map(); // ip -> [marcas de tiempo]

function excedeLimite(ip) {
  const ahora = Date.now();
  const recientes = (envios.get(ip) || []).filter((t) => ahora - t < VENTANA_MS);
  recientes.push(ahora);
  envios.set(ip, recientes);
  if (envios.size > 5000) { // que el mapa no crezca sin fin
    for (const [k, v] of envios) if (!v.some((t) => ahora - t < VENTANA_MS)) envios.delete(k);
  }
  return recientes.length > LIMITE_ENVIOS;
}

// Cloudflare Turnstile (opcional): se activa al definir TURNSTILE_SECRET en Vercel
// y la clave de sitio en config.js (turnstile). Sin la variable, no se exige.
async function turnstileValido(token, ip) {
  const secret = process.env.TURNSTILE_SECRET;
  if (!secret) return true;
  if (!token || typeof token !== 'string') return false;
  try {
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token.slice(0, 2048), remoteip: ip }),
    });
    const out = await r.json();
    return out.success === true;
  } catch (e) {
    console.error('Turnstile:', e.message);
    return false;
  }
}

// Solo se aceptan envíos desde el mismo sitio (si el navegador manda el origen, debe ser el propio)
function mismoSitio(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  try { return new URL(origin).host === host; } catch (e) { return false; }
}

// Cabeceras para la API de GitHub
const ghHeaders = (token) => ({
  Accept: 'application/vnd.github+json',
  Authorization: `Bearer ${token}`,
  'User-Agent': 'ko-store',
  'X-GitHub-Api-Version': '2022-11-28',
});

// Envía un correo con Resend. Devuelve false si falta la configuración o si Resend falla.
async function enviarCorreo({ to, subject, text, replyTo }) {
  const { RESEND_API_KEY, CONTACTO_REMITENTE } = process.env;
  if (!RESEND_API_KEY || !to) return false;
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: CONTACTO_REMITENTE || 'KO Store <onboarding@resend.dev>',
        to: [to],
        ...(replyTo ? { reply_to: replyTo } : {}),
        subject,
        text,
      }),
    });
    if (!r.ok) throw new Error(`Resend respondió ${r.status}: ${await r.text()}`);
    return true;
  } catch (err) {
    console.error('Correo:', err.message);
    return false;
  }
}

// Revisa método, origen, límite por IP, trampas para bots y Turnstile.
// Devuelve el cuerpo o null si ya respondió.
async function revisarEnvio(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ ok: false, error: 'Método no permitido.' });
    return null;
  }

  if (!mismoSitio(req)) {
    res.status(403).json({ ok: false, error: 'Origen no permitido.' });
    return null;
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

  const ip = ipDe(req);
  if (excedeLimite(ip)) {
    res.setHeader('Retry-After', String(VENTANA_MS / 1000));
    res.status(429).json({ ok: false, error: 'Recibimos varios envíos seguidos. Espera unos minutos e intenta de nuevo.' });
    return null;
  }

  if (!(await turnstileValido(body.turnstile, ip))) {
    res.status(400).json({ ok: false, error: 'Confirma que no eres un robot e intenta de nuevo.' });
    return null;
  }
  delete body.turnstile;
  return body;
}

module.exports = { limpiar, emailValido, revisarEnvio, mismoSitio, ghHeaders, enviarCorreo };
