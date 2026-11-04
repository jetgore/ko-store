// KO Store — recibe comentarios de la web y los deja pendientes de aprobación.
// Cada comentario se guarda como un issue en GitHub con el título "[Comentario] Nombre".
// El administrador lo aprueba o rechaza en admin.html → Comentarios; solo los aprobados
// pasan a comentarios.js y se ven en la web.
// Variables de entorno en Vercel:
//   GITHUB_TOKEN  token fine-grained del dueño del repositorio con "Issues: Read and write"
//   GITHUB_REPO   opcional; por defecto "jetgore/ko-store"

const { limpiar, revisarEnvio } = require('./_lib');

module.exports = async (req, res) => {
  const body = revisarEnvio(req, res);
  if (!body) return;

  // Sin "@" para que GitHub no lo tome como mención a un usuario
  const nombre = limpiar(body.nombre, 60).replace(/@/g, '');
  const lugar = limpiar(body.lugar, 60).replace(/@/g, '');
  const texto = limpiar(body.texto, 600);

  if (!nombre || texto.length < 10) {
    return res.status(400).json({ ok: false, error: 'Escribe tu nombre y un comentario de al menos 10 caracteres.' });
  }

  const { GITHUB_TOKEN } = process.env;
  const repo = process.env.GITHUB_REPO || 'jetgore/ko-store';
  if (!GITHUB_TOKEN) {
    console.error('Comentarios: falta GITHUB_TOKEN');
    return res.status(503).json({ ok: false, error: 'Los comentarios no están disponibles en este momento.' });
  }

  const fecha = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Santiago' }); // AAAA-MM-DD
  // Datos para el panel, dentro de un comentario HTML (sin "<" ni ">" para que no se corte)
  const datos = JSON.stringify({ nombre, lugar, texto, fecha })
    .replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
  // Vista legible en GitHub, dentro de un bloque de código para que no se interprete como Markdown
  const vista = `${nombre}${lugar ? ` · ${lugar}` : ''}\n\n${texto}`.replace(/`{3,}/g, "'''");

  const issue = {
    title: `[Comentario] ${nombre}`,
    body: `Comentario enviado desde la web el ${fecha}. **Solo se publica si lo apruebas en el panel** (admin.html → Comentarios).\n\n\`\`\`text\n${vista}\n\`\`\`\n\n<!-- ko-comentario ${datos} -->\n`,
  };

  try {
    const r = await fetch(`https://api.github.com/repos/${repo}/issues`, {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'ko-store',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify(issue),
    });
    if (!r.ok) throw new Error(`GitHub respondió ${r.status}: ${await r.text()}`);
  } catch (err) {
    console.error('Comentarios:', err.message);
    return res.status(502).json({ ok: false, error: 'No pudimos enviar tu comentario. Intenta de nuevo en unos minutos.' });
  }

  return res.status(200).json({ ok: true });
};
