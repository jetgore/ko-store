// KO Store — formulario de contacto y cotización para clubes.
// Envía el mensaje por correo con Resend (https://resend.com).
// Variables de entorno en Vercel:
//   RESEND_API_KEY      clave de Resend
//   CONTACTO_EMAIL      correo que recibe los mensajes
//   CONTACTO_REMITENTE  opcional; por defecto "KO Store <onboarding@resend.dev>"
//                       (sin dominio verificado en Resend solo se puede enviar al correo de la cuenta)

const { limpiar, emailValido, revisarEnvio } = require('./_lib');

module.exports = async (req, res) => {
  const body = revisarEnvio(req, res);
  if (!body) return;

  const tipo = body.tipo === 'club' ? 'club' : 'contacto';
  const nombre = limpiar(body.nombre, 100);
  const email = limpiar(body.email, 160);
  const telefono = limpiar(body.telefono, 30);
  const mensaje = limpiar(body.mensaje, 3000);

  if (!nombre || !emailValido(email)) {
    return res.status(400).json({ ok: false, error: 'Completa tu nombre y un correo válido.' });
  }
  if (tipo === 'contacto' && !mensaje) {
    return res.status(400).json({ ok: false, error: 'Escribe tu mensaje.' });
  }

  const { RESEND_API_KEY, CONTACTO_EMAIL, CONTACTO_REMITENTE } = process.env;
  if (!RESEND_API_KEY || !CONTACTO_EMAIL) {
    console.error('Formulario de contacto: faltan RESEND_API_KEY o CONTACTO_EMAIL');
    return res.status(503).json({ ok: false, error: 'El formulario no está disponible en este momento.' });
  }

  const club = tipo === 'club';
  const subject = club ? `Cotización para club: ${nombre}` : `Contacto web: ${nombre}`;
  const text = [
    club ? `Club o academia: ${nombre}` : `Nombre: ${nombre}`,
    `Correo: ${email}`,
    telefono ? `Teléfono: ${telefono}` : null,
    '',
    club ? 'Lo que necesitan:' : 'Mensaje:',
    mensaje || '(sin detalle)',
    '',
    '—',
    'Enviado desde el formulario de la web de KO Store. Responde este correo para contestarle directamente.',
  ].filter((l) => typeof l === 'string').join('\n');

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: CONTACTO_REMITENTE || 'KO Store <onboarding@resend.dev>',
        to: [CONTACTO_EMAIL],
        reply_to: email,
        subject,
        text,
      }),
    });
    if (!r.ok) throw new Error(`Resend respondió ${r.status}: ${await r.text()}`);
  } catch (err) {
    console.error('Formulario de contacto:', err.message);
    return res.status(502).json({ ok: false, error: 'No pudimos enviar tu mensaje. Intenta de nuevo en unos minutos.' });
  }

  return res.status(200).json({ ok: true });
};
