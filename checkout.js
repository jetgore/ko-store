// KO Store — finalizar compra (checkout.html). Compra simulada: no hay cobro real.
// El formulario se envía con el código común de comun.js (data-envio="/api/pedidos");
// aquí se dibuja el resumen del carro, se agregan las líneas al envío y, cuando el
// pedido queda ingresado, se vacía el carro y se abre la página de seguimiento.

(function () {
  const $ = (id) => document.getElementById(id);
  const esc = window.KOEsc;
  const fmt = window.KOCart.format;
  const RM = 'Metropolitana de Santiago';
  const form = $('checkoutForm');
  let enviado = false;

  function draw() {
    if (enviado) return;
    const items = window.KOCart.items();
    $('checkoutEmpty').hidden = items.length > 0;
    $('checkoutGrid').hidden = items.length === 0;

    $('sumList').innerHTML = items.map((i) => `
      <li>
        <span class="sum-qty">${i.qty} ×</span>
        <span class="sum-name">${esc(i.product.name)}${i.product.sizes.length
          ? ` <span class="${i.size ? 'ped-talla' : 'ped-talla falta'}">${i.size ? `Talla ${esc(i.size)}` : 'Falta la talla'}</span>` : ''}</span>
        <span class="sum-price">${fmt(i.product.price * i.qty)}</span>
      </li>`).join('');

    const subtotal = items.reduce((s, i) => s + i.product.price * i.qty, 0);
    const region = $('co-region').value;
    const gratis = region === RM && subtotal >= window.KOCart.envioGratis;
    $('sumSubtotal').textContent = fmt(subtotal);
    $('sumEnvio').textContent = gratis ? 'Gratis' : 'Por confirmar';
    $('sumTotal').textContent = fmt(subtotal);
    $('sumNote').textContent = gratis
      ? ''
      : `El envío es gratis en Santiago en compras sobre ${fmt(window.KOCart.envioGratis)}. En otro caso te confirmamos el costo al revisar tu pedido; el total de esta simulación no lo incluye.`;
  }

  document.addEventListener('ko-cart', draw);
  $('co-region').addEventListener('change', draw);
  $('sumEdit').addEventListener('click', () => window.KOCart.open());

  // Antes de enviar: se agregan las líneas del carro (el precio lo pone el servidor)
  form.addEventListener('ko-envio', (e) => {
    const items = window.KOCart.items();
    const falta = items.find((i) => i.product.sizes.length && !i.size);
    if (!items.length || falta) {
      e.detail.error = falta
        ? `Elige la talla de "${falta.product.name}" en el carro antes de pagar.`
        : 'Tu carro está vacío.';
      e.preventDefault();
      if (falta) window.KOCart.open();
      return;
    }
    e.detail.data.items = items.map(({ id, size, qty }) => ({ id, size, qty }));
  });

  // Pedido ingresado: se recuerda en este navegador, se vacía el carro y se muestra el seguimiento
  form.addEventListener('ko-envio-ok', (e) => {
    const { n, c } = e.detail.out;
    if (!n || !c) return;
    enviado = true;
    try {
      const guardados = JSON.parse(localStorage.getItem('ko-pedidos')) || [];
      localStorage.setItem('ko-pedidos', JSON.stringify([{ n, c }, ...guardados].slice(0, 20)));
    } catch (err) { /* sin almacenamiento */ }
    window.KOCart.clear();
    location.href = `pedido.html?n=${encodeURIComponent(n)}&c=${encodeURIComponent(c)}`;
  });

  draw();
})();
