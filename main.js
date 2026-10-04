import * as THREE from 'three';
import { RoundedBoxGeometry } from './vendor/RoundedBoxGeometry.js';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';

/* ============================================================================================
   Salah Rings — landing page
   One fixed WebGL canvas behind the page draws the 3D logo, the three activity rings and the
   phone; everything else is DOM. Both are driven by one smoothed scroll value (S), so a
   section's story is a pure function of how far you have scrolled through it.
   ========================================================================================== */

const TAU = Math.PI * 2;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const easeInOut = (t) => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeOutBack = (t) => { t = clamp(t); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------------------------------------------------------------- layout cache */
let vw = innerWidth, vh = innerHeight, mobile = vw < 820;
const el = { rings: $('#rings'), phone: $('#phone'), mushaf: $('#mushaf'), widget: $('#widget'), hero: $('#hero') };
const pos = {};
function measure() {
  vw = innerWidth; vh = innerHeight; mobile = vw < 820;
  for (const k of Object.keys(el)) { const r = el[k].getBoundingClientRect(); pos[k] = { top: r.top + scrollY, h: r.height }; }
  const sp = $('#spread'); book.bw = sp.offsetWidth; book.bh = sp.offsetHeight;
  const kh = $('.t-khatm'); if (kh) { const r = kh.getBoundingClientRect(); pos.khatm = { top: r.top + scrollY, h: r.height }; }
}
const book = { bw: 300, bh: 420 };
const pin = (k) => clamp((S - pos[k].top) / Math.max(1, pos[k].h - vh));

/* ---------------------------------------------------------------- renderer */
const canvas = $('#gl');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
} catch (e) { document.documentElement.classList.add('nogl'); }
const hasGL = !!renderer;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, 1, .1, 60);
camera.position.set(0, 0, 9);
let dprCap = mobile ? 1.75 : 2;
if (hasGL) {
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = .95;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 1.0;
}
const key = new THREE.DirectionalLight(0xfff0dc, 2.2); key.position.set(3, 4, 6); scene.add(key);
const rimMint = new THREE.PointLight(0x3ddc97, 90, 24, 2); rimMint.position.set(-5, 2.2, -1.5); scene.add(rimMint);
const rimGold = new THREE.PointLight(0xe6c067, 70, 24, 2); rimGold.position.set(5, -2.5, 1); scene.add(rimGold);

function resize() {
  if (!hasGL) return;
  const w = innerWidth, h = innerHeight;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, dprCap));
  renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
}

/* ---------------------------------------------------------------- the logo, as a real solid */
const BITE = { x: .46, y: .40, r: .66 };
const dC = Math.hypot(BITE.x, BITE.y), phiC = Math.atan2(BITE.y, BITE.x);
const halfSpan = (rho) => Math.acos(clamp((rho * rho + dC * dC - BITE.r * BITE.r) / (2 * rho * dC), -1, 1));
const P2 = (rho, a) => new THREE.Vector2(rho * Math.cos(a), rho * Math.sin(a));
function biteArc(p, q) {
  const a0 = Math.atan2(p.y - BITE.y, p.x - BITE.x), a1 = Math.atan2(q.y - BITE.y, q.x - BITE.x);
  let d = a1 - a0; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU;
  const out = [];
  for (let i = 1; i <= 28; i++) { const a = a0 + d * i / 28; out.push(new THREE.Vector2(BITE.x + BITE.r * Math.cos(a), BITE.y + BITE.r * Math.sin(a))); }
  return out;
}
/** A ring of the logo: an annulus with the moon's bite taken out of it. */
function logoRingShape(R, r) {
  const dO = halfSpan(R), dI = halfSpan(r);
  const aO = phiC + dO, bO = phiC - dO + TAU, aI = phiC + dI, bI = phiC - dI + TAU;
  const N = 150, pts = [];
  for (let i = 0; i <= N; i++) pts.push(P2(R, aO + (bO - aO) * i / N));
  pts.push(...biteArc(P2(R, bO), P2(r, bI)));
  for (let i = 0; i <= N; i++) pts.push(P2(r, bI + (aI - bI) * i / N));
  pts.push(...biteArc(P2(r, aI), P2(R, aO)));
  pts.pop();
  return new THREE.Shape(pts);
}
function extrude(shape, depth, bevel = .028) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelOffset: -bevel, bevelSegments: 4, curveSegments: 1 });
  g.translate(0, 0, -depth / 2);
  return g;
}
const RINGS = [{ r0: .82, r1: 1.0 }, { r0: .52, r1: .70 }, { r0: .22, r1: .40 }];
const glossy = (color, o = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: .2, metalness: .05, clearcoat: 1, clearcoatRoughness: .06, envMapIntensity: .8, transparent: true, ...o });
const COLORS = [0x1fd186, 0xf0b429, 0x9a66ff];
const logoMats = [glossy(0x1fd186, { roughness: .16, emissive: 0x0b6b3f, emissiveIntensity: .25 }), glossy(0xf4f6f8, { roughness: .16 }), glossy(0xf4f6f8, { roughness: .16 })];

