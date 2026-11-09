# Converse com o Tom — Agenda A3P em realidade aumentada e voz

O aluno lê o QR Code, permite **câmera** e **microfone**, vê o **Tom em tamanho real (1,80 m)** no chão à sua frente e conversa por voz. O Tom responde **falando** e mostra **legendas**. O conteúdo vem da *Cartilha da Agenda Ambiental na Administração Pública (A3P), 5ª edição, Ministério do Meio Ambiente (2009)*.

## 1. Publicar no GitHub

Suba a pasta **`Tom_A3P` inteira** para a raiz do repositório (ao lado de `molecula`, `Quiz_CEGGen` etc.) e ative o GitHub Pages. O endereço previsto é:

```
https://bioinformatics-pucgo.github.io/Tom_A3P/
```

A câmera e o microfone só funcionam em **HTTPS**, que o GitHub Pages já oferece. Se usar outro nome de pasta, abra o endereço publicado com `?cartaz` no final: ele gera o cartaz com o QR Code certo.

## 2. Cartaz com QR Code

`…/Tom_A3P/?cartaz` e clique em **Imprimir cartaz (A4)**. Já estão prontos: `cartaz-tom-a3p.pdf` e `qrcode-tom-a3p.png/.svg` (para o endereço acima).

## 3. Como o Tom responde

O Tom **não é uma IA solta**: ele procura, em `assets/js/conhecimento.js`, a pergunta mais parecida com o que foi dito e fala a resposta que está ali (70 respostas escritas a partir da cartilha, cada uma com a página de origem). Se a pergunta não tem nada a ver com a A3P, ele diz que não encontrou na cartilha e sugere perguntas. Isso evita respostas inventadas e não precisa de chave de API.

**Para acrescentar ou corrigir uma resposta**, edite `assets/js/conhecimento.js` copiando um bloco existente:

```js
{ id:"novo_assunto", titulo:"Pergunta que aparece no botão?",
  gatilhos:["jeito 1 de perguntar","jeito 2","palavras-chave"],
  resposta:"Texto curto, de 2 a 4 frases, que o Tom fala.",
  mais:"(opcional) complemento para 'me conte mais'",
  fonte:"Cartilha A3P, p. XX", rel:["oque","eixos"] },
```

Quanto mais **gatilhos** (jeitos diferentes de perguntar), melhor ele entende. O buscador ignora acentos e palavras como "o", "que", "como", corrige erros leves de reconhecimento de voz e entende "a três pê" como "A3P".

## 4. Atenção ao conteúdo

- A cartilha é de **2009** e traz **cinco eixos** temáticos (edições mais novas podem ter mais). O Tom sempre diz "segundo a cartilha".
- Algumas normas citadas mudaram desde então (por exemplo, a Política Nacional de Resíduos Sólidos aparece como projeto de lei). Revise as respostas de `marco_legal`, `eixo_licitacao`, `instrucao_normativa` e `coleta_solidaria` se for usar em aula formal.

## 5. Privacidade

A câmera só mostra o fundo; nada é gravado ou enviado por nós. O **reconhecimento de voz é feito pelo navegador** (Chrome usa servidores do Google; Safari, da Apple), que pode enviar o áudio para transcrever. A tela inicial já avisa isso.

## 6. Como a realidade aumentada funciona (e seus limites)

É câmera + 3D + giroscópio, **sem rastreamento de posição**: o Tom fica fixo no espaço enquanto o aluno **gira** o celular. Funciona em iPhone e Android, mas:

- **Fique no mesmo lugar**; andar pela sala não aproxima nem afasta o Tom de verdade.
- O tamanho de 1,80 m depende de o celular estar a cerca de 1,40 m do chão (altura do peito). Ao tocar no chão, o Tom é colocado onde o aluno apontou, com essa estimativa.
- Tocar no chão posiciona o Tom; **Recolocar** (ícone de mira) o traz de volta à frente.
- Escolhi este modo (e não o "AR de mesa" do iPhone/Android) porque nele a página continua ativa: dá para usar o microfone, a voz e as legendas ao mesmo tempo.

## 7. Teste antes do evento

- Teste em **pelo menos um iPhone e um Android**, no local, com a internet que será usada.
- iPhone: o giroscópio, a câmera e o microfone pedem permissão separadamente; aceite as três.
- Se o link abrir dentro do WhatsApp ou Instagram, toque em "Abrir no navegador".
- Sem reconhecimento de voz (Firefox, microfone bloqueado), a página abre o **campo de texto**, e os botões de sugestão funcionam sempre.

## Estrutura

```
index.html                  página (AR, voz, legendas, cartaz)
assets/js/conhecimento.js   perguntas e respostas (edite aqui)
assets/js/cerebro.js        busca da resposta mais parecida
assets/js/tom.js            modelo 3D e animações do Tom
assets/js/qrcode.min.js     gerador de QR Code (MIT)
assets/tom.png, logo-*.png  imagens
```

Créditos: `three.js` (MIT), `qrcode-generator` (MIT). Desenvolvido pela equipe de Bioinformática do CEGGen em parceria com a equipe do GenIA.
