/* ENEM player engine.
   - Plays real audio files dropped into assets/audio/ (01.mp3 … 08.mp3 by track number).
   - When no file is present, plays a clearly-labelled synthesized DEMO boom-bap loop
     (a player-engine demo, never presented as an Enem recording).
   - Web Audio analyser drives the visualizer. */

function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

export function initPlayer(tracks, ui) {
  let ctx = null, master = null, analyser = null;
  let audioEl = null, mediaSrc = null;
  let current = -1, playing = false, mode = 'none'; // mode: file | demo
  let synth = null;
  const fileOK = new Array(tracks.length).fill(false);

  function ensureCtx() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = .9;
    analyser = ctx.createAnalyser(); analyser.fftSize = 96; analyser.smoothingTimeConstant = .82;
    master.connect(analyser); analyser.connect(ctx.destination);
  }

  function ensureAudioEl() {
    if (audioEl) return;
    audioEl = new Audio();
    audioEl.preload = 'metadata';
    audioEl.addEventListener('ended', () => next());
    ensureCtx();
    mediaSrc = ctx.createMediaElementSource(audioEl);
    mediaSrc.connect(master);
  }

  // ---------- synth demo beat ----------
  class SynthBeat {
    constructor(seed) {
      const rnd = mulberry32(seed * 7919 + 13);
      this.bpm = 86 + Math.floor(rnd() * 10);
      this.step = 60 / this.bpm / 4;
      this.bars = 8;
      this.total = this.step * 16 * this.bars; // loop length
      // patterns
      this.kickP = new Set([0, 10]); if (rnd() > .4) this.kickP.add(7); if (rnd() > .6) this.kickP.add(13);
      this.snareP = new Set([4, 12]);
      this.hatGhost = rnd() > .5;
      const scale = [0, 3, 5, 7, 10];
      this.bassLine = [];
      for (let b = 0; b < this.bars; b++) for (let s = 0; s < 16; s++) {
        this.bassLine.push((s === 0 || s === 10 || (s === 7 && rnd() > .5)) ? scale[Math.floor(rnd() * scale.length)] : -1);
      }
      this.root = 41 + Math.floor(rnd() * 5) * 2; // Hz-ish midi low
      this.noise = this.makeNoise();
      this.nextTime = 0; this.stepIdx = 0; this.startAt = 0; this.offset = 0;
      this.timer = null; this.crackle = null;
    }
    makeNoise() {
      const len = ctx.sampleRate * 1.2;
      const b = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = b.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      return b;
    }
    startCrackle() {
      const len = ctx.sampleRate * 2;
      const b = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = b.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() < .0015 ? (Math.random() * 2 - 1) * .8 : (Math.random() * 2 - 1) * .015);
      const src = ctx.createBufferSource(); src.buffer = b; src.loop = true;
      const g = ctx.createGain(); g.gain.value = .12;
      src.connect(g); g.connect(master); src.start();
      this.crackle = src;
    }
    midi2f(m) { return 440 * Math.pow(2, (m - 69) / 12); }
    kick(t) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + .12);
      g.gain.setValueAtTime(1, t); g.gain.exponentialRampToValueAtTime(.001, t + .3);
      o.connect(g); g.connect(master); o.start(t); o.stop(t + .32);
    }
    snare(t) {
      const s = ctx.createBufferSource(); s.buffer = this.noise;
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1900; f.Q.value = .9;
      const g = ctx.createGain(); g.gain.setValueAtTime(.5, t); g.gain.exponentialRampToValueAtTime(.001, t + .2);
      s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + .22);
    }
    hat(t, open) {
      const s = ctx.createBufferSource(); s.buffer = this.noise;
      const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7500;
      const g = ctx.createGain(); const d = open ? .14 : .045;
      g.gain.setValueAtTime(open ? .16 : .1, t); g.gain.exponentialRampToValueAtTime(.001, t + d);
      s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + d + .02);
    }
    bass(t, semi) {
      const o = ctx.createOscillator(); o.type = 'triangle';
      o.frequency.value = this.midi2f(this.root + semi);
      const g = ctx.createGain();
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.3, t + .02); g.gain.exponentialRampToValueAtTime(.001, t + this.step * 3);
      o.connect(g); g.connect(master); o.start(t); o.stop(t + this.step * 3.2);
    }
    scheduleStep(i, t) {
      const s = i % 16;
      if (this.kickP.has(s)) this.kick(t);
      if (this.snareP.has(s)) this.snare(t);
      if (s % 2 === 0) this.hat(t, s === 14 && this.hatGhost);
      else if (this.hatGhost && Math.random() < .25) this.hat(t, false);
      const b = this.bassLine[i % this.bassLine.length];
      if (b >= 0) this.bass(t, b);
    }
    start(offset = 0) {
      ensureCtx();
      this.startCrackle();
      this.offset = offset;
      this.stepIdx = Math.floor(offset / this.step);
      this.nextTime = ctx.currentTime + .06;
      this.anchor = ctx.currentTime + .06 - offset;
      this.timer = setInterval(() => this.tick(), 30);
    }
    tick() {
      while (this.nextTime < ctx.currentTime + .15) {
        this.scheduleStep(this.stepIdx, this.nextTime);
        this.stepIdx++;
        this.nextTime += this.step;
      }
    }
    position() {
      if (!this.anchor) return 0;
      return (ctx.currentTime - this.anchor) % this.total;
    }
    seek(t) {
      const pos = this.position();
      this.stopVoices();
      this.start(t);
    }
    stopVoices() {
      clearInterval(this.timer); this.timer = null;
      if (this.crackle) { try { this.crackle.stop(); } catch (e) {} this.crackle = null; }
    }
    stop() { this.stopVoices(); this.anchor = null; }
  }

  // ---------- availability probe ----------
  tracks.forEach((t, i) => {
    const url = `assets/audio/${String(i + 1).padStart(2, '0')}.mp3`;
    t.file = url;
    fetch(url, { method: 'HEAD' }).then(r => {
      if (r.ok) { fileOK[i] = true; if (ui.onAvailability) ui.onAvailability(i, true); }
    }).catch(() => {});
  });

  // ---------- transport ----------
  function stopAll() {
    if (audioEl) { audioEl.pause(); }
    if (synth) { synth.stop(); synth = null; }
    playing = false;
  }

  function play(i) {
    ensureCtx();
    if (ctx.state === 'suspended') ctx.resume();
    const sameTrack = i === current;
    stopAll();
    current = i;
    if (fileOK[i]) {
      mode = 'file';
      ensureAudioEl();
      if (sameTrack && audioEl.dataset.idx == i && audioEl.currentTime > 0) {
        audioEl.play(); playing = true;
      } else {
        audioEl.dataset.idx = i;
        audioEl.src = tracks[i].file;
        audioEl.play().then(() => { playing = true; render(); }).catch(() => { fallbackDemo(i); });
      }
    } else {
      fallbackDemo(i);
    }
    playing = true;
    render();
    ui.onChange && ui.onChange(current, playing, mode);
  }

  function fallbackDemo(i) {
    mode = 'demo';
    synth = new SynthBeat(i + 1);
    synth.start(0);
    playing = true;
  }

  function toggle() {
    if (current < 0) return play(0);
    if (playing) {
      if (mode === 'file') audioEl.pause(); else { synthPause(); }
      playing = false;
    } else {
      ensureCtx(); ctx.resume && ctx.resume();
      if (mode === 'file') audioEl.play(); else synthResume();
      playing = true;
    }
    render();
    ui.onChange && ui.onChange(current, playing, mode);
  }

  let pausedAt = 0;
  function synthPause() { pausedAt = synth.position(); synth.stop(); }
  function synthResume() { synth = new SynthBeat(current + 1); synth.start(pausedAt); }

  function next() { play((current + 1) % tracks.length); }
  function prev() { play((current - 1 + tracks.length) % tracks.length); }

  function duration() {
    if (current < 0) return 0;
    if (mode === 'file') return audioEl ? (audioEl.duration || 0) : 0;
    return synth ? synth.total : 0;
  }
  function position() {
    if (current < 0) return 0;
    if (mode === 'file') return audioEl ? audioEl.currentTime : 0;
    return synth ? synth.position() : pausedAt;
  }
  function seek(t) {
    if (current < 0) return;
    if (mode === 'file' && audioEl) { audioEl.currentTime = t; return; }
    if (mode === 'demo') {
      if (playing && synth) { synth.stop(); synth = new SynthBeat(current + 1); synth.start(t); }
      else pausedAt = t;
    }
  }

  // ---------- UI ----------
  const bar = document.getElementById('player');
  const pTitle = document.getElementById('pTitle');
  const pSub = document.getElementById('pSub');
  const pPlay = document.getElementById('pPlay');
  const pSeek = document.getElementById('pSeek');
  const pTime = document.getElementById('pTime');
  const viz = document.getElementById('pViz');
  const vctx = viz ? viz.getContext('2d') : null;

  function fmt(s) {
    if (!isFinite(s)) s = 0;
    const m = Math.floor(s / 60), ss = Math.floor(s % 60);
    return `${m}:${String(ss).padStart(2, '0')}`;
  }

  function render() {
    if (current < 0) return;
    bar.classList.add('on');
    const t = tracks[current];
    pTitle.textContent = `${String(current + 1).padStart(2, '0')}. ${t.title}`;
    pSub.innerHTML = mode === 'demo'
      ? `prod. ${t.prod} · <span class="demo">DEMO BEAT — player engine preview (not the recording)</span>`
      : `prod. ${t.prod}`;
    pPlay.textContent = playing ? '❚' : '►';
    document.querySelectorAll('.track').forEach((el, i) => {
      el.classList.toggle('current', i === current);
      const b = el.querySelector('.play');
      if (b) b.textContent = (i === current && playing) ? '❚❚' : '►';
    });
    const alb = document.querySelector('.album');
    if (alb) alb.classList.toggle('playing', playing);
  }

  document.getElementById('pPlay').addEventListener('click', toggle);
  document.getElementById('pNext').addEventListener('click', next);
  document.getElementById('pPrev').addEventListener('click', prev);
  pSeek.addEventListener('input', () => seek(parseFloat(pSeek.value)));

  // visualizer + time loop
  const COLORS = ['#ff5a1f', '#22d3ee', '#ff2ea6', '#d4ff3f', '#7c5cff'];
  function loop() {
    requestAnimationFrame(loop);
    if (current < 0) return;
    const d = duration(), p = position();
    pSeek.max = d || 1;
    if (!pSeek.matches(':active')) pSeek.value = p;
    pTime.textContent = `${fmt(p)} / ${fmt(d)}`;
    if (vctx) {
      const w = viz.width = viz.clientWidth * 2, h = viz.height = viz.clientHeight * 2;
      vctx.clearRect(0, 0, w, h);
      if (analyser) {
        const arr = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(arr);
        const n = 24;
        for (let i = 0; i < n; i++) {
          const v = arr[Math.floor(i * arr.length / n)] / 255;
          const bh = Math.max(2, v * h);
          vctx.fillStyle = COLORS[i % COLORS.length];
          vctx.fillRect(i * (w / n) + 1, h - bh, w / n - 3, bh);
        }
      }
    }
  }
  loop();

  // exposed audio level (0..1) so other layers can react to the music
  function getLevel() {
    if (!analyser || !playing) return 0;
    const a = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(a);
    let s = 0;
    for (let i = 0; i < a.length; i++) s += a[i];
    return s / (a.length * 255);
  }

  return { play, toggle, next, prev, seek, render, getLevel };
}
