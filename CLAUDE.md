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
| `productos.js` | **Datos de los productos** (`window.KO_PRODUCTOS`). Lo genera el panel |
| `comentarios.js` | Comentarios aprobados (`window.KO_COMENTARIOS`). Lo genera el panel; solo lo carga `index.html` |
| `api/` | Funciones de Vercel: `contacto.js` (correo con Resend), `comentarios.js` (crea el issue pendiente) y `_lib.js` (validación y trampas para bots; no es ruta) |
| `catalogo.js` | Categorías (`KO_CATEGORIES`), juegos de tallas (`KO_TALLAS`) y `KO_CATALOG` (solo productos con `activo !== false`) |
| `config.js` | Email, WhatsApp, Instagram, repositorio del panel y aviso superior (`KO_CONFIG`) |
| `comun.js` | Común a todas las páginas: aviso superior, menú móvil, botón de WhatsApp, enlaces de contacto, envío de `form[data-envio]`, `KOEsc` y `KOProductCard` |
| `cart.js` | Carro en `localStorage` (`ko-cart`) y panel lateral. "Enviar pedido" arma el pedido por WhatsApp o, sin número, por correo |
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

Campos de cada producto en `productos.js`: `id`, `cat`, `name`, `price`, `fotos` (lista; la primera es la principal; los antiguos `img`/`img2` se siguen leyendo), `fit` (`'cover'`), `short`, `spec`, `sizes` (`[]` = talla única), `badge`, `etiqueta` (`'nuevo'` | `'oferta'`), `oldPrice`, `activo`, `destacado` (máximo 4, se muestran en la portada), `desc` (descripción completa, opcional; se muestra en la página del producto).

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
- Variables de entorno en Vercel (Settings → Environment Variables): `RESEND_API_KEY`, `CONTACTO_EMAIL`, `CONTACTO_REMITENTE` (opcional), `GITHUB_TOKEN` (fine-grained del dueño, solo Issues: Read and write sobre el repo) y `GITHUB_REPO` (opcional). Sin ellas, los formularios responden "no disponible" y muestran el correo de `KO_CONFIG.email`.
- El token del panel necesita Contents **e Issues** en Read and write.

## SEO y páginas generadas

- Dominio canónico: `https://ko-store.vercel.app` (constante `SITE` en `scripts/build.js` y en los `<link rel="canonical">` / `og:` de `index.html`, `tienda.html` y `ayuda.html`, más `robots.txt`). Si cambia el dominio, actualizarlo en todos esos lugares.
- `scripts/build.js` corre en cada publicación de Vercel y genera en `dist/` (que está en `.gitignore`): `producto/<id>.html` por cada producto activo, una página por categoría (`<clave>.html`, con textos en `CAT_SEO`), el JSON-LD (`Product`, `BreadcrumbList`, `ItemList`) y `sitemap.xml`. Las categorías sin productos quedan con `noindex` y fuera del sitemap.
- Las páginas de producto usan `<base href="/">`: dentro de ellas, las rutas relativas se resuelven desde la raíz.
- Los textos de categoría y producto siguen la regla de no inventar datos del negocio.
- Si el build falla, Vercel no publica y el sitio sigue con la versión anterior.

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

- Pago en línea: hoy el pedido se cierra por WhatsApp o correo. Opciones evaluadas: Shopify (Buy Button o Storefront API) o Mercado Pago / Flow con una función en Vercel.
- `whatsapp` e `instagram` vacíos en `config.js`: mientras estén vacíos, el botón flotante y esos enlaces se ocultan.
- 12 productos sin foto.
- Configurar en Vercel las variables de entorno de los formularios (ver "Formularios y comentarios").
- Sin límite de envíos por IP en las funciones: si llega spam, agregar un captcha (por ejemplo Cloudflare Turnstile).
