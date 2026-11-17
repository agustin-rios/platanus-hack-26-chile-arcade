// PEGA CITY — mundo abierto + entrevistas por turnos.
// Recorre la ciudad, esquiva cobradores, junta pitutos y gánale a RRHH.
// Platanus Hack 26 Arcade Challenge. Todo procedural, sin assets.

// Arcade cabinet button → keyboard key mapping.
// DO NOT replace existing keys — they match the physical arcade cabinet wiring.
// To add local testing shortcuts, append extra keys to any array.
// (Atajos locales agregados: espacio = B1, '1' = START1.)
const CABINET_KEYS = {
  P1_U: ['w'], P1_D: ['s'], P1_L: ['a'], P1_R: ['d'],
  P1_1: ['u', ' '], P1_2: ['i'], P1_3: ['o'],
  P1_4: ['j'], P1_5: ['k'], P1_6: ['l'],
  P2_U: ['ArrowUp'], P2_D: ['ArrowDown'], P2_L: ['ArrowLeft'], P2_R: ['ArrowRight'],
  P2_1: ['r'], P2_2: ['t'], P2_3: ['y'],
  P2_4: ['f'], P2_5: ['g'], P2_6: ['h'],
  START1: ['Enter', '1'], START2: ['2'],
};

const KEYBOARD_TO_ARCADE = {};
for (const [code, keys] of Object.entries(CABINET_KEYS)) {
  for (const key of keys) KEYBOARD_TO_ARCADE[normalizeIncomingKey(key)] = code;
}
function normalizeIncomingKey(key) {
  if (typeof key !== 'string' || key.length === 0) return '';
  return key === ' ' ? 'space' : key.toLowerCase();
}

const T = 32, MW = 62, MH = 42, W = MW * T, H = MH * T;
const SEN = ['Trainee', 'Junior', 'Semi Senior', 'Senior', 'Staff', 'Principal', 'Leyenda'];
const COMP = ['SINAPSIS AI', 'BANCO LUCA', 'CONSULTORA 24/7', 'MEGA RETAIL', 'FINTECH UNICORNIO', 'NUBE SPA',
  'AGENCIA COOL', 'MINERA COBRE', 'STARTUP WEB3', 'SOFTWARE FACTORY', 'TELCO MOVIL', 'E-COMMERCE YA',
  'SEGUROS TRANQUI', 'LOGISTICA FLASH', 'GAMING STUDIO', 'HEALTHTECH', 'EDTECH 3000', 'AGTECH PALTA'];
const PARKS = [1, 8, 10, 15, 19, 22];
const MOVES = ['PITCH', 'CV', 'PITUTO', 'CAFE'];
const WILD = [
  { n: 'Bot ATS', c: 0x9aa0a6, w: 1, k: 0, L: [['Tu CV no tiene las keywords', 1], ['Error 404: candidato no encontrado', 1.2], ['Formato PDF no soportado', .8]] },
  { n: 'Headhunter', c: 0xd9534f, w: 0, k: 1, L: [['¿Pretensiones de renta?', 1.2], ['Es un rol súper dinámico', .9], ['¿Te puedes cambiar mañana?', 1]] },
  { n: 'Influencer LinkedIn', c: 0x3b82f6, w: 2, k: 2, L: [['Feliz de anunciar mi 5to ascenso...', 1.3], ['Yo a tu edad ya era CEO', 1], ['10 tips para tu CV (hilo)', .7]] },
  { n: 'Practicante RRHH', c: 0x22c55e, w: 0, k: 3, L: [['Te contactaremos', 0], ['¿Cuál es tu mayor defecto?', 1], ['Llena este test de 200 preguntas', 1.1]] }
];
const BOSS = [
  { n: 'Gerente RRHH', c: 0x8b5cf6, w: 2, k: 4, L: [['Aquí somos una familia', 1], ['Sueldo competitivo (bajo)', 1.3], ['¿Dónde te ves en 5 años?', 1.1], ['Te contactaremos', 0]] },
  { n: 'CTO Exigente', c: 0xf59e0b, w: 1, k: 5, L: [['Invierte este árbol binario. En pizarra.', 1.3], ['Prueba técnica de 72 horas', 1.5], ['¿Y por qué no lo hiciste en Rust?', 1]] },
  { n: 'Panel de 7', c: 0xec4899, w: 0, k: 6, L: [['5 preguntas al mismo tiempo', 1.4], ['Pedimos 10 años en un framework de 2', 1.3], ['Cuéntanos de ti (otra vez)', 1]] }
];
const PHONE = [
  ['LinkedIn: tu ex compañero ahora es CTO', -3], ['Correo: "Seguiremos con otros candidatos"', -4],
  ['Mamá: ¿Y? ¿Encontraste pega?', -2], ['Oferta: práctica sin sueldo, pide 5 años exp', -2],
  ['Recruiter: ¿Te interesa un rol en COBOL?', 0], ['Amigo: "Te paso un contacto" (+1 pituto)', 'p'],
  ['Banco: tu tarjeta está al límite', -2], ['Abuela: "Estoy orgullosa de ti" +10', 10],
  ['GitHub: alguien le dio estrella a tu repo +5', 5], ['Portal de empleos: "Sesión expirada"', -3]
];
const NOPE = ['"Déjanos tu CV, te llamamos."', '"Solo postulaciones por portal (que no carga)."',
  '"Buscamos Senior con sueldo de Junior."', '"Proceso congelado hasta marzo."', '"¿Tienes pituto acá?"'];

let S, G, held = {}, M, AC, TH = {}, TP = {};
let skipTitle = false;

new Phaser.Game({
  type: Phaser.AUTO, width: 800, height: 600, parent: 'game-root', backgroundColor: '#101418',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { activePointers: 3 },
  scene: { create, update }
});

