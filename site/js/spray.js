/* WebGL spray-paint particle field for the hero.
   Ambient drifting mist + bursts that follow the pointer, additive blending.
   Falls back to a 2D canvas if WebGL is unavailable. */

const PALETTE = [
  [1.0, 0.35, 0.12],  // orange
  [0.17, 0.83, 0.78], // teal (pulled from his fills)
  [1.0, 0.18, 0.65],  // magenta
  [0.83, 1.0, 0.25],  // acid
  [0.49, 0.36, 1.0],  // purple
];

export function initSpray(canvas) {
  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false, antialias: false });
  if (!gl) return init2DFallback(canvas);

  const N = 700;
  const vert = `
    attribute vec2 aPos; attribute float aSize; attribute vec3 aCol; attribute float aAlpha;
    varying vec3 vCol; varying float vA;
    void main(){ gl_Position = vec4(aPos,0.,1.); gl_PointSize = aSize; vCol=aCol; vA=aAlpha; }`;
  const frag = `
    precision mediump float; varying vec3 vCol; varying float vA;
    void main(){
      vec2 d = gl_PointCoord - .5;
      float r = length(d);
      float a = smoothstep(.5,.05,r) * vA;
      gl_FragColor = vec4(vCol*a, a);
    }`;

  function sh(type, src) {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn('shader', gl.getShaderInfoLog(s)); return null; }
    return s;
  }
  const vs = sh(gl.VERTEX_SHADER, vert), fs = sh(gl.FRAGMENT_SHADER, frag);
  if (!vs || !fs) return init2DFallback(canvas);
  const prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return init2DFallback(canvas);
  gl.useProgram(prog);

  const aPos = gl.getAttribLocation(prog, 'aPos');
  const aSize = gl.getAttribLocation(prog, 'aSize');
  const aCol = gl.getAttribLocation(prog, 'aCol');
  const aAlpha = gl.getAttribLocation(prog, 'aAlpha');

  // particle state
  const P = [];
  for (let i = 0; i < N; i++) {
    P.push({
      x: Math.random() * 2 - 1, y: Math.random() * 2 - 1,
      vx: (Math.random() - .5) * .0012, vy: (Math.random() - .5) * .0012,
      s: 2 + Math.random() * 7,
      c: PALETTE[(Math.random() * PALETTE.length) | 0],
      a: .05 + Math.random() * .12,
      life: 1, decay: 0, // decay>0 => burst particle
    });
  }
  const data = new Float32Array(N * 8);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.enableVertexAttribArray(aPos); gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 32, 0);
  gl.enableVertexAttribArray(aSize); gl.vertexAttribPointer(aSize, 1, gl.FLOAT, false, 32, 8);
  gl.enableVertexAttribArray(aCol); gl.vertexAttribPointer(aCol, 3, gl.FLOAT, false, 32, 12);
  gl.enableVertexAttribArray(aAlpha); gl.vertexAttribPointer(aAlpha, 1, gl.FLOAT, false, 32, 24);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  resize();
  window.addEventListener('resize', resize);

  let px = 0, py = 0, lastPx = 0, lastPy = 0, hasPointer = false, burstIdx = 0;
  let paused = matchMedia('(prefers-reduced-motion: reduce)').matches || document.body.classList.contains('still-mode');
  window.addEventListener('enem-motion-change', () => {
    paused = matchMedia('(prefers-reduced-motion: reduce)').matches || document.body.classList.contains('still-mode');
    if (!paused) requestAnimationFrame(frame);
  });
  window.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    if (e.clientY > r.bottom || e.clientY < r.top) { hasPointer = false; return; }
    px = (e.clientX / r.width) * 2 - 1;
    py = -((e.clientY - r.top) / r.height) * 2 + 1;
    hasPointer = true;
  }, { passive: true });

  const dpr = () => Math.min(window.devicePixelRatio || 1, 2);

  function frame() {
    if (paused) { gl.clear(gl.COLOR_BUFFER_BIT); return; }
    // music reactivity: player level pumps the mist
    const lvl = (window.Player && window.Player.getLevel) ? window.Player.getLevel() : 0;
    if (lvl > .08) {
      const n = Math.round(lvl * 5);
      for (let k = 0; k < n; k++) {
        const p = P[burstIdx++ % N];
        p.x = (Math.random() - .5) * 1.8;
        p.y = -.95;
        p.vx = (Math.random() - .5) * .004;
        p.vy = .004 + lvl * .01;
        p.s = (4 + Math.random() * 9) * dpr();
        p.a = .25 + lvl * .3;
        p.decay = .01 + Math.random() * .015;
        p.c = PALETTE[(Math.random() * PALETTE.length) | 0];
      }
    }

    // emit bursts along pointer motion
    if (hasPointer) {
      const dx = px - lastPx, dy = py - lastPy;
      const speed = Math.hypot(dx, dy);
      const count = Math.min(12, Math.floor(speed * 260) + 2 + Math.round(lvl * 5));
      for (let k = 0; k < count; k++) {
        const p = P[burstIdx++ % N];
        p.x = px + (Math.random() - .5) * .06;
        p.y = py + (Math.random() - .5) * .06;
        p.vx = (Math.random() - .5) * .006 + dx * .3;
        p.vy = (Math.random() - .5) * .006 + dy * .3;
        p.s = (3 + Math.random() * 10) * dpr();
        p.a = .35 + Math.random() * .3;
        p.decay = .012 + Math.random() * .02;
        p.c = PALETTE[(Math.random() * PALETTE.length) | 0];
      }
      lastPx = px; lastPy = py;
    }

    let o = 0;
    for (let i = 0; i < N; i++) {
      const p = P[i];
      p.x += p.vx; p.y += p.vy;
      if (p.decay > 0) {
        p.life -= p.decay;
        if (p.life <= 0) { // respawn as ambient
          p.life = 1; p.decay = 0;
          p.x = Math.random() * 2 - 1; p.y = Math.random() * 2 - 1;
          p.vx = (Math.random() - .5) * .0012; p.vy = (Math.random() - .5) * .0012;
          p.s = 2 + Math.random() * 7; p.a = .05 + Math.random() * .12;
        }
        p.vy -= .00012; // spray drifts up
      }
      if (p.x > 1.1) p.x = -1.1; if (p.x < -1.1) p.x = 1.1;
      if (p.y > 1.1) p.y = -1.1; if (p.y < -1.1) p.y = 1.1;
      data[o++] = p.x; data[o++] = p.y;
      data[o++] = p.s * (p.decay ? p.life : 1) * (1 + lvl * .5);
      data[o++] = p.c[0]; data[o++] = p.c[1]; data[o++] = p.c[2];
      data[o++] = p.a * (p.decay ? p.life : 1);
      data[o++] = 0;
    }
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.POINTS, 0, N);
    requestAnimationFrame(frame);
  }
  if (!paused) requestAnimationFrame(frame);
}

