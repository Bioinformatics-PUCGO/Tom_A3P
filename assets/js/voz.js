/* =====================================================================
   voz.js — a voz do Tom

   modo "robo"     voz masculina e robótica: sintetizador eSpeak (em assets/voz/) +
                   efeito de robô feito com Web Audio. Soa igual em qualquer celular,
                   sem depender das vozes instaladas no aparelho.
   modo "natural"  voz do navegador (preferindo uma voz masculina em português, grave).
   Se o modo robô não carregar, cai sozinho para o natural.

   AJUSTES (valores abaixo): para a voz mais grave, diminua VOZ.pitch; para mais
   devagar, diminua VOZ.speed; para menos "metálica", diminua EFEITO.anelMix e combFb.

   voz.preparar(texto) → { duracao, tocar() }   (gera o áudio antes de mostrar o balão)
   voz.nivel()         → 0..1 (volume atual, usado para mexer a boca do Tom)
   voz.parar()         interrompe a fala
   ===================================================================== */
export const VOZ = { voice: "pt", variant: "m3", pitch: 40, speed: 172, amplitude: 100, wordgap: 1 };         // eSpeak: ~90 Hz (voz grave masculina)
export const EFEITO = { anelHz: 52, anelMix: .30, seco: .80, combMs: 7, combFb: .30, graveDb: 3.5, mediosDb: 3, tampaHz: 6200, ganho: 1.5 };
const MASCULINAS = /felipe|daniel|antonio|antônio|ricardo|jorge|marcos|paulo|male|masculin|\bluis\b|thiago/i;

function carregarScript(url){
  return new Promise((ok, erro) => { const s = document.createElement("script"); s.src = url; s.onload = ok; s.onerror = () => erro(new Error("não carregou " + url)); document.head.appendChild(s); });
}
const dividir = t => (t.match(/[^.!?]+[.!?]*/g) || [t]).map(s => s.trim()).filter(Boolean);

