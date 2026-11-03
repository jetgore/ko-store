// KO Store — interacciones básicas

// Año del footer
document.getElementById('year').textContent = new Date().getFullYear();

// Agregar al carro desde "Más vendidos": abre el carro para elegir la talla ahí
document.querySelectorAll('.btn-add[data-id]').forEach((btn) => {
  btn.addEventListener('click', () => window.KOCart.add(btn.dataset.id, null, { openDrawer: true }));
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

// Formulario de clubes (validación simple; conectar a backend o servicio de formularios)
const clubForm = document.getElementById('clubForm');
const clubMsg = document.getElementById('clubMsg');
clubForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const club = clubForm.club.value.trim();
  const email = clubForm.email.value.trim();
  clubMsg.classList.remove('error');
  if (!club || !/^\S+@\S+\.\S+$/.test(email)) {
    clubMsg.textContent = 'Completa el nombre del club y un correo válido.';
    clubMsg.classList.add('error');
    return;
  }
  clubMsg.textContent = `Solicitud enviada. Te escribiremos a ${email} en menos de 24 horas hábiles.`;
  clubForm.reset();
});
