# KO Store

Tienda online de equipamiento de taekwondo WT (Santiago, Chile). Sitio estático en HTML, CSS y JavaScript sin frameworks, publicado en Vercel desde `main` de `jetgore/ko-store`. Un único paso de build sin dependencias (`node scripts/build.js`, ver "SEO y páginas generadas") arma el sitio en `dist/`.

## Idioma y tono

- Todo el contenido, los comentarios del código y los mensajes de commit van en **español de Chile** (`lang="es-CL"`, precios en CLP con `toLocaleString('es-CL')`).
- Vocabulario del rubro: dobok, poomsae, dojang, chung (azul) / hong (rojo), dan, poom.
- No inventar datos del negocio (precios, plazos, políticas, testimonios, descuentos). Usar solo lo que ya está en el sitio o lo que diga el dueño.

## Estructura

| Archivo | Qué hace |
|---|---|
| `index.html` | Portada: hero, categorías, combate vs. poomsae, "Más vendidos", calculadora de tallas, comentarios y cotización para clubes |
| `tienda.html` + `tienda.js` | Catálogo con búsqueda y orden. Los filtros de categoría son enlaces a las páginas de categoría (`doboks.html`, etc.), que se generan desde `tienda.html` con `<body data-cat>` |
| `producto.js` | Interacción de las páginas de producto generadas (`producto/<id>.html`): miniaturas y agregar al carro |
| `scripts/build.js` | Genera `dist/`: copia el sitio, crea las páginas de producto y de categoría, los datos estructurados y `sitemap.xml` |
| `scripts/serve.js` | Vista previa local: ejecuta el build y sirve `dist/` en http://localhost:5173 |
| `vercel.json` | Le indica a Vercel que ejecute el build y publique `dist/` |
| `robots.txt` | Indica dónde está el sitemap |
| `ayuda.html` | Envíos, cambios, preguntas frecuentes y formulario de contacto (`#contacto`) |
| `admin.html` + `admin.js` + `admin.css` | Panel de productos y moderación de comentarios (ver más abajo). Tiene `noindex` y no se enlaza desde el sitio |
| `checkout.html` + `checkout.js` | Finalizar compra **simulada** (sin cobro real ni datos de tarjeta). Envía el pedido a `/api/pedidos` |
| `pedido.html` + `pedido.js` | Seguimiento del pedido para quien compra (`?n=número&c=clave`): estado, boleta simulada y despacho ficticio |
| `admin-pedidos.js` | Pestañas "Pedidos" y "Boleta y despacho" del panel |
| `pedidos-comun.js` | Estados, formato del issue y boleta (`KOPedidos`), compartido por `pedido.html` y el panel |
| `productos.js` | **Datos de los productos** (`window.KO_PRODUCTOS`). Lo genera el panel |
| `comentarios.js` | Comentarios aprobados (`window.KO_COMENTARIOS`). Lo genera el panel; solo lo carga `index.html` |
| `api/` | Funciones de Vercel: `contacto.js` (correo con Resend), `comentarios.js` (crea el issue pendiente), `pedidos.js` (crea y consulta pedidos simulados), `pedido-aviso.js` (correo a quien compró), `_pedidos.js` (formato de los pedidos; no es ruta) y `_lib.js` (validación y trampas para bots; no es ruta) |
| `catalogo.js` | Categorías (`KO_CATEGORIES`), juegos de tallas (`KO_TALLAS`) y `KO_CATALOG` (solo productos con `activo !== false`) |
| `config.js` | Email, WhatsApp, Instagram, repositorio del panel y aviso superior (`KO_CONFIG`) |
| `comun.js` | Común a todas las páginas: aviso superior, menú móvil, botón de WhatsApp, enlaces de contacto, envío de `form[data-envio]`, `KOEsc` y `KOProductCard` |
| `cart.js` | Carro en `localStorage` (`ko-cart`) y panel lateral. "Ir a pagar" abre `checkout.html`; el enlace secundario arma el pedido por WhatsApp o, sin número, por correo |
| `script.js` | Portada: destacados, conteo por categoría, calculadora de tallas y lista de comentarios |
| `styles.css` | Estilos del sitio. Tokens en `:root` (`--chung`, `--hong`, `--ink`, etc.) |
| `recursosgraficos/` | Imágenes en `.webp`. Fotos subidas desde el panel en `recursosgraficos/productos/` |