export function criarVoz({ base = "assets/voz/", modo = "robo", pronuncia = t => t } = {}){
  let ctx = null, cadeia = null, motor = null, carregando = null, tocando = [], temporizador = null, fimAtual = null, ultimoBuffer = null, falhou = false;
  const estado = { modo, motorPronto: false, ultimoTexto: "", ultimaDuracao: 0 };

  /* ---------- áudio: contexto e cadeia de efeitos ---------- */
  function contexto(){
    if(!ctx){
      const AC = window.AudioContext || window.webkitAudioContext; if(!AC) throw new Error("sem Web Audio");
      ctx = new AC(); cadeia = montarCadeia(ctx);
    }
    if(ctx.state === "suspended") ctx.resume().catch(() => {});
    return ctx;
  }
  function montarCadeia(c){
    const entrada = c.createGain(), soma = c.createGain(), seco = c.createGain(), molhado = c.createGain(), anel = c.createGain();
    seco.gain.value = EFEITO.seco; molhado.gain.value = EFEITO.anelMix; anel.gain.value = 0;
    const osc = c.createOscillator(); osc.type = "sine"; osc.frequency.value = EFEITO.anelHz; osc.connect(anel.gain); osc.start();       // modulação em anel: som metálico
    entrada.connect(seco); seco.connect(soma);
    entrada.connect(anel); anel.connect(molhado); molhado.connect(soma);
    const atraso = c.createDelay(.05); atraso.delayTime.value = EFEITO.combMs / 1000; const fb = c.createGain(); fb.gain.value = EFEITO.combFb;   // ressonância de "tubo"
    soma.connect(atraso); atraso.connect(fb); fb.connect(atraso);
    const mestre = c.createGain(); soma.connect(mestre); atraso.connect(mestre);
    const grave = c.createBiquadFilter(); grave.type = "lowshelf"; grave.frequency.value = 180; grave.gain.value = EFEITO.graveDb;
    const medios = c.createBiquadFilter(); medios.type = "peaking"; medios.frequency.value = 1400; medios.Q.value = 1; medios.gain.value = EFEITO.mediosDb;
    const tampa = c.createBiquadFilter(); tampa.type = "lowpass"; tampa.frequency.value = EFEITO.tampaHz;
    const comp = c.createDynamicsCompressor(); const saida = c.createGain(); saida.gain.value = EFEITO.ganho;
    const analisador = c.createAnalyser(); analisador.fftSize = 512;
    mestre.connect(grave); grave.connect(medios); medios.connect(tampa); tampa.connect(comp); comp.connect(saida); saida.connect(analisador); analisador.connect(c.destination);
    return { entrada, analisador, dados: new Uint8Array(analisador.fftSize) };
  }

  /* ---------- sintetizador eSpeak (carrega só na primeira fala) ---------- */
  function preparar_motor(){
    if(carregando) return carregando;
    carregando = (async () => {
      await carregarScript(base + "mespeak.bundle.js");
      const [cfg, voz] = await Promise.all([fetch(base + "mespeak_config.json").then(r => r.json()), fetch(base + "pt.json").then(r => r.json())]);
      window.meSpeak.loadConfig(cfg); window.meSpeak.loadVoice(voz); motor = window.meSpeak; estado.motorPronto = true;
    })().catch(e => { falhou = true; console.warn("Voz robô indisponível, usando a voz do navegador:", e); throw e; });
    return carregando;
  }
  const decodificar = (c, bruto) => new Promise((ok, erro) => { const p = c.decodeAudioData(bruto, ok, erro); if(p && p.catch) p.catch(erro); });

  async function prepararRobo(texto){
    await preparar_motor(); const c = contexto();
    const partes = dividir(pronuncia(texto)), buffers = [];
    for(const frase of partes){
      const bruto = motor.speak(frase, Object.assign({ rawdata: "ArrayBuffer" }, VOZ));
      if(!bruto) continue; buffers.push(await decodificar(c, bruto.slice(0)));
    }
    if(!buffers.length) throw new Error("sem áudio");
    const pausa = .16, duracao = buffers.reduce((s, b) => s + b.duration, 0) + pausa * (buffers.length - 1);
    ultimoBuffer = buffers[0];
    return { duracao, tocar: () => tocarBuffers(c, buffers, pausa, duracao) };
  }
  function tocarBuffers(c, buffers, pausa, duracao){
    return new Promise(resolve => {
      pararTudo(); fimAtual = resolve;
      let t = c.currentTime + .08;
      buffers.forEach(b => { const s = c.createBufferSource(); s.buffer = b; s.connect(cadeia.entrada); s.start(t); tocando.push(s); t += b.duration + pausa; });
      const terminar = () => { if(fimAtual === resolve){ fimAtual = null; clearTimeout(temporizador); resolve(true); } };
      tocando[tocando.length - 1].onended = terminar;
      temporizador = setTimeout(terminar, (duracao + .6) * 1000);                           // reserva: se o relógio de áudio não andar
    });
  }

  /* ---------- reserva: voz do navegador ---------- */
  function escolherVoz(){
    const todas = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
    const pt = todas.filter(v => /^pt([-_]|$)/i.test(v.lang)), br = pt.filter(v => /BR/i.test(v.lang)), lista = br.length ? br : pt;
    return lista.find(v => MASCULINAS.test(v.name)) || lista.find(v => /google|microsoft/i.test(v.name)) || lista[0] || null;
  }
  async function prepararNatural(texto){
    const sint = window.speechSynthesis;
    const estimativa = Math.max(1.5, texto.length / 14);
    return { duracao: estimativa, tocar: () => new Promise(resolve => {
      if(!sint || typeof SpeechSynthesisUtterance === "undefined"){ setTimeout(() => resolve(false), estimativa * 1000); return; }
      pararTudo(); fimAtual = resolve; const partes = dividir(pronuncia(texto)), v = escolherVoz(); let i = 0;
      const fim = ok => { if(fimAtual === resolve){ fimAtual = null; resolve(ok); } };
      const proxima = () => { if(i >= partes.length){ fim(true); return; } const u = new SpeechSynthesisUtterance(partes[i++]); u.lang = "pt-BR"; u.rate = .95; u.pitch = .62; if(v) u.voice = v; u.onend = proxima; u.onerror = () => fim(false); sint.speak(u); };
      proxima();
    }) };
  }

  function pararTudo(){
    clearTimeout(temporizador);
    tocando.forEach(s => { try{ s.onended = null; s.stop(); }catch(e){} }); tocando = [];
    try{ window.speechSynthesis && window.speechSynthesis.cancel(); }catch(e){}
    if(fimAtual){ const f = fimAtual; fimAtual = null; f(false); }
  }

  return {
    estado,
    get modo(){ return estado.modo; },
    mudarModo(m){ estado.modo = m; pararTudo(); return m; },
    /* chame dentro de um toque do usuário (iPhone exige) */
    desbloquear(){ try{ contexto(); if(estado.modo === "robo") preparar_motor().catch(() => {}); if(window.speechSynthesis && typeof SpeechSynthesisUtterance !== "undefined"){ const u = new SpeechSynthesisUtterance(" "); u.volume = 0; window.speechSynthesis.speak(u); } }catch(e){} },
    async preparar(texto){
      estado.ultimoTexto = texto;
      let r;
      if(estado.modo === "robo" && !falhou){ try{ r = await prepararRobo(texto); r.motor = "robo"; }catch(e){ falhou = true; estado.modo = "natural"; } }
      if(!r){ r = await prepararNatural(texto); r.motor = "natural"; }
      estado.ultimaDuracao = r.duracao; return r;
    },
    nivel(){
      if(!cadeia || !tocando.length) return -1;
      cadeia.analisador.getByteTimeDomainData(cadeia.dados); let m = 0;
      for(let i = 0; i < cadeia.dados.length; i++){ const v = Math.abs(cadeia.dados[i] - 128) / 128; if(v > m) m = v; }
      return Math.min(1, m * 1.6);
    },
    parar: pararTudo,
    get ultimoBuffer(){ return ultimoBuffer; }
  };
}
