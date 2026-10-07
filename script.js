/* =========================================================
   SEGURANÇA EM HARDWARE // SEMINÁRIO 05
   Navegação: setas, espaço, clique, roda do mouse ou toque
   F tela cheia · T cronômetro · R zera cronômetro · 1..0 vai ao slide
   ========================================================= */
(() => {
  'use strict';

  const G = 0x00ff66, G2 = 0x00c24e, G3 = 0x0a7a35, W = 0xe6ffef, DARK = 0x021a0b;
  const ADD = THREE.AdditiveBlending;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ---------------- MATRIX RAIN ---------------- */
  const mc = $('#matrix'), mx = mc.getContext('2d');
  const glyphs = '01ABCDEF0101<>/{}[]#$%アイウエオカキクケコサシスセソ01'.split('');
  let cols = [], fs = 16;
  function sizeMatrix() {
    mc.width = innerWidth; mc.height = innerHeight;
    fs = Math.max(14, Math.round(innerWidth / 110));
    cols = Array.from({ length: Math.ceil(innerWidth / fs) }, () => rand(-50, 0));
  }
  sizeMatrix();
  let mLast = 0;
  function drawMatrix(t) {
    if (t - mLast < 45) return; mLast = t;
    mx.fillStyle = 'rgba(0,0,0,0.09)'; mx.fillRect(0, 0, mc.width, mc.height);
    mx.font = fs + 'px "Share Tech Mono", monospace';
    for (let i = 0; i < cols.length; i++) {
      const y = cols[i] * fs;
      const ch = glyphs[(Math.random() * glyphs.length) | 0];
      mx.fillStyle = Math.random() > .975 ? '#e6ffef' : '#00ff66';
      mx.fillText(ch, i * fs, y);
      if (y > mc.height && Math.random() > .975) cols[i] = rand(-20, 0);
      cols[i] += 1;
    }
  }

  /* ---------------- THREE BASE ---------------- */
  const canvas = $('#gl');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x000000, 0.03);
  const camera = new THREE.PerspectiveCamera(48, innerWidth / innerHeight, 0.1, 300);
  camera.position.set(0, 2, 12);
  const camPos = new THREE.Vector3(0, 2, 12), camLook = new THREE.Vector3(), lookNow = new THREE.Vector3();

  function edges(geo, color = G, op = 1) {
    return new THREE.LineSegments(new THREE.EdgesGeometry(geo),
      new THREE.LineBasicMaterial({ color, transparent: true, opacity: op, blending: ADD, depthWrite: false }));
  }
  function neonBox(w, h, d, fc = DARK, ec = G, fo = 1, eo = 1) {
    const geo = new THREE.BoxGeometry(w, h, d), g = new THREE.Group();
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: fc, transparent: fo < 1, opacity: fo, depthWrite: fo >= 1 }));
    const e = edges(geo, ec, eo);
    g.add(m, e); g.userData = { m, e }; return g;
  }
  const glowTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d'), gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.18, 'rgba(150,255,190,.85)');
    gr.addColorStop(.45, 'rgba(0,255,102,.28)'); gr.addColorStop(1, 'rgba(0,255,102,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  })();
  function glow(size, color = G, op = 1) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity: op, blending: ADD, depthWrite: false }));
    s.scale.set(size, size, 1); return s;
  }
  function label(text, h = .38, color = '#00ff66') {
    const c = document.createElement('canvas'), x = c.getContext('2d');
    const font = '700 72px "Share Tech Mono", Consolas, monospace';
    x.font = font; const w = Math.ceil(x.measureText(text).width) + 40;
    c.width = w; c.height = 110; x.font = font; x.textBaseline = 'middle';
    x.shadowColor = '#00ff66'; x.shadowBlur = 18; x.fillStyle = color; x.fillText(text, 20, 58);
    const tex = new THREE.CanvasTexture(c); tex.minFilter = THREE.LinearFilter;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: ADD }));
    s.scale.set(h * w / 110, h, 1); return s;
  }
  function circleLine(r, color = G, op = .6, seg = 128, dashed = false) {
    const pts = []; for (let i = 0; i <= seg; i++) { const a = i / seg * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r)); }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = dashed ? new THREE.LineDashedMaterial({ color, dashSize: .25, gapSize: .18, transparent: true, opacity: op, blending: ADD })
      : new THREE.LineBasicMaterial({ color, transparent: true, opacity: op, blending: ADD });
    const l = new THREE.Line(geo, mat); if (dashed) l.computeLineDistances(); return l;
  }
  function polyline(pts, color = G, op = 1) {
    return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color, transparent: true, opacity: op, blending: ADD, depthWrite: false }));
  }
  function along(pts, u, out) { // interpola posição em uma polilinha
    const n = pts.length - 1, f = clamp(u, 0, .9999) * n, i = Math.floor(f);
    return out.copy(pts[i]).lerp(pts[i + 1], f - i);
  }

  /* ---------------- FUNDO GLOBAL ---------------- */
  const dustGeo = new THREE.BufferGeometry(), dN = 1400, dp = new Float32Array(dN * 3);
  for (let i = 0; i < dN; i++) { dp[i * 3] = rand(-40, 40); dp[i * 3 + 1] = rand(-15, 25); dp[i * 3 + 2] = rand(-60, 10); }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dp, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: G, size: .07, transparent: true, opacity: .55, blending: ADD, depthWrite: false }));
  scene.add(dust);
  const grid = new THREE.GridHelper(160, 160, G3, 0x063a1b);
  grid.material.transparent = true; grid.material.opacity = .45; grid.position.y = -6; scene.add(grid);

  /* ---------------- CHIP REUTILIZÁVEL ---------------- */
  function dieTexture() {
    const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d');
    x.strokeStyle = 'rgba(0,255,102,.9)'; x.lineWidth = 3; x.strokeRect(16, 16, 480, 480);
    x.lineWidth = 2;
    for (let i = 0; i < 4; i++) { // 4 núcleos
      const cx = 40 + (i % 2) * 230, cy = 40 + Math.floor(i / 2) * 190;
      x.strokeStyle = 'rgba(0,255,102,.75)'; x.strokeRect(cx, cy, 200, 160);
      for (let k = 0; k < 9; k++) { x.strokeStyle = 'rgba(0,255,102,.25)'; x.strokeRect(cx + 10 + (k % 3) * 62, cy + 10 + Math.floor(k / 3) * 48, 52, 38); }
    }
    x.fillStyle = 'rgba(0,255,102,.18)'; x.fillRect(40, 430, 430, 46); // cache L3
    x.strokeStyle = 'rgba(0,255,102,.8)'; x.strokeRect(40, 430, 430, 46);
    for (let k = 0; k < 20; k++) { x.beginPath(); x.moveTo(48 + k * 21, 434); x.lineTo(48 + k * 21, 472); x.stroke(); }
    x.font = '700 30px "Share Tech Mono", monospace'; x.fillStyle = '#e6ffef'; x.shadowColor = '#00ff66'; x.shadowBlur = 12;
    x.fillText('HW-SEC // 05', 160, 405);
    const t = new THREE.CanvasTexture(c); return t;
  }
  function buildChip() {
    const chip = new THREE.Group();
    const sub = neonBox(4.4, .22, 4.4, 0x010d06, G3, 1, .9); chip.add(sub);
    const die = neonBox(2.1, .18, 2.1, 0x02160a, G, 1, 1); die.position.y = .2; chip.add(die);
    const top = new THREE.Mesh(new THREE.PlaneGeometry(2.04, 2.04),
      new THREE.MeshBasicMaterial({ map: dieTexture(), transparent: true, blending: ADD, depthWrite: false }));
    top.rotation.x = -Math.PI / 2; top.position.y = .3; chip.add(top);
    const pinGeo = new THREE.BoxGeometry(.32, .05, .09), pinMat = new THREE.MeshBasicMaterial({ color: G2 });
    const traces = [];
    const N = 14;
    for (let s = 0; s < 4; s++) {
      const rot = s * Math.PI / 2, cs = Math.cos(rot), sn = Math.sin(rot);
      const R = (x, z) => new THREE.Vector3(x * cs - z * sn, .12, x * sn + z * cs);
      for (let i = 0; i < N; i++) {
        const z0 = -.9 + i * (1.8 / (N - 1)), zp = -1.95 + i * (3.9 / (N - 1));
        const pts = [R(1.05, z0), R(1.32, z0), R(1.9, zp), R(2.2, zp)];
        const ln = polyline(pts, G, .55); chip.add(ln); traces.push(pts);
        const pin = new THREE.Mesh(pinGeo, pinMat); const pp = R(2.36, zp); pin.position.set(pp.x, -.02, pp.z); pin.rotation.y = -rot; chip.add(pin);
      }
    }
    const pulses = [];
    for (let i = 0; i < 22; i++) {
      const p = glow(.28, i % 4 ? G : W, 1); chip.add(p);
      pulses.push({ p, path: traces[(Math.random() * traces.length) | 0], ph: Math.random(), sp: rand(.35, .8), dir: Math.random() > .5 });
    }
    const halo = glow(5.5, G, .35); halo.position.y = .5; chip.add(halo);
    const v = new THREE.Vector3();
    chip.userData.tick = (t) => {
      for (const q of pulses) {
        let u = (t * q.sp + q.ph) % 1; if (q.dir) u = 1 - u;
        along(q.path, u, v); q.p.position.copy(v); q.p.position.y = .16;
        if (u > .985 || u < .015) { q.path = traces[(Math.random() * traces.length) | 0]; }
      }
      halo.material.opacity = .25 + Math.sin(t * 2.2) * .1;
    };
    return chip;
  }

  /* ---------------- REGISTRO DE CENAS ---------------- */
  const scenes = {};
  function reg(name, offset, cam, build) {
    const group = new THREE.Group(); group.visible = false; scene.add(group);
    const s = { name, group, offset: new THREE.Vector3(...offset), cam, a: 0, target: 0, update: () => { } };
    const u = build(group, s); if (u) s.update = u;
    scenes[name] = s;
  }
  const LEFT_CAM = { pos: [0, 1.4, 12.5], look: [0, 0, 0] };
  let timelineActive = -1;

  function buildScenes() {
    /* 01 CHIP */
    reg('chip', [0, -3.1, 0], { pos: [0, 2.6, 11], look: [0, -.9, 0] }, (g) => {
      const chip = buildChip(); chip.rotation.x = .42; g.add(chip);
      const r1 = circleLine(3.6, G, .5, 160, true); r1.rotation.x = .42; g.add(r1);
      const r2 = circleLine(4.4, G3, .6); r2.rotation.x = .42; g.add(r2);
      const orb = []; for (let i = 0; i < 3; i++) { const o = glow(.5, W); g.add(o); orb.push(o); }
      return (t) => {
        chip.rotation.y = t * .28; chip.position.y = Math.sin(t * 1.2) * .12;
        chip.userData.tick(t); r1.rotation.z = Math.sin(t * .4) * .08;
        orb.forEach((o, i) => { const a = t * (.8 + i * .25) + i * 2.1; o.position.set(Math.cos(a) * (3.6 + i * .4), Math.sin(a) * .9 * Math.sin(.42) * 1.5, Math.sin(a) * (3.6 + i * .4) * .9); });
      };
    });

    /* 02 PIPELINE */
    reg('pipeline', [3.9, -.4, 0], LEFT_CAM, (g) => {
      g.rotation.set(.32, -.42, 0);
      const names = ['IF', 'ID', 'EX', 'MEM', 'WB'];
      names.forEach((n, i) => {
        const b = neonBox(1, 1, 1, DARK, G, .35, .9); b.position.x = -3.2 + i * 1.6; g.add(b);
        const l = label(n, .34); l.position.set(b.position.x, -.95, 0); g.add(l);
      });
      g.add(polyline([new THREE.Vector3(-5, 0, 0), new THREE.Vector3(5, 0, 0)], G3, .8));
      const fork = polyline([new THREE.Vector3(0, 0, 0), new THREE.Vector3(2.4, 2.05, 0)], W, .35); g.add(fork);
      const cells = [];
      for (let i = 0; i < 8; i++) {
        const c = neonBox(.55, .55, .55, DARK, G3, .9, 1); c.position.set(-2.1 + i * .7, 2.4, 0); g.add(c); cells.push({ c, k: 0 });
      }
      const cl = label('CACHE', .3); cl.position.set(-3.4, 2.4, 0); g.add(cl);
      const sl = label('ESPECULAÇÃO', .26, '#e6ffef'); sl.position.set(2.2, 1.2, .2); g.add(sl);
      const cubes = [];
      for (let i = 0; i < 11; i++) {
        const spec = i % 3 === 1;
        const c = spec ? neonBox(.42, .42, .42, 0x000000, W, .05, 1) : neonBox(.42, .42, .42, G2, W, 1, .9);
        g.add(c); cubes.push({ c, spec, ph: i / 11, gone: false });
      }
      const dark = new THREE.Color(DARK), bright = new THREE.Color(G);
      return (t, dt) => {
        for (const q of cubes) {
          const u = (t * .085 + q.ph) % 1, x = -5 + u * 10;
          if (q.spec && x > 0) {
            const y = x * .86;
            if (y > 2.05) { if (!q.gone) { q.gone = true; const cell = cells[(Math.random() * 8) | 0]; cell.k = 1; } q.c.visible = false; }
            else { q.c.visible = true; q.c.position.set(x, y, 0); q.c.scale.setScalar(1 - y / 2.6); }
          } else { q.gone = false; q.c.visible = true; q.c.position.set(x, 0, 0); q.c.scale.setScalar(1); }
          q.c.rotation.x = t * 1.4 + q.ph * 6; q.c.rotation.y = t + q.ph * 3;
        }
        for (const cell of cells) {
          cell.k = Math.max(0, cell.k - dt * .22);
          cell.c.userData.m.material.color.copy(dark).lerp(bright, cell.k);
          cell.c.scale.setScalar(1 + cell.k * .25);
        }
        fork.material.opacity = .25 + Math.abs(Math.sin(t * 2)) * .4;
      };
    });

    /* 03 HIERARQUIA DE MEMÓRIA */
    reg('memory', [4.1, -.2, 0], LEFT_CAM, (g) => {
      const plates = new THREE.Group(); g.add(plates); plates.rotation.x = .38;
      const sizes = [.9, 1.5, 2.2, 3, 4], ys = [2.3, 1.25, .2, -.85, -2.0], names = ['REG', 'L1', 'L2', 'L3', 'RAM'];
      sizes.forEach((s, i) => {
        const p = neonBox(s, .12, s, DARK, i === 4 ? G3 : G, .55, 1); p.position.y = ys[i]; plates.add(p);
        const l = label(names[i], .32, i === 4 ? '#0f9e47' : '#e6ffef'); l.position.set(2.6, ys[i], 0); g.add(l);
      });
      const parts = [];
      for (let i = 0; i < 46; i++) { const p = glow(.22, i % 5 ? G : W); plates.add(p); parts.push({ p, y: rand(-2, 2.3), a: rand(0, 6.28), r: Math.random() }); }
      const laser = polyline([new THREE.Vector3(0, -2.2, 0), new THREE.Vector3(0, 2.6, 0)], W, .5); plates.add(laser);
      return (t, dt) => {
        plates.rotation.y = t * .35;
        for (const q of parts) {
          q.y += dt * (.25 + (q.y + 2.1) * .55);
          if (q.y > 2.35) { q.y = -2.0; q.a = rand(0, 6.28); q.r = Math.random(); }
          let lvl = 4; for (let k = 0; k < 5; k++) if (q.y >= ys[k] - .5) { lvl = k; break; }
          const rr = sizes[lvl] * .45 * q.r;
          q.p.position.set(Math.cos(q.a) * rr, q.y, Math.sin(q.a) * rr);
        }
        laser.material.opacity = .2 + Math.abs(Math.sin(t * 3)) * .5;
      };
    });

    /* 04 GRADE DE CACHE (canal lateral) */
    reg('grid', [0, 1.3, -3], { pos: [0, 2.2, 12], look: [0, 1, -3] }, (g) => {
      const C = 16, R = 9, sp = .62;
      const geo = new THREE.BoxGeometry(.5, .5, .5); geo.translate(0, .25, 0);
      const mesh = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff }), C * R);
      const holder = new THREE.Group(); holder.rotation.x = .72; g.add(holder); holder.add(mesh);
      const frame = edges(new THREE.BoxGeometry(C * sp + .3, .05, R * sp + .3), G, .8); holder.add(frame);
      const m4 = new THREE.Matrix4(), col = new THREE.Color(), dark = new THREE.Color(0x03200e), hi = new THREE.Color(G), wh = new THREE.Color(W);
      const heat = new Float32Array(C * R);
      const hitGlow = glow(1.6, W, 0); holder.add(hitGlow);
      let nextHit = 0, hitIdx = 0;
      const tag = label('HIT', .36, '#e6ffef'); holder.add(tag); tag.visible = false;
      return (t, dt) => {
        const scan = (t * 5) % C;
        if (t > nextHit) { nextHit = t + 1.1; hitIdx = (Math.random() * C * R) | 0; heat[hitIdx] = 1.6; }
        for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
          const i = r * C + c;
          heat[i] = Math.max(0, heat[i] - dt * .9);
          const s = Math.max(0, 1 - Math.abs(c - scan) * .8) * .45;
          const k = Math.min(1, s + heat[i]);
          const h = 1 + heat[i] * 3.2 + s * .6;
          m4.makeScale(1, h, 1); m4.setPosition((c - (C - 1) / 2) * sp, 0, (r - (R - 1) / 2) * sp);
          mesh.setMatrixAt(i, m4);
          col.copy(dark).lerp(heat[i] > .6 ? wh : hi, k); mesh.setColorAt(i, col);
        }
        mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor.needsUpdate = true;
        const hc = hitIdx % C, hr = (hitIdx / C) | 0, hk = heat[hitIdx];
        hitGlow.position.set((hc - (C - 1) / 2) * sp, .5 + hk * 1.6, (hr - (R - 1) / 2) * sp); hitGlow.material.opacity = Math.min(1, hk);
        tag.visible = hk > .3; tag.position.copy(hitGlow.position); tag.position.y += .9;
      };
    });

    /* 05 MELTDOWN */
    reg('meltdown', [3.9, -.1, 0], LEFT_CAM, (g) => {
      g.rotation.set(.18, -.5, 0);
      const user = neonBox(1.1, 1.1, 1.1, DARK, G, .8, 1); user.position.x = -2.8; g.add(user);
      const ul = label('USER', .32); ul.position.set(-2.8, -1.05, 0); g.add(ul);
      const kbox = edges(new THREE.BoxGeometry(2, 2, 2), G, .9); kbox.position.x = 2.7; g.add(kbox);
      const core = new THREE.Mesh(new THREE.IcosahedronGeometry(.55, 0), new THREE.MeshBasicMaterial({ color: G2 }));
      core.position.x = 2.7; g.add(core); const ce = edges(new THREE.IcosahedronGeometry(.56, 0), W, 1); core.add(ce);
      const cg = glow(3, G, .6); cg.position.x = 2.7; g.add(cg);
      const kl = label('KERNEL', .32, '#e6ffef'); kl.position.set(2.7, -1.45, 0); g.add(kl);
      const wallGeo = new THREE.PlaneGeometry(4.2, 4.4, 22, 26);
      const wall = new THREE.Mesh(wallGeo, new THREE.MeshBasicMaterial({ color: G, wireframe: true, transparent: true, opacity: .5, blending: ADD, depthWrite: false }));
      wall.rotation.y = Math.PI / 2; g.add(wall);
      const orig = wallGeo.attributes.position.array.slice();
      const parts = [], tmp = new THREE.Vector3();
      for (let i = 0; i < 70; i++) {
        const p = glow(.2, i % 3 ? G : W); g.add(p);
        parts.push({ p, ph: Math.random(), sp: rand(.25, .5), mid: new THREE.Vector3(0, rand(-1.4, 1.2), rand(-1.4, 1.4)) });
      }
      const A = new THREE.Vector3(2.7, 0, 0), B = new THREE.Vector3(-2.8, 0, 0);
      return (t) => {
        const melt = .5 + .5 * Math.sin(t * .7);
        const pos = wallGeo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const x = orig[i * 3], y = orig[i * 3 + 1];
          const f = Math.pow(clamp((2.2 - y) / 4.4, 0, 1), 1.6);
          const drip = (Math.sin(x * 2.3 + t * 1.3) * .5 + .5) * (Math.sin(x * 5.1) * .5 + .7);
          pos.array[i * 3 + 1] = y - melt * drip * 1.5 * (1 - f) * ((y + 2.2) / 4.4);
          pos.array[i * 3 + 2] = Math.sin(y * 3 + t * 2 + x) * .08 * (1 + melt);
        }
        pos.needsUpdate = true;
        core.rotation.x = t * .8; core.rotation.y = t * 1.1; kbox.rotation.y = t * .25;
        for (const q of parts) {
          const u = (t * q.sp + q.ph) % 1;
          tmp.copy(A).multiplyScalar((1 - u) * (1 - u)).addScaledVector(q.mid, 2 * u * (1 - u)).addScaledVector(B, u * u);
          q.p.position.copy(tmp); q.p.material.opacity = Math.sin(u * Math.PI) * (.4 + melt * .6);
        }
        user.rotation.y = t * .6; user.userData.m.material.color.setHex(melt > .7 ? 0x0c5a2a : DARK);
      };
    });

    /* 06 SPECTRE */
    reg('spectre', [3.7, 0, 0], LEFT_CAM, (g) => {
      g.rotation.set(.12, -.35, 0);
      const pos = (l, k) => new THREE.Vector3(-3.2 + l * 1.65, (k - (Math.pow(2, l) - 1) / 2) * (4.8 / Math.pow(2, l)), 0);
      const lines = {};
      for (let l = 0; l < 4; l++) for (let k = 0; k < Math.pow(2, l); k++) for (const c of [2 * k, 2 * k + 1]) {
        const ln = polyline([pos(l, k), pos(l + 1, c)], G3, .7); g.add(ln); lines[l + ':' + c] = ln;
      }
      for (let l = 0; l <= 4; l++) for (let k = 0; k < Math.pow(2, l); k++) {
        const n = edges(new THREE.OctahedronGeometry(l === 0 ? .26 : .14, 0), G, 1); n.position.copy(pos(l, k)); g.add(n);
      }
      const trained = [0, 1, 3, 7, 15], ghostP = [0, 0, 1, 2, 5];
      const tp = trained.map((k, l) => pos(l, k)), gp = ghostP.map((k, l) => pos(l, k));
      const pulse = glow(.6, G); g.add(pulse);
      const ghost = []; for (let i = 0; i < 14; i++) { const s = glow(rand(.25, .6), W, .5); g.add(s); ghost.push({ s, o: new THREE.Vector3(rand(-.3, .3), rand(-.3, .3), rand(-.3, .3)), ph: rand(0, 6) }); }
      const big = new THREE.Mesh(new THREE.IcosahedronGeometry(2.6, 1), new THREE.MeshBasicMaterial({ color: G3, wireframe: true, transparent: true, opacity: .18, blending: ADD, depthWrite: false }));
      big.position.set(1.2, 0, -2); g.add(big);
      const bOrig = big.geometry.attributes.position.array.slice();
      const pl = label('PREDITOR TREINADO', .24); pl.position.set(-1.2, 2.5, 0); g.add(pl);
      const gl = label('FANTASMA', .3, '#e6ffef'); g.add(gl);
      const v = new THREE.Vector3(), base = new THREE.Color(G3), on = new THREE.Color(G), wh = new THREE.Color(W);
      return (t) => {
        const cyc = t / 1.6, n = Math.floor(cyc), u = cyc - n, isGhost = n % 3 === 2;
        along(isGhost ? gp : tp, u, v);
        pulse.position.copy(v); pulse.material.color.set(isGhost ? W : G); pulse.scale.setScalar(isGhost ? .9 : .6);
        for (const key in lines) lines[key].material.color.copy(base);
        const path = isGhost ? ghostP : trained;
        for (let l = 0; l < 4; l++) { const ln = lines[l + ':' + path[l + 1]]; if (ln && u * 4 > l) ln.material.color.copy(isGhost ? wh : on); }
        ghost.forEach((q) => {
          q.s.visible = isGhost; q.s.position.copy(v).add(q.o).addScaledVector(q.o, Math.sin(t * 6 + q.ph));
          q.s.material.opacity = .25 + .3 * Math.sin(t * 8 + q.ph);
        });
        gl.visible = isGhost; gl.position.copy(v); gl.position.y -= .65;
        const bp = big.geometry.attributes.position;
        for (let i = 0; i < bp.count; i++) { const k = 1 + Math.sin(t * 2 + i) * .04; bp.array[i * 3] = bOrig[i * 3] * k; bp.array[i * 3 + 1] = bOrig[i * 3 + 1] * k; bp.array[i * 3 + 2] = bOrig[i * 3 + 2] * k; }
        bp.needsUpdate = true; big.rotation.y = t * .15; big.rotation.x = t * .1;
      };
    });

    /* 07 ESCUDO (correções) */
    reg('shield', [4, 0, 0], LEFT_CAM, (g) => {
      const chip = buildChip(); chip.scale.setScalar(.45); chip.rotation.x = .5; g.add(chip);
      const shGeo = new THREE.IcosahedronGeometry(2.7, 1);
      const sh = edges(shGeo, G, .55); g.add(sh);
      const shFill = new THREE.Mesh(shGeo, new THREE.MeshBasicMaterial({ color: G, transparent: true, opacity: .04, blending: ADD, depthWrite: false, side: THREE.DoubleSide })); g.add(shFill);
      const rings = [0, 1, 2].map((i) => { const r = circleLine(3.3 + i * .25, i ? G3 : W, .5, 128, i === 1); r.rotation.set(i * .9, i * .5, 0); g.add(r); return r; });
      const shots = [];
      for (let i = 0; i < 10; i++) { const s = glow(.35, W); g.add(s); shots.push({ s, dir: new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-.6, 1)).normalize(), ph: Math.random(), sp: rand(.4, .7) }); }
      let flash = 0;
      return (t, dt) => {
        chip.rotation.y = t * .5; chip.userData.tick(t);
        sh.rotation.y = t * .2; sh.rotation.x = t * .12; shFill.rotation.copy(sh.rotation);
        rings.forEach((r, i) => { r.rotation.y += dt * (.3 + i * .2); r.rotation.z += dt * .1; });
        for (const q of shots) {
          const u = (t * q.sp + q.ph) % 1, r = 9 - u * 6.3;
          q.s.position.copy(q.dir).multiplyScalar(Math.max(2.7, r));
          if (r <= 2.7) { q.s.scale.setScalar(.35 + (2.7 - r) * 2.5); q.s.material.opacity = Math.max(0, 1 - (2.7 - r) * 2); flash = Math.max(flash, .6); }
          else { q.s.scale.setScalar(.35); q.s.material.opacity = 1; }
        }
        flash = Math.max(0, flash - dt * 2.5);
        sh.material.opacity = .45 + flash * .5; shFill.material.opacity = .03 + flash * .12;
      };
    });

    /* 08 HÉLICE (linha do tempo) */
    reg('helix', [4.2, -.1, 0], LEFT_CAM, (g) => {
      const s1 = [], s2 = [], N = 220;
      for (let i = 0; i <= N; i++) {
        const u = i / N, a = u * Math.PI * 4.2, y = -2.6 + u * 5.2;
        s1.push(new THREE.Vector3(Math.cos(a) * 1.5, y, Math.sin(a) * 1.5));
        s2.push(new THREE.Vector3(Math.cos(a + Math.PI) * 1.5, y, Math.sin(a + Math.PI) * 1.5));
      }
      g.add(polyline(s1, G, .9), polyline(s2, G3, .8));
      for (let i = 0; i <= N; i += 8) g.add(polyline([s1[i], s2[i]], G3, .35));
      const us = [.08, .29, .5, .71, .92], years = ['2018', '2019', '2023', '2024', '2025'];
      const nodes = us.map((u, i) => {
        const p = s1[Math.round(u * N)];
        const n = edges(new THREE.OctahedronGeometry(.22, 0), W, 1); n.position.copy(p); g.add(n);
        const gl = glow(1, G, .5); gl.position.copy(p); g.add(gl);
        const l = label(years[i], .3); l.position.copy(p).add(new THREE.Vector3(.75, 0, 0)); g.add(l);
        return { n, gl, l };
      });
      const runner = glow(.5, W); g.add(runner);
      return (t) => {
        g.rotation.y = t * .3;
        nodes.forEach((q, i) => {
          const on = i === timelineActive;
          q.gl.scale.setScalar(on ? 2.2 + Math.sin(t * 8) * .3 : .9);
          q.gl.material.color.set(on ? W : G); q.n.rotation.y = t * 2; q.n.scale.setScalar(on ? 1.8 : 1);
        });
        along(s1, (t * .12) % 1, runner.position);
      };
    });

    /* 09 COFRE (TEE / CHERI / MTE) */
    reg('vault', [4, 0, 0], LEFT_CAM, (g) => {
      const outer = edges(new THREE.BoxGeometry(3.3, 3.3, 3.3), G3, .9); g.add(outer);
      const mid = edges(new THREE.BoxGeometry(2.2, 2.2, 2.2), G, 1); g.add(mid);
      const inner = neonBox(1, 1, 1, G2, W, 1, 1); g.add(inner);
      const ig = glow(2.6, G, .55); g.add(ig);
      const lock = new THREE.Mesh(new THREE.TorusGeometry(.32, .06, 8, 24, Math.PI), new THREE.MeshBasicMaterial({ color: W }));
      lock.position.y = .62; inner.add(lock);
      const tags = []; const hex = ['0x3', '0xA', '0x7', '0xC', '0x1', '0xE', '0x5', '0x9'];
      hex.forEach((h, i) => {
        const b = neonBox(.36, .36, .36, DARK, G, 1, 1); g.add(b);
        const l = label(h, .22, '#e6ffef'); b.add(l); l.position.y = .42;
        tags.push({ b, a: i / hex.length * Math.PI * 2 });
      });
      const el = label('ENCLAVE', .3, '#e6ffef'); el.position.set(0, -2.15, 0); g.add(el);
      return (t) => {
        outer.rotation.set(t * .15, t * .22, 0); mid.rotation.set(-t * .25, -t * .3, t * .1);
        inner.rotation.y = t * .6; ig.material.opacity = .4 + Math.sin(t * 3) * .15;
        tags.forEach((q) => { const a = q.a + t * .5; q.b.position.set(Math.cos(a) * 2.75, Math.sin(a * 2) * .5, Math.sin(a) * 2.75); q.b.rotation.y = -a; });
      };
    });

    /* 10 BALANÇA */
    reg('balance', [0, -3.3, 0], { pos: [0, .2, 12.5], look: [0, -1.1, 0] }, (g) => {
      const base = edges(new THREE.CylinderGeometry(.9, 1.3, .35, 6), G, 1); base.position.y = -1.9; g.add(base);
      const pillar = neonBox(.16, 3.2, .16, DARK, G, 1, 1); pillar.position.y = -.2; g.add(pillar);
      const pivotY = 1.4; const beam = neonBox(6, .12, .16, G2, W, 1, 1); beam.position.y = pivotY; g.add(beam);
      const pg = glow(1, W); pg.position.y = pivotY; g.add(pg);
      const mkPan = (txt) => {
        const p = new THREE.Group();
        const disc = edges(new THREE.CylinderGeometry(.95, .7, .1, 24), G, 1); disc.position.y = -1.3; p.add(disc);
        for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; p.add(polyline([new THREE.Vector3(0, 0, 0), new THREE.Vector3(Math.cos(a) * .9, -1.3, Math.sin(a) * .9)], G3, .9)); }
        const l = label(txt, .3, '#e6ffef'); l.position.y = -1.85; p.add(l);
        g.add(p); return p;
      };
      const L = mkPan('DESEMPENHO'), R = mkPan('SEGURANÇA');
      const chip = buildChip(); chip.scale.setScalar(.2); chip.position.y = -1.1; L.add(chip);
      const ico = edges(new THREE.IcosahedronGeometry(.42, 0), W, 1); ico.position.y = -.85; R.add(ico);
      const ig = glow(1.4, G, .6); ig.position.y = -.85; R.add(ig);
      return (t) => {
        const ang = Math.sin(t * .9) * .2; beam.rotation.z = ang;
        L.position.set(-2.9 * Math.cos(ang), pivotY - 2.9 * Math.sin(ang), 0);
        R.position.set(2.9 * Math.cos(ang), pivotY + 2.9 * Math.sin(ang), 0);
        chip.rotation.y = t * .8; chip.userData.tick(t); ico.rotation.y = t; ico.rotation.x = t * .6;
        g.rotation.y = Math.sin(t * .3) * .25;
      };
    });
  }

  /* ---------------- SLIDES ---------------- */
  const slides = $$('.slide');
  const names = ['BOOT', 'CPU', 'CACHE', 'SIDE_CHANNEL', 'MELTDOWN', 'SPECTRE', 'PATCHES', 'TIMELINE', 'DEFESAS', 'FIM'];
  let cur = -1, timers = [];
  const later = (fn, ms) => { const id = setTimeout(fn, ms); timers.push(() => clearTimeout(id)); };
  const every = (fn, ms) => { const id = setInterval(fn, ms); timers.push(() => clearInterval(id)); };
  const clearTimers = () => { timers.forEach((f) => f()); timers = []; };
  let glitchT = 0;

  function glitch(strong = true) {
    const box = $('#slices'); box.innerHTML = '';
    const n = strong ? 9 : 3;
    for (let i = 0; i < n; i++) {
      const s = document.createElement('i');
      s.style.top = rand(0, 100) + '%'; s.style.height = rand(.4, strong ? 7 : 2.5) + 'vh';
      s.style.transform = `translateX(${rand(-12, 12)}vw)`; box.appendChild(s);
    }
    if (strong) { document.body.classList.remove('glitching'); void document.body.offsetWidth; document.body.classList.add('glitching'); glitchT = .45; }
    setTimeout(() => { box.innerHTML = ''; document.body.classList.remove('glitching'); }, strong ? 450 : 140);
  }

  function go(i) {
    i = clamp(i, 0, slides.length - 1);
    if (i === cur) return;
    clearTimers(); glitch(true);
    slides.forEach((s, k) => s.classList.toggle('active', k === i));
    cur = i;
    const sc = slides[i].dataset.scene;
    for (const k in scenes) scenes[k].target = k === sc ? 1 : 0;
    const s = scenes[sc];
    if (s) { camPos.set(...s.cam.pos); camLook.set(...s.cam.look); }
    $('#counter').textContent = String(i + 1).padStart(2, '0') + ' / ' + String(slides.length).padStart(2, '0');
    $('#progress').style.width = ((i + 1) / slides.length * 100) + '%';
    $('#hudScene').textContent = names[i] || '';
    history.replaceState(null, '', '#' + (i + 1));
    enter(i);
  }

  function typeInto(el, text, speed = 32, cb) {
    el.textContent = ''; let k = 0;
    every(() => { if (k <= text.length) { el.textContent = text.slice(0, k++) + (k <= text.length ? '█' : ''); } else if (cb) { cb(); cb = null; } }, speed);
  }

  function enter(i) {
    timelineActive = -1;
    if (i === 0) {
      const k = $('.kicker', slides[0]); typeInto(k, k.dataset.type, 38);
      const log = $('#bootlog'); log.innerHTML = '';
      const lines = ['[ OK ] pipeline ........ 5 estágios', '[ OK ] preditor de desvios', '[ OK ] cache L1 / L2 / L3', '[ OK ] execução especulativa', '<span class="warn">[ !! ] rastro detectado no cache</span>'];
      lines.forEach((l, n) => later(() => { log.innerHTML += l + '<br>'; }, 700 + n * 420));
    }
    if (i === 2) {
      const tEl = $('#probeTime'), rEl = $('#probeRes'), box = $('.probe', slides[2]);
      let hit = true;
      every(() => {
        hit = Math.random() > .45;
        tEl.textContent = String(hit ? (2 + Math.random() * 3) | 0 : (88 + Math.random() * 30) | 0).padStart(3, '0') + ' ns';
        rEl.textContent = hit ? 'HIT' : 'MISS'; box.classList.toggle('miss', !hit);
      }, 900);
    }
    if (i === 3) {
      const cell = $('.mini-fr i'), ft = $('#frT'); let ph = 0;
      every(() => {
        ph = (ph + 1) % 3;
        if (ph === 0) { cell.classList.remove('hit'); ft.textContent = 'flush'; }
        else if (ph === 1) { ft.textContent = 'espera'; }
        else { const h = Math.random() > .4; cell.classList.toggle('hit', h); ft.textContent = h ? '004 ns' : '210 ns'; }
      }, 650);
      const pp = $('#pp'); pp.innerHTML = '';
      const cells = Array.from({ length: 16 }, () => { const c = document.createElement('i'); pp.appendChild(c); return c; });
      let step = 0;
      every(() => {
        step = (step + 1) % 4;
        if (step === 1) cells.forEach((c) => { c.className = 'mine'; });
        if (step === 2 || step === 3) for (let n = 0; n < 2; n++) cells[(Math.random() * 16) | 0].className = 'stolen';
        if (step === 0) cells.forEach((c) => { c.className = ''; });
      }, 700);
      const row = $('#rhRow');
      every(() => {
        const bits = '0000000000'.split(''); if (Math.random() > .35) bits[(Math.random() * 10) | 0] = '<b>1</b>';
        row.innerHTML = bits.join('');
      }, 500);
    }
    if (i === 4) {
      const hd = $('#hexdump'); let addr = 0xffff888000a0, buf = [];
      const words = ['senha=Tr0ub4dor', 'chave_aes=9f1c', 'token=eyJhbGci', 'root:$6$xK2p'];
      every(() => {
        let hexs = [], asc = '';
        const secret = Math.random() > .78 ? words[(Math.random() * words.length) | 0] : null;
        for (let k = 0; k < 8; k++) {
          const ch = secret ? secret.charCodeAt(k) || 46 : (Math.random() * 256) | 0;
          hexs.push(ch.toString(16).padStart(2, '0'));
          asc += ch > 32 && ch < 127 ? String.fromCharCode(ch) : '.';
        }
        const line = addr.toString(16) + '  ' + hexs.join(' ') + '  |' + asc.replace(/[<>&]/g, '.') + '|';
        buf.push(secret ? '<span class="hl">' + line + '</span>' : line);
        if (buf.length > 9) buf.shift();
        hd.innerHTML = buf.join('\n'); addr += 8;
      }, 140);
    }
    if (i === 5) {
      const tr = $('#train'); let n = 0;
      const tick = () => {
        if (n === 0) tr.innerHTML = '';
        const s = document.createElement('span');
        if (n < 7) { s.className = 'ok'; s.textContent = 'x=' + ((Math.random() * 15) | 0); }
        else { s.className = 'evil'; s.textContent = 'x=40960 → executou'; }
        tr.appendChild(s); n++;
        if (n > 7) { n = 0; later(tick, 2600); } else later(tick, 380);
      };
      later(tick, 900);
    }
    if (i === 7) {
      const items = $$('#timeline li'); let k = -1;
      later(() => {
        const step = () => { k = (k + 1) % items.length; items.forEach((li, n) => li.classList.toggle('on', n === k)); timelineActive = k; };
        step(); every(step, 1300);
      }, 1300);
    }
  }

  /* ---------------- CRONÔMETRO (12 min) ---------------- */
  const TOTAL = 12 * 60; let remain = TOTAL, running = false, lastSec = 0;
  const timerEl = $('#timer');
  function drawTimer() {
    const r = Math.abs(remain), m = Math.floor(r / 60), s = Math.floor(r % 60);
    timerEl.textContent = (remain < 0 ? '+' : '') + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    timerEl.classList.toggle('run', running); timerEl.classList.toggle('late', remain < 60);
  }
  const toggleTimer = () => { running = !running; drawTimer(); };
  timerEl.addEventListener('click', (e) => { e.stopPropagation(); toggleTimer(); });

  /* ---------------- ENTRADAS ---------------- */
  addEventListener('keydown', (e) => {
    const k = e.key;
    if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(k)) { e.preventDefault(); go(cur + 1); }
    else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(k)) { e.preventDefault(); go(cur - 1); }
    else if (k === 'Home') go(0);
    else if (k === 'End') go(slides.length - 1);
    else if (k === 'f' || k === 'F') { if (!document.fullscreenElement) document.documentElement.requestFullscreen?.(); else document.exitFullscreen?.(); }
    else if (k === 't' || k === 'T') toggleTimer();
    else if (k === 'r' || k === 'R') { remain = TOTAL; drawTimer(); }
    else if (/^[0-9]$/.test(k)) go(k === '0' ? 9 : +k - 1);
  });
  addEventListener('click', (e) => { if (e.button === 0) go(cur + 1); });
  addEventListener('contextmenu', (e) => { e.preventDefault(); go(cur - 1); });
  let wheelLock = 0;
  addEventListener('wheel', (e) => { const n = performance.now(); if (n < wheelLock) return; wheelLock = n + 700; go(cur + (e.deltaY > 0 ? 1 : -1)); }, { passive: true });
  let tx = null;
  addEventListener('touchstart', (e) => { tx = e.touches[0].clientX; }, { passive: true });
  addEventListener('touchend', (e) => { if (tx == null) return; const dx = e.changedTouches[0].clientX - tx; if (Math.abs(dx) > 40) go(cur + (dx < 0 ? 1 : -1)); tx = null; });
  let mxp = 0, myp = 0;
  addEventListener('mousemove', (e) => { mxp = e.clientX / innerWidth * 2 - 1; myp = e.clientY / innerHeight * 2 - 1; });
  addEventListener('resize', () => {
    renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); sizeMatrix();
  });

  /* ---------------- LOOP ---------------- */
  const clock = new THREE.Clock();
  let microNext = 4;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), .05), t = clock.elapsedTime;
    drawMatrix(now);

    if (running) { const s = Math.floor(t); if (s !== lastSec) { lastSec = s; remain--; drawTimer(); } } else lastSec = Math.floor(t);
    if (t > microNext) { microNext = t + rand(4, 8); glitch(false); }

    const ease = Math.min(1, dt * 4.2);
    for (const k in scenes) {
      const s = scenes[k];
      s.a += (s.target - s.a) * ease;
      if (s.target === 0 && s.a < .003) { s.a = 0; s.group.visible = false; continue; }
      s.group.visible = true;
      const a = s.a, back = 1 + 2.2 * Math.pow(a - 1, 3) + 1.2 * Math.pow(a - 1, 2);
      s.group.scale.setScalar(Math.max(.001, s.target ? back : a));
      s.group.position.copy(s.offset); s.group.position.y += (1 - a) * (s.target ? -3 : 3);
      s.update(t, dt);
    }
    // acomodar cenas laterais em telas estreitas
    const narrow = innerWidth / innerHeight < 1.3;
    for (const k in scenes) { const s = scenes[k]; if (narrow && s.offset.x > 1) { s.group.position.x = 0; s.group.position.y -= 2.2; } }

    camera.position.lerp(new THREE.Vector3(camPos.x + mxp * .9, camPos.y - myp * .6, camPos.z), Math.min(1, dt * 2.5));
    lookNow.lerp(camLook, Math.min(1, dt * 3));
    if (glitchT > 0) { glitchT -= dt; camera.position.x += rand(-.35, .35); camera.position.y += rand(-.2, .2); }
    camera.lookAt(lookNow);
    camera.rotation.z = glitchT > 0 ? rand(-.04, .04) : 0;

    dust.rotation.y = t * .01; dust.position.y = Math.sin(t * .2) * .5;
    grid.position.z = (t * 1.6) % 1;
    renderer.render(scene, camera);
  }

  /* ---------------- INÍCIO ---------------- */
  const start = () => {
    buildScenes();
    const h = parseInt(location.hash.slice(1), 10);
    go(isNaN(h) ? 0 : h - 1);
    drawTimer();
    requestAnimationFrame(frame);
  };
  let started = false;
  const once = () => { if (!started) { started = true; start(); } };
  if (document.fonts && document.fonts.ready) { document.fonts.ready.then(once); setTimeout(once, 1500); } else once();
})();