/* 2D fallback */
function init2DFallback(canvas) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const dots = [];
  function resize() { canvas.width = canvas.clientWidth; canvas.height = canvas.clientHeight; }
  resize(); window.addEventListener('resize', resize);
  let paused = matchMedia('(prefers-reduced-motion: reduce)').matches || document.body.classList.contains('still-mode');
  for (let i = 0; i < 90; i++) dots.push({ x: Math.random(), y: Math.random(), r: 1 + Math.random() * 3, c: i % PALETTE.length, a: .1 + Math.random() * .2, vx: (Math.random() - .5) * .0008, vy: (Math.random() - .5) * .0008 });
  window.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    for (let k = 0; k < 4; k++) dots.push({ x: (e.clientX - r.left) / r.width + (Math.random() - .5) * .03, y: (e.clientY - r.top) / r.height + (Math.random() - .5) * .03, r: 1 + Math.random() * 5, c: (Math.random() * 5) | 0, a: .5, vx: 0, vy: -.001, die: 1 });
    if (dots.length > 400) dots.splice(0, dots.length - 400);
  }, { passive: true });
  function loop() {
    if (paused) { ctx.clearRect(0, 0, canvas.width, canvas.height); return; }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const d of dots) {
      d.x += d.vx; d.y += d.vy;
      if (d.die) { d.a -= .01; if (d.a <= 0) { d.a = .1 + Math.random() * .2; d.die = 0; d.x = Math.random(); d.y = Math.random(); } }
      const c = PALETTE[d.c];
      ctx.fillStyle = `rgba(${c[0] * 255 | 0},${c[1] * 255 | 0},${c[2] * 255 | 0},${d.a})`;
      ctx.beginPath(); ctx.arc(d.x * canvas.width, d.y * canvas.height, d.r, 0, 7); ctx.fill();
    }
    requestAnimationFrame(loop);
  }
  window.addEventListener('enem-motion-change', () => {
    paused = matchMedia('(prefers-reduced-motion: reduce)').matches || document.body.classList.contains('still-mode');
    if (!paused) requestAnimationFrame(loop);
  });
  if (!paused) requestAnimationFrame(loop);
}
