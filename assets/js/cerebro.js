/* =====================================================================
   cerebro.js — acha, no banco de conhecimento, a resposta mais parecida
   com o que a pessoa disse. Funciona sem internet e sem chave de IA.

   Como funciona:
   1. normaliza o texto (minúsculas, sem acentos, "a três p" vira "a3p");
   2. tira palavras vazias ("o", "que", "como"...) e reduz cada palavra ao radical;
   3. compara com cada jeito de perguntar cadastrado, dando mais peso a
      palavras raras (IDF), e com o texto geral de cada resposta;
   4. corrige erros leves de reconhecimento de voz (uma letra trocada);
   5. se a nota ficar baixa, devolve "não entendi" em vez de chutar.
   ===================================================================== */
const PARADAS = new Set(("a o os as um uma uns umas de do da dos das em no na nos nas num numa por para pra com sem sobre que qual quais quando onde quem como e ou ao aos " +
  "se me te seu sua seus suas meu minha isso isto essa esse esta este eu vc tu ele ela quer queria gostaria quero saber falar fale fala diga dizer " +
  "explique explica explicar conte conta contar tom favor ser eh sao foi era ter tem tinha ha mais muito pouco ja so tambem mesmo entao aqui ali la porque pq vai vou ir fazer faz fazem feito quanto quantos quantas um dois tres quatro cinco seis sete oito nove dez indica indique recomenda recomende melhor pior").split(" "));

export function normalizar(t){
  let s = String(t).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  s = s.replace(/\b(?:voce |vc )?(?:pode|poderia|podia|consegue) (?:me )?(?:explicar|falar|dizer|contar|ensinar|responder|ajudar)\b/g, " ");
  s = s.replace(/\ba\s*(?:3|tres)\s*(?:p|pe|pes)\b/g, "a3p").replace(/\ba3\s+p\b/g, "a3p").replace(/\bat?res\s*p\b/g, "a3p");
  s = s.replace(/\b(?:5|cinco)\s*(?:r|rs|erre|erres)\b/g, "cincors").replace(/\b5r\b/g, "cincors");
  s = s.replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  return s;
}
const SINONIMOS = { lixo: "residuo", lixos: "residuos", lixeira: "lixeira", luz: "energia", eletricidade: "energia", carro: "veiculo", carros: "veiculos", gastar: "consumo", gasto: "consumo",
  consumir: "consumo", economia: "economizar", poupar: "economizar", guardar: "economizar", jogar: "descartar", descarte: "descartar", botar: "descartar", colocar: "descartar", apagar: "energia" };

function radical(w){
  if(w.length <= 3) return w;
  for(const suf of ["amentos", "amento", "imentos", "imento", "acoes", "acao", "ucoes", "ucao", "idades", "idade", "mente", "ismos", "ismo", "istas", "ista", "aveis", "avel", "iveis", "ivel",
                    "adoras", "adora", "adores", "ador", "ando", "endo", "indo", "ados", "adas", "ado", "ada", "idos", "idas", "ido", "ida", "oes", "ais", "eis", "ar", "er", "ir", "as", "es", "os", "s", "a", "o", "e"]){
    if(w.endsWith(suf) && w.length - suf.length >= 3) return w.slice(0, -suf.length);
  }
  return w;
}
function tokens(texto){
  const todas = normalizar(texto).split(" ").filter(Boolean);
  let uteis = todas.filter(w => !PARADAS.has(w));
  if(!uteis.length) uteis = todas.filter(w => w.length >= 3);                  // ex.: "quem é você"
  return uteis.map(w => radical(SINONIMOS[w] || w));
}
function distancia1(a, b){                                   // a e b diferem em no máximo 1 letra (troca, falta ou sobra)
  if(Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, erros = 0;
  while(i < a.length && j < b.length){
    if(a[i] === b[j]){ i++; j++; continue; }
    if(++erros > 1) return false;
    if(a.length > b.length) i++; else if(a.length < b.length) j++; else { i++; j++; }
  }
  return erros + (a.length - i) + (b.length - j) <= 1;
}

export function criarCerebro(base, { limiar = 0.43 } = {}){
  const docs = base.map(e => {
    const gat = [e.titulo, ...(e.gatilhos || [])].map(g => new Set(tokens(g)));
    const geral = new Map();
    const soma = (txt, peso) => tokens(txt).forEach(t => geral.set(t, (geral.get(t) || 0) + peso));
    gat.forEach(g => g.forEach(t => geral.set(t, (geral.get(t) || 0) + 3)));
    soma(e.resposta, 1);
    return { e, gat, geral };
  });
  const N = docs.length, df = new Map(), vocab = new Set();
  docs.forEach(d => { new Set([...d.geral.keys()]).forEach(t => { df.set(t, (df.get(t) || 0) + 1); vocab.add(t); }); });
  const idf = t => Math.log(1 + N / (1 + (df.get(t) || 0)));
  const vocabLonga = [...vocab].filter(t => t.length >= 4);

  function consulta(texto){
    return tokens(texto).map(t => {
      if(vocab.has(t) || t.length < 4) return t;
      const parecido = vocabLonga.find(v => distancia1(t, v));                      // corrige erro leve de digitação ou de voz
      return parecido || t;
    });
  }

  function pontuar(q){
    const Q = new Set(q);
    if(!Q.size) return [];
    const somaQ = [...Q].reduce((s, t) => s + idf(t), 0);
    return docs.map(d => {
      let melhor = 0;
      for(const g of d.gat){
        if(!g.size) continue;
        let comum = 0, somaG = 0;
        g.forEach(t => { const w = idf(t); somaG += w; if(Q.has(t)) comum += w; });
        const s = 0.7 * (comum / somaQ) + 0.3 * (comum / somaG);
        if(s > melhor) melhor = s;
      }
      // cobertura do texto geral (gatilhos + resposta)
      let cob = 0; Q.forEach(t => { if(d.geral.has(t)) cob += idf(t); });
      const geral = cob / somaQ;
      return { e: d.e, nota: 0.72 * melhor + 0.28 * geral };
    }).sort((a, b) => b.nota - a.nota);
  }

  return {
    perguntar(texto){
      const q = consulta(texto);
      if(!q.length) return { entrada: null, nota: 0, alternativas: [] };
      const r = pontuar(q), topo = r[0];
      const ok = topo && topo.nota >= limiar;
      return { entrada: ok ? topo.e : null, nota: topo ? topo.nota : 0, alternativas: r.slice(0, 4).map(x => x.e) };
    },
    porId: id => base.find(e => e.id === id) || null,
    tokens, normalizar
  };
}