const logo = new THREE.Group(); scene.add(logo);
const logoRings = RINGS.map((rg, i) => {
  const depth = [.2, .17, .14][i];
  const m = new THREE.Mesh(extrude(logoRingShape(rg.r1, rg.r0), depth), logoMats[i]);
  m.position.z = (i - 1) * .06;
  const holder = new THREE.Group(); holder.add(m); logo.add(holder);
  return holder;
});

/* ---------------------------------------------------------------- the three activity rings */
function arcShape(r0, r1, t) {
  const w = (r1 - r0) / 2, rm = (r0 + r1) / 2;
  if (t >= .997) {
    const outer = [], inner = [];
    for (let i = 0; i < 160; i++) { const a = TAU * i / 160; outer.push(new THREE.Vector2(r1 * Math.cos(a), r1 * Math.sin(a))); inner.push(new THREE.Vector2(r0 * Math.cos(-a), r0 * Math.sin(-a))); }
    const s = new THREE.Shape(outer); s.holes.push(new THREE.Path(inner)); return s;
  }
  const th1 = Math.max(.07, t * TAU), pts = [];
  const N = Math.max(10, Math.round(110 * t));
  for (let i = 0; i <= N; i++) { const a = th1 * i / N; pts.push(new THREE.Vector2(r1 * Math.sin(a), r1 * Math.cos(a))); }
  const E = new THREE.Vector2(rm * Math.sin(th1), rm * Math.cos(th1)), Nn = new THREE.Vector2(Math.sin(th1), Math.cos(th1)), T = new THREE.Vector2(Math.cos(th1), -Math.sin(th1));
  for (let i = 1; i < 20; i++) { const f = Math.PI * i / 20; pts.push(E.clone().addScaledVector(Nn, w * Math.cos(f)).addScaledVector(T, w * Math.sin(f))); }
  for (let i = N; i >= 0; i--) { const a = th1 * i / N; pts.push(new THREE.Vector2(r0 * Math.sin(a), r0 * Math.cos(a))); }
  const S0 = new THREE.Vector2(0, rm);
  for (let i = 1; i < 20; i++) { const f = Math.PI * i / 20; pts.push(S0.clone().add(new THREE.Vector2(-w * Math.sin(f), -w * Math.cos(f)))); }
  return new THREE.Shape(pts);
}
const acts = new THREE.Group(); scene.add(acts);
const act = RINGS.map((rg, i) => {
  const g = new THREE.Group();
  const trackMat = new THREE.MeshPhysicalMaterial({ color: COLORS[i], roughness: .5, metalness: 0, transparent: true, opacity: 0, emissive: COLORS[i], emissiveIntensity: .05 });
  const track = new THREE.Mesh(extrude(arcShape(rg.r0, rg.r1, 1), .05, .01), trackMat);
  const mat = glossy(COLORS[i], { roughness: .2, emissive: COLORS[i], emissiveIntensity: .22 });
  const mesh = new THREE.Mesh(extrude(arcShape(rg.r0, rg.r1, .08), .16, .03), mat);
  mesh.position.z = .02;
  g.add(track, mesh); acts.add(g);
  return { g, mesh, mat, trackMat, rg, v: -1 };
});
function setFill(a, v) {
  v = Math.round(clamp(v, .08, 1) * 240) / 240;
  if (v === a.v) return; a.v = v;
  a.mesh.geometry.dispose(); a.mesh.geometry = extrude(arcShape(a.rg.r0, a.rg.r1, v), .16, .03);
}
acts.visible = false;