### Orden de carga de scripts (no cambiarlo)

```html
<script src="config.js"></script>
<script src="productos.js"></script>
<script src="comentarios.js"></script>  <!-- solo en index.html -->
<script src="catalogo.js"></script>
<script src="comun.js"></script>
<script src="cart.js"></script>
<script src="script.js"></script>   <!-- o tienda.js según la página -->
```

Todo se comunica con globales en `window` (`KO_CONFIG`, `KO_PRODUCTOS`, `KO_CATALOG`, `KOCart`, `KOProductCard`, `KOEsc`, `KOContact`). No hay módulos ni bundler.

## Productos

Campos de cada producto en `productos.js`: `id`, `cat`, `name`, `price`, `fotos` (lista; la primera es la principal; los antiguos `img`/`img2` se siguen leyendo), `fit` (`'cover'`), `short`, `spec`, `sizes` (`[]` = talla única), `badge`, `etiqueta` (`'nuevo'` | `'oferta'`), `oldPrice`, `activo`, `destacado` (máximo 4, se muestran en la portada), `stock` (entero opcional; sin el campo, el producto no controla stock), `desc` (descripción completa, opcional; se muestra en la página del producto).

- `productos.js` debe mantener el formato exacto que escribe el panel: dos líneas de comentario y luego `window.KO_PRODUCTOS = <JSON>;`. El panel lo lee buscando el JSON después de `KO_PRODUCTOS`, así que debe seguir siendo JSON válido (comillas dobles, sin comentarios ni comas finales).
- El `id` se usa en el carro guardado de los clientes: no cambiar el `id` de un producto existente.
- Cualquier texto de producto que se inserte con `innerHTML` pasa por `KOEsc`.

## Panel de administración

`admin.html` usa la API de GitHub con un token fine-grained del dueño (Contents: Read and write sobre `jetgore/ko-store`). Edita los productos en memoria y al presionar "Publicar cambios" crea **un solo commit** en `main` con `productos.js` y las fotos nuevas (reducidas a 1200 px y pasadas a WebP). Vercel publica solo.

Consecuencia: **GitHub puede tener commits que no están en la copia local**. Antes de editar cualquier archivo, ejecutar `git pull`.

## Formularios y comentarios

