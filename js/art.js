/* Fishing Tycoon — cartoon art engine.
 * Every creature is drawn with canvas paths from its procedurally generated
 * art params (see data.js), so each species gets its own look and motion. */
(function (G) {
  'use strict';
  const TAU = Math.PI * 2;
  const OUT = '#1d2235';

  function cl(v, a, b) { return v < a ? a : v > b ? b : v; }
  function C(c, dl, al) { return 'hsla(' + Math.round(c[0]) + ',' + Math.round(c[1]) + '%,' + cl(c[2] + (dl || 0), 0, 100).toFixed(1) + '%,' + (al == null ? 1 : al) + ')'; }
  function circ(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.abs(r), 0, TAU); }
  function ell(ctx, x, y, rx, ry, rot) { ctx.beginPath(); ctx.ellipse(x, y, Math.abs(rx), Math.abs(ry), rot || 0, 0, TAU); }
  function fs(ctx, fill) { ctx.fillStyle = fill; ctx.fill(); ctx.stroke(); }
  function fsP(ctx, p, fill) { ctx.fillStyle = fill; ctx.fill(p); ctx.stroke(p); }
  function seeded(v) { let a = Math.floor(v * 4294967296) | 0; return function () { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  function palette(a, t) {
    if (a.rainbow) {
      const h = (t * 80 + a.v * 360) % 360;
      return { c1: [h, 85, 58], c2: [(h + 40) % 360, 80, 80], c3: [(h + 120) % 360, 85, 60], pc: [(h + 200) % 360, 80, 45] };
    }
    return a;
  }
  function finFill(a, P) { return a.galaxy ? '#3b2c8f' : a.shine ? C(P.c1, 12) : C(P.c3); }

  // Fill a Path2D with the creature's body look, its pattern, then outline it.
  function paintBody(ctx, a, P, p, x, y, w, h, t, noBelly) {
    let g;
    if (a.galaxy) {
      g = ctx.createLinearGradient(x, y, x + w, y + h);
      g.addColorStop(0, '#1a1450'); g.addColorStop(0.5, '#4b1d7a'); g.addColorStop(1, '#0b3b6e');
    } else if (a.shine) {
      g = ctx.createLinearGradient(x, y, x + w, y + h);
      const sh = 0.1 + ((t * 0.4 + a.v) % 1) * 0.8;
      g.addColorStop(0, C(P.c1, 5)); g.addColorStop(sh - 0.1, C(P.c1, 0)); g.addColorStop(sh, C(P.c1, 32)); g.addColorStop(sh + 0.1, C(P.c1, 0)); g.addColorStop(1, C(P.c1, -14));
    } else {
      g = ctx.createLinearGradient(0, y, 0, y + h);
      g.addColorStop(0, C(P.c1, -10)); g.addColorStop(0.5, C(P.c1, 3)); g.addColorStop(1, C(P.c1, 8));
    }
    ctx.fillStyle = g; ctx.fill(p);
    ctx.save(); ctx.clip(p);
    if (!a.galaxy && !noBelly) { ell(ctx, x + w * 0.55, y + h * 0.98, w * 0.5, h * 0.42); ctx.fillStyle = C(P.c2, 0, 0.8); ctx.fill(); }
    const r = seeded(a.v), pc = C(P.pc, 0, 0.55);
    switch (a.pat) {
      case 'stripes': ctx.fillStyle = pc; for (let i = 0; i < 6; i++) { const sx = x + w * (0.15 + i * 0.13); ctx.beginPath(); ctx.moveTo(sx, y); ctx.quadraticCurveTo(sx + w * 0.04, y + h * 0.5, sx, y + h); ctx.lineTo(sx + w * 0.045, y + h); ctx.quadraticCurveTo(sx + w * 0.085, y + h * 0.5, sx + w * 0.045, y); ctx.fill(); } break;
      case 'bands': ctx.fillStyle = C(P.pc[2] > 80 ? P.pc : [P.c2[0], 20, 95], 0, 0.9); ctx.lineWidth *= 0.6; for (let i = 0; i < 3; i++) { const sx = x + w * (0.25 + i * 0.22); ctx.beginPath(); ctx.rect(sx, y, w * 0.07, h); ctx.fill(); } ctx.lineWidth /= 0.6; break;
      case 'spots': ctx.fillStyle = pc; for (let i = 0; i < 9; i++) { circ(ctx, x + w * (0.15 + r() * 0.7), y + h * (0.15 + r() * 0.6), Math.min(w, h) * (0.04 + r() * 0.05)); ctx.fill(); } break;
      case 'speckle': ctx.fillStyle = pc; for (let i = 0; i < 30; i++) { circ(ctx, x + w * r(), y + h * r(), Math.min(w, h) * 0.018 + 0.5); ctx.fill(); } break;
      case 'grad': { const g2 = ctx.createLinearGradient(0, y, 0, y + h * 0.6); g2.addColorStop(0, C(P.pc, 0, 0.45)); g2.addColorStop(1, C(P.pc, 0, 0)); ctx.fillStyle = g2; ctx.fillRect(x, y, w, h); break; }
      case 'marble': ctx.strokeStyle = C(P.pc, 20, 0.45); ctx.lineWidth *= 0.7; for (let i = 0; i < 5; i++) { ctx.beginPath(); const yy = y + h * (0.15 + r() * 0.7); ctx.moveTo(x, yy); ctx.bezierCurveTo(x + w * 0.3, yy - h * 0.3 * r(), x + w * 0.6, yy + h * 0.3 * r(), x + w, yy - h * 0.1); ctx.stroke(); } ctx.lineWidth /= 0.7; ctx.strokeStyle = OUT; break;
    }
    if (a.f && a.f.multi && !a.rainbow) { const hs = [P.c3[0], (P.c1[0] + 60) % 360, (P.c1[0] + 200) % 360]; for (let i = 0; i < 3; i++) { ctx.fillStyle = C([hs[i], 80, 58], 0, 0.55); ctx.fillRect(x, y + h * (0.22 + i * 0.16), w, h * 0.08); } }
    if (a.galaxy) { for (let i = 0; i < 18; i++) { const tw = 0.5 + 0.5 * Math.sin(t * 3 + i * 1.7); ctx.fillStyle = 'rgba(255,255,255,' + (0.35 + 0.65 * tw) + ')'; circ(ctx, x + w * r(), y + h * r(), Math.max(0.7, Math.min(w, h) * 0.02 * (0.5 + r()))); ctx.fill(); } const ng = ctx.createRadialGradient(x + w * 0.6, y + h * 0.4, 0, x + w * 0.6, y + h * 0.4, w * 0.4); ng.addColorStop(0, 'rgba(255,120,220,0.35)'); ng.addColorStop(1, 'rgba(255,120,220,0)'); ctx.fillStyle = ng; ctx.fillRect(x, y, w, h); }
    ctx.restore();
    ctx.stroke(p);
  }

  function eye(ctx, x, y, r, a, t, opt) {
    opt = opt || {};
    ctx.save();
    ctx.lineWidth = Math.max(1, r * 0.22);
    const blink = ((t * 0.35 + a.v * 7) % 5) < 0.12;
    if (blink) { ctx.beginPath(); ctx.moveTo(x - r, y); ctx.quadraticCurveTo(x, y + r * 0.6, x + r, y); ctx.stroke(); }
    else {
      circ(ctx, x, y, r); fs(ctx, '#fff');
      circ(ctx, x + r * 0.28, y + r * 0.05, r * 0.56); ctx.fillStyle = a.eyeCol || OUT; ctx.fill();
      circ(ctx, x + r * 0.4, y - r * 0.2, r * 0.2); ctx.fillStyle = '#fff'; ctx.fill();
    }
    if (opt.angry) { ctx.lineWidth = Math.max(1.5, r * 0.35); ctx.beginPath(); ctx.moveTo(x - r * 1.1, y - r * 1.3); ctx.lineTo(x + r * 1.1, y - r * 0.7); ctx.stroke(); }
    ctx.restore();
  }
  function smile(ctx, x, y, r, open) {
    ctx.beginPath(); ctx.arc(x, y, r, 0.15 * Math.PI, 0.85 * Math.PI);
    if (open) { ctx.closePath(); ctx.fillStyle = '#7a1f2b'; ctx.fill(); }
    ctx.stroke();
  }
  function crown(ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y);
    ctx.beginPath(); ctx.moveTo(-s, 0); ctx.lineTo(-s, -s * 0.9); ctx.lineTo(-s * 0.5, -s * 0.4); ctx.lineTo(0, -s * 1.1); ctx.lineTo(s * 0.5, -s * 0.4); ctx.lineTo(s, -s * 0.9); ctx.lineTo(s, 0); ctx.closePath();
    fs(ctx, '#ffd23f');
    circ(ctx, 0, -s * 0.35, s * 0.18); ctx.fillStyle = '#e8355a'; ctx.fill();
    ctx.restore();
  }
  function santaHat(ctx, x, y, s, t) {
    ctx.save(); ctx.translate(x, y);
    ctx.beginPath(); ctx.moveTo(-s, 0); ctx.quadraticCurveTo(-s * 0.2, -s * 1.8, s * 1.2 + Math.sin(t * 2) * s * 0.1, -s * 0.9); ctx.lineTo(s, 0); ctx.closePath(); fs(ctx, '#e0283a');
    ell(ctx, 0, 0, s * 1.15, s * 0.3); fs(ctx, '#fff');
    circ(ctx, s * 1.2 + Math.sin(t * 2) * s * 0.1, -s * 0.9, s * 0.28); fs(ctx, '#fff');
    ctx.restore();
  }

  // ---------------- archetypes ----------------
  function drawFish(ctx, a, P, s, t) {
    const f = a.f, L = s, H = s * a.h, sw = Math.sin(t * a.wf * a.ms), tj = -L * 0.42, ff = finFill(a, P);
    // tail
    ctx.save(); ctx.translate(tj, 0); ctx.rotate(sw * 0.22);
    const th = Math.max(H, L * 0.32) * (a.tail === 'fan' ? 1.2 : 1), tl = L * (f.long ? 0.16 : 0.26);
    const tp = new Path2D();
    if (a.tail === 'fork') { tp.moveTo(3, -th * 0.08); tp.lineTo(-tl, -th * 0.55); tp.quadraticCurveTo(-tl * 0.45, 0, -tl, th * 0.55); tp.lineTo(3, th * 0.08); }
    else if (a.tail === 'round') { tp.moveTo(3, -th * 0.12); tp.bezierCurveTo(-tl * 1.4, -th * 0.75, -tl * 1.4, th * 0.75, 3, th * 0.12); }
    else if (a.tail === 'lunate') { tp.moveTo(3, -th * 0.06); tp.quadraticCurveTo(-tl * 0.4, -th * 0.25, -tl * 0.95, -th * 0.72); tp.quadraticCurveTo(-tl * 0.35, 0, -tl * 0.95, th * 0.72); tp.quadraticCurveTo(-tl * 0.4, th * 0.25, 3, th * 0.06); }
    else { const wv = Math.sin(t * 3 + a.v * 5) * th * 0.12; tp.moveTo(3, -th * 0.1); tp.bezierCurveTo(-tl * 0.6, -th * 0.9, -tl * 1.7, -th * 0.7 + wv, -tl * 1.4, wv); tp.bezierCurveTo(-tl * 1.7, th * 0.7 + wv, -tl * 0.6, th * 0.9, 3, th * 0.1); }
    tp.closePath(); fsP(ctx, tp, ff);
    if (a.tail === 'fan' || f.flowy) { ctx.save(); ctx.clip(tp); ctx.globalAlpha = 0.35; ctx.lineWidth *= 0.6; for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-tl * 1.6, i * th * 0.25); ctx.stroke(); } ctx.restore(); }
    ctx.restore();
    // dorsal & ventral fins
    const top = -H * 0.42, dx0 = L * 0.18, dx1 = -L * 0.28, dp = new Path2D();
    const fl = Math.sin(t * 2.5 + a.v * 9) * H * 0.04;
    if (a.dorsal === 'spiky') { dp.moveTo(dx0, top + H * 0.1); const n = 5; for (let i = 0; i < n; i++) { dp.lineTo(dx0 + (dx1 - dx0) * (i + 0.5) / n, top - H * 0.36 + fl - (i === 1 ? H * 0.08 : 0)); dp.lineTo(dx0 + (dx1 - dx0) * (i + 1) / n, top + H * 0.06); } dp.lineTo(dx1, top + H * 0.2); }
    else if (a.dorsal === 'tall') { dp.moveTo(dx0 * 0.6, top + H * 0.1); dp.quadraticCurveTo(-L * 0.05, top - H * 0.8 + fl, dx1, top + H * 0.15); }
    else if (a.dorsal === 'sail') { dp.moveTo(L * 0.3, top + H * 0.15); dp.bezierCurveTo(L * 0.2, top - H * 1.9 + fl, -L * 0.25, top - H * 1.6, dx1, top + H * 0.25); }
    else if (a.dorsal === 'small') { dp.moveTo(L * 0.02, top + H * 0.1); dp.quadraticCurveTo(-L * 0.1, top - H * 0.35 + fl, -L * 0.2, top + H * 0.15); }
    else { dp.moveTo(dx0, top + H * 0.12); dp.bezierCurveTo(dx0, top - H * 0.55 + fl, dx1, top - H * 0.45, dx1, top + H * 0.15); }
    dp.closePath(); fsP(ctx, dp, ff);
    const vp = new Path2D(); vp.moveTo(-L * 0.1, H * 0.36); vp.quadraticCurveTo(-L * 0.2, H * 0.72 - fl, -L * 0.3, H * 0.25); vp.closePath(); fsP(ctx, vp, ff);
    // bill / paddle (under body)
    if (f.bill) { ctx.beginPath(); ctx.moveTo(L * 0.42, -H * 0.1); ctx.lineTo(L * 0.92, -H * 0.02); ctx.lineTo(L * 0.42, H * 0.1); ctx.closePath(); fs(ctx, C(P.c1, -12)); }
    if (f.paddle) { ell(ctx, L * 0.72, 0, L * 0.26, H * 0.16); fs(ctx, C(P.c1, -6)); }
    // body
    const bp = new Path2D();
    if (f.round) bp.ellipse(0, 0, L * 0.45, H * 0.5 * (f.spikes ? 1 + 0.06 * Math.sin(t * 2) : 1), 0, 0, TAU);
    else { bp.moveTo(L * 0.5, H * 0.04); bp.bezierCurveTo(L * 0.47, -H * 0.62, -L * 0.12, -H * 0.62, tj, -H * 0.13); bp.lineTo(tj, H * 0.13); bp.bezierCurveTo(-L * 0.12, H * 0.62, L * 0.47, H * 0.62, L * 0.5, H * 0.04); bp.closePath(); }
    if (f.spikes) { ctx.fillStyle = C(P.c1, -15); for (let i = 0; i < 18; i++) { const an = i / 18 * TAU, rx = L * 0.45, ry = H * 0.5; ctx.beginPath(); ctx.moveTo(Math.cos(an - 0.12) * rx, Math.sin(an - 0.12) * ry); ctx.lineTo(Math.cos(an) * rx * 1.18, Math.sin(an) * ry * 1.18); ctx.lineTo(Math.cos(an + 0.12) * rx, Math.sin(an + 0.12) * ry); ctx.fill(); ctx.stroke(); } }
    paintBody(ctx, a, P, bp, -L * 0.5, -H * 0.5, L, H, t);
    if (f.armor) { ctx.beginPath(); ctx.moveTo(L * 0.5, H * 0.05); ctx.bezierCurveTo(L * 0.48, -H * 0.55, L * 0.2, -H * 0.55, L * 0.08, -H * 0.4); ctx.lineTo(L * 0.12, H * 0.42); ctx.quadraticCurveTo(L * 0.4, H * 0.45, L * 0.5, H * 0.05); fs(ctx, 'hsla(210,12%,55%,0.85)'); circ(ctx, L * 0.2, H * 0.2, L * 0.012); ctx.fillStyle = OUT; ctx.fill(); }
    // gill + pectoral
    ctx.save(); ctx.lineWidth *= 0.7; ctx.beginPath(); ctx.arc(L * (f.round ? 0.32 : 0.36), 0, H * 0.32, Math.PI * 0.6, Math.PI * 1.4); ctx.stroke(); ctx.restore();
    ell(ctx, L * 0.08, H * 0.14, L * 0.1, H * 0.11, 0.5 + sw * 0.35); fs(ctx, ff);
    if (f.frills) { ctx.save(); ctx.lineWidth *= 0.8; for (let i = 0; i < 6; i++) { const an = 0.5 + i * 0.22 + sw * 0.1; ctx.beginPath(); ctx.moveTo(L * 0.1, H * 0.15); ctx.lineTo(L * 0.1 - Math.cos(an) * L * 0.38, H * 0.15 + Math.sin(an) * L * 0.3); ctx.strokeStyle = i % 2 ? C(P.c3) : '#fff'; ctx.lineWidth = Math.max(2, L * 0.025); ctx.stroke(); } ctx.restore(); }
    if (f.lights) { for (let i = 0; i < 6; i++) { const gl = 0.5 + 0.5 * Math.sin(t * 4 + i); circ(ctx, L * (0.25 - i * 0.1), H * 0.3 - Math.abs(i - 2.5) * H * 0.02, L * 0.018); ctx.fillStyle = 'rgba(140,255,255,' + (0.4 + gl * 0.6) + ')'; ctx.fill(); } }
    // face
    const ex = f.round ? L * 0.22 : L * 0.3, ey = f.flat ? -H * 0.2 : -H * 0.1, er = Math.min(L * a.eye * 0.4, H * 0.42);
    eye(ctx, ex, ey, er, a, t);
    if (f.flat) eye(ctx, ex - er * 2.2, ey - er * 0.6, er * 0.9, a, t + 0.3);
    ctx.save(); ctx.lineWidth *= 0.8;
    const mx = f.round ? L * 0.4 : L * 0.45;
    if (f.teeth) { ctx.beginPath(); ctx.moveTo(mx - L * 0.12, H * 0.1); ctx.quadraticCurveTo(mx - L * 0.04, H * 0.2, L * 0.5, H * 0.04); ctx.stroke(); ctx.fillStyle = '#fff'; for (let i = 0; i < 4; i++) { const tx = mx - L * 0.1 + i * L * 0.03; ctx.beginPath(); ctx.moveTo(tx, H * 0.1 + i * H * 0.01); ctx.lineTo(tx + L * 0.012, H * 0.2); ctx.lineTo(tx + L * 0.024, H * 0.1 + i * H * 0.01); ctx.closePath(); ctx.fill(); ctx.stroke(); } }
    else { ctx.beginPath(); ctx.arc(mx - L * 0.04, H * 0.02, L * 0.045, 0.2 * Math.PI, 0.9 * Math.PI); ctx.stroke(); }
    if (f.whiskers) { const ww = Math.sin(t * 3 + a.v * 4) * H * 0.08; for (let i = 0; i < 2; i++) { ctx.beginPath(); ctx.moveTo(mx, H * 0.08); ctx.quadraticCurveTo(mx + L * 0.12, H * (0.15 + i * 0.12), mx + L * 0.1 + i * L * 0.04, H * (0.38 + i * 0.12) + ww); ctx.stroke(); } }
    ctx.restore();
    if (f.lure) { ctx.save(); ctx.lineWidth *= 0.8; ctx.beginPath(); ctx.moveTo(L * 0.28, -H * 0.42); const bx = L * 0.58, by = -H * 0.95 + Math.sin(t * 2) * H * 0.05; ctx.quadraticCurveTo(L * 0.4, -H * 1.05, bx, by); ctx.stroke(); const gl = 0.6 + 0.4 * Math.sin(t * 5); const rg = ctx.createRadialGradient(bx, by, 0, bx, by, L * 0.12); rg.addColorStop(0, 'rgba(255,255,170,' + gl + ')'); rg.addColorStop(1, 'rgba(255,255,170,0)'); ctx.fillStyle = rg; circ(ctx, bx, by, L * 0.12); ctx.fill(); circ(ctx, bx, by, L * 0.035); fs(ctx, '#fff7a0'); ctx.restore(); }
    if (f.bell) { circ(ctx, L * 0.3, H * 0.5, L * 0.04); fs(ctx, '#ffd23f'); }
    return { hx: ex, hy: -H * 0.45, hr: L * 0.08 };
  }

  function drawShark(ctx, a, P, s, t) {
    const f = a.f, L = s, H = s * (f.kind === 'whaleshark' ? 0.32 : f.kind === 'meg' ? 0.36 : 0.27), sw = Math.sin(t * a.wf * a.ms * 0.6), ff = C(P.c1, -6);
    const body = a.galaxy || a.shine || a.rainbow ? P.c1 : P.c1;
    // tail (heterocercal)
    ctx.save(); ctx.translate(-L * 0.4, 0); ctx.rotate(sw * 0.2);
    ctx.beginPath(); ctx.moveTo(4, -H * 0.12); ctx.quadraticCurveTo(-L * 0.12, -H * 0.5, -L * 0.2, -H * 1.0); ctx.quadraticCurveTo(-L * 0.12, -H * 0.1, -L * 0.13, H * 0.55); ctx.quadraticCurveTo(-L * 0.06, H * 0.2, 4, H * 0.12); ctx.closePath(); fs(ctx, a.galaxy ? '#3b2c8f' : ff);
    ctx.restore();
    // fins
    ctx.beginPath(); ctx.moveTo(L * 0.08, -H * 0.4); ctx.quadraticCurveTo(-L * 0.02, -H * 1.25, -L * 0.12, -H * 1.3); ctx.quadraticCurveTo(-L * 0.08, -H * 0.8, -L * 0.15, -H * 0.38); ctx.closePath(); fs(ctx, a.galaxy ? '#3b2c8f' : ff);
    ctx.beginPath(); ctx.moveTo(-L * 0.24, -H * 0.3); ctx.lineTo(-L * 0.3, -H * 0.55); ctx.lineTo(-L * 0.32, -H * 0.25); ctx.closePath(); fs(ctx, ff);
    // body
    const bp = new Path2D();
    const nose = f.kind === 'goblin' ? 0.5 : 0.52;
    bp.moveTo(L * nose, H * 0.06);
    bp.bezierCurveTo(L * 0.48, -H * 0.55, L * 0.1, -H * 0.6, -L * 0.4, -H * 0.13);
    bp.lineTo(-L * 0.4, H * 0.12);
    bp.bezierCurveTo(L * 0.05, H * 0.62, L * 0.42, H * 0.5, L * nose, H * 0.06); bp.closePath();
    paintBody(ctx, a, P.c1 === body ? Object.assign({}, P, { c2: [P.c1[0], 10, 94] }) : P, bp, -L * 0.5, -H * 0.5, L, H, t);
    if (f.kind === 'hammer') { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(L * 0.38, -H * 0.55, L * 0.12, H * 1.1, L * 0.05) : ctx.rect(L * 0.38, -H * 0.55, L * 0.12, H * 1.1); fs(ctx, C(P.c1, 2)); }
    if (f.kind === 'goblin') { ctx.beginPath(); ctx.moveTo(L * 0.4, -H * 0.3); ctx.lineTo(L * 0.72, -H * 0.18); ctx.lineTo(L * 0.45, -H * 0.05); ctx.closePath(); fs(ctx, C(P.c1, 3)); }
    // gills
    ctx.save(); ctx.lineWidth *= 0.7; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(L * (0.2 - i * 0.04), -H * 0.15); ctx.quadraticCurveTo(L * (0.18 - i * 0.04), 0, L * (0.2 - i * 0.04), H * 0.15); ctx.stroke(); } ctx.restore();
    if (f.kind === 'frilled') { ctx.save(); ctx.strokeStyle = '#e04a6a'; ctx.lineWidth = Math.max(2, L * 0.02); for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(L * (0.24 - i * 0.03), -H * 0.2); ctx.lineTo(L * (0.24 - i * 0.03) - L * 0.02, H * 0.25 + Math.sin(t * 4 + i) * H * 0.05); ctx.stroke(); } ctx.restore(); }
    // pectoral
    ctx.beginPath(); ctx.moveTo(L * 0.12, H * 0.25); ctx.quadraticCurveTo(L * 0.02, H * 0.75 + sw * H * 0.1, -L * 0.1, H * 0.8 + sw * H * 0.1); ctx.quadraticCurveTo(-L * 0.02, H * 0.45, -L * 0.02, H * 0.2); ctx.closePath(); fs(ctx, ff);
    // face
    const ex = f.kind === 'hammer' ? L * 0.44 : L * 0.33, ey = f.kind === 'hammer' ? -H * 0.48 : -H * 0.14;
    eye(ctx, ex, ey, L * 0.035, a, t, { angry: f.kind === 'meg' || a.rarity >= 4 });
    if (f.kind === 'hammer') eye(ctx, ex, H * 0.48, L * 0.03, a, t);
    ctx.save(); ctx.lineWidth *= 0.8;
    const open = f.kind === 'meg' ? 0.12 + 0.06 * Math.sin(t * 2) : 0.04;
    ctx.beginPath(); ctx.moveTo(L * 0.22, H * 0.22); ctx.quadraticCurveTo(L * 0.35, H * (0.28 + open), L * 0.47, H * 0.14); ctx.lineTo(L * 0.44, H * 0.1); ctx.quadraticCurveTo(L * 0.33, H * 0.2, L * 0.24, H * 0.18); ctx.closePath(); fs(ctx, f.kind === 'whaleshark' ? '#2b2b3a' : '#8a2235');
    if (f.kind !== 'whaleshark') { ctx.fillStyle = '#fff'; const nt = f.kind === 'meg' ? 7 : 5; for (let i = 0; i < nt; i++) { const tx = L * (0.25 + i * 0.2 / nt); ctx.beginPath(); ctx.moveTo(tx, H * 0.18); ctx.lineTo(tx + L * 0.012, H * (0.24 + open * 0.6)); ctx.lineTo(tx + L * 0.024, H * 0.17); ctx.closePath(); ctx.fill(); ctx.stroke(); } }
    ctx.restore();
    if (f.kind === 'meg') { ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth *= 0.8; ctx.beginPath(); ctx.moveTo(-L * 0.05, -H * 0.3); ctx.lineTo(L * 0.05, -H * 0.05); ctx.moveTo(0, -H * 0.32); ctx.lineTo(L * 0.1, -H * 0.08); ctx.stroke(); ctx.restore(); }
    return { hx: L * 0.25, hy: -H * 0.45, hr: L * 0.06 };
  }

  function drawWhale(ctx, a, P, s, t) {
    const f = a.f, L = s, H = s * (f.kind === 'beluga' || f.kind === 'narwhal' ? 0.36 : 0.32), sw = Math.sin(t * 1.8 * a.ms);
    const ff = a.galaxy ? '#3b2c8f' : C(P.c1, -5);
    // fluke
    ctx.save(); ctx.translate(-L * 0.42, -H * 0.05); ctx.rotate(sw * 0.25);
    ctx.beginPath(); ctx.moveTo(4, -H * 0.08); ctx.quadraticCurveTo(-L * 0.08, -H * 0.15, -L * 0.14, -H * 0.55); ctx.quadraticCurveTo(-L * 0.06, -H * 0.05, -L * 0.1, 0); ctx.quadraticCurveTo(-L * 0.06, H * 0.05, -L * 0.14, H * 0.5); ctx.quadraticCurveTo(-L * 0.08, H * 0.15, 4, H * 0.08); ctx.closePath(); fs(ctx, ff);
    ctx.restore();
    const bp = new Path2D();
    if (f.kind === 'sperm') { bp.moveTo(L * 0.5, -H * 0.1); bp.lineTo(L * 0.5, H * 0.25); bp.quadraticCurveTo(L * 0.5, H * 0.5, L * 0.2, H * 0.5); bp.quadraticCurveTo(-L * 0.2, H * 0.45, -L * 0.42, H * 0.08); bp.lineTo(-L * 0.42, -H * 0.15); bp.quadraticCurveTo(-L * 0.1, -H * 0.5, L * 0.2, -H * 0.5); bp.quadraticCurveTo(L * 0.5, -H * 0.5, L * 0.5, -H * 0.1); }
    else { bp.moveTo(L * 0.5, H * 0.05); bp.bezierCurveTo(L * 0.5, -H * 0.62, -L * 0.05, -H * 0.55, -L * 0.42, -H * 0.15); bp.lineTo(-L * 0.42, H * 0.05); bp.bezierCurveTo(-L * 0.1, H * 0.55, L * 0.5, H * 0.6, L * 0.5, H * 0.05); }
    bp.closePath();
    if (f.kind === 'narwhal') { ctx.save(); ctx.lineWidth *= 0.8; ctx.beginPath(); ctx.moveTo(L * 0.45, -H * 0.05); ctx.lineTo(L * 0.95, -H * 0.25); ctx.lineTo(L * 0.46, H * 0.04); ctx.closePath(); fs(ctx, '#f3ead2'); for (let i = 1; i < 6; i++) { const x = L * (0.46 + i * 0.08); ctx.beginPath(); ctx.moveTo(x, -H * 0.05 - i * H * 0.033); ctx.lineTo(x + L * 0.02, -H * 0.0 - i * H * 0.033); ctx.stroke(); } ctx.restore(); }
    paintBody(ctx, a, Object.assign({}, P, { c2: [P.c1[0], 15, 90] }), bp, -L * 0.5, -H * 0.5, L, H, t);
    if (f.kind === 'blue' || f.kind === 'humpback' || f.kind === 'bowhead') { ctx.save(); ctx.lineWidth *= 0.5; ctx.globalAlpha = 0.5; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(L * 0.4, H * (0.18 + i * 0.05)); ctx.quadraticCurveTo(L * 0.1, H * (0.3 + i * 0.04), -L * 0.05, H * (0.2 + i * 0.05)); ctx.stroke(); } ctx.restore(); }
    // flipper
    const fl = f.kind === 'humpback' ? 0.32 : 0.16;
    ctx.save(); ctx.translate(L * 0.15, H * 0.25); ctx.rotate(0.6 + sw * 0.25); ell(ctx, L * fl * 0.5, 0, L * fl * 0.55, H * 0.1); fs(ctx, ff); ctx.restore();
    // face
    eye(ctx, L * 0.3, H * 0.05, L * 0.028, a, t);
    ctx.save(); ctx.lineWidth *= 0.8; ctx.beginPath(); ctx.moveTo(L * 0.48, H * 0.18); ctx.quadraticCurveTo(L * 0.3, H * 0.3, L * 0.18, H * 0.16); ctx.stroke(); ctx.restore();
    // spout
    const sp = (t * 0.5 + a.v * 3) % 4;
    if (sp < 1) { ctx.save(); ctx.globalAlpha = 1 - sp; ctx.fillStyle = 'rgba(200,240,255,0.9)'; ctx.lineWidth *= 0.6; for (let i = 0; i < 6; i++) { const an = -Math.PI / 2 + (i - 2.5) * 0.25; circ(ctx, L * 0.2 + Math.cos(an) * sp * L * 0.25, -H * 0.5 + Math.sin(an) * sp * L * 0.3, L * 0.025); ctx.fill(); ctx.stroke(); } ctx.restore(); }
    if (f.hat) santaHat(ctx, L * 0.25, -H * 0.42, L * 0.08, t);
    return { hx: L * 0.25, hy: -H * 0.47, hr: L * 0.06 };
  }

  function drawDolphin(ctx, a, P, s, t) {
    const f = a.f, L = s, H = s * 0.26, sw = Math.sin(t * 3 * a.ms);
    const ff = a.galaxy ? '#3b2c8f' : C(P.c1, -5);
    ctx.save(); ctx.translate(-L * 0.4, 0); ctx.rotate(sw * 0.3);
    ctx.beginPath(); ctx.moveTo(4, -H * 0.08); ctx.quadraticCurveTo(-L * 0.08, -H * 0.2, -L * 0.13, -H * 0.6); ctx.quadraticCurveTo(-L * 0.05, -H * 0.1, -L * 0.08, 0); ctx.quadraticCurveTo(-L * 0.05, H * 0.1, -L * 0.13, H * 0.6); ctx.quadraticCurveTo(-L * 0.08, H * 0.2, 4, H * 0.08); ctx.closePath(); fs(ctx, ff);
    ctx.restore();
    ctx.beginPath(); ctx.moveTo(L * 0.05, -H * 0.42); ctx.quadraticCurveTo(-L * 0.02, -H * 1.3, -L * 0.15, -H * 1.1); ctx.quadraticCurveTo(-L * 0.08, -H * 0.7, -L * 0.15, -H * 0.35); ctx.closePath(); fs(ctx, ff);
    const bp = new Path2D();
    bp.moveTo(L * 0.5, H * 0.12); bp.quadraticCurveTo(L * 0.42, H * 0.0, L * 0.35, -H * 0.15);
    bp.bezierCurveTo(L * 0.25, -H * 0.62, -L * 0.15, -H * 0.5, -L * 0.42, -H * 0.12); bp.lineTo(-L * 0.42, H * 0.1);
    bp.bezierCurveTo(-L * 0.1, H * 0.5, L * 0.3, H * 0.45, L * 0.5, H * 0.12); bp.closePath();
    paintBody(ctx, a, Object.assign({}, P, { c2: f.kind === 'orca' ? [0, 0, 98] : [P.c1[0], 15, 90] }), bp, -L * 0.5, -H * 0.5, L, H, t);
    if (f.kind === 'orca') { ell(ctx, L * 0.2, -H * 0.18, L * 0.06, H * 0.12, -0.2); ctx.fillStyle = '#fff'; ctx.fill(); }
    ctx.save(); ctx.translate(L * 0.12, H * 0.25); ctx.rotate(0.7 + sw * 0.3); ell(ctx, L * 0.06, 0, L * 0.08, H * 0.12); fs(ctx, ff); ctx.restore();
    eye(ctx, L * 0.28, -H * 0.08, L * 0.035, a, t);
    ctx.save(); ctx.lineWidth *= 0.8; ctx.beginPath(); ctx.moveTo(L * 0.5, H * 0.12); ctx.quadraticCurveTo(L * 0.38, H * 0.25, L * 0.3, H * 0.1); ctx.stroke(); ctx.restore();
    if (f.stars) for (let i = 0; i < 4; i++) { star(ctx, -L * 0.2 + i * L * 0.12, -H * 0.1 + Math.sin(t * 2 + i) * 3, L * 0.025, '#fff7a0'); }
    return { hx: L * 0.2, hy: -H * 0.45, hr: L * 0.05 };
  }

  function drawOctopus(ctx, a, P, s, t, opt) {
    const f = a.f, R = s * 0.3, angry = opt && opt.angry, n = opt && opt.many ? 10 : 8;
    const base = C(P.c1, -5), sw = t * 2.2 * a.ms;
    // tentacles
    ctx.save(); ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1) - 0.5, x0 = u * R * 1.5, y0 = R * 0.35;
      const pts = []; for (let k = 0; k <= 8; k++) { const q = k / 8; pts.push([x0 + u * q * R * 1.6 + Math.sin(sw + i * 0.9 + q * 4) * R * 0.35 * q, y0 + q * R * 1.9]); }
      for (let pass = 0; pass < 2; pass++) {
        ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
        for (let k = 1; k < pts.length; k++) ctx.lineTo(pts[k][0], pts[k][1]);
        ctx.lineWidth = pass === 0 ? R * 0.34 + ctx.lineWidth * 0 + 3 : R * 0.34 - 2;
        ctx.strokeStyle = pass === 0 ? OUT : (a.galaxy ? '#4b1d7a' : base); ctx.stroke();
      }
      ctx.fillStyle = C(P.c2, 0, 0.9); for (let k = 2; k < 8; k += 2) { circ(ctx, pts[k][0], pts[k][1] + R * 0.05, R * 0.05); ctx.fill(); }
    }
    ctx.restore();
    if (f.dumbo) { const fl = Math.sin(t * 4) * 0.4; for (const sx of [-1, 1]) { ctx.save(); ctx.translate(sx * R * 0.85, -R * 0.5); ctx.rotate(sx * (0.4 + fl)); ell(ctx, sx * R * 0.25, 0, R * 0.35, R * 0.2); fs(ctx, C(P.c1, 6)); ctx.restore(); } }
    const bp = new Path2D(); bp.ellipse(0, -R * 0.35, R * 0.95, R * 1.05, 0, 0, TAU);
    paintBody(ctx, a, P, bp, -R, -R * 1.4, R * 2, R * 2.1, t, true);
    eye(ctx, -R * 0.35, R * 0.05, R * 0.26, a, t, { angry });
    eye(ctx, R * 0.35, R * 0.05, R * 0.26, a, t + 0.05, { angry });
    ctx.save(); ctx.lineWidth *= 0.8; if (angry) { ctx.beginPath(); ctx.arc(0, R * 0.62, R * 0.2, 1.15 * Math.PI, 1.85 * Math.PI); ctx.stroke(); } else smile(ctx, 0, R * 0.32, R * 0.15); ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ell(ctx, -R * 0.35, -R * 0.85, R * 0.25, R * 0.14, -0.4); ctx.fill();
    if (f.crown) crown(ctx, 0, -R * 1.35, R * 0.35);
    return { hx: 0, hy: -R * 1.38, hr: R * 0.3 };
  }

  function drawSquid(ctx, a, P, s, t) {
    const L = s, H = s * 0.22, sw = t * 3 * a.ms, base = a.galaxy ? '#4b1d7a' : C(P.c1, -4);
    // tentacles trail left
    ctx.save(); ctx.lineCap = 'round';
    for (let i = 0; i < 8; i++) {
      const u = i / 7 - 0.5, long = i === 2 || i === 5;
      const len = L * (long ? 0.65 : 0.4);
      for (let pass = 0; pass < 2; pass++) {
        ctx.beginPath(); ctx.moveTo(-L * 0.05, u * H * 0.8);
        for (let k = 1; k <= 8; k++) { const q = k / 8; ctx.lineTo(-L * 0.05 - q * len, u * H * (0.8 + q * 1.4) + Math.sin(sw + i + q * 5) * H * 0.3 * q); }
        ctx.lineWidth = pass === 0 ? H * 0.2 + 3 : H * 0.2 - 1; ctx.strokeStyle = pass === 0 ? OUT : base; ctx.stroke();
      }
      if (long) { ell(ctx, -L * 0.05 - len, u * H * 2.2 + Math.sin(sw + i + 5) * H * 0.3, H * 0.22, H * 0.14); fs(ctx, base); }
    }
    ctx.restore();
    // mantle (pointing right)
    const bp = new Path2D(); bp.moveTo(L * 0.5, 0); bp.quadraticCurveTo(L * 0.3, -H * 0.75, -L * 0.08, -H * 0.55); bp.lineTo(-L * 0.08, H * 0.55); bp.quadraticCurveTo(L * 0.3, H * 0.75, L * 0.5, 0); bp.closePath();
    const fl = Math.sin(t * 5) * H * 0.15;
    ctx.beginPath(); ctx.moveTo(L * 0.4, -H * 0.15); ctx.lineTo(L * 0.42, -H * 0.9 - fl); ctx.lineTo(L * 0.28, -H * 0.4); ctx.closePath(); fs(ctx, C(P.c1, 6));
    ctx.beginPath(); ctx.moveTo(L * 0.4, H * 0.15); ctx.lineTo(L * 0.42, H * 0.9 + fl); ctx.lineTo(L * 0.28, H * 0.4); ctx.closePath(); fs(ctx, C(P.c1, 6));
    paintBody(ctx, a, P, bp, -L * 0.08, -H * 0.6, L * 0.58, H * 1.2, t);
    ctx.fillStyle = C(P.pc, 0, 0.4); for (let i = 0; i < 6; i++) { circ(ctx, L * (0.05 + i * 0.06), Math.sin(i * 2.3) * H * 0.25, H * 0.07); ctx.fill(); }
    eye(ctx, L * 0.0, -H * 0.15, H * 0.3, a, t);
    return { hx: L * 0.3, hy: -H * 0.6, hr: H * 0.4 };
  }

  function drawCrab(ctx, a, P, s, t) {
    const f = a.f, W = s * 0.55, H = s * 0.3, sw = Math.sin(t * 6 * a.ms), base = C(P.c1, -2);
    ctx.save(); ctx.lineCap = 'round';
    // legs
    const legL = f.kind === 'leggy' ? 1.6 : 1;
    for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) {
      const lx = sx * W * (0.45 + i * 0.12), ly = H * 0.1 + i * H * 0.12, ph = sw * (i % 2 ? 1 : -1) * 0.25;
      const kx = lx + sx * W * 0.35 * legL, ky = ly - H * 0.2 + ph * H, fx = kx + sx * W * 0.12 * legL, fy = ly + H * 0.75 * legL;
      for (let pass = 0; pass < 2; pass++) { ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.lineWidth = pass ? s * 0.035 : s * 0.035 + 3; ctx.strokeStyle = pass ? base : OUT; ctx.stroke(); }
      if (f.furry) { ctx.strokeStyle = '#f6f2e8'; ctx.lineWidth = 1.5; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(kx, ky + k * 3); ctx.lineTo(kx + sx * 6, ky + k * 3 + 6); ctx.stroke(); } }
    }
    ctx.restore();
    // claws
    for (const sx of [-1, 1]) {
      const cx = sx * W * 1.0, cy = -H * 0.35, op = 0.25 + 0.2 * Math.sin(t * 3 + (sx > 0 ? 0 : 1.5));
      ctx.save(); ctx.lineCap = 'round';
      for (let pass = 0; pass < 2; pass++) { ctx.beginPath(); ctx.moveTo(sx * W * 0.6, -H * 0.05); ctx.quadraticCurveTo(sx * W * 0.95, H * 0.05, cx, cy + H * 0.2); ctx.lineWidth = pass ? s * 0.06 : s * 0.06 + 3; ctx.strokeStyle = pass ? base : OUT; ctx.stroke(); }
      ctx.restore();
      ctx.save(); ctx.translate(cx, cy); ctx.scale(sx, 1);
      ctx.beginPath(); ctx.moveTo(0, H * 0.2); ctx.quadraticCurveTo(W * 0.35, H * 0.1, W * 0.35, -H * 0.25); ctx.quadraticCurveTo(W * 0.15, -H * 0.1, W * 0.05, -H * 0.05); ctx.closePath(); fs(ctx, base);
      ctx.rotate(-op); ctx.beginPath(); ctx.moveTo(0, -H * 0.05); ctx.quadraticCurveTo(W * 0.1, -H * 0.55, W * 0.32, -H * 0.5); ctx.quadraticCurveTo(W * 0.2, -H * 0.2, W * 0.06, -H * 0.02); ctx.closePath(); fs(ctx, C(P.c1, 6));
      ctx.restore();
    }
    // shell
    if (f.kind === 'hermit') {
      ctx.save(); ctx.translate(-W * 0.35, -H * 0.45);
      const sp = new Path2D(); sp.ellipse(0, 0, W * 0.7, H * 0.95, -0.2, 0, TAU);
      paintBody(ctx, { v: a.v, pat: 'none', c1: [35, 50, 75], f: {} }, { c1: [35, 50, 75], c2: [35, 40, 90], pc: [20, 50, 50] }, sp, -W, -H * 1.2, W * 2, H * 2.4, t, true);
      ctx.beginPath(); for (let i = 0; i < 40; i++) { const an = i * 0.3, r = W * 0.55 * (1 - i / 45); ctx.lineTo(Math.cos(an) * r * 0.9, Math.sin(an) * r * 1.1); } ctx.stroke();
      ctx.restore();
      ell(ctx, W * 0.35, H * 0.05, W * 0.4, H * 0.45); fs(ctx, base);
    } else if (f.present) {
      ctx.beginPath(); ctx.rect(-W * 0.75, -H * 0.8, W * 1.5, H * 1.2); fs(ctx, base);
      ctx.fillStyle = '#ffd23f'; ctx.fillRect(-W * 0.1, -H * 0.8, W * 0.2, H * 1.2); ctx.fillRect(-W * 0.75, -H * 0.3, W * 1.5, H * 0.2); ctx.strokeRect(-W * 0.75, -H * 0.8, W * 1.5, H * 1.2);
      ell(ctx, -W * 0.18, -H * 0.95, W * 0.2, H * 0.15, -0.4); fs(ctx, '#ffd23f'); ell(ctx, W * 0.18, -H * 0.95, W * 0.2, H * 0.15, 0.4); fs(ctx, '#ffd23f');
    } else {
      const bp = new Path2D(); bp.moveTo(-W * 0.8, H * 0.1); bp.quadraticCurveTo(-W * 0.85, -H * 0.9, 0, -H * 0.9); bp.quadraticCurveTo(W * 0.85, -H * 0.9, W * 0.8, H * 0.1); bp.quadraticCurveTo(0, H * 0.55, -W * 0.8, H * 0.1); bp.closePath();
      paintBody(ctx, a, P, bp, -W * 0.8, -H * 0.9, W * 1.6, H * 1.4, t);
    }
    // eyes on stalks
    for (const sx of [-1, 1]) { ctx.save(); ctx.lineWidth *= 1; ctx.beginPath(); ctx.moveTo(sx * W * 0.2 + (f.kind === 'hermit' ? W * 0.35 : 0), -H * 0.6); ctx.lineTo(sx * W * 0.25 + (f.kind === 'hermit' ? W * 0.35 : 0), -H * 1.15); ctx.stroke(); ctx.restore(); eye(ctx, sx * W * 0.25 + (f.kind === 'hermit' ? W * 0.35 : 0), -H * 1.2, s * 0.05, a, t + sx * 0.1); }
    ctx.save(); ctx.lineWidth *= 0.8; smile(ctx, f.kind === 'hermit' ? W * 0.35 : 0, -H * 0.2, W * 0.15); ctx.restore();
    return { hx: 0, hy: -H * 1.3, hr: W * 0.25 };
  }

  function drawLobster(ctx, a, P, s, t) {
    const f = a.f, L = s, H = s * 0.18, sw = Math.sin(t * 3 * a.ms), base = a.galaxy ? '#4b1d7a' : C(P.c1, -2);
    // antennae
    ctx.save(); ctx.lineWidth *= 0.7; for (const k of [-1, 1]) { ctx.beginPath(); ctx.moveTo(L * 0.3, -H * 0.3); ctx.quadraticCurveTo(L * 0.6, -H * (1.5 + k * 0.3) + sw * H * 0.4, L * 0.25 + k * L * 0.05, -H * 2.6 + sw * H * 0.3); ctx.stroke(); } ctx.restore();
    // legs
    ctx.save(); ctx.lineCap = 'round'; for (let i = 0; i < 4; i++) { const x = L * (0.15 - i * 0.06); ctx.beginPath(); ctx.moveTo(x, H * 0.3); ctx.lineTo(x - L * 0.02, H * 0.9 + Math.sin(t * 6 + i) * H * 0.15); ctx.lineWidth = L * 0.018 + 2; ctx.strokeStyle = OUT; ctx.stroke(); ctx.lineWidth = L * 0.018; ctx.strokeStyle = base; ctx.stroke(); } ctx.restore();
    // tail segments
    for (let i = 4; i >= 0; i--) { const x = -L * 0.05 - i * L * 0.075, r = H * (0.55 - i * 0.05), y = Math.sin(t * 2 + i * 0.5) * H * 0.05 * i; ell(ctx, x, y, L * 0.055, r); fs(ctx, C(P.c1, -i * 2)); }
    ctx.save(); ctx.translate(-L * 0.42, Math.sin(t * 2 + 2.5) * H * 0.2); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-L * 0.08, -H * 0.6); ctx.lineTo(-L * 0.1, 0); ctx.lineTo(-L * 0.08, H * 0.6); ctx.closePath(); fs(ctx, C(P.c1, 5)); ctx.restore();
    // carapace
    const bp = new Path2D(); bp.ellipse(L * 0.14, 0, L * 0.2, H * 0.62, 0, 0, TAU);
    paintBody(ctx, a, P, bp, -L * 0.06, -H * 0.62, L * 0.4, H * 1.24, t);
    // claws
    for (const k of [-1, 1]) {
      const op = 0.2 + 0.2 * Math.sin(t * 2.5 + k);
      ctx.save(); ctx.translate(L * 0.3, k * H * 0.2);
      ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(L * 0.12, k * H * 0.5); ctx.lineWidth = L * 0.035 + 3; ctx.strokeStyle = OUT; ctx.stroke(); ctx.lineWidth = L * 0.035; ctx.strokeStyle = base; ctx.stroke();
      ctx.translate(L * 0.12, k * H * 0.5); const cs = f.small ? 0.7 : 1;
      ell(ctx, L * 0.1 * cs, 0, L * 0.11 * cs, H * 0.42 * cs); fs(ctx, base);
      ctx.rotate(-op * k); ell(ctx, L * 0.22 * cs, -k * H * 0.15, L * 0.08 * cs, H * 0.16 * cs); fs(ctx, C(P.c1, 6));
      ctx.restore();
    }
    eye(ctx, L * 0.3, -H * 0.38, L * 0.03, a, t);
    return { hx: L * 0.15, hy: -H * 0.62, hr: L * 0.05 };
  }

  function star(ctx, x, y, r, fill, n) {
    n = n || 5; ctx.beginPath();
    for (let i = 0; i < n * 2; i++) { const an = -Math.PI / 2 + i * Math.PI / n, rr = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(an) * rr, y + Math.sin(an) * rr); }
    ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
  }

  function drawStarfish(ctx, a, P, s, t) {
    const f = a.f, R = s * 0.45;
    ctx.save(); ctx.rotate(Math.sin(t * 0.8 * a.ms) * 0.3);
    const bp = new Path2D();
    if (f.arms === 0) { bp.arc(0, 0, R * 0.85, 0, TAU); }
    else {
      const n = f.arms, inner = n > 8 ? 0.55 : 0.42;
      for (let i = 0; i < n; i++) {
        const an = -Math.PI / 2 + i * TAU / n, an2 = an + Math.PI / n, wig = Math.sin(t * 2 + i) * 0.06;
        const tip = [Math.cos(an + wig) * R, Math.sin(an + wig) * R], valley = [Math.cos(an2) * R * inner, Math.sin(an2) * R * inner];
        if (i === 0) bp.moveTo(Math.cos(an - Math.PI / n) * R * inner, Math.sin(an - Math.PI / n) * R * inner);
        bp.quadraticCurveTo(Math.cos(an - 0.12) * R * 0.95, Math.sin(an - 0.12) * R * 0.95, tip[0], tip[1]);
        bp.quadraticCurveTo(Math.cos(an + 0.12) * R * 0.95, Math.sin(an + 0.12) * R * 0.95, valley[0], valley[1]);
      }
      bp.closePath();
    }
    paintBody(ctx, a, P, bp, -R, -R, R * 2, R * 2, t, true);
    ctx.fillStyle = C(P.c1, 18, 0.7); const r = seeded(a.v);
    if (f.arms === 0) { ctx.save(); ctx.lineWidth *= 0.7; for (let i = 0; i < 5; i++) { const an = -Math.PI / 2 + i * TAU / 5; ell(ctx, Math.cos(an) * R * 0.4, Math.sin(an) * R * 0.4, R * 0.18, R * 0.07, an); ctx.stroke(); } ctx.restore(); }
    else for (let i = 0; i < 16; i++) { const an = r() * TAU, d = r() * R * 0.7; circ(ctx, Math.cos(an) * d, Math.sin(an) * d, R * 0.04); ctx.fill(); }
    if (f.thorns) { ctx.fillStyle = '#ffd36b'; for (let i = 0; i < 20; i++) { const an = r() * TAU, d = r() * R * 0.75; star(ctx, Math.cos(an) * d, Math.sin(an) * d, R * 0.06, '#ffd36b', 4); } }
    ctx.restore();
    eye(ctx, -R * 0.15, -R * 0.08, R * 0.12, a, t); eye(ctx, R * 0.15, -R * 0.08, R * 0.12, a, t + 0.05);
    ctx.save(); ctx.lineWidth *= 0.8; smile(ctx, 0, R * 0.08, R * 0.1); ctx.restore();
    return { hx: 0, hy: -R * 0.9, hr: R * 0.25 };
  }

  function drawSeahorse(ctx, a, P, s, t) {
    const H = s, sw = Math.sin(t * 2 * a.ms), base = C(P.c1, -3);
    ctx.save(); ctx.rotate(sw * 0.08);
    // tail curl
    ctx.save(); ctx.lineCap = 'round';
    for (let pass = 0; pass < 2; pass++) { ctx.beginPath(); ctx.moveTo(-H * 0.05, H * 0.15); ctx.quadraticCurveTo(-H * 0.12, H * 0.38, H * 0.02, H * 0.42); ctx.arc(-H * 0.02, H * 0.36, H * 0.06, 0.6, -2.5, true); ctx.lineWidth = pass ? H * 0.07 : H * 0.07 + 3; ctx.strokeStyle = pass ? base : OUT; ctx.stroke(); }
    ctx.restore();
    // fin
    const fl = Math.sin(t * 12) * H * 0.02;
    ctx.beginPath(); ctx.moveTo(-H * 0.12, -H * 0.08); ctx.quadraticCurveTo(-H * 0.3 + fl, -H * 0.02, -H * 0.13, H * 0.1); ctx.closePath(); fs(ctx, C(P.c3, 0, 0.85));
    // body
    const bp = new Path2D(); bp.moveTo(0, -H * 0.3); bp.bezierCurveTo(H * 0.2, -H * 0.2, H * 0.18, H * 0.1, 0, H * 0.2); bp.bezierCurveTo(-H * 0.12, H * 0.12, -H * 0.16, -H * 0.2, 0, -H * 0.3); bp.closePath();
    paintBody(ctx, a, P, bp, -H * 0.15, -H * 0.3, H * 0.33, H * 0.5, t);
    ctx.save(); ctx.lineWidth *= 0.6; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(H * (0.12 - Math.abs(i - 2) * 0.01), -H * 0.18 + i * H * 0.07); ctx.lineTo(H * 0.02, -H * 0.15 + i * H * 0.07); ctx.stroke(); } ctx.restore();
    // head + snout
    ctx.beginPath(); ctx.moveTo(H * 0.08, -H * 0.38); ctx.lineTo(H * 0.3, -H * 0.36); ctx.lineTo(H * 0.31, -H * 0.3); ctx.lineTo(H * 0.08, -H * 0.3); ctx.closePath(); fs(ctx, base);
    circ(ctx, H * 0.03, -H * 0.37, H * 0.11); fs(ctx, a.galaxy ? '#3b2c8f' : C(P.c1, 0));
    ctx.beginPath(); ctx.moveTo(-H * 0.02, -H * 0.47); ctx.lineTo(0, -H * 0.56); ctx.lineTo(H * 0.04, -H * 0.47); ctx.stroke();
    eye(ctx, H * 0.06, -H * 0.39, H * 0.045, a, t);
    ctx.restore();
    return { hx: H * 0.03, hy: -H * 0.5, hr: H * 0.07 };
  }

  function drawSponge(ctx, a, P, s, t) {
    const W = s * 0.38, H = s * 0.45, sq = 1 + Math.sin(t * 2 * a.ms) * 0.04, vase = a.v > 0.5;
    ctx.save(); ctx.scale(1 / sq, sq);
    const bp = new Path2D();
    if (vase) { bp.moveTo(-W * 0.6, H * 0.5); bp.quadraticCurveTo(-W * 1.1, -H * 0.1, -W * 0.85, -H * 0.55); bp.quadraticCurveTo(0, -H * 0.7, W * 0.85, -H * 0.55); bp.quadraticCurveTo(W * 1.1, -H * 0.1, W * 0.6, H * 0.5); bp.closePath(); }
    else { const n = 14; for (let i = 0; i <= n; i++) { const an = i / n * TAU, wob = 1 + 0.08 * Math.sin(an * 5 + a.v * 10); const x = Math.cos(an) * W * wob, y = Math.sin(an) * H * wob * 0.95; if (i) bp.lineTo(x, y); else bp.moveTo(x, y); } bp.closePath(); }
    paintBody(ctx, a, P, bp, -W, -H * 0.6, W * 2, H * 1.2, t, true);
    const r = seeded(a.v); ctx.save(); ctx.clip(bp); ctx.fillStyle = C(P.c1, -22, 0.8);
    for (let i = 0; i < 11; i++) { ell(ctx, (r() - 0.5) * W * 1.7, (r() - 0.5) * H * 1.1, W * (0.06 + r() * 0.08), H * (0.05 + r() * 0.06)); ctx.fill(); }
    ctx.restore();
    if (vase) { ell(ctx, 0, -H * 0.57, W * 0.7, H * 0.08); fs(ctx, C(P.c1, -30)); }
    ctx.restore();
    eye(ctx, -W * 0.3, -H * 0.1, W * 0.2, a, t); eye(ctx, W * 0.3, -H * 0.1, W * 0.2, a, t + 0.03);
    ctx.save(); ctx.lineWidth *= 0.8; smile(ctx, 0, H * 0.1, W * 0.25, true); ctx.restore();
    return { hx: 0, hy: -H * 0.6, hr: W * 0.3 };
  }

  function drawSnail(ctx, a, P, s, t) {
    const f = a.f, R = s * 0.28, cr = Math.sin(t * 1.5 * a.ms) * s * 0.03;
    if (f.nautilus) {
      ctx.save(); ctx.lineCap = 'round'; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(R * 0.6, R * 0.1); ctx.quadraticCurveTo(R * 1.1, R * (0.1 + i * 0.08), R * 1.4 + Math.sin(t * 3 + i) * R * 0.1, R * (-0.1 + i * 0.12)); ctx.lineWidth = R * 0.08 + 2; ctx.strokeStyle = OUT; ctx.stroke(); ctx.lineWidth = R * 0.08; ctx.strokeStyle = C(P.c2, -10); ctx.stroke(); } ctx.restore();
      const bp = new Path2D(); bp.arc(0, 0, R, 0, TAU);
      paintBody(ctx, a, Object.assign({}, P, { pat: 'none' }), bp, -R, -R, R * 2, R * 2, t, true);
      ctx.save(); ctx.clip(bp); ctx.strokeStyle = C(P.pc, -10, 0.7); ctx.lineWidth = R * 0.12; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(-R * 0.2, R * 0.1, R * (0.3 + i * 0.25), Math.PI * 1.1, Math.PI * 1.6); ctx.stroke(); } ctx.restore();
      ctx.beginPath(); for (let i = 0; i < 50; i++) { const an = i * 0.25, r = R * 0.9 * Math.pow(0.97, i); ctx.lineTo(Math.cos(an) * r * 0.6 - R * 0.1, Math.sin(an) * r * 0.6); } ctx.stroke();
      eye(ctx, R * 0.75, -R * 0.2, R * 0.16, a, t);
      return { hx: 0, hy: -R * 1.05, hr: R * 0.3 };
    }
    // foot
    ctx.beginPath(); ctx.moveTo(-R * 1.2, R * 0.75); ctx.quadraticCurveTo(-R * 1.3, R * 0.35, -R * 0.6, R * 0.35); ctx.lineTo(R * 1.0 + cr, R * 0.2); ctx.quadraticCurveTo(R * 1.45 + cr, R * 0.3, R * 1.4 + cr, R * 0.75); ctx.closePath(); fs(ctx, C(P.c2, -15));
    // stalks
    ctx.save(); for (const k of [0, 1]) { ctx.beginPath(); ctx.moveTo(R * 1.1 + cr, R * 0.3); ctx.lineTo(R * (1.25 + k * 0.25) + cr, -R * 0.35 + Math.sin(t * 2 + k) * R * 0.05); ctx.stroke(); } ctx.restore();
    eye(ctx, R * 1.25 + cr, -R * 0.4, R * 0.15, a, t); eye(ctx, R * 1.5 + cr, -R * 0.38, R * 0.15, a, t + 0.04);
    ctx.save(); ctx.lineWidth *= 0.8; smile(ctx, R * 1.2 + cr, R * 0.42, R * 0.12); ctx.restore();
    // shell
    const bp = new Path2D();
    if (f.cone) { bp.moveTo(-R * 1.25, R * 0.45); bp.quadraticCurveTo(-R * 0.6, -R * 1.2, R * 0.9, R * 0.4); bp.closePath(); }
    else if (f.cowrie) bp.ellipse(-R * 0.1, -R * 0.05, R * 1.05, R * 0.65, 0, 0, TAU);
    else bp.arc(-R * 0.15, -R * 0.15, R * 0.85, 0, TAU);
    paintBody(ctx, a, P, bp, -R * 1.2, -R * 1.1, R * 2.2, R * 1.7, t, true);
    ctx.save(); ctx.lineWidth *= 0.8;
    if (f.cone) { for (let i = 1; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-R * 1.2 + i * R * 0.35, R * 0.45 - i * R * 0.05); ctx.quadraticCurveTo(-R * 0.9 + i * R * 0.3, -R * 0.2, -R * 0.75 + i * R * 0.35, -R * 0.4 + i * R * 0.2); ctx.stroke(); } }
    else if (!f.cowrie) { ctx.beginPath(); for (let i = 0; i < 46; i++) { const an = i * 0.27, r = R * 0.75 * Math.pow(0.955, i); ctx.lineTo(-R * 0.15 + Math.cos(an) * r, -R * 0.15 + Math.sin(an) * r); } ctx.stroke(); }
    ctx.restore();
    return { hx: -R * 0.15, hy: -R * 1.0, hr: R * 0.3 };
  }

  function drawUrchin(ctx, a, P, s, t) {
    const f = a.f, R = s * (f.long ? 0.22 : 0.3), n = f.snow ? 0 : 26, len = f.long ? 1.15 : 0.55;
    ctx.save(); ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const an = i / n * TAU + Math.sin(t * 1.5 + i) * 0.06, l = R * (1 + len * (0.8 + 0.2 * Math.sin(i * 7.3)));
      for (let pass = 0; pass < 2; pass++) { ctx.beginPath(); ctx.moveTo(Math.cos(an) * R * 0.8, Math.sin(an) * R * 0.8); ctx.lineTo(Math.cos(an) * l, Math.sin(an) * l); ctx.lineWidth = pass ? R * 0.07 : R * 0.07 + 2.5; ctx.strokeStyle = pass ? C(P.c1, -12) : OUT; ctx.stroke(); }
    }
    ctx.restore();
    const bp = new Path2D();
    if (f.snow) { for (let i = 0; i <= 16; i++) { const an = i / 16 * TAU, rr = R * (1 + 0.1 * Math.sin(i * 3)); if (i) bp.lineTo(Math.cos(an) * rr, Math.sin(an) * rr); else bp.moveTo(rr, 0); } bp.closePath(); }
    else bp.arc(0, 0, R, 0, TAU);
    paintBody(ctx, a, f.snow ? Object.assign({}, P, { c1: [205, 40, 96], c2: [205, 30, 100] }) : P, bp, -R, -R, R * 2, R * 2, t, true);
    eye(ctx, -R * 0.35, -R * 0.1, R * 0.25, a, t); eye(ctx, R * 0.35, -R * 0.1, R * 0.25, a, t + 0.05);
    ctx.save(); ctx.lineWidth *= 0.8; smile(ctx, 0, R * 0.2, R * 0.2); ctx.restore();
    return { hx: 0, hy: -R * 1.05, hr: R * 0.4 };
  }

  function drawSealion(ctx, a, P, s, t) {
    const f = a.f, L = s, H = s * 0.3, sw = Math.sin(t * 2.5 * a.ms), ff = C(P.c1, -10);
    ctx.save(); ctx.translate(-L * 0.38, H * 0.1); ctx.rotate(sw * 0.3);
    ctx.beginPath(); ctx.moveTo(4, 0); ctx.quadraticCurveTo(-L * 0.12, -H * 0.5, -L * 0.18, -H * 0.3); ctx.quadraticCurveTo(-L * 0.1, 0, -L * 0.18, H * 0.4); ctx.quadraticCurveTo(-L * 0.1, H * 0.4, 4, H * 0.1); ctx.closePath(); fs(ctx, ff);
    ctx.restore();
    const bp = new Path2D();
    bp.moveTo(L * 0.48, -H * 0.15); bp.quadraticCurveTo(L * 0.5, -H * 0.6, L * 0.25, -H * 0.6);
    bp.bezierCurveTo(0, -H * 0.6, -L * 0.25, -H * 0.4, -L * 0.4, -H * 0.05); bp.quadraticCurveTo(-L * 0.25, H * 0.5, L * 0.1, H * 0.45);
    bp.quadraticCurveTo(L * 0.4, H * 0.35, L * 0.48, -H * 0.15); bp.closePath();
    paintBody(ctx, a, P, bp, -L * 0.4, -H * 0.6, L * 0.9, H * 1.1, t);
    if (f.spots) { ctx.save(); ctx.clip(bp); ctx.fillStyle = 'rgba(30,30,40,0.35)'; const r = seeded(a.v); for (let i = 0; i < 10; i++) { circ(ctx, -L * 0.3 + r() * L * 0.6, -H * 0.4 + r() * H * 0.6, L * 0.02); ctx.fill(); } ctx.restore(); }
    ctx.save(); ctx.translate(L * 0.12, H * 0.3); ctx.rotate(0.4 + sw * 0.35); ell(ctx, L * 0.08, 0, L * 0.11, H * 0.15); fs(ctx, ff); ctx.restore();
    eye(ctx, L * 0.3, -H * 0.3, L * 0.035, a, t);
    circ(ctx, L * 0.48, -H * 0.2, L * 0.025); ctx.fillStyle = OUT; ctx.fill();
    ctx.save(); ctx.lineWidth *= 0.6; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(L * 0.44, -H * 0.08); ctx.lineTo(L * 0.58, -H * (0.15 - i * 0.08)); ctx.stroke(); } ctx.restore();
    if (f.tusks) { for (const k of [0, 1]) { ctx.beginPath(); ctx.moveTo(L * (0.4 + k * 0.04), H * 0.02); ctx.quadraticCurveTo(L * (0.42 + k * 0.04), H * 0.35, L * (0.38 + k * 0.04), H * 0.55); ctx.lineTo(L * (0.43 + k * 0.04), H * 0.03); ctx.closePath(); fs(ctx, '#f5ecd2'); } }
    if (f.hat) santaHat(ctx, L * 0.28, -H * 0.55, L * 0.07, t);
    return { hx: L * 0.28, hy: -H * 0.6, hr: L * 0.06 };
  }

  function drawSeaspider(ctx, a, P, s, t) {
    const R = s * 0.08, base = C(P.c1, -5);
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let i = 0; i < 8; i++) {
      const side = i < 4 ? -1 : 1, k = i % 4, an = side * (0.4 + k * 0.45) + (side < 0 ? Math.PI : 0) * 0;
      const baseAn = (k - 1.5) * 0.5 + (side < 0 ? Math.PI : 0), ph = Math.sin(t * 4 * a.ms + i * 1.3) * 0.15;
      const kx = Math.cos(baseAn + ph) * s * 0.28, ky = -s * 0.15 + Math.sin(baseAn) * s * 0.12;
      const fx = Math.cos(baseAn + ph * 2) * s * 0.48, fy = s * 0.35 + Math.abs(k - 1.5) * s * 0.03;
      for (let pass = 0; pass < 2; pass++) { ctx.beginPath(); ctx.moveTo(0, k * R * 0.6 - R); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.lineWidth = pass ? s * 0.022 : s * 0.022 + 2.5; ctx.strokeStyle = pass ? base : OUT; ctx.stroke(); }
      void an;
    }
    ctx.restore();
    const bp = new Path2D(); bp.ellipse(0, 0, R * 0.9, R * 2, 0, 0, TAU);
    paintBody(ctx, a, P, bp, -R, -R * 2, R * 2, R * 4, t, true);
    circ(ctx, 0, -R * 2.3, R * 0.9); fs(ctx, C(P.c1, 5));
    eye(ctx, -R * 0.35, -R * 2.4, R * 0.4, a, t); eye(ctx, R * 0.35, -R * 2.4, R * 0.4, a, t + 0.05);
    return { hx: 0, hy: -R * 3.1, hr: R * 0.7 };
  }

  function drawPlankton(ctx, a, P, s, t) {
    const f = a.f, R = s * 0.3, pul = 1 + 0.06 * Math.sin(t * 3 * a.ms);
    ctx.save(); ctx.scale(pul, 1 / pul);
    if (f.kind === 'krill') {
      ctx.save(); ctx.lineWidth *= 0.7; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-R * 0.6 + i * R * 0.3, R * 0.2); ctx.lineTo(-R * 0.7 + i * R * 0.3, R * 0.6 + Math.sin(t * 8 + i) * R * 0.1); ctx.stroke(); } ctx.beginPath(); ctx.moveTo(R * 0.9, -R * 0.1); ctx.quadraticCurveTo(R * 1.4, -R * 0.8, R * 1.6, -R * 0.4); ctx.stroke(); ctx.restore();
      const bp = new Path2D(); bp.moveTo(R, 0); bp.quadraticCurveTo(R * 0.6, -R * 0.55, -R * 0.4, -R * 0.35); bp.quadraticCurveTo(-R * 1.2, -R * 0.2, -R * 1.3, R * 0.1); bp.quadraticCurveTo(-R * 0.4, R * 0.35, R, 0); bp.closePath();
      paintBody(ctx, a, Object.assign({}, P, { c1: a.galaxy || a.rainbow || a.shine ? P.c1 : [10, 70, 65] }), bp, -R * 1.3, -R * 0.5, R * 2.3, R, t, true);
      eye(ctx, R * 0.55, -R * 0.12, R * 0.17, a, t);
    } else if (f.kind === 'radio') {
      ctx.save(); ctx.lineWidth *= 0.6; for (let i = 0; i < 16; i++) { const an = i / 16 * TAU + t * 0.2; ctx.beginPath(); ctx.moveTo(Math.cos(an) * R * 0.7, Math.sin(an) * R * 0.7); ctx.lineTo(Math.cos(an) * R * 1.4, Math.sin(an) * R * 1.4); ctx.stroke(); } ctx.restore();
      const bp = new Path2D(); bp.arc(0, 0, R * 0.75, 0, TAU);
      paintBody(ctx, a, P, bp, -R, -R, R * 2, R * 2, t, true);
      ctx.save(); ctx.clip(bp); ctx.lineWidth *= 0.5; for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.arc(0, 0, R * (0.2 + Math.abs(i) * 0.15), 0, TAU); ctx.stroke(); } ctx.restore();
      eye(ctx, -R * 0.22, 0, R * 0.16, a, t); eye(ctx, R * 0.22, 0, R * 0.16, a, t + 0.03);
    } else if (f.kind === 'diatom') {
      const bp = new Path2D(); bp.ellipse(0, 0, R * 1.2, R * 0.55, 0, 0, TAU);
      paintBody(ctx, a, Object.assign({}, P, { c1: a.galaxy || a.rainbow || a.shine ? P.c1 : [95, 55, 60] }), bp, -R * 1.2, -R * 0.55, R * 2.4, R * 1.1, t, true);
      ctx.save(); ctx.clip(bp); ctx.lineWidth *= 0.5; for (let i = -5; i <= 5; i++) { ctx.beginPath(); ctx.moveTo(i * R * 0.2, -R); ctx.lineTo(i * R * 0.2, R); ctx.stroke(); } ctx.restore();
      eye(ctx, -R * 0.3, -R * 0.05, R * 0.18, a, t); eye(ctx, R * 0.3, -R * 0.05, R * 0.18, a, t + 0.03);
    } else {
      ctx.save(); ctx.lineWidth *= 0.6; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-R * 0.6 + i * R * 0.3, R * 0.3); ctx.quadraticCurveTo(-R * 0.6 + i * R * 0.3 + Math.sin(t * 3 + i) * R * 0.3, R * 1.0, -R * 0.6 + i * R * 0.3, R * 1.5); ctx.stroke(); } ctx.restore();
      const bp = new Path2D(); bp.moveTo(-R, R * 0.35); bp.quadraticCurveTo(-R, -R, 0, -R); bp.quadraticCurveTo(R, -R, R, R * 0.35); bp.closePath();
      ctx.save(); ctx.globalAlpha *= 0.85; paintBody(ctx, a, P, bp, -R, -R, R * 2, R * 1.4, t, true); ctx.restore();
      eye(ctx, -R * 0.3, -R * 0.2, R * 0.18, a, t); eye(ctx, R * 0.3, -R * 0.2, R * 0.18, a, t + 0.03);
    }
    ctx.restore();
    return { hx: 0, hy: -R * 1.05, hr: R * 0.4 };
  }

  function drawCoral(ctx, a, P, s, t) {
    const f = a.f, H = s * 0.5;
    ctx.beginPath(); ctx.ellipse(0, H * 0.82, s * 0.32, H * 0.13, 0, 0, TAU); fs(ctx, '#8a7a66');
    if (f.kind === 'brain') {
      const bp = new Path2D(); bp.ellipse(0, H * 0.3, s * 0.42, H * 0.62, 0, Math.PI, TAU); bp.closePath();
      const bp2 = new Path2D(); bp2.moveTo(-s * 0.42, H * 0.3); bp2.ellipse(0, H * 0.3, s * 0.42, H * 0.62, 0, Math.PI, TAU); bp2.lineTo(s * 0.42, H * 0.75); bp2.lineTo(-s * 0.42, H * 0.75); bp2.closePath();
      paintBody(ctx, a, P, bp2, -s * 0.42, -H * 0.32, s * 0.84, H * 1.07, t, true);
      ctx.save(); ctx.clip(bp2); ctx.strokeStyle = C(P.c1, -25, 0.7); ctx.lineWidth *= 0.9; const r = seeded(a.v);
      for (let i = 0; i < 9; i++) { ctx.beginPath(); let x = -s * 0.4 + r() * s * 0.2, y = -H * 0.2 + i * H * 0.11; ctx.moveTo(x, y); for (let k = 0; k < 8; k++) { x += s * 0.1; ctx.quadraticCurveTo(x - s * 0.05, y + (k % 2 ? 1 : -1) * H * 0.1, x, y); } ctx.stroke(); }
      ctx.restore();
    } else if (f.kind === 'fan') {
      const sw = Math.sin(t * 1.2) * 0.06;
      ctx.save(); ctx.rotate(sw);
      const bp = new Path2D(); bp.moveTo(0, H * 0.75); bp.quadraticCurveTo(-s * 0.55, H * 0.1, -s * 0.38, -H * 0.55); bp.quadraticCurveTo(0, -H * 0.95, s * 0.38, -H * 0.55); bp.quadraticCurveTo(s * 0.55, H * 0.1, 0, H * 0.75); bp.closePath();
      ctx.save(); ctx.globalAlpha *= 0.9; paintBody(ctx, a, P, bp, -s * 0.5, -H * 0.9, s, H * 1.65, t, true); ctx.restore();
      ctx.save(); ctx.clip(bp); ctx.lineWidth *= 0.6; ctx.strokeStyle = C(P.c1, -25); for (let i = -6; i <= 6; i++) { ctx.beginPath(); ctx.moveTo(0, H * 0.75); ctx.lineTo(i * s * 0.08, -H); ctx.stroke(); } for (let i = 1; i < 6; i++) { ctx.beginPath(); ctx.arc(0, H * 0.75, H * 0.3 * i, Math.PI, TAU); ctx.stroke(); } ctx.restore();
      ctx.restore();
    } else if (f.kind === 'mushroom') {
      const bp = new Path2D(); bp.ellipse(0, H * 0.35, s * 0.42, H * 0.45, 0, Math.PI, TAU); bp.closePath();
      paintBody(ctx, a, P, bp, -s * 0.42, -H * 0.1, s * 0.84, H * 0.45, t, true);
      ctx.save(); ctx.lineWidth *= 0.6; for (let i = -5; i <= 5; i++) { ctx.beginPath(); ctx.moveTo(i * s * 0.035, H * 0.35); ctx.lineTo(i * s * 0.075, -H * 0.05 + Math.abs(i) * H * 0.04); ctx.stroke(); } ctx.restore();
    } else {
      const r = seeded(a.v), sw = Math.sin(t * 1.4 + a.v * 6) * 0.05;
      const branch = (x, y, an, len, w, d) => {
        const x2 = x + Math.cos(an) * len, y2 = y + Math.sin(an) * len;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y2); ctx.lineWidth = w + 3; ctx.strokeStyle = OUT; ctx.stroke(); ctx.lineWidth = w; ctx.strokeStyle = a.galaxy ? '#5a2a9a' : C(P.c1, d * 4); ctx.stroke();
        if (d < 3) { branch(x2, y2, an - 0.45 + sw + (r() - 0.5) * 0.3, len * 0.72, w * 0.72, d + 1); branch(x2, y2, an + 0.45 + sw + (r() - 0.5) * 0.3, len * 0.72, w * 0.72, d + 1); }
        else { circ(ctx, x2, y2, w * 0.7); ctx.fillStyle = C(P.c2, 10); ctx.fill(); }
      };
      ctx.save(); ctx.lineCap = 'round'; branch(0, H * 0.8, -Math.PI / 2, H * 0.55, s * 0.08, 0); ctx.restore();
    }
    eye(ctx, -s * 0.08, H * 0.42, s * 0.04, a, t); eye(ctx, s * 0.08, H * 0.42, s * 0.04, a, t + 0.05);
    return { hx: 0, hy: -H * 0.3, hr: s * 0.08 };
  }

  function drawManatee(ctx, a, P, s, t) {
    const L = s, H = s * 0.36, sw = Math.sin(t * 1.4 * a.ms);
    ctx.save(); ctx.translate(-L * 0.38, 0); ctx.rotate(sw * 0.2); ell(ctx, -L * 0.1, 0, L * 0.13, H * 0.42); fs(ctx, C(P.c1, -6)); ctx.restore();
    const bp = new Path2D(); bp.moveTo(L * 0.45, H * 0.05); bp.bezierCurveTo(L * 0.45, -H * 0.62, -L * 0.2, -H * 0.62, -L * 0.42, 0); bp.bezierCurveTo(-L * 0.2, H * 0.6, L * 0.45, H * 0.6, L * 0.45, H * 0.05); bp.closePath();
    paintBody(ctx, a, P, bp, -L * 0.42, -H * 0.5, L * 0.87, H, t);
    ctx.save(); ctx.lineWidth *= 0.5; ctx.globalAlpha = 0.4; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(-L * 0.1 + i * L * 0.1, -H * 0.1, H * 0.25, 0.3, 1.2); ctx.stroke(); } ctx.restore();
    ctx.save(); ctx.translate(L * 0.2, H * 0.3); ctx.rotate(0.5 + sw * 0.3); ell(ctx, L * 0.05, 0, L * 0.08, H * 0.12); fs(ctx, C(P.c1, -6)); ctx.restore();
    ell(ctx, L * 0.44, H * 0.08, L * 0.07, H * 0.2); fs(ctx, C(P.c1, 6));
    ctx.fillStyle = OUT; for (let i = 0; i < 5; i++) { circ(ctx, L * 0.43 + (i % 3) * L * 0.015, H * (0.02 + Math.floor(i / 3) * 0.08), 1.2); ctx.fill(); }
    eye(ctx, L * 0.3, -H * 0.12, L * 0.025, a, t);
    ctx.save(); ctx.lineWidth *= 0.7; ctx.beginPath(); ctx.arc(L * 0.42, H * 0.17, L * 0.03, 0.2, 2.6); ctx.stroke(); ctx.restore();
    return { hx: L * 0.25, hy: -H * 0.47, hr: L * 0.06 };
  }

  function drawBarnacle(ctx, a, P, s, t) {
    const R = s * 0.2;
    ell(ctx, 0, R * 1.4, s * 0.45, R * 0.4); fs(ctx, '#7f7a70');
    const pos = [[-R * 1.1, 0.85], [R * 1.1, 0.8], [0, 1.15]];
    pos.forEach(([x, sc], i) => {
      const r = R * sc, by = R * 1.3, ty = by - r * 1.6;
      const cir = (t * 2 * a.ms + i * 1.4) % 4;
      if (cir < 2) { const ex = Math.sin(cir / 2 * Math.PI); ctx.save(); ctx.lineWidth *= 0.6; for (let k = 0; k < 5; k++) { const an = -Math.PI / 2 + (k - 2) * 0.35; ctx.beginPath(); ctx.moveTo(x, ty); ctx.quadraticCurveTo(x + Math.cos(an) * r * ex, ty + Math.sin(an) * r * 1.3 * ex, x + Math.cos(an + 0.4) * r * 1.2 * ex, ty + Math.sin(an + 0.4) * r * 1.6 * ex); ctx.strokeStyle = '#f1d6a8'; ctx.stroke(); } ctx.restore(); }
      const bp = new Path2D(); bp.moveTo(x - r, by); bp.lineTo(x - r * 0.4, ty); bp.lineTo(x + r * 0.4, ty); bp.lineTo(x + r, by); bp.closePath();
      paintBody(ctx, a, P, bp, x - r, ty, r * 2, by - ty, t, true);
      ctx.save(); ctx.lineWidth *= 0.6; ctx.beginPath(); ctx.moveTo(x - r * 0.65, by); ctx.lineTo(x - r * 0.2, ty); ctx.moveTo(x + r * 0.65, by); ctx.lineTo(x + r * 0.2, ty); ctx.stroke(); ctx.restore();
      if (i === 2) { eye(ctx, x - r * 0.3, by - r * 0.6, r * 0.22, a, t); eye(ctx, x + r * 0.3, by - r * 0.6, r * 0.22, a, t + 0.04); }
    });
    return { hx: 0, hy: R * 1.3 - R * 1.15 * 1.6 - R * 0.2, hr: R * 0.4 };
  }

  function drawEel(ctx, a, P, s, t) {
    const f = a.f, L = s * (f.serpent ? 1 : 1), T = s * (f.serpent ? 0.12 : 0.085), n = 22, ph = t * 4 * a.ms;
    const pts = [];
    for (let i = 0; i <= n; i++) { const q = i / n, x = L * 0.45 - q * L * 0.95; pts.push([x, Math.sin(ph - q * 7) * T * 1.4 * (0.3 + q)]); }
    const top = [], bot = [];
    for (let i = 0; i <= n; i++) {
      const q = i / n, w = T * (q < 0.15 ? 0.75 + q * 1.6 : 1 - (q - 0.15) * 0.9);
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[Math.min(n, i + 1)], dx = p1[0] - p0[0], dy = p1[1] - p0[1], d = Math.hypot(dx, dy) || 1;
      top.push([pts[i][0] - dy / d * w, pts[i][1] + dx / d * w]); bot.push([pts[i][0] + dy / d * w, pts[i][1] - dx / d * w]);
    }
    if (f.serpent || f.moray) { ctx.beginPath(); for (let i = 1; i < n - 2; i++) { ctx.moveTo(bot[i][0], bot[i][1]); ctx.lineTo((bot[i][0] + bot[i + 1][0]) / 2, bot[i][1] - T * (f.serpent ? 0.9 : 0.5)); ctx.lineTo(bot[i + 1][0], bot[i + 1][1]); } ctx.fillStyle = f.serpent ? C(P.c3) : C(P.c1, -10); ctx.fill(); ctx.stroke(); }
    const bp = new Path2D(); bp.moveTo(top[0][0], top[0][1]); for (let i = 1; i <= n; i++) bp.lineTo(top[i][0], top[i][1]); for (let i = n; i >= 0; i--) bp.lineTo(bot[i][0], bot[i][1]); bp.closePath();
    paintBody(ctx, a, P, bp, -L * 0.5, -T * 2.5, L, T * 5, t, true);
    const hx = pts[0][0], hy = pts[0][1];
    ell(ctx, hx, hy, T * (f.gulper ? 2.2 : 1.25), T * (f.gulper ? 1.8 : 1.05)); fs(ctx, a.galaxy ? '#4b1d7a' : C(P.c1, 2));
    if (f.gulper) { ctx.beginPath(); ctx.moveTo(hx + T * 2, hy - T * 0.3); ctx.lineTo(hx - T * 0.5, hy + T * 0.2); ctx.lineTo(hx + T * 2, hy + T * 1.3); ctx.closePath(); fs(ctx, '#2a1020'); }
    eye(ctx, hx + T * 0.3, hy - T * 0.4, T * 0.42, a, t, { angry: f.serpent });
    ctx.save(); ctx.lineWidth *= 0.8;
    if (f.lamprey) { circ(ctx, hx + T * 1.2, hy + T * 0.2, T * 0.45); fs(ctx, '#c46a7a'); }
    else if (f.moray || f.serpent) { ctx.beginPath(); ctx.moveTo(hx + T * 1.3, hy + T * 0.1); ctx.lineTo(hx - T * 0.2, hy + T * 0.45); ctx.lineTo(hx + T * 1.1, hy + T * 0.8); ctx.closePath(); fs(ctx, '#7a1f2b'); ctx.fillStyle = '#fff'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(hx + T * (0.3 + i * 0.3), hy + T * 0.32); ctx.lineTo(hx + T * (0.4 + i * 0.3), hy + T * 0.55); ctx.lineTo(hx + T * (0.5 + i * 0.3), hy + T * 0.3); ctx.fill(); } }
    else smile(ctx, hx + T * 0.6, hy + T * 0.1, T * 0.4);
    ctx.restore();
    if (f.serpent) { for (const k of [-1, 1]) { ctx.beginPath(); ctx.moveTo(hx - T * 0.4, hy - T * 0.8); ctx.lineTo(hx - T * 1.4, hy - T * (2 + k * 0.3)); ctx.lineTo(hx - T * 0.1, hy - T * 0.95); ctx.closePath(); fs(ctx, '#f0e4c4'); } }
    if (f.electric && Math.sin(t * 9 + a.v * 20) > 0.3) { ctx.save(); ctx.strokeStyle = '#fff36b'; ctx.lineWidth = 2.5; for (let k = 0; k < 3; k++) { const i = 4 + k * 5, x = pts[i][0], y = pts[i][1]; ctx.beginPath(); ctx.moveTo(x, y - T * 1.5); ctx.lineTo(x + T * 0.6, y - T * 2.3); ctx.lineTo(x - T * 0.2, y - T * 2.6); ctx.lineTo(x + T * 0.5, y - T * 3.5); ctx.stroke(); } ctx.restore(); }
    return { hx: hx, hy: hy - T * 1.1, hr: T * 0.9 };
  }

  function drawJunk(ctx, a, P, s, t) {
    const k = a.f.kind, R = s * 0.4, sway = Math.sin(t * 1.3 + a.v * 5) * 0.12;
    ctx.save(); ctx.rotate(sway);
    const body = (p, x, y, w, h) => paintBody(ctx, a, P, p, x, y, w, h, t, true);
    if (k === 'boot' || k === 'sock') {
      const p = new Path2D(); p.moveTo(-R * 0.5, -R); p.lineTo(R * 0.1, -R); p.lineTo(R * 0.15, R * 0.15); p.quadraticCurveTo(R * 0.95, R * 0.2, R * 0.95, R * 0.6); p.lineTo(R * 0.95, R * 0.75); p.lineTo(-R * 0.55, R * 0.75); p.closePath();
      body(p, -R * 0.55, -R, R * 1.5, R * 1.75);
      if (k === 'boot') { ctx.beginPath(); ctx.rect(-R * 0.6, R * 0.62, R * 1.6, R * 0.16); fs(ctx, '#2b2320'); ctx.save(); ctx.lineWidth *= 0.7; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-R * 0.05, -R * 0.75 + i * R * 0.22); ctx.lineTo(R * 0.15, -R * 0.65 + i * R * 0.22); ctx.strokeStyle = '#e8dcc0'; ctx.stroke(); } ctx.restore(); }
      else { ctx.save(); ctx.clip(p); ctx.fillStyle = 'rgba(255,255,255,0.7)'; for (let i = 0; i < 4; i++) ctx.fillRect(-R * 0.6, -R + i * R * 0.25, R * 0.8, R * 0.09); ctx.restore(); }
      ctx.save(); ctx.globalAlpha = 0.7; ctx.fillStyle = '#5aa04a'; ell(ctx, -R * 0.4, -R * 0.95, R * 0.12, R * 0.3, 0.4); ctx.fill(); ctx.restore();
    } else if (k === 'sneaker') {
      const p = new Path2D(); p.moveTo(-R, R * 0.1); p.quadraticCurveTo(-R, -R * 0.5, -R * 0.4, -R * 0.45); p.quadraticCurveTo(R * 0.2, -R * 0.3, R * 0.5, R * 0.0); p.quadraticCurveTo(R, R * 0.1, R, R * 0.35); p.lineTo(-R, R * 0.35); p.closePath();
      body(p, -R, -R * 0.5, R * 2, R * 0.85); ctx.beginPath(); ctx.rect(-R * 1.02, R * 0.3, R * 2.04, R * 0.18); fs(ctx, '#f2f2f2');
      ctx.save(); ctx.lineWidth *= 0.6; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-R * 0.3 + i * R * 0.2, -R * 0.35); ctx.lineTo(-R * 0.15 + i * R * 0.2, -R * 0.15); ctx.stroke(); } ctx.restore();
    } else if (k === 'can') {
      const p = new Path2D(); p.rect(-R * 0.45, -R * 0.75, R * 0.9, R * 1.5);
      body(p, -R * 0.45, -R * 0.75, R * 0.9, R * 1.5);
      ctx.beginPath(); ctx.rect(-R * 0.45, -R * 0.3, R * 0.9, R * 0.6); fs(ctx, '#e8f1f4'); ctx.fillStyle = '#d2283b'; ctx.font = 'bold ' + Math.round(R * 0.3) + 'px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('BEANS', 0, R * 0.1);
      ell(ctx, 0, -R * 0.75, R * 0.45, R * 0.12); fs(ctx, '#c9d2d8');
    } else if (k === 'duck') {
      const p = new Path2D(); p.ellipse(-R * 0.1, R * 0.25, R * 0.8, R * 0.5, 0, 0, TAU);
      body(p, -R * 0.9, -R * 0.25, R * 1.6, R);
      circ(ctx, R * 0.35, -R * 0.4, R * 0.42); fs(ctx, C(P.c1, 0));
      ctx.beginPath(); ctx.moveTo(R * 0.7, -R * 0.45); ctx.quadraticCurveTo(R * 1.15, -R * 0.4, R * 0.7, -R * 0.2); ctx.closePath(); fs(ctx, '#ff8a1f');
      eye(ctx, R * 0.45, -R * 0.55, R * 0.12, a, t);
      ell(ctx, -R * 0.15, R * 0.15, R * 0.35, R * 0.2, -0.3); fs(ctx, C(P.c1, -8));
    } else if (k === 'tire') {
      const p = new Path2D(); p.arc(0, 0, R, 0, TAU); p.arc(0, 0, R * 0.48, 0, TAU, true);
      ctx.fillStyle = a.galaxy || a.shine ? '#000' : C(P.c1); ctx.fill(p, 'evenodd'); body(p, -R, -R, R * 2, R * 2);
      ctx.save(); ctx.lineWidth *= 0.7; ctx.strokeStyle = '#555'; for (let i = 0; i < 16; i++) { const an = i / 16 * TAU; ctx.beginPath(); ctx.moveTo(Math.cos(an) * R * 0.75, Math.sin(an) * R * 0.75); ctx.lineTo(Math.cos(an + 0.15) * R * 0.97, Math.sin(an + 0.15) * R * 0.97); ctx.stroke(); } ctx.restore();
    } else if (k === 'bottle') {
      ctx.save(); ctx.rotate(-0.5);
      const p = new Path2D(); p.moveTo(-R * 0.3, R * 0.9); p.lineTo(-R * 0.3, -R * 0.2); p.quadraticCurveTo(-R * 0.3, -R * 0.45, -R * 0.12, -R * 0.55); p.lineTo(-R * 0.12, -R * 0.9); p.lineTo(R * 0.12, -R * 0.9); p.lineTo(R * 0.12, -R * 0.55); p.quadraticCurveTo(R * 0.3, -R * 0.45, R * 0.3, -R * 0.2); p.lineTo(R * 0.3, R * 0.9); p.closePath();
      ctx.save(); ctx.globalAlpha *= 0.75; body(p, -R * 0.3, -R * 0.9, R * 0.6, R * 1.8); ctx.restore();
      ctx.beginPath(); ctx.rect(-R * 0.16, -R * 0.1, R * 0.32, R * 0.7); fs(ctx, '#f3e3b5');
      ctx.beginPath(); ctx.rect(-R * 0.13, -R * 1.05, R * 0.26, R * 0.18); fs(ctx, '#9a6a3a');
      ctx.restore();
    }
    ctx.restore();
    return { hx: 0, hy: -R * 1.1, hr: R * 0.3 };
  }

  // ---------------- fabled ----------------
  function skin(a) { return a.galaxy || a.shine || a.rainbow ? null : '#ffcfa8'; }
  function drawMermaid(ctx, a, P, s, t) {
    const sw = Math.sin(t * 2.2 * a.ms), sk = skin(a) || C(a.c1, 20);
    const hairC = a.galaxy ? '#b28dff' : a.shine ? '#ffd23f' : C([(a.c3[0] + 10) % 360, 85, 50]);
    // hair flowing back
    ctx.beginPath(); ctx.moveTo(s * 0.32, -s * 0.18); ctx.bezierCurveTo(s * 0.1, -s * 0.32, -s * 0.15, -s * 0.15 + sw * s * 0.05, -s * 0.2, -s * 0.05 + sw * s * 0.08); ctx.quadraticCurveTo(0, -s * 0.05, s * 0.18, -s * 0.05); ctx.closePath(); fs(ctx, hairC);
    // tail
    ctx.save(); const tp = new Path2D(); tp.moveTo(s * 0.1, -s * 0.04); tp.bezierCurveTo(-s * 0.1, -s * 0.06, -s * 0.25, sw * s * 0.06, -s * 0.38, sw * s * 0.1); tp.lineTo(-s * 0.38, sw * s * 0.1 + s * 0.03); tp.bezierCurveTo(-s * 0.25, s * 0.08 + sw * s * 0.06, -s * 0.05, s * 0.1, s * 0.12, s * 0.07); tp.closePath();
    paintBody(ctx, a, Object.assign({}, P, { pat: 'speckle' }), tp, -s * 0.4, -s * 0.1, s * 0.55, s * 0.2, t, true); ctx.restore();
    ctx.save(); ctx.translate(-s * 0.38, sw * s * 0.1 + s * 0.015); ctx.rotate(sw * 0.3); ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-s * 0.1, -s * 0.15, -s * 0.14, -s * 0.12); ctx.quadraticCurveTo(-s * 0.08, 0, -s * 0.14, s * 0.12); ctx.quadraticCurveTo(-s * 0.1, s * 0.15, 0, 0); fs(ctx, C(P.c3)); ctx.restore();
    // torso
    ctx.beginPath(); ctx.ellipse(s * 0.2, -s * 0.0, s * 0.1, s * 0.075, -0.15, 0, TAU); fs(ctx, sk);
    for (const k of [0, 1]) { circ(ctx, s * (0.2 + k * 0.06), s * 0.02, s * 0.03); fs(ctx, '#c46bd8'); }
    // arm
    ctx.save(); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(s * 0.22, -s * 0.03); ctx.lineTo(s * 0.38, -s * 0.06 + sw * s * 0.03); ctx.lineWidth = s * 0.035 + 3; ctx.stroke(); ctx.strokeStyle = sk; ctx.lineWidth = s * 0.035; ctx.stroke(); ctx.restore();
    // head
    circ(ctx, s * 0.35, -s * 0.12, s * 0.085); fs(ctx, sk);
    ctx.beginPath(); ctx.arc(s * 0.35, -s * 0.14, s * 0.09, Math.PI * 1.05, Math.PI * 1.95); ctx.closePath(); fs(ctx, hairC);
    eye(ctx, s * 0.38, -s * 0.12, s * 0.022, a, t);
    ctx.save(); ctx.lineWidth *= 0.7; smile(ctx, s * 0.39, -s * 0.085, s * 0.02); ctx.restore();
    ctx.fillStyle = 'rgba(255,120,140,0.5)'; circ(ctx, s * 0.41, -s * 0.09, s * 0.015); ctx.fill();
    star(ctx, s * 0.31, -s * 0.21, s * 0.025, '#ffe680');
    return { hx: s * 0.35, hy: -s * 0.21, hr: s * 0.05 };
  }

  function drawPoseidon(ctx, a, P, s, t) {
    const sw = Math.sin(t * 1.5 * a.ms), sk = skin(a) || C(a.c1, 20), tail = a.galaxy || a.shine || a.rainbow ? P.c1 : [170, 60, 42];
    // tail below
    const tp = new Path2D(); tp.moveTo(-s * 0.1, s * 0.05); tp.bezierCurveTo(-s * 0.12, s * 0.3, s * 0.05 + sw * s * 0.05, s * 0.35, s * 0.05 + sw * s * 0.08, s * 0.45); tp.lineTo(s * 0.1 + sw * s * 0.08, s * 0.44); tp.bezierCurveTo(s * 0.12, s * 0.3, s * 0.12, s * 0.2, s * 0.1, s * 0.05); tp.closePath();
    paintBody(ctx, a, Object.assign({}, P, { c1: tail, c2: [tail[0], 40, 70], pat: 'speckle' }), tp, -s * 0.12, s * 0.05, s * 0.25, s * 0.42, t, true);
    ctx.beginPath(); ctx.moveTo(s * 0.07 + sw * s * 0.08, s * 0.44); ctx.lineTo(-s * 0.05 + sw * s * 0.08, s * 0.5); ctx.lineTo(s * 0.2 + sw * s * 0.08, s * 0.5); ctx.closePath(); fs(ctx, C(tail, 10));
    // torso with toga
    ctx.beginPath(); ctx.moveTo(-s * 0.13, s * 0.08); ctx.quadraticCurveTo(-s * 0.16, -s * 0.15, 0, -s * 0.17); ctx.quadraticCurveTo(s * 0.16, -s * 0.15, s * 0.13, s * 0.08); ctx.closePath(); fs(ctx, sk);
    ctx.beginPath(); ctx.moveTo(-s * 0.13, s * 0.08); ctx.lineTo(-s * 0.12, -s * 0.05); ctx.lineTo(s * 0.12, -s * 0.15); ctx.lineTo(s * 0.13, s * 0.08); ctx.closePath(); fs(ctx, a.galaxy ? '#4b1d7a' : '#e9f2f7');
    // trident arm
    ctx.save(); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(s * 0.1, -s * 0.12); ctx.lineTo(s * 0.24, -s * 0.06); ctx.lineWidth = s * 0.045 + 3; ctx.stroke(); ctx.strokeStyle = sk; ctx.lineWidth = s * 0.045; ctx.stroke(); ctx.restore();
    ctx.save(); ctx.translate(s * 0.26, 0); ctx.rotate(sw * 0.05);
    ctx.beginPath(); ctx.rect(-s * 0.012, -s * 0.45, s * 0.024, s * 0.8); fs(ctx, '#ffcf3a');
    ctx.beginPath(); ctx.moveTo(-s * 0.08, -s * 0.45); ctx.lineTo(-s * 0.08, -s * 0.55); ctx.moveTo(0, -s * 0.45); ctx.lineTo(0, -s * 0.6); ctx.moveTo(s * 0.08, -s * 0.45); ctx.lineTo(s * 0.08, -s * 0.55); ctx.moveTo(-s * 0.08, -s * 0.45); ctx.lineTo(s * 0.08, -s * 0.45); ctx.lineWidth = s * 0.022 + 3; ctx.stroke(); ctx.strokeStyle = '#ffcf3a'; ctx.lineWidth = s * 0.022; ctx.stroke();
    ctx.restore();
    // head + beard + crown
    circ(ctx, 0, -s * 0.27, s * 0.09); fs(ctx, sk);
    ctx.beginPath(); ctx.moveTo(-s * 0.09, -s * 0.27); ctx.quadraticCurveTo(-s * 0.1, -s * 0.08 + sw * s * 0.01, 0, -s * 0.05); ctx.quadraticCurveTo(s * 0.1, -s * 0.08, s * 0.09, -s * 0.27); ctx.quadraticCurveTo(0, -s * 0.2, -s * 0.09, -s * 0.27); fs(ctx, '#f4f4f4');
    eye(ctx, -s * 0.03, -s * 0.29, s * 0.02, a, t, { angry: true }); eye(ctx, s * 0.035, -s * 0.29, s * 0.02, a, t, { angry: true });
    crown(ctx, 0, -s * 0.35, s * 0.07);
    return { hx: 0, hy: -s * 0.44, hr: 0 };
  }

  function drawBubbleBuddy(ctx, a, P, s, t) {
    const R = s * 0.4, wob = Math.sin(t * 2.5 * a.ms) * 0.04;
    ctx.save(); ctx.scale(1 + wob, 1 - wob);
    const g = ctx.createRadialGradient(-R * 0.3, -R * 0.3, R * 0.1, 0, 0, R);
    const tint = a.galaxy ? 'rgba(120,80,220,' : a.shine ? 'rgba(255,215,90,' : a.rainbow ? 'hsla(' + ((t * 80) % 360 | 0) + ',90%,70%,' : 'rgba(170,230,255,';
    g.addColorStop(0, tint + '0.15)'); g.addColorStop(0.8, tint + '0.35)'); g.addColorStop(1, tint + '0.75)');
    circ(ctx, 0, 0, R); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = 'rgba(40,80,120,0.8)'; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth *= 1.4; ctx.beginPath(); ctx.arc(0, 0, R * 0.8, Math.PI * 1.1, Math.PI * 1.45); ctx.stroke();
    ctx.restore(); ctx.strokeStyle = OUT;
    eye(ctx, -R * 0.28, -R * 0.1, R * 0.17, a, t); eye(ctx, R * 0.28, -R * 0.1, R * 0.17, a, t + 0.03);
    ctx.save(); ctx.lineWidth *= 0.9; smile(ctx, 0, R * 0.15, R * 0.25, true); ctx.restore();
    ctx.fillStyle = 'rgba(255,120,150,0.4)'; circ(ctx, -R * 0.5, R * 0.15, R * 0.1); ctx.fill(); circ(ctx, R * 0.5, R * 0.15, R * 0.1); ctx.fill();
    return { hx: 0, hy: -R * 0.95, hr: R * 0.3 };
  }

  function drawPlesiosaur(ctx, a, P, s, t) {
    const f = a.f, sw = Math.sin(t * 2 * a.ms), L = s, H = s * 0.22, ff = a.galaxy ? '#3b2c8f' : C(P.c1, -8);
    for (const [x, y, ph] of [[-0.12, 0.35, 0], [0.12, 0.35, 1.5]]) { ctx.save(); ctx.translate(L * x, H * y); ctx.rotate(0.6 + Math.sin(t * 2.5 + ph) * 0.4); ell(ctx, -L * 0.06, H * 0.35, L * 0.04, H * 0.55, 0.3); fs(ctx, ff); ctx.restore(); }
    ctx.beginPath(); ctx.moveTo(-L * 0.2, -H * 0.1); ctx.quadraticCurveTo(-L * 0.38, sw * H * 0.2, -L * 0.45, sw * H * 0.4); ctx.quadraticCurveTo(-L * 0.35, H * 0.25, -L * 0.15, H * 0.25); fs(ctx, C(P.c1, -2));
    const bp = new Path2D(); bp.ellipse(0, 0, L * 0.25, H * 0.55, 0, 0, TAU);
    paintBody(ctx, a, P, bp, -L * 0.25, -H * 0.55, L * 0.5, H * 1.1, t);
    if (f.short) {
      ctx.beginPath(); ctx.moveTo(L * 0.18, -H * 0.4); ctx.quadraticCurveTo(L * 0.5, -H * 0.6, L * 0.55, -H * 0.05); ctx.lineTo(L * 0.2, H * 0.35); ctx.closePath(); fs(ctx, C(P.c1, 2));
      ctx.beginPath(); ctx.moveTo(L * 0.55, H * 0.02); ctx.lineTo(L * 0.3, H * 0.12); ctx.lineTo(L * 0.5, H * 0.22); ctx.closePath(); fs(ctx, '#7a1f2b');
      eye(ctx, L * 0.38, -H * 0.3, L * 0.03, a, t, { angry: true });
      return { hx: L * 0.38, hy: -H * 0.55, hr: L * 0.05 };
    }
    const nx = L * 0.42, ny = -H * 1.9 + sw * H * 0.1;
    ctx.save(); ctx.lineCap = 'round';
    for (let pass = 0; pass < 2; pass++) { ctx.beginPath(); ctx.moveTo(L * 0.15, -H * 0.2); ctx.bezierCurveTo(L * 0.35, -H * 0.4, L * 0.25, -H * 1.6, nx, ny); ctx.lineWidth = pass ? H * 0.38 : H * 0.38 + 3; ctx.strokeStyle = pass ? (a.galaxy ? '#4b1d7a' : C(P.c1, 0)) : OUT; ctx.stroke(); }
    ctx.restore();
    ell(ctx, nx + L * 0.04, ny, L * 0.07, H * 0.28, 0.15); fs(ctx, a.galaxy ? '#4b1d7a' : C(P.c1, 2));
    eye(ctx, nx + L * 0.05, ny - H * 0.08, L * 0.025, a, t);
    ctx.save(); ctx.lineWidth *= 0.7; smile(ctx, nx + L * 0.08, ny + H * 0.02, L * 0.025); ctx.restore();
    return { hx: nx + L * 0.03, hy: ny - H * 0.3, hr: L * 0.04 };
  }

  function drawMosasaur(ctx, a, P, s, t) {
    const L = s, H = s * 0.2, sw = Math.sin(t * 2.4 * a.ms), ff = C(P.c1, -8);
    ctx.save(); ctx.translate(-L * 0.42, 0); ctx.rotate(sw * 0.2); ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(-L * 0.12, -H * 0.9); ctx.quadraticCurveTo(-L * 0.06, 0, -L * 0.1, H * 0.6); ctx.closePath(); fs(ctx, ff); ctx.restore();
    for (const x of [0.15, -0.15]) { ctx.save(); ctx.translate(L * x, H * 0.35); ctx.rotate(0.8 + Math.sin(t * 3 + x * 10) * 0.3); ell(ctx, 0, H * 0.4, L * 0.03, H * 0.45); fs(ctx, ff); ctx.restore(); }
    const bp = new Path2D(); bp.moveTo(L * 0.55, 0); bp.lineTo(L * 0.3, -H * 0.45); bp.bezierCurveTo(L * 0.05, -H * 0.65, -L * 0.25, -H * 0.4, -L * 0.42, -H * 0.1); bp.lineTo(-L * 0.42, H * 0.1); bp.bezierCurveTo(-L * 0.2, H * 0.55, L * 0.15, H * 0.55, L * 0.3, H * 0.35); bp.closePath();
    paintBody(ctx, a, P, bp, -L * 0.42, -H * 0.6, L * 0.97, H * 1.15, t);
    ctx.beginPath(); ctx.moveTo(L * 0.55, 0); ctx.lineTo(L * 0.25, H * 0.12); ctx.lineTo(L * 0.5, H * 0.2); ctx.closePath(); fs(ctx, '#7a1f2b');
    ctx.fillStyle = '#fff'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(L * (0.28 + i * 0.05), H * 0.08); ctx.lineTo(L * (0.3 + i * 0.05), H * 0.17); ctx.lineTo(L * (0.32 + i * 0.05), H * 0.07); ctx.fill(); }
    eye(ctx, L * 0.3, -H * 0.2, L * 0.025, a, t, { angry: true });
    return { hx: L * 0.25, hy: -H * 0.55, hr: L * 0.05 };
  }

  function drawSanta(ctx, a, P, s, t) {
    const R = s * 0.28, bob = Math.sin(t * 2 * a.ms) * s * 0.02, suit = a.galaxy || a.shine || a.rainbow ? null : [355, 80, 48];
    ctx.save(); ctx.translate(0, bob);
    // legs/boots kicking
    for (const k of [-1, 1]) { const kick = Math.sin(t * 4 + k) * R * 0.15; ctx.beginPath(); ctx.rect(k * R * 0.35 - R * 0.15, R * 0.75, R * 0.3, R * 0.4 + kick); fs(ctx, suit ? C(suit) : '#333'); ell(ctx, k * R * 0.35 + R * 0.05, R * 1.2 + kick, R * 0.25, R * 0.12); fs(ctx, '#222'); }
    const bp = new Path2D(); bp.ellipse(0, R * 0.25, R * 0.95, R * 0.75, 0, 0, TAU);
    paintBody(ctx, a, suit ? Object.assign({}, P, { c1: suit, c2: suit, pat: 'none' }) : P, bp, -R, -R * 0.5, R * 2, R * 1.5, t, true);
    ctx.beginPath(); ctx.rect(-R * 0.95, R * 0.35, R * 1.9, R * 0.18); fs(ctx, '#222'); ctx.beginPath(); ctx.rect(-R * 0.12, R * 0.32, R * 0.24, R * 0.24); fs(ctx, '#ffd23f');
    for (const k of [-1, 1]) { ctx.save(); ctx.translate(k * R * 0.85, R * 0.0); ctx.rotate(k * (0.6 + Math.sin(t * 3 + k) * 0.3)); ell(ctx, 0, R * 0.3, R * 0.15, R * 0.35); fs(ctx, suit ? C(suit) : '#555'); circ(ctx, 0, R * 0.65, R * 0.13); fs(ctx, '#fff'); ctx.restore(); }
    // head
    circ(ctx, 0, -R * 0.55, R * 0.5); fs(ctx, '#ffcfa8');
    ctx.beginPath(); ctx.moveTo(-R * 0.5, -R * 0.55); ctx.quadraticCurveTo(-R * 0.55, R * 0.25, 0, R * 0.3); ctx.quadraticCurveTo(R * 0.55, R * 0.25, R * 0.5, -R * 0.55); ctx.quadraticCurveTo(0, -R * 0.25, -R * 0.5, -R * 0.55); fs(ctx, '#fafafa');
    ctx.beginPath(); ctx.moveTo(-R * 0.25, -R * 0.35); ctx.quadraticCurveTo(0, -R * 0.45, R * 0.25, -R * 0.35); ctx.quadraticCurveTo(0, -R * 0.25, -R * 0.25, -R * 0.35); fs(ctx, '#fafafa');
    circ(ctx, 0, -R * 0.45, R * 0.1); fs(ctx, '#ff8a8a');
    // snorkel mask
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-R * 0.42, -R * 0.82, R * 0.84, R * 0.3, R * 0.12) : ctx.rect(-R * 0.42, -R * 0.82, R * 0.84, R * 0.3); ctx.fillStyle = 'rgba(160,220,255,0.55)'; ctx.fill(); ctx.stroke();
    eye(ctx, -R * 0.18, -R * 0.67, R * 0.09, a, t); eye(ctx, R * 0.18, -R * 0.67, R * 0.09, a, t);
    ctx.beginPath(); ctx.moveTo(R * 0.45, -R * 0.7); ctx.lineTo(R * 0.6, -R * 0.7); ctx.lineTo(R * 0.6, -R * 1.3); ctx.lineWidth *= 1.6; ctx.strokeStyle = '#ff8a1f'; ctx.stroke(); ctx.lineWidth /= 1.6; ctx.strokeStyle = OUT;
    santaHat(ctx, 0, -R * 0.95, R * 0.5, t);
    ctx.restore();
    return { hx: 0, hy: -R * 1.6, hr: 0 };
  }

  function drawUFO(ctx, a, P, s, t) {
    const R = s * 0.45, bob = Math.sin(t * 2 * a.ms) * s * 0.03;
    ctx.save(); ctx.translate(0, bob);
    const bt = 0.5 + 0.5 * Math.sin(t * 6);
    const bg = ctx.createLinearGradient(0, R * 0.1, 0, R * 1.5); bg.addColorStop(0, 'rgba(180,255,170,' + (0.35 + bt * 0.3) + ')'); bg.addColorStop(1, 'rgba(180,255,170,0)');
    ctx.beginPath(); ctx.moveTo(-R * 0.3, R * 0.1); ctx.lineTo(R * 0.3, R * 0.1); ctx.lineTo(R * 0.7, R * 1.5); ctx.lineTo(-R * 0.7, R * 1.5); ctx.closePath(); ctx.fillStyle = bg; ctx.fill();
    // dome
    ctx.beginPath(); ctx.arc(0, -R * 0.1, R * 0.45, Math.PI, TAU); ctx.closePath(); ctx.fillStyle = 'rgba(170,230,255,0.6)'; ctx.fill(); ctx.stroke();
    circ(ctx, 0, -R * 0.2, R * 0.2); fs(ctx, '#7ee36b'); eye(ctx, -R * 0.07, -R * 0.22, R * 0.07, a, t); eye(ctx, R * 0.07, -R * 0.22, R * 0.07, a, t);
    const bp = new Path2D(); bp.ellipse(0, 0, R, R * 0.25, 0, 0, TAU);
    paintBody(ctx, a, a.galaxy || a.shine || a.rainbow ? P : Object.assign({}, P, { c1: [210, 10, 70], c2: [210, 10, 85], pat: 'none' }), bp, -R, -R * 0.25, R * 2, R * 0.5, t, true);
    for (let i = 0; i < 7; i++) { const on = Math.floor(t * 6 + i) % 3 === 0; circ(ctx, -R * 0.75 + i * R * 0.25, R * 0.05, R * 0.06); fs(ctx, on ? '#fff36b' : ['#ff5a7a', '#5ad8ff', '#7ee36b'][i % 3]); }
    ctx.restore();
    return { hx: 0, hy: -R * 0.6, hr: 0 };
  }

  function drawAlien(ctx, a, P, s, t) {
    const R = s * 0.3, wave = Math.sin(t * 5) * 0.5, green = a.galaxy || a.shine || a.rainbow ? null : [105, 65, 55];
    const PP = green ? Object.assign({}, P, { c1: green, c2: [105, 60, 72], pat: 'none' }) : P;
    ctx.save(); ctx.lineCap = 'round';
    for (const k of [-1, 1]) { ctx.beginPath(); ctx.moveTo(k * R * 0.25, R * 0.9); ctx.lineTo(k * R * 0.3, R * 1.4); ctx.lineWidth = R * 0.15 + 3; ctx.stroke(); ctx.lineWidth = R * 0.15; ctx.strokeStyle = C(PP.c1); ctx.stroke(); ctx.strokeStyle = OUT; }
    ctx.beginPath(); ctx.moveTo(R * 0.3, R * 0.5); ctx.lineTo(R * 0.8, R * 0.1 - wave * R * 0.3); ctx.lineWidth = R * 0.13 + 3; ctx.stroke(); ctx.lineWidth = R * 0.13; ctx.strokeStyle = C(PP.c1); ctx.stroke(); ctx.strokeStyle = OUT;
    ctx.beginPath(); ctx.moveTo(-R * 0.3, R * 0.5); ctx.lineTo(-R * 0.7, R * 0.9); ctx.lineWidth = R * 0.13 + 3; ctx.stroke(); ctx.lineWidth = R * 0.13; ctx.strokeStyle = C(PP.c1); ctx.stroke(); ctx.strokeStyle = OUT;
    ctx.restore();
    const body = new Path2D(); body.ellipse(0, R * 0.65, R * 0.35, R * 0.4, 0, 0, TAU); paintBody(ctx, a, PP, body, -R * 0.35, R * 0.25, R * 0.7, R * 0.8, t, true);
    for (const k of [-1, 1]) { ctx.beginPath(); ctx.moveTo(k * R * 0.3, -R * 0.8); ctx.quadraticCurveTo(k * R * 0.5, -R * 1.3, k * R * 0.55 + Math.sin(t * 3 + k) * R * 0.1, -R * 1.45); ctx.stroke(); circ(ctx, k * R * 0.55 + Math.sin(t * 3 + k) * R * 0.1, -R * 1.45, R * 0.1); fs(ctx, '#ff5ad8'); }
    const hp = new Path2D(); hp.moveTo(0, R * 0.35); hp.bezierCurveTo(-R * 0.9, R * 0.1, -R * 0.85, -R * 1.0, 0, -R * 0.95); hp.bezierCurveTo(R * 0.85, -R * 1.0, R * 0.9, R * 0.1, 0, R * 0.35); hp.closePath();
    paintBody(ctx, a, PP, hp, -R * 0.75, -R * 0.95, R * 1.5, R * 1.3, t, true);
    for (const k of [-1, 1]) { ell(ctx, k * R * 0.3, -R * 0.3, R * 0.22, R * 0.13, k * 0.5); ctx.fillStyle = '#111'; ctx.fill(); circ(ctx, k * R * 0.26, -R * 0.36, R * 0.04); ctx.fillStyle = '#fff'; ctx.fill(); }
    ctx.save(); ctx.lineWidth *= 0.7; smile(ctx, 0, R * 0.05, R * 0.12); ctx.restore();
    return { hx: 0, hy: -R * 1.0, hr: R * 0.3 };
  }

  function drawAquaman(ctx, a, P, s, t) {
    const sw = Math.sin(t * 3 * a.ms), sk = '#f2c094', shirt = a.galaxy || a.shine || a.rainbow ? null : [28, 95, 52];
    ctx.save(); ctx.lineCap = 'round';
    // legs kicking
    for (const k of [0, 1]) { const kick = Math.sin(t * 5 + k * Math.PI) * s * 0.04; ctx.beginPath(); ctx.moveTo(-s * 0.12, k * s * 0.03); ctx.lineTo(-s * 0.42, kick + k * s * 0.03); ctx.lineWidth = s * 0.06 + 3; ctx.strokeStyle = OUT; ctx.stroke(); ctx.lineWidth = s * 0.06; ctx.strokeStyle = '#2f9a4a'; ctx.stroke(); }
    // arms forward
    for (const k of [0, 1]) { ctx.beginPath(); ctx.moveTo(s * 0.12, -s * 0.03 + k * s * 0.03); ctx.lineTo(s * 0.42, -s * 0.05 + k * s * 0.06 + sw * s * 0.02 * (k ? 1 : -1)); ctx.lineWidth = s * 0.045 + 3; ctx.strokeStyle = OUT; ctx.stroke(); ctx.lineWidth = s * 0.045; ctx.strokeStyle = shirt ? C(shirt) : '#ffd23f'; ctx.stroke(); }
    ctx.restore();
    const bp = new Path2D(); bp.ellipse(0, 0, s * 0.16, s * 0.07, 0, 0, TAU);
    paintBody(ctx, a, shirt ? Object.assign({}, P, { c1: shirt, c2: shirt, pat: 'speckle', pc: [30, 90, 70] }) : P, bp, -s * 0.16, -s * 0.07, s * 0.32, s * 0.14, t, true);
    ctx.beginPath(); ctx.rect(-s * 0.16, -s * 0.02, s * 0.04, s * 0.06); fs(ctx, '#ffd23f');
    circ(ctx, s * 0.24, -s * 0.06, s * 0.065); fs(ctx, sk);
    ctx.beginPath(); ctx.moveTo(s * 0.18, -s * 0.04); ctx.quadraticCurveTo(s * 0.16, -s * 0.16, s * 0.27, -s * 0.13); ctx.quadraticCurveTo(s * 0.14, -s * 0.14 + sw * s * 0.01, s * 0.1, -s * 0.08 + sw * s * 0.02); ctx.closePath(); fs(ctx, '#e8b84a');
    ctx.beginPath(); ctx.moveTo(s * 0.2, -s * 0.03); ctx.quadraticCurveTo(s * 0.24, s * 0.03, s * 0.3, -s * 0.02); ctx.lineTo(s * 0.29, -s * 0.05); ctx.closePath(); fs(ctx, '#d9a63c');
    eye(ctx, s * 0.27, -s * 0.07, s * 0.016, a, t);
    return { hx: s * 0.24, hy: -s * 0.13, hr: s * 0.04 };
  }

  function drawTrilobite(ctx, a, P, s, t) {
    const R = s * 0.35, w = Math.sin(t * 6) * 0.15;
    ctx.save(); ctx.lineWidth *= 0.7; for (let i = 0; i < 6; i++) for (const k of [-1, 1]) { ctx.beginPath(); ctx.moveTo(-R * 0.6 + i * R * 0.22, k * R * 0.45); ctx.lineTo(-R * 0.65 + i * R * 0.22, k * R * (0.7 + (i % 2 ? w : -w))); ctx.stroke(); } ctx.restore();
    ctx.beginPath(); ctx.moveTo(R * 1.05, -R * 0.1); ctx.quadraticCurveTo(R * 1.4, -R * 0.4, R * 1.5, -R * 0.3); ctx.moveTo(R * 1.05, R * 0.1); ctx.quadraticCurveTo(R * 1.4, R * 0.4, R * 1.5, R * 0.3); ctx.stroke();
    const bp = new Path2D(); bp.ellipse(0, 0, R * 1.1, R * 0.55, 0, 0, TAU);
    paintBody(ctx, a, a.galaxy || a.shine || a.rainbow ? P : Object.assign({}, P, { c1: [30, 30, 45] }), bp, -R * 1.1, -R * 0.55, R * 2.2, R * 1.1, t, true);
    ctx.save(); ctx.clip(bp); ctx.lineWidth *= 0.6; for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.moveTo(-R + i * R * 0.22, -R); ctx.lineTo(-R + i * R * 0.22, R); ctx.stroke(); } ctx.beginPath(); ctx.moveTo(-R * 1.2, -R * 0.18); ctx.lineTo(R * 1.2, -R * 0.18); ctx.moveTo(-R * 1.2, R * 0.18); ctx.lineTo(R * 1.2, R * 0.18); ctx.stroke(); ctx.restore();
    eye(ctx, R * 0.7, -R * 0.2, R * 0.14, a, t); eye(ctx, R * 0.7, R * 0.2, R * 0.14, a, t + 0.03);
    return { hx: R * 0.5, hy: -R * 0.6, hr: R * 0.2 };
  }

  // ---------------- effects ----------------
  function flairShape(ctx, kind, x, y, r, t, i) {
    switch (kind) {
      case 'hearts': ctx.fillStyle = '#ff5a8a'; ctx.beginPath(); ctx.moveTo(x, y + r * 0.6); ctx.bezierCurveTo(x - r * 1.2, y - r * 0.2, x - r * 0.5, y - r * 1.1, x, y - r * 0.35); ctx.bezierCurveTo(x + r * 0.5, y - r * 1.1, x + r * 1.2, y - r * 0.2, x, y + r * 0.6); ctx.fill(); break;
      case 'stars': star(ctx, x, y, r, '#ffe66b'); break;
      case 'notes': ctx.fillStyle = '#fff'; ctx.strokeStyle = '#fff'; circ(ctx, x, y, r * 0.45); ctx.fill(); ctx.lineWidth = Math.max(1, r * 0.2); ctx.beginPath(); ctx.moveTo(x + r * 0.4, y); ctx.lineTo(x + r * 0.4, y - r * 1.4); ctx.lineTo(x + r, y - r * 1.1); ctx.stroke(); break;
      case 'rings': ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1.5; circ(ctx, x, y, r * (0.5 + ((t + i) % 1))); ctx.stroke(); break;
      case 'leaves': ctx.fillStyle = '#6bd36b'; ell(ctx, x, y, r, r * 0.45, t * 2 + i); ctx.fill(); break;
      case 'snow': ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; for (let k = 0; k < 3; k++) { const an = k * Math.PI / 3 + t; ctx.beginPath(); ctx.moveTo(x - Math.cos(an) * r, y - Math.sin(an) * r); ctx.lineTo(x + Math.cos(an) * r, y + Math.sin(an) * r); ctx.stroke(); } break;
      case 'embers': ctx.fillStyle = 'rgba(255,' + (120 + (i * 40) % 100) + ',40,0.9)'; circ(ctx, x, y, r * 0.5); ctx.fill(); break;
      case 'zaps': ctx.strokeStyle = '#fff36b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r * 0.4, y); ctx.lineTo(x - r * 0.3, y + r * 0.1); ctx.lineTo(x + r * 0.2, y + r); ctx.stroke(); break;
      case 'petals': ctx.fillStyle = '#ffb3d1'; ell(ctx, x, y, r * 0.7, r * 0.4, t + i); ctx.fill(); break;
      case 'bubbles': ctx.strokeStyle = 'rgba(220,245,255,0.85)'; ctx.lineWidth = 1.5; circ(ctx, x, y, r * 0.6); ctx.stroke(); break;
      default: ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r * 0.25, y - r * 0.25); ctx.lineTo(x + r, y); ctx.lineTo(x + r * 0.25, y + r * 0.25); ctx.lineTo(x, y + r); ctx.lineTo(x - r * 0.25, y + r * 0.25); ctx.lineTo(x - r, y); ctx.lineTo(x - r * 0.25, y - r * 0.25); ctx.closePath(); ctx.fill();
    }
  }
  function aura(ctx, a, s, t) {
    if (!a.glow) return;
    const pul = 0.75 + 0.25 * Math.sin(t * 3 + a.v * 6), R = s * (0.55 + (a.rarity >= 6 ? 0.2 : 0)) * pul;
    const g = ctx.createRadialGradient(0, 0, R * 0.2, 0, 0, R);
    g.addColorStop(0, hexA(a.glow, 0.55)); g.addColorStop(1, hexA(a.glow, 0));
    ctx.fillStyle = g; circ(ctx, 0, 0, R); ctx.fill();
    if (a.rarity >= 6) { ctx.save(); ctx.rotate(t * 0.6); ctx.fillStyle = hexA(a.glow, 0.18); for (let i = 0; i < 10; i++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, s * 0.85, i * TAU / 10, i * TAU / 10 + 0.18); ctx.closePath(); ctx.fill(); } ctx.restore(); }
  }
  function hexA(hex, al) { const n = parseInt(hex.slice(1), 16); return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + al + ')'; }
  function flairs(ctx, a, s, t) {
    const kind = a.flair || (a.shine ? 'glints' : null);
    if (!kind && !a.shine) return;
    const n = 2 + Math.min(a.rarity, 6);
    ctx.save();
    for (let i = 0; i < n; i++) {
      const ph = i / n, sp = 0.5 + a.v2;
      let x, y, al = 1;
      if (kind === 'bubbles' || kind === 'embers' || kind === 'notes' || kind === 'hearts') { const q = (t * 0.35 * sp + ph) % 1; x = Math.sin(i * 2.4 + t) * s * 0.35; y = s * 0.2 - q * s * 0.8; al = 1 - q; }
      else if (kind === 'snow' || kind === 'petals' || kind === 'leaves') { const q = (t * 0.25 * sp + ph) % 1; x = Math.sin(i * 3.1 + t * 0.8) * s * 0.5; y = -s * 0.5 + q * s; al = Math.sin(q * Math.PI); }
      else { const an = t * sp + ph * TAU; x = Math.cos(an) * s * 0.55; y = Math.sin(an) * s * 0.38; al = 0.5 + 0.5 * Math.sin(t * 4 + i * 2); }
      ctx.globalAlpha = Math.max(0, al);
      flairShape(ctx, kind || 'glints', x, y, Math.max(2.5, s * 0.045), t, i);
    }
    ctx.restore();
  }

  // ---------------- creature dispatcher ----------------
  const DRAW = {
    fish: drawFish, dunkle: drawFish, shark: drawShark, megalodon: drawShark, whale: drawWhale, dolphin: drawDolphin,
    octopus: drawOctopus, kraken: (c, a, P, s, t) => drawOctopus(c, a, P, s, t, { angry: true, many: true }), squid: drawSquid,
    crab: drawCrab, lobster: drawLobster, starfish: drawStarfish, seahorse: drawSeahorse, sponge: drawSponge, snail: drawSnail,
    urchin: drawUrchin, sealion: drawSealion, seaspider: drawSeaspider, plankton: drawPlankton, coral: drawCoral,
    manatee: drawManatee, barnacle: drawBarnacle, eel: drawEel, serpent: drawEel, junk: drawJunk,
    mermaid: (c, a, P, s, t) => drawMermaid(c, a, P, s * 1.45, t), poseidon: drawPoseidon, bubblebuddy: drawBubbleBuddy, plesiosaur: drawPlesiosaur, mosasaur: drawMosasaur,
    santa: drawSanta, ufo: drawUFO, alien: drawAlien, aquaman: (c, a, P, s, t) => drawAquaman(c, a, P, s * 1.55, t), trilobite: drawTrilobite
  };
  function prep(a) {
    if (a._prepped) return;
    a._prepped = true;
    if (a.arch === 'dunkle') { a.f.armor = true; a.f.teeth = true; a.h = 0.45; a.c1 = a.galaxy || a.shine ? a.c1 : [210, 15, 45]; }
    if (a.arch === 'megalodon') { a.f.kind = 'meg'; if (!a.galaxy && !a.shine) a.c1 = [215, 15, 42]; }
    if (a.arch === 'serpent') { a.f.serpent = true; if (!a.galaxy && !a.shine) a.c1 = [160, 55, 35]; }
    if (a.arch === 'kraken' && !a.galaxy && !a.shine) a.c1 = [355, 65, 40];
    if (a.arch === 'mosasaur' && !a.galaxy && !a.shine) a.c1 = [200, 25, 40];
  }

  // Draw a creature centered at the origin, facing right, about `size` px long.
  function creature(ctx, sp, size, t, opt) {
    opt = opt || {};
    const a = sp.art; prep(a);
    const P = palette(a, t), fn = DRAW[a.arch] || drawFish;
    ctx.save();
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (!opt.noFx) aura(ctx, a, size, t);
    if (a.alpha) ctx.globalAlpha *= a.alpha;
    ctx.strokeStyle = OUT; ctx.lineWidth = Math.max(1.3, size * 0.028);
    const head = fn(ctx, a, P, size, t) || { hx: 0, hy: -size * 0.4, hr: size * 0.06 };
    if (a.crown && head.hr) crown(ctx, head.hx, head.hy, Math.max(4, head.hr));
    ctx.restore();
    if (!opt.noFx) { ctx.save(); flairs(ctx, a, size, t); ctx.restore(); }
  }

  // Extra per-species movement layered on top of swimming.
  function motion(a, t) {
    const ms = a.ms, ph = a.v * 10;
    switch (a.motion) {
      case 'dart': { const b = Math.pow(Math.max(0, Math.sin(t * 2 * ms + ph)), 4); return { dx: 0, dy: Math.sin(t * 1.3) * 3, rot: 0, sp: 0.3 + b * 2.4 }; }
      case 'glide': return { dx: 0, dy: Math.sin(t * 0.8 * ms + ph) * 10, rot: Math.cos(t * 0.8 * ms + ph) * 0.08, sp: 0.8 };
      case 'wiggle': return { dx: 0, dy: Math.sin(t * 2) * 3, rot: Math.sin(t * 9 * ms + ph) * 0.1, sp: 1 };
      case 'bob': return { dx: 0, dy: Math.sin(t * 3 * ms + ph) * 9, rot: 0, sp: 0.8 };
      case 'zigzag': { const q = ((t * 0.8 * ms + ph) % 2); const tri = q < 1 ? q : 2 - q; return { dx: 0, dy: (tri - 0.5) * 30, rot: (q < 1 ? -1 : 1) * 0.15, sp: 1.1 }; }
      case 'loop': return { dx: Math.cos(t * 1.6 * ms + ph) * 10, dy: Math.sin(t * 1.6 * ms + ph) * 14, rot: Math.cos(t * 1.6 * ms + ph) * 0.2, sp: 0.9 };
      case 'drift': return { dx: 0, dy: Math.sin(t * 0.6 + ph) * 6, rot: Math.sin(t * 0.5 + ph) * 0.05, sp: 0.4 };
      case 'hop': return { dx: 0, dy: -Math.abs(Math.sin(t * 2.4 * ms + ph)) * 16, rot: 0, sp: 0.9 };
      case 'spiral': return { dx: Math.sin(t * 2 * ms + ph) * 8, dy: Math.cos(t * 2 * ms + ph) * 12, rot: Math.sin(t * 2 * ms + ph) * 0.15, sp: 0.9 };
      default: return { dx: 0, dy: Math.sin(t * 1.5 * ms + ph) * 5, rot: Math.cos(t * 1.5 * ms + ph) * 0.05, sp: 1 };
    }
  }

  // ======================= SCENERY =======================
  const THEMES = {
    pond:      { sky: ['#7cc8ff', '#d8f1ff'], water: ['#5fa88a', '#1f4a3c'], floor: '#5b4a30', deco: 'reeds', sun: true },
    river:     { sky: ['#69b8ff', '#d4efff'], water: ['#4fa6c4', '#1b4d63'], floor: '#7a6a52', deco: 'rocks', sun: true },
    swamp:     { sky: ['#8aa37a', '#d9dfb0'], water: ['#6b7d3a', '#2a3315'], floor: '#3a3020', deco: 'reeds', sun: true, haze: 'rgba(200,220,150,0.25)' },
    mountain:  { sky: ['#9fc4ea', '#eef6ff'], water: ['#4aa0b8', '#123c50'], floor: '#6d7480', deco: 'rocks', sun: true, haze: 'rgba(255,255,255,0.3)' },
    jungle:    { sky: ['#7fd0c0', '#f2ffd8'], water: ['#8a7a3a', '#3a2f12'], floor: '#4a3418', deco: 'weeds', sun: true },
    beach:     { sky: ['#4fb4ff', '#c8ecff'], water: ['#38c4d8', '#0d4d70'], floor: '#e6cf94', deco: 'shells', sun: true },
    mangrove:  { sky: ['#6cc7e0', '#e8fbe0'], water: ['#3eaa98', '#0f4a44'], floor: '#6a5838', deco: 'weeds', sun: true },
    reef:      { sky: ['#38b6ff', '#bff0ff'], water: ['#2fd4e0', '#0a5a8a'], floor: '#f0dca0', deco: 'coral', sun: true },
    kelp:      { sky: ['#62b0e0', '#dff2ff'], water: ['#3d9a8a', '#0b3a40'], floor: '#77705a', deco: 'kelp', sun: true },
    harbor:    { sky: ['#9fb2c4', '#e2e8ee'], water: ['#4a7f99', '#102a3a'], floor: '#555a60', deco: 'rocks', sun: false, haze: 'rgba(230,235,240,0.35)' },
    arctic:    { sky: ['#1a2a5a', '#6ab0d8'], water: ['#3f8fb8', '#0a2440'], floor: '#d8e8f0', deco: 'ice', sun: false, aurora: true },
    tropical:  { sky: ['#2aa6ff', '#ffe9b8'], water: ['#22d0d0', '#06507a'], floor: '#f4e0a8', deco: 'coral', sun: true },
    ocean:     { sky: ['#3a9cf0', '#cfeaff'], water: ['#1f78c8', '#03183a'], floor: '#3a4a5a', deco: 'rocks', sun: true },
    shipwreck: { sky: ['#6a7a88', '#c8ccd0'], water: ['#2e6a78', '#081e28'], floor: '#4d4a40', deco: 'wreck', sun: false, haze: 'rgba(210,215,220,0.4)' },
    volcano:   { sky: ['#3a0f0a', '#ff7a2a'], water: ['#7a3a2a', '#1a0505'], floor: '#2a1a18', deco: 'lava', sun: false, embers: true },
    bermuda:   { sky: ['#1a1030', '#5a4a7a'], water: ['#2a3a6a', '#05081a'], floor: '#2a2a3a', deco: 'crystals', sun: false, storm: true },
    atlantis:  { sky: ['#ff9a5a', '#ffe6a8'], water: ['#2ab8b0', '#062a4a'], floor: '#e8dcc0', deco: 'columns', sun: true },
    northpole: { sky: ['#0a1440', '#3a5a9a'], water: ['#3a7ab0', '#081a38'], floor: '#f4f8ff', deco: 'candy', sun: false, aurora: true, snow: true },
    trench:    { sky: ['#050a1a', '#1a2a48'], water: ['#123050', '#000004'], floor: '#15151d', deco: 'vents', sun: false, stars: true },
    cosmic:    { sky: ['#05010f', '#2a0a4a'], water: ['#5a2aa0', '#08001a'], floor: '#2a1a4a', deco: 'crystals', sun: false, stars: true, planets: true }
  };

  function cloud(ctx, x, y, s) {
    ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.strokeStyle = 'rgba(120,150,180,0.35)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, s * 0.5, Math.PI * 0.5, Math.PI * 1.5); ctx.arc(x + s * 0.5, y - s * 0.45, s * 0.55, Math.PI, Math.PI * 1.9); ctx.arc(x + s * 1.1, y - s * 0.2, s * 0.45, Math.PI * 1.3, Math.PI * 0.3); ctx.arc(x + s * 0.9, y + s * 0.15, s * 0.35, Math.PI * 1.8, Math.PI * 0.5); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  function tri(ctx, x1, y1, x2, y2, x3, y3) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.closePath(); }
  function palm(ctx, x, y, h, t) {
    ctx.strokeStyle = '#6b4a2a'; ctx.lineWidth = h * 0.07; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + h * 0.15, y - h * 0.5, x + h * 0.05, y - h); ctx.stroke();
    ctx.fillStyle = '#2f9a3f'; ctx.strokeStyle = '#1d5a28'; ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) { const an = -Math.PI / 2 + (i - 2.5) * 0.55 + Math.sin(t + i) * 0.05; ctx.beginPath(); ctx.moveTo(x + h * 0.05, y - h); ctx.quadraticCurveTo(x + h * 0.05 + Math.cos(an) * h * 0.4, y - h + Math.sin(an) * h * 0.3 - h * 0.1, x + h * 0.05 + Math.cos(an) * h * 0.55, y - h + Math.sin(an) * h * 0.2 + h * 0.2); ctx.quadraticCurveTo(x + h * 0.05 + Math.cos(an) * h * 0.3, y - h + h * 0.05, x + h * 0.05, y - h); ctx.fill(); ctx.stroke(); }
    circ(ctx, x + h * 0.08, y - h * 0.93, h * 0.04); ctx.fillStyle = '#6b4a2a'; ctx.fill();
  }
  function tree(ctx, x, y, h, col) { ctx.fillStyle = '#6b4a2a'; ctx.fillRect(x - h * 0.05, y - h * 0.5, h * 0.1, h * 0.5); ctx.fillStyle = col; ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 2; circ(ctx, x, y - h * 0.65, h * 0.32); ctx.fill(); ctx.stroke(); circ(ctx, x - h * 0.2, y - h * 0.5, h * 0.22); ctx.fill(); circ(ctx, x + h * 0.2, y - h * 0.52, h * 0.22); ctx.fill(); }
  function pine(ctx, x, y, h, col) { ctx.fillStyle = '#5a3a20'; ctx.fillRect(x - h * 0.04, y - h * 0.15, h * 0.08, h * 0.15); ctx.fillStyle = col; for (let i = 0; i < 3; i++) { tri(ctx, x - h * (0.3 - i * 0.06), y - h * (0.12 + i * 0.25), x, y - h * (0.55 + i * 0.22), x + h * (0.3 - i * 0.06), y - h * (0.12 + i * 0.25)); ctx.fill(); } }
  function hills(ctx, W, y, h, col, ph) { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, y); for (let x = 0; x <= W + 20; x += 20) ctx.lineTo(x, y - h * (0.55 + 0.45 * Math.sin(x * 0.006 + ph))); ctx.lineTo(W, y); ctx.closePath(); ctx.fill(); }

  // Sky + horizon scenery. surfY is the screen y of the water surface.
  function backdrop(ctx, loc, W, surfY, t) {
    const th = THEMES[loc.theme], top = Math.min(0, surfY - 900);
    const g = ctx.createLinearGradient(0, top, 0, surfY); g.addColorStop(0, th.sky[0]); g.addColorStop(1, th.sky[1]);
    ctx.fillStyle = g; ctx.fillRect(0, top, W, surfY - top);
    const S = Math.min(W, 900);
    if (th.stars || th.aurora || th.storm) { const r = seeded(0.123); ctx.fillStyle = '#fff'; for (let i = 0; i < 90; i++) { ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(t * 1.5 + i)); circ(ctx, r() * W, surfY - r() * Math.max(200, surfY), r() * 1.6 + 0.4); ctx.fill(); } ctx.globalAlpha = 1; }
    if (th.aurora) { for (let k = 0; k < 3; k++) { ctx.beginPath(); const yb = surfY * (0.25 + k * 0.08); ctx.moveTo(0, yb); for (let x = 0; x <= W; x += 20) ctx.lineTo(x, yb + Math.sin(x * 0.01 + t * 0.5 + k) * 25); ctx.lineTo(W, yb + 70); for (let x = W; x >= 0; x -= 20) ctx.lineTo(x, yb + 70 + Math.sin(x * 0.012 + t * 0.4 + k) * 20); ctx.closePath(); ctx.fillStyle = ['rgba(80,255,170,0.18)', 'rgba(120,200,255,0.14)', 'rgba(200,120,255,0.12)'][k]; ctx.fill(); } }
    if (th.sun) { const sx = W * 0.8, sy = surfY * 0.28; const sg = ctx.createRadialGradient(sx, sy, 10, sx, sy, S * 0.12); sg.addColorStop(0, 'rgba(255,250,200,0.9)'); sg.addColorStop(1, 'rgba(255,250,200,0)'); ctx.fillStyle = sg; circ(ctx, sx, sy, S * 0.12); ctx.fill(); circ(ctx, sx, sy, S * 0.045); ctx.fillStyle = '#ffe14d'; ctx.fill(); ctx.strokeStyle = '#f0a020'; ctx.lineWidth = 3; ctx.stroke(); ctx.save(); ctx.translate(sx, sy); ctx.rotate(t * 0.2); ctx.strokeStyle = '#ffd23f'; for (let i = 0; i < 10; i++) { ctx.rotate(TAU / 10); ctx.beginPath(); ctx.moveTo(S * 0.055, 0); ctx.lineTo(S * 0.075, 0); ctx.stroke(); } ctx.restore(); ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(sx, sy + 3, S * 0.02, 0.2, Math.PI - 0.2); ctx.stroke(); ctx.fillStyle = OUT; circ(ctx, sx - S * 0.014, sy - S * 0.008, 2.5); ctx.fill(); circ(ctx, sx + S * 0.014, sy - S * 0.008, 2.5); ctx.fill(); }
    else if (!th.planets && loc.theme !== 'volcano') { circ(ctx, W * 0.82, surfY * 0.25, S * 0.04); ctx.fillStyle = '#f4f0d0'; ctx.fill(); circ(ctx, W * 0.82 + S * 0.015, surfY * 0.25 - S * 0.01, S * 0.035); ctx.fillStyle = th.sky[0]; ctx.globalAlpha = th.haze ? 0 : 0.9; ctx.fill(); ctx.globalAlpha = 1; }
    if (th.planets) { circ(ctx, W * 0.75, surfY * 0.3, S * 0.07); const pg = ctx.createLinearGradient(W * 0.7, 0, W * 0.8, 0); pg.addColorStop(0, '#ffb05a'); pg.addColorStop(1, '#c0502a'); ctx.fillStyle = pg; ctx.fill(); ctx.strokeStyle = 'rgba(255,220,170,0.8)'; ctx.lineWidth = 4; ell(ctx, W * 0.75, surfY * 0.3, S * 0.12, S * 0.025, -0.3); ctx.stroke(); circ(ctx, W * 0.2, surfY * 0.2, S * 0.03); ctx.fillStyle = '#7ad0ff'; ctx.fill(); const gx = W * 0.45, gy = surfY * 0.18; ctx.save(); ctx.translate(gx, gy); ctx.rotate(t * 0.05); for (let i = 0; i < 160; i++) { const an = i * 0.15, rr = i * 0.5; ctx.fillStyle = 'rgba(220,180,255,' + (0.6 - i / 300) + ')'; circ(ctx, Math.cos(an) * rr * 1.4, Math.sin(an) * rr * 0.6, 1.4); ctx.fill(); } ctx.restore(); }
    if (!th.stars && !th.storm && loc.theme !== 'volcano') { for (let i = 0; i < 4; i++) { const cx = ((i * 330 + t * (8 + i * 3)) % (W + 300)) - 150; cloud(ctx, cx, surfY * (0.15 + (i % 3) * 0.1), 30 + (i % 2) * 18); } }
    if (th.storm) { ctx.save(); ctx.translate(W * 0.55, surfY * 0.35); ctx.rotate(t * 0.4); for (let i = 0; i < 5; i++) { ctx.strokeStyle = 'rgba(180,160,255,' + (0.15 + i * 0.05) + ')'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, 0, 30 + i * 22, i, i + 4); ctx.stroke(); } ctx.restore(); if ((t % 5) < 0.12) { ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(0, top, W, surfY - top); ctx.strokeStyle = '#fffbd0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(W * 0.3, 0); ctx.lineTo(W * 0.33, surfY * 0.4); ctx.lineTo(W * 0.28, surfY * 0.5); ctx.lineTo(W * 0.32, surfY); ctx.stroke(); } }
    const y = surfY;
    switch (loc.theme) {
      case 'pond': hills(ctx, W, y, 90, '#8fd16a', 0); hills(ctx, W, y, 50, '#6cbf4a', 2); ctx.fillStyle = '#c0392b'; ctx.fillRect(W * 0.62, y - 70, 60, 45); tri(ctx, W * 0.62 - 6, y - 70, W * 0.62 + 30, y - 98, W * 0.62 + 66, y - 70); ctx.fillStyle = '#8e2a20'; ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillRect(W * 0.62 + 22, y - 50, 16, 25); for (let i = 0; i < 5; i++) tree(ctx, W * (0.08 + i * 0.2), y - 20, 60 + (i % 2) * 20, '#3e9b3a'); break;
      case 'river': hills(ctx, W, y, 160, '#9cb7d6', 1); hills(ctx, W, y, 70, '#5fae4a', 3); for (let i = 0; i < 9; i++) pine(ctx, W * (0.05 + i * 0.12), y - 10, 70 + (i % 3) * 18, '#2e7d32'); break;
      case 'swamp': hills(ctx, W, y, 40, '#556b2f', 1); for (let i = 0; i < 6; i++) { const x = W * (0.07 + i * 0.18); ctx.fillStyle = '#4a3a28'; ctx.beginPath(); ctx.moveTo(x - 18, y); ctx.lineTo(x - 5, y - 110); ctx.lineTo(x + 5, y - 110); ctx.lineTo(x + 18, y); ctx.fill(); ctx.fillStyle = '#4a6a2a'; ell(ctx, x, y - 120, 55, 22); ctx.fill(); ctx.strokeStyle = '#8aa070'; ctx.lineWidth = 2; for (let k = -3; k <= 3; k++) { ctx.beginPath(); ctx.moveTo(x + k * 12, y - 105); ctx.lineTo(x + k * 12 + Math.sin(t + k) * 3, y - 70 + Math.abs(k) * 6); ctx.stroke(); } } for (let i = 0; i < 12; i++) { ctx.fillStyle = 'rgba(240,255,120,' + (0.4 + 0.6 * Math.abs(Math.sin(t * 2 + i))) + ')'; circ(ctx, (i * 97 + Math.sin(t + i) * 20) % W, y - 30 - (i * 37) % 120, 2.5); ctx.fill(); } break;
      case 'mountain': for (let i = 0; i < 4; i++) { const x = W * (0.1 + i * 0.28), h = 220 + (i % 2) * 80; tri(ctx, x - 180, y, x, y - h, x + 180, y); ctx.fillStyle = '#7a8aa8'; ctx.fill(); tri(ctx, x - 55, y - h * 0.7, x, y - h, x + 55, y - h * 0.7); ctx.fillStyle = '#fff'; ctx.fill(); } hills(ctx, W, y, 40, '#4f8a4a', 2); for (let i = 0; i < 10; i++) pine(ctx, W * (0.03 + i * 0.1), y, 55, '#24603a'); break;
      case 'jungle': for (let k = 0; k < 2; k++) for (let i = 0; i < 12; i++) { ctx.fillStyle = k ? '#2f8a3a' : '#1f6a2a'; circ(ctx, W * (i / 11) + (k ? 30 : 0), y - 60 - k * 10 - (i % 3) * 25, 60 - k * 12); ctx.fill(); } ctx.strokeStyle = '#2a5a1a'; ctx.lineWidth = 3; for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.moveTo(W * i / 8, y - 140); ctx.quadraticCurveTo(W * i / 8 + 10, y - 80, W * i / 8 + Math.sin(t + i) * 5, y - 40); ctx.stroke(); } break;
      case 'beach': ctx.fillStyle = '#f0d890'; ctx.beginPath(); ctx.moveTo(W * 0.45, y); ctx.quadraticCurveTo(W * 0.7, y - 40, W, y - 50); ctx.lineTo(W, y); ctx.fill(); palm(ctx, W * 0.75, y - 30, 130, t); palm(ctx, W * 0.9, y - 45, 110, t + 1); ctx.fillStyle = '#ff5a5a'; ctx.beginPath(); ctx.arc(W * 0.6, y - 45, 35, Math.PI, TAU); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(W * 0.6, y - 45); ctx.arc(W * 0.6, y - 45, 35, Math.PI * 1.33, Math.PI * 1.66); ctx.fill(); ctx.fillStyle = '#555'; ctx.fillRect(W * 0.6 - 2, y - 45, 4, 40); break;
      case 'mangrove': for (let i = 0; i < 6; i++) { const x = W * (0.1 + i * 0.17); ctx.strokeStyle = '#5a4030'; ctx.lineWidth = 4; for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(x, y - 50); ctx.quadraticCurveTo(x + k * 18, y - 40, x + k * 22, y); ctx.stroke(); } ctx.fillStyle = '#2f7a3a'; ell(ctx, x, y - 75, 50, 35); ctx.fill(); ctx.fillStyle = '#3f9a4a'; ell(ctx, x + 15, y - 85, 30, 20); ctx.fill(); } break;
      case 'reef': case 'tropical': ctx.fillStyle = '#f0d890'; ell(ctx, W * 0.72, y, 160, 30); ctx.fill(); if (loc.theme === 'tropical') { tri(ctx, W * 0.6, y, W * 0.72, y - 150, W * 0.84, y); ctx.fillStyle = '#4a8a3a'; ctx.fill(); ctx.fillStyle = '#6a5a4a'; tri(ctx, W * 0.69, y - 120, W * 0.72, y - 150, W * 0.75, y - 120); ctx.fill(); } palm(ctx, W * 0.66, y - 15, 100, t); palm(ctx, W * 0.8, y - 15, 85, t + 2); break;
      case 'kelp': ctx.fillStyle = '#6a6a72'; ctx.beginPath(); ctx.moveTo(W * 0.55, y); ctx.lineTo(W * 0.62, y - 130); ctx.lineTo(W * 0.78, y - 160); ctx.lineTo(W * 0.92, y - 110); ctx.lineTo(W, y - 120); ctx.lineTo(W, y); ctx.fill(); ctx.fillStyle = '#4a8a3a'; ctx.fillRect(W * 0.62, y - 135, W * 0.38, 12); break;
      case 'harbor': ctx.fillStyle = '#5a5f66'; ctx.beginPath(); ctx.moveTo(W * 0.6, y); ctx.lineTo(W * 0.65, y - 40); ctx.lineTo(W, y - 50); ctx.lineTo(W, y); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillRect(W * 0.78, y - 170, 30, 125); ctx.fillStyle = '#d22'; for (let i = 0; i < 3; i++) ctx.fillRect(W * 0.78, y - 160 + i * 40, 30, 15); ctx.fillStyle = '#333'; ctx.fillRect(W * 0.775, y - 190, 34, 22); ctx.fillStyle = '#ffeb7a'; ctx.fillRect(W * 0.78 + 5, y - 186, 20, 14); ctx.save(); ctx.translate(W * 0.78 + 15, y - 180); ctx.rotate(Math.sin(t * 0.8) * 1.2 + Math.PI); ctx.fillStyle = 'rgba(255,250,180,0.25)'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(400, -40); ctx.lineTo(400, 40); ctx.fill(); ctx.restore(); for (let i = 0; i < 4; i++) { ctx.fillStyle = ['#e8c050', '#5a9ad8', '#e87050', '#7ac070'][i]; ctx.fillRect(W * (0.86 + i * 0.035), y - 75, 22, 25); } break;
      case 'arctic': for (let i = 0; i < 4; i++) { const x = W * (0.2 + i * 0.22), h = 60 + (i % 2) * 50; ctx.fillStyle = '#f4fbff'; ctx.beginPath(); ctx.moveTo(x - 70, y); ctx.lineTo(x - 40, y - h); ctx.lineTo(x + 5, y - h - 20); ctx.lineTo(x + 50, y - h * 0.6); ctx.lineTo(x + 80, y); ctx.fill(); ctx.fillStyle = '#bfe0f0'; ctx.beginPath(); ctx.moveTo(x + 5, y - h - 20); ctx.lineTo(x + 50, y - h * 0.6); ctx.lineTo(x + 80, y); ctx.lineTo(x + 10, y); ctx.fill(); } break;
      case 'ocean': for (let i = 0; i < 3; i++) { const bx = ((t * 20 + i * 200) % (W + 100)) - 50, by = y * 0.4 + i * 30; ctx.strokeStyle = '#333'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(bx - 12, by); ctx.quadraticCurveTo(bx - 6, by - 8 - Math.sin(t * 6 + i) * 4, bx, by); ctx.quadraticCurveTo(bx + 6, by - 8 - Math.sin(t * 6 + i) * 4, bx + 12, by); ctx.stroke(); } ctx.fillStyle = '#555'; ctx.fillRect(W * 0.7, y - 18, 80, 12); ctx.fillRect(W * 0.7 + 20, y - 34, 20, 16); break;
      case 'shipwreck': ctx.save(); ctx.translate(W * 0.72, y); ctx.rotate(0.25); ctx.fillStyle = '#4a3020'; ctx.fillRect(-6, -220, 12, 220); ctx.fillRect(-60, -170, 120, 8); ctx.fillStyle = '#222'; ctx.beginPath(); ctx.moveTo(6, -215); ctx.lineTo(70 + Math.sin(t * 3) * 6, -205); ctx.lineTo(60 + Math.sin(t * 3 + 1) * 6, -175); ctx.lineTo(6, -180); ctx.fill(); ctx.fillStyle = '#fff'; circ(ctx, 35, -195, 8); ctx.fill(); ctx.fillStyle = '#e8e0c8'; ctx.beginPath(); ctx.moveTo(-50, -160); ctx.quadraticCurveTo(-10, -120, -48, -60); ctx.lineTo(-52, -62); ctx.quadraticCurveTo(-20, -110, -55, -158); ctx.fill(); ctx.restore(); ctx.fillStyle = '#4a3020'; ctx.beginPath(); ctx.moveTo(W * 0.6, y); ctx.lineTo(W * 0.65, y - 30); ctx.lineTo(W * 0.85, y - 25); ctx.lineTo(W * 0.88, y); ctx.fill(); break;
      case 'volcano': { tri(ctx, W * 0.45, y, W * 0.68, y - 260, W * 0.95, y); ctx.fillStyle = '#3a2a2a'; ctx.fill(); ctx.fillStyle = '#ff5a1a'; ctx.beginPath(); ctx.moveTo(W * 0.66, y - 255); ctx.quadraticCurveTo(W * 0.64, y - 150, W * 0.6, y - 60); ctx.lineTo(W * 0.62, y - 60); ctx.quadraticCurveTo(W * 0.67, y - 150, W * 0.7, y - 255); ctx.fill(); for (let i = 0; i < 6; i++) { const q = (t * 0.2 + i / 6) % 1; ctx.fillStyle = 'rgba(80,70,70,' + (0.7 - q * 0.7) + ')'; circ(ctx, W * 0.68 + Math.sin(i * 2) * 30 * q, y - 270 - q * 200, 25 + q * 40); ctx.fill(); } for (let i = 0; i < 18; i++) { const q = (t * 0.5 + i / 18) % 1; ctx.fillStyle = 'rgba(255,' + (100 + i * 8) + ',40,' + (1 - q) + ')'; circ(ctx, W * 0.68 + Math.sin(i * 7.7) * 120 * q, y - 260 - Math.sin(q * Math.PI) * 150 + q * 120, 3); ctx.fill(); } break; }
      case 'atlantis': for (let i = 0; i < 5; i++) { const x = W * (0.5 + i * 0.1), h = 90 + (i % 2) * 40; ctx.fillStyle = '#f4ead0'; ctx.fillRect(x - 10, y - h, 20, h); ctx.fillStyle = '#e0d4b0'; ctx.fillRect(x - 15, y - h - 8, 30, 10); ctx.strokeStyle = '#c8b890'; ctx.lineWidth = 1.5; for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(x + k * 5, y - h); ctx.lineTo(x + k * 5, y); ctx.stroke(); } } ctx.fillStyle = '#ffd23f'; tri(ctx, W * 0.48, y - 135, W * 0.7, y - 190, W * 0.92, y - 135); ctx.fill(); break;
      case 'northpole': { ctx.fillStyle = '#f4f8ff'; ctx.beginPath(); ctx.moveTo(W * 0.4, y); ctx.quadraticCurveTo(W * 0.7, y - 50, W, y - 40); ctx.lineTo(W, y); ctx.fill(); const hx = W * 0.72; ctx.fillStyle = '#a0402a'; ctx.fillRect(hx, y - 90, 90, 55); ctx.fillStyle = '#fff'; tri(ctx, hx - 10, y - 88, hx + 45, y - 130, hx + 100, y - 88); ctx.fill(); ctx.fillStyle = '#ffd86b'; ctx.fillRect(hx + 12, y - 75, 18, 16); ctx.fillRect(hx + 58, y - 75, 18, 16); ctx.fillStyle = '#5a2a1a'; ctx.fillRect(hx + 36, y - 65, 18, 30); const px = W * 0.9; for (let i = 0; i < 8; i++) { ctx.fillStyle = i % 2 ? '#fff' : '#e02a3a'; ctx.fillRect(px - 5, y - 140 + i * 13, 10, 13); } ctx.fillStyle = '#ffd23f'; circ(ctx, px, y - 146, 9); ctx.fill(); pine(ctx, W * 0.6, y - 20, 70, '#2a6a3a'); break; }
      case 'trench': circ(ctx, W * 0.25, y * 0.3, 30); ctx.fillStyle = '#eef'; ctx.fill(); break;
      case 'cosmic': break;
    }
    if (th.haze) { const hg = ctx.createLinearGradient(0, y - 200, 0, y); hg.addColorStop(0, 'rgba(255,255,255,0)'); hg.addColorStop(1, th.haze); ctx.fillStyle = hg; ctx.fillRect(0, y - 200, W, 200); }
    if (th.snow) { ctx.fillStyle = '#fff'; for (let i = 0; i < 60; i++) { const sx = (i * 73 + Math.sin(t + i) * 20) % W, sy = (i * 41 + t * (20 + i % 5 * 6)) % Math.max(50, y); circ(ctx, sx, sy, 1.5 + (i % 3)); ctx.fill(); } }
  }

  // Underwater column. camY = world y at top of screen; world y=0 is the surface.
  function water(ctx, loc, W, H, camY, worldBottom, t) {
    const th = THEMES[loc.theme], sy = -camY;
    if (sy > H) return;
    const g = ctx.createLinearGradient(0, sy, 0, worldBottom - camY);
    g.addColorStop(0, th.water[0]); g.addColorStop(0.35, mix(th.water[0], th.water[1], 0.55)); g.addColorStop(1, th.water[1]);
    ctx.fillStyle = g; ctx.fillRect(0, Math.max(0, sy), W, H - Math.max(0, sy));
    // light rays
    if (sy > -500) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < 5; i++) { const x = W * (0.1 + i * 0.22) + Math.sin(t * 0.3 + i) * 40; const rg = ctx.createLinearGradient(0, sy, 0, sy + 420); rg.addColorStop(0, 'rgba(255,255,255,0.09)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = rg; ctx.beginPath(); ctx.moveTo(x - 25, sy); ctx.lineTo(x + 25, sy); ctx.lineTo(x + 110, sy + 420); ctx.lineTo(x + 20, sy + 420); ctx.fill(); } ctx.restore(); }
    // marine snow / sparkles (parallax)
    ctx.fillStyle = loc.theme === 'cosmic' ? 'rgba(255,220,255,0.6)' : loc.theme === 'volcano' ? 'rgba(255,140,60,0.5)' : 'rgba(255,255,255,0.35)';
    for (let i = 0; i < 40; i++) { const px = (i * 131.7 + Math.sin(t * 0.5 + i) * 15) % W, py = (((i * 89.3 - camY * 0.6 - t * 8) % H) + H) % H; if (py > sy) { circ(ctx, px, py, 1 + (i % 3) * 0.6); ctx.fill(); } }
  }
  function surface(ctx, loc, W, sy, t) {
    const th = THEMES[loc.theme];
    ctx.fillStyle = th.water[0]; ctx.beginPath(); ctx.moveTo(0, sy + 8);
    for (let x = 0; x <= W + 10; x += 10) ctx.lineTo(x, sy + Math.sin(x * 0.03 + t * 2) * 3 + Math.sin(x * 0.011 - t) * 2);
    ctx.lineTo(W, sy + 8); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 3; ctx.beginPath();
    for (let x = 0; x <= W + 10; x += 10) { const yy = sy + Math.sin(x * 0.03 + t * 2) * 3 + Math.sin(x * 0.011 - t) * 2; x ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy); }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) { const x = ((i * 157 + t * 15) % (W + 60)) - 30; ctx.beginPath(); ctx.moveTo(x, sy + 14 + (i % 3) * 8); ctx.lineTo(x + 24, sy + 14 + (i % 3) * 8); ctx.stroke(); }
  }
  function seabed(ctx, loc, W, by, t) {
    const th = THEMES[loc.theme];
    ctx.fillStyle = th.floor; ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, by + 40); for (let x = 0; x <= W + 20; x += 20) ctx.lineTo(x, by + Math.sin(x * 0.013) * 14 + Math.sin(x * 0.041) * 6); ctx.lineTo(W, by + 2000); ctx.lineTo(0, by + 2000); ctx.closePath(); ctx.fill(); ctx.stroke();
    const r = seeded(loc.tier * 0.0371 + 0.01);
    for (let i = 0; i < 14; i++) {
      const x = r() * W, y = by + Math.sin(x * 0.013) * 14 + 4, s = 0.7 + r() * 0.6, sw = Math.sin(t * 1.2 + i) * 0.12;
      ctx.save(); ctx.translate(x, y); ctx.lineWidth = 2.5; ctx.strokeStyle = OUT;
      switch (th.deco) {
        case 'reeds': case 'weeds': case 'kelp': { const h = (th.deco === 'kelp' ? 220 : 80) * s; ctx.lineCap = 'round'; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(k * 8 - 8, 0); ctx.quadraticCurveTo(k * 8 - 8 + Math.sin(t + i + k) * 20, -h * 0.5, k * 8 - 8 + Math.sin(t * 1.3 + i + k) * 30, -h); ctx.lineWidth = th.deco === 'kelp' ? 9 : 5; ctx.strokeStyle = th.deco === 'kelp' ? '#8a7a2a' : '#3f8a3a'; ctx.stroke(); } if (th.deco === 'reeds') { ctx.fillStyle = '#6b4a2a'; ell(ctx, Math.sin(t * 1.3 + i) * 30, -h, 4, 12); ctx.fill(); } break; }
        case 'rocks': case 'wreck': ctx.fillStyle = th.deco === 'wreck' && i % 3 === 0 ? '#5a3a20' : '#7a7f88'; ell(ctx, 0, 0, 30 * s, 18 * s); ctx.fill(); ctx.stroke(); if (th.deco === 'wreck' && i % 4 === 1) { ctx.fillStyle = '#c8a040'; ctx.fillRect(-14, -26, 28, 20); ctx.strokeRect(-14, -26, 28, 20); ctx.fillStyle = '#ffd23f'; circ(ctx, 0, -28, 5); ctx.fill(); } break;
        case 'shells': ctx.fillStyle = ['#ffb3c1', '#ffe0a0', '#fff'][i % 3]; ctx.beginPath(); ctx.arc(0, 0, 9 * s, Math.PI, TAU); ctx.closePath(); ctx.fill(); ctx.stroke(); break;
        case 'coral': { ctx.rotate(sw); ctx.fillStyle = ['#ff6b8a', '#ffb347', '#b06cff', '#5ad8ff'][i % 4]; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.ellipse((k - 1.5) * 9, -18 * s - (k % 2) * 10, 6, 20 * s, (k - 1.5) * 0.3, 0, TAU); ctx.fill(); ctx.stroke(); } break; }
        case 'ice': ctx.fillStyle = 'rgba(220,245,255,0.9)'; tri(ctx, -12 * s, 0, 0, -40 * s, 12 * s, 0); ctx.fill(); ctx.stroke(); break;
        case 'lava': ctx.fillStyle = '#2a1a18'; tri(ctx, -26 * s, 0, 0, -50 * s, 26 * s, 0); ctx.fill(); ctx.stroke(); { const q = (t * 0.6 + i * 0.3) % 1; ctx.fillStyle = 'rgba(255,120,40,' + (1 - q) + ')'; circ(ctx, Math.sin(i + t) * 6, -50 * s - q * 80, 6 + q * 10); ctx.fill(); } break;
        case 'vents': ctx.fillStyle = '#25252d'; ctx.fillRect(-10 * s, -50 * s, 20 * s, 50 * s); ctx.strokeRect(-10 * s, -50 * s, 20 * s, 50 * s); for (let k = 0; k < 4; k++) { const q = (t * 0.4 + k / 4 + i * 0.1) % 1; ctx.fillStyle = 'rgba(60,60,70,' + (0.8 - q * 0.8) + ')'; circ(ctx, Math.sin(k + t) * 8 * q, -50 * s - q * 90, 8 + q * 16); ctx.fill(); } break;
        case 'columns': ctx.fillStyle = '#efe4c8'; ctx.fillRect(-10, -80 * s, 20, 80 * s); ctx.strokeRect(-10, -80 * s, 20, 80 * s); ctx.fillRect(-15, -86 * s, 30, 8); ctx.strokeRect(-15, -86 * s, 30, 8); break;
        case 'candy': for (let k = 0; k < 6; k++) { ctx.fillStyle = k % 2 ? '#fff' : '#e02a3a'; ctx.fillRect(-5, -k * 12 - 12, 10, 12); } ctx.strokeRect(-5, -72, 10, 72); break;
        case 'crystals': ctx.fillStyle = loc.theme === 'cosmic' ? 'rgba(255,140,255,0.8)' : 'rgba(150,220,255,0.8)'; for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(k * 10 - 5, 0); ctx.lineTo(k * 12, -30 * s - (k === 0 ? 20 : 0)); ctx.lineTo(k * 10 + 5, 0); ctx.closePath(); ctx.fill(); ctx.stroke(); } break;
      }
      ctx.restore();
    }
  }
  function mix(h1, h2, q) { const a = parseInt(h1.slice(1), 16), b = parseInt(h2.slice(1), 16); const c = (s) => Math.round(((a >> s) & 255) * (1 - q) + ((b >> s) & 255) * q); return 'rgb(' + c(16) + ',' + c(8) + ',' + c(0) + ')'; }

  // Dock or boat + the fisher. Returns rod tip position.
  function fisher(ctx, loc, x, sy, k, t, pose, rod) {
    const bob = loc.boat ? Math.sin(t * 1.6) * 3 * k : 0;
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = OUT; ctx.lineWidth = 2.5 * k;
    let fy;
    if (loc.boat) {
      ctx.translate(0, bob);
      ctx.beginPath(); ctx.moveTo(x - 90 * k, sy - 30 * k); ctx.lineTo(x + 80 * k, sy - 30 * k); ctx.quadraticCurveTo(x + 70 * k, sy + 14 * k, x + 40 * k, sy + 16 * k); ctx.lineTo(x - 70 * k, sy + 16 * k); ctx.quadraticCurveTo(x - 90 * k, sy, x - 90 * k, sy - 30 * k); ctx.closePath(); ctx.fillStyle = '#c8553d'; ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#f2e6c8'; ctx.fillRect(x - 88 * k, sy - 30 * k, 166 * k, 7 * k); ctx.strokeRect(x - 88 * k, sy - 30 * k, 166 * k, 7 * k);
      ctx.fillStyle = '#fff'; ctx.font = 'bold ' + (11 * k) + 'px sans-serif'; ctx.fillText('S.S. TYCOON', x - 55 * k, sy - 6 * k);
      fy = sy - 30 * k;
    } else {
      ctx.fillStyle = '#8a5a32';
      for (let i = 0; i < 3; i++) { ctx.fillRect(x - 100 * k + i * 60 * k, sy - 30 * k, 10 * k, 60 * k); ctx.strokeRect(x - 100 * k + i * 60 * k, sy - 30 * k, 10 * k, 60 * k); }
      ctx.fillStyle = '#b07a46'; ctx.fillRect(-10, sy - 40 * k, x + 50 * k + 10, 12 * k); ctx.strokeRect(-10, sy - 40 * k, x + 50 * k + 10, 12 * k);
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'; for (let px = x + 40 * k; px > 0; px -= 26 * k) { ctx.beginPath(); ctx.moveTo(px, sy - 40 * k); ctx.lineTo(px, sy - 28 * k); ctx.stroke(); }
      ctx.strokeStyle = OUT; fy = sy - 40 * k;
    }
    // bucket
    ctx.fillStyle = '#9aa7b4'; ctx.beginPath(); ctx.moveTo(x - 62 * k, fy); ctx.lineTo(x - 66 * k, fy - 24 * k); ctx.lineTo(x - 38 * k, fy - 24 * k); ctx.lineTo(x - 42 * k, fy); ctx.closePath(); ctx.fill(); ctx.stroke();
    // legs
    ctx.fillStyle = '#3d5a9a'; ctx.fillRect(x - 14 * k, fy - 34 * k, 11 * k, 34 * k); ctx.strokeRect(x - 14 * k, fy - 34 * k, 11 * k, 34 * k); ctx.fillRect(x + 2 * k, fy - 34 * k, 11 * k, 34 * k); ctx.strokeRect(x + 2 * k, fy - 34 * k, 11 * k, 34 * k);
    ctx.fillStyle = '#4a3020'; ell(ctx, x - 9 * k, fy - 3 * k, 10 * k, 5 * k); ctx.fill(); ctx.stroke(); ell(ctx, x + 9 * k, fy - 3 * k, 10 * k, 5 * k); ctx.fill(); ctx.stroke();
    // body
    ctx.fillStyle = '#d64545'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x - 18 * k, fy - 74 * k, 36 * k, 44 * k, 10 * k) : ctx.rect(x - 18 * k, fy - 74 * k, 36 * k, 44 * k); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(x - 18 * k + i * 9 * k, fy - 72 * k); ctx.lineTo(x - 18 * k + i * 9 * k, fy - 32 * k); ctx.stroke(); }
    ctx.strokeStyle = OUT; ctx.fillStyle = '#3d5a9a'; ctx.fillRect(x - 14 * k, fy - 54 * k, 28 * k, 22 * k); ctx.strokeRect(x - 14 * k, fy - 54 * k, 28 * k, 22 * k);
    ctx.beginPath(); ctx.moveTo(x - 12 * k, fy - 54 * k); ctx.lineTo(x - 10 * k, fy - 72 * k); ctx.moveTo(x + 12 * k, fy - 54 * k); ctx.lineTo(x + 10 * k, fy - 72 * k); ctx.lineWidth = 4 * k; ctx.strokeStyle = '#3d5a9a'; ctx.stroke(); ctx.lineWidth = 2.5 * k; ctx.strokeStyle = OUT;
    // head
    const hy = fy - 92 * k;
    circ(ctx, x, hy, 18 * k); ctx.fillStyle = '#ffcf9e'; ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#8a5a3a'; ctx.beginPath(); ctx.arc(x, hy + 3 * k, 17 * k, 0.15 * Math.PI, 0.85 * Math.PI); ctx.quadraticCurveTo(x, hy + 30 * k, x + 16 * k * Math.cos(0.15 * Math.PI), hy + 3 * k + 17 * k * Math.sin(0.15 * Math.PI)); ctx.fill(); ctx.stroke();
    circ(ctx, x + 14 * k, hy + 2 * k, 6 * k); ctx.fillStyle = '#ffb07a'; ctx.fill(); ctx.stroke();
    const blink = (t % 4) < 0.12; ctx.fillStyle = OUT;
    if (blink) { ctx.beginPath(); ctx.moveTo(x + 2 * k, hy - 5 * k); ctx.lineTo(x + 9 * k, hy - 5 * k); ctx.stroke(); } else { circ(ctx, x + 5 * k, hy - 5 * k, 2.6 * k); ctx.fill(); circ(ctx, x - 4 * k, hy - 5 * k, 2.6 * k); ctx.fill(); }
    // hat
    ctx.fillStyle = '#6b7a3a'; ctx.beginPath(); ctx.ellipse(x, hy - 12 * k, 27 * k, 6 * k, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 15 * k, hy - 13 * k); ctx.quadraticCurveTo(x - 15 * k, hy - 34 * k, x, hy - 34 * k); ctx.quadraticCurveTo(x + 15 * k, hy - 34 * k, x + 15 * k, hy - 13 * k); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ff5a3a'; ctx.beginPath(); ctx.moveTo(x - 6 * k, hy - 28 * k); ctx.lineTo(x - 18 * k, hy - 36 * k); ctx.lineTo(x - 8 * k, hy - 22 * k); ctx.fill();
    // rod: pose = angle (radians from +x, negative is up)
    const hx = x + 16 * k, hY = fy - 58 * k, len = (95 + rod.id * 1.2) * k;
    const ang = pose;
    const tipX = hx + Math.cos(ang) * len, tipY = hY + Math.sin(ang) * len;
    const bend = Math.sin(t * 2) * 2 * k;
    ctx.beginPath(); ctx.moveTo(hx - Math.cos(ang) * 14 * k, hY - Math.sin(ang) * 14 * k); ctx.quadraticCurveTo((hx + tipX) / 2, (hY + tipY) / 2 + bend, tipX, tipY);
    ctx.lineWidth = 7 * k; ctx.strokeStyle = OUT; ctx.stroke();
    ctx.lineWidth = 4 * k; ctx.strokeStyle = rod.id === 0 ? '#8a6a3a' : rod.metal ? 'hsl(' + rod.hue + ',70%,60%)' : 'hsl(' + rod.hue + ',55%,45%)'; ctx.stroke();
    if (rod.id === 0) { ctx.strokeStyle = '#5a3a1a'; ctx.lineWidth = 2 * k; for (let i = 1; i < 4; i++) { const q = i / 4; ctx.beginPath(); ctx.moveTo(hx + Math.cos(ang) * len * q, hY + Math.sin(ang) * len * q); ctx.lineTo(hx + Math.cos(ang) * len * q + 6 * k, hY + Math.sin(ang) * len * q - 6 * k); ctx.stroke(); } }
    if (rod.id >= 31) { ctx.save(); ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 4); circ(ctx, tipX, tipY, 5 * k); ctx.fillStyle = '#fff6b0'; ctx.fill(); ctx.restore(); }
    circ(ctx, hx + Math.cos(ang) * 10 * k, hY + Math.sin(ang) * 10 * k + 4 * k, 6 * k); ctx.fillStyle = '#aab'; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 2 * k; ctx.stroke();
    // arm
    ctx.beginPath(); ctx.moveTo(x + 10 * k, fy - 68 * k); ctx.lineTo(hx, hY); ctx.lineWidth = 9 * k; ctx.strokeStyle = OUT; ctx.stroke(); ctx.lineWidth = 6 * k; ctx.strokeStyle = '#d64545'; ctx.stroke();
    circ(ctx, hx, hY, 5 * k); ctx.fillStyle = '#ffcf9e'; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 2 * k; ctx.stroke();
    ctx.restore();
    return { x: tipX, y: tipY + bob };
  }

  function bobber(ctx, x, y, k, t, bite) {
    const b = bite ? Math.sin(t * 30) * 4 * k + 5 * k : Math.sin(t * 3) * 2 * k;
    ctx.save(); ctx.strokeStyle = OUT; ctx.lineWidth = 2 * k;
    ctx.beginPath(); ctx.arc(x, y + b, 8 * k, 0, Math.PI); ctx.closePath(); ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y + b, 8 * k, Math.PI, TAU); ctx.closePath(); ctx.fillStyle = '#ff3b3b'; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y + b - 8 * k); ctx.lineTo(x, y + b - 14 * k); ctx.stroke();
    ctx.restore();
  }
  function hook(ctx, x, y, k, bait) {
    ctx.save(); ctx.strokeStyle = '#c8ccd4'; ctx.lineWidth = 2.5 * k; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y - 8 * k); ctx.lineTo(x, y + 4 * k); ctx.arc(x - 5 * k, y + 4 * k, 5 * k, 0, Math.PI * 0.9); ctx.stroke();
    if (bait) { circ(ctx, x - 1 * k, y + 2 * k, 5 * k); ctx.fillStyle = 'hsl(' + bait.hue + ',70%,55%)'; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 1.5 * k; ctx.stroke(); }
    ctx.restore();
  }

  G.Art = { creature, motion, backdrop, water, surface, seabed, fisher, bobber, hook, THEMES, star, flairShape, cloud, C };
})(window);
