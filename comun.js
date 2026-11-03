// KO Store — piezas compartidas por todas las páginas:
// aviso superior, menú móvil, botón de WhatsApp y enlaces de contacto

(function () {
  const cfg = window.KO_CONFIG;
  const waLink = (text) => `https://wa.me/${cfg.whatsapp}?text=${encodeURIComponent(text)}`;

  // Aviso superior
  if (cfg.aviso && cfg.aviso.texto) {
    const bar = document.createElement('div');
    bar.className = 'promo-bar';
    bar.innerHTML = `<div class="wrap"><p>${cfg.aviso.texto}${cfg.aviso.enlace
      ? ` <a href="${cfg.aviso.enlace}">${cfg.aviso.enlaceTexto}</a>` : ''}</p></div>`;
    document.body.prepend(bar);
  }

  // Menú móvil
  const toggle = document.querySelector('.menu-toggle');
  const header = document.querySelector('.site-header');
  if (toggle) {
    const setOpen = (open) => {
      header.classList.toggle('menu-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    };
    toggle.addEventListener('click', () => setOpen(!header.classList.contains('menu-open')));
    header.querySelectorAll('.nav a').forEach((a) => a.addEventListener('click', () => setOpen(false)));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && header.classList.contains('menu-open')) { setOpen(false); toggle.focus(); }
    });
  }

  // Enlaces de contacto del footer: se ocultan si no están configurados
  document.querySelectorAll('[data-link]').forEach((a) => {
    const kind = a.dataset.link;
    if (kind === 'whatsapp' && cfg.whatsapp) a.href = waLink('Hola KO Store, tengo una consulta.');
    else if (kind === 'instagram' && cfg.instagram) a.href = `https://instagram.com/${cfg.instagram}`;
    else { a.hidden = true; return; }
    a.target = '_blank';
    a.rel = 'noopener';
  });

  // Botón flotante de WhatsApp
  if (cfg.whatsapp) {
    const wa = document.createElement('a');
    wa.className = 'wa-float';
    wa.href = waLink('Hola KO Store, tengo una consulta.');
    wa.target = '_blank';
    wa.rel = 'noopener';
    wa.setAttribute('aria-label', 'Escríbenos por WhatsApp');
    wa.innerHTML = '<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.7.3-.2.3-.9.9-.9 2.2s.9 2.5 1 2.7c.1.2 1.8 2.8 4.4 3.9 1.6.7 2.3.8 3.1.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z"/></svg>';
    document.body.append(wa);
  }

  window.KOContact = { waLink };
})();