- Los formularios con `data-envio="/api/..."` (cotización de clubes, contacto en `ayuda.html#contacto`, comentarios) se envían con el código común de `comun.js`: mandan los campos con `name` como JSON, más `ms` (tiempo desde que se abrió la página). Cada formulario lleva el campo trampa oculto `sitio`. `data-ok` es el mensaje de éxito y `data-error` en un campo cambia su mensaje de validación.
- **Contacto y clubes** → `api/contacto.js` → correo con Resend a `CONTACTO_EMAIL`, con `reply_to` del visitante.
- **Comentarios** → `api/comentarios.js` → issue `[Comentario] Nombre` en GitHub, con los datos en `<!-- ko-comentario {...} -->`. **No se publica nada sin aprobación**: en `admin.html` → Comentarios, "Aprobar" agrega el comentario a `comentarios.js` (un commit) y cierra el issue; "Rechazar" solo lo cierra. El panel solo considera los issues creados por el dueño del repositorio (la cuenta del token de la función).
- El repositorio es público: los comentarios pendientes se ven como issues en GitHub. No se guarda el correo de quien comenta.
- Variables de entorno en Vercel (Settings → Environment Variables): `RESEND_API_KEY`, `CONTACTO_EMAIL`, `CONTACTO_REMITENTE` (opcional), `GITHUB_TOKEN` (fine-grained del dueño, solo Issues: Read and write sobre el repo y sobre el repo privado de pedidos), `GITHUB_REPO_PEDIDOS` (repo privado de pedidos), `GITHUB_REPO` (opcional) y `TURNSTILE_SECRET` (opcional, ver abajo). Sin las obligatorias, los formularios responden "no disponible" y muestran el correo de `KO_CONFIG.email`.
- El token del panel necesita Contents **e Issues** en Read and write (Issues también sobre el repositorio de pedidos). Se guarda solo en `sessionStorage` (se olvida al cerrar la pestaña); no volver a guardarlo en `localStorage`.
- **Protección contra spam** (`api/_lib.js`): además del campo trampa y el tiempo mínimo, cada IP puede enviar como máximo 5 formularios cada 10 minutos (en memoria, por instancia de la función; responde 429). `api/comentarios.js` deja de recibir comentarios cuando hay 30 pendientes de revisar.
- **Cloudflare Turnstile** (opcional, "No soy un robot"): se activa poniendo la clave de sitio en `KO_CONFIG.turnstile` (`config.js`) y la clave secreta en la variable `TURNSTILE_SECRET` de Vercel. `comun.js` muestra el widget antes del botón de cada `form[data-envio]` y envía su respuesta como `turnstile`. Con una sola de las dos claves los formularios fallan: configurar ambas a la vez.

## Seguridad

- `vercel.json` define las cabeceras de todas las páginas: `Content-Security-Policy` (solo scripts propios y de `challenges.cloudflare.com`, estilos propios y de Google Fonts, `connect-src` a la API de GitHub, `frame-ancestors 'none'`), `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` y `Permissions-Policy`.
- Por la CSP: **no usar `<script>` en línea, atributos `on…=` ni `style="…"`** en el HTML ni en el HTML generado por JS. Si se agrega un servicio externo (pagos, analítica, un CDN), sumar su dominio a la directiva que corresponda en `vercel.json` y probarlo.
- Los bloques `<script type="application/ld+json">` sí están permitidos (no se ejecutan).

## SEO y páginas generadas

- Dominio canónico: `https://ko-store.vercel.app` (constante `SITE` en `scripts/build.js` y en los `<link rel="canonical">` / `og:` de `index.html`, `tienda.html` y `ayuda.html`, más `robots.txt`). Si cambia el dominio, actualizarlo en todos esos lugares.
- `scripts/build.js` corre en cada publicación de Vercel y genera en `dist/` (que está en `.gitignore`): `producto/<id>.html` por cada producto activo, una página por categoría (`<clave>.html`, con textos en `CAT_SEO`), el JSON-LD (`Product`, `BreadcrumbList`, `ItemList`) y `sitemap.xml`. Las categorías sin productos quedan con `noindex` y fuera del sitemap.
- Las páginas de producto usan `<base href="/">`: dentro de ellas, las rutas relativas se resuelven desde la raíz.
- Los textos de categoría y producto siguen la regla de no inventar datos del negocio.
- Si el build falla, Vercel no publica y el sitio sigue con la versión anterior.

## Pedidos simulados (venta, boleta y despacho)

Todo el flujo es **de prueba**: no hay cobro real, no se piden datos de tarjeta, la boleta no tiene validez tributaria y el despacho es ficticio. Las páginas y los correos lo dicen explícitamente; no quitar esos avisos mientras no exista un pago real.