// ---------- utilidades ----------
const R = (a, b) => Phaser.Math.Between(a, b);
const pick = a => a[R(0, a.length - 1)];
const money = k => k >= 1000 ? '$' + (k / 1000).toFixed(1) + 'M' : '$' + Math.round(k) + 'K';
function tx(x, y, s, sz, c, o) {
  return S.add.text(x, y, s, Object.assign({ fontFamily: 'monospace', fontSize: sz + 'px', color: c || '#fff', fontStyle: 'bold' }, o || {}));
}
function snd(f, d, t, v) {
  try {
    AC = AC || S.sound.context; if (!AC) return;
    const o = AC.createOscillator(), g = AC.createGain(), n = AC.currentTime;
    o.type = t || 'square'; o.frequency.setValueAtTime(f, n);
    g.gain.setValueAtTime(v || .05, n); g.gain.exponentialRampToValueAtTime(.001, n + d);
    o.connect(g); g.connect(AC.destination); o.start(n); o.stop(n + d);
  } catch (e) { }
}
function jingle(ns, dt) { ns.forEach((f, i) => S.time.delayedCall(i * (dt || 90), () => snd(f, .15, 'square', .04))); }
const tile = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? 9 : M[(y / T) | 0][(x / T) | 0];
const solid = (x, y) => { const t = tile(x, y); return t == 2 || t == 4 || t == 9; };
const hit = (x, y, r) => solid(x - r, y - r) || solid(x + r, y - r) || solid(x - r, y + r) || solid(x + r, y + r);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// ---------- texturas ----------
function tex(k, w, h, f) { const g = S.add.graphics(); f(g); g.generateTexture(k, w, h); g.destroy(); }
function star(g, cx, cy, r1, r2) {
  const p = [];
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? r2 : r1; p.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r }); }
  g.fillPoints(p, true);
}
function makeTextures() {
  if (S.textures.exists('pl')) return;
  tex('pl', 24, 24, g => { // dev visto desde arriba
    g.fillStyle(0x7c3aed); g.fillEllipse(12, 13, 20, 14);
    g.fillStyle(0x4c1d95); g.fillRect(7, 15, 10, 6);
    g.fillStyle(0xf1c27d); g.fillCircle(12, 10, 6);
    g.fillStyle(0x3b2416); g.fillCircle(12, 8, 5);
    g.fillStyle(0xffffff); g.fillRect(17, 14, 6, 8); g.fillStyle(0x333333); g.fillRect(18, 16, 4, 1); g.fillRect(18, 18, 4, 1);
  });
  tex('cb', 24, 24, g => { // cobrador
    g.fillStyle(0x111827); g.fillEllipse(12, 13, 20, 14);
    g.fillStyle(0xdc2626); g.fillRect(11, 12, 2, 7);
    g.fillStyle(0xd1a07a); g.fillCircle(12, 9, 5);
    g.fillStyle(0x000000); g.fillRect(7, 7, 10, 3);
    g.fillStyle(0x7c4a1e); g.fillRect(16, 15, 8, 7);
  });
  tex('car', 34, 18, g => {
    g.fillStyle(0x000000, .3); g.fillRoundedRect(2, 3, 32, 15, 4);
    g.fillStyle(0xffffff); g.fillRoundedRect(0, 0, 32, 16, 4);
    g.fillStyle(0x1f2937); g.fillRect(19, 2, 6, 12); g.fillRect(5, 3, 4, 10);
    g.fillStyle(0xfff3a0); g.fillRect(30, 2, 2, 3); g.fillRect(30, 11, 2, 3);
    g.fillStyle(0xff4444); g.fillRect(0, 2, 2, 3); g.fillRect(0, 11, 2, 3);
  });
  tex('i0', 22, 14, g => { g.fillStyle(0x15803d); g.fillRect(0, 0, 22, 14); g.fillStyle(0x86efac); g.fillRect(2, 2, 18, 10); g.fillStyle(0x15803d); g.fillCircle(11, 7, 4); });
  tex('i1', 20, 20, g => { g.fillStyle(0xffffff); g.fillRect(3, 5, 12, 14); g.fillStyle(0x6b3f1d); g.fillRect(3, 5, 12, 4); g.lineStyle(2, 0xffffff); g.strokeCircle(16, 12, 3); g.fillStyle(0xcccccc); g.fillRect(4, 1, 2, 3); g.fillRect(9, 0, 2, 4); });
  tex('i2', 20, 22, g => { g.fillStyle(0xfef9c3); g.fillRect(2, 0, 16, 20); g.fillStyle(0x94a3b8); for (let i = 0; i < 4; i++) g.fillRect(5, 3 + i * 3, 10, 1); g.fillStyle(0xdc2626); g.fillCircle(13, 17, 4); });
  tex('i3', 22, 22, g => { g.fillStyle(0xfacc15); star(g, 11, 11, 11, 5); g.fillStyle(0xfff7ae); star(g, 11, 11, 5, 2); });
  tex('pb', 120, 120, g => { // dev de espaldas (batalla)
    g.fillStyle(0x000000, .25); g.fillEllipse(60, 112, 100, 16);
    g.fillStyle(0x7c3aed); g.fillRoundedRect(18, 58, 84, 58, 22);
    g.fillStyle(0x5b21b6); g.fillRoundedRect(36, 50, 48, 34, 16);
    g.fillStyle(0x3b2416); g.fillCircle(60, 40, 26);
    g.fillStyle(0xf1c27d); g.fillCircle(35, 44, 6); g.fillCircle(85, 44, 6);
    g.fillStyle(0xe5e7eb); g.fillRect(96, 70, 18, 24); g.fillStyle(0x6b7280); g.fillRect(99, 74, 12, 2); g.fillRect(99, 79, 12, 2); g.fillRect(99, 84, 8, 2);
  });
  [...WILD, ...BOSS].forEach(e => tex('e' + e.k, 120, 120, g => enemyArt(g, e)));
}
function face(g, x, y, s) {
  g.fillStyle(0xf1c27d); g.fillCircle(x, y, 18 * s);
  g.fillStyle(0xffffff); g.fillCircle(x - 7 * s, y - 2 * s, 5 * s); g.fillCircle(x + 7 * s, y - 2 * s, 5 * s);
  g.fillStyle(0x111111); g.fillCircle(x - 6 * s, y - 2 * s, 2.5 * s); g.fillCircle(x + 8 * s, y - 2 * s, 2.5 * s);
  g.fillRect(x - 7 * s, y + 8 * s, 14 * s, 2 * s);
}
function enemyArt(g, e) {
  const c = e.c, k = e.k;
  g.fillStyle(0x000000, .25); g.fillEllipse(60, 112, 96, 16);
  if (k == 0) { // robot ATS
    g.fillStyle(c); g.fillRoundedRect(25, 40, 70, 66, 8);
    g.fillStyle(0x4b5563); g.fillRect(58, 14, 4, 26); g.fillStyle(0xef4444); g.fillCircle(60, 14, 6);
    g.fillStyle(0x111827); g.fillRoundedRect(34, 50, 52, 26, 6);
    g.fillStyle(0x22d3ee); g.fillCircle(48, 63, 6); g.fillCircle(72, 63, 6);
    g.fillStyle(0x374151); for (let i = 0; i < 5; i++) g.fillRect(36 + i * 10, 86, 6, 10);
    return;
  }
  if (k == 6) { // panel de 7
    [[30, 0x0ea5e9], [90, 0xf97316], [60, c]].forEach(([x, col], i) => {
      g.fillStyle(col); g.fillRoundedRect(x - 22, 66 - (i == 2 ? 10 : 0), 44, 46, 12);
      face(g, x, 50 - (i == 2 ? 10 : 0), .8);
    });
    return;
  }
  g.fillStyle(c); g.fillRoundedRect(28, 58, 64, 54, 18);
  face(g, 60, 40, 1);
  if (k == 1 || k == 4) { g.fillStyle(0xffffff); g.fillTriangle(50, 58, 70, 58, 60, 72); g.fillStyle(0x111111); g.fillTriangle(56, 62, 64, 62, 60, 100); }
  if (k == 1) { g.fillStyle(0x1f2937); g.fillRect(36, 18, 48, 6); g.fillRect(44, 4, 32, 16); }
  if (k == 2) { g.lineStyle(3, 0x111111); g.strokeCircle(53, 38, 7); g.strokeCircle(67, 38, 7); g.fillStyle(0x111111); g.fillRoundedRect(84, 60, 18, 30, 3); g.fillStyle(0x60a5fa); g.fillRect(86, 63, 14, 22); }
  if (k == 3) { g.fillStyle(0xd6b98c); g.fillRect(80, 66, 22, 30); g.fillStyle(0xffffff); g.fillRect(83, 70, 16, 22); g.fillStyle(0x3b2416); g.fillCircle(60, 26, 14); }
  if (k == 4) { g.fillStyle(0x6b7280); g.fillCircle(60, 24, 13); }
  if (k == 5) { g.fillStyle(0x111111); g.fillRect(44, 32, 32, 4); g.lineStyle(3, 0x111111); g.strokeRect(46, 32, 11, 9); g.strokeRect(63, 32, 11, 9); g.fillStyle(0xffffff); g.fillRect(82, 74, 14, 18); g.fillStyle(0x6b3f1d); g.fillRect(82, 74, 14, 4); }
}

