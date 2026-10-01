/* FX layer — GSAP + ScrollTrigger show-off round.
   Cards/DOM are always rendered by app.js; this layer only animates.
   Without GSAP (or with reduced motion) the reel becomes a CSS scroll strip. */

export function initFx(ART) {
  const g = window.gsap, ST = window.ScrollTrigger;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches || document.body.classList.contains('still-mode');
  const reelSec = document.getElementById('reel');

  if (!g || reduced) {
    if (reelSec) reelSec.classList.add('noanim');
    return false;
  }
  window.addEventListener('enem-motion-change', () => {
    if (document.body.classList.contains('still-mode')) {
      g.globalTimeline.pause();
      if (ST?.disable) ST.disable(true, true);
      reelSec?.classList.add('noanim');
    }
  });
  if (ST) g.registerPlugin(ST);
  const fx = (el) => { el.classList.add('fx'); return el; };
  const stage = (name, fn) => { try { fn(); } catch (err) { console.warn('fx stage failed:', name, err); } };

  /* 1 — scramble-decode the hero mega title */
  stage('scramble', () => {
    const CH = '▚▞▟◆✶#%&$@NM';
    document.querySelectorAll('h1.mega > span').forEach((sp, idx) => {
      const orig = sp.textContent;
      setTimeout(() => {
        let frame = 0; const total = 20;
        const iv = setInterval(() => {
          frame++;
          sp.textContent = orig.split('').map((ch, i) =>
            ch === ' ' ? ' ' : (i < (frame / total) * orig.length ? ch : CH[(Math.random() * CH.length) | 0])
          ).join('');
          if (frame >= total) { sp.textContent = orig; clearInterval(iv); }
        }, 42);
      }, 350 + idx * 280);
    });
  });

  /* 2 — word-mask reveals on headings */
  stage('masks', () => {
    document.querySelectorAll('.sec-head h2').forEach((el) => {
      const words = el.textContent.trim().split(/\s+/);
      el.innerHTML = words.map((w) => `<span class="w"><span class="wi">${w}</span></span>`).join(' ');
      g.from(el.querySelectorAll('.wi'), {
        yPercent: 120, duration: .9, ease: 'power4.out', stagger: .05,
        scrollTrigger: ST ? { trigger: el, start: 'top 88%' } : undefined,
      });
    });
    document.querySelectorAll('.hero-sub, .sec-sub, .lede').forEach((el) => {
      fx(el);
      g.from(el, { y: 44, opacity: 0, duration: 1, ease: 'power3.out',
        scrollTrigger: ST ? { trigger: el, start: 'top 90%' } : undefined });
    });
  });

  /* 3 — gallery + quotes batch fly-in */
  stage('batch', () => {
    if (!ST) return;
    const pieces = [...document.querySelectorAll('.piece')].map(fx);
    g.set(pieces, { opacity: 0, y: 80, rotation: (i) => (i % 3 - 1) * 2.4 });
    ST.batch(pieces, {
      start: 'top 94%',
      onEnter: (b) => g.to(b, { opacity: 1, y: 0, rotation: 0, duration: .85, stagger: .09, ease: 'power3.out', overwrite: true }),
    });
    const quotes = [...document.querySelectorAll('.quote')].map(fx);
    g.set(quotes, { opacity: 0, y: 60, rotation: (i) => (i % 2 ? 4 : -4) });
    ST.batch(quotes, {
      start: 'top 92%',
      onEnter: (b) => g.to(b, { opacity: 1, y: 0, rotation: 0, duration: .8, stagger: .12, ease: 'back.out(1.6)', overwrite: true }),
    });
  });

  /* 4 — pinned horizontal HIGHLIGHT REEL (cards already in DOM) */
  stage('reel', () => {
    const track = document.querySelector('.reel-track');
    if (!track || !reelSec) return;
    if (!ST) { reelSec.classList.add('noanim'); return; }
    const dist = () => Math.max(0, track.scrollWidth - innerWidth);
    g.to(track, {
      x: () => -dist(),
      ease: 'none',
      scrollTrigger: { trigger: reelSec, start: 'top top', end: () => '+=' + (dist() + 300), pin: true, scrub: 1, invalidateOnRefresh: true },
    });
    // 3D tilt + glare on reel cards
    track.querySelectorAll('.reel-card').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - .5;
        const y = (e.clientY - r.top) / r.height - .5;
        g.to(card, { rotationY: x * 10, rotationX: -y * 8, transformPerspective: 900, duration: .4, ease: 'power2.out', overwrite: 'auto' });
        card.style.setProperty('--gx', (x * 100 + 50) + '%');
        card.style.setProperty('--gy', (y * 100 + 50) + '%');
      });
      card.addEventListener('pointerleave', () => {
        g.to(card, { rotationY: 0, rotationX: 0, duration: .6, ease: 'power3.out', overwrite: 'auto' });
      });
    });
  });

  /* 5 — marquee reacts to scroll velocity (skew whip) */
  stage('marquee', () => {
    if (!ST) return;
    const rails = [...document.querySelectorAll('.marquee .rail')];
    ST.create({
      onUpdate(self) {
        const v = g.utils.clamp(-12, 12, self.getVelocity() / 120);
        rails.forEach((r) => g.to(r, { skewX: v, duration: .5, ease: 'power2.out', overwrite: 'auto' }));
      },
    });
  });

  /* 6 — magnetic buttons */
  stage('magnetic', () => {
    document.querySelectorAll('.btn, #cartBtn').forEach((el) => {
      const x = g.quickTo(el, 'x', { duration: .4, ease: 'power3' });
      const y = g.quickTo(el, 'y', { duration: .4, ease: 'power3' });
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        x((e.clientX - r.left - r.width / 2) * .16);
        y((e.clientY - r.top - r.height / 2) * .24);
      });
      el.addEventListener('pointerleave', () => { x(0); y(0); });
    });
  });

  /* 7 — the real mural lifts toward the visitor; its photo fragments travel in depth. */
  stage('hero-emergence', () => {
    if (!ST) return;
    const hero = document.getElementById('hero');
    const wall = document.getElementById('heroWall');
    const copy = hero?.querySelector('.hero-copy');
    if (!hero || !wall || !copy) return;
    const shards = [...wall.querySelectorAll('.hero-wall-shard')];
    const timeline = g.timeline({
      scrollTrigger: {
        trigger: hero, start: 'top top', end: () => `+=${Math.round(innerHeight * 1.2)}`,
        pin: true, scrub: .65, anticipatePin: 1, invalidateOnRefresh: true,
      },
    });
    timeline.to(copy, { yPercent: -28, xPercent: -7, opacity: 0, filter: 'blur(4px)', duration: .48, ease: 'none' }, 0)
      .to(wall, { scale: 1.2, rotationY: 0, rotationX: 0, rotationZ: 0, x: '-1vw', y: '1vh', z: 55, duration: 1, ease: 'none' }, 0)
      .to(wall.querySelector('.hero-wall-base'), { opacity: .34, duration: .88, ease: 'none' }, .12)
      .to(shards[0], { xPercent: -21, yPercent: -7, z: 225, rotationZ: -6, rotationY: -7, duration: .9, ease: 'none' }, .08)
      .to(shards[1], { xPercent: -1, yPercent: 8, z: 255, rotationZ: 2.5, rotationX: 3, duration: .9, ease: 'none' }, .04)
      .to(shards[2], { xPercent: 21, yPercent: -5, z: 235, rotationZ: 6, rotationY: 7, duration: .9, ease: 'none' }, .12)
      .to(shards[3], { yPercent: -15, z: 250, rotationZ: -2.5, duration: .9, ease: 'none' }, .02)
      .fromTo('.hero-wall-sheen', { xPercent: -135, opacity: 0 }, { xPercent: 135, opacity: .8, duration: .72, ease: 'none' }, .15)
      .to('.hero-atmosphere', { scale: 1.2, opacity: .28, duration: 1, ease: 'none' }, 0)
      .to('.hero-veil', { opacity: .52, duration: 1, ease: 'none' }, 0)
      .to('.hero-piece-credit, .scroll-cue', { opacity: 0, duration: .34, ease: 'none' }, .05);
  });

  /* 8 — ghost type drifts at a slower depth than the archive content. */
  stage('parallax', () => {
    if (!ST) return;
    document.querySelectorAll('.ghost-word').forEach((el) => {
      g.fromTo(el, { yPercent: 34 }, { yPercent: -34, ease: 'none',
        scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
  });
  if (ST) {
    const refresh = () => requestAnimationFrame(() => ST.refresh());
    if (document.readyState === 'complete') refresh();
    else window.addEventListener('load', refresh, { once: true });
    if (document.fonts?.ready) document.fonts.ready.then(refresh).catch(() => {});
  }
  return true;
}
