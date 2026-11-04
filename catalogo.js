// KO Store — categorías y tallas del catálogo
// Los productos están en productos.js y se administran desde admin.html.
// Campos de cada producto:
// fotos: lista de rutas de fotos; la primera es la principal ([] si aún no hay foto).
//   Con 2 fotos la segunda aparece al pasar el mouse; con 3 o más la tarjeta muestra flechas.
//   (Los productos antiguos con img/img2 se siguen leyendo.)
// fit: "cover" si la foto es un primer plano que debe llenar el recuadro
// sizes: lista de tallas; [] si es talla única
// etiqueta: 'nuevo' u 'oferta' para mostrar un distintivo sobre la foto (opcional)
// oldPrice: precio anterior, se muestra tachado junto al precio actual (opcional)
// activo: false lo oculta de la tienda sin borrarlo
// destacado: true lo muestra en "Más vendidos" de la portada

window.KO_CATEGORIES = {
  doboks: 'Doboks',
  protecciones: 'Protecciones',
  electronicos: 'Sistemas electrónicos',
  entrenamiento: 'Entrenamiento',
  cinturones: 'Cinturones',
  accesorios: 'Bolsos y accesorios',
};

// Juegos de tallas que el panel ofrece como atajo
window.KO_TALLAS = {
  Dobok: ['110', '120', '130', '140', '150', '160', '170', '180', '190', '200'],
  Protecciones: ['XS', 'S', 'M', 'L', 'XL'],
  Pechera: ['0', '1', '2', '3', '4', '5'],
};

// img e img2 quedan disponibles para el carro y la tarjeta
(window.KO_PRODUCTOS || []).forEach((p) => {
  p.fotos = (Array.isArray(p.fotos) ? p.fotos : [p.img, p.img2]).filter(Boolean);
  p.img = p.fotos[0] || null;
  p.img2 = p.fotos[1] || null;
});

window.KO_CATALOG = (window.KO_PRODUCTOS || []).filter((p) => p.activo !== false);