// ---------- mapa ----------
function genMap() {
  M = [];
  for (let y = 0; y < MH; y++) {
    M[y] = [];
    for (let x = 0; x < MW; x++) {
      const rx = x % 10, ry = y % 10;
      M[y][x] = (rx < 2 || ry < 2) ? 0 : (rx == 2 || rx == 9 || ry == 2 || ry == 9) ? 1 : 2;
    }
  }
  G.bld = [];
  let ci = 0;
  for (let by = 0; by < 4; by++) for (let bx = 0; bx < 6; bx++) {
    const i = by * 6 + bx, x0 = bx * 10 + 3, y0 = by * 10 + 3;
    if (PARKS.includes(i)) {
      for (let y = y0; y < y0 + 6; y++) for (let x = x0; x < x0 + 6; x++) M[y][x] = Math.random() < .12 ? 4 : 3;
    } else G.bld.push({ x0, y0, n: COMP[ci++], c: Phaser.Display.Color.HSVToRGB(Math.random(), .45, .75).color, dx: (x0 + 3) * T, dy: (y0 + 6) * T + 6 });
  }
}
function drawMap() {
  const g = S.add.graphics();
  g.fillStyle(0x2b2f36); g.fillRect(0, 0, W, H);
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    const t = M[y][x], px = x * T, py = y * T;
    if (t == 1) { g.fillStyle(0x9ca3af); g.fillRect(px, py, T, T); g.fillStyle(0x8b929c); g.fillRect(px, py, T, 1); g.fillRect(px, py, 1, T); }
    if (t == 3 || t == 4) { g.fillStyle((x + y) % 2 ? 0x4d8f3a : 0x569c42); g.fillRect(px, py, T, T); }
    if (t == 4) { g.fillStyle(0x2f5e24); g.fillCircle(px + 16, py + 16, 15); g.fillStyle(0x3f7a30); g.fillCircle(px + 12, py + 12, 8); }
  }
  g.fillStyle(0xe5c84a);
  for (let r = 0; r < 5; r++) for (let x = 0; x < W; x += 40) { if ((x / T | 0) % 10 > 1) g.fillRect(x, r * 10 * T + T - 2, 20, 4); }
  for (let c = 0; c < 7; c++) for (let y = 0; y < H; y += 40) { if ((y / T | 0) % 10 > 1) g.fillRect(c * 10 * T + T - 2, y, 4, 20); }
  g.fillStyle(0xe5e7eb); // pasos de cebra
  for (let r = 0; r < 5; r++) for (let c = 0; c < 7; c++) {
    const cx = c * 10 * T, cy = r * 10 * T;
    for (let i = 0; i < 4; i++) { g.fillRect(cx + 4 + i * 16, cy - 14, 8, 10); g.fillRect(cx + 4 + i * 16, cy + 68, 8, 10); g.fillRect(cx - 14, cy + 4 + i * 16, 10, 8); g.fillRect(cx + 68, cy + 4 + i * 16, 10, 8); }
  }
  G.bld.forEach(b => {
    const px = b.x0 * T, py = b.y0 * T, s = 6 * T;
    g.fillStyle(0x000000, .35); g.fillRect(px + 6, py + 6, s, s);
    g.fillStyle(b.c); g.fillRect(px, py, s, s);
    g.fillStyle(0xffffff, .12); g.fillRect(px + 6, py + 6, s - 12, s - 12);
    g.fillStyle(0x1f2937, .5);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) g.fillRect(px + 20 + i * 42, py + 110 + j * 30, 26, 16);
    g.fillStyle(0x3b2416); g.fillRect(b.dx - 18, py + s - 10, 36, 10);
  });
  if (S.textures.exists('map')) S.textures.remove('map');
  g.generateTexture('map', W, H); g.destroy();
  S.add.image(0, 0, 'map').setOrigin(0).setDepth(0);
  G.bld.forEach(b => tx(b.x0 * T + 96, b.y0 * T + 60, b.n, 15, '#111', { align: 'center', wordWrap: { width: 170 } }).setOrigin(.5).setDepth(7));
}
function randTile(t) { for (; ;) { const x = R(0, MW - 1), y = R(0, MH - 1); if (M[y][x] == t) return { x: x * T + 16, y: y * T + 16 }; } }
function roadSpot() {
  if (Math.random() < .5) { const r = R(0, 4), l = R(0, 1); return { x: R(1, W - 1), y: (r * 10 + l) * T + 16, h: 1, d: l ? 1 : -1 }; }
  const c = R(0, 6), l = R(0, 1); return { x: (c * 10 + l) * T + 16, y: R(1, H - 1), h: 0, d: l ? -1 : 1 };
}

