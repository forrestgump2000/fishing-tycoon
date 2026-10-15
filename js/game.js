/* Fishing Tycoon — game loop, fishing mechanics, UI. */
(function () {
  'use strict';
  const { RARITIES, FABLED, LOCATIONS, RODS, BAITS, SPECIES, BY_ID, POOLS, GLOBAL, rollCatch, catchValue, fabledChance, fishBait, NETS, NET_COOLDOWN } = window.FT;
  const Art = window.Art;
  const $ = (s) => document.querySelector(s);
  const cv = $('#game'), ctx = cv.getContext('2d');
  let W = 0, H = 0, DPR = 1, K = 1;

  // ---------------- formatting ----------------
  const SUF = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi'];
  function money(v) {
    if (v < 10) return '$' + v.toFixed(2);
    if (v < 1000) return '$' + Math.floor(v);
    let i = 0; while (v >= 1000 && i < SUF.length - 1) { v /= 1000; i++; }
    return '$' + (v < 100 ? v.toFixed(v < 10 ? 2 : 1) : Math.floor(v)) + SUF[i];
  }
  function kgs(k) { return k < 1 ? Math.max(1, Math.round(k * 1000)) + ' g' : k < 1000 ? (k < 10 ? k.toFixed(2) : k.toFixed(1)) + ' kg' : (k / 1000).toFixed(k < 10000 ? 2 : 1) + ' t'; }
  function meters(m) { return m < 1000 ? (m < 10 ? m.toFixed(1) : Math.round(m)) + ' m' : (m / 1000).toFixed(m < 10000 ? 2 : 1) + ' km'; }
  function rtag(r) { const R = RARITIES[r]; return '<span class="rtag" style="background:' + R.color + '">' + R.name + '</span>'; }
  function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  // ---------------- save state ----------------
  const SAVE_KEY = 'fishing-tycoon-save-v1';
  function fresh() { return { money: 0, rod: 0, bait: 0, loc: 0, rods: [0], baits: [0], locs: [0], bucket: [], dex: {}, stats: { casts: 0, catches: 0, earned: 0, fabled: 0, snaps: 0, best: null }, sound: true, quick: true, tut: true, fishBait: null, completions: 0, completeSeen: false, nets: [], net: -1, netReady: 0 }; }
  function load() {
    try { const raw = localStorage.getItem(SAVE_KEY); if (raw) { const s = Object.assign(fresh(), JSON.parse(raw)); s.bucket = s.bucket.filter((b) => BY_ID[b.id]); return s; } } catch (e) { /* no storage */ }
    return fresh();
  }
  let S = load();
  function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } }

  // ---------------- sound ----------------
  const Snd = (() => {
    let ac = null;
    function A() { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; } } if (ac && ac.state === 'suspended') ac.resume(); return ac; }
    function tone(f, d, type, vol, slide, delay) {
      if (!S.sound) return; const a = A(); if (!a) return;
      const t = a.currentTime + (delay || 0), o = a.createOscillator(), g = a.createGain();
      o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
      g.gain.setValueAtTime(vol || 0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
      o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + d + 0.05);
    }
    function noise(d, vol, freq) {
      if (!S.sound) return; const a = A(); if (!a) return;
      const n = Math.floor(a.sampleRate * d), buf = a.createBuffer(1, n, a.sampleRate), ch = buf.getChannelData(0);
      for (let i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / n);
      const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
      f.type = 'bandpass'; f.frequency.value = freq || 800; g.gain.value = vol || 0.2;
      src.buffer = buf; src.connect(f); f.connect(g); g.connect(a.destination); src.start();
    }
    const notes = [523, 659, 784, 1047, 1319, 1568, 2093, 2637];
    return {
      unlock: A,
      whoosh() { noise(0.25, 0.12, 1500); },
      splash() { noise(0.4, 0.3, 700); tone(180, 0.2, 'sine', 0.1, -80); },
      bite() { tone(880, 0.08, 'square', 0.07); tone(1175, 0.1, 'square', 0.07, 0, 0.1); },
      tick() { tone(250 + Math.random() * 120, 0.03, 'triangle', 0.035); },
      catch(r) { const n = Math.min(8, 3 + r); for (let i = 0; i < n; i++) tone(notes[i], 0.2, 'triangle', 0.11, 0, i * 0.075); if (r >= 4) for (let i = 0; i < 4; i++) tone(notes[7 - i] * 0.5, 0.35, 'sine', 0.06, 0, 0.6 + i * 0.1); },
      fail() { tone(392, 0.25, 'sawtooth', 0.06, -120); tone(262, 0.4, 'sawtooth', 0.06, -100, 0.22); },
      snap() { noise(0.12, 0.35, 3500); tone(600, 0.35, 'square', 0.05, -450); },
      cash() { tone(1318, 0.07, 'square', 0.06); tone(1760, 0.16, 'square', 0.06, 0, 0.07); },
      click() { tone(660, 0.04, 'triangle', 0.06); },
      fabled() { for (let i = 0; i < 12; i++) tone(notes[i % 8] * (i >= 8 ? 2 : 1), 0.3, 'sine', 0.09, 0, i * 0.09); }
    };
  })();

  // ---------------- world ----------------
  let L, waterPx, ppm, critters = [], particles = [];
  const CRAWL = new Set(['crab', 'lobster', 'starfish', 'snail', 'urchin', 'sponge', 'coral', 'barnacle', 'seaspider']);
  const STATIC = new Set(['coral', 'sponge', 'barnacle']);
  function sizeFor(sp) {
    if (sp.arch === 'plankton') return 26 * K;
    const base = sp.rarity === FABLED ? 120 : 24 + Math.log10(sp.kg * 1000 + 1) * 17;
    return Math.min(190, Math.max(24, base)) * K;
  }
  function pickRar(list) {
    let tot = 0; for (const s of list) tot += RARITIES[s.rarity].w;
    let r = Math.random() * tot; for (const s of list) { r -= RARITIES[s.rarity].w; if (r <= 0) return s; } return list[0];
  }
  function newCritter(initial) {
    const shallow = Math.random() < 0.4;
    let sp = Math.random() < 0.07 ? pickRar(GLOBAL.plankton) : pickRar(shallow ? POOLS[S.loc].filter((s) => s.depth <= 0.15) : POOLS[S.loc]);
    const size = sizeFor(sp), crawl = CRAWL.has(sp.arch);
    const dir = Math.random() < 0.5 ? 1 : -1;
    let y;
    if (crawl) y = waterPx - size * 0.3 - 4;
    else if (shallow) y = 30 + Math.random() * Math.min(waterPx * 0.5, H * 0.45);
    else { const lo = Math.max(30, sp.depth * waterPx), hi = Math.min(waterPx - 50, lo + 0.3 * waterPx + 80); y = lo + Math.random() * Math.max(10, hi - lo); }
    const x = initial ? Math.random() * W : (dir > 0 ? -size - 40 : W + size + 40);
    return { sp, size, x, y, dir, crawl, still: STATIC.has(sp.arch), speed: crawl ? 10 + Math.random() * 15 : (25 + Math.random() * 45) * sp.art.ms, t0: Math.random() * 100 };
  }
  function setupLoc() {
    L = LOCATIONS[S.loc];
    waterPx = Math.round(650 + Math.log10(L.maxDepth / 10) * 900);
    ppm = waterPx / L.maxDepth;
    critters = []; const n = Math.round(12 + waterPx / 140);
    for (let i = 0; i < n; i++) critters.push(newCritter(true));
    particles = [];
    resetPhase();
    cam.y = cam.target = -H * 0.47;
  }

  // ---------------- phases ----------------
  const cam = { y: 0, target: 0 };
  let phase = 'idle', P = {}, time = 0, holding = false;
  function resetPhase() { phase = 'idle'; P = {}; holding = false; if (typeof pressed !== 'undefined') pressed.clear(); }
  function fisherX() { return Math.max(110 * K, Math.min(W * 0.2, 260)); }
  function maxCast() { return Math.min(RODS[S.rod].depth, L.maxDepth); }
  function surfY() { return -cam.y; }

  function startCharge() { phase = 'charge'; P = { p: 0, dir: 1 }; if (S.tut) { S.tut = false; $('#hint').classList.add('hidden'); save(); } }
  function releaseCast() {
    const p = Math.max(0.08, P.p);
    const fx = fisherX();
    const tx = fx + 90 * K + p * Math.max(60, W - fx - 200 * K);
    phase = 'cast'; P = { p, t: 0, dur: 0.55 + p * 0.25, tx, depth: Math.max(0.3, p * maxCast()) };
    S.stats.casts++;
    Snd.whoosh();
  }
  function rand(a, b) { return a + Math.random() * (b - a); }

  let frenzy = null;
  function overlayOpen() { return !$('#modal').classList.contains('hidden') || !$('#card').classList.contains('hidden'); }
  function startFrenzy(sp) {
    const fz = sp.frenzy;
    if (frenzy && frenzy.mult > fz.mult) { frenzy.t += fz.secs * 0.5; frenzy.dur = Math.max(frenzy.dur, frenzy.t); toast('⚡ Frenzy extended!', 'gold'); return; }
    if (frenzy && frenzy.mult === fz.mult) { frenzy.t += fz.secs; frenzy.dur = frenzy.t; }
    else frenzy = { mult: fz.mult, t: fz.secs, dur: fz.secs, name: sp.name };
    toast('⚡ ' + fz.mult + '× MONEY FRENZY for ' + Math.round(frenzy.t) + ' seconds! Catch fast!', 'gold', 4000);
    Snd.fabled();
  }
  function updateFrenzy(dt) {
    const el = $('#frenzy');
    if (!frenzy) { if (!el.classList.contains('hidden')) el.classList.add('hidden'); return; }
    if (!overlayOpen()) frenzy.t -= dt;
    if (frenzy.t <= 0) { frenzy = null; el.classList.add('hidden'); toast('The frenzy is over.', ''); return; }
    el.classList.remove('hidden');
    el.dataset.tier = frenzy.mult >= 1000 ? 'mega' : frenzy.mult >= 50 ? 'big' : '';
    $('#frenzyText').textContent = '⚡ ' + frenzy.mult + '× FRENZY · ' + Math.ceil(frenzy.t) + 's';
    $('#frenzyBar').style.width = (frenzy.t / frenzy.dur * 100) + '%';
  }

  function update(dt) {
    time += dt;
    updateFrenzy(dt);
    const sy = surfY();
    // camera
    if (phase === 'sink' || phase === 'wait' || phase === 'bite' || phase === 'reel' || phase === 'retrieve' || phase === 'land' || (phase === 'net' && P.stage !== 'fly')) {
      const hy = P.hookY || 0;
      cam.target = Math.max(-H * 0.47, Math.min(waterPx + 80 - H, hy - H * 0.5));
    } else cam.target = -H * 0.47;
    cam.y += (cam.target - cam.y) * Math.min(1, dt * 4);

    // critters
    for (let i = 0; i < critters.length; i++) {
      const c = critters[i];
      if (c.still) continue;
      const m = Art.motion(c.sp.art, time + c.t0);
      c.x += c.dir * c.speed * (c.crawl ? 1 : m.sp) * dt * K;
      if (c.x < -c.size - 60 || c.x > W + c.size + 60) critters[i] = newCritter(false);
    }
    // particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]; p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.g || 0) * dt;
      if (p.t > p.life) particles.splice(i, 1);
    }

    switch (phase) {
      case 'charge': P.p += P.dir * dt * 0.85; if (P.p >= 1) { P.p = 1; P.dir = -1; } if (P.p <= 0) { P.p = 0; P.dir = 1; } break;
      case 'cast':
        P.t += dt;
        if (P.t >= P.dur) {
          phase = 'sink'; P.hookY = 0; P.targetY = P.depth * ppm; P.x = P.tx;
          Snd.splash(); splash(P.x, 0);
        }
        break;
      case 'sink': {
        const sp = Math.max(160, P.targetY / 1.6) * dt;
        P.hookY = Math.min(P.targetY, P.hookY + sp);
        if (Math.random() < dt * 6) bubble(P.x, P.hookY);
        if (P.hookY >= P.targetY) {
          phase = 'wait';
          const fb = S.fishBait;
          P.catch = rollCatch(S.loc, S.rod, S.bait, P.depth, null, fb ? { luck: fb.luck, deep: fb.deep } : null);
          if (fb && --fb.casts <= 0) { S.fishBait = null; toast('🐟 Your ' + esc(BY_ID[fb.id].name) + ' bait got eaten up!', ''); }
          updateHUD(); save();
          P.wait = rand(1.4, 4.5) * BAITS[S.bait].bite;
          P.wt = 0;
          const sz = sizeFor(P.catch.sp);
          P.biter = { size: sz, dir: Math.random() < 0.5 ? 1 : -1 };
          P.biter.x = P.biter.dir > 0 ? -sz - 50 : W + sz + 50;
        }
        break;
      }
      case 'wait': {
        P.wt += dt;
        const b = P.biter, mouthOff = b.size * 0.45;
        const goal = P.x - b.dir * mouthOff;
        const remain = P.wait - P.wt;
        if (remain < 1.8) b.x += (goal - b.x) * Math.min(1, dt * 3.2);
        if (remain <= 0) { phase = 'bite'; P.bt = 0; P.window = 1.05 + 0.35 * (S.bait / 44); Snd.bite(); for (let i = 0; i < 6; i++) bubble(P.x, P.hookY); }
        break;
      }
      case 'bite':
        P.bt += dt;
        if (P.bt > P.window) { fail('Too slow! It spat out the hook.'); }
        break;
      case 'reel': reelUpdate(dt); break;
      case 'land':
        P.hookY = Math.max(0, P.hookY - Math.max(400, P.hookY * 2.2) * dt);
        if (P.hookY <= 0) { phase = 'leap'; P.lt = 0; splash(P.x, 0); Snd.splash(); }
        break;
      case 'leap':
        P.lt += dt;
        if (P.lt > 0.75) landed();
        break;
      case 'retrieve':
        P.hookY = Math.max(0, P.hookY - Math.max(350, P.hookY * 2.5) * dt);
        if (P.hookY <= 0) resetPhase();
        break;
      case 'net': netUpdate(dt); break;
    }
    updateNetButton();
    void sy;
  }

  // ---------------- nets ----------------
  function netCooldown() { return Math.max(0, (S.netReady - Date.now()) / 1000); }
  let netBtnText = '';
  function updateNetButton() {
    const b = $('#netBtn');
    if (S.net < 0) { if (!b.classList.contains('hidden')) b.classList.add('hidden'); return; }
    b.classList.remove('hidden');
    const cd = netCooldown(), txt = cd > 0 ? '⏳ ' + Math.ceil(cd) + 's' : '🕸️ Net ×' + NETS[S.net].size;
    if (txt !== netBtnText) { netBtnText = txt; $('#netLabel').textContent = txt; }
    b.disabled = cd > 0 || phase !== 'idle';
  }
  function throwNet() {
    if (S.net < 0 || phase !== 'idle' || netCooldown() > 0) return;
    Snd.unlock(); Snd.whoosh();
    const fx = fisherX(), tx = fx + 90 * K + rand(0.35, 0.8) * Math.max(60, W - fx - 200 * K);
    const depth = Math.max(0.5, maxCast() * rand(0.55, 1));
    phase = 'net'; P = { stage: 'fly', t: 0, dur: 0.7, tx, x: tx, depth, hookY: 0, targetY: depth * ppm, haul: null };
    S.netReady = Date.now() + NET_COOLDOWN * 1000; S.stats.nets = (S.stats.nets || 0) + 1; save();
  }
  function rollHaul() {
    const n = NETS[S.net].size, out = [];
    for (let i = 0; i < n; i++) {
      let c;
      for (let k = 0; k < 6; k++) { c = rollCatch(S.loc, S.rod, S.bait, P.depth * rand(0.3, 1)); if (c.sp.rarity !== FABLED || c.sp.frenzy) break; }
      if (c.sp.rarity === FABLED && !c.sp.frenzy) c = { sp: GLOBAL.junk[0], kg: GLOBAL.junk[0].kg };
      out.push(c);
    }
    return out;
  }
  function netUpdate(dt) {
    if (P.stage === 'fly') { P.t += dt; if (P.t >= P.dur) { P.stage = 'sink'; splash(P.x, 0); Snd.splash(); } }
    else if (P.stage === 'sink') {
      P.hookY = Math.min(P.targetY, P.hookY + Math.max(180, P.targetY / 1.4) * dt);
      if (Math.random() < dt * 10) bubble(P.x + rand(-30, 30), P.hookY);
      if (P.hookY >= P.targetY) { P.stage = 'wait'; P.t = 0; P.haul = rollHaul(); }
    } else if (P.stage === 'wait') { P.t += dt; if (Math.random() < dt * 20) Snd.tick(); if (P.t > 1.1) { P.stage = 'rise'; Snd.bite(); } }
    else if (P.stage === 'rise') {
      P.hookY = Math.max(0, P.hookY - Math.max(380, P.hookY * 1.8) * dt);
      if (P.hookY <= 0) { splash(P.x, 0); Snd.splash(); finishHaul(); }
    }
  }
  let pendingHaul = null;
  function finishHaul() {
    const haul = P.haul; resetPhase();
    const frenzies = haul.filter((c) => c.sp.frenzy).length;
    const netMult = frenzies ? 1.5 : 1, fm = frenzy ? frenzy.mult : 1;
    let newCount = 0;
    const items = haul.map(({ sp, kg }) => {
      const v = catchValue(sp, kg, L.tier) * netMult * (sp.frenzy ? 1 : fm);
      if (!S.dex[sp.id]) newCount++;
      const d = S.dex[sp.id] || (S.dex[sp.id] = { n: 0, kg: 0 });
      d.n++; if (kg > d.kg) d.kg = +kg.toFixed(4);
      S.stats.catches++;
      if (!S.stats.best || v > S.stats.best.v) S.stats.best = { id: sp.id, v, kg };
      const it = { id: sp.id, kg: +kg.toFixed(4), v };
      if (netMult * fm > 1) it.fz = +(netMult * (sp.frenzy ? 1 : fm)).toFixed(2);
      return it;
    }).sort((a, b) => b.v - a.v);
    pendingHaul = { items, frenzies, newCount };
    Snd.catch(Math.min(5, Math.max(...items.map((i) => BY_ID[i.id].rarity))));
    if (items.some((i) => BY_ID[i.id].rarity >= 4)) confetti(60);
    save();
    modalKind = 'haul'; modalTab = null; modal.classList.remove('hidden'); renderModal();
  }
  function settleHaul(sell) {
    if (!pendingHaul) return;
    const tot = pendingHaul.items.reduce((a, b) => a + b.v, 0);
    if (sell) { S.money += tot; S.stats.earned += tot; Snd.cash(); toast('💰 Sold the net haul for ' + money(tot), 'good'); }
    else { S.bucket.push(...pendingHaul.items); Snd.click(); toast('🪣 ' + pendingHaul.items.length + ' creatures added to your bucket', 'good'); }
    pendingHaul = null; save(); updateHUD();
  }
  function renderHaul(body) {
    const h = pendingHaul; if (!h) return;
    const tot = h.items.reduce((a, b) => a + b.v, 0);
    body.appendChild(el('p', 'info', '🕸️ You hauled up <b>' + h.items.length + '</b> creatures worth <b>' + money(tot) + '</b>' + (h.newCount ? ' · ' + h.newCount + ' new for your Fishdex!' : '') +
      (h.frenzies ? '<br>⚡ ' + (h.frenzies > 1 ? h.frenzies + ' Frenzy Fish were' : 'A Frenzy Fish was') + ' tangled in the net — every creature in this haul is worth <b>1.5×</b>!' : '')));
    const bar = el('div', 'toolbar');
    const s1 = el('button', 'btn green', 'Sell all ' + money(tot)); s1.onclick = () => { settleHaul(true); closeModal(); };
    const s2 = el('button', 'btn blue', 'Keep all'); s2.onclick = () => { settleHaul(false); closeModal(); };
    bar.appendChild(s1); bar.appendChild(s2); body.appendChild(bar);
    const rows = el('div', 'rows'); body.appendChild(rows);
    h.items.forEach((it) => {
      const sp = BY_ID[it.id], r = el('div', 'row');
      r.appendChild(iconCanvas(sp, 52, 40));
      r.appendChild(el('div', 'nm', esc(sp.name) + ' ' + rtag(sp.rarity) + (S.dex[sp.id].n === 1 ? ' <span class="rtag" style="background:#ff4d5e">NEW</span>' : '') + '<small>' + sp.cat + ' · ' + kgs(it.kg) + (it.fz ? ' · ⚡' + it.fz + '×' : '') + '</small>'));
      r.appendChild(el('div', 'val', money(it.v)));
      rows.appendChild(r);
    });
  }
  function drawNet(x, y, r, haul, open) {
    ctx.save(); ctx.translate(x, y);
    if (haul && !open) {
      haul.slice(0, 25).forEach((c, i) => {
        const a = i * 2.39996, d = Math.sqrt((i + 0.5) / Math.max(haul.length, 1)) * r * 0.7;
        ctx.save(); ctx.translate(Math.cos(a) * d, r * 0.2 + Math.sin(a) * d * 0.8); ctx.rotate(Math.sin(time * 6 + i) * 0.4); ctx.scale(i % 2 ? -1 : 1, 1);
        Art.creature(ctx, c.sp, Math.min(r * 0.95, sizeFor(c.sp) * 0.7), time + i, { noFx: true }); ctx.restore();
      });
    }
    const hue = NETS[Math.max(0, S.net)].hue;
    ctx.strokeStyle = 'hsla(' + hue + ',40%,85%,0.9)'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.ellipse(0, open ? 0 : r * 0.2, r, open ? r * 0.35 : r * 0.95, 0, 0, Math.PI * 2); ctx.save(); ctx.clip();
    for (let i = -8; i <= 8; i++) { ctx.beginPath(); ctx.moveTo(i * r * 0.2 - r, -r * 1.2); ctx.lineTo(i * r * 0.2 + r, r * 1.4); ctx.stroke(); ctx.beginPath(); ctx.moveTo(i * r * 0.2 + r, -r * 1.2); ctx.lineTo(i * r * 0.2 - r, r * 1.4); ctx.stroke(); }
    ctx.restore();
    ctx.lineWidth = 4 * K; ctx.strokeStyle = 'hsl(' + hue + ',45%,40%)'; ctx.beginPath(); ctx.ellipse(0, open ? 0 : -r * 0.6, r * (open ? 1 : 0.55), r * 0.14, 0, 0, Math.PI * 2); ctx.stroke();
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + time; ctx.fillStyle = '#ff8a1f'; ctx.strokeStyle = '#1d2235'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(Math.cos(a) * r * (open ? 1 : 0.55), (open ? 0 : -r * 0.6) + Math.sin(a) * r * 0.14, 4.5 * K, 0, 6.3); ctx.fill(); ctx.stroke(); }
    ctx.restore();
  }

  function fail(msg, cls) {
    if (P.biter) P.biter.flee = true;
    phase = 'retrieve'; P.fleeT = 0;
    toast(msg, cls || 'bad'); Snd.fail();
  }

  function hookIt() {
    const { sp, kg } = P.catch, rod = RODS[S.rod];
    if (sp.rarity !== FABLED && kg > rod.cap * 1.6) {
      S.stats.snaps++; Snd.snap();
      phase = 'retrieve'; if (P.biter) P.biter.flee = true;
      toast('💥 SNAP! A ' + kgs(kg) + ' monster was too heavy for your rod (holds ' + kgs(rod.cap) + ').', 'bad');
      return;
    }
    const heavy = sp.rarity !== FABLED && kg > rod.cap;
    const r = sp.rarity;
    const diff = Math.min(1, 0.18 + Math.min(r, 5) * 0.1 + (r === FABLED ? 0.45 : 0) + (heavy ? 0.22 : 0));
    phase = 'reel';
    // tug of war: p is how far the green bar has been dragged down the line toward you (0 = at the fish, 1 = landed)
    P.mg = { p: 0.3, pull: (0.36 + rod.reel * 0.55) * (heavy ? 0.75 : 1), base: 0.06 + diff * 0.14, surgeP: 0.3 + diff * 0.4, ten: 0, surge: 0, next: rand(0.6, 1.4), vib: 0, diff, heavy, startY: P.hookY };
    if (heavy) toast('⚠️ Heavy catch! Your line is straining...', 'bad');
  }

  function reelUpdate(dt) {
    const m = P.mg;
    // the fish fights in surges: it thrashes (vibrates) and yanks the line back toward itself
    if (m.surge > 0) { m.surge -= dt; if (m.surge <= 0) m.next = rand(0.7, 2.0) * (1.25 - m.diff * 0.5); }
    else { m.next -= dt; if (m.next <= 0) { m.surge = rand(0.4, 0.8) + m.diff * 0.3; Snd.bite(); } }
    const surging = m.surge > 0;
    m.vib += ((surging ? 1 : 0.15 + m.diff * 0.2) - m.vib) * Math.min(1, dt * 10);
    const w = 0.85 + 0.3 * Math.abs(Math.sin(time * 23));
    // reeling against a thrashing fish builds line tension; let go while it fights, reel while it rests
    if (holding) { m.p += (m.pull - (surging ? m.surgeP : m.base) * w) * dt; m.ten += (surging ? 1.5 : -0.5) * dt; }
    else { m.p -= (surging ? m.surgeP * 0.5 : m.base) * w * dt; m.ten -= dt; }
    m.ten = Math.max(0, m.ten);
    if (holding && Math.random() < dt * 16) Snd.tick();
    if (m.ten >= 1) { S.stats.snaps++; Snd.snap(); fail('💥 SNAP! Too much tension — let go of the reel while the fish thrashes!'); return; }
    P.hookY = m.startY * (1 - Math.max(0, m.p) * 0.55);
    if (m.p >= 1) { phase = 'land'; Snd.catch(P.catch.sp.rarity === FABLED ? 8 : P.catch.sp.rarity); }
    else if (m.p <= 0) fail(m.heavy ? '💥 The line snapped! Try a stronger rod.' : 'It got away! It pulled the line all the way back.');
  }


  function landed() {
    const { sp, kg } = P.catch;
    const fm = frenzy && !sp.frenzy ? frenzy.mult : 1;
    const v = catchValue(sp, kg, L.tier) * fm;
    const isNew = !S.dex[sp.id];
    const d = S.dex[sp.id] || (S.dex[sp.id] = { n: 0, kg: 0 });
    d.n++; if (kg > d.kg) d.kg = +kg.toFixed(4);
    S.stats.catches++;
    if (sp.rarity === FABLED) S.stats.fabled++;
    if (!S.stats.best || v > S.stats.best.v) S.stats.best = { id: sp.id, v, kg };
    const item = { id: sp.id, kg: +kg.toFixed(4), v };
    if (fm > 1) item.fz = fm;
    resetPhase();
    if (sp.frenzy) startFrenzy(sp);
    if (S.quick && !isNew && sp.rarity < 2) {
      S.bucket.push(item);
      toast('+ ' + esc(sp.name) + ' ' + rtag(sp.rarity) + ' ' + kgs(kg) + ' · ' + money(v) + (fm > 1 ? ' <b>(⚡' + fm + '×)</b>' : ''), fm > 1 ? 'gold' : 'good');
    } else {
      showCard(item, isNew);
    }
    if (sp.rarity >= 4) confetti(sp.rarity === FABLED ? 160 : 70);
    updateHUD(); save();
  }

  // ---------------- particles ----------------
  function splash(x, y) { for (let i = 0; i < 22; i++) particles.push({ x, y, vx: rand(-160, 160), vy: rand(-380, -120), g: 900, t: 0, life: rand(0.5, 0.9), kind: 'drop', r: rand(2, 5) }); }
  function bubble(x, y) { particles.push({ x: x + rand(-8, 8), y, vx: rand(-10, 10), vy: rand(-90, -40), g: 0, t: 0, life: rand(0.8, 1.6), kind: 'bubble', r: rand(2, 5) }); }
  function confetti(n) { for (let i = 0; i < n; i++) particles.push({ screen: true, x: W / 2 + rand(-60, 60), y: H * 0.45, vx: rand(-420, 420), vy: rand(-700, -150), g: 650, t: 0, life: rand(1.6, 3), kind: 'conf', r: rand(4, 8), c: 'hsl(' + Math.floor(rand(0, 360)) + ',90%,60%)', rot: rand(0, 6) }); }

  // ---------------- rendering ----------------
  function drawCritter(sp, x, y, size, dir, t, rotExtra) {
    const m = Art.motion(sp.art, t);
    ctx.save();
    ctx.translate(x + m.dx * K, y + m.dy * K);
    ctx.scale(dir, 1);
    ctx.rotate(m.rot + (rotExtra || 0));
    Art.creature(ctx, sp, size, t);
    ctx.restore();
  }

  function render() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const sy = surfY();
    if (sy > 0) Art.backdrop(ctx, L, W, sy, time);
    Art.water(ctx, L, W, H, cam.y, waterPx, time);
    const by = waterPx - cam.y;
    if (by < H + 60) Art.seabed(ctx, L, W, by, time);

    // critters
    for (const c of critters) {
      const y = c.y - cam.y;
      if (y < sy - 10 || y < -c.size || y > H + c.size) continue;
      drawCritter(c.sp, c.x, y, c.size, c.dir, time + c.t0);
    }

    // biter
    const B = P.biter;
    if (B && P.catch && (phase === 'wait' || phase === 'bite' || phase === 'reel' || phase === 'land' || (phase === 'retrieve' && B.flee))) {
      if (phase === 'retrieve') { B.x += (B.dir > 0 ? -1 : 1) * 600 * (1 / 60); B.fleeing = true; }
      let bx = B.x, byy = P.hookY - cam.y, extraRot = 0;
      if (phase === 'reel') { bx = P.x - B.dir * B.size * 0.45 + Math.sin(time * 25) * 6 * K; extraRot = Math.sin(time * 18) * 0.25; }
      if (phase === 'land') { bx = P.x; extraRot = -Math.PI / 2 * B.dir; byy += B.size * 0.4; }
      const fleeDir = phase === 'retrieve' ? -B.dir : B.dir;
      drawCritter(P.catch.sp, bx, byy, B.size, fleeDir, time, extraRot);
    }

    Art.surface(ctx, L, W, sy, time);
    // fisher + rod pose
    let pose = -1.05;
    if (phase === 'charge') pose = -1.05 - P.p * 0.9;
    else if (phase === 'cast') pose = -2.0 + Math.min(1, P.t / 0.18) * 1.55;
    else if (phase === 'bite') pose = -0.6 + Math.sin(time * 30) * 0.08;
    else if (phase === 'reel') pose = -0.75 + (P.mg.surge > 0 ? 0.35 + Math.sin(time * 40) * 0.08 : Math.sin(time * 12) * 0.04);
    else if (phase !== 'idle') pose = -0.55;
    const fx = fisherX();
    const tip = sy > -300 ? Art.fisher(ctx, L, fx, sy, K, time, pose, RODS[S.rod]) : { x: fx + 60 * K, y: sy - 160 * K };

    // line, bobber, hook
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1.5;
    if (phase === 'cast') {
      const q = Math.min(1, P.t / P.dur), bx = tip.x + (P.tx - tip.x) * q, byy = tip.y + (sy - tip.y) * q - Math.sin(q * Math.PI) * 140 * K;
      ctx.beginPath(); ctx.moveTo(tip.x, tip.y); ctx.quadraticCurveTo((tip.x + bx) / 2, Math.min(tip.y, byy) - 20, bx, byy); ctx.stroke();
      Art.bobber(ctx, bx, byy, K, time, false);
    } else if (phase === 'net') {
      const r = 46 * K + Math.min(40, NETS[S.net].size * 1.6) * K;
      if (P.stage === 'fly') {
        const q = Math.min(1, P.t / P.dur), bx = tip.x + (P.tx - tip.x) * q, byy = tip.y + (sy - tip.y) * q - Math.sin(q * Math.PI) * 160 * K;
        ctx.beginPath(); ctx.moveTo(tip.x, tip.y); ctx.lineTo(bx, byy); ctx.stroke();
        drawNet(bx, byy, r * (0.4 + q * 0.6), null, true);
      } else {
        const hy = P.hookY - cam.y;
        ctx.beginPath(); ctx.moveTo(tip.x, tip.y); ctx.quadraticCurveTo((tip.x + P.x) / 2, sy - 10, P.x, sy); ctx.lineTo(P.x, hy - r * 0.6); ctx.stroke();
        drawNet(P.x, hy, r, P.haul, P.stage === 'sink');
      }
    } else if (phase !== 'idle' && phase !== 'charge' && phase !== 'leap') {
      const hy = P.hookY - cam.y;
      ctx.beginPath(); ctx.moveTo(tip.x, tip.y); ctx.quadraticCurveTo((tip.x + P.x) / 2, sy - 10, P.x, sy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(P.x, sy); ctx.lineTo(P.x + Math.sin(time * 2) * 3, hy); ctx.stroke();
      Art.bobber(ctx, P.x, sy, K, time, phase === 'bite' || phase === 'reel');
      if (phase !== 'land' && phase !== 'reel') drawHook(P.x, hy);
    } else if (phase === 'idle' || phase === 'charge') {
      ctx.beginPath(); ctx.moveTo(tip.x, tip.y); ctx.lineTo(tip.x + 2, tip.y + 40 * K); ctx.stroke();
      drawHook(tip.x + 2, tip.y + 46 * K);
    }
    ctx.restore();

    // leap
    if (phase === 'leap') {
      const q = Math.min(1, P.lt / 0.75), sp = P.catch.sp, sz = P.biter.size;
      const x = P.x + (W / 2 - P.x) * q, y = sy - Math.sin(q * Math.PI * 0.9) * 220 * K - (H * 0.15) * q;
      ctx.save(); ctx.translate(x, y); ctx.rotate(-0.5 + q * 6.8); ctx.scale(1 + q * 0.6, 1 + q * 0.6); Art.creature(ctx, sp, sz, time); ctx.restore();
    }

    // particles
    for (const p of particles) {
      const x = p.x, y = p.screen ? p.y : p.y - cam.y, a = 1 - p.t / p.life;
      ctx.globalAlpha = Math.max(0, a);
      if (p.kind === 'drop') { ctx.fillStyle = '#e8f8ff'; ctx.beginPath(); ctx.arc(x, y, p.r, 0, 6.3); ctx.fill(); }
      else if (p.kind === 'bubble') { ctx.strokeStyle = 'rgba(230,250,255,0.9)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, p.r, 0, 6.3); ctx.stroke(); }
      else { ctx.save(); ctx.translate(x, y); ctx.rotate(p.rot + p.t * 8); ctx.fillStyle = p.c; ctx.fillRect(-p.r, -p.r * 0.4, p.r * 2, p.r * 0.8); ctx.restore(); }
    }
    ctx.globalAlpha = 1;

    drawGauge(sy);
    if (phase === 'charge') drawPower(fx, sy);
    if (phase === 'bite') drawBang(P.x, sy);
    if (phase === 'reel') drawReel();
  }

  function drawHook(x, y) {
    if (!S.fishBait) { Art.hook(ctx, x, y, K, BAITS[S.bait]); return; }
    Art.hook(ctx, x, y, K, null);
    ctx.save(); ctx.translate(x - 4 * K, y + 10 * K); ctx.rotate(Math.PI / 2 + Math.sin(time * 4) * 0.2); Art.creature(ctx, BY_ID[S.fishBait.id], 22 * K, time, { noFx: true }); ctx.restore();
  }

  function drawGauge(sy) {
    const x = 14, top = Math.max(110, Math.min(H * 0.6, sy + 40)), h = Math.min(H - top - 110, 320), w = 16;
    if (h < 60) return;
    ctx.save(); ctx.lineWidth = 3; ctx.strokeStyle = '#1d2235';
    const g = ctx.createLinearGradient(0, top, 0, top + h); g.addColorStop(0, Art.THEMES[L.theme].water[0]); g.addColorStop(1, Art.THEMES[L.theme].water[1]);
    ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, top, w, h, 8) : ctx.rect(x, top, w, h); ctx.fill(); ctx.stroke();
    const ry = top + h * Math.min(1, RODS[S.rod].depth / L.maxDepth);
    ctx.setLineDash([4, 3]); ctx.strokeStyle = '#ffd23f'; ctx.beginPath(); ctx.moveTo(x - 4, ry); ctx.lineTo(x + w + 4, ry); ctx.stroke(); ctx.setLineDash([]);
    ctx.font = '800 11px Nunito, sans-serif'; ctx.fillStyle = '#fff'; ctx.strokeStyle = '#1d2235'; ctx.lineWidth = 3;
    const lab = (s, y) => { ctx.strokeText(s, x + w + 6, y + 4); ctx.fillText(s, x + w + 6, y + 4); };
    lab('0 m', top); lab(meters(L.maxDepth), top + h);
    if (RODS[S.rod].depth < L.maxDepth) lab('rod ' + meters(RODS[S.rod].depth), ry);
    if (P.hookY != null && phase !== 'idle') {
      const d = P.hookY / ppm, hy = top + h * Math.min(1, d / L.maxDepth);
      ctx.fillStyle = '#ff3b3b'; ctx.strokeStyle = '#1d2235'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x + w / 2, hy, 7, 0, 6.3); ctx.fill(); ctx.stroke();
      ctx.font = '900 13px Nunito, sans-serif'; ctx.fillStyle = '#fff'; ctx.lineWidth = 3; ctx.strokeText(meters(d), x + w + 6, hy - 10); ctx.fillText(meters(d), x + w + 6, hy - 10);
    }
    ctx.restore();
  }

  function drawPower(fx, sy) {
    const w = 150 * K, h = 18 * K, x = Math.max(8, fx - w / 2 + 20 * K), y = sy - 200 * K;
    ctx.save(); ctx.lineWidth = 3; ctx.strokeStyle = '#1d2235';
    ctx.fillStyle = '#fff8e7'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, 9) : ctx.rect(x, y, w, h); ctx.fill(); ctx.stroke();
    const g = ctx.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, '#3fbf4f'); g.addColorStop(0.6, '#ffd23f'); g.addColorStop(1, '#ff4d5e');
    ctx.fillStyle = g; ctx.fillRect(x + 3, y + 3, (w - 6) * P.p, h - 6);
    ctx.font = "900 " + Math.round(14 * K + 2) + "px Nunito, sans-serif"; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.lineWidth = 4;
    const d = Math.max(0.3, P.p * maxCast()), fr = d / L.maxDepth;
    const zone = fr < 0.25 ? ['Shallows', '#bff6ff'] : fr < 0.5 ? ['Mid-water ★', '#8fe36b'] : fr < 0.75 ? ['Deep water ★★', '#ffd23f'] : ['The Abyss ★★★', '#ff9a8a'];
    const s = 'Depth ' + meters(d);
    ctx.strokeText(s, x + w / 2, y - 30 * K); ctx.fillText(s, x + w / 2, y - 30 * K);
    ctx.fillStyle = zone[1]; ctx.strokeText(zone[0], x + w / 2, y - 8); ctx.fillText(zone[0], x + w / 2, y - 8);
    ctx.restore();
  }

  function drawBang(x, sy) {
    const s = 1 + Math.sin(time * 20) * 0.12;
    ctx.save(); ctx.translate(x, sy - 60 * K); ctx.scale(s, s);
    ctx.fillStyle = '#ffd23f'; ctx.strokeStyle = '#1d2235'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(0, 0, 28 * K, 0, 6.3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#1d2235'; ctx.font = "900 " + Math.round(40 * K) + "px 'Lilita One', sans-serif"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('!', 0, 2);
    ctx.restore();
    ctx.save(); ctx.font = "900 " + Math.round(22 * K + 4) + "px 'Lilita One', sans-serif"; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.strokeStyle = '#1d2235'; ctx.lineWidth = 5;
    const ty = Math.min(H * 0.3, sy - 110 * K) ; ctx.strokeText('TAP NOW!', W / 2, Math.max(120, ty)); ctx.fillText('TAP NOW!', W / 2, Math.max(120, ty));
    const q = 1 - P.bt / P.window; ctx.fillStyle = '#ff4d5e'; ctx.fillRect(W / 2 - 60, Math.max(120, ty) + 10, 120 * q, 8); ctx.strokeRect(W / 2 - 60, Math.max(120, ty) + 10, 120, 8);
    ctx.restore();
  }

  function drawReel() {
    const m = P.mg, surging = m.surge > 0;
    const pw = Math.min(W - 24, 600), ph = 96, px = (W - pw) / 2, py = H - ph - (W < 600 ? 100 : 92);
    const x0 = px + 62, x1 = px + pw - 84, ly = py + ph * 0.58;
    ctx.save(); ctx.lineWidth = 4; ctx.strokeStyle = '#1d2235';
    ctx.fillStyle = 'rgba(255,248,231,0.95)'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(px, py, pw, ph, 18) : ctx.rect(px, py, pw, ph); ctx.fill(); ctx.stroke();
    // title
    ctx.font = "900 " + (W < 600 ? 17 : 20) + "px 'Lilita One', sans-serif"; ctx.textAlign = 'center'; ctx.lineWidth = 5; ctx.lineJoin = 'round';
    const msg = surging ? (holding ? '⚠️ LET GO! IT\'S THRASHING!' : '🐟 IT\'S PULLING… WAIT!') : holding ? 'REELING IN!' : 'HOLD TO REEL!';
    ctx.strokeStyle = '#1d2235'; ctx.fillStyle = surging ? '#ff4d5e' : '#fff'; ctx.strokeText(msg, W / 2, py + 22); ctx.fillText(msg, W / 2, py + 22);
    // track: wavy line that thrashes while the fish fights
    const fx = x1 + 40 + (Math.random() - 0.5) * 10 * m.vib, fy = ly + (Math.random() - 0.5) * 10 * m.vib;
    ctx.lineWidth = 10; ctx.strokeStyle = '#c9b48a'; ctx.beginPath(); ctx.moveTo(x0, ly); ctx.lineTo(x1, ly); ctx.stroke();
    const bx = x1 - Math.max(0, Math.min(1, m.p)) * (x1 - x0);
    const g = ctx.createLinearGradient(bx, 0, x1, 0); g.addColorStop(0, '#3fbf4f'); g.addColorStop(1, 'rgba(63,191,79,0.25)');
    ctx.strokeStyle = g; ctx.beginPath(); ctx.moveTo(bx, ly); ctx.lineTo(x1, ly); ctx.stroke();
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.beginPath();
    for (let i = 0; i <= 40; i++) { const q = i / 40, x = x0 + (fx - 18 - x0) * q; ctx.lineTo(x, ly + Math.sin(q * 30 + time * 40) * 3.5 * m.vib * q); }
    ctx.stroke();
    // your end: finish flag
    ctx.fillStyle = '#ffcf9e'; ctx.strokeStyle = '#1d2235'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(px + 32, ly, 18, 0, 6.3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#6b7a3a'; ctx.beginPath(); ctx.ellipse(px + 32, ly - 13, 22, 5, 0, 0, 6.3); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(px + 20, ly - 14); ctx.quadraticCurveTo(px + 20, ly - 32, px + 32, ly - 32); ctx.quadraticCurveTo(px + 44, ly - 32, px + 44, ly - 14); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#1d2235'; ctx.beginPath(); ctx.arc(px + 37, ly - 2, 2.5, 0, 6.3); ctx.arc(px + 28, ly - 2, 2.5, 0, 6.3); ctx.fill();
    ctx.setLineDash([4, 4]); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x0, ly - 22); ctx.lineTo(x0, ly + 22); ctx.stroke(); ctx.setLineDash([]);
    // green bar
    const jx = (Math.random() - 0.5) * 7 * m.vib;
    ctx.save(); ctx.translate(bx + jx, ly);
    ctx.shadowColor = 'rgba(63,255,90,0.8)'; ctx.shadowBlur = holding ? 16 : 6;
    ctx.fillStyle = '#3fbf4f'; ctx.strokeStyle = '#1d2235'; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-22, -15, 44, 30, 9) : ctx.rect(-22, -15, 44, 30); ctx.fill(); ctx.shadowBlur = 0; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = "900 15px 'Lilita One', sans-serif"; ctx.textBaseline = 'middle'; ctx.fillText('◀◀', 0, 1);
    ctx.restore();
    // the fish, vibrating and pulling
    const sp = P.catch.sp;
    ctx.save(); ctx.translate(fx, fy); ctx.rotate((Math.random() - 0.5) * 0.5 * m.vib); ctx.scale(-1, 1);
    if (surging) { ctx.fillStyle = 'rgba(255,77,94,0.35)'; ctx.beginPath(); ctx.arc(0, 0, 32, 0, 6.3); ctx.fill(); }
    Art.creature(ctx, sp, 56, time * (1 + m.vib * 3), { noFx: true });
    ctx.restore();
    // line tension meter
    const tw = Math.min(160, pw * 0.3), tx = px + pw - tw - 14, ty = py + ph - 16;
    ctx.fillStyle = '#1d2235'; ctx.font = "900 11px Nunito, sans-serif"; ctx.textAlign = 'right'; ctx.fillText('LINE TENSION', tx - 6, ty + 5);
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#1d2235'; ctx.lineWidth = 2; ctx.fillRect(tx, ty - 3, tw, 10); ctx.strokeRect(tx, ty - 3, tw, 10);
    ctx.fillStyle = m.ten > 0.66 ? '#ff4d5e' : m.ten > 0.33 ? '#ffb534' : '#3fbf4f'; ctx.fillRect(tx + 1, ty - 2, (tw - 2) * Math.min(1, m.ten), 8);
    if (m.heavy) { ctx.font = "900 13px 'Lilita One', sans-serif"; ctx.fillStyle = '#ff4d5e'; ctx.textAlign = 'right'; ctx.fillText('HEAVY!', px + pw - 12, py + 20); }
    ctx.restore();
  }

  // ---------------- loop ----------------
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    update(dt); render();
    if (!$('#card').classList.contains('hidden')) drawCard();
    requestAnimationFrame(frame);
  }

  // ---------------- input ----------------
  // Every finger / mouse button / Space press currently held. "holding" is true while any is down, so a
  // lost or cancelled event on one finger can never leave the reel stuck on.
  var pressed = new Set();
  function setHolding() { holding = pressed.size > 0; }
  function down(e) {
    Snd.unlock();
    if (e && e.target !== cv) return;
    pressed.add(e ? 'p' + e.pointerId : 'key');
    setHolding();
    if (phase === 'idle') startCharge();
    else if (phase === 'bite') hookIt();
    else if (phase === 'reel') { if (P.mg.surge > 0) P.mg.ten += 0.08; else P.mg.p += 0.025; }
  }
  function release(id) {
    if (id == null) pressed.clear(); else pressed.delete(id);
    setHolding();
    if (!holding && phase === 'charge') releaseCast();
  }
  function up() { release(null); }
  cv.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    try { cv.setPointerCapture(e.pointerId); } catch (err) { /* not supported */ }
    down(e);
  });
  const ptrUp = (e) => release('p' + e.pointerId);
  for (const t of [cv, window]) { t.addEventListener('pointerup', ptrUp); t.addEventListener('pointercancel', ptrUp); }
  cv.addEventListener('lostpointercapture', ptrUp);
  // touch fallbacks: when the last finger leaves the screen, nothing is held
  const touchEnd = (e) => { if (!e.touches || e.touches.length === 0) { for (const id of Array.from(pressed)) if (id !== 'key') pressed.delete(id); setHolding(); if (!holding && phase === 'charge') releaseCast(); } };
  document.addEventListener('touchend', touchEnd, { passive: true });
  document.addEventListener('touchcancel', touchEnd, { passive: true });
  cv.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('blur', up);
  document.addEventListener('visibilitychange', () => { if (document.hidden) up(); });
  $('#netBtn').addEventListener('click', throwNet);
  window.addEventListener('keydown', (e) => {
    if (e.code !== 'Space' || e.repeat) return;
    if (!$('#modal').classList.contains('hidden') || !$('#card').classList.contains('hidden')) return;
    e.preventDefault(); Snd.unlock(); pressed.add('key'); setHolding();
    if (phase === 'idle') startCharge(); else if (phase === 'bite') hookIt();
    else if (phase === 'reel') { if (P.mg.surge > 0) P.mg.ten += 0.08; else P.mg.p += 0.025; }
  });
  window.addEventListener('keyup', (e) => { if (e.code === 'Space') release('key'); });

  // ---------------- HUD ----------------
  function updateHUD() {
    $('#money').textContent = money(S.money).slice(1);
    $('#locName').textContent = L.name;
    $('#gearLine').textContent = RODS[S.rod].name + ' · ' + (S.fishBait ? '🐟 ' + BY_ID[S.fishBait.id].name + ' bait (' + S.fishBait.casts + ' casts)' : BAITS[S.bait].name);
    $('#bucketCount').textContent = S.bucket.length;
  }
  function toast(html, cls, ms) {
    const el = document.createElement('div'); el.className = 'toast ' + (cls || ''); el.innerHTML = html;
    const box = $('#toasts'); box.appendChild(el);
    while (box.children.length > 4) box.removeChild(box.firstChild);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 350); }, ms || 2600);
  }

  // ---------------- icons ----------------
  function iconCanvas(sp, w, h, silhouette, scale) {
    const c = document.createElement('canvas'); const d = Math.min(2, window.devicePixelRatio || 1);
    c.width = w * d; c.height = h * d;
    const x = c.getContext('2d'); x.scale(d, d); x.translate(w / 2, h / 2 + (sp.art.arch === 'coral' || sp.art.arch === 'barnacle' ? -h * 0.08 : 0));
    const big = ['seahorse', 'octopus', 'kraken', 'santa', 'alien', 'poseidon', 'coral', 'sponge', 'barnacle', 'urchin', 'starfish', 'bubblebuddy', 'plankton', 'seaspider'];
    const sz = Math.min(w * 0.82, h * (big.indexOf(sp.art.arch) >= 0 ? 0.75 : sp.art.arch === 'plesiosaur' ? 0.9 : 1.5)) * (scale || 1);
    Art.creature(x, sp, sz, 1.3, { noFx: true });
    if (silhouette) { x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#34405e'; x.fillRect(0, 0, c.width, c.height); }
    return c;
  }
  function rodIcon(rod) {
    const c = document.createElement('canvas'); c.width = 128; c.height = 128; const x = c.getContext('2d'); x.scale(2, 2);
    x.lineCap = 'round'; x.strokeStyle = '#1d2235'; x.lineWidth = 7; x.beginPath(); x.moveTo(12, 54); x.lineTo(54, 10); x.stroke();
    x.lineWidth = 4; x.strokeStyle = rod.id === 0 ? '#8a6a3a' : rod.metal ? 'hsl(' + rod.hue + ',70%,60%)' : 'hsl(' + rod.hue + ',55%,45%)'; x.stroke();
    x.strokeStyle = 'rgba(255,255,255,.8)'; x.lineWidth = 1; x.beginPath(); x.moveTo(54, 10); x.lineTo(56, 40); x.stroke();
    x.fillStyle = '#aab'; x.strokeStyle = '#1d2235'; x.lineWidth = 2; x.beginPath(); x.arc(22, 46, 6, 0, 6.3); x.fill(); x.stroke();
    if (rod.id >= 31) { x.fillStyle = '#fff6b0'; x.beginPath(); x.arc(54, 10, 4, 0, 6.3); x.fill(); }
    return c;
  }
  function baitIcon(b) {
    const c = document.createElement('canvas'); c.width = 128; c.height = 128; const x = c.getContext('2d'); x.scale(2, 2);
    x.strokeStyle = '#1d2235'; x.lineWidth = 2.5; x.lineCap = 'round';
    x.fillStyle = 'hsl(' + b.hue + ',75%,58%)';
    x.beginPath(); for (let i = 0; i <= 12; i++) { const q = i / 12; const px = 12 + q * 40, py = 34 + Math.sin(q * 7 + b.id) * 7; i ? x.lineTo(px, py) : x.moveTo(px, py); } x.lineWidth = 12; x.stroke(); x.lineWidth = 8; x.strokeStyle = x.fillStyle; x.stroke();
    x.fillStyle = '#1d2235'; x.beginPath(); x.arc(50, 34 + Math.sin(7 + b.id) * 7 - 2, 1.8, 0, 6.3); x.fill();
    if (b.id >= 20) { Art.star(x, 52, 14, 6, '#ffe66b'); }
    return c;
  }
  function locIcon(loc) {
    const c = document.createElement('canvas'); c.width = 220; c.height = 144; const x = c.getContext('2d'); x.scale(220 / 440, 144 / 288);
    Art.backdrop(x, loc, 440, 170, 1); Art.water(x, loc, 440, 288, -170, 400, 1); Art.surface(x, loc, 440, 170, 1);
    return c;
  }

  // ---------------- modal ----------------
  let modalKind = null, modalTab = null;
  const modal = $('#modal');
  function openModal(kind, tab) {
    if (phase !== 'idle' && phase !== 'charge') { toast('Finish your cast first!', 'bad'); return; }
    pressed.clear(); holding = false; if (phase === 'charge') resetPhase();
    modalKind = kind; modalTab = tab || null; modal.classList.remove('hidden'); Snd.click(); renderModal();
  }
  function closeModal() { if (modalKind === 'haul' && pendingHaul) settleHaul(false); modal.classList.add('hidden'); modalKind = null; }
  $('#modalClose').onclick = closeModal;
  modal.addEventListener('pointerdown', (e) => { if (e.target === modal) closeModal(); });
  document.querySelectorAll('[data-open]').forEach((b) => b.addEventListener('click', () => openModal(b.dataset.open)));
  function tabs(list) {
    const el = $('#modalTabs'); el.innerHTML = '';
    if (!list) return;
    if (!modalTab) modalTab = list[0][0];
    list.forEach(([k, label]) => { const b = document.createElement('button'); b.className = 'tab' + (modalTab === k ? ' on' : ''); b.textContent = label; b.onclick = () => { modalTab = k; dexPage = 0; renderModal(); }; el.appendChild(b); });
  }
  function renderModal() {
    const body = $('#modalBody'); body.innerHTML = ''; body.scrollTop = 0;
    if (modalKind === 'shop') { $('#modalTitle').textContent = 'Tackle Shop'; tabs([['rods', '🎣 Rods'], ['bait', '🪱 Bait'], ['nets', '🕸️ Nets']]); renderShop(body); }
    else if (modalKind === 'map') { $('#modalTitle').textContent = 'Travel'; tabs(null); renderMap(body); }
    else if (modalKind === 'bucket') { $('#modalTitle').textContent = 'Your Bucket'; tabs(null); renderBucket(body); }
    else if (modalKind === 'dex') { $('#modalTitle').textContent = 'Fishdex'; tabs(null); renderDex(body); }
    else if (modalKind === 'haul') { $('#modalTitle').textContent = 'Net Haul!'; tabs(null); renderHaul(body); }
    else if (modalKind === 'complete') { $('#modalTitle').textContent = 'Champion Angler!'; tabs(null); renderComplete(body); }
    else if (modalKind === 'settings') { $('#modalTitle').textContent = 'Settings & Stats'; tabs(null); renderSettings(body); }
  }
  function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

  function netIcon(n) {
    const c = document.createElement('canvas'); c.width = 128; c.height = 128; const x = c.getContext('2d'); x.scale(2, 2);
    x.strokeStyle = 'hsl(' + n.hue + ',45%,40%)'; x.lineWidth = 1.5;
    x.save(); x.beginPath(); x.ellipse(32, 36, 22, 20, 0, 0, 6.3); x.clip();
    for (let i = -6; i <= 6; i++) { x.beginPath(); x.moveTo(32 + i * 6 - 24, 10); x.lineTo(32 + i * 6 + 24, 60); x.stroke(); x.beginPath(); x.moveTo(32 + i * 6 + 24, 10); x.lineTo(32 + i * 6 - 24, 60); x.stroke(); }
    x.restore();
    x.lineWidth = 4; x.strokeStyle = '#1d2235'; x.beginPath(); x.ellipse(32, 18, 18, 5, 0, 0, 6.3); x.stroke();
    x.fillStyle = '#ff8a1f'; for (let i = 0; i < 5; i++) { x.beginPath(); x.arc(14 + i * 9, 18 + (i % 2 ? 3 : -3), 3.5, 0, 6.3); x.fill(); x.lineWidth = 1.5; x.stroke(); }
    x.font = "900 14px 'Lilita One', sans-serif"; x.textAlign = 'center'; x.fillStyle = '#fff'; x.lineWidth = 4; x.strokeText('×' + n.size, 32, 44); x.fillText('×' + n.size, 32, 44);
    return c;
  }
  function renderNets(body) {
    body.appendChild(el('p', 'info', 'Throw a net to haul up a whole bunch of creatures at once — no reeling! Nets need ' + NET_COOLDOWN + ' seconds to dry between throws. A Frenzy Fish caught in a net doesn\'t start a frenzy — instead it makes every creature in that haul worth 1.5×.'));
    const grid = el('div', 'grid'); body.appendChild(grid);
    NETS.forEach((n) => {
      const own = S.nets.indexOf(n.id) >= 0, eq = S.net === n.id;
      const card = el('div', 'item' + (eq ? ' equipped' : own ? ' owned' : ''));
      card.appendChild(netIcon(n));
      const t = el('div', 'txt', '<div class="nm">' + esc(n.name) + '</div><div class="st">Catches ' + n.size + ' creatures per throw<br>Reaches as deep as your rod</div>');
      const b = el('button', 'btn small ' + (eq ? 'gray' : own ? 'blue' : 'green'), eq ? 'Equipped' : own ? 'Equip' : 'Buy ' + money(n.price));
      b.disabled = eq || (!own && S.money < n.price);
      b.onclick = () => {
        if (!own) { if (S.money < n.price) return; S.money -= n.price; S.nets.push(n.id); Snd.cash(); toast('Bought the ' + esc(n.name) + '! Tap 🕸️ Net to throw it.', 'good', 3500); }
        else Snd.click();
        S.net = n.id; save(); updateHUD(); if (!checkComplete()) renderModal();
      };
      t.appendChild(b); card.appendChild(t); grid.appendChild(card);
    });
  }
  function renderShop(body) {
    if (modalTab === 'nets') { renderNets(body); return; }
    const isRod = modalTab === 'rods';
    body.appendChild(el('p', 'info', isRod ? 'Longer rods reach deeper water (bigger, pricier creatures). Stronger rods hold heavier catches.' : 'Better bait attracts rarer creatures, bites faster and boosts your odds of a Fabled legend.'));
    const grid = el('div', 'grid'); body.appendChild(grid);
    const list = isRod ? RODS : BAITS, owned = isRod ? S.rods : S.baits, cur = isRod ? S.rod : S.bait;
    const firstLocked = list.findIndex((g) => owned.indexOf(g.id) < 0);
    list.forEach((g) => {
      const own = owned.indexOf(g.id) >= 0, eq = cur === g.id;
      const hidden = !own && firstLocked >= 0 && g.id > firstLocked + 5;
      const card = el('div', 'item' + (eq ? ' equipped' : own ? ' owned' : ''));
      card.appendChild(isRod ? rodIcon(g) : baitIcon(g));
      const fc = fabledChance(isRod ? g.id : S.rod, isRod ? S.bait : g.id, S.loc);
      const stats = isRod ? 'Reach ' + meters(g.depth) + ' · Holds ' + kgs(g.cap) + '<br>Reel grip ' + Math.round(g.reel * 100) + '%'
        : 'Luck ×' + g.luck.toFixed(2) + ' · Bites ' + Math.round((1 / g.bite - 1) * 100) + '% faster<br>Fabled odds here ' + (fc * 100).toFixed(fc < 0.001 ? 3 : 2) + '%';
      const t = el('div', 'txt', '<div class="nm">' + (hidden ? '???' : esc(g.name)) + '</div><div class="st">' + (hidden ? 'Keep fishing to reveal…' : stats) + '</div>');
      const b = el('button', 'btn small ' + (eq ? 'gray' : own ? 'blue' : 'green'), eq ? 'Equipped' : own ? 'Equip' : 'Buy ' + money(g.price));
      b.disabled = eq || (!own && S.money < g.price);
      b.onclick = () => {
        if (!own) { if (S.money < g.price) return; S.money -= g.price; owned.push(g.id); Snd.cash(); toast('Bought ' + esc(g.name) + '!', 'good'); }
        else Snd.click();
        if (isRod) S.rod = g.id; else S.bait = g.id;
        save(); updateHUD(); if (!checkComplete()) renderModal();
      };
      t.appendChild(b); card.appendChild(t); grid.appendChild(card);
    });
  }

  function renderMap(body) {
    body.appendChild(el('p', 'info', 'Each new spot has bigger, rarer, more valuable creatures — and deeper water.'));
    const grid = el('div', 'grid'); body.appendChild(grid);
    const firstLocked = LOCATIONS.findIndex((l) => S.locs.indexOf(l.tier) < 0);
    LOCATIONS.forEach((l) => {
      const own = S.locs.indexOf(l.tier) >= 0, here = S.loc === l.tier, hidden = !own && firstLocked >= 0 && l.tier > firstLocked + 2;
      const card = el('div', 'item loccard' + (here ? ' equipped' : own ? ' owned' : ''));
      card.appendChild(hidden ? el('canvas') : locIcon(l));
      const got = POOLS[l.tier].filter((s) => S.dex[s.id]).length;
      const t = el('div', 'txt', '<div class="nm">' + (hidden ? '??? Mystery Waters' : esc(l.name)) + '</div><div class="st">' + (hidden ? 'Rumors only…' : esc(l.desc) + '<br>Depth ' + meters(l.maxDepth) + ' · ' + got + '/' + POOLS[l.tier].length + ' found') + '</div>');
      const b = el('button', 'btn small ' + (here ? 'gray' : own ? 'blue' : 'green'), here ? 'You are here' : own ? 'Travel' : 'Buy ' + money(l.price));
      b.disabled = here || (!own && S.money < l.price);
      b.onclick = () => {
        if (!own) { if (S.money < l.price) return; S.money -= l.price; S.locs.push(l.tier); Snd.cash(); toast('Unlocked ' + esc(l.name) + '!', 'gold'); }
        S.loc = l.tier; setupLoc(); save(); updateHUD(); closeModal();
        toast('🧭 Welcome to ' + esc(l.name) + '!', 'good');
        checkComplete();
      };
      t.appendChild(b); card.appendChild(t); grid.appendChild(card);
    });
  }

  function sellItems(pred) {
    let tot = 0, n = 0; const keep = [];
    for (const it of S.bucket) { if (pred(it)) { tot += it.v; n++; } else keep.push(it); }
    if (!n) return;
    S.bucket = keep; S.money += tot; S.stats.earned += tot; Snd.cash();
    toast('💰 Sold ' + n + ' for ' + money(tot), 'good'); save(); updateHUD();
  }
  function renderBucket(body) {
    const total = S.bucket.reduce((a, b) => a + b.v, 0);
    const bar = el('div', 'toolbar');
    bar.appendChild(el('div', 'info', S.bucket.length + ' catches · worth ' + money(total)));
    const b1 = el('button', 'btn small green', 'Sell All'); b1.onclick = () => { sellItems(() => true); renderModal(); };
    const b2 = el('button', 'btn small orange', 'Sell below Epic'); b2.onclick = () => { sellItems((it) => BY_ID[it.id].rarity < 3); renderModal(); };
    const b3 = el('button', 'btn small blue', 'Sell Junk'); b3.onclick = () => { sellItems((it) => BY_ID[it.id].arch === 'junk'); renderModal(); };
    bar.appendChild(b1); bar.appendChild(b2); bar.appendChild(b3); body.appendChild(bar);
    const fbInfo = S.fishBait ? '🐟 On your hook: <b>' + esc(BY_ID[S.fishBait.id].name) + '</b> — ' + S.fishBait.casts + ' casts left. ' : '';
    body.appendChild(el('p', 'info', fbInfo + 'Tap <b>🪝 Bait</b> to put a small fish on your hook. Live bait boosts your luck and attracts bigger catches for a few casts. Big, rare, spiky or venomous creatures can\'t be used as bait.'));
    if (!S.bucket.length) { body.appendChild(el('p', 'info', 'Your bucket is empty. Go catch something!')); return; }
    const rows = el('div', 'rows'); body.appendChild(rows);
    const sorted = S.bucket.map((it, i) => [it, i]).sort((a, b) => b[0].v - a[0].v);
    sorted.slice(0, 250).forEach(([it]) => {
      const sp = BY_ID[it.id];
      const r = el('div', 'row');
      r.appendChild(iconCanvas(sp, 52, 40));
      r.appendChild(el('div', 'nm', esc(sp.name) + ' ' + rtag(sp.rarity) + '<small>' + sp.cat + ' · ' + kgs(it.kg) + (it.fz ? ' · ⚡' + it.fz + '× frenzy' : '') + '</small>'));
      r.appendChild(el('div', 'val', money(it.v)));
      const fb = fishBait(sp);
      if (fb) {
        const bb = el('button', 'btn small orange', '🪝 Bait');
        bb.title = '+' + Math.round((fb.luck - 1) * 100) + '% luck for ' + fb.casts + ' casts';
        bb.onclick = () => {
          S.bucket.splice(S.bucket.indexOf(it), 1);
          S.fishBait = { id: sp.id, casts: fb.casts, luck: fb.luck, deep: fb.deep };
          Snd.click(); toast('🪝 ' + esc(sp.name) + ' is on your hook! +' + Math.round((fb.luck - 1) * 100) + '% luck & bigger bites for ' + fb.casts + ' casts.', 'good', 3500);
          save(); updateHUD(); renderModal();
        };
        r.appendChild(bb);
      }
      const b = el('button', 'btn small green', 'Sell'); b.onclick = () => { sellItems((x) => x === it); renderModal(); };
      r.appendChild(b); rows.appendChild(r);
    });
    if (sorted.length > 250) body.appendChild(el('p', 'info', '…and ' + (sorted.length - 250) + ' smaller catches.'));
  }

  // Fishdex
  const DEX_GROUPS = LOCATIONS.map((l) => ({ name: l.name, list: POOLS[l.tier] })).concat([{ name: '✨ Fabled Legends', list: GLOBAL.fabled }, { name: '⚡ Frenzy Fish', list: GLOBAL.frenzy }, { name: '🥾 Junk & Plankton (anywhere)', list: GLOBAL.junk.concat(GLOBAL.plankton) }]);
  let dexGroup = 0, dexCat = 'all', dexRar = 'all', dexPage = 0;
  function renderDex(body) {
    const found = Object.keys(S.dex).length;
    body.appendChild(el('div', 'info', '📖 Discovered ' + found.toLocaleString() + ' / ' + SPECIES.length.toLocaleString() + ' species'));
    const pr = el('div', 'progress'); pr.appendChild(el('div')); pr.firstChild.style.width = (found / SPECIES.length * 100).toFixed(2) + '%'; body.appendChild(pr);
    const f = el('div', 'filters'); body.appendChild(f);
    const sg = el('select'); DEX_GROUPS.forEach((g, i) => { const o = el('option', null, esc(g.name) + ' (' + g.list.filter((s) => S.dex[s.id]).length + '/' + g.list.length + ')'); o.value = i; if (i === dexGroup) o.selected = true; sg.appendChild(o); });
    sg.onchange = () => { dexGroup = +sg.value; dexCat = 'all'; dexPage = 0; renderModal(); };
    const group = DEX_GROUPS[dexGroup].list;
    const cats = Array.from(new Set(group.map((s) => s.cat)));
    const sc = el('select'); [['all', 'All creatures']].concat(cats.map((c) => [c, c])).forEach(([v, n]) => { const o = el('option', null, n); o.value = v; if (v === dexCat) o.selected = true; sc.appendChild(o); });
    sc.onchange = () => { dexCat = sc.value; dexPage = 0; renderModal(); };
    const sr = el('select'); [['all', 'All rarities']].concat(RARITIES.map((r, i) => [String(i), r.name])).forEach(([v, n]) => { const o = el('option', null, n); o.value = v; if (v === dexRar) o.selected = true; sr.appendChild(o); });
    sr.onchange = () => { dexRar = sr.value; dexPage = 0; renderModal(); };
    f.appendChild(sg); f.appendChild(sc); f.appendChild(sr);
    const list = group.filter((s) => (dexCat === 'all' || s.cat === dexCat) && (dexRar === 'all' || s.rarity === +dexRar));
    const PER = 40, pages = Math.max(1, Math.ceil(list.length / PER)); dexPage = Math.min(dexPage, pages - 1);
    const grid = el('div', 'dexgrid'); body.appendChild(grid);
    list.slice(dexPage * PER, dexPage * PER + PER).forEach((sp) => {
      const d = S.dex[sp.id];
      const card = el('div', 'dex' + (d ? '' : ' unk'));
      const bar = el('div', 'bar'); bar.style.background = sp.rarity === FABLED ? 'linear-gradient(90deg,#ff4d5e,#ffd23f,#3fbf4f,#2f8cf0,#a43be0)' : RARITIES[sp.rarity].color; card.appendChild(bar);
      card.appendChild(iconCanvas(sp, 110, 76, !d));
      card.appendChild(el('div', 'nm', d ? esc(sp.name) : '???'));
      card.onclick = () => {
        if (!d) { toast('??? — ' + RARITIES[sp.rarity].name + ' ' + sp.cat + (sp.loc >= 0 ? ' · found deeper than ' + meters(sp.depth * LOCATIONS[sp.loc].maxDepth) : ''), '', 3000); return; }
        toast('<b>' + esc(sp.name) + '</b> ' + rtag(sp.rarity) + '<br>Caught ' + d.n + '× · Biggest ' + kgs(d.kg) + (sp.loc >= 0 ? ' · Depth ' + meters(sp.depth * LOCATIONS[sp.loc].maxDepth) + '+' : ''), '', 3500);
      };
      grid.appendChild(card);
    });
    if (pages > 1) {
      const pg = el('div', 'pager');
      const prev = el('button', 'btn small blue', '◀'); prev.disabled = dexPage === 0; prev.onclick = () => { dexPage--; renderModal(); };
      const next = el('button', 'btn small blue', '▶'); next.disabled = dexPage >= pages - 1; next.onclick = () => { dexPage++; renderModal(); };
      pg.appendChild(prev); pg.appendChild(el('span', null, 'Page ' + (dexPage + 1) + ' / ' + pages)); pg.appendChild(next); body.appendChild(pg);
    }
  }

  function isComplete() { return S.rods.length >= RODS.length && S.baits.length >= BAITS.length && S.locs.length >= LOCATIONS.length && S.nets.length >= NETS.length; }
  function checkComplete() {
    if (!isComplete() || S.completeSeen) return false;
    S.completeSeen = true; save(); confetti(220); Snd.fabled();
    modalKind = 'complete'; modalTab = null; modal.classList.remove('hidden'); renderModal();
    return true;
  }
  function resetGame(keepTrophy) {
    const done = (S.completions || 0) + (keepTrophy ? 1 : 0), snd = S.sound, quick = S.quick;
    S = fresh(); S.completions = done; S.sound = snd; S.quick = quick; S.tut = false;
    frenzy = null; save(); setupLoc(); updateHUD(); closeModal();
    toast(keepTrophy ? '🏆 New game started! Trophies: ' + done : 'Fresh start! Back to the Raggity Old Stick.', 'gold', 4000);
  }
  function renderComplete(body) {
    body.appendChild(el('div', 'info', '<div style="font-size:64px;text-align:center">🏆</div><h3 style="text-align:center;font-family:Lilita One;font-size:28px;margin:4px 0">You beat Fishing Tycoon!</h3><p style="text-align:center">You own every rod, bait, net and fishing spot in the world. You\'ve found ' + Object.keys(S.dex).length.toLocaleString() + ' of ' + SPECIES.length.toLocaleString() + ' species.</p>'));
    const box = el('div', 'toolbar'); box.style.justifyContent = 'center';
    const r = el('button', 'btn green', '🔄 Reset & play again'); r.onclick = () => { if (confirm('Start a brand new game? You keep your 🏆 trophy, everything else resets.')) resetGame(true); };
    const k = el('button', 'btn blue', 'Keep fishing'); k.onclick = closeModal;
    box.appendChild(r); box.appendChild(k); body.appendChild(box);
    body.appendChild(el('p', 'info', '<br>You can also reset any time from ⚙️ Settings.'));
  }

  function renderSettings(body) {
    const st = S.stats;
    const best = st.best && BY_ID[st.best.id];
    const s = el('div', 'stats');
    [['Casts', st.casts.toLocaleString()], ['Catches', st.catches.toLocaleString()], ['Money earned', money(st.earned)], ['Species found', Object.keys(S.dex).length.toLocaleString()], ['Fabled caught', st.fabled], ['Lines snapped', st.snaps], ['Nets thrown', st.nets || 0], ['🏆 Games completed', S.completions || 0], ['Best catch', best ? esc(best.name) + ' (' + money(st.best.v) + ')' : '—']]
      .forEach(([k, v]) => s.appendChild(el('div', 'stat', k + '<b>' + v + '</b>')));
    body.appendChild(s);
    const box = el('div', 'settings'); box.style.marginTop = '14px'; body.appendChild(box);
    const mk = (label, key) => { const l = el('label'); const c = el('input'); c.type = 'checkbox'; c.checked = !!S[key]; c.onchange = () => { S[key] = c.checked; save(); }; l.appendChild(c); l.appendChild(document.createTextNode(label)); box.appendChild(l); };
    mk('🔊 Sound effects', 'sound');
    mk('⚡ Quick mode — skip the big catch card for Common & Uncommon creatures you already know', 'quick');
    if (isComplete()) {
      const g = el('button', 'btn green', '🏆 You beat the game — Reset & play again');
      g.onclick = () => { if (confirm('Start a brand new game? You keep your 🏆 trophy, everything else resets.')) resetGame(true); };
      box.appendChild(g);
    }
    const r = el('button', 'btn red', '🗑️ Reset all progress');
    r.onclick = () => { if (confirm('Erase ALL progress and start over with the raggity old stick?')) resetGame(false); };
    box.appendChild(r);
    body.appendChild(el('p', 'info', '<br>Fishing Tycoon · ' + SPECIES.length.toLocaleString() + ' species across ' + LOCATIONS.length + ' locations, ' + RODS.length + ' rods and ' + BAITS.length + ' baits.'));
  }

  // ---------------- catch card ----------------
  let cardItem = null;
  const cardCv = $('#cardCanvas'), cardCtx = cardCv.getContext('2d');
  function showCard(item, isNew) {
    cardItem = item; const sp = BY_ID[item.id], R = RARITIES[sp.rarity];
    $('#card').classList.remove('hidden');
    $('#card .catch').classList.toggle('fabled', sp.rarity === FABLED);
    $('#cardBadge').classList.toggle('hidden', !isNew);
    const rr = $('#cardRarity'); rr.textContent = sp.rarity === FABLED ? '✨ FABLED ✨' : R.name; rr.style.background = sp.rarity === FABLED ? 'linear-gradient(90deg,#ff4d5e,#ffd23f,#3fbf4f,#2f8cf0,#a43be0)' : R.color;
    const nm = $('#cardName'); nm.textContent = sp.name; nm.className = sp.rarity === FABLED ? 'rainbowtext' : '';
    $('#cardMeta').innerHTML = '<span>⚖️ ' + kgs(item.kg) + '</span><span>💰 ' + money(item.v) + (item.fz ? ' (⚡' + item.fz + '×)' : '') + '</span><span>🏷️ ' + sp.cat + '</span>';
    $('#cardBlurb').textContent = sp.blurb || (isNew ? 'A brand-new discovery for your Fishdex!' : 'Caught ' + S.dex[sp.id].n + ' times so far.');
    $('#cardSell').textContent = 'Sell ' + money(item.v);
    if (sp.rarity === FABLED) { Snd.fabled(); toast('🌟 FABLED CATCH! You caught ' + esc(sp.name) + '!', 'gold', 5000); }
  }
  function drawCard() {
    if (!cardItem) return;
    const sp = BY_ID[cardItem.id];
    cardCtx.setTransform(1, 0, 0, 1, 0, 0); cardCtx.clearRect(0, 0, 600, 420);
    const g = cardCtx.createRadialGradient(300, 210, 20, 300, 210, 300); g.addColorStop(0, sp.rarity === FABLED ? 'rgba(255,230,120,0.6)' : 'rgba(150,220,255,0.55)'); g.addColorStop(1, 'rgba(150,220,255,0)');
    cardCtx.fillStyle = g; cardCtx.fillRect(0, 0, 600, 420);
    cardCtx.translate(300, 215);
    const tall = ['seahorse', 'octopus', 'kraken', 'santa', 'alien', 'poseidon', 'coral', 'sponge', 'barnacle', 'plankton', 'seaspider', 'urchin', 'bubblebuddy', 'starfish'].indexOf(sp.art.arch) >= 0;
    const sz = tall ? 300 : sp.art.arch === 'plesiosaur' ? 380 : 430;
    const m = Art.motion(sp.art, time);
    cardCtx.translate(m.dx * 1.5, m.dy * 1.5); cardCtx.rotate(m.rot);
    Art.creature(cardCtx, sp, sz, time);
  }
  function closeCard(sell) {
    if (!cardItem) return;
    if (sell) { S.money += cardItem.v; S.stats.earned += cardItem.v; Snd.cash(); toast('💰 +' + money(cardItem.v), 'good'); }
    else { S.bucket.push(cardItem); Snd.click(); }
    cardItem = null; $('#card').classList.add('hidden'); save(); updateHUD();
  }
  $('#cardSell').onclick = () => closeCard(true);
  $('#cardKeep').onclick = () => closeCard(false);

  // ---------------- boot ----------------
  function resize() {
    DPR = Math.min(2, window.devicePixelRatio || 1); W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR); cv.style.width = W + 'px'; cv.style.height = H + 'px';
    K = Math.max(0.62, Math.min(1.2, Math.min(W / 950, H / 720)));
  }
  window.addEventListener('resize', () => { const oldK = K; resize(); if (Math.abs(oldK - K) > 0.05) for (const c of critters) c.size = sizeFor(c.sp); });
  resize();
  setupLoc();
  updateHUD();
  if (!S.tut) $('#hint').classList.add('hidden');
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
  window.FTGame = { get state() { return S; }, get phase() { return phase; }, get P() { return P; }, get holding() { return holding; }, setupLoc, updateHUD };
  requestAnimationFrame(frame);
})();