- `checkout.html` envía el formulario con el código común (`data-envio="/api/pedidos"`); `checkout.js` agrega las líneas del carro en el evento `ko-envio` y redirige a `pedido.html` en `ko-envio-ok`.
- `api/pedidos.js` valida los datos, **toma nombres y precios de `productos.js`** (nunca del navegador) y crea un issue `[Pedido] Nombre` con los datos en `<!-- ko-pedido {...} -->` en el repositorio de pedidos. El número del pedido es el del issue (`KO-0012`) y la `clave` aleatoria del enlace es lo que deja ver el pedido a quien compró.
- **El repositorio de pedidos debe ser privado** (`KO_CONFIG.repoPedidos` y `GITHUB_REPO_PEDIDOS`, por defecto `jetgore/ko-store-pedidos`): los issues llevan nombre, correo, teléfono y dirección. No guardar pedidos en `jetgore/ko-store`, que es público. Sin `GITHUB_REPO_PEDIDOS`, la compra responde "no disponible".
- Etapas (`estado`): `recibido` → `pagado` → `confirmado` → `boleta` → `despachado` → `entregado`, o `anulado`. El panel avanza reescribiendo el cuerpo del issue (`KOPedidos.cuerpo`, mismo formato que `api/_pedidos.js`: si se cambia uno, cambiar el otro) y cierra el issue al entregar o anular.
- Panel → **Pedidos**: muestra el stock de cada línea, "Confirmar pago (simulado)" y "Confirmar pedido y avisar" (descuenta el stock de los productos que lo controlan con un commit a `productos.js` y guarda lo descontado en `stockDescontado` para reponerlo si se anula). Panel → **Boleta y despacho**: emite la boleta (folio correlativo, neto e IVA 19 % calculados desde el total) y registra transportista y número de seguimiento ficticio.
- Avisos: cada cambio llama a `api/pedido-aviso.js` con el token del panel; la función solo acepta al dueño del repositorio y arma el correo desde el issue. Sin Resend (o sin dominio verificado, que solo deja enviar al correo de la cuenta) el aviso no sale, pero quien compró ve todo en `pedido.html`.
- Mover stock desde un pedido exige no tener cambios de productos sin publicar en el panel.

## Desarrollo local

```bash
node scripts/serve.js
```

Arma `dist/` y lo sirve en http://localhost:5173 (las funciones de `api/` solo corren en Vercel o con `npx vercel dev`). Las páginas de producto y de categoría solo existen en `dist/`; abrir los `.html` con `file://` no carga bien los estilos ni las imágenes.

Revisar siempre en ancho de celular (375 px): la mayoría de las visitas llegan desde redes sociales.

## Convenciones

- JavaScript vanilla en IIFE o en el ámbito global, `const`/`let`, funciones flecha y template strings, igual que el código existente.
- Imágenes nuevas en `.webp`, con nombres en minúsculas y sin espacios. Los PNG originales pesados están en `.gitignore`.
- Mantener la accesibilidad que ya existe: `aria-label`, `aria-live` en los mensajes, foco visible, `alt` en las imágenes y respeto de `prefers-reduced-motion`.
- `localStorage`/`sessionStorage` siempre dentro de `try/catch`.

## Publicar

```bash
git pull
git add <archivos>
git commit -m "Mensaje en español"
git push
```

Vercel publica `main` automáticamente en 1 o 2 minutos.

## Pendiente

- Pago en línea real: hoy la compra en `checkout.html` es simulada (ver "Pedidos simulados") y el pedido real se cierra por WhatsApp o correo. Opciones evaluadas: Shopify (Buy Button o Storefront API) o Mercado Pago / Flow con una función en Vercel.
- `whatsapp` e `instagram` vacíos en `config.js`: mientras estén vacíos, el botón flotante y esos enlaces se ocultan.
- 12 productos sin foto.
- Pedidos simulados: crear el repositorio privado `jetgore/ko-store-pedidos`, definir `GITHUB_REPO_PEDIDOS` en Vercel y dar acceso a ese repo a los dos tokens. El stock es por producto (no por talla) y la tienda no muestra "agotado".
- Configurar en Vercel las variables de entorno de los formularios (ver "Formularios y comentarios").
- Activar Cloudflare Turnstile (clave de sitio en `config.js` + `TURNSTILE_SECRET` en Vercel) y, si llega spam igual, una regla de límite de envíos sobre `/api/*` en Vercel → Firewall.
