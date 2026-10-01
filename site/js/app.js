/* ENEM THA GREAT — app glue: loader, nav, reveals, marquee, sections. */

import { initSpray } from './spray.js';
import { initPlayer } from './player.js';
import { initGallery } from './gallery.js';
import { initMerch } from './merch.js';
import { initDoodle } from './doodle.js';
import { initFx } from './fx.js';
import { ART, TRACKS, PRODUCTS, QUOTES, CREWS, NAMES, LINKS, ALBUM } from './data.js';

export function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove('show'), 2600);
}

function buildSourceLedger() {
  const host = document.getElementById('sourceGrid');
  const summary = document.getElementById('sourceSummary');
  if (!host || !summary) return;
  const groups = new Map();
  function add(label, url, kind) {
    const key = `${label}|${url || ''}`;
    if (!groups.has(key)) groups.set(key, { label, url, kinds: new Map() });
    const group = groups.get(key);
    group.kinds.set(kind, (group.kinds.get(kind) || 0) + 1);
  }
  ART.forEach((item) => add(item.source || 'Source not recorded', item.sourceUrl || '', 'artwork record'));
  QUOTES.forEach((quote) => add(quote.src, quote.src.includes('Spray Planet') ? LINKS.sprayplanet : LINKS.bs, 'interview quote'));
  TRACKS.forEach((track) => add(`Bandcamp track · ${track.title}`, track.url, 'track link'));
  add('Grilchy Party / Bandcamp · album release', ALBUM.url, 'album release');
  summary.textContent = `${ART.length} artwork records · ${QUOTES.length} quotes · ${TRACKS.length} track links`;
  host.replaceChildren();
  for (const source of groups.values()) {
    const article = document.createElement('article'); article.className = 'source-entry';
    const heading = document.createElement('h4'); heading.textContent = source.label; article.appendChild(heading);
    const kinds = [...source.kinds].map(([kind, count]) => `${count} ${kind}${count === 1 ? '' : 's'}`).join(' · ');
    const detail = document.createElement('p'); detail.textContent = kinds; article.appendChild(detail);
    if (source.url) {
      const link = document.createElement('a'); link.href = source.url; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = 'OPEN REFERENCE ↗'; article.appendChild(link);
    } else {
      const note = document.createElement('p'); note.textContent = 'No public source URL recorded in the project data'; article.appendChild(note);
    }
    host.appendChild(article);
  }
}

function buildStatic() {
  // marquee rails (duplicate content for seamless loop)
  document.querySelectorAll('.marquee .rail').forEach((rail) => {
    rail.innerHTML += rail.innerHTML;
  });

  // quotes
  document.getElementById('qGrid').innerHTML = QUOTES.map((q, i) => `
    <blockquote class="quote rv" style="--qc:${q.c};--rr:${(i % 3 - 1) * 1.4}deg">
      <p>${q.q}</p><cite>— ENEM · ${q.src}</cite>
    </blockquote>`).join('');

  // crews
  document.getElementById('crews').innerHTML = CREWS.map((c, i) =>
    `<span class="crew" style="--r:${(i % 2 ? 1 : -1) * 1.6}deg">${c}</span>`).join('');

  // name timeline
  document.getElementById('names').innerHTML = NAMES.map((n) => `
    <li class="${n.final ? 'final' : ''}" style="--nc:${n.c}">
      <span class="old">${n.n}</span> <span class="note">— ${n.note}</span>
    </li>`).join('');

  // music
  const alb = document.getElementById('albumMeta');
  alb.innerHTML = `${ALBUM.label} · ${ALBUM.released}`;
  document.getElementById('albumCover').src = ALBUM.cover;
  document.getElementById('trackList').innerHTML = TRACKS.map((t, i) => `
    <div class="track" data-i="${i}">
      <span class="idx">${String(i + 1).padStart(2, '0')}</span>
      <span class="tt">${t.title} ${t.feat ? `<em style="color:var(--cyan);font-style:normal">${t.feat}</em>` : ''}
        <small>prod. ${t.prod} · <a class="track-source" href="${t.url}" target="_blank" rel="noopener noreferrer">LISTEN ON BANDCAMP ↗</a></small></span>
      <span class="dur">${t.dur}</span>
      <button class="play" title="Play ${t.title}" aria-label="Play ${t.title}">►</button>
    </div>`).join('');
  document.getElementById('trackList').addEventListener('click', (e) => {
    if (e.target.closest('a')) return;
    const row = e.target.closest('.track');
    if (row) window.Player.play(+row.dataset.i);
  });
  document.getElementById('buyAlbum').href = ALBUM.url;

  // footer links
  document.getElementById('fIg').href = LINKS.instagram;
  document.getElementById('fBc').href = LINKS.bandcamp;
  document.getElementById('fAlb').href = LINKS.album;

  // highlight reel cards — always rendered; fx.js pins/animates when available
  const REEL = [10, 1, 3, 0, 12, 14].filter((i) => ART[i]);
  document.querySelector('.reel-track').innerHTML = REEL.map((i, k) => {
    const a = ART[i];
    return `<div class="reel-card">
      <img src="${a.file}" alt="ENEM — ${a.title}">
      <div class="rc-cap"><span class="rc-no">${String(k + 1).padStart(2, '0')}</span><h3>${a.title}</h3><span class="rc-yr">${a.year}</span></div>
    </div>`;
  }).join('') + '<div class="reel-end">✶<br>FIN</div>';

  // doodle swatches
  const sw = document.getElementById('swatches');
  sw.innerHTML = PALETTE_HEX.map((c, i) =>
    `<button class="sw ${i === 0 ? 'on' : ''}" data-c="${c}" style="background:${c}" title="Paint ${c}" aria-label="Paint color ${c}" aria-pressed="${i === 0}"></button>`).join('');
  buildSourceLedger();
}