// ---------- escena ----------
function create() {
  S = this; held = {};
  while (S.cameras.cameras.length > 1) S.cameras.remove(S.cameras.cameras[1]);
  G = {
    mode: 'title', mot: 100, max: 100, lucas: 300, day: 1, dayT: 0, lvl: 0, xp: 0, stars: 0, starT: 0,
    cafe: 1, cert: 0, pit: 0, offers: 0, score: 0, inv: 0, walk: 0, phT: 8, car: null, q: [], cur: 0
  };
  makeTextures(); genMap(); drawMap();

  G.pk = [];
  for (let i = 0; i < 24; i++) {
    const s = S.add.image(0, 0, 'i0').setDepth(2);
    S.tweens.add({ targets: s, scale: 1.2, duration: 500, yoyo: true, repeat: -1 });
    G.pk.push(s); placePickup(s);
  }
  G.park = [];
  for (let i = 0; i < 9; i++) { const p = roadSpot(); G.park.push(S.add.image(p.x, p.y, 'car').setTint(pick([0x94a3b8, 0x60a5fa, 0xf472b6, 0x34d399])).setAngle(p.h ? 0 : 90).setDepth(3)); }
  G.cars = [];
  for (let i = 0; i < 18; i++) {
    const p = roadSpot(), v = R(80, 170) * p.d;
    G.cars.push({ s: S.add.image(p.x, p.y, 'car').setTint(pick([0xef4444, 0xfacc15, 0x22d3ee, 0xf97316, 0xa3e635, 0xffffff])).setAngle(p.h ? (v > 0 ? 0 : 180) : (v > 0 ? 90 : -90)).setDepth(4), vx: p.h ? v : 0, vy: p.h ? 0 : v });
  }
  G.cob = [];
  const st = randTile(1);
  G.p = S.add.image(st.x, st.y, 'pl').setDepth(5);

  const vb = G.vac = S.add.circle(0, 0, 26, 0xfacc15, .35).setDepth(8).setStrokeStyle(3, 0xfacc15);
  S.tweens.add({ targets: vb, scale: 1.5, alpha: .6, duration: 600, yoyo: true, repeat: -1 });
  G.vacT = tx(0, 0, 'VACANTE', 14, '#facc15', { stroke: '#000', strokeThickness: 4 }).setOrigin(.5).setDepth(8);
  newVacancy();

  const cam = S.cameras.main;
  cam.setBounds(0, 0, W, H).startFollow(G.p, true, .12, .12);
  const z = 172 / W;
  const mm = G.mm = S.cameras.add(620, 8, 172, Math.ceil(H * z)).setZoom(z).setBackgroundColor(0x000000);
  mm.centerOn(W / 2, H / 2);
  G.mmP = S.add.circle(0, 0, 45, 0xff3355).setDepth(20);
  G.mmV = S.add.circle(0, 0, 70, 0xfacc15).setDepth(19);
  cam.ignore([G.mmP, G.mmV]);

  G.hud = S.add.container(0, 0).setDepth(100);
  G.hg = S.add.graphics(); G.hud.add(G.hg);
  G.ht = tx(12, 8, '', 14, '#fff', { lineSpacing: 4 }); G.hud.add(G.ht);
  G.st = tx(706, 140, '', 20, '#facc15', { stroke: '#000', strokeThickness: 4 }).setOrigin(.5, 0); G.hud.add(G.st);
  G.toast = tx(400, 570, '', 15, '#fff', { backgroundColor: '#000000cc', padding: { x: 10, y: 6 }, align: 'center' }).setOrigin(.5).setAlpha(0); G.hud.add(G.toast);
  G.hint = tx(400, 520, '', 14, '#facc15', { stroke: '#000', strokeThickness: 4 }).setOrigin(.5); G.hud.add(G.hint);

  buildBattle(); buildTitle();
  G.over = S.add.container(0, 0).setDepth(400).setVisible(false);
  [G.hud, G.bt, G.tt, G.over].forEach(c => c.setScrollFactor(0, 0, true));
  mm.ignore([G.hud, G.bt, G.tt, G.over]);

  if (!HIQ) loadHi();
  buildPad();
  if (skipTitle) startGame(); else { G.mm.setVisible(false); G.hud.setVisible(false); }
}

function placePickup(s) {
  const p = randTile(1), r = Math.random(), k = r < .4 ? 0 : r < .65 ? 1 : r < .82 ? 3 : 2;
  s.setTexture('i' + k).setPosition(p.x, p.y).k = k;
}
function newVacancy() {
  const opts = G.bld.filter(b => b != G.vb && dist({ x: b.dx, y: b.dy }, G.p) > 500);
  G.vb = pick(opts.length ? opts : G.bld);
  G.vac.setPosition(G.vb.dx, G.vb.dy); G.vacT.setPosition(G.vb.dx, G.vb.dy - 40);
}
function toast(s, c) {
  G.toast.setText(s).setColor(c || '#fff').setAlpha(1);
  S.tweens.killTweensOf(G.toast);
  S.tweens.add({ targets: G.toast, alpha: 0, delay: 2200, duration: 400 });
}
function addStar(n, why) {
  const o = G.stars; G.stars = Phaser.Math.Clamp(G.stars + n, 0, 5); G.starT = 0;
  if (G.stars > o) { toast(why + '  +1★', '#facc15'); snd(220, .3, 'sawtooth', .05); }
}

// ---------- titulo ----------
function buildTitle() {
  const c = G.tt = S.add.container(0, 0).setDepth(300);
  const g = S.add.graphics();
  g.fillStyle(0x0b0d12, .92); g.fillRect(0, 0, 800, 600);
  for (let i = 0; i < 20; i++) { g.fillStyle(Phaser.Display.Color.HSVToRGB(.75 + i * .012, .7, .25 + i * .02).color); g.fillRect(0, 300 + i * 15, 800, 15); }
  for (let i = 0; i < 14; i++) { const h = R(80, 260); g.fillStyle(0x0b0d12); g.fillRect(i * 60, 600 - h, 54, h); g.fillStyle(0xfacc15, .5); for (let j = 0; j < h / 24 - 1; j++) if (Math.random() < .5) g.fillRect(i * 60 + 10 + (j % 2) * 20, 610 - h + j * 24, 10, 10); }
  c.add(g);
  c.add(tx(400, 110, 'PEGA CITY', 84, '#facc15', { stroke: '#7c3aed', strokeThickness: 10 }).setOrigin(.5).setAngle(-4));
  c.add(tx(400, 185, 'BUSCA PEGA · ESQUIVA COBRADORES · GÁNALE A RRHH', 18, '#fff').setOrigin(.5));
  c.add(tx(400, 300, 'Joystick: moverse    B1: postular / elegir\nB2: subirte a un auto / huir\n\nLlega a las VACANTES (amarillo en el mapa).\nEn los parques aparecen reclutadores salvajes.\nNo te quedes sin LUCAS ni sin MOTIVACIÓN.', 16, '#ddd', { align: 'center', lineSpacing: 6, backgroundColor: '#000000aa', padding: { x: 14, y: 10 } }).setOrigin(.5));
  const p = tx(400, 440, '- PRESIONA START -', 26, '#fff', { stroke: '#000', strokeThickness: 6 }).setOrigin(.5); c.add(p);
  S.tweens.add({ targets: p, alpha: .2, duration: 500, yoyo: true, repeat: -1 });
  c.add(G.recT = tx(400, 480, 'RÉCORD: ' + money(REC), 16, '#facc15', { stroke: '#000', strokeThickness: 4 }).setOrigin(.5));
}

