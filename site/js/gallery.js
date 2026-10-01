/* THE WALLS — find, collect, share and study verified ENEM pieces. */

const CRATE_KEY = 'enem_crate_v1';
const COLOR_BINS = [
  { id: 'red', label: 'RED', chip: '#e5453e' },
  { id: 'orange', label: 'ORANGE', chip: '#ff7a24' },
  { id: 'yellow', label: 'GOLD', chip: '#efd044' },
  { id: 'green', label: 'GREEN', chip: '#6fbd4b' },
  { id: 'teal', label: 'TEAL', chip: '#2cd4c6' },
  { id: 'blue', label: 'BLUE', chip: '#388ce0' },
  { id: 'purple', label: 'PURPLE', chip: '#885ee8' },
  { id: 'pink', label: 'PINK', chip: '#e65aa3' },
  { id: 'mono', label: 'B/W', chip: '#aaa69d' },
];
const CITY_ORDER = ['Philadelphia', 'Oakland', 'Buffalo'];
const slug = (a) => a.file.split('/').pop().replace(/\.[^.]+$/, '');
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

export function initGallery(ART, toast = () => {}) {
  const grid = document.getElementById('wallGrid');
  const categoryButtons = [...document.querySelectorAll('.filters [data-filter]')];
  const search = document.getElementById('wallSearch');
  const count = document.getElementById('wallCount');
  const empty = document.getElementById('wallEmpty');
  const crateButton = document.getElementById('crateFilter');
  const crateCount = document.getElementById('crateCount');
  const cityFilters = document.getElementById('cityFilters');
  const yearFilters = document.getElementById('yearFilters');
  const trailFilters = document.getElementById('trailFilters');
  const trailStatus = document.getElementById('trailStatus');
  const paletteFilters = document.getElementById('paletteFilters');
  const lightbox = document.getElementById('lightbox');
  const img = document.getElementById('lbImg');
  const title = document.getElementById('lbTitle');
  const meta = document.getElementById('lbMeta');
  const credit = document.getElementById('lbCredit');
  const sourceLink = document.getElementById('lbSourceLink');
  const lbCount = document.getElementById('lbCount');
  const zoomLabel = document.getElementById('lbZoomLevel');
  const stage = document.getElementById('lbStage');
  const saveLightbox = document.getElementById('lbSave');
  const lensButton = document.getElementById('lbLens');
  const collectorBoard = document.getElementById('collectorBoard');
  const collectorThumbs = document.getElementById('collectorThumbs');
  const collectorCount = document.getElementById('collectorCount');

  const items = ART.map((art, index) => ({ ...art, index, id: slug(art), color: 'unknown' }));
  const incomingCut = new URLSearchParams(location.search);
  const archiveControls = document.getElementById('archiveControls');
  archiveControls.open = ['cat', 'city', 'year', 'tone', 'trail', 'q', 'crate'].some((key) => incomingCut.has(key));
  let saved = readCrate();
  let currentIndex = -1;
  const incomingCategory = incomingCut.get('cat');
  const incomingCity = incomingCut.get('city');
  const incomingYear = incomingCut.get('year');
  const incomingTone = incomingCut.get('tone');
  let category = ['walls', 'process', 'doc', 'blackbook'].includes(incomingCategory) ? incomingCategory : 'all';
  let city = CITY_ORDER.includes(incomingCity) ? incomingCity : '';
  let yearFilter = incomingYear === 'undated' || ART.some((item) => item.year === incomingYear) ? (incomingYear || '') : '';
  let colorFamily = COLOR_BINS.some((bin) => bin.id === incomingTone) ? incomingTone : '';
  let savedOnly = false, query = (incomingCut.get('q') || '').slice(0, 80);
  let activeTrail = null, curatedIds = null;
  let boardSelection = [];
  let sharedCrate = readSharedCrate();
  let priorFocus = null, zoom = 1, panX = 0, panY = 0;
  const activePointers = new Map();
  let pinchStart = null, swipeStart = null, dragStart = null;

  const categoryLabel = { walls: 'WALL', process: 'PROCESS', doc: 'STREET DOC', blackbook: 'BLACKBOOK' };
  const TRAILS = [
    { id: 'philly-spectrum', label: 'PHILLY IN COLOR', note: 'A four-piece color study from documented Philadelphia captions.', ids: ['enem-red-gold-wall', 'enem-teal-white', 'enem-teal-orange-philly', 'enem-purple-yellow'] },
    { id: 'process-to-paper', label: 'PROCESS → PAPER', note: 'An editorial path through process photos, archival studies and the blackbook.', ids: ['enem-process-session', 'enem-montana-process', 'enem-smoke-bw', 'enem-fua-bw', 'enem-sketch-press'] },
    { id: 'across-the-map', label: 'OUT OF TOWN', note: 'Two documented out-of-town records, paired as a visual study—not a travel chronology.', ids: ['enem-oakland-2016-doc', 'enem-buffalo-blue'] },
  ];
  activeTrail = TRAILS.find((trail) => trail.id === incomingCut.get('trail')) || null;
  curatedIds = activeTrail ? new Set(activeTrail.ids) : null;

  function readCrate() {
    try {
      const values = JSON.parse(localStorage.getItem(CRATE_KEY) || '[]');
      return new Set(Array.isArray(values) ? values.filter((v) => typeof v === 'string') : []);
    } catch { return new Set(); }
  }
  function readSharedCrate() {
    const raw = new URLSearchParams(location.search).get('crate');
    if (!raw) return null;
    return new Set(raw.split(',').filter((id) => /^[a-z0-9-]+$/i.test(id)).slice(0, ART.length));
  }
  function persistCrate() {
    try { localStorage.setItem(CRATE_KEY, JSON.stringify([...saved])); }
    catch { toast('CRATE COULD NOT BE SAVED IN THIS BROWSER.'); }
  }
  function updateCrateUI() {
    const n = saved.size;
    crateCount.textContent = String(n);
    grid.querySelectorAll('.save-piece').forEach((button) => {
      const item = items[+button.closest('.piece').dataset.i];
      const isSaved = saved.has(item.id);
      button.textContent = isSaved ? '★' : '☆';
      button.setAttribute('aria-pressed', String(isSaved));
      button.setAttribute('aria-label', `${isSaved ? 'Remove' : 'Save'} ${item.title} ${isSaved ? 'from' : 'to'} My Crate`);
      button.title = `${isSaved ? 'Remove from' : 'Save to'} My Crate`;
    });
    if (currentIndex >= 0) updateLightboxSave();
  }
  function updateBoardUI() {
    collectorBoard.hidden = boardSelection.length === 0;
    collectorCount.textContent = `${boardSelection.length} / 3 selected`;
    document.getElementById('compareBoard').disabled = boardSelection.length < 2;
    document.getElementById('exportBoard').disabled = boardSelection.length === 0;
    document.getElementById('clearBoard').disabled = boardSelection.length === 0;
    grid.querySelectorAll('.board-piece').forEach((button) => {
      const item = items[+button.closest('.piece').dataset.i], selected = boardSelection.includes(item.id);
      button.textContent = selected ? '− BOARD' : '+ BOARD';
      button.setAttribute('aria-pressed', String(selected));
      button.setAttribute('aria-label', `${selected ? 'Remove' : 'Add'} ${item.title} ${selected ? 'from' : 'to'} collector board`);
    });
    collectorThumbs.innerHTML = boardSelection.map((id) => {
      const item = items.find((entry) => entry.id === id);
      return item ? `<div class="collector-thumb"><img src="${item.file}" alt="${item.title}"><button type="button" data-remove-board="${item.id}" aria-label="Remove ${item.title}">×</button></div>` : '';
    }).join('');
  }
  function toggleBoard(index) {
    const item = items[index]; if (!item) return;
    if (boardSelection.includes(item.id)) boardSelection = boardSelection.filter((id) => id !== item.id);
    else if (boardSelection.length < 3) boardSelection = [...boardSelection, item.id];
    else { toast('BOARD HOLDS THREE WORKS — REMOVE ONE FIRST.'); return; }
    updateBoardUI();
  }

  grid.innerHTML = items.map((a) => `
    <figure class="piece rv" data-cat="${a.cat}" data-i="${a.index}" data-id="${a.id}" tabindex="0" aria-label="${a.title}, ${a.year}">
      <span class="tagcat">${categoryLabel[a.cat] || 'WALL'}</span>
      <button class="save-piece" aria-pressed="false" aria-label="Save ${a.title} to My Crate" title="Save to My Crate">☆</button>
      <div class="ph"><img src="${a.file}" alt="ENEM — ${a.title}, ${a.year}" loading="eager"></div>
      <figcaption class="meta"><div><h3>${a.title}</h3><span class="source-mark">${a.source || 'ARCHIVE ENTRY'}</span></div><div class="piece-meta-actions"><span class="yr">${a.year}</span><button type="button" class="board-piece" data-board aria-pressed="false" aria-label="Add ${a.title} to collector board">+ BOARD</button></div></figcaption>
    </figure>`).join('');
  updateBoardUI();

  function normalize(s) { return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
  function matches(a) {
    const haystack = normalize([a.title, a.year, a.spot, a.city, a.cat, a.note, a.source].join(' '));
    return (category === 'all' || a.cat === category)
      && (!city || a.city === city)
      && (!yearFilter || (yearFilter === 'undated' ? !/^\d{4}$/.test(a.year) : a.year === yearFilter))
      && (!colorFamily || a.color === colorFamily)
      && (!savedOnly || saved.has(a.id))
      && (!sharedCrate || sharedCrate.has(a.id))
      && (!curatedIds || curatedIds.has(a.id))
      && (!query || haystack.includes(normalize(query)));
  }
  function visibleItems() {
    const visible = items.filter(matches);
    if (curatedIds) {
      const order = new Map([...curatedIds].map((id, index) => [id, index]));
      visible.sort((a, b) => order.get(a.id) - order.get(b.id));
    }
    return visible;
  }
  function applyFilters() {
    const visible = visibleItems();
    for (const item of items) {
      const show = visible.includes(item);
      const card = grid.querySelector(`.piece[data-i="${item.index}"]`);
      card.hidden = !show;
    }
    empty.hidden = visible.length > 0;
    count.textContent = `${visible.length} of ${items.length} pieces${saved.size ? ` · ${saved.size} saved` : ''}`;
    crateButton.setAttribute('aria-pressed', String(savedOnly));
    crateButton.classList.toggle('active', savedOnly);
  }
  function setPressed(group, attr, value) {
    group.querySelectorAll('button').forEach((button) => {
      const active = (button.dataset[attr] || '') === value;
      button.setAttribute('aria-pressed', String(active));
      button.classList.toggle('on', active);
    });
  }

  categoryButtons.forEach((button) => {
    const active = button.dataset.filter === category;
    button.setAttribute('aria-pressed', String(active));
    button.classList.toggle('on', active);
    button.addEventListener('click', () => {
      category = button.dataset.filter;
      setPressed(document.querySelector('.filters'), 'filter', category);
      applyFilters();
    });
  });

  function renderCityFilters() {
    const cities = CITY_ORDER.map((name) => ({ name, total: items.filter((a) => a.city === name).length }))
      .filter((entry) => entry.total > 0);
    cityFilters.innerHTML = `<button type="button" data-city="" aria-pressed="${!city}">ALL STOPS · ${items.length}</button>` +
      cities.map(({ name, total }) => `<button type="button" data-city="${name}" aria-pressed="${city === name}">${name.toUpperCase()} · ${total}</button>`).join('');
    cityFilters.onclick = (event) => {
      const button = event.target.closest('[data-city]');
      if (!button) return;
      city = button.dataset.city;
      setPressed(cityFilters, 'city', city);
      applyFilters();
    };
  }

  function renderYearFilters() {
    const values = [...new Set(items.map((item) => /^\d{4}$/.test(item.year) ? item.year : 'undated'))]
      .sort((a, b) => a === 'undated' ? 1 : b === 'undated' ? -1 : Number(a) - Number(b));
    yearFilters.innerHTML = `<button type="button" data-year="" aria-pressed="${!yearFilter}">ALL ERAS · ${items.length}</button>` +
      values.map((year) => {
        const total = items.filter((item) => (year === 'undated' ? !/^\d{4}$/.test(item.year) : item.year === year)).length;
        return `<button type="button" data-year="${year}" aria-pressed="${yearFilter === year}">${year === 'undated' ? 'UNDATED' : year} · ${total}</button>`;
      }).join('');
    yearFilters.onclick = (event) => {
      const button = event.target.closest('[data-year]');
      if (!button) return;
      yearFilter = button.dataset.year;
      setPressed(yearFilters, 'year', yearFilter);
      applyFilters();
    };
  }
  function renderTrailFilters() {
    trailFilters.innerHTML = `<button type="button" data-trail="" aria-pressed="${!activeTrail}">FULL ARCHIVE</button>` + TRAILS.map((trail) =>
      `<button type="button" data-trail="${trail.id}" aria-pressed="${activeTrail?.id === trail.id}">${trail.label}</button>`).join('');
    trailFilters.onclick = (event) => {
      const button = event.target.closest('[data-trail]');
      if (!button) return;
      const id = button.dataset.trail;
      activeTrail = TRAILS.find((trail) => trail.id === id) || null;
      curatedIds = activeTrail ? new Set(activeTrail.ids) : null;
      if (activeTrail) {
        category = 'all'; city = ''; yearFilter = ''; colorFamily = ''; savedOnly = false; sharedCrate = null; query = ''; search.value = '';
        categoryButtons.forEach((item) => { const active = item.dataset.filter === 'all'; item.classList.toggle('on', active); item.setAttribute('aria-pressed', String(active)); });
        renderCityFilters(); renderYearFilters(); renderPaletteFilters();
        const url = new URL(location.href);
        ['crate', 'piece', 'cat', 'city', 'year', 'tone', 'q'].forEach((key) => url.searchParams.delete(key));
        url.searchParams.set('trail', id); history.replaceState({}, '', url);
      } else {
        const url = new URL(location.href); url.searchParams.delete('trail'); history.replaceState(history.state, '', url);
      }
      setPressed(trailFilters, 'trail', id);
      trailStatus.textContent = activeTrail ? `${activeTrail.note} ${activeTrail.ids.length} works; use the viewer arrows to follow the route.` : 'Curated route cleared. Other active filters remain; RESET VIEW restores everything.';
      applyFilters();
    };
  }

  function hueFamily(r, g, b) {
    const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
    const saturation = max ? delta / max : 0;
    if (saturation < .19 || max < 42) return 'mono';
    let hue;
    if (delta === 0) hue = 0;
    else if (max === r) hue = 60 * (((g - b) / delta) % 6);
    else if (max === g) hue = 60 * ((b - r) / delta + 2);
    else hue = 60 * ((r - g) / delta + 4);
    if (hue < 0) hue += 360;
    if (hue < 12 || hue >= 348) return 'red';
    if (hue < 42) return 'orange';
    if (hue < 68) return 'yellow';
    if (hue < 158) return 'green';
    if (hue < 193) return 'teal';
    if (hue < 255) return 'blue';
    if (hue < 292) return 'purple';
    return 'pink';
  }
  function sampleDominantFamily(image) {
    try {
      const c = document.createElement('canvas'); c.width = 28; c.height = 28;
      const cctx = c.getContext('2d', { willReadFrequently: true });
      cctx.drawImage(image, 0, 0, 28, 28);
      const pixels = cctx.getImageData(0, 0, 28, 28).data;
      const hist = Object.fromEntries(COLOR_BINS.map((bin) => [bin.id, 0]));
      for (let i = 0; i < pixels.length; i += 16) {
        const family = hueFamily(pixels[i], pixels[i + 1], pixels[i + 2]);
        hist[family]++;
      }
      return Object.entries(hist).sort((a, b) => b[1] - a[1])[0][0];
    } catch { return 'mono'; }
  }
  function renderPaletteFilters() {
    const totals = new Map();
    items.forEach((a) => totals.set(a.color, (totals.get(a.color) || 0) + 1));
    paletteFilters.innerHTML = `<button type="button" data-color="" aria-pressed="${!colorFamily}">ALL TONES · ${items.length}</button>` +
      COLOR_BINS.filter((bin) => totals.has(bin.id)).map((bin) =>
        `<button type="button" data-color="${bin.id}" aria-pressed="${colorFamily === bin.id}"><i style="--chip:${bin.chip}"></i>${bin.label} · ${totals.get(bin.id)}</button>`).join('');
    paletteFilters.onclick = (event) => {
      const button = event.target.closest('[data-color]');
      if (!button) return;
      colorFamily = button.dataset.color;
      setPressed(paletteFilters, 'color', colorFamily);
      applyFilters();
    };
  }
  const imageReady = [...grid.querySelectorAll('.piece img')].map((image) => new Promise((resolve) => {
    if (image.complete && image.naturalWidth) resolve();
    else { image.addEventListener('load', resolve, { once: true }); image.addEventListener('error', resolve, { once: true }); }
  }));
  Promise.all(imageReady).then(() => {
    items.forEach((item) => {
      const image = grid.querySelector(`.piece[data-i="${item.index}"] img`);
      item.color = image?.naturalWidth ? sampleDominantFamily(image) : 'mono';
    });
    renderPaletteFilters();
    applyFilters();
  });
  renderCityFilters();
  renderYearFilters();
  renderTrailFilters();
  if (activeTrail) trailStatus.textContent = `${activeTrail.note} ${activeTrail.ids.length} works; use the viewer arrows to follow the route.`;
  search.value = query;
  applyFilters();

  const keyHint = document.querySelector('.archive-search kbd');
  if (keyHint && /Mac|iPhone|iPad/.test(navigator.platform || '')) keyHint.textContent = '⌘ K';
  else if (keyHint) keyHint.textContent = 'CTRL K';
  search.addEventListener('input', () => { query = search.value.trim(); applyFilters(); });
  document.getElementById('resetArchive').addEventListener('click', () => {
    category = 'all'; city = ''; yearFilter = ''; colorFamily = ''; savedOnly = false; sharedCrate = null; query = ''; activeTrail = null; curatedIds = null; search.value = '';
    categoryButtons.forEach((button) => { const active = button.dataset.filter === 'all'; button.classList.toggle('on', active); button.setAttribute('aria-pressed', String(active)); });
    renderCityFilters(); renderYearFilters(); renderPaletteFilters();
    setPressed(trailFilters, 'trail', '');
    trailStatus.textContent = 'Choose a route, or explore the full archive.';
    const u = new URL(location.href); ['crate', 'piece', 'cat', 'city', 'year', 'tone', 'trail', 'q'].forEach((key) => u.searchParams.delete(key)); history.replaceState(history.state, '', u);
    applyFilters();
  });
  crateButton.addEventListener('click', () => { savedOnly = !savedOnly; applyFilters(); });
  document.getElementById('shareCrate').addEventListener('click', async () => {
    if (!saved.size) { toast('SAVE A PIECE TO BUILD YOUR CRATE.'); return; }
    const u = new URL(location.href); u.searchParams.delete('piece'); u.searchParams.set('crate', [...saved].join(',')); u.hash = 'walls';
    await shareOrCopy({ title: 'My ENEM Wall Crate', text: `${saved.size} saved pieces from the ENEM archive.`, url: u.href });
  });
  document.getElementById('shareCut').addEventListener('click', async () => {
    const u = new URL(location.href);
    ['piece', 'crate', 'cat', 'city', 'year', 'tone', 'trail', 'q'].forEach((key) => u.searchParams.delete(key));
    if (category !== 'all') u.searchParams.set('cat', category);
    if (city) u.searchParams.set('city', city);
    if (yearFilter) u.searchParams.set('year', yearFilter);
    if (colorFamily) u.searchParams.set('tone', colorFamily);
    if (activeTrail) u.searchParams.set('trail', activeTrail.id);
    if (query) u.searchParams.set('q', query);
    if (savedOnly) u.searchParams.set('crate', [...saved].join(',') || '__empty__');
    else if (sharedCrate) u.searchParams.set('crate', [...sharedCrate].join(',') || '__empty__');
    u.hash = 'walls';
    await shareOrCopy({ title: 'ENEM / TDK archive cut', text: `${visibleItems().length} pieces in this archive view.`, url: u.href });
  });
  document.getElementById('surprisePiece').addEventListener('click', () => {
    const pool = visibleItems();
    if (!pool.length) { toast('RESET THE CUT TO FIND A PIECE.'); return; }
    const choices = pool.filter((item) => item.index !== currentIndex);
    const pick = (choices.length ? choices : pool)[Math.floor(Math.random() * (choices.length || pool.length))];
    grid.querySelector(`.piece[data-i="${pick.index}"]`)?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
    open(pick.index);
    toast(`PULLED FROM THE ARCHIVE: ${pick.title}.`);
  });

  // Full-screen, source-credited wall mode cycles only through the current archive cut.
  const wallModeDialog = document.getElementById('wallModeDialog');
  const wallModeImage = document.getElementById('wallModeImage');
  const wallModeTitle = document.getElementById('wallModeTitle');
  const wallModeMeta = document.getElementById('wallModeMeta');
  const wallModeSource = document.getElementById('wallModeSource');
  const wallModeSourceLink = document.getElementById('wallModeSourceLink');
  const wallModeCounter = document.getElementById('wallModeCounter');
  const wallModePlay = document.getElementById('wallModePlay');
  let wallSequence = [], wallPosition = 0, wallTimer = null, wallPlaying = false, wallPreviousFocus = null, previousOverflow = '';
  function renderWallMode() {
    const item = wallSequence[wallPosition];
    if (!item) return;
    wallModeImage.style.opacity = '0';
    wallModeImage.alt = `ENEM — ${item.title}, ${item.year}`;
    wallModeImage.onload = () => { wallModeImage.style.opacity = '1'; };
    wallModeImage.onerror = () => { wallModeImage.style.opacity = '1'; };
    wallModeImage.src = item.file;
    if (wallModeImage.complete && wallModeImage.naturalWidth) wallModeImage.style.opacity = '1';
    wallModeTitle.textContent = item.title;
    wallModeMeta.textContent = `${item.year}${item.city ? ` · ${item.city}` : item.spot ? ` · ${item.spot}` : ''}`;
    wallModeSource.textContent = item.source || 'Source details unavailable';
    wallModeSourceLink.hidden = !item.sourceUrl;
    if (item.sourceUrl) wallModeSourceLink.href = item.sourceUrl;
    wallModeCounter.textContent = `${String(wallPosition + 1).padStart(2, '0')} / ${String(wallSequence.length).padStart(2, '0')}`;
    wallModePlay.textContent = wallPlaying ? 'PAUSE SLIDESHOW' : 'PLAY SLIDESHOW';
    wallModePlay.setAttribute('aria-pressed', String(wallPlaying));
    wallModePlay.setAttribute('aria-label', wallPlaying ? 'Pause slideshow' : 'Start slideshow');
  }
  function setWallPlaying(value) {
    wallPlaying = value;
    clearInterval(wallTimer); wallTimer = null;
    if (wallPlaying) wallTimer = setInterval(() => { wallPosition = (wallPosition + 1) % wallSequence.length; renderWallMode(); }, 6800);
    renderWallMode();
  }
  function stepWall(delta) {
    if (!wallSequence.length) return;
    wallPosition = (wallPosition + delta + wallSequence.length) % wallSequence.length;
    renderWallMode();
  }
  function closeWallMode() {
    clearInterval(wallTimer); wallTimer = null; wallPlaying = false;
    wallModeDialog.classList.remove('open'); wallModeDialog.hidden = true; wallModeDialog.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = previousOverflow;
    wallPreviousFocus?.focus?.({ preventScroll: true });
  }
  document.getElementById('wallModeButton').addEventListener('click', () => {
    wallSequence = visibleItems();
    if (!wallSequence.length) { toast('NO PIECES IN THIS CUT.'); return; }
    wallPosition = 0; wallPreviousFocus = document.activeElement; previousOverflow = document.body.style.overflow;
    wallModeDialog.hidden = false; wallModeDialog.classList.add('open'); wallModeDialog.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden'; renderWallMode(); document.getElementById('wallModeClose').focus({ preventScroll: true });
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches && !document.body.classList.contains('still-mode')) setWallPlaying(true);
  });
  window.addEventListener('enem-motion-change', () => { if (document.body.classList.contains('still-mode')) setWallPlaying(false); });
  document.getElementById('wallModeClose').addEventListener('click', closeWallMode);
  document.getElementById('wallModePrev').addEventListener('click', () => stepWall(-1));
  document.getElementById('wallModeNext').addEventListener('click', () => stepWall(1));
  wallModePlay.addEventListener('click', () => setWallPlaying(!wallPlaying));
  wallModeDialog.addEventListener('click', (event) => { if (event.target === wallModeDialog) closeWallMode(); });
  window.addEventListener('keydown', (event) => {
    if (!wallModeDialog.classList.contains('open')) return;
    if (event.key === 'Escape') { event.preventDefault(); closeWallMode(); }
    else if (event.key === 'ArrowLeft') { event.preventDefault(); stepWall(-1); }
    else if (event.key === 'ArrowRight') { event.preventDefault(); stepWall(1); }
    else if (event.code === 'Space' && !event.target.closest('button')) { event.preventDefault(); setWallPlaying(!wallPlaying); }
    else if (event.key === 'Tab') {
      const list = [...wallModeDialog.querySelectorAll('button:not([disabled]),a[href]')].filter((el) => !el.hidden);
      const first = list[0], last = list[list.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });

  // Printable field guide uses only the selected real archive records and their credits.
  document.getElementById('printGuide').addEventListener('click', () => {
    const selection = visibleItems();
    if (!selection.length) { toast('NO PIECES TO PRINT IN THIS CUT.'); return; }
    const printWindow = window.open('', '_blank');
    if (!printWindow) { toast('ALLOW THE FIELD GUIDE POP-UP TO PRINT OR SAVE AS PDF.'); return; }
    const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
    const cards = selection.map((item) => {
      const pieceUrl = new URL(location.href); pieceUrl.searchParams.delete('crate'); pieceUrl.searchParams.set('piece', item.id); pieceUrl.hash = 'walls';
      return `<article><img src="${esc(new URL(item.file, location.href).href)}" alt="ENEM — ${esc(item.title)}"><div class="card-info"><small>${esc(item.year)} · ${esc(item.city || item.spot || 'Location not stated')}</small><h2>${esc(item.title)}</h2><p>${esc(item.note)}</p><p><b>PHOTO / SOURCE CREDIT</b><br>${esc(item.source || 'Source details unavailable')}</p><p class="links">${item.sourceUrl ? `<a href="${esc(item.sourceUrl)}">OPEN SOURCE ↗</a> · ` : ''}<a href="${esc(pieceUrl.href)}">OPEN PIECE ONLINE ↗</a></p></div></article>`;
    }).join('');
    printWindow.document.open();
    printWindow.document.write(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><base href="${esc(new URL('.', location.href).href)}"><title>ENEM / TDK — Field Guide</title><style>@page{margin:14mm}*{box-sizing:border-box}body{margin:0;color:#171717;background:#fff;font:12px/1.5 Arial,sans-serif}header{padding:12px 0 18px;border-bottom:4px solid #f05a28;margin-bottom:22px}header small{font-weight:bold;letter-spacing:.18em;color:#007e81}h1{font-size:30px;margin:8px 0 2px}header p{margin:0;color:#555}main{display:grid;grid-template-columns:1fr 1fr;gap:15px}article{break-inside:avoid;border:1px solid #aaa;padding:8px;display:grid;grid-template-columns:44% 1fr;gap:10px}article img{width:100%;height:155px;object-fit:cover;background:#eee}.card-info h2{font-size:16px;line-height:1.15;margin:6px 0}.card-info p{margin:5px 0}.card-info small{font-weight:bold;color:#555}.links a{color:#006a70;font-weight:bold;font-size:10px}footer{border-top:1px solid #aaa;margin-top:20px;padding-top:8px;color:#555;font-size:10px}.print-action{position:fixed;right:16px;top:16px;padding:10px 14px;background:#ff5a1f;border:0;font-weight:bold;cursor:pointer}@media print{.print-action{display:none}main{gap:8px}article{padding:6px}article img{height:135px}}</style></head><body><button class="print-action" onclick="window.print()">PRINT / SAVE AS PDF</button><header><small>ENEM / TDK · VERIFIED ARCHIVE</small><h1>FIELD GUIDE</h1><p>${selection.length} piece${selection.length === 1 ? '' : 's'} · ${new Date().toLocaleDateString()} · photos and sources credited per entry</p></header><main>${cards}</main><footer>All graffiti artwork by ENEM. Archive photography is credited to its source. Locations are reproduced as captioned, not exact addresses. This guide contains no visitor-made wall art.</footer></body></html>`);
    printWindow.document.close(); printWindow.opener = null;
    toast('FIELD GUIDE OPENED — PRINT OR SAVE AS PDF.');
  });

  window.addEventListener('keydown', (event) => {
    if (!lightbox.classList.contains('open') && !wallModeDialog.classList.contains('open') && !document.getElementById('guideDialog').open && (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault(); search.focus(); search.select();
    }
  });

  function toggleSaved(index) {
    const item = items[index];
    if (!item) return;
    if (saved.has(item.id)) { saved.delete(item.id); toast('REMOVED FROM YOUR CRATE.'); }
    else { saved.add(item.id); toast('SAVED TO YOUR CRATE.'); }
    persistCrate(); updateCrateUI(); applyFilters();
  }
  grid.addEventListener('click', (event) => {
    const boardButton = event.target.closest('.board-piece');
    if (boardButton) { event.preventDefault(); event.stopPropagation(); toggleBoard(+boardButton.closest('.piece').dataset.i); return; }
    const save = event.target.closest('.save-piece');
    if (save) { event.preventDefault(); event.stopPropagation(); toggleSaved(+save.closest('.piece').dataset.i); return; }
    const card = event.target.closest('.piece');
    if (card) open(+card.dataset.i);
  });
  collectorThumbs.addEventListener('click', (event) => {
    const remove = event.target.closest('[data-remove-board]');
    if (remove) { boardSelection = boardSelection.filter((id) => id !== remove.dataset.removeBoard); updateBoardUI(); }
  });
  document.getElementById('clearBoard').addEventListener('click', () => { boardSelection = []; updateBoardUI(); });
  document.getElementById('compareBoard').addEventListener('click', openBoardCompare);
  document.getElementById('exportBoard').addEventListener('click', exportCollectorBoard);

  function selectedBoardItems() { return boardSelection.map((id) => items.find((item) => item.id === id)).filter(Boolean); }
  function openBoardCompare() {
    const selected = selectedBoardItems();
    if (selected.length < 2) { toast('SELECT TWO OR THREE WORKS TO COMPARE.'); return; }
    const compareGrid = document.getElementById('boardCompareGrid');
    document.getElementById('boardDialogTitle').textContent = `${selected.length === 2 ? 'TWO' : 'THREE'}-PIECE STUDY`;
    compareGrid.style.setProperty('--board-columns', String(selected.length));
    compareGrid.innerHTML = selected.map((item) => `<article class="compare-tile"><img src="${item.file}" alt="ENEM — ${item.title}, ${item.year}"><h3>${item.title}</h3><p>${item.year} · ${item.city || item.spot || 'Location not stated'}</p><p>PHOTO / SOURCE CREDIT: ${item.source || 'Source details unavailable'}</p>${item.sourceUrl ? `<a href="${item.sourceUrl}" target="_blank" rel="noopener noreferrer">OPEN SOURCE ↗</a>` : ''}</article>`).join('');
    document.getElementById('boardDialog').showModal();
  }
  async function exportCollectorBoard() {
    const selected = selectedBoardItems();
    if (!selected.length) { toast('ADD A WORK TO THE BOARD FIRST.'); return; }
    try {
      if (document.fonts?.ready) await document.fonts.ready;
      const images = await Promise.all(selected.map((item) => new Promise((resolve, reject) => {
        const image = new Image(); image.onload = () => resolve({ item, image }); image.onerror = reject; image.src = item.file;
        if (image.complete && image.naturalWidth) resolve({ item, image });
      })));
      const canvas = document.createElement('canvas'); canvas.width = 1800; canvas.height = 1100;
      const context = canvas.getContext('2d'); context.fillStyle = '#0b0b0d'; context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = '#2cd4c6'; context.fillRect(78, 62, 74, 8);
      context.fillStyle = '#f2efe6'; context.font = '900 46px "Archivo Black", Arial, sans-serif'; context.fillText('ENEM / TDK — SELECTED WORKS', 78, 128);
      context.fillStyle = '#aaa69d'; context.font = '18px "Space Grotesk", Arial, sans-serif'; context.fillText('VISITOR-CURATED COMPARISON · ORIGINAL ARTWORK BY ENEM', 78, 164);
      const gap = 22, left = 78, top = 206, width = canvas.width - 156, tileW = (width - gap * (images.length - 1)) / images.length, imageH = 620;
      const drawCover = (image, x, y, w, h) => {
        const scale = Math.max(w / image.naturalWidth, h / image.naturalHeight), cropW = w / scale, cropH = h / scale;
        const sx = (image.naturalWidth - cropW) / 2, sy = (image.naturalHeight - cropH) / 2;
        context.drawImage(image, sx, sy, cropW, cropH, x, y, w, h);
      };
      images.forEach(({ item, image }, index) => {
        const x = left + index * (tileW + gap);
        context.strokeStyle = index % 2 ? '#2cd4c6' : '#ff5a1f'; context.lineWidth = 3; context.strokeRect(x, top, tileW, imageH + 4);
        context.save(); context.beginPath(); context.rect(x + 2, top + 2, tileW - 4, imageH - 2); context.clip(); drawCover(image, x + 2, top + 2, tileW - 4, imageH - 2); context.restore();
        context.fillStyle = '#f2efe6'; context.font = '900 25px "Archivo Black", Arial, sans-serif';
        const titleText = item.title.length > 27 ? item.title.slice(0, 26) + '…' : item.title;
        context.fillText(titleText, x, top + imageH + 46, tileW - 10);
        context.fillStyle = '#ffd23e'; context.font = '18px "Permanent Marker", cursive';
        context.fillText(`${item.year} · ${item.city || item.spot || 'Location not stated'}`, x, top + imageH + 82, tileW - 10);
        context.fillStyle = '#aaa69d'; context.font = '15px "Space Grotesk", Arial, sans-serif';
        const source = `PHOTO / SOURCE: ${item.source || 'Source details unavailable'}`;
        const maxChars = Math.max(18, Math.floor(tileW / 9));
        context.fillText(source.slice(0, maxChars - 1) + (source.length > maxChars ? '…' : ''), x, top + imageH + 112, tileW - 10);
      });
      context.fillStyle = '#d4ff3f'; context.font = '900 17px "Archivo Black", Arial, sans-serif';
      context.fillText('VISITOR-CURATED STUDY · NOT AN ENEM COMPOSITION', 78, 1020);
      context.fillStyle = '#aaa69d'; context.font = '15px "Space Grotesk", Arial, sans-serif';
      context.fillText('Photo / archive credits remain attached. Graffiti artwork attributed to ENEM (TDK).', 78, 1052);
      const link = document.createElement('a'); link.download = 'enem-visitor-curated-board.png'; link.href = canvas.toDataURL('image/png'); link.click();
      toast('VISITOR-CURATED CONTACT SHEET EXPORTED.');
    } catch (error) { console.error('Board export failed', error); toast('COULD NOT EXPORT THIS BOARD.'); }
  }

  grid.addEventListener('keydown', (event) => {
    if (event.target.closest('button')) return;
    if (event.key === 'Enter' || event.key === ' ') {
      const card = event.target.closest('.piece');
      if (card) { event.preventDefault(); open(+card.dataset.i); }
    }
  });
  // 3D tilt only for a mouse/pen; preserve tap behavior and motion preferences.
  grid.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'touch' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const card = event.target.closest('.piece');
    if (!card || card.hidden) return;
    const r = card.getBoundingClientRect();
    const x = (event.clientX - r.left) / r.width - .5;
    const y = (event.clientY - r.top) / r.height - .5;
    card.style.transform = `perspective(900px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg) translateY(-3px)`;
  });
  grid.addEventListener('pointerleave', () => grid.querySelectorAll('.piece').forEach((card) => { card.style.transform = ''; }), true);

  let wasOpen = false;
  function setPieceUrl(item, replace = false) {
    const u = new URL(location.href); u.searchParams.set('piece', item.id);
    history[replace ? 'replaceState' : 'pushState']({ enemLightbox: true }, '', u);
  }
  function removePieceUrl() {
    const u = new URL(location.href); u.searchParams.delete('piece');
    history.replaceState({}, '', u);
  }
  function open(index, updateUrl = true, replaceUrl = false) {
    const item = items[index];
    if (!item) return;
    if (!wasOpen) priorFocus = document.activeElement;
    wasOpen = true; currentIndex = index;
    img.src = item.file; img.alt = `ENEM — ${item.title}, ${item.year}`;
    title.textContent = item.title;
    meta.textContent = `${item.year}${item.spot ? ` · ${item.spot}` : item.city ? ` · ${item.city}` : ''}`;
    credit.textContent = `${item.note} · ${item.source || 'Source details unavailable'}. Artwork by ENEM (TDK).`;
    if (item.sourceUrl) {
      sourceLink.hidden = false; sourceLink.href = item.sourceUrl; sourceLink.textContent = `SOURCE: ${item.source} ↗`;
    } else { sourceLink.hidden = true; sourceLink.removeAttribute('href'); }
    let sequence = visibleItems();
    if (!sequence.some((entry) => entry.index === index)) sequence = items;
    const sequenceIndex = sequence.findIndex((entry) => entry.index === index);
    lbCount.textContent = `${String(sequenceIndex + 1).padStart(2, '0')} / ${String(sequence.length).padStart(2, '0')}`;
    resetZoom(); updateLightboxSave();
    lightbox.classList.add('open'); lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    document.getElementById('lbX').focus({ preventScroll: true });
    if (updateUrl) setPieceUrl(item, replaceUrl);
  }
  function closeUI() {
    lightbox.classList.remove('open'); lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = ''; wasOpen = false; currentIndex = -1; resetZoom();
    if (priorFocus?.focus) priorFocus.focus({ preventScroll: true });
  }
  function close() {
    if (!lightbox.classList.contains('open')) return;
    if (history.state?.enemLightbox && new URLSearchParams(location.search).has('piece')) { history.back(); return; }
    removePieceUrl(); closeUI();
  }
  function step(delta) {
    let sequence = visibleItems();
    if (!sequence.some((entry) => entry.index === currentIndex)) sequence = items;
    const position = sequence.findIndex((entry) => entry.index === currentIndex);
    const next = sequence[(position + delta + sequence.length) % sequence.length];
    if (next) open(next.index, true, true);
  }
  function updateLightboxSave() {
    if (currentIndex < 0) return;
    const isSaved = saved.has(items[currentIndex].id);
    saveLightbox.classList.toggle('saved', isSaved);
    saveLightbox.textContent = isSaved ? '★ IN MY CRATE' : '☆ SAVE TO CRATE';
    saveLightbox.setAttribute('aria-pressed', String(isSaved));
  }
  function onPopState() {
    const id = new URLSearchParams(location.search).get('piece');
    const index = items.findIndex((item) => item.id === id);
    if (index >= 0) open(index, false);
    else if (lightbox.classList.contains('open')) closeUI();
  }
  window.addEventListener('popstate', onPopState);
  document.getElementById('lbX').addEventListener('click', close);
  document.getElementById('lbPrev').addEventListener('click', () => step(-1));
  document.getElementById('lbNext').addEventListener('click', () => step(1));
  lightbox.addEventListener('click', (event) => { if (event.target === lightbox) close(); });
  window.addEventListener('keydown', (event) => {
    if (!lightbox.classList.contains('open')) return;
    if (event.key === 'Escape') { event.preventDefault(); close(); }
    if (event.key === 'ArrowLeft') step(-1);
    if (event.key === 'ArrowRight') step(1);
    if (event.key === '+' || event.key === '=') setZoom(zoom + .25);
    if (event.key === '-') setZoom(zoom - .25);
    if (event.key === '0') resetZoom();
    if (event.key === 'Tab') trapDialogFocus(event);
  });
  function trapDialogFocus(event) {
    const focusables = [...lightbox.querySelectorAll('button:not([disabled]),a[href]')].filter((el) => !el.hidden && el.offsetParent !== null);
    if (!focusables.length) return;
    const first = focusables[0], last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
  saveLightbox.addEventListener('click', () => toggleSaved(currentIndex));
  document.getElementById('lbShare').addEventListener('click', async () => {
    if (currentIndex < 0) return;
    const item = items[currentIndex];
    const u = new URL(location.href); u.searchParams.set('piece', item.id); u.hash = 'walls';
    await shareOrCopy({ title: `${item.title} — ENEM / TDK`, text: `${item.title} · ${item.city || item.spot} · ${item.source}`, url: u.href });
  });
  document.getElementById('lbCopyCredit').addEventListener('click', async () => {
    if (currentIndex < 0) return;
    const item = items[currentIndex];
    const citation = `“${item.title}” (${item.year}) — graffiti artwork by ENEM (TDK). Photo / archive credit: ${item.source || 'Source details unavailable'}.${item.sourceUrl ? ` Source: ${item.sourceUrl}` : ''}`;
    const copied = await copyText(citation);
    toast(copied ? 'CREDIT COPIED — KEEP THE SOURCE ATTACHED.' : 'COULD NOT COPY CREDIT.');
  });
  document.getElementById('lbPoster').addEventListener('click', () => exportShareCard(items[currentIndex]));

  // Responsive zoom/pan: wheel, buttons, keyboard, drag and two-finger pinch.
  function setLens(enabled) {
    img.classList.toggle('mono-lens', enabled);
    lensButton.setAttribute('aria-pressed', String(enabled));
    lensButton.textContent = enabled ? 'COLOR LENS' : 'MONO LENS';
  }
  lensButton.addEventListener('click', () => setLens(lensButton.getAttribute('aria-pressed') !== 'true'));

  function setZoom(next) {
    zoom = clamp(next, 1, 4);
    if (zoom === 1) panX = panY = 0;
    else {
      panX = clamp(panX, -stage.clientWidth * (zoom - 1) / 2, stage.clientWidth * (zoom - 1) / 2);
      panY = clamp(panY, -stage.clientHeight * (zoom - 1) / 2, stage.clientHeight * (zoom - 1) / 2);
    }
    img.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
    img.style.cursor = zoom > 1 ? 'grab' : 'zoom-in';
    zoomLabel.textContent = `${Math.round(zoom * 100)}%`;
  }
  function resetZoom() { zoom = 1; panX = panY = 0; if (img) setZoom(1); }
  document.getElementById('lbZoomIn').addEventListener('click', () => setZoom(zoom + .25));
  document.getElementById('lbZoomOut').addEventListener('click', () => setZoom(zoom - .25));
  document.getElementById('lbZoomReset').addEventListener('click', resetZoom);
  stage.addEventListener('dblclick', () => setZoom(zoom > 1 ? 1 : 2));
  stage.addEventListener('wheel', (event) => { event.preventDefault(); setZoom(zoom + (event.deltaY < 0 ? .15 : -.15)); }, { passive: false });
  stage.addEventListener('pointerdown', (event) => {
    if (event.target.closest('button')) return;
    stage.setPointerCapture(event.pointerId);
    activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (activePointers.size === 1) {
      swipeStart = { x: event.clientX, y: event.clientY };
      dragStart = { x: event.clientX, y: event.clientY, panX, panY };
    } else if (activePointers.size === 2) {
      swipeStart = null; dragStart = null;
      const pts = [...activePointers.values()];
      pinchStart = { distance: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y), zoom };
    }
  });
  stage.addEventListener('pointermove', (event) => {
    if (!activePointers.has(event.pointerId)) return;
    activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (activePointers.size >= 2 && pinchStart) {
      const pts = [...activePointers.values()];
      const distance = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      setZoom(pinchStart.zoom * distance / Math.max(1, pinchStart.distance));
    } else if (zoom > 1 && dragStart) {
      const maxX = stage.clientWidth * (zoom - 1) / 2, maxY = stage.clientHeight * (zoom - 1) / 2;
      panX = clamp(dragStart.panX + event.clientX - dragStart.x, -maxX, maxX);
      panY = clamp(dragStart.panY + event.clientY - dragStart.y, -maxY, maxY);
      setZoom(zoom);
    }
  });
  function endPointer(event) {
    if (!activePointers.has(event.pointerId)) return;
    const start = swipeStart;
    activePointers.delete(event.pointerId);
    if (activePointers.size < 2) pinchStart = null;
    if (zoom === 1 && start && activePointers.size === 0) {
      const dx = event.clientX - start.x, dy = event.clientY - start.y;
      if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.2) step(dx < 0 ? 1 : -1);
    }
    if (!activePointers.size) { swipeStart = null; dragStart = null; }
  }
  stage.addEventListener('pointerup', endPointer);
  stage.addEventListener('pointercancel', endPointer);

  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; }
    catch {
      const field = document.createElement('textarea'); field.value = text;
      field.style.position = 'fixed'; field.style.opacity = '0'; document.body.appendChild(field);
      field.select();
      let copied = false;
      try { copied = document.execCommand('copy'); } catch { copied = false; }
      field.remove(); return copied;
    }
  }

  async function shareOrCopy(payload) {
    if (navigator.share) {
      try { await navigator.share(payload); return; }
      catch (error) { if (error?.name === 'AbortError') return; }
    }
    try {
      await navigator.clipboard.writeText(payload.url);
      toast('LINK COPIED — PASS IT ON.');
    } catch {
      const field = document.createElement('textarea'); field.value = payload.url;
      field.style.position = 'fixed'; field.style.opacity = '0'; document.body.appendChild(field);
      field.select();
      try { document.execCommand('copy'); toast('LINK COPIED — PASS IT ON.'); }
      catch { toast('COPY THE LINK FROM YOUR ADDRESS BAR.'); }
      field.remove();
    }
  }

  async function exportShareCard(item) {
    if (!item) return;
    try {
      if (document.fonts?.ready) await document.fonts.ready;
      const photo = new Image(); photo.src = item.file;
      if (photo.decode) await photo.decode();
      else await new Promise((resolve, reject) => { photo.onload = resolve; photo.onerror = reject; });
      const canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = 630;
      const c = canvas.getContext('2d'); c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
      c.fillStyle = '#0b0b0d'; c.fillRect(0, 0, 1200, 630);
      c.fillStyle = '#17171b'; c.fillRect(30, 30, 720, 570);
      c.strokeStyle = '#f2efe6'; c.lineWidth = 3; c.strokeRect(30, 30, 720, 570);
      const box = { x: 47, y: 47, w: 686, h: 536 };
      const scale = Math.min(box.w / photo.naturalWidth, box.h / photo.naturalHeight);
      const w = photo.naturalWidth * scale, h = photo.naturalHeight * scale;
      c.drawImage(photo, box.x + (box.w - w) / 2, box.y + (box.h - h) / 2, w, h);
      c.fillStyle = '#ff5a1f'; c.fillRect(786, 48, 10, 534);
      c.fillStyle = '#2cd4c6'; c.fillRect(813, 48, 46, 5);
      c.fillStyle = '#2cd4c6'; c.font = '900 20px "Archivo Black", Arial, sans-serif'; c.fillText('ENEM / TDK ARCHIVE', 813, 95);
      c.fillStyle = '#f2efe6'; c.font = '900 43px "Archivo Black", Arial, sans-serif';
      const words = item.title.split(/\s+/), lines = []; let line = '';
      for (const word of words) { const trial = line ? `${line} ${word}` : word; if (c.measureText(trial).width > 310 && line) { lines.push(line); line = word; } else line = trial; }
      if (line) lines.push(line); lines.slice(0, 3).forEach((row, i) => c.fillText(row, 813, 174 + i * 54));
      c.fillStyle = '#ffd23e'; c.font = '24px "Permanent Marker", cursive';
      c.fillText(`${item.year} · ${item.city || item.spot}`, 813, 368, 330);
      c.fillStyle = '#b9b5aa'; c.font = '600 18px "Space Grotesk", Arial, sans-serif';
      const srcWords = (item.source || 'Verified archive').split(/\s+/); let srcLine = '', srcY = 420;
      for (const word of srcWords) {
        const trial = srcLine ? `${srcLine} ${word}` : word;
        if (c.measureText(trial).width > 325 && srcLine) { c.fillText(srcLine, 813, srcY); srcY += 26; srcLine = word; }
        else srcLine = trial;
      }
      if (srcLine) c.fillText(srcLine, 813, srcY);
      c.fillStyle = '#8f8c83'; c.font = '15px "Space Grotesk", Arial, sans-serif';
      c.fillText('ARTWORK BY ENEM · SOURCE CREDIT INCLUDED', 813, 554, 330);
      c.fillStyle = '#d4ff3f'; c.font = '900 16px "Archivo Black", Arial, sans-serif'; c.fillText('PHILLY → EVERYWHERE', 813, 584);
      const a = document.createElement('a'); a.download = `enem-${item.id}-share.png`; a.href = canvas.toDataURL('image/png'); a.click();
      toast('SHARE CARD SAVED — REAL ART, SOURCE CREDIT INCLUDED.');
    } catch (error) { console.error('Share card export failed', error); toast('COULD NOT BUILD THE SHARE CARD.'); }
  }

  updateCrateUI();
  const initialPiece = new URLSearchParams(location.search).get('piece');
  const initialIndex = items.findIndex((item) => item.id === initialPiece);
  if (initialIndex >= 0) open(initialIndex, false);

  return {
    openPieceById(id) {
      const index = items.findIndex((item) => item.id === id);
      if (index < 0) return false;
      document.getElementById('resetArchive').click();
      document.getElementById('walls').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      open(index, true);
      return true;
    },
  };
}