const PALETTE_HEX = ['#ff5a1f', '#22d3ee', '#ff2ea6', '#d4ff3f', '#7c5cff', '#ffd23e', '#f2efe6', '#131316'];

function initAccessSettings() {
  const button = document.getElementById('contrastToggle');
  const scaleButton = document.getElementById('textScaleButton');
  const motionButton = document.getElementById('motionModeButton');
  let enabled = false, textScale = 'standard', still = false;
  try {
    enabled = localStorage.getItem('enem_high_contrast') === '1';
    textScale = ['standard', 'large', 'larger'].includes(localStorage.getItem('enem_text_scale')) ? localStorage.getItem('enem_text_scale') : 'standard';
    still = localStorage.getItem('enem_motion_mode') === 'still';
  } catch (e) {}
  function apply() {
    document.body.classList.toggle('high-contrast', enabled);
    document.body.dataset.textScale = textScale;
    document.body.classList.toggle('still-mode', still);
    button.setAttribute('aria-pressed', String(enabled));
    button.textContent = enabled ? 'HIGH CONTRAST: ON' : 'HIGH CONTRAST: OFF';
    button.title = enabled ? 'Turn high contrast off' : 'Turn high contrast on';
    scaleButton.textContent = `TEXT SIZE: ${textScale.toUpperCase()}`;
    scaleButton.setAttribute('aria-label', `Cycle text size; current size ${textScale}`);
    motionButton.textContent = still ? 'STILL MODE: ON' : 'MOTION: SYSTEM DEFAULT';
    motionButton.setAttribute('aria-pressed', String(still));
  }
  button.addEventListener('click', () => {
    enabled = !enabled;
    try { localStorage.setItem('enem_high_contrast', enabled ? '1' : '0'); } catch (e) {}
    apply(); toast(enabled ? 'HIGH-CONTRAST MODE ON.' : 'STANDARD DISPLAY RESTORED.');
  });
  scaleButton.addEventListener('click', () => {
    textScale = ({ standard: 'large', large: 'larger', larger: 'standard' })[textScale];
    try { localStorage.setItem('enem_text_scale', textScale); } catch (e) {}
    apply(); toast(`TEXT SIZE: ${textScale.toUpperCase()}.`);
  });
  motionButton.addEventListener('click', () => {
    const turningMotionOn = still;
    still = !still;
    try { localStorage.setItem('enem_motion_mode', still ? 'still' : 'system'); } catch (e) {}
    apply(); window.dispatchEvent(new Event('enem-motion-change'));
    if (turningMotionOn) {
      toast('MOTION RESTORED — RELOADING THE ANIMATION SYSTEM.');
      setTimeout(() => location.reload(), 400);
    } else toast('STILL MODE ON — AMBIENT MOTION PAUSED.');
  });
  apply();
}

