// KO Store — vista previa local: arma el sitio (dist/) y lo sirve en http://localhost:5173
// Uso: node scripts/serve.js
require('./build.js');
const http = require('http');
const fs = require('fs');
const path = require('path');

const DIST = path.join(__dirname, '..', 'dist');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.xml': 'application/xml',
  '.txt': 'text/plain', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml' };

http.createServer((req, res) => {
  let file = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (file.endsWith('/')) file += 'index.html';
  const full = path.join(DIST, path.normalize(file));
  if (!full.startsWith(DIST) || !fs.existsSync(full) || fs.statSync(full).isDirectory()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('No encontrado');
    return;
  }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(full)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(full).pipe(res);
}).listen(5173, () => console.log('Vista previa en http://localhost:5173'));
