/* ENEM THA GREAT — zero-dependency static + WebSocket server.
   node server.cjs   →  http://0.0.0.0:8080  (WS on /ws for the Public Wall) */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const PORT = process.env.PORT || 8080;
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.mp3': 'audio/mpeg', '.json': 'application/json',
  '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json; charset=utf-8',
};

const server = http.createServer((req, res) => {
  let p;
  try { p = decodeURIComponent(req.url.split('?')[0]); }
  catch { res.writeHead(400); return res.end('400'); }
  if (p === '/') p = '/index.html';
  const file = path.resolve(ROOT, `.${p}`);
  const relative = path.relative(ROOT, file);
  if (relative.startsWith('..') || path.isAbsolute(relative)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('404'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
});

/* ---------- minimal WebSocket (RFC6455 subset: text/ping/close, broadcast) ---------- */
const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const clients = new Set();
let lastSnap = null;

function sendFrame(sock, str) {
  const buf = Buffer.from(str, 'utf8');
  let head;
  if (buf.length < 126) { head = Buffer.from([0x81, buf.length]); }
  else if (buf.length < 65536) { head = Buffer.from([0x81, 126, buf.length >> 8, buf.length & 255]); }
  else { head = Buffer.alloc(10); head[0] = 0x81; head[1] = 127; head.writeBigUInt64BE(BigInt(buf.length), 2); }
  try { sock.write(Buffer.concat([head, buf])); } catch (e) {}
}

server.on('upgrade', (req, sock) => {
  if (req.url.split('?')[0] !== '/ws') { sock.destroy(); return; }
  const key = req.headers['sec-websocket-key'];
  if (!key || req.headers.upgrade?.toLowerCase() !== 'websocket') { sock.destroy(); return; }
  const accept = crypto.createHash('sha1').update(key + GUID).digest('base64');
  sock.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
    'Upgrade: websocket\r\nConnection: Upgrade\r\n' +
    `Sec-WebSocket-Accept: ${accept}\r\n\r\n`);
  clients.add(sock);
  let buf = Buffer.alloc(0);
  sock.on('data', (chunk) => {
    buf = Buffer.concat([buf, chunk]);
    while (buf.length >= 2) {
      const op = buf[0] & 0x0f;
      const masked = (buf[1] & 0x80) !== 0;
      let len = buf[1] & 0x7f, off = 2;
      if (len === 126) { if (buf.length < 4) return; len = buf.readUInt16BE(2); off = 4; }
      else if (len === 127) { if (buf.length < 10) return; len = Number(buf.readBigUInt64BE(2)); off = 10; }
      if (len > 8 * 1024 * 1024) { sock.destroy(); return; }
      if (masked) { if (buf.length < off + 4 + len) return; }
      else if (buf.length < off + len) return;
      let payload;
      if (masked) {
        const mask = buf.slice(off, off + 4);
        payload = Buffer.alloc(len);
        const d = buf.slice(off + 4, off + 4 + len);
        for (let i = 0; i < len; i++) payload[i] = d[i] ^ mask[i & 3];
      } else payload = buf.slice(off, off + len);
      buf = buf.slice(off + (masked ? 4 : 0) + len);
      if (op === 8) { sock.end(); break; }
      if (op === 9) { try { sock.write(Buffer.from([0x8a, 0])); } catch (e) {} continue; }
      if (op === 1) {
        const msg = payload.toString('utf8');
        try {
          const j = JSON.parse(msg);
          if (j.t === 'snap') lastSnap = msg;
          if (j.t === 'need-snap' && lastSnap) sendFrame(sock, lastSnap);
        } catch (e) {}
        for (const c of clients) if (c !== sock) sendFrame(c, msg);
      }
    }
  });
  const drop = () => clients.delete(sock);
  sock.on('close', drop); sock.on('error', drop);
});

server.listen(PORT, '0.0.0.0', () => console.log(`ENEM site live on :${PORT} (ws on /ws)`));
