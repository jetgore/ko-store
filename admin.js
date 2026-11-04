// KO Store — panel de productos
// Lee productos.js desde GitHub, lo edita en el navegador y publica todos los
// cambios (datos y fotos) en un solo commit. Vercel publica el sitio al recibirlo.

(function () {
  const cfg = window.KO_CONFIG;
  const CATS = window.KO_CATEGORIES;
  const API = `https://api.github.com/repos/${cfg.repo}`;
  const FILE = 'productos.js';
  const PHOTO_DIR = 'recursosgraficos/productos';
  const TOKEN_KEY = 'ko-admin-token';
  const MAX_DESTACADOS = 4;
  const MAX_FOTOS = 8;

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const fmt = (n) => '$' + Number(n).toLocaleString('es-CL');
  const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  let token = null;
  let products = [];      // lista que se está editando
  let saved = '';         // productos publicados (JSON) para saber si hay cambios
  let fileSha = null;     // versión de productos.js que se cargó
  let photos = new Map(); // fotos nuevas aún sin publicar: ruta -> { base64, url }
  let changes = [];       // resumen de cambios para el mensaje del commit

  // ---------- Almacenamiento del token (puede no estar disponible) ----------
  const store = {
    get() {
      try { return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY); } catch (e) { return null; }
    },
    set(v, remember) {
      try { (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, v); } catch (e) { /* sin almacenamiento */ }
    },
    clear() {
      try { sessionStorage.removeItem(TOKEN_KEY); localStorage.removeItem(TOKEN_KEY); } catch (e) { /* sin almacenamiento */ }
    },
  };

  // ---------- GitHub ----------
  async function gh(path, opts = {}) {
    const res = await fetch(API + path, {
      ...opts,
      cache: 'no-store',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
      },
    });
    if (!res.ok) {
      const err = new Error(`GitHub respondió ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return res.status === 204 ? null : res.json();
  }

  const decode = (b64) => new TextDecoder().decode(
    Uint8Array.from(atob(b64.replace(/\s/g, '')), (c) => c.charCodeAt(0)));

  // Las fotos se guardan como lista en "fotos". Los productos antiguos usaban img/img2.
  function normalize(p) {
    const fotos = (Array.isArray(p.fotos) ? p.fotos : [p.img, p.img2]).filter(Boolean);
    const { img, img2, fotos: _, ...rest } = p;
    return { ...rest, fotos };
  }

  function parseFile(text) {
    const start = text.indexOf('[', text.indexOf('KO_PRODUCTOS'));
    const end = text.lastIndexOf(']');
    return JSON.parse(text.slice(start, end + 1)).map(normalize);
  }

  function serialize(list) {
    return `// KO Store — productos. Este archivo lo genera el panel de administración (admin.html).
// Si lo editas a mano, mantén el formato JSON después de "window.KO_PRODUCTOS =".
window.KO_PRODUCTOS = ${JSON.stringify(list, null, 2)};
`;
  }

  async function loadProducts() {
    const file = await gh(`/contents/${FILE}?ref=${encodeURIComponent(cfg.rama)}`);
    fileSha = file.sha;
    products = parseFile(decode(file.content));
    saved = JSON.stringify(products);
    photos = new Map();
    changes = [];
  }

  // Un solo commit con productos.js y las fotos nuevas
  async function publish() {
    const ref = await gh(`/git/ref/heads/${cfg.rama}`);
    const head = ref.object.sha;
    const current = await gh(`/contents/${FILE}?ref=${head}`);
    if (current.sha !== fileSha) {
      const err = new Error('conflicto');
      err.conflict = true;
      throw err;
    }
    const commit = await gh(`/git/commits/${head}`);

    // Solo se suben las fotos que siguen en uso
    const used = new Set(products.flatMap((p) => p.fotos));
    const entries = [];

    // Fotos subidas por el panel que ya ningún producto usa: se borran del repositorio
    const before = new Set(JSON.parse(saved).flatMap((p) => p.fotos));
    const unused = [...before].filter((f) => f.startsWith(`${PHOTO_DIR}/`) && !used.has(f));
    if (unused.length) {
      let existing = [];
      try { existing = (await gh(`/contents/${PHOTO_DIR}?ref=${head}`)).map((f) => f.path); } catch (e) { if (e.status !== 404) throw e; }
      unused.filter((f) => existing.includes(f))
        .forEach((path) => entries.push({ path, mode: '100644', type: 'blob', sha: null }));
    }
    for (const [path, photo] of photos) {
      if (!used.has(path)) continue;
      const blob = await gh('/git/blobs', { method: 'POST', body: JSON.stringify({ content: photo.base64, encoding: 'base64' }) });
      entries.push({ path, mode: '100644', type: 'blob', sha: blob.sha });
    }
    const dataBlob = await gh('/git/blobs', { method: 'POST', body: JSON.stringify({ content: serialize(products), encoding: 'utf-8' }) });
    entries.push({ path: FILE, mode: '100644', type: 'blob', sha: dataBlob.sha });

    const tree = await gh('/git/trees', { method: 'POST', body: JSON.stringify({ base_tree: commit.tree.sha, tree: entries }) });
    const message = `Actualiza productos desde el panel\n\n${changes.map((c) => `- ${c}`).join('\n')}`;
    const next = await gh('/git/commits', { method: 'POST', body: JSON.stringify({ message, tree: tree.sha, parents: [head] }) });
    await gh(`/git/refs/heads/${cfg.rama}`, { method: 'PATCH', body: JSON.stringify({ sha: next.sha }) });

    fileSha = dataBlob.sha;
    saved = JSON.stringify(products);
    changes = [];
    // Las fotos ya publicadas se siguen mostrando desde memoria hasta que Vercel termine
  }

  // ---------- Fotos: se reducen a 1200 px y se pasan a WebP ----------
  function processImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, 1200 / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(img.src);
        canvas.toBlob((blob) => {
          if (!blob) return reject(new Error('No se pudo procesar la imagen.'));
          const reader = new FileReader();
          reader.onload = () => resolve({
            url: reader.result,
            base64: reader.result.split(',')[1],
            ext: blob.type === 'image/webp' ? 'webp' : 'png',
          });
          reader.readAsDataURL(blob);
        }, 'image/webp', 0.85);
      };
      img.onerror = () => reject(new Error('El archivo no es una imagen válida.'));
      img.src = URL.createObjectURL(file);
    });
  }
  const photoSrc = (path) => (photos.get(path) || {}).url || path;

  // ---------- Vista ----------
  const isDirty = () => JSON.stringify(products) !== saved;

  function toast(text, isError = false) {
    const el = $('toast');
    el.textContent = text;
    el.classList.toggle('error', isError);
    el.hidden = false;
    clearTimeout(toast.t);
    toast.t = setTimeout(() => { el.hidden = true; }, isError ? 8000 : 4000);
  }

  function render() {
    const term = slug($('filter').value);
    const list = products.filter((p) => !term || slug(`${p.name} ${CATS[p.cat]}`).includes(term));
    const visibles = products.filter((p) => p.activo !== false).length;
    $('summary').textContent = `${products.length} productos · ${visibles} visibles en la tienda · ${products.filter((p) => p.destacado).length} de ${MAX_DESTACADOS} destacados`;

    $('rows').innerHTML = list.map((p) => `
      <tr data-id="${esc(p.id)}" class="${p.activo === false ? 'is-hidden' : ''}">
        <td><div class="thumb">${p.fotos[0]
          ? `<img src="${esc(photoSrc(p.fotos[0]))}" alt="" class="${p.fit === 'cover' ? 'cover' : ''}">`
          : '<span>Sin foto</span>'}</div>${p.fotos.length > 1 ? `<p class="thumb-count">${p.fotos.length} fotos</p>` : ''}</td>
        <td><p class="row-name">${esc(p.name)}</p><p class="row-cat">${esc(CATS[p.cat] || p.cat)}${p.etiqueta ? ` · <span class="pill pill-${esc(p.etiqueta)}">${p.etiqueta === 'oferta' ? 'Oferta' : 'Nuevo'}</span>` : ''}</p></td>
        <td class="row-price">${fmt(p.price)}${p.oldPrice ? `<s>${fmt(p.oldPrice)}</s>` : ''}</td>
        <td><label class="switch"><input type="checkbox" data-act="activo" ${p.activo !== false ? 'checked' : ''} aria-label="Visible: ${esc(p.name)}"><span></span></label></td>
        <td><label class="switch"><input type="checkbox" data-act="destacado" ${p.destacado ? 'checked' : ''} aria-label="Destacado: ${esc(p.name)}"><span></span></label></td>
        <td class="row-actions">
          <button type="button" class="link-btn" data-act="edit">Editar</button>
          <button type="button" class="link-btn danger" data-act="delete">Borrar</button>
        </td>
      </tr>`).join('') || '<tr><td colspan="6" class="empty">No hay productos que coincidan.</td></tr>';

    const dirty = isDirty();
    $('publishBar').hidden = !dirty;
    $('pendingText').textContent = `${changes.length || 1} cambio${changes.length === 1 ? '' : 's'} sin publicar`;
    document.body.classList.toggle('has-pending', dirty);
  }

  function showPanel() {
    $('login').hidden = true;
    $('tabs').hidden = false;
    $('logout').hidden = false;
    showTab('panel');
    render();
    loadComentarios();
  }
  function showLogin(message = '') {
    $('login').hidden = false;
    $('tabs').hidden = true;
    $('panel').hidden = true;
    $('comentarios').hidden = true;
    $('logout').hidden = true;
    $('publishBar').hidden = true;
    $('loginMsg').textContent = message;
    $('loginMsg').classList.toggle('error', Boolean(message));
  }

  function loginError(err) {
    if (err.status === 401) return 'El token no es válido o expiró.';
    if (err.status === 403 || err.status === 404) return `El token no tiene acceso al repositorio ${cfg.repo} o no existe ${FILE}.`;
    if (err instanceof SyntaxError) return `No se pudo leer ${FILE}: revisa que tenga el formato correcto.`;
    return 'No se pudo conectar con GitHub. Revisa tu conexión e intenta de nuevo.';
  }

  async function enter(t, remember) {
    token = t;
    $('loginMsg').classList.remove('error');
    $('loginMsg').textContent = 'Cargando productos…';
    try {
      await loadProducts();
      if (remember !== undefined) store.set(t, remember);
      showPanel();
    } catch (err) {
      token = null;
      store.clear();
      showLogin(loginError(err));
    }
  }

  // ---------- Editor ----------
  const editor = $('editor');
  const form = $('editForm');
  let editing = null; // producto original (null = nuevo)
  let draftPhotos = [];

  $('f-cat').innerHTML = Object.entries(CATS).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('');
  $('presets').innerHTML = [
    ...Object.entries(window.KO_TALLAS).map(([k, v]) => `<button type="button" class="chip chip-sm" data-sizes="${v.join(', ')}">${k}</button>`),
    '<button type="button" class="chip chip-sm" data-sizes="">Talla única</button>',
  ].join('');
  $('presets').addEventListener('click', (e) => {
    const b = e.target.closest('[data-sizes]');
    if (b) $('f-sizes').value = b.dataset.sizes;
  });

  function drawPhotos() {
    const cover = $('f-cover').checked ? 'cover' : '';
    const last = draftPhotos.length - 1;
    $('photoGrid').innerHTML = draftPhotos.map((path, i) => `
      <li class="photo-item" data-i="${i}">
        <div class="photo-prev">
          <img src="${esc(photoSrc(path))}" alt="Foto ${i + 1}" class="${cover}">
          ${i === 0 ? '<span class="photo-main">Principal</span>' : ''}
        </div>
        <div class="photo-tools">
          <button type="button" data-move="-1" ${i === 0 ? 'disabled' : ''} aria-label="Mover foto ${i + 1} antes" title="Mover antes">&larr;</button>
          <button type="button" class="photo-del" aria-label="Quitar foto ${i + 1}" title="Quitar">&times;</button>
          <button type="button" data-move="1" ${i === last ? 'disabled' : ''} aria-label="Mover foto ${i + 1} después" title="Mover después">&rarr;</button>
        </div>
      </li>`).join('');
    const full = draftPhotos.length >= MAX_FOTOS;
    $('photoAddBtn').classList.toggle('is-disabled', full);
    $('photoInput').disabled = full;
    $('photoCount').textContent = draftPhotos.length
      ? `${draftPhotos.length} de ${MAX_FOTOS} fotos`
      : 'Sin fotos: la tienda muestra el nombre en un recuadro gris.';
  }

  function openEditor(p) {
    editing = p;
    const d = p || { cat: 'doboks', sizes: [], activo: true };
    $('editorTitle').textContent = p ? 'Editar producto' : 'Nuevo producto';
    $('f-name').value = d.name || '';
    $('f-id').value = d.id || '';
    $('f-id').readOnly = Boolean(p);
    $('f-cat').value = d.cat;
    $('f-price').value = d.price ?? '';
    $('f-old').value = d.oldPrice ?? '';
    $('f-spec').value = d.spec || '';
    $('f-etiqueta').value = d.etiqueta || '';
    $('f-badge').value = d.badge || '';
    $('f-sizes').value = (d.sizes || []).join(', ');
    $('f-cover').checked = d.fit === 'cover';
    $('f-activo').checked = d.activo !== false;
    $('f-destacado').checked = Boolean(d.destacado);
    $('editMsg').textContent = '';
    draftPhotos = [...(d.fotos || [])];
    drawPhotos();
    editor.showModal();
    $('f-name').focus();
  }

  // Código automático a partir del nombre (solo en productos nuevos)
  $('f-name').addEventListener('input', () => {
    if (!editing) $('f-id').value = slug($('f-name').value);
  });
  $('f-cover').addEventListener('change', drawPhotos);

  $('photoInput').addEventListener('change', async (e) => {
    const files = [...e.target.files];
    e.target.value = '';
    const room = MAX_FOTOS - draftPhotos.length;
    $('editMsg').textContent = files.length > room
      ? `Cada producto puede tener hasta ${MAX_FOTOS} fotos; se agregaron solo ${room}.` : '';
    const id = slug($('f-id').value || $('f-name').value) || 'producto';
    for (const file of files.slice(0, room)) {
      try {
        const res = await processImage(file);
        const path = `${PHOTO_DIR}/${id}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}.${res.ext}`;
        photos.set(path, res);
        draftPhotos.push(path);
        drawPhotos();
      } catch (err) {
        $('editMsg').textContent = `${file.name}: ${err.message}`;
      }
    }
  });

  $('photoGrid').addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const i = Number(btn.closest('.photo-item').dataset.i);
    if (btn.classList.contains('photo-del')) {
      draftPhotos.splice(i, 1);
    } else {
      const j = i + Number(btn.dataset.move);
      [draftPhotos[i], draftPhotos[j]] = [draftPhotos[j], draftPhotos[i]];
    }
    drawPhotos();
  });

  const closeEditor = () => editor.close();
  $('closeEditor').addEventListener('click', closeEditor);
  $('cancelEdit').addEventListener('click', closeEditor);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('f-name').value.trim();
    const id = slug($('f-id').value);
    const price = Math.round(Number($('f-price').value));
    const oldPrice = Math.round(Number($('f-old').value)) || null;
    const msg = $('editMsg');
    if (!name) return void (msg.textContent = 'Escribe el nombre del producto.');
    if (!id) return void (msg.textContent = 'Escribe un código para el producto.');
    if (!editing && products.some((p) => p.id === id)) return void (msg.textContent = 'Ya existe un producto con ese código.');
    if (!$('f-price').value || price <= 0) return void (msg.textContent = 'Escribe un precio mayor a cero.');
    if (oldPrice && oldPrice <= price) return void (msg.textContent = 'El precio anterior debe ser mayor que el precio actual.');
    const destacado = $('f-destacado').checked;
    const otherDestacados = products.filter((p) => p.destacado && p !== editing).length;
    if (destacado && otherDestacados >= MAX_DESTACADOS) {
      return void (msg.textContent = `Ya hay ${MAX_DESTACADOS} destacados. Quita uno antes de destacar este.`);
    }

    const p = {
      id, cat: $('f-cat').value, name, price,
      fotos: [...draftPhotos],
      short: (editing && editing.short) || name.split(' ')[0],
      spec: $('f-spec').value.trim(),
      sizes: $('f-sizes').value.split(',').map((s) => s.trim()).filter(Boolean),
      activo: $('f-activo').checked,
    };
    if ($('f-cover').checked) p.fit = 'cover';
    if ($('f-badge').value.trim()) p.badge = $('f-badge').value.trim();
    if ($('f-etiqueta').value) p.etiqueta = $('f-etiqueta').value;
    if (oldPrice) p.oldPrice = oldPrice;
    if (destacado) p.destacado = true;

    if (editing) {
      products[products.indexOf(editing)] = p;
      changes.push(`Edita ${name}`);
    } else {
      products.unshift(p);
      changes.push(`Agrega ${name}`);
    }
    editor.close();
    render();
  });

  // ---------- Lista ----------
  $('rows').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const p = products.find((x) => x.id === btn.closest('tr').dataset.id);
    if (btn.dataset.act === 'edit') openEditor(p);
    if (btn.dataset.act === 'delete' && confirm(`¿Borrar "${p.name}"? Si solo quieres sacarlo de la tienda por un tiempo, desmarca "Visible".`)) {
      products.splice(products.indexOf(p), 1);
      changes.push(`Borra ${p.name}`);
      render();
    }
  });

  $('rows').addEventListener('change', (e) => {
    const input = e.target.closest('input[data-act]');
    if (!input) return;
    const p = products.find((x) => x.id === input.closest('tr').dataset.id);
    if (input.dataset.act === 'activo') {
      p.activo = input.checked;
      changes.push(`${input.checked ? 'Muestra' : 'Oculta'} ${p.name}`);
    } else {
      if (input.checked && products.filter((x) => x.destacado).length >= MAX_DESTACADOS) {
        input.checked = false;
        toast(`Ya hay ${MAX_DESTACADOS} destacados en la portada. Quita uno primero.`, true);
        return;
      }
      if (input.checked) p.destacado = true; else delete p.destacado;
      changes.push(`${input.checked ? 'Destaca' : 'Quita de destacados'} ${p.name}`);
    }
    render();
  });

  $('filter').addEventListener('input', render);
  $('addBtn').addEventListener('click', () => openEditor(null));

  $('discardBtn').addEventListener('click', () => {
    if (!confirm('¿Descartar todos los cambios sin publicar?')) return;
    products = JSON.parse(saved);
    changes = [];
    render();
  });

  $('publishBtn').addEventListener('click', async () => {
    const btn = $('publishBtn');
    btn.disabled = true;
    btn.textContent = 'Publicando…';
    try {
      await publish();
      render();
      toast('Cambios publicados. El sitio se actualiza en 1 o 2 minutos.');
    } catch (err) {
      if (err.conflict) toast('Alguien más cambió los productos mientras editabas. Recarga la página para ver la versión nueva (tus cambios sin publicar se perderán).', true);
      else if (err.status === 401) toast('Tu token expiró. Sal y vuelve a entrar.', true);
      else if (err.status === 403 || err.status === 404) toast('El token no tiene permiso de escritura en el repositorio.', true);
      else toast('No se pudo publicar. Revisa tu conexión e intenta de nuevo.', true);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Publicar cambios';
    }
  });

  // ---------- Comentarios ----------
  // La web (api/comentarios.js) crea un issue "[Comentario] Nombre" con los datos en un
  // comentario HTML. Aprobar lo agrega a comentarios.js (un commit) y cierra el issue;
  // rechazar solo cierra el issue.
  const COM_FILE = 'comentarios.js';
  const COM_PREFIX = '[Comentario]';
  let pendientes = []; // comentarios por revisar (issues abiertos)
  let publicados = []; // comentarios en comentarios.js

  const encode = (text) => {
    let bin = '';
    new TextEncoder().encode(text).forEach((b) => { bin += String.fromCharCode(b); });
    return btoa(bin);
  };
  const fechaCorta = (f) => {
    const d = new Date(`${f}T12:00:00`);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  function serializeComentarios(list) {
    return `// KO Store — comentarios aprobados. Este archivo lo genera el panel de administración (admin.html).
// Si lo editas a mano, mantén el formato JSON después de "window.KO_COMENTARIOS =".
window.KO_COMENTARIOS = ${JSON.stringify(list, null, 2)};
`;
  }

  // Siempre se lee la versión actual para no pisar cambios hechos desde otro equipo
  async function readComentarios() {
    try {
      const file = await gh(`/contents/${COM_FILE}?ref=${encodeURIComponent(cfg.rama)}`);
      const text = decode(file.content);
      const start = text.indexOf('[', text.indexOf('KO_COMENTARIOS'));
      return { sha: file.sha, list: JSON.parse(text.slice(start, text.lastIndexOf(']') + 1)) };
    } catch (err) {
      if (err.status === 404) return { sha: null, list: [] };
      throw err;
    }
  }

  function writeComentarios(list, sha, message) {
    return gh(`/contents/${COM_FILE}`, {
      method: 'PUT',
      body: JSON.stringify({ message, branch: cfg.rama, content: encode(serializeComentarios(list)), ...(sha ? { sha } : {}) }),
    });
  }

  function parseIssue(issue) {
    const m = /<!-- ko-comentario (\{[\s\S]*?\}) -->/.exec(issue.body || '');
    if (!m) return null;
    try {
      const d = JSON.parse(m[1]);
      return {
        issue: issue.number,
        nombre: String(d.nombre || '').slice(0, 60),
        lugar: String(d.lugar || '').slice(0, 60),
        texto: String(d.texto || '').slice(0, 600),
        fecha: String(d.fecha || issue.created_at.slice(0, 10)),
      };
    } catch (e) {
      return null;
    }
  }

  async function loadComentarios() {
    $('comError').textContent = '';
    try {
      // Solo issues creados por la cuenta dueña del repositorio (la de la función de Vercel),
      // así nadie puede colar comentarios abriendo un issue a mano
      const owner = cfg.repo.split('/')[0];
      const [issues, pub] = await Promise.all([
        gh(`/issues?state=open&creator=${encodeURIComponent(owner)}&per_page=100`),
        readComentarios(),
      ]);
      publicados = pub.list;
      const ya = new Set(publicados.map((c) => c.id));
      pendientes = issues
        .filter((i) => !i.pull_request && i.title.startsWith(COM_PREFIX))
        .map(parseIssue)
        .filter((c) => c && !ya.has(c.issue));
    } catch (err) {
      pendientes = [];
      publicados = [];
      $('comError').textContent = err.status === 403 || err.status === 404
        ? 'Tu token no tiene permiso para ver los comentarios. Créalo de nuevo con "Issues: Read and write" (ver "Cómo crear el token" al entrar).'
        : 'No se pudieron cargar los comentarios. Revisa tu conexión y presiona "Actualizar".';
    }
    renderComentarios();
  }

  const comItem = (c, pendiente) => `
    <li class="com-item" data-id="${pendiente ? c.issue : c.id}">
      <blockquote>${esc(c.texto)}</blockquote>
      <p class="com-meta"><strong>${esc(c.nombre)}</strong>${c.lugar ? ` · ${esc(c.lugar)}` : ''} · ${esc(fechaCorta(c.fecha))}</p>
      <div class="com-actions">${pendiente
        ? `<button type="button" class="btn btn-primary btn-sm" data-com="aprobar">Aprobar y publicar</button>
           <button type="button" class="btn btn-ghost btn-sm" data-com="rechazar">Rechazar</button>`
        : '<button type="button" class="link-btn danger" data-com="quitar">Quitar de la web</button>'}</div>
    </li>`;

  function renderComentarios() {
    $('comSummary').textContent = `${pendientes.length} por revisar · ${publicados.length} publicados`;
    $('comCount').textContent = pendientes.length;
    $('comCount').hidden = !pendientes.length;
    $('comPendientes').innerHTML = pendientes.map((c) => comItem(c, true)).join('')
      || '<li class="com-empty">No hay comentarios nuevos.</li>';
    $('comPublicados').innerHTML = publicados.map((c) => comItem(c, false)).join('')
      || '<li class="com-empty">Todavía no hay comentarios publicados.</li>';
  }

  async function aprobar(c) {
    const { sha, list } = await readComentarios();
    if (!list.some((x) => x.id === c.issue)) {
      const nuevo = { id: c.issue, nombre: c.nombre, ...(c.lugar ? { lugar: c.lugar } : {}), texto: c.texto, fecha: c.fecha };
      await writeComentarios([nuevo, ...list], sha, `Publica comentario de ${c.nombre}`);
    }
    await gh(`/issues/${c.issue}`, { method: 'PATCH', body: JSON.stringify({ state: 'closed', state_reason: 'completed' }) });
  }

  const rechazar = (c) => gh(`/issues/${c.issue}`, {
    method: 'PATCH', body: JSON.stringify({ state: 'closed', state_reason: 'not_planned' }),
  });

  async function quitar(c) {
    const { sha, list } = await readComentarios();
    await writeComentarios(list.filter((x) => x.id !== c.id), sha, `Quita comentario de ${c.nombre}`);
  }

  $('comentarios').addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-com]');
    if (!btn) return;
    const id = Number(btn.closest('.com-item').dataset.id);
    const act = btn.dataset.com;
    const c = act === 'quitar' ? publicados.find((x) => x.id === id) : pendientes.find((x) => x.issue === id);
    if (!c) return;
    if (act === 'rechazar' && !confirm(`¿Rechazar el comentario de ${c.nombre}? No se publicará.`)) return;
    if (act === 'quitar' && !confirm(`¿Quitar de la web el comentario de ${c.nombre}?`)) return;
    const item = btn.closest('.com-item');
    item.querySelectorAll('button').forEach((b) => { b.disabled = true; });
    btn.textContent = 'Guardando…';
    try {
      if (act === 'aprobar') await aprobar(c);
      if (act === 'rechazar') await rechazar(c);
      if (act === 'quitar') await quitar(c);
      toast({
        aprobar: 'Comentario publicado. Aparece en la web en 1 o 2 minutos.',
        rechazar: 'Comentario rechazado. No se publicará.',
        quitar: 'Comentario quitado. La web se actualiza en 1 o 2 minutos.',
      }[act]);
    } catch (err) {
      if (err.status === 401) toast('Tu token expiró. Sal y vuelve a entrar.', true);
      else if (err.status === 403 || err.status === 404) toast('El token no tiene permiso para esta acción (necesita Contents e Issues en Read and write).', true);
      else if (err.status === 409 || err.status === 422) toast('Los comentarios cambiaron mientras tanto. Intenta de nuevo.', true);
      else toast('No se pudo guardar. Revisa tu conexión e intenta de nuevo.', true);
    }
    await loadComentarios();
  });

  $('comReload').addEventListener('click', loadComentarios);

  // ---------- Pestañas ----------
  function showTab(tab) {
    $('panel').hidden = tab !== 'panel';
    $('comentarios').hidden = tab !== 'comentarios';
    $('tabs').querySelectorAll('[data-tab]').forEach((b) => {
      if (b.dataset.tab === tab) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
  }
  $('tabs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-tab]');
    if (b) showTab(b.dataset.tab);
  });

  // ---------- Acceso ----------
  $('repoName').textContent = cfg.repo;
  $('repoName2').textContent = cfg.repo;
  $('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const t = $('token').value.trim();
    if (t) enter(t, $('remember').checked);
  });
  $('logout').addEventListener('click', () => {
    if (isDirty() && !confirm('Tienes cambios sin publicar. ¿Salir igual?')) return;
    store.clear();
    token = null;
    products = [];
    saved = '';
    $('token').value = '';
    showLogin();
  });

  window.addEventListener('beforeunload', (e) => {
    if (token && isDirty()) { e.preventDefault(); e.returnValue = ''; }
  });

  const remembered = store.get();
  if (remembered) enter(remembered); else showLogin();
})();
