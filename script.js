/* =====================================================================
   GOBLIN MARKET — interactions, atmosphere & sound
   ===================================================================== */
(() => {
  'use strict';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* =====================================================================
     SOUND ENGINE  (WebAudio, no external files; off until user opts in)
     ===================================================================== */
  const Sound = (() => {
    let ctx, master, ambGain, started = false, on = false;
    function ensure() {
      if (ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
      ambGain = ctx.createGain(); ambGain.gain.value = 0.6; ambGain.connect(master);
    }
    function ambient() {
      if (started) return; started = true;
      // low drone — two detuned oscillators
      [55, 55.4, 82.5].forEach((f, i) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = i === 2 ? 'sine' : 'triangle'; o.frequency.value = f;
        g.gain.value = i === 2 ? 0.018 : 0.03; o.connect(g); g.connect(ambGain); o.start();
        // slow wobble
        const lfo = ctx.createOscillator(), lg = ctx.createGain();
        lfo.frequency.value = 0.07 + i * 0.03; lg.gain.value = 1.5;
        lfo.connect(lg); lg.connect(o.frequency); lfo.start();
      });
      // wind — filtered looping noise
      const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource(); noise.buffer = buf; noise.loop = true;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 380;
      const ng = ctx.createGain(); ng.gain.value = 0.05;
      noise.connect(lp); lp.connect(ng); ng.connect(ambGain); noise.start();
      const wlfo = ctx.createOscillator(), wlg = ctx.createGain();
      wlfo.frequency.value = 0.05; wlg.gain.value = 180;
      wlfo.connect(wlg); wlg.connect(lp.frequency); wlfo.start();
    }
    function ramp(v) { if (master) master.gain.linearRampToValueAtTime(v, ctx.currentTime + 0.4); }
    function tone(freq, dur, type = 'square', vol = 0.06) {
      if (!on || !ctx) return;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(vol, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
      o.connect(g); g.connect(master); o.start(); o.stop(ctx.currentTime + dur);
    }
    return {
      enable() { ensure(); ctx.resume(); on = true; ambient(); ramp(0.9); },
      disable() { on = false; ramp(0); },
      isOn: () => on,
      blip() { tone(720 + Math.random() * 80, 0.08, 'square', 0.04); },
      coin() { tone(988, 0.06, 'square', 0.05); setTimeout(() => tone(1319, 0.09, 'square', 0.05), 60); },
      thud() { tone(120, 0.28, 'sine', 0.12); tone(60, 0.34, 'sine', 0.1); }
    };
  })();

  const sndBtn = $('#soundToggle');
  if (sndBtn) {
    sndBtn.addEventListener('click', () => {
      if (Sound.isOn()) { Sound.disable(); sndBtn.classList.remove('on'); }
      else { Sound.enable(); sndBtn.classList.add('on'); Sound.coin(); }
    });
  }

  /* ---------- LOADER ---------- */
  const loader = $('#loader'), bar = $('#loaderBar'), ltext = $('#loaderText');
  const msgs = ['SUMMONING THE MARKET...', 'LIGHTING LANTERNS...', 'WAKING THE GOBLINS...', 'OPENING THE STALLS...'];
  let p = 0, mi = 0;
  const tick = setInterval(() => {
    p = Math.min(100, p + Math.random() * 22);
    bar.style.width = p + '%';
    if (p > (mi + 1) * 25 && mi < msgs.length - 1) ltext.textContent = msgs[++mi];
    if (p >= 100) {
      clearInterval(tick);
      ltext.textContent = 'ENTER >';
      setTimeout(() => { loader.classList.add('hide'); fireGlitch(); }, 450);
    }
  }, 240);

  /* ---------- CUSTOM CURSOR ---------- */
  const cur = $('#cursor'), dot = $('#cursorDot');
  let cx = innerWidth / 2, cy = innerHeight / 2, dx = cx, dy = cy;
  if (cur) {
    addEventListener('mousemove', e => {
      cx = e.clientX; cy = e.clientY;
      dot.style.transform = `translate(${cx}px,${cy}px)`;
    });
    (function follow() {
      dx += (cx - dx) * 0.2; dy += (cy - dy) * 0.2;
      cur.style.transform = `translate(${dx}px,${dy}px)`;
      requestAnimationFrame(follow);
    })();
    $$('a,button,.stall,.btn').forEach(el => {
      el.addEventListener('mouseenter', () => { cur.classList.add('hot'); Sound.blip(); });
      el.addEventListener('mouseleave', () => cur.classList.remove('hot'));
    });
    $$('.stall').forEach(el => el.addEventListener('mouseenter', () => Sound.coin()));
    $$('.btn-primary').forEach(el => el.addEventListener('click', () => Sound.thud()));
  }

  /* ---------- NAV scroll state ---------- */
  const nav = $('#nav');
  const onScroll = () => nav.classList.toggle('scrolled', scrollY > 40);
  onScroll(); addEventListener('scroll', onScroll, { passive: true });

  /* ---------- GOBLIN eye blink ---------- */
  const eyes = $('#gEyes'), eyeTrack = $('#gEyeTrack');
  if (eyes && !reduced) {
    (function blink() {
      eyes.classList.add('shut');
      setTimeout(() => eyes.classList.remove('shut'), 130);
      setTimeout(blink, 2200 + Math.random() * 3200);
    })();
  }

  /* ---------- TITLE glitch burst ---------- */
  const title = $('.title');
  function fireGlitch() { if (!title || reduced) return; title.classList.add('fire'); setTimeout(() => title.classList.remove('fire'), 800); }
  if (!reduced) setInterval(fireGlitch, 6000);

  /* ---------- particle helper ---------- */
  function particleField(canvas, { density, up = false, colors, sizeMax = 2, alphaBase = 0.35 }) {
    const ctx = canvas.getContext('2d');
    let W, H, ps = [];
    const make = () => ({
      x: Math.random() * W, y: Math.random() * H,
      r: Math.random() * sizeMax + 0.6,
      vx: (Math.random() - 0.5) * 0.22,
      vy: up ? -(Math.random() * 0.35 + 0.1) : (Math.random() - 0.5) * 0.25,
      ph: Math.random() * Math.PI * 2,
      c: colors[(Math.random() * colors.length) | 0]
    });
    const resize = () => {
      W = canvas.width = canvas.offsetWidth; H = canvas.height = canvas.offsetHeight;
      ps = Array.from({ length: Math.round(W * H / density) }, make);
    };
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      for (const f of ps) {
        f.x += f.vx; f.y += f.vy; f.ph += 0.05;
        if (f.y < -4) { f.y = H + 4; f.x = Math.random() * W; }
        if (f.y > H + 4) f.y = -4;
        if (f.x < 0) f.x = W; if (f.x > W) f.x = 0;
        const s = Math.max(1, Math.round(f.r * 2));
        ctx.globalAlpha = alphaBase + Math.sin(f.ph) * 0.3;
        ctx.fillStyle = f.c; ctx.shadowBlur = 8; ctx.shadowColor = f.c;
        ctx.fillRect(Math.round(f.x), Math.round(f.y), s, s);
      }
      ctx.globalAlpha = 1; ctx.shadowBlur = 0;
      requestAnimationFrame(draw);
    };
    resize(); draw(); addEventListener('resize', resize);
  }
  if (!reduced) {
    const ff = $('#fireflies'); if (ff) particleField(ff, { density: 9000, colors: ['#c6ff3a', '#c6ff3a', '#b99bff'], sizeMax: 1.6, alphaBase: 0.4 });
    const sp = $('#spores');   if (sp) particleField(sp, { density: 42000, up: true, colors: ['#9bdb2d', '#7c4dff', '#c6ff3a'], sizeMax: 1.4, alphaBase: 0.16 });
  }

  /* ---------- TYPEWRITER dialog ---------- */
  const dlg = $('#dialogText');
  const lore = "Welcome, traveler. You smell of fresh coin... good. " +
    "Deep in these woods we built a market the daylight forgot. " +
    "Every stall hides a secret. Every goblin keeps a grudge. " +
    "Trade wisely, keep your torch lit — and never, ever turn your back on a goblin holding a deal. Heheh.";
  let typed = false;
  function typeIt() {
    if (typed || !dlg) return; typed = true;
    if (reduced) { dlg.textContent = lore; return; }
    let i = 0;
    (function run() {
      dlg.innerHTML = lore.slice(0, i) + '<span class="cur">_</span>';
      if (i % 3 === 0) Sound.blip();
      i++;
      if (i <= lore.length) setTimeout(run, 22); else dlg.innerHTML = lore;
    })();
  }

  /* ---------- COUNTERS ---------- */
  const fmt = n => n.toLocaleString('en-US');
  function countUp(el) {
    const target = +el.dataset.count;
    if (reduced) { el.textContent = fmt(target); return; }
    const dur = 1400, t0 = performance.now();
    (function step(now) {
      const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      el.textContent = fmt(Math.round(target * e));
      if (k < 1) requestAnimationFrame(step);
    })(performance.now());
  }

  /* ---------- SCROLL REVEAL + triggers + stagger ---------- */
  const reveals = $$('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        const t = en.target;
        // stagger inside grids / lists
        if (t.classList.contains('stall')) t.style.transitionDelay = (index(t, '.stall') % 9) * 0.07 + 's';
        if (t.classList.contains('quest')) t.style.transitionDelay = index(t, '.quest') * 0.1 + 's';
        t.classList.add('in');
        if (t.classList.contains('dialog')) typeIt();
        if (t.classList.contains('lore-stats')) $$('b[data-count]', t).forEach(countUp);
        if (t.classList.contains('section-head')) { const h = $('.h2', t); if (h) glitchEl(h); }
        io.unobserve(t);
      });
    }, { threshold: 0.16 });
    reveals.forEach(r => io.observe(r));
    // quest connector draw
    const quests = $('.quests');
    if (quests) {
      const qo = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { quests.classList.add('drawn'); qo.disconnect(); } }), { threshold: 0.2 });
      qo.observe(quests);
    }
  } else {
    reveals.forEach(r => r.classList.add('in')); typeIt();
  }
  function index(el, sel) { return $$(sel).indexOf(el); }
  function glitchEl(el) { if (reduced) return; el.classList.add('slam'); setTimeout(() => el.classList.remove('slam'), 500); }

  /* ---------- PARALLAX (hero layers, goblin, eyes, title fade) ---------- */
  const layers = $$('.forest .layer[data-depth]');
  const goblin = $('#goblin'), heroContent = $('.hero-content'), hero = $('.hero');
  let mpx = 0, mpy = 0;
  if (!reduced) addEventListener('mousemove', e => { mpx = e.clientX / innerWidth - 0.5; mpy = e.clientY / innerHeight - 0.5; });
  function para(now) {
    const sc = scrollY;
    for (const l of layers) { const d = +l.dataset.depth; l.style.transform = `translate(${mpx * d * 60}px,${sc * d * 0.4}px)`; }
    if (goblin) { const bob = reduced ? 0 : Math.sin(now / 700) * 8; goblin.style.transform = `translate(${mpx * 22}px,${sc * 0.12 - mpy * 12 + bob}px)`; }
    if (eyeTrack && !reduced) eyeTrack.style.transform = `translate(${mpx * 9}px,${mpy * 5}px)`;
    if (heroContent && hero) {
      const k = Math.min(1, sc / (innerHeight * 0.8));
      heroContent.style.opacity = String(1 - k * 1.1);
      heroContent.style.transform = `translateY(${-sc * 0.15}px)`;
    }
    requestAnimationFrame(para);
  }
  if (hero) requestAnimationFrame(para);

  /* ---------- SMOOTH SCROLL (Lenis) ---------- */
  if (window.Lenis && !reduced) {
    const lenis = new Lenis({ duration: 1.1, smoothWheel: true });
    (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })();
    $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      const t = id === '#top' ? document.body : $(id);
      if (t) { e.preventDefault(); lenis.scrollTo(t, { offset: -10 }); }
    }));
  }
})();
