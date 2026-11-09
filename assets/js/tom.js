/* =====================================================================
   tom.js — o robô Tom em 3D, em ESCALA REAL (1,80 m de altura)

   Montado com formas simples (esferas, cápsulas, caixas arredondadas), seguindo
   as proporções e as cores da imagem do mascote. As medidas abaixo estão em
   "pixels da imagem original" (738 × 1600) e convertidas para metros por S.

   criarTom(THREE)  →  { obj, update(t, dt, camPos), estado(nome), acenar(), altura }
   estados: "parado" | "ouvindo" | "pensando" | "falando"
   ===================================================================== */
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

export function criarTom(T){
  const S = 1.8 / 1600, CX = 369;                                    // metros por pixel; eixo central da imagem
  const P = (x, y, z = 0) => new T.Vector3((x - CX) * S, (1600 - y) * S, z * S);
  const COR = { cabeca: 0xa4ad42, cabecaClara: 0xb9c643, tronco: 0xb4c03f, azul: 0x154867, azulEsc: 0x0b2236, preto: 0x07111c, bone: 0xf8dc48, aba: 0xf4a53c,
                painel: 0x135237, branco: 0xf4f6f8, anel: 0x0c1a30, iris: 0x0a9bdc, bota: 0xaeb738, sola: 0x3d4a22, antebraco: 0xa9b43c };
  const mat = (cor, rug = .5, extra = {}) => new T.MeshStandardMaterial(Object.assign({ color: cor, roughness: rug, metalness: .04, emissive: cor, emissiveIntensity: .07 }, extra));
  const M = {};
  Object.entries(COR).forEach(([k, v]) => { M[k] = mat(v); });
  M.iris = mat(COR.iris, .3, { emissiveIntensity: .35 });
  M.branco = mat(COR.branco, .4, { emissiveIntensity: .55 });                                    // olhos bem brancos
  M.anel = mat(COR.anel, .5, { emissiveIntensity: .25 });
  M.sola = mat(COR.sola, .8);

  const g = new T.Group(); g.name = "Tom";
  const add = (pai, geo, material, pos, esc, nome) => { const m = new T.Mesh(geo, material); if(pos) m.position.copy(pos); if(esc) m.scale.set(esc[0] * S, esc[1] * S, esc[2] * S); if(nome) m.name = nome; pai.add(m); return m; };
  const esfera = new T.SphereGeometry(1, 40, 28);                     // raio 1: a escala dá o tamanho
  const cilindro = new T.CylinderGeometry(1, 1, 1, 36, 1);

  /* ---------- texturas desenhadas (logo do boné, "TOM", barriga) ---------- */
  const textura = (w, h, desenhar) => { const c = document.createElement("canvas"); c.width = w; c.height = h; desenhar(c.getContext("2d"), w, h); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8; return t; };
  const decal = (tex, w, h) => new T.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  const texLogo = textura(256, 256, (c, w, h) => {
    c.translate(w / 2, h / 2);
    c.lineWidth = 16; c.lineCap = "round";
    c.strokeStyle = "#16306a"; c.beginPath(); c.arc(0, 4, 88, Math.PI * 1.02, Math.PI * 1.95); c.stroke();            // arco azul-marinho
    c.strokeStyle = "#1c8a3f"; c.beginPath(); c.arc(0, 4, 104, Math.PI * 1.1, Math.PI * 1.55); c.stroke();            // arco verde
    c.strokeStyle = "#f2c230"; c.beginPath(); c.arc(0, 4, 104, Math.PI * 1.6, Math.PI * 1.9); c.stroke();             // arco amarelo
    c.fillStyle = "#0d8fe0"; c.beginPath(); c.arc(8, 12, 50, 0, Math.PI * 2); c.fill();                                // círculo azul
    c.fillStyle = "#ffffff"; c.beginPath();                                                                           // estrela
    for(let i = 0; i < 10; i++){ const r = i % 2 ? 11 : 26, a = -Math.PI / 2 + i * Math.PI / 5; c.lineTo(8 + Math.cos(a) * r, 12 + Math.sin(a) * r); } c.closePath(); c.fill();
  });
  const texTom = textura(512, 256, (c, w, h) => {
    c.fillStyle = "#2b2f25"; c.font = "900 150px 'Rockwell','Georgia','DejaVu Serif',serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("TOM", w / 2, h / 2 + 8);
  });
  const texBarriga = textura(256, 192, (c, w, h) => {
    c.strokeStyle = "rgba(60,140,200,.55)"; c.lineWidth = 7; c.lineCap = "round";
    [[.30, 14], [.46, 20], [.62, 16], [.78, 9]].forEach(([f, a]) => { c.beginPath(); c.moveTo(w * .12, h * f); c.quadraticCurveTo(w / 2, h * f + a * 2, w * .88, h * f); c.stroke(); });
  });

  /* ---------- cabeça ---------- */
  const cabeca = new T.Group(); cabeca.position.copy(P(CX, 470)); g.add(cabeca);
  const hc = (x, y, z) => new T.Vector3(x * S, (470 - y) * S, z * S);          // coordenadas relativas ao centro da cabeça (px)
  add(cabeca, esfera, M.cabeca, null, [300, 190, 262], "cabeca");
  [-1, 1].forEach(s => add(cabeca, esfera, M.cabecaClara, hc(s * 308, 440, -5), [54, 86, 70], "orelha"));
  // painel verde-escuro do rosto
  const painel = new T.Mesh(new RoundedBoxGeometry(440 * S, 222 * S, 60 * S, 5, 22 * S), M.painel); painel.position.copy(hc(0, 430, 236)); painel.name = "painel"; cabeca.add(painel);
  // olhos
  const olhos = [];
  [-1, 1].forEach(s => {
    const o = new T.Group(); o.position.copy(hc(s * 129, 432 + (s > 0 ? 6 : 0), 272)); cabeca.add(o);
    const anel = add(o, cilindro, M.anel, null, [118, 14, 118]); anel.rotation.x = Math.PI / 2; anel.position.z = -6 * S;
    const olho = new T.Group(); o.add(olho);                                    // parte que pisca
    const branco = add(olho, cilindro, M.branco, null, [100, 16, 100]); branco.rotation.x = Math.PI / 2; branco.position.z = 1 * S;
    const mov = new T.Group(); olho.add(mov);                                   // íris e pupila (seguem a câmera)
    const iris = add(mov, cilindro, M.iris, new T.Vector3(0, 0, 10 * S), [64, 10, 64]); iris.rotation.x = Math.PI / 2;
    const pupila = add(mov, cilindro, M.preto, new T.Vector3(0, 0, 16 * S), [22, 8, 22]); pupila.rotation.x = Math.PI / 2;
    [[-9, 8, 9], [10, -9, 5]].forEach(([dx, dy, r]) => { const b = add(mov, cilindro, M.branco, new T.Vector3(dx * S, -dy * S, 21 * S), [r, 5, r]); b.rotation.x = Math.PI / 2; });
    olhos.push({ olho, mov, iris });
  });
  // boca: sorriso na superfície da cabeça + abertura que aparece ao falar
  const zCab = (x, y) => 262 * Math.sqrt(Math.max(.05, 1 - Math.pow((y - 470) / 190, 2) - Math.pow(x / 300, 2)));
  const pts = []; for(let i = 0; i <= 24; i++){ const u = i / 24 * 2 - 1, x = u * 155, y = 560 + 34 * (1 - u * u); pts.push(new T.Vector3(x * S, (470 - y) * S, (zCab(x, y) + 8) * S)); }
  const sorriso = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 40, 11 * S, 8, false), mat(0x353535, .6)); sorriso.name = "sorriso"; cabeca.add(sorriso);
  const boca = add(cabeca, new T.CircleGeometry(1, 36), mat(0x1c0f12, .8, { side: T.DoubleSide }), hc(0, 590, zCab(0, 590) + 5), [96, 40, 1], "boca");
  boca.scale.y = .001;
  // boné: cúpula amarela, aba laranja curva, botão e logo
  const bone = new T.Group(); bone.position.copy(hc(0, 322, 0)); cabeca.add(bone);
  add(bone, new T.SphereGeometry(1, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), M.bone, null, [296, 300, 296], "bone");
  const aba = new T.Mesh(new T.CylinderGeometry(350 * S, 350 * S, 28 * S, 56, 1, false, -Math.PI * .58, Math.PI * 1.16), M.aba); aba.scale.z = .9; aba.position.set(0, 6 * S, 34 * S); aba.rotation.x = .20; aba.name = "aba"; bone.add(aba);
  add(bone, new T.TorusGeometry(1, .035, 8, 56), mat(0xe6b934, .6), new T.Vector3(0, 6 * S, 0), [288, 288, 288]).rotation.x = Math.PI / 2;
  add(bone, esfera, M.aba, new T.Vector3(0, 291 * S, 0), [24, 20, 24], "botao");
  const logo = new T.Mesh(new T.PlaneGeometry(250 * S, 250 * S), decal(texLogo)); logo.position.set(0, 150 * S, 252 * S); logo.rotation.x = -.34; logo.name = "logo-bone"; bone.add(logo);

  /* ---------- pescoço, tronco, barriga, pelve ---------- */
  add(g, cilindro, M.preto, P(CX, 668), [62, 70, 62], "pescoco");
  const tronco = new T.Group(); tronco.position.copy(P(CX, 800)); g.add(tronco);
  const corpo = new T.Mesh(new RoundedBoxGeometry(335 * S, 240 * S, 190 * S, 6, 46 * S), M.tronco); corpo.name = "tronco"; tronco.add(corpo);
  const tom = new T.Mesh(new T.PlaneGeometry(200 * S, 100 * S), decal(texTom)); tom.position.set(0, 18 * S, 97 * S); tom.name = "texto-tom"; tronco.add(tom);
  add(g, esfera, mat(0x0a1a2c, .5), P(CX, 950, 36), [112, 86, 84], "barriga");
  const bar = new T.Mesh(new T.PlaneGeometry(210 * S, 156 * S), decal(texBarriga)); bar.position.copy(P(CX, 950, 118)); bar.name = "barriga-listras"; g.add(bar);
  const pelve = new T.Mesh(new RoundedBoxGeometry(330 * S, 150 * S, 150 * S, 6, 56 * S), mat(0xc0cc3c)); pelve.position.copy(P(CX, 1082)); pelve.name = "pelve"; g.add(pelve);

  /* ---------- pernas e botas ---------- */
  [-1, 1].forEach(s => {
    const x = CX + s * 112;
    add(g, cilindro, M.azul, P(x, 1215), [46, 210, 46], "perna");
    add(g, esfera, M.bota, P(x, 1335), [84, 84, 84], "tornozelo");
    add(g, esfera, M.bota, P(x, 1492, 78), [120, 104, 205], "bota");
    add(g, new T.BoxGeometry(1, 1, 1), M.sola, P(x, 1592, 78), [214, 18, 392], "sola");
  });

  /* ---------- braços (pivô no ombro, para poder acenar) ---------- */
  const bracos = {};
  [-1, 1].forEach(s => {
    const ombro = new T.Group(); ombro.position.copy(P(CX + s * 218, 752)); g.add(ombro);
    add(ombro, esfera, M.azul, null, [62, 62, 62], "ombro");
    const sup = new T.Group(); sup.rotation.z = s * .20; ombro.add(sup);
    add(sup, new T.CapsuleGeometry(1, 1, 10, 20), M.azul, new T.Vector3(0, -70 * S, 0), [50, 118, 50], "braco");
    const cot = new T.Group(); cot.position.set(0, -142 * S, 0); cot.rotation.z = s * .10; sup.add(cot);
    add(cot, new T.CapsuleGeometry(1, 1, 10, 20), M.antebraco, new T.Vector3(0, -86 * S, 0), [84, 128, 78], "antebraco");
    const mao = new T.Group(); mao.position.set(0, -200 * S, 0); cot.add(mao);
    add(mao, esfera, M.preto, null, [68, 62, 56], "mao");
    [-1, -.35, .35, 1].forEach((f, i) => { const d = add(mao, new T.CapsuleGeometry(1, 1, 6, 12), i % 2 ? M.azulEsc : M.azul, new T.Vector3(f * 36 * S, -62 * S, 6 * S), [19, 40, 19], "dedo"); d.rotation.z = -f * .10; });
    bracos[s] = { ombro, sup, cot };
  });

  /* ---------- sombra de contato no chão ---------- */
  const sombra = new T.Mesh(new T.PlaneGeometry(1.5, 1.5), new T.MeshBasicMaterial({
    map: textura(128, 128, (c, w, h) => { const gr = c.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2); gr.addColorStop(0, "rgba(0,0,0,.45)"); gr.addColorStop(.6, "rgba(0,0,0,.18)"); gr.addColorStop(1, "rgba(0,0,0,0)"); c.fillStyle = gr; c.fillRect(0, 0, w, h); }),
    transparent: true, depthWrite: false }));
  sombra.rotation.x = -Math.PI / 2; sombra.position.y = .004; sombra.name = "sombra"; g.add(sombra);

  /* ---------- animação ---------- */
  const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
  let est = "parado", piscaEm = 2.5, piscando = 0, aceno = 0, boca_ = 0;
  const v = new T.Vector3();
  function update(t, dt, camPos, nivel){
    // respiração e leve balanço
    const resp = Math.sin(t * 1.6);
    tronco.scale.y = 1 + resp * .008; cabeca.position.y = P(CX, 470).y + resp * .004;
    // piscar
    piscaEm -= dt; if(piscaEm <= 0){ piscando = .14; piscaEm = 2.2 + Math.random() * 3.2; }
    if(piscando > 0) piscando -= dt;
    const fecha = piscando > 0 ? .08 : 1;
    olhos.forEach(o => { o.olho.scale.y = damp(o.olho.scale.y, fecha, 40, dt); });
    // olhar: íris seguem a câmera (a pessoa); no estado "pensando" olham para cima
    let alvoX = 0, alvoY = 0;
    if(camPos){ v.copy(camPos); g.worldToLocal(v); v.sub(cabeca.position); const l = Math.max(.01, v.length()); alvoX = Math.max(-1, Math.min(1, v.x / l * 2.2)); alvoY = Math.max(-1, Math.min(1, (v.y / l) * 2.2 + .15)); }
    if(est === "pensando"){ alvoX = .7; alvoY = .8; }
    olhos.forEach(o => { o.mov.position.x = damp(o.mov.position.x, alvoX * 26 * S, 8, dt); o.mov.position.y = damp(o.mov.position.y, alvoY * 22 * S, 8, dt); });
    // estados
    let inclina = 0, aceno_ = 0, cabNod = 0, alvoBoca = 0, brilho = .35;
    if(est === "ouvindo"){ inclina = .13; brilho = .55 + .4 * Math.sin(t * 6); }
    else if(est === "pensando"){ inclina = -.10; }
    else if(est === "falando"){
      cabNod = .035 * Math.sin(t * 3.1) + .02 * Math.sin(t * 7.3);
      alvoBoca = (typeof nivel === "number" && nivel >= 0) ? Math.min(1, .08 + nivel * 1.25)                         // segue o volume da voz
               : Math.max(0, .35 + .65 * Math.abs(Math.sin(t * 9.7) * Math.sin(t * 3.9 + 1) + .3 * Math.sin(t * 17)));
    }
    cabeca.rotation.z = damp(cabeca.rotation.z, inclina, 6, dt);
    cabeca.rotation.x = damp(cabeca.rotation.x, cabNod, 10, dt);
    boca_ = damp(boca_, alvoBoca, 22, dt); boca.scale.y = Math.max(.001, boca_ * 52 * S);
    olhos.forEach(o => { o.iris.material.emissiveIntensity = damp(o.iris.material.emissiveIntensity, brilho, 8, dt); });
    // braços: balanço suave; ao falar, o braço direito gesticula; acenar levanta o esquerdo
    const sway = Math.sin(t * 1.1) * .025;
    if(aceno > 0){ aceno -= dt; }
    const acena = aceno > 0 ? 1 : 0, ts = 2.4 - aceno;
    const L = bracos[-1], R = bracos[1];
    L.ombro.rotation.z = damp(L.ombro.rotation.z, acena ? -2.35 : sway, 7, dt);
    L.cot.rotation.z = acena ? -.10 + Math.sin(ts * 11) * .55 : damp(L.cot.rotation.z, -.10, 7, dt);
    const gest = est === "falando" ? (.55 + .35 * Math.sin(t * 2.3)) : 0;
    R.ombro.rotation.z = damp(R.ombro.rotation.z, est === "falando" ? .25 + gest * .35 : -sway, 5, dt);
    R.ombro.rotation.x = damp(R.ombro.rotation.x, est === "falando" ? -gest * .55 : 0, 5, dt);
    R.cot.rotation.z = damp(R.cot.rotation.z, est === "falando" ? .55 + Math.sin(t * 2.9) * .15 : .10, 5, dt);
  }
  return { obj: g, update, estado: e => { est = e; }, acenar: () => { aceno = 2.4; }, altura: 1.8, get estadoAtual(){ return est; } };
}