/* soft glow behind the logo and rings */
function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(.25, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const glow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: glowTexture(), color: 0x3ddc97, transparent: true, opacity: .0, blending: THREE.AdditiveBlending, depthWrite: false }));
glow.position.z = -1.2; scene.add(glow);

/* dust, for depth */
const dustN = 240, dustPos = new Float32Array(dustN * 3), dustSeed = [];
for (let i = 0; i < dustN; i++) { dustPos.set([(Math.random() - .5) * 14, (Math.random() - .5) * 9, (Math.random() - .5) * 6 - 1], i * 3); dustSeed.push(Math.random() * 10); }
const dustGeo = new THREE.BufferGeometry(); dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ size: .022, color: 0xbfe9d6, transparent: true, opacity: .5, depthWrite: false, blending: THREE.AdditiveBlending }));
scene.add(dust);

/* ---------------------------------------------------------------- the phone */
function rrShape(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0); s.lineTo(x + w, y + h - r);
  s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2); s.lineTo(x + r, y + h); s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI); s.lineTo(x, y + r);
  s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5); return s;
}
const SCREENS = ['today_N', 'plan_day', 'qada_day', 'dhikr_day', 'achieve_day'];
const screenTex = [];
const screenMat = new THREE.ShaderMaterial({
  uniforms: { tA: { value: null }, tB: { value: null }, mixv: { value: 0 }, gloss: { value: 0 }, dim: { value: 1 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tA; uniform sampler2D tB; uniform float mixv; uniform float gloss; uniform float dim; varying vec2 vUv;
    void main(){ vec4 a = texture2D(tA, vUv); vec4 b = texture2D(tB, vUv); vec4 c = mix(a, b, mixv);
      float g = smoothstep(0.0, 1.0, 1.0 - abs(vUv.x * 1.15 + vUv.y * 0.55 - gloss) * 3.4) * 0.09; c.rgb += g; c.rgb *= dim;
      gl_FragColor = vec4(c.rgb, 1.0);
      #include <colorspace_fragment>
    }`,
  toneMapped: false,
});
const phone = new THREE.Group(); scene.add(phone);
{
  const SW = .74, SH = 1.60;
  const body = new THREE.Mesh(new RoundedBoxGeometry(.80, 1.72, .095, 8, .12), new THREE.MeshPhysicalMaterial({ color: 0x3b4150, metalness: .92, roughness: .26, clearcoat: .6, clearcoatRoughness: .2, envMapIntensity: 1.3 }));
  const bezel = new THREE.Mesh(new THREE.ShapeGeometry(rrShape(.775, 1.695, .1), 24), new THREE.MeshPhysicalMaterial({ color: 0x050608, roughness: .25, metalness: .2, clearcoat: 1 }));
  bezel.position.z = .0482;
  const sg = new THREE.ShapeGeometry(rrShape(SW, SH, .09), 24);
  const p = sg.attributes.position, uv = sg.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / SW + .5, p.getY(i) / SH + .5);
  const screen = new THREE.Mesh(sg, screenMat); screen.position.z = .0488;
  const cam = new THREE.Mesh(new THREE.CircleGeometry(.017, 24), new THREE.MeshBasicMaterial({ color: 0x020203 })); cam.position.set(0, .745, .0491);
  const btnMat = new THREE.MeshPhysicalMaterial({ color: 0x4a5163, metalness: .9, roughness: .3 });
  const b1 = new THREE.Mesh(new RoundedBoxGeometry(.012, .2, .035, 3, .005), btnMat); b1.position.set(.405, .25, 0);
  const b2 = new THREE.Mesh(new RoundedBoxGeometry(.012, .1, .035, 3, .005), btnMat); b2.position.set(.405, .02, 0);
  const b3 = new THREE.Mesh(new RoundedBoxGeometry(.012, .1, .035, 3, .005), btnMat); b3.position.set(-.405, .3, 0);
  phone.add(body, bezel, screen, cam, b1, b2, b3);
  phone.visible = false;
}
const loader = new THREE.TextureLoader();
const texReady = hasGL ? Promise.all(SCREENS.map((n, i) => new Promise((res) => {
  loader.load(`assets/${n}.jpg`, (t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); screenTex[i] = t; res(); }, undefined, () => res());
}))) : Promise.resolve();

/* ---------------------------------------------------------------- scroll + pointer */
let S = scrollY, T0 = 0, readyAt = -1;
const ptr = { x: 0, y: 0, tx: 0, ty: 0 };
addEventListener('pointermove', (e) => { ptr.tx = (e.clientX / vw - .5) * 2; ptr.ty = (e.clientY / vh - .5) * 2; }, { passive: true });
addEventListener('deviceorientation', (e) => { if (e.gamma == null) return; ptr.tx = clamp(e.gamma / 30, -1, 1); ptr.ty = clamp((e.beta - 45) / 40, -1, 1); }, { passive: true });

const dom = {
  steps: $$('#ringSteps .step'), readout: $('#readout'), rN: $('#rN'), legend: $('#legend'),
  lc: $('#lc'), lq: $('#lq'), le: $('#le'),
  caps: $$('#phoneCaps .cap'), dots: $$('#phoneDots i'),
  spread: $('#spread'), cover: $('#cover'), page: $('#page'), block: $('#block'), desk: $('#desk'), mTitle: $('#mTitle'), mCopy: $('#mCopy'), shade: $('.shade'),
  wSteps: $$('#wSteps li'), wDevice: $('#wDevice'), wVideo: $('#wVideo'),
  wash1: $('.w1'), wash2: $('.w2'),
};

/* stage placements, by viewport shape: sizes follow what the camera can actually see */
function stage() {
  const visH = 2 * 9 * Math.tan(THREE.MathUtils.degToRad(15)), visW = visH * (vw / vh);
  if (mobile) {
    return { heroLogo: { x: 0, y: visH * .255, s: Math.min(.74, visW * .335) }, ringsStage: { x: 0, y: visH * .1, s: Math.min(.98, visW * .44) }, phone: { x: 0, y: visH * .15, s: Math.min(1.4, visW * .62, visH * .38) } };
  }
  const s = Math.min(1.38, visH * .3, visW * .2);
  return { heroLogo: { x: visW * .26, y: .02, s }, ringsStage: { x: 0, y: visH * .07, s: Math.min(1.3, visH * .265, visW * .22) }, phone: { x: visW * .22, y: 0, s: Math.min(1.9, visH * .39, visW * .27) } };
}
const project = new THREE.Vector3();
const fills = [0, 0, 0];

function updateWorld(t) {
  const st = stage();
  const heroP = clamp(S / Math.max(1, pos.rings.top));
  const rp = pin('rings');
  const e = clamp((S + vh - pos.phone.top) / vh);            // the phone's section scrolling in
  const pp = pin('phone');
  ptr.x += (ptr.tx - ptr.x) * .06; ptr.y += (ptr.ty - ptr.y) * .06;

  // ----- logo
  const hs = st.heroLogo, rs = st.ringsStage;
  const mv = easeInOut(heroP);
  const lx = lerp(hs.x, rs.x, mv), ly = lerp(hs.y, rs.y, mv), ls = lerp(hs.s, rs.s, mv);
  const flat = smooth(0, .2, rp);                              // the logo settles face-on as the rings section begins
  const sway = (1 - flat) * (1 - heroP * .4);
  logo.position.set(lx, ly + Math.sin(t * .8) * .035 * (1 - flat), 0);
  logo.rotation.set((-.1 + ptr.y * .22) * sway, (Math.sin(t * .55) * .28 + ptr.x * .42 + heroP * .5) * sway, Math.sin(t * .4) * .03 * sway);
  const intro = readyAt < 0 ? 0 : t - readyAt;
  logoRings.forEach((h, i) => {
    const pop = easeOutBack((intro - .1 - i * .16) / .95);
    const m = smooth(.27 + .045 * i, .42 + .045 * i, rp);        // each ring hands over to its activity ring
    h.scale.setScalar(Math.max(.0001, pop) * ls);
    h.rotation.z = m * TAU * (i % 2 ? -1 : 1) * .5 + (1 - pop) * -2;
    logoMats[i].opacity = 1 - smooth(.1, .9, m);
    h.visible = m < .995 && pop > .001;
  });

  // ----- activity rings
  const close = smooth(.86, .985, rp);
  const targets = [1, .86, .62];
  const heldAway = 1 - smooth(0, .55, e);
  acts.position.set(lx, ly, 0);
  acts.rotation.set(ptr.y * .08 * (1 - close), ptr.x * .14 * (1 - close), 0);
  let any = false;
  act.forEach((a, i) => {
    const m = smooth(.27 + .045 * i, .42 + .045 * i, rp);
    const sc = ls * heldAway * (1 + Math.sin(close * Math.PI) * .045);
    a.g.scale.setScalar(Math.max(.0001, sc));
    a.g.visible = m > .003 && heldAway > .003; any ||= a.g.visible;
    const base = smooth(.5 + .035 * i, .86, rp) * targets[i];
    const f = lerp(base, 1, close);
    fills[i] = f;
    setFill(a, m < .6 ? .1 : f);
    const o = smooth(.1, .9, m) * (1 - smooth(.7, 1, e));
    a.mat.opacity = o; a.trackMat.opacity = o * .34;
    a.mat.emissiveIntensity = .2 + close * .5 * (.6 + .4 * Math.sin(t * 3 + i));
    a.g.rotation.z = (1 - m) * TAU * .5 * (i % 2 ? 1 : -1);
  });
  acts.visible = any;

  // ----- glow
  const gs = (mobile ? 5.2 : 6.4) * ls / 1.3;
  glow.position.set(lx, ly, -1.3); glow.scale.setScalar(gs);
  glow.material.opacity = (.22 + .12 * Math.sin(t * .9) + close * .35 + (1 - heroP) * .08) * heldAway * smooth(0, 1.2, intro);
  const gc = new THREE.Color(0x3ddc97).lerp(new THREE.Color(0xe6c067), close * .55 + smooth(.9, 1, pp) * 0);
  glow.material.color.copy(gc);

  // ----- phone
  const ph = st.phone;
  const enter = easeInOut(e);
  phone.visible = e > 0.001 && S < pos.phone.top + pos.phone.h;
  const yawStep = mobile ? [-.12, .14, -.14, .14, -.1] : [-.28, .22, -.3, .22, -.2];
  const sidx = clamp(pp * 5, 0, 4.9999), si = Math.floor(sidx), sf = sidx - si;
  const sm = si < 4 ? smooth(.7, 1, sf) : 0;
  const yaw = lerp(yawStep[si], yawStep[Math.min(4, si + 1)], sm);
  phone.position.set(ph.x, lerp(-4.2, ph.y, enter) + Math.sin(t * .9) * .03, lerp(-1.5, 0, enter));
  phone.rotation.set(-.06 + ptr.y * .08 + (1 - enter) * .5, lerp(1.3, 0, enter) + yaw + ptr.x * .16, (1 - enter) * -.25);
  phone.scale.setScalar(ph.s);
  if (screenTex[0]) {
    screenMat.uniforms.tA.value = screenTex[si];
    screenMat.uniforms.tB.value = screenTex[Math.min(4, si + 1)] || screenTex[si];
    screenMat.uniforms.mixv.value = sm;
    screenMat.uniforms.gloss.value = .5 + yaw * 1.4 + ptr.x * .3;
    screenMat.uniforms.dim.value = .94 + .06 * enter;
  }

  // ----- dust & lights
  dust.rotation.y = t * .012 + S * .00006; dust.position.y = S * .0007 % 4;
  rimMint.position.x = -5 + ptr.x * 1.2; rimGold.position.y = -2.5 - ptr.y;
  key.position.set(3 + ptr.x * 1.4, 4 - ptr.y * 1.2, 6);

  // ----- DOM that belongs to the 3D scenes
  const steps = [[0, .24], [.26, .5], [.52, .8], [.82, 1.01]];
  dom.steps.forEach((s, i) => {
    const [a, b] = steps[i];
    const o = smooth(a, a + .05, rp) * (1 - smooth(b - .05, b, rp)) * (1 - smooth(0, .3, e));
    s.style.opacity = o; s.style.transform = `translateY(${(1 - o) * (rp < (a + b) / 2 ? 30 : -22)}px)`;
  });
  // the readout follows the rings' centre on screen
  project.set(lx, ly, 0).project(camera);
  const rx = (project.x * .5 + .5) * vw, ry = (-project.y * .5 + .5) * vh;
  const ro = smooth(.46, .56, rp) * heldAway * (1 - smooth(0, .3, e));
  dom.readout.style.opacity = ro;
  dom.readout.style.transform = `translate(${rx}px, ${ry}px)`;
  dom.rN.textContent = rp > .5 ? Math.round(clamp(fills[0]) * 5) : 0;
  dom.legend.style.opacity = smooth(.52, .62, rp) * (1 - smooth(0, .3, e));
  dom.legend.style.transform = `translateY(${(1 - smooth(.52, .62, rp)) * 14}px)`;
  const pc = (i) => Math.round((rp > .5 ? clamp(fills[i]) : 0) * 100);
  dom.lc.textContent = pc(0) + '%'; dom.lq.textContent = pc(1) + '%'; dom.le.textContent = pc(2) + '%';

  dom.caps.forEach((c, i) => {
    const f = sidx - i;
    const inn = smooth(.0, .16, f + (i === 0 ? 1 - smooth(0, .12, pp * 8) : 0) * 0), out = 1 - smooth(.84, 1, f);
    const o = clamp((i === 0 ? smooth(.02, .2, e) : smooth(0, .16, f)) * (i === 4 ? 1 : out));
    c.style.opacity = o; const dy = mobile ? 0 : -50;
    c.style.transform = `translateY(calc(${dy}% + ${(1 - o) * 36 * (f < .5 ? 1 : -1)}px))`;
  });
  dom.dots.forEach((d, i) => d.classList.toggle('on', i === Math.min(4, Math.round(sidx))));

  // background washes drift with the page
  dom.wash1.style.transform = `translate3d(${Math.sin(S * .0006) * 60}px, ${S * -.04}px, 0)`;
  dom.wash2.style.transform = `translate3d(${Math.cos(S * .0005) * -80}px, ${S * -.025}px, 0)`;
}

/* ---------------------------------------------------------------- the muṣḥaf book */
function updateBook() {
  const p = pin('mushaf');
  const { bw, bh } = book;
  const open = easeInOut(smooth(.12, .52, p));
  const z = easeInOut(smooth(.62, .9, p));
  const ang = 180 * open;
  dom.cover.style.transform = `translateZ(1px) rotateY(${ang}deg)`;
  const dark = Math.sin(Math.PI * clamp(ang / 180)) * .55;
  dom.shade.style.background = `linear-gradient(90deg, rgba(0,0,0,${dark}), rgba(0,0,0,${dark * .35}))`;
  dom.cover.style.opacity = 1 - smooth(.6, .7, p);
  const aspect = 720 / 1560;
  const Hz = lerp(bh, vh * (mobile ? .4 : .76), z), Wz = lerp(bw, Hz * aspect, z);
  dom.page.style.width = Wz + 'px'; dom.page.style.height = Hz + 'px';
  dom.page.style.borderRadius = lerp(3, 34, z) + 'px';
  dom.page.style.boxShadow = z > .02 ? `0 ${40 * z}px ${90 * z}px rgba(0,0,0,.6), 0 0 0 ${4 * z}px rgba(12,16,24,${z})` : '';
  dom.block.style.opacity = 1 - smooth(.6, .66, p);
  const endX = mobile ? 0 : vw * .2;
  const tx = lerp(mobile ? 0 : -bw / 2 * open, bw / 2 - Wz / 2 + endX, z);
  const baseY = vh * .075 * (1 - z) + (mobile ? vh * .05 : vh * .03) * (1 - z);
  const ty = baseY - (Hz - bh) / 2 - (mobile ? vh * .17 * z : 0);
  const rx = lerp(30, 4, smooth(0, .5, p)) * (1 - z), rz = lerp(-6, 0, smooth(0, .5, p)) * (1 - z);
  dom.spread.style.transform = `translate3d(${tx}px, ${ty}px, 0) rotateX(${rx}deg) rotateZ(${rz}deg)`;
  dom.desk.style.opacity = 1 - .8 * z;
  dom.desk.style.transform = `scale(${1 + .06 * p}) translateY(${p * -18}px)`;
  const to = 1 - smooth(.05, .17, p);
  dom.mTitle.style.opacity = to; dom.mTitle.style.transform = `translateY(${(1 - to) * -50}px)`;
  const co = smooth(.86, .96, p);
  dom.mCopy.style.opacity = co; dom.mCopy.style.transform = `translateY(calc(${mobile ? 0 : -50}% + ${(1 - co) * 40}px))`;
}

/* ---------------------------------------------------------------- the widget */
let wPlaying = false;
function updateWidget() {
  const p = pin('widget');
  const i = Math.min(2, Math.floor(p * 3 + .02));
  dom.wSteps.forEach((li, k) => li.classList.toggle('on', k === i));
  const enter = clamp((S + vh - pos.widget.top) / vh);
  const r = lerp(24, -16, p), pe = easeInOut(smooth(0, 1, enter));
  dom.wDevice.style.transform = `translateY(${(1 - pe) * 120}px) rotateY(${r}deg) rotateX(${lerp(8, 0, pe)}deg) scale(${lerp(.86, 1, pe)})`;
  const want = enter > .25 && S < pos.widget.top + pos.widget.h;
  if (want && !wPlaying) { wPlaying = true; dom.wVideo.play().catch(() => {}); }
  if (!want && wPlaying) { wPlaying = false; dom.wVideo.pause(); }
}

/* ---------------------------------------------------------------- khatm map */
const khatm = $('#khatm');
for (let i = 0; i < 604; i++) { const c = document.createElement('i'); if (i % 20 === 0) c.dataset.j = 1; khatm.appendChild(c); }
const khCells = [...khatm.children]; let khN = 0;
function updateKhatm() {
  if (!pos.khatm) return;
  const p = smooth(.1, .75, (S + vh - pos.khatm.top) / (vh + pos.khatm.h));
  const n = Math.floor(p * 604);
  if (n === khN) return;
  for (let i = Math.min(n, khN); i < Math.max(n, khN); i++) khCells[i].classList.toggle('f', i < n);
  khN = n;
}

/* ---------------------------------------------------------------- reveals, tilt, nav */
const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .14, rootMargin: '0px 0px -6% 0px' });
$$('.reveal').forEach((n) => io.observe(n));
$$('#wRings .arc').forEach((a) => a.style.setProperty('--v', a.dataset.v));
$$('.tilt').forEach((t) => {
  t.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const r = t.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
    t.style.transform = `perspective(1000px) rotateX(${-y * 7}deg) rotateY(${x * 9}deg) translateZ(0)`;
  });
  t.addEventListener('pointerleave', () => { t.style.transform = ''; });
});

/* ---------------------------------------------------------------- loop */
let last = performance.now();
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  const t = now / 1000;
  const target = scrollY;
  S = reduced ? target : S + (target - S) * (1 - Math.exp(-dt * 11));
  if (Math.abs(target - S) < .05) S = target;
  if (hasGL) updateWorld(t);
  updateBook(); updateWidget(); updateKhatm();
  const covered = S > pos.phone.top + pos.phone.h + 20;
  if (hasGL && !covered) renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

let lastW = innerWidth;
addEventListener('resize', () => {
  if (Math.abs(innerWidth - lastW) < 2 && mobile) { measure(); return; }   // mobile URL bar showing and hiding
  lastW = innerWidth; dprCap = innerWidth < 820 ? 1.75 : 2; measure(); resize();
});
addEventListener('load', measure);

(async function start() {
  measure(); resize();
  await Promise.race([Promise.all([document.fonts.ready, texReady]), new Promise((r) => setTimeout(r, 2500))]);
  measure();
  if (hasGL) { updateWorld(performance.now() / 1000); renderer.render(scene, camera); }
  requestAnimationFrame(() => {
    document.documentElement.classList.add('ready');
    readyAt = performance.now() / 1000;
  });
  requestAnimationFrame(frame);
})();

