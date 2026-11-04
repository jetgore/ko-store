// KO Store — interacciones básicas

// Año del footer
document.getElementById('year').textContent = new Date().getFullYear();

// "Más vendidos": productos marcados como destacados en el panel (máximo 4)
const destacadosGrid = document.getElementById('destacadosGrid');
destacadosGrid.innerHTML = window.KO_CATALOG.filter((p) => p.destacado).slice(0, 4)
  .map((p) => window.KOProductCard(p, { pickSize: false })).join('');

// Agregar al carro desde "Más vendidos": abre el carro para elegir la talla ahí
destacadosGrid.addEventListener('click', (e) => {
  const btn = e.target.closest('.btn-add');
  if (btn) window.KOCart.add(btn.closest('.product').dataset.id, null, { openDrawer: true });
});

// Cantidad real de productos por categoría, tomada del catálogo
document.querySelectorAll('.cat-count[data-cat]').forEach((el) => {
  const n = window.KO_CATALOG.filter((p) => p.cat === el.dataset.cat).length;
  el.textContent = `${n} producto${n === 1 ? '' : 's'}`;
});

// Calculadora de talla de dobok (por estatura, tramos de 10 cm)
const sizeForm = document.getElementById('sizeForm');
const sizeResult = document.getElementById('sizeResult');
sizeForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const h = Number(document.getElementById('height').value);
  if (!h || h < 100 || h > 210) {
    sizeResult.textContent = 'Ingresa una estatura entre 100 y 210 cm.';
    return;
  }
  // Redondea hacia arriba al siguiente tramo de 10 y limita al rango 110–200
  let size = Math.ceil(h / 10) * 10;
  size = Math.min(200, Math.max(110, size));
  const note = h % 10 >= 7 && size < 200
    ? ` Estás cerca del límite: si te gusta holgado, pide talla ${size + 10}.`
    : '';
  sizeResult.innerHTML = `<span class="size-big">${size}</span>Para ${h} cm te recomendamos talla ${size}.${note}`;
});

// Comentarios aprobados (comentarios.js, los publica el panel). Los más recientes primero.
const reviewList = document.getElementById('reviewList');
const reviewMore = document.getElementById('reviewMore');
const REVIEWS_VISIBLES = 6;
const reviews = [...(window.KO_COMENTARIOS || [])]
  .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
const fechaLarga = (f) => {
  const d = new Date(`${f}T12:00:00`);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });
};
const drawReviews = (all) => {
  const esc = window.KOEsc;
  const list = all ? reviews : reviews.slice(0, REVIEWS_VISIBLES);
  reviewList.innerHTML = list.map((c) => {
    const fecha = fechaLarga(c.fecha);
    return `
      <li class="review">
        <blockquote>${esc(c.texto)}</blockquote>
        <p class="review-meta"><strong>${esc(c.nombre)}</strong>${c.lugar ? ` · ${esc(c.lugar)}` : ''}${fecha ? ` · <time datetime="${esc(c.fecha)}">${fecha}</time>` : ''}</p>
      </li>`;
  }).join('') || '<li class="review review-empty">Todavía no hay comentarios publicados. ¡Sé el primero en dejar el tuyo!</li>';
  reviewMore.hidden = all || reviews.length <= REVIEWS_VISIBLES;
};
drawReviews(false);
reviewMore.addEventListener('click', () => drawReviews(true));

// El formulario de clubes y el de comentarios se envían desde comun.js (form[data-envio])