// ---------- récord (storage del arcade; fallback a localStorage en local) ----------
const HI_KEY = 'pegacity_hi';
let REC = 0, HIQ = null;
function getStorage() {
  if (window.platanusArcadeStorage) return window.platanusArcadeStorage;
  return {
    async get(k) {
      try { const r = window.localStorage.getItem(k); return r === null ? { found: false, value: null } : { found: true, value: JSON.parse(r) }; } catch (e) { return { found: false, value: null }; }
    },
    async set(k, v) { try { window.localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
  };
}
function loadHi() {
  HIQ = Promise.resolve().then(() => getStorage().get(HI_KEY)).then(r => {
    const v = r && r.found ? +r.value : 0; // valida lo leído: el formato pudo cambiar
    if (isFinite(v) && v > REC) REC = v;
    if (G && G.recT && G.recT.active) G.recT.setText('RÉCORD: ' + money(REC));
  }).catch(() => { });
}
function saveHi(v) {
  if (!(v > REC)) return;
  REC = v;
  HIQ = (HIQ || Promise.resolve()).then(() => { if (v >= REC) return getStorage().set(HI_KEY, v); }).catch(() => { });
}
function startGame() {
  G.mode = 'city'; G.tt.setVisible(false); G.mm.setVisible(true); G.hud.setVisible(true);
  toast('Día 1. Tienes ' + money(G.lucas) + ' y un sueño.', '#facc15'); jingle([523, 659, 784, 1047]);
}

// ---------- input ----------
// "A" = B1 o B4 (columna izquierda), "B" = B2 o B5 (columna del medio). P1 y P2 controlan al mismo personaje.
const isA = a => a == 'P1_1' || a == 'P2_1' || a == 'P1_4' || a == 'P2_4';
const isB = a => a == 'P1_2' || a == 'P2_2' || a == 'P1_5' || a == 'P2_5';
const isS = a => a == 'START1' || a == 'START2';
const DIR = { P1_U: 'u', P2_U: 'u', P1_D: 'd', P2_D: 'd', P1_L: 'l', P2_L: 'l', P1_R: 'r', P2_R: 'r' };
const dirOf = a => (DIR[a] || '')[0];
const hd = d => [held, TH].some(h => Object.keys(h).some(k => h[k] && (DIR[k] || '').includes(d)));

window.addEventListener('keydown', e => {
  const a = KEYBOARD_TO_ARCADE[normalizeIncomingKey(e.key)];
  if (AC && AC.state == 'suspended') AC.resume();
  if (!a || !G) return;
  if (!held[a]) press(a);
  held[a] = 1;
});
window.addEventListener('keyup', e => {
  const a = KEYBOARD_TO_ARCADE[normalizeIncomingKey(e.key)];
  if (a) held[a] = 0;
});

function press(a) {
  if (G.mode == 'title') { if (isS(a) || isA(a)) startGame(); return; }
  if (G.mode == 'over') { if (G.overT <= 0 && (isS(a) || isA(a))) { G.overT = 1e9; skipTitle = true; S.scene.restart(); } return; }
  if (G.mode == 'battle') return battleKey(a);
  if (isA(a)) {
    const b = G.bld.find(b => dist({ x: b.dx, y: b.dy }, G.car || G.p) < 56);
    if (b == G.vb) startBattle(true);
    else if (b) { toast(b.n + ': ' + pick(NOPE)); snd(160, .2); }
  }
  if (isB(a)) {
    if (G.car) {
      const c = G.car;
      for (const [ox, oy] of [[0, -28], [0, 28], [-30, 0], [30, 0], [0, 0]]) if (!hit(c.x + ox, c.y + oy, 9)) { G.p.setPosition(c.x + ox, c.y + oy); break; }
      G.park.push(c); c.setDepth(3); G.car = null; G.p.setVisible(true);
      S.cameras.main.startFollow(G.p, true, .12, .12);
    } else {
      const c = G.park.find(c => dist(c, G.p) < 44);
      if (c) {
        G.park.splice(G.park.indexOf(c), 1); G.car = c; c.setDepth(5); G.p.setVisible(false);
        S.cameras.main.startFollow(c, true, .12, .12);
        addStar(1, '¡Te subiste a un auto ajeno!'); snd(90, .4, 'sawtooth', .06);
      }
    }
  }
}

// ---------- ciudad ----------
function update(t, dms) {
  const dt = Math.min(dms, 50) / 1000;
  touch();
  if (G.mode == 'over') { G.overT -= dt; return; }
  if (G.mode == 'battle') { if (G.q.on && (G.qT -= dt) <= 0) next(); return; }
  for (const c of G.cars) { // el tráfico se mueve hasta en el título
    c.s.x += c.vx * dt; c.s.y += c.vy * dt;
    if (c.s.x < -40) c.s.x = W + 40; if (c.s.x > W + 40) c.s.x = -40;
    if (c.s.y < -40) c.s.y = H + 40; if (c.s.y > H + 40) c.s.y = -40;
  }
  if (G.mode != 'city') return;
  G.inv -= dt;
  const me = G.car || G.p;
  let dx = (hd('r') ? 1 : 0) - (hd('l') ? 1 : 0), dy = (hd('d') ? 1 : 0) - (hd('u') ? 1 : 0);
  if (dx && dy) { dx *= .707; dy *= .707; }
  const sp = (G.car ? 270 : 135) * dt, r = G.car ? 11 : 9;
  if (dx || dy) {
    const ox = me.x, oy = me.y;
    if (!hit(me.x + dx * sp, me.y, r)) me.x += dx * sp;
    if (!hit(me.x, me.y + dy * sp, r)) me.y += dy * sp;
    if (G.car) me.rotation = Math.atan2(dy, dx); else me.setFlipX(dx < 0);
    const mv = Math.hypot(me.x - ox, me.y - oy);
    if (!G.car) G.p.y += Math.sin(t / 60) * .3;
    G.walk += mv;
    if (G.walk > 32) {
      G.walk = 0;
      if (tile(me.x, me.y) == 3 && Math.random() < .14) return startBattle(false);
    }
  }
  if (G.car) G.p.setPosition(G.car.x, G.car.y);

  // tráfico
  for (const c of G.cars) {
    if (G.inv <= 0 && Math.abs(c.s.x - me.x) < (c.vx ? 26 : 16) && Math.abs(c.s.y - me.y) < (c.vx ? 16 : 26)) {
      G.inv = 1.2; S.cameras.main.shake(200, .01); snd(80, .3, 'sawtooth', .08);
      if (G.car) { G.mot -= 4; addStar(1, '¡Choque!'); }
      else { G.mot -= 12; toast('¡Te atropellaron! -12 motivación', '#f87171'); }
      const a = Math.atan2(me.y - c.s.y, me.x - c.s.x);
      for (let i = 0; i < 6; i++) { const nx = me.x + Math.cos(a) * 6, ny = me.y + Math.sin(a) * 6; if (!hit(nx, ny, r)) { me.x = nx; me.y = ny; } }
    }
  }
  // pickups
  for (const s of G.pk) if (dist(s, me) < 22) {
    const k = s.k;
    if (k == 0) { const v = R(15, 35); G.lucas += v; toast('Pega freelance: +' + money(v), '#86efac'); }
    if (k == 1) { G.cafe++; toast('+1 CAFÉ (cura en entrevistas)', '#fcd34d'); }
    if (k == 2) { G.cert++; toast('+1 CERTIFICACIÓN (tu CV pega más fuerte)', '#fef9c3'); }
    if (k == 3) { G.pit++; toast('+1 PITUTO (ataque especial)', '#facc15'); }
    jingle([660, 880]); placePickup(s);
  }
  // cobradores (policía de este mundo)
  while (G.cob.length < G.stars) {
    const a = Math.random() * 6.28, d = 420;
    G.cob.push(S.add.image(Phaser.Math.Clamp(me.x + Math.cos(a) * d, 20, W - 20), Phaser.Math.Clamp(me.y + Math.sin(a) * d, 20, H - 20), 'cb').setDepth(6));
  }
  while (G.cob.length > G.stars) G.cob.pop().destroy();
  for (const c of G.cob) {
    const a = Math.atan2(me.y - c.y, me.x - c.x), v = (70 + G.stars * 16) * dt;
    c.x += Math.cos(a) * v; c.y += Math.sin(a) * v; c.setFlipX(Math.cos(a) < 0);
    if (G.inv <= 0 && dist(c, me) < 20) {
      const l = 10 * G.stars; G.lucas -= l; G.mot -= 4; G.inv = 1.5;
      toast('¡Te pilló un cobrador! -' + money(l), '#f87171'); S.cameras.main.shake(150, .008); snd(120, .3, 'sawtooth', .07);
      G.stars--; G.starT = 0;
    }
  }
  if (G.stars > 0 && (G.starT += dt) > 15) { G.stars--; G.starT = 0; toast('Perdiste a un cobrador de vista', '#86efac'); }

  // días y arriendo
  if ((G.dayT += dt) > 12) {
    G.dayT = 0; G.day++;
    const rent = 25 + (G.day / 5 | 0) * 5; G.lucas -= rent;
    toast('Día ' + G.day + ': pagaste arriendo -' + money(rent), '#fca5a5'); snd(200, .2, 'triangle', .06);
    if (G.lucas < 80) S.time.delayedCall(1500, () => G.mode == 'city' && addStar(1, 'Quedaste en DICOM'));
  }
  if ((G.phT -= dt) <= 0) {
    G.phT = R(9, 16); const [m, e] = pick(PHONE);
    if (e == 'p') G.pit++; else G.mot = Math.min(G.max, G.mot + e);
    toast('TEL: ' + m, e == 'p' || e > 0 ? '#86efac' : '#ddd'); jingle([988, 1319], 70);
  }
  if (G.lucas <= 0) return gameOver('SIN LUCAS', 'Te volviste a la casa de tus papás.');
  if (G.mot <= 0) return gameOver('BURNOUT', 'Cerraste LinkedIn y te fuiste a la playa.');

  // hint de interacción
  const nb = G.bld.find(b => dist({ x: b.dx, y: b.dy }, me) < 56);
  const nc = !G.car && G.park.find(c => dist(c, G.p) < 44);
  G.hint.setText(nb == G.vb ? 'B1: ¡POSTULAR A ' + nb.n + '!' : nb ? 'B1: dejar CV en ' + nb.n : nc ? 'B2: subirte al auto (+1★)' : G.car ? 'B2: bajarte' : '');
  drawHud(me);
}
function drawHud(me) {
  const g = G.hg; g.clear();
  g.fillStyle(0x000000, .65); g.fillRoundedRect(4, 4, 280, 112, 8);
  g.fillStyle(0x333333); g.fillRect(12, 28, 200, 10);
  const f = Math.max(0, G.mot / G.max); g.fillStyle(f > .5 ? 0x22c55e : f > .25 ? 0xfacc15 : 0xef4444); g.fillRect(12, 28, 200 * f, 10);
  g.lineStyle(2, 0xffffff); g.strokeRect(618, 6, 176, G.mm.height + 4);
  G.ht.setText(
    'MOTIVACIÓN ' + Math.ceil(G.mot) + '/' + G.max + '\n\n' +
    'LUCAS ' + money(G.lucas) + '   DÍA ' + G.day + '\n' +
    SEN[Math.min(G.lvl, 6)].toUpperCase() + '  OFERTAS ' + G.offers + '\n' +
    'CAFÉ ' + G.cafe + '  CERT ' + G.cert + '  PITUTO ' + G.pit);
  G.st.setText('★'.repeat(G.stars) + '☆'.repeat(5 - G.stars));
  G.mmP.setPosition(me.x, me.y); G.mmV.setPosition(G.vb.dx, G.vb.dy).setAlpha(.5 + .5 * Math.sin(S.time.now / 150));
  const cam = S.cameras.main, sx = me.x - cam.scrollX, sy = me.y - cam.scrollY;
  const vx = G.vb.dx - me.x, vy = G.vb.dy - me.y, d = Math.hypot(vx, vy);
  if (d > 240) {
    const a = Math.atan2(vy, vx), ax = sx + Math.cos(a) * 70, ay = sy + Math.sin(a) * 70;
    g.fillStyle(0xfacc15); g.lineStyle(2, 0x000000);
    const p = [[18, 0], [-8, -10], [-8, 10]].map(([x, y]) => ({ x: ax + x * Math.cos(a) - y * Math.sin(a), y: ay + x * Math.sin(a) + y * Math.cos(a) }));
    g.fillPoints(p, true); g.strokePoints(p, true);
  }
}

// ---------- batalla ----------
function buildBattle() {
  const c = G.bt = S.add.container(0, 0).setDepth(200).setVisible(false);
  const g = S.add.graphics();
  g.fillStyle(0xdff3e4); g.fillRect(0, 0, 800, 440);
  g.fillStyle(0xc4e8cf); g.fillRect(0, 250, 800, 190);
  g.fillStyle(0x9fd3ae); g.fillEllipse(590, 245, 280, 60); g.fillEllipse(210, 425, 320, 60);
  g.fillStyle(0xffffff); g.fillRoundedRect(4, 444, 792, 152, 10);
  g.lineStyle(4, 0x1f2937); g.strokeRoundedRect(4, 444, 792, 152, 10);
  g.fillStyle(0xfff8e7); g.fillRoundedRect(30, 30, 300, 74, 8); g.fillRoundedRect(470, 300, 300, 92, 8);
  g.lineStyle(3, 0x1f2937); g.strokeRoundedRect(30, 30, 300, 74, 8); g.strokeRoundedRect(470, 300, 300, 92, 8);
  c.add(g);
  G.bg2 = S.add.graphics(); c.add(G.bg2);
  G.eS = S.add.image(590, 185, 'e0').setScale(1.3); G.pS = S.add.image(210, 350, 'pb').setScale(1.5);
  c.add([G.eS, G.pS]);
  G.eN = tx(44, 38, '', 18, '#111'); G.pN = tx(484, 308, '', 18, '#111'); G.pH = tx(484, 362, '', 16, '#111');
  G.msg = tx(28, 466, '', 20, '#111', { wordWrap: { width: 740 }, lineSpacing: 6 });
  c.add([G.eN, G.pN, G.pH, G.msg, tx(44, 68, 'INTERÉS', 12, '#111'), tx(484, 340, 'MOT', 12, '#111')]);
  G.mt = [0, 1, 2, 3].map(i => { const t = tx(500 + (i % 2) * 150, 470 + (i >> 1) * 50, '', 20, '#111'); c.add(t); return t; });
  G.cu = tx(0, 0, '▶', 20, '#7c3aed'); c.add(G.cu);
  G.mb = tx(500, 572, 'B2: HUIR', 14, '#666'); c.add(G.mb);
}
function hpBars() {
  const g = G.bg2, e = G.e; g.clear();
  const bar = (x, y, f) => { g.fillStyle(0x333333); g.fillRect(x, y, 200, 10); g.fillStyle(f > .5 ? 0x22c55e : f > .25 ? 0xfacc15 : 0xef4444); g.fillRect(x, y, 200 * Math.max(0, f), 10); };
  bar(110, 72, e.hp / e.max); bar(550, 342, G.mot / G.max);
  G.eN.setText(e.name + (e.boss ? '' : '  Lv' + e.lvl));
  G.pN.setText('TÚ  (' + SEN[Math.min(G.lvl, 6)] + ')');
  G.pH.setText('      ' + Math.max(0, Math.ceil(G.mot)) + '/' + G.max);
}
function startBattle(boss) {
  G.mode = 'battle'; held = {};
  const b = boss ? BOSS[G.offers % 3] : pick(WILD), lvl = G.lvl + R(0, 2);
  const max = boss ? 70 + G.offers * 28 : 26 + lvl * 9 + R(0, 10);
  G.e = { name: b.n, k: b.k, weak: b.w, L: b.L, boss, lvl, hp: max, max, atk: boss ? 8 + G.offers * 2.5 : 4 + lvl * 1.5 };
  G.eS.setTexture('e' + b.k).setAlpha(1).setPosition(900, 185); G.pS.setPosition(-120, 350);
  S.tweens.add({ targets: G.eS, x: 590, duration: 500 }); S.tweens.add({ targets: G.pS, x: 210, duration: 500 });
  G.bt.setVisible(true); G.mm.setVisible(false); G.hud.setVisible(false); showMenu(false); hpBars();
  S.cameras.main.flash(300, 255, 255, 255);
  jingle(boss ? [392, 523, 659, 784, 659, 784] : [330, 392, 494, 659], 80);
  say(boss ? ['Entrevista en ' + G.vb.n + '.', '¡' + b.n + ' quiere conocerte!'] : ['¡Apareció un ' + b.n + ' salvaje!'], menu);
}
function showMenu(v) {
  G.mt.forEach((t, i) => t.setVisible(v).setText(MOVES[i] + (i == 2 ? ' x' + G.pit : i == 3 ? ' x' + G.cafe : '')));
  G.cu.setVisible(v); G.mb.setVisible(v);
  G.msg.setWordWrapWidth(v ? 440 : 740);
  if (v) G.cu.setPosition(G.mt[G.cur].x - 22, G.mt[G.cur].y);
}
function menu() { G.bm = true; G.msg.setText('¿Qué vas a hacer?'); showMenu(true); hpBars(); }
function say(L, cb) { G.q = L.slice(); G.q.on = 1; G.qcb = cb; next(); }
function next() {
  if (!G.q.length) { G.q.on = 0; G.qcb && G.qcb(); return; }
  let m = G.q.shift(); if (Array.isArray(m)) { m[1](); m = m[0]; }
  G.msg.setText(m); G.qT = 2.2; hpBars(); snd(700, .03, 'square', .02);
}
function battleKey(a) {
  if (G.q.on) { if (isA(a)) next(); return; }
  if (!G.bm) return;
  const d = dirOf(a);
  if (d) { if (d == 'l' || d == 'r') G.cur ^= 1; else G.cur ^= 2; showMenu(true); snd(500, .04); return; }
  if (isA(a)) { G.bm = false; showMenu(false); doMove(G.cur); }
  if (isB(a)) { G.bm = false; showMenu(false); flee(); }
}
function bump(o, dx) { S.tweens.add({ targets: o, x: o.x + dx, duration: 70, yoyo: true, repeat: 2 }); }
function doMove(i) {
  const e = G.e, L = ['Usaste ' + MOVES[i] + '!'];
  const atk = (base, acc, typ) => {
    if (Math.random() > acc) { L.push('...pero no convenció a nadie.'); return; }
    let d = base * (.85 + Math.random() * .3), ef = e.weak == typ; if (ef) d *= 1.8; d = Math.round(d);
    L.push([ef ? '¡Es súper efectivo! (-' + d + ')' : e.name + ' pierde ' + d + ' de desinterés.', () => { e.hp -= d; bump(G.eS, 10); G.eS.setTint(0xff8888); S.time.delayedCall(250, () => G.eS.clearTint()); snd(ef ? 880 : 440, .15, 'square', .06); }]);
  };
  if (i == 0) atk(14 + G.lvl * 4, .92, 0);
  if (i == 1) atk(10 + G.cert * 5 + G.lvl * 3, .97, 1);
  if (i == 2) { if (G.pit > 0) { G.pit--; L.push('"Me recomendó tu primo..."'); atk(42 + G.lvl * 5, 1, 2); } else L.push('No tienes pitutos. Nadie te conoce.'); }
  if (i == 3) { if (G.cafe > 0) { G.cafe--; L.push(['Recuperas 35 de motivación.', () => { G.mot = Math.min(G.max, G.mot + 35); jingle([523, 784]); }]); } else L.push('No queda café. Solo agua de la llave.'); }
  say(L, () => e.hp <= 0 ? win() : enemyTurn());
}
function enemyTurn() {
  const e = G.e, [m, k] = pick(e.L), d = Math.round(e.atk * k * (.8 + Math.random() * .4));
  say([e.name + ': "' + m + '"', d ? ['Pierdes ' + d + ' de motivación.', () => { G.mot -= d; bump(G.pS, -10); S.cameras.main.shake(120, .006); snd(150, .2, 'sawtooth', .07); }] : '...no pasa nada. Todavía.'],
    () => G.mot <= 0 ? gameOver('BURNOUT', 'La entrevista con ' + e.name + ' pudo más.') : menu());
}
function flee() {
  const e = G.e;
  if (e.boss) say(['Abandonaste el proceso.', ['La vacante se movió a otra empresa. -5 motivación', () => { G.mot -= 5; newVacancy(); }]], endBattle);
  else if (Math.random() < .75) say(['Escapaste... a scrollear LinkedIn.'], endBattle);
  else say(['¡No pudiste escapar!'], enemyTurn);
}
function win() {
  const e = G.e, L = [];
  S.tweens.add({ targets: G.eS, alpha: 0, y: 220, duration: 400 });
  if (e.boss) {
    G.offers++;
    const sal = 900 + G.offers * 300 + R(0, 20) * 10;
    G.score += sal; G.lucas += 150; G.xp += 40;
    jingle([523, 659, 784, 1047, 784, 1047], 110);
    L.push('¡¡OFERTA!! Sueldo: ' + money(sal) + '/mes', '+' + money(150) + ' de bono de firma.', pick(['...pero es a plazo fijo por 3 meses.', '...pero la empresa se fusionó y congeló el cargo.', '...pero es "part-time de 45 horas".', '...pero piden volver 5 días a la oficina en otra región.']), 'Toca seguir buscando. ¡Nueva vacante en el mapa!');
    newVacancy();
  } else {
    const v = R(10, 30) + e.lvl * 3; G.lucas += v; G.xp += 12 + e.lvl * 3;
    L.push('¡' + e.name + ' quedó sin preguntas!', 'Te pasó una pega freelance: +' + money(v));
    if (Math.random() < .3) { G.cafe++; L.push('Además te invitó un CAFÉ.'); }
    jingle([659, 784, 988]);
  }
  while (G.xp >= 30 + G.lvl * 25) {
    G.xp -= 30 + G.lvl * 25; G.lvl++; G.max += 12; G.mot = Math.min(G.max, G.mot + 30);
    L.push('¡Subiste a ' + SEN[Math.min(G.lvl, 6)].toUpperCase() + '! Más motivación máxima.');
  }
  say(L, endBattle);
}
function endBattle() {
  G.mode = 'city'; G.bt.setVisible(false); G.mm.setVisible(true); G.hud.setVisible(true); G.inv = 1.5; held = {};
}

// ---------- game over ----------
function gameOver(t, why) {
  G.mode = 'over'; G.overT = 1.2; G.bt.setVisible(false); G.hud.setVisible(false); G.mm.setVisible(false);
  saveHi(G.score); const best = REC;
  const c = G.over.setVisible(true), g = S.add.graphics();
  g.fillStyle(0x000000, .75); g.fillRect(0, 0, 800, 600); c.add(g);
  const big = tx(400, 170, t, 96, '#ef4444', { stroke: '#000', strokeThickness: 10 }).setOrigin(.5).setScale(3).setAlpha(0);
  c.add(big); S.tweens.add({ targets: big, scale: 1, alpha: 1, duration: 500, ease: 'Back.out' });
  c.add(tx(400, 260, why, 20, '#fff').setOrigin(.5));
  c.add(tx(400, 360, 'Ofertas: ' + G.offers + '     Días: ' + G.day + '\nSeniority: ' + SEN[Math.min(G.lvl, 6)] + '\n\nPUNTAJE (sueldos ofrecidos): ' + money(G.score) + '\nRÉCORD: ' + money(best), 20, '#facc15', { align: 'center', lineSpacing: 8 }).setOrigin(.5));
  const p = tx(400, 520, 'START para buscar pega otra vez', 20, '#fff').setOrigin(.5); c.add(p);
  S.tweens.add({ targets: p, alpha: .2, duration: 500, yoyo: true, repeat: -1 });
  jingle([392, 330, 262, 196], 180);
}

// ---------- controles táctiles (solo si hay pantalla touch) ----------
function buildPad() {
  G.pad = null;
  if (!S.sys.game.device.input.touch) return;
  const c = G.pad = S.add.container(0, 0).setDepth(500).setScrollFactor(0, 0, true), g = S.add.graphics();
  g.fillStyle(0xffffff, .12); g.fillCircle(100, 500, 75); g.lineStyle(3, 0xffffff, .3); g.strokeCircle(100, 500, 75);
  g.fillStyle(0xffffff, .3);
  [[0, -1], [0, 1], [-1, 0], [1, 0]].forEach(([x, y]) => { const a = Math.atan2(y, x), cx = 100 + x * 50, cy = 500 + y * 50; g.fillTriangle(cx + Math.cos(a) * 14, cy + Math.sin(a) * 14, cx + Math.cos(a + 2.2) * 12, cy + Math.sin(a + 2.2) * 12, cx + Math.cos(a - 2.2) * 12, cy + Math.sin(a - 2.2) * 12); });
  g.fillStyle(0xfacc15, .35); g.fillCircle(730, 480, 38); g.fillStyle(0x7c3aed, .35); g.fillCircle(645, 540, 32);
  c.add([g, tx(730, 480, 'B1', 26, '#fff').setOrigin(.5), tx(645, 540, 'B2', 22, '#fff').setOrigin(.5)]);
  G.mm.ignore(c);
  S.input.on('pointerdown', p => { const z = zone(p); for (const k in z) if (!TP[k]) { TP[k] = 1; press(k); } });
}
function zone(p) {
  const c = {}, dx = p.x - 100, dy = p.y - 500, d = Math.hypot(dx, dy);
  if (G.mode == 'title' || G.mode == 'over') c.START1 = 1;
  else if (d < 110 && d > 12) {
    const a = Math.atan2(dy, dx) * 8 / Math.PI;
    if (a > -3 && a < 3) c.P1_R = 1; if (a > 5 || a < -5) c.P1_L = 1;
    if (a > 1 && a < 7) c.P1_D = 1; if (a < -1 && a > -7) c.P1_U = 1;
  } else if (Math.hypot(p.x - 730, p.y - 480) < 55) c.P1_1 = 1;
  else if (Math.hypot(p.x - 645, p.y - 540) < 48) c.P1_2 = 1;
  return c;
}
function touch() {
  if (!G.pad) return;
  const cur = {};
  S.input.manager.pointers.forEach(p => p.isDown && Object.assign(cur, zone(p)));
  for (const k in cur) if (!TP[k]) press(k);
  TP = cur; TH = cur;
}
