// KO Store — página de un producto (producto/<id>.html, generada por scripts/build.js)
// Cambia la foto principal con las miniaturas y agrega el producto al carro.

(function () {
  document.getElementById('year').textContent = new Date().getFullYear();

  // Miniaturas: muestran la foto elegida en grande
  const main = document.querySelector('.pdp-main img');
  document.querySelectorAll('.pdp-thumbs button').forEach((btn) => {
    btn.addEventListener('click', () => {
      main.src = btn.dataset.src;
      document.querySelectorAll('.pdp-thumbs button').forEach((b) =>
        b.setAttribute('aria-current', String(b === btn)));
    });
  });

  // Agregar al carro, pidiendo la talla si el producto tiene tallas
  const buy = document.querySelector('.pdp-buy');
  if (!buy) return;
  const select = buy.querySelector('select');
  const err = buy.querySelector('.size-error');
  const btn = buy.querySelector('.btn-add');
  btn.addEventListener('click', () => {
    if (select && !select.value) {
      select.classList.add('needs-size');
      err.textContent = 'Elige una talla para agregarlo.';
      select.focus();
      return;
    }
    window.KOCart.add(buy.dataset.id, select ? select.value : null, { openDrawer: true });
  });
  if (select) {
    select.addEventListener('change', () => {
      select.classList.remove('needs-size');
      err.textContent = '';
    });
  }

  // "Más productos": en la tarjeta se elige la talla dentro del carro
  const related = document.querySelector('.pdp-related');
  if (related) {
    related.addEventListener('click', (e) => {
      const add = e.target.closest('.btn-add');
      if (add) window.KOCart.add(add.closest('.product').dataset.id, null, { openDrawer: true });
    });
  }
})();
