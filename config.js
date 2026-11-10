// KO Store — datos de contacto y aviso superior
// Cambia estos valores y se actualizan en todas las páginas.
// whatsapp: número con código de país y sin "+" ni espacios (ej: '56912345678'). Vacío = se oculta.
// instagram: usuario sin "@" (ej: 'kostore.cl'). Vacío = se oculta.
// aviso: franja de color sobre el menú. Deja texto: '' para ocultarla.

window.KO_CONFIG = {
  email: 'contacto@kostore.cl',
  whatsapp: '',
  instagram: '',
  // Repositorio donde el panel (admin.html) guarda los productos y las fotos
  repo: 'jetgore/ko-store',
  rama: 'main',
  // Clave de sitio de Cloudflare Turnstile (verificación "No soy un robot" en los formularios).
  // Vacío = desactivado. Si la pones, define también TURNSTILE_SECRET en Vercel.
  turnstile: '',
  aviso: {
    texto: 'Black Friday KO Store: viernes 27 de noviembre',
    enlace: 'tienda.html',
    enlaceTexto: 'Ver tienda',
  },
};
