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

  // Formularios que se envían a una función de Vercel: <form data-envio="/api/...">
  // Los campos con name se mandan como JSON. data-ok es el mensaje de éxito ({email} se reemplaza).
  // Trampas para bots: campo oculto "sitio" y tiempo mínimo desde que se abrió la página.
  const abierto = Date.now();
  document.querySelectorAll('form[data-envio]').forEach((form) => {
    const msg = form.querySelector('.form-msg');
    const btn = form.querySelector('[type="submit"]');
    const show = (text, isError) => {
      msg.textContent = text;
      msg.classList.toggle('error', isError);
    };
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const invalid = [...form.elements].find((el) => el.name && el.name !== 'sitio' && el.willValidate
        && (!el.checkValidity() || (el.required && !el.value.trim())));
      if (invalid) {
        const label = form.querySelector(`label[for="${invalid.id}"]`);
        show(invalid.dataset.error || `Revisa el campo "${label ? label.textContent.trim() : invalid.name}".`, true);
        invalid.focus();
        return;
      }
      const data = Object.fromEntries(new FormData(form));
      data.ms = Date.now() - abierto;
      btn.disabled = true;
      show('Enviando…', false);
      try {
        const res = await fetch(form.dataset.envio, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        const out = await res.json().catch(() => ({}));
        if (!res.ok || !out.ok) throw new Error(out.error || '');
        form.reset();
        show((form.dataset.ok || '¡Listo! Recibimos tu mensaje.').replace('{email}', data.email || ''), false);
      } catch (err) {
        show(`${err.message || 'No pudimos enviar el formulario.'} También puedes escribirnos a ${cfg.email}.`, true);
      } finally {
        btn.disabled = false;
      }
    });
  });

  // Texto de productos escapado antes de insertarlo como HTML
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  window.KOEsc = esc;

  // Flechas de las tarjetas con 3 o más fotos
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.ph-nav');
    if (!btn) return;
    const box = btn.closest('.ph-gallery');
    const imgs = box.querySelectorAll('img');
    const i = (Number(box.dataset.i) + Number(btn.dataset.step) + imgs.length) % imgs.length;
    box.dataset.i = i;
    imgs.forEach((img, k) => img.classList.toggle('is-on', k === i));
    box.querySelectorAll('.ph-dots i').forEach((d, k) => d.classList.toggle('is-on', k === i));
  });

  // Tarjeta de producto compartida por la tienda y "Más vendidos".
  // pickSize: false deja solo el botón (la talla se elige en el carro)
  window.KOProductCard = function (p, { pickSize = true } = {}) {
    const fmt = window.KOCart.format;
    const label = p.etiqueta
      ? `<span class="badge badge-${esc(p.etiqueta)}">${p.etiqueta === 'oferta' ? 'Oferta' : 'Nuevo'}</span>` : '';
    const price = p.oldPrice
      ? `<p class="price on-sale">${fmt(p.price)}<s class="price-old">${fmt(p.oldPrice)}</s></p>`
      : `<p class="price">${fmt(p.price)}</p>`;
    const fotos = p.fotos || [p.img, p.img2].filter(Boolean);
    const fit = p.fit === 'cover' ? 'cover' : '';
    let media;
    if (fotos.length > 2) {
      // Galería: flechas y puntos para recorrer todas las fotos
      media = `<div class="ph ph-photo ph-gallery" data-i="0">${label}
           ${fotos.map((f, i) => `<img src="${esc(f)}" alt="${i === 0 ? esc(p.name) : `${esc(p.name)}, foto ${i + 1}`}" class="${fit}${i === 0 ? ' is-on' : ''}" loading="lazy">`).join('')}
           <button type="button" class="ph-nav ph-prev" data-step="-1" aria-label="Foto anterior"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
           <button type="button" class="ph-nav ph-next" data-step="1" aria-label="Foto siguiente"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
           <span class="ph-dots" aria-hidden="true">${fotos.map((_, i) => `<i class="${i === 0 ? 'is-on' : ''}"></i>`).join('')}</span>
         </div>`;
    } else if (fotos.length) {
      media = `<div class="ph ph-photo${fotos[1] ? ' ph-swap' : ''}">${label}
           <img src="${esc(fotos[0])}" alt="${esc(p.name)}" class="${fit}" loading="lazy">
           ${fotos[1] ? `<img src="${esc(fotos[1])}" alt="" aria-hidden="true" class="${fit}" loading="lazy">` : ''}
         </div>`;
    } else {
      media = `<div class="ph" role="img" aria-label="${esc(p.name)}, foto pendiente">${label}<span>${esc(p.short)}</span></div>`;
    }
    let size = '';
    if (pickSize) {
      size = p.sizes.length
        ? `<div class="pick-size">
             <label for="size-${esc(p.id)}">Talla</label>
             <select id="size-${esc(p.id)}">
               <option value="">Elegir talla</option>
               ${p.sizes.map((s) => `<option>${esc(s)}</option>`).join('')}
             </select>
           </div>`
        : '<p class="pick-size one">Talla única</p>';
      size += '<p class="size-error" aria-live="polite"></p>';
    }
    return `
      <article class="product" data-id="${esc(p.id)}">
        ${media}
        <p class="tag${p.badge ? ' tag-wt' : ''}">${esc(p.badge || window.KO_CATEGORIES[p.cat])}</p>
        <h3><a href="producto/${esc(p.id)}.html">${esc(p.name)}</a></h3>
        <p class="spec">${esc(p.spec)}</p>
        ${price}
        ${size}
        <button class="btn btn-add" type="button">Agregar al carro</button>
      </article>`;
  };
})();
