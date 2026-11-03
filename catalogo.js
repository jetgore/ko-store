// KO Store — catálogo de productos
// Para agregar un producto, copia un bloque y cambia sus datos.
// img: ruta de la foto (deja null si aún no hay foto)
// img2: segunda foto que aparece al pasar el mouse (opcional)
// fit: "cover" si la foto es un primer plano que debe llenar el recuadro
// sizes: lista de tallas; deja [] si es talla única
// etiqueta: 'nuevo' u 'oferta' para mostrar un distintivo sobre la foto (opcional)
// oldPrice: precio anterior, se muestra tachado junto al precio actual (opcional)

window.KO_CATEGORIES = {
  doboks: 'Doboks',
  protecciones: 'Protecciones',
  electronicos: 'Sistemas electrónicos',
  entrenamiento: 'Entrenamiento',
  cinturones: 'Cinturones',
  accesorios: 'Bolsos y accesorios',
};

const TALLAS_DOBOK = ['110', '120', '130', '140', '150', '160', '170', '180', '190', '200'];
const TALLAS_PROTEC = ['XS', 'S', 'M', 'L', 'XL'];
const TALLAS_PECHERA = ['0', '1', '2', '3', '4', '5'];

window.KO_CATALOG = [
  // ---------- Doboks ----------
  {
    id: 'dobok-fighter', cat: 'doboks', name: 'Dobok de combate Fighter', price: 34990,
    img: 'recursosgraficos/dobokfighter2.webp', img2: 'recursosgraficos/dobokfighter3.webp',
    short: 'Fighter', spec: 'Tela ripstop liviana, cuello en V negro.', sizes: TALLAS_DOBOK, badge: 'Aprobado WT',
  },
  {
    id: 'dobok-basic', cat: 'doboks', name: 'Dobok de entrenamiento Basic', price: 24990,
    img: 'recursosgraficos/dobokfighter.webp',
    short: 'Basic', spec: 'Algodón mezcla para el uso diario en el dojang.', sizes: TALLAS_DOBOK,
  },
  {
    id: 'dobok-poomsae-dan', cat: 'doboks', name: 'Dobok de poomsae Dan', price: 49990,
    img: 'recursosgraficos/dobokpoomsae1.webp',
    short: 'Poomsae', spec: 'Tela pesada con caída firme, cuello negro.', sizes: TALLAS_DOBOK.slice(2), badge: 'Aprobado WT',
  },
  {
    id: 'dobok-poomsae-premium', cat: 'doboks', name: 'Dobok de poomsae Premium', price: 64990,
    img: 'recursosgraficos/dobokpoomsae2.webp', fit: 'cover',
    short: 'Premium', spec: 'Tela texturizada de alto gramaje y bordado en el pecho.', sizes: TALLAS_DOBOK.slice(3), badge: 'Aprobado WT',
  },

  // ---------- Protecciones ----------
  {
    id: 'pechera-pro', cat: 'protecciones', name: 'Pechera reversible Pro', price: 29990,
    img: 'recursosgraficos/pechera.webp',
    short: 'Pechera', spec: 'Reversible chung / hong, espuma de alta densidad.', sizes: TALLAS_PECHERA,
  },
  {
    id: 'pechera-junior', cat: 'protecciones', name: 'Pechera reversible Junior', price: 22990,
    img: null,
    short: 'Pechera Jr', spec: 'Más liviana, pensada para niños de 5 a 12 años.', sizes: TALLAS_PECHERA.slice(0, 3),
  },
  {
    id: 'antebraceras', cat: 'protecciones', name: 'Antebraceras Competition', price: 14990,
    img: 'recursosgraficos/antebrazo.webp', fit: 'cover',
    short: 'Antebrazo', spec: 'Espuma moldeada y cierre de velcro doble.', sizes: TALLAS_PROTEC,
  },
  {
    id: 'empeineras', cat: 'protecciones', name: 'Empeineras de tela', price: 12990,
    img: 'recursosgraficos/empeineras.webp',
    short: 'Empeineras', spec: 'Tela elástica con acolchado en el empeine.', sizes: TALLAS_PROTEC,
  },
  {
    id: 'canilleras', cat: 'protecciones', name: 'Canilleras de combate', price: 16990,
    img: null,
    short: 'Canilleras', spec: 'Protección de tibia con funda elástica.', sizes: TALLAS_PROTEC,
  },
  {
    id: 'cabezal', cat: 'protecciones', name: 'Cabezal de combate', price: 27990,
    img: null,
    short: 'Cabezal', spec: 'Disponible en azul y rojo. Cierre ajustable.', sizes: ['S', 'M', 'L'],
  },
  {
    id: 'guantes', cat: 'protecciones', name: 'Guantes de combate', price: 13990,
    img: null,
    short: 'Guantes', spec: 'Dedos libres para agarrar y bloquear.', sizes: TALLAS_PROTEC,
  },
  {
    id: 'bucal', cat: 'protecciones', name: 'Protector bucal', price: 3990,
    img: null,
    short: 'Bucal', spec: 'Termomoldeable, con estuche.', sizes: [],
  },
  {
    id: 'inguinal', cat: 'protecciones', name: 'Protector inguinal', price: 9990,
    img: null,
    short: 'Inguinal', spec: 'Copa rígida con calzón elástico.', sizes: ['S', 'M', 'L'],
  },

  // ---------- Sistemas electrónicos ----------
  {
    id: 'pechera-electronica', cat: 'electronicos', name: 'Pechera electrónica PSS', price: 289990,
    img: null,
    short: 'Pechera PSS', spec: 'Sistema de puntuación con transmisor incluido.', sizes: ['1', '2', '3', '4', '5'],
  },
  {
    id: 'empeineras-sensores', cat: 'electronicos', name: 'Empeineras con sensores PSS', price: 89990,
    img: null,
    short: 'Sensores', spec: 'Compatibles con la pechera electrónica PSS.', sizes: TALLAS_PROTEC,
  },

  // ---------- Entrenamiento ----------
  {
    id: 'pao-doble', cat: 'entrenamiento', name: 'Pao doble de velocidad', price: 12990,
    img: null,
    short: 'Pao', spec: 'Sonido seco al impacto, mango reforzado.', sizes: [],
  },
  {
    id: 'escudo-pateo', cat: 'entrenamiento', name: 'Escudo de pateo grande', price: 32990,
    img: null,
    short: 'Escudo', spec: 'Para patadas de potencia, con dos asas.', sizes: [],
  },
  {
    id: 'escalera', cat: 'entrenamiento', name: 'Escalera de coordinación', price: 15990,
    img: null,
    short: 'Escalera', spec: '6 metros con peldaños regulables.', sizes: [],
  },
  {
    id: 'conos', cat: 'entrenamiento', name: 'Set de conos de agilidad', price: 8990,
    img: null,
    short: 'Conos', spec: '10 conos flexibles con bolsa de transporte.', sizes: [],
  },

  // ---------- Cinturones ----------
  {
    id: 'cinturon-color', cat: 'cinturones', name: 'Cinturón de color', price: 6990,
    img: null,
    short: 'Cinturón', spec: 'Blanco, amarillo, verde, azul o rojo.', sizes: ['220', '240', '260', '280', '300'],
  },
  {
    id: 'cinturon-negro', cat: 'cinturones', name: 'Cinturón negro con bordado', price: 14990,
    img: null,
    short: 'Dan', spec: 'Bordado con tu nombre y grado, a pedido.', sizes: ['260', '280', '300', '320'],
  },

  // ---------- Bolsos y accesorios ----------
  {
    id: 'bolso', cat: 'accesorios', name: 'Bolso de equipo', price: 34990,
    img: null,
    short: 'Bolso', spec: 'Cabe el equipo completo de combate.', sizes: [],
  },
  {
    id: 'mochila', cat: 'accesorios', name: 'Mochila porta dobok', price: 24990,
    img: null,
    short: 'Mochila', spec: 'Compartimento separado para el dobok.', sizes: [],
  },
  {
    id: 'vendas', cat: 'accesorios', name: 'Vendas elásticas (par)', price: 4990,
    img: null,
    short: 'Vendas', spec: '3 metros, para muñecas y tobillos.', sizes: [],
  },
];
