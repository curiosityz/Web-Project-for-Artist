/* THE PUBLIC WALL — shared doodle board.
   Tools: spray can (with drips), marker, roller, eraser.
   Sync: WebSocket to /ws when a live server runs it, BroadcastChannel
   between tabs otherwise; board persists in localStorage.
   Fans' doodles — never presented as Enem's work. */

const W = 1400, H = 640;
const LS_BOARD = 'enem_wall_v1';

function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

export function initDoodle(palette, toast, art = [], gallery = null) {
  const cv = document.getElementById('doodleCanvas');
  const ctx = cv.getContext('2d');
  cv.width = W; cv.height = H;

  let tool = 'spray', color = palette[0], size = 14;
  let drawing = false, last = null, lastDrip = 0;
  const undoStack = [];
  const myId = Math.random().toString(36).slice(2, 8);
  const peers = new Map();
  const seenMessageIds = new Set(), seenMessageOrder = [];
  let outgoingSeq = 0;
  let transport = 'local-only';

  // ---------- transport ----------
  let ws = null, bc = null;
  function send(msg) {
    msg.from = myId;
    msg.mid = `${myId}-${++outgoingSeq}`;
    if (ws && ws.readyState === 1) ws.send(JSON.stringify(msg));
    if (bc) bc.postMessage(msg);
  }
  function touchPeer(id, msg = {}) {
    if (typeof id !== 'string' || !id || id === myId) return;
    let peer = peers.get(id);
    if (!peer) peer = { last: 0, x: 0, y: 0, hidden: true, color: palette[1] || '#2cd4c6', el: null };
    peer.last = Date.now();
    if (msg.t === 'cursor') {
      peer.hidden = !!msg.hidden;
      if (Number.isFinite(msg.x) && Number.isFinite(msg.y)) {
        peer.x = Math.max(0, Math.min(1, msg.x));
        peer.y = Math.max(0, Math.min(1, msg.y));
      }
      if (typeof msg.color === 'string' && /^#[0-9a-f]{6}$/i.test(msg.color)) peer.color = msg.color;
      if (['spray', 'marker', 'roller', 'eraser', 'tag'].includes(msg.tool)) peer.tool = msg.tool;
      if (Number.isFinite(msg.size)) peer.size = Math.max(8, Math.min(26, msg.size));
      drawRemoteCursor(id, peer);
    }
    peers.set(id, peer);
  }
  function drawRemoteCursor(id, peer) {
    if (peer.hidden) { if (peer.el) peer.el.hidden = true; return; }
    if (!peer.el) {
      const el = document.createElement('div'); el.className = 'remote-cursor'; el.setAttribute('aria-hidden', 'true');
      const ringEl = document.createElement('i'); ringEl.className = 'remote-ring';
      const label = document.createElement('span'); label.className = 'remote-label';
      label.textContent = `WALL-${id.slice(0, 4).toUpperCase()}`;
      el.append(ringEl, label); wrap.appendChild(el); peer.el = el;
    }
    peer.el.hidden = false;
    peer.el.style.setProperty('--peer-color', peer.color);
    const cr = cv.getBoundingClientRect(), wr = wrap.getBoundingClientRect();
    const scale = cr.width / W, s = peer.size || 10;
    const diameter = peer.tool === 'spray' ? s * 3.6 * scale : peer.tool === 'roller' ? s * 5 * scale : peer.tool === 'eraser' ? s * 2.4 * scale : peer.tool === 'tag' ? 30 : s * scale;
    peer.el.style.setProperty('--peer-size', `${Math.max(12, Math.min(90, diameter))}px`);
    peer.el.style.left = `${cr.left - wr.left + peer.x * cr.width}px`;
    peer.el.style.top = `${cr.top - wr.top + peer.y * cr.height}px`;
  }
  function onMsg(msg) {
    if (!msg || msg.from === myId) return;
    if (msg.mid) {
      if (seenMessageIds.has(msg.mid)) return;
      seenMessageIds.add(msg.mid); seenMessageOrder.push(msg.mid);
      if (seenMessageOrder.length > 800) seenMessageIds.delete(seenMessageOrder.shift());
    }
    if (msg.t === 'op') { applyOp(msg, false); touchPeer(msg.from); }
    else if (msg.t === 'clear') { clearBoard(false); touchPeer(msg.from); }
    else if (msg.t === 'snap') { loadSnap(msg.data, true); touchPeer(msg.from); }
    else if (msg.t === 'need-snap') {
      if (hasPaint()) setTimeout(() => send({ t: 'snap', data: cv.toDataURL() }), Math.random() * 250);
      touchPeer(msg.from);
    } else if (msg.t === 'cursor') touchPeer(msg.from, msg);
    else if (msg.t === 'ping') touchPeer(msg.from);
  }
  try { bc = new BroadcastChannel('enem-wall'); bc.onmessage = (e) => onMsg(e.data); } catch (e) {}
  try {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    ws = new WebSocket(`${proto}://${location.host}/ws`);
    ws.onopen = () => { transport = 'live-server'; send({ t: 'need-snap' }); status(); };
    ws.onmessage = (e) => { try { onMsg(JSON.parse(e.data)); } catch (err) {} };
    ws.onclose = () => { ws = null; if (transport === 'live-server') { transport = bc ? 'tab-sync' : 'local-only'; status(); } };
    setTimeout(() => { if (!ws || ws.readyState !== 1) { transport = bc ? 'tab-sync' : 'local-only'; status(); } }, 1500);
  } catch (e) { transport = bc ? 'tab-sync' : 'local-only'; }
  if (bc && transport === 'local-only') transport = 'tab-sync';

  setInterval(() => { send({ t: 'ping' }); }, 2000);
  setInterval(() => {
    const now = Date.now();
    for (const [k, peer] of peers) {
      if (now - peer.last > 6000) { peer.el?.remove(); peers.delete(k); }
    }
    status();
  }, 3000);

  const statusEl = document.getElementById('doodleStatus');
  function status() {
    const n = peers.size + 1;
    statusEl.textContent = `● ${n} painter${n > 1 ? 's' : ''} · ${tool} · sync: ${transport}`;
  }
  status();

  // A deterministic daily exercise points back to real archive work; all resulting marks stay visitor-made.
  const studyText = document.getElementById('dailyPromptText');
  const studyDate = document.getElementById('dailyPromptDate');
  const studyReferenceButton = document.getElementById('promptReference');
  const studyPrompts = [
    (piece) => `Study “${piece.title}” and answer its negative space with an original shape. Don’t trace or reproduce the piece.`,
    (piece) => `Choose one color you notice in “${piece.title}” and make a new response using that color plus a neutral.`,
    (piece) => `Borrow the rhythm—not the letters—from “${piece.title}”. Make your own marks on the visitor wall.`,
    (piece) => `Make a three-mark response to “${piece.title}”. Keep the composition yours; this is a study, not a copy.`,
    (piece) => `Look at the balance in “${piece.title}” and answer with a different scale or direction.`,
  ];
  const day = new Date(); day.setHours(0, 0, 0, 0);
  const dayNumber = Math.floor(day.getTime() / 86400000);
  let promptOffset = 0, studyReference = null;
  function renderStudy(offset) {
    if (!studyText || !art.length) return;
    studyReference = art[((dayNumber * 7 + offset * 7) % art.length + art.length) % art.length];
    const prompt = studyPrompts[((dayNumber + offset) % studyPrompts.length + studyPrompts.length) % studyPrompts.length];
    studyText.textContent = prompt(studyReference);
    studyDate.textContent = `DAILY STARTING POINT · ${day.toLocaleDateString()} · VISITOR STUDIES ONLY`;
    studyReferenceButton.textContent = `OPEN “${studyReference.title}” IN ARCHIVE ↗`;
  }
  renderStudy(promptOffset);
  document.getElementById('newPrompt').addEventListener('click', () => { promptOffset++; renderStudy(promptOffset); });
  studyReferenceButton.addEventListener('click', () => {
    if (studyReference && gallery?.openPieceById) gallery.openPieceById(studyReference.file.split('/').pop().replace(/\.[^.]+$/, ''));
    else document.getElementById('walls').scrollIntoView({ behavior: 'smooth' });
  });
  document.getElementById('promptPalette').addEventListener('click', async (event) => {
    if (!studyReference) return;
    const button = event.currentTarget; button.disabled = true; button.textContent = 'SAMPLING PHOTO…';
    try {
      const sampled = await samplePhotoPalette(studyReference.file);
      palette.splice(0, palette.length, ...sampled);
      color = palette[0]; renderSwatches();
      toast('PHOTO PALETTE LIFTED — FOR VISITOR PAINT ONLY.');
    } catch { toast('COULD NOT SAMPLE THIS PHOTO.'); }
    finally { button.disabled = false; button.textContent = 'LIFT PHOTO PALETTE ◉'; }
  });

  function samplePhotoPalette(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        try {
          const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 64;
          const sampleCtx = canvas.getContext('2d', { willReadFrequently: true });
          sampleCtx.drawImage(image, 0, 0, 64, 64);
          const pixels = sampleCtx.getImageData(0, 0, 64, 64).data, histogram = new Map();
          for (let i = 0; i < pixels.length; i += 32) {
            if (pixels[i + 3] < 180) continue;
            const rgb = [0, 1, 2].map((channel) => Math.max(0, Math.min(255, Math.round(pixels[i + channel] / 24) * 24)));
            const key = rgb.join(','); histogram.set(key, (histogram.get(key) || 0) + 1);
          }
          const candidates = [...histogram].sort((a, b) => b[1] - a[1]).map(([key]) => key.split(',').map(Number));
          const selected = [];
          for (const rgb of candidates) {
            if (selected.every((other) => Math.hypot(rgb[0] - other[0], rgb[1] - other[1], rgb[2] - other[2]) > 44)) selected.push(rgb);
            if (selected.length === 5) break;
          }
          if (selected.length < 5) for (const rgb of candidates) { if (!selected.some((other) => other.join(',') === rgb.join(','))) selected.push(rgb); if (selected.length === 5) break; }
          const hex = selected.map((rgb) => '#' + rgb.map((v) => v.toString(16).padStart(2, '0')).join(''));
          resolve(hex.length ? hex : palette.slice(0, 5));
        } catch (error) { reject(error); }
      };
      image.onerror = reject; image.src = src;
    });
  }

  /* Cursor previews: a local brush ring plus ephemeral, anonymous remote cursors. */
  const wrap = document.querySelector('.wall-wrap');
  let lastCursorSent = 0, cursorTimer = null, pendingCursor = null;
  function publishCursor(event, hidden = false) {
    const r = cv.getBoundingClientRect();
    pendingCursor = { t: 'cursor', hidden, x: hidden ? 0 : (event.clientX - r.left) / r.width, y: hidden ? 0 : (event.clientY - r.top) / r.height, color, tool, size };
    const elapsed = Date.now() - lastCursorSent;
    if (hidden || elapsed >= 70) {
      if (cursorTimer) clearTimeout(cursorTimer);
      cursorTimer = null; send(pendingCursor); pendingCursor = null; lastCursorSent = Date.now();
    } else if (!cursorTimer) {
      cursorTimer = setTimeout(() => {
        cursorTimer = null;
        if (pendingCursor) { send(pendingCursor); pendingCursor = null; lastCursorSent = Date.now(); }
      }, 70 - elapsed);
    }
  }
  const ring = document.createElement('div');
  ring.id = 'dCursor';
  wrap.appendChild(ring);
  function ringSize() {
    const scale = cv.getBoundingClientRect().width / W;
    switch (tool) {
      case 'spray': return size * 3.6 * scale;
      case 'marker': return Math.max(6, size * scale);
      case 'roller': return size * 5 * scale;
      case 'eraser': return size * 2.4 * scale;
      case 'tag': return 46;
      default: return 20;
    }
  }
  cv.addEventListener('pointermove', (e) => {
    const wr = wrap.getBoundingClientRect();
    const d = ringSize();
    ring.style.display = 'block';
    ring.style.left = (e.clientX - wr.left) + 'px';
    ring.style.top = (e.clientY - wr.top) + 'px';
    ring.style.width = d + 'px';
    ring.style.height = d + 'px';
    ring.style.setProperty('--dc', tool === 'eraser' ? '#f2efe6' : color);
    ring.classList.toggle('eraser', tool === 'eraser');
    publishCursor(e);
  });
  cv.addEventListener('pointerleave', (e) => { ring.style.display = 'none'; publishCursor(e, true); });

  /* keyboard shortcuts */
  window.addEventListener('keydown', (e) => {
    if (/^(input|textarea|select)$/i.test(e.target.tagName) || e.target.isContentEditable) return;
    if (document.getElementById('guideDialog')?.open || document.getElementById('wallModeDialog')?.classList.contains('open') || document.getElementById('lightbox')?.classList.contains('open')) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); document.getElementById('dUndo').click(); return; }
    const k = e.key.toLowerCase();
    const map = { s: 'spray', m: 'marker', r: 'roller', e: 'eraser', t: 'tag' };
    if (map[k]) setTool(map[k]);
    if (k === '[' || k === ']') {
      const sizes = [8, 14, 26];
      let i = sizes.indexOf(size);
      i = k === ']' ? Math.min(2, i + 1) : Math.max(0, i - 1);
      setSize(sizes[i]);
    }
  });

  // ---------- board ----------
  function hasPaint() {
    // Snapshots can contain paint anywhere; scanning the full alpha plane keeps
    // late joiners from missing a wall whose marks aren't on the sampled rows.
    const data = ctx.getImageData(0, 0, W, H).data;
    for (let i = 3; i < data.length; i += 4) if (data[i] > 0) return true;
    return false;
  }

  function loadSnap(dataUrl, persist = true) {
    const im = new Image();
    im.onload = () => { ctx.clearRect(0, 0, W, H); ctx.drawImage(im, 0, 0); if (persist) saveSoon(); };
    im.src = dataUrl;
  }

  // restore
  try {
    const saved = localStorage.getItem(LS_BOARD);
    if (saved) loadSnap(saved, false);
    else send({ t: 'need-snap' });
  } catch (e) {}

  let saveT = null;
  function saveSoon() {
    clearTimeout(saveT);
    saveT = setTimeout(() => {
      try { localStorage.setItem(LS_BOARD, cv.toDataURL('image/png')); } catch (e) {}
    }, 1200);
  }

  function sprayDots(x, y, s, seed) {
    const rand = rng(seed + Math.floor(x * 7 + y * 13));
    const count = Math.round(s * 1.9);
    for (let i = 0; i < count; i++) {
      const a = rand() * Math.PI * 2, d = Math.pow(rand(), .56) * s * 1.6;
      const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d;
      const pr = .75 + rand() * (s * .15);
      // A real can lays down a readable cloud, not a trail of nearly invisible pixels.
      ctx.globalAlpha = .28 + rand() * .42;
      ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function applyOp(op, local) {
    ctx.save();
    ctx.fillStyle = op.color; ctx.strokeStyle = op.color;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (op.tool === 'eraser') ctx.globalCompositeOperation = 'destination-out';
    for (const seg of op.segs) {
      if (op.tool === 'spray') {
        sprayDots(seg[0], seg[1], op.size, op.seed + seg[0] * 31 + seg[1] * 17);
      } else if (op.tool === 'marker') {
        ctx.globalAlpha = .92; ctx.lineWidth = op.size;
        ctx.beginPath(); ctx.moveTo(seg[2], seg[3]); ctx.lineTo(seg[0], seg[1]); ctx.stroke();
        ctx.globalAlpha = 1;
      } else if (op.tool === 'roller') {
        ctx.globalAlpha = .4; ctx.lineWidth = op.size * 5; ctx.lineCap = 'butt';
        ctx.beginPath(); ctx.moveTo(seg[2], seg[3]); ctx.lineTo(seg[0], seg[1]); ctx.stroke();
        ctx.globalAlpha = 1;
      } else if (op.tool === 'eraser') {
        ctx.lineWidth = op.size * 2.4;
        ctx.beginPath(); ctx.moveTo(seg[2], seg[3]); ctx.lineTo(seg[0], seg[1]); ctx.stroke();
      }
      if (op.drip && op.drip[0] === seg[0] && op.drip[1] === seg[1]) {
        ctx.globalAlpha = .5; ctx.lineWidth = 2 + op.size * .12;
        ctx.beginPath(); ctx.moveTo(seg[0], seg[1]); ctx.lineTo(seg[0] + op.drip[2], seg[1] + op.drip[3]); ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
    if (op.tool === 'tag' && op.text) {
      ctx.save();
      ctx.translate(op.x, op.y);
      ctx.rotate(op.rot || 0);
      ctx.font = `${op.size * 3}px "Permanent Marker", cursive`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.globalAlpha = .95;
      ctx.fillText(op.text, 0, 0);
      ctx.restore();
    }
    ctx.restore();
    // Local edits and remote live edits both contribute to this browser's offline wall.
    saveSoon();
  }

  function pos(e) {
    const r = cv.getBoundingClientRect();
    return [ (e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H ];
  }

  cv.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    cv.setPointerCapture(e.pointerId);
    if (tool === 'tag') {
      const p = pos(e);
      const text = (document.getElementById('tagTxt').value.trim() || 'NM');
      const op = { t: 'op', tool: 'tag', color, size, seed: seedCounter++, segs: [], text, x: p[0], y: p[1], rot: (Math.random() - .5) * .22 };
      undoStack.push(ctx.getImageData(0, 0, W, H));
      if (undoStack.length > 8) undoStack.shift();
      applyOp(op, true);
      send(op);
      return;
    }
    drawing = true;
    undoStack.push(ctx.getImageData(0, 0, W, H));
    if (undoStack.length > 8) undoStack.shift();
    last = pos(e);
    strokeTo(last, true);
  });
  cv.addEventListener('pointermove', (e) => {
    if (!drawing) return;
    const p = pos(e);
    strokeTo(p, false);
    last = p;
  });
  const end = () => { drawing = false; last = null; };
  cv.addEventListener('pointerup', end);
  cv.addEventListener('pointercancel', end);

  let seedCounter = (Math.random() * 1e6) | 0;
  function strokeTo(p, isDown) {
    const from = last || p;
    let segs = [[p[0], p[1], from[0], from[1]]];
    if (tool === 'spray') {
      // Stamp along the pointer path so a fast hand doesn't leave dotted gaps.
      const dx = p[0] - from[0], dy = p[1] - from[1];
      const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / Math.max(3, size * .34)));
      segs = [];
      let x0 = from[0], y0 = from[1];
      for (let i = 1; i <= steps; i++) {
        const t = i / steps, x1 = from[0] + dx * t, y1 = from[1] + dy * t;
        segs.push([x1, y1, x0, y0]);
        x0 = x1; y0 = y1;
      }
    }
    const op = { t: 'op', tool, color, size, seed: seedCounter++, segs };
    // drip when the can lingers
    const now = Date.now();
    if (tool === 'spray' && !isDown && Math.hypot(p[0] - from[0], p[1] - from[1]) < 4 && now - lastDrip > 500) {
      lastDrip = now;
      op.drip = [p[0], p[1], (Math.random() - .5) * 6, 30 + Math.random() * 70];
    }
    applyOp(op, true);
    send(op);
  }

  function clearBoard(broadcast = true) {
    undoStack.push(ctx.getImageData(0, 0, W, H));
    if (undoStack.length > 8) undoStack.shift();
    ctx.clearRect(0, 0, W, H);
    saveSoon();
    if (broadcast) send({ t: 'clear' });
  }

  // ---------- toolbar ----------
  const q = (s) => document.querySelector(s);
  function setTool(t) {
    tool = t;
    document.querySelectorAll('.tools [data-tool]').forEach((x) => {
      const active = x.dataset.tool === t;
      x.classList.toggle('on', active);
      x.setAttribute('aria-pressed', String(active));
    });
    status();
  }
  function setSize(s) {
    size = s;
    document.querySelectorAll('.tools [data-size]').forEach((x) => {
      const active = +x.dataset.size === s;
      x.classList.toggle('on', active);
      x.setAttribute('aria-pressed', String(active));
    });
  }
  document.querySelectorAll('.tools [data-tool]').forEach((b) => b.addEventListener('click', () => setTool(b.dataset.tool)));
  function bindSwatches() {
    document.querySelectorAll('.tools .sw').forEach((b) => b.addEventListener('click', () => {
      color = b.dataset.c;
      document.querySelectorAll('.tools .sw').forEach((x) => {
        const active = x === b;
        x.classList.toggle('on', active);
        x.setAttribute('aria-pressed', String(active));
      });
    }));
  }
  function renderSwatches() {
    const swatches = document.getElementById('swatches');
    swatches.innerHTML = palette.map((hex, index) => `<button class="sw ${index === 0 ? 'on' : ''}" data-c="${hex}" style="background:${hex}" title="Paint ${hex}" aria-label="Paint color ${hex}" aria-pressed="${index === 0}"></button>`).join('');
    bindSwatches();
  }
  bindSwatches();
  document.querySelectorAll('.tools [data-size]').forEach((b) => b.addEventListener('click', () => setSize(+b.dataset.size)));
  q('#dUndo').addEventListener('click', () => {
    const s = undoStack.pop();
    if (s) {
      ctx.putImageData(s, 0, 0);
      saveSoon();
      // Undo is a board edit too — publish the resulting state to every painter.
      send({ t: 'snap', data: cv.toDataURL('image/png') });
    } else toast('NOTHING TO UNDO.');
  });
  // two-step buff (no browser confirm dialog)
  let buffArmed = false, buffT = null;
  const buffBtn = q('#dClear');
  buffBtn.addEventListener('click', () => {
    if (!buffArmed) {
      buffArmed = true;
      buffBtn.classList.add('danger');
      buffBtn.textContent = 'SURE?';
      buffT = setTimeout(disarm, 2500);
      return;
    }
    disarm();
    clearBoard(true);
  });
  function disarm() {
    buffArmed = false;
    clearTimeout(buffT);
    buffBtn.classList.remove('danger');
    buffBtn.textContent = 'BUFF';
  }
  q('#inviteWall').addEventListener('click', async () => {
    const url = `${location.origin}${location.pathname}#doodle`;
    if (navigator.share) {
      try { await navigator.share({ title: 'ENEM / TDK Public Wall', text: 'Leave a visitor-made mark on the shared ENEM fan wall.', url }); toast('PUBLIC WALL LINK SHARED.'); return; }
      catch (error) { if (error?.name === 'AbortError') return; }
    }
    try { await navigator.clipboard.writeText(url); toast('WALL INVITE COPIED — BRING ANOTHER PAINTER.'); }
    catch {
      const field = document.createElement('textarea'); field.value = url; field.style.position = 'fixed'; field.style.opacity = '0'; document.body.appendChild(field); field.select();
      let copied = false; try { copied = document.execCommand('copy'); } catch { copied = false; }
      field.remove(); toast(copied ? 'WALL INVITE COPIED — BRING ANOTHER PAINTER.' : 'COPY THE WALL LINK FROM YOUR ADDRESS BAR.');
    }
  });
  q('#dSave').addEventListener('click', () => {
    const out = document.createElement('canvas');
    out.width = W; out.height = H;
    const octx = out.getContext('2d');
    const wallColor = getComputedStyle(wrap).backgroundColor || '#bdb7aa';
    octx.fillStyle = wallColor; octx.fillRect(0, 0, W, H);
    const sheen = octx.createRadialGradient(W * .5, 0, 0, W * .5, H * .55, H * 1.2);
    sheen.addColorStop(0, 'rgba(255,255,255,.11)');
    sheen.addColorStop(1, 'rgba(0,0,0,.045)');
    octx.fillStyle = sheen; octx.fillRect(0, 0, W, H);
    octx.drawImage(cv, 0, 0);
    const a = document.createElement('a');
    a.download = 'enem-public-wall.png';
    a.href = out.toDataURL('image/png');
    a.click();
    toast('WALL SAVED AS PNG.');
  });
}