function initMobileNav() {
  const nav = document.getElementById('nav');
  const button = document.getElementById('menuToggle');
  const links = document.getElementById('siteLinks');
  function setOpen(open) {
    const returnFocus = !open && links.contains(document.activeElement);
    nav.classList.toggle('menu-open', open);
    button.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-label', open ? 'Close site navigation' : 'Open site navigation');
    button.querySelector('b').textContent = open ? '×' : '☰';
    if (open) links.querySelector('a')?.focus({ preventScroll: true });
    else if (returnFocus) button.focus({ preventScroll: true });
  }
  button.addEventListener('click', () => setOpen(button.getAttribute('aria-expanded') !== 'true'));
  links.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setOpen(false)));
  document.addEventListener('pointerdown', (event) => {
    if (nav.classList.contains('menu-open') && !links.contains(event.target) && !button.contains(event.target)) setOpen(false);
  });
  window.addEventListener('keydown', (event) => { if (event.key === 'Escape' && nav.classList.contains('menu-open')) setOpen(false); });
}

function initInteractionGuide() {
  const dialog = document.getElementById('guideDialog');
  document.getElementById('guideButton').addEventListener('click', () => dialog.showModal());
  window.addEventListener('keydown', (event) => {
    const editing = event.target.closest?.('input,textarea,select,[contenteditable="true"]');
    if (event.key === '?' && !dialog.open && !editing) { event.preventDefault(); dialog.showModal(); }
  });
}

function initOfflineArchive() {
  const status = document.getElementById('offlineStatus');
  const install = document.getElementById('installBtn');
  let deferredPrompt = null, ready = false;
  const updateStatus = () => {
    if (!status) return;
    status.textContent = !ready ? 'ARCHIVE: PREPARING OFFLINE COPY…'
      : navigator.onLine ? '● ARCHIVE READY OFFLINE · LIVE WALL NEEDS A CONNECTION'
      : '● OFFLINE MODE · ARCHIVE READY';
  };
  window.addEventListener('online', updateStatus);
  window.addEventListener('offline', updateStatus);
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault(); deferredPrompt = event; install.hidden = false;
  });
  window.addEventListener('appinstalled', () => { deferredPrompt = null; install.hidden = true; toast('ENEM ARCHIVE INSTALLED.'); });
  install.addEventListener('click', async () => {
    if (!deferredPrompt) { toast('OFFLINE COPY IS READY — USE YOUR BROWSER MENU TO INSTALL / ADD TO HOME SCREEN.'); return; }
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice?.outcome === 'accepted') toast('ENEM ARCHIVE INSTALLED.');
    deferredPrompt = null;
  });
  if (!('serviceWorker' in navigator)) {
    if (status) status.textContent = 'OFFLINE INSTALL IS NOT SUPPORTED IN THIS BROWSER.';
    return;
  }
  navigator.serviceWorker.register('./sw.js').then(() => navigator.serviceWorker.ready).then(() => {
    ready = true; updateStatus();
    if (!matchMedia('(display-mode: standalone)').matches) install.hidden = false;
  }).catch((error) => {
    console.warn('offline archive unavailable', error);
    if (status) status.textContent = 'OFFLINE COPY UNAVAILABLE ON THIS HOST.';
  });
}

function boot() {
  buildStatic();
  initAccessSettings();
  initSpray(document.getElementById('sprayGL'));
  const gallery = initGallery(ART, toast);
  initFx(ART);
  initMobileNav();
  initInteractionGuide();
  initOfflineArchive(); // Pre-cache the full archive for offline installs.
  window.Player = initPlayer(TRACKS, {});
  initMerch(PRODUCTS, toast);
  initDoodle(PALETTE_HEX, toast, ART, gallery);

  // nav scroll state
  const nav = document.getElementById('nav');
  addEventListener('scroll', () => nav.classList.toggle('scrolled', scrollY > 40), { passive: true });

  // reveals
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: .12 });
  document.querySelectorAll('.rv:not(.fx)').forEach((el) => io.observe(el));

  // loader
  // Do not make the intro wait on every archive photo; reveal progressively.
  setTimeout(() => document.getElementById('loader').classList.add('done'), 850);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
