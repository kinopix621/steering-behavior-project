let population;
let lifetime = 3600; // Condition d'arrêt de 60 sec
let recordTime = 0;

let nnTopology = null;

let genCountSpan;
let recordTimeSpan;
let recordFramesSpan;
let victoryMsg;

let inputsSelect, neuronsSlider, neuronsVal, actSelect;
let popSlider, popVal;
let mutationSlider, mutationVal;
let resetBtn;
let exportBtn, fileInput, duelBtn;

let loadedDNA = null;
let duelMode = false;
let duelMatch = null;
let video, handPose, hands = [];
let handY = 200;

let duelScoreAI = 0;
let duelScoreHuman = 0;
let duelState = 'WAITING';

function setup() {
  let canvas = createCanvas(800, 400);
  canvas.parent('canvas-container');

  genCountSpan = document.getElementById('gen-count');
  recordTimeSpan = document.getElementById('record-time');
  recordFramesSpan = document.getElementById('record-frames');
  victoryMsg = document.getElementById('victory-msg');
  
  inputsSelect = document.getElementById('inputs-select');
  neuronsSlider = document.getElementById('neurons-slider');
  neuronsVal = document.getElementById('neurons-val');
  actSelect = document.getElementById('activation-select');
  
  popSlider = document.getElementById('pop-slider');
  popVal = document.getElementById('pop-val');
  mutationSlider = document.getElementById('mutation-slider');
  mutationVal = document.getElementById('mutation-val');
  resetBtn = document.getElementById('reset-btn');

  neuronsSlider.oninput = () => neuronsVal.innerText = neuronsSlider.value;
  popSlider.oninput = () => popVal.innerText = popSlider.value;
  mutationSlider.oninput = () => mutationVal.innerText = mutationSlider.value;
  resetBtn.onclick = initSimulation;

  exportBtn = document.getElementById('export-btn');
  fileInput = document.getElementById('file-input');
  duelBtn = document.getElementById('duel-btn');
  
  exportBtn.onclick = exportModel;
  fileInput.addEventListener('change', importModel);
  duelBtn.onclick = toggleDuelMode;

  initSimulation();
}

function initSimulation() {
  duelMode = false;
  duelMatch = null;
  if (duelBtn) duelBtn.innerText = "Lancer le Mode Duel (Webcam)";
  recordTime = 0;
  victoryMsg.style.display = 'none';
  loop();

  let numInputs = parseInt(inputsSelect.value);
  let numHiddens = parseInt(neuronsSlider.value);
  let activationType = actSelect.value;
  
  nnTopology = {
    inputs: numInputs,
    hidden: numHiddens,
    activation: activationType
  };

  let popSize = parseInt(popSlider.value);
  let mutationRate = parseFloat(mutationSlider.value);
  
  population = new Population(popSize, nnTopology, mutationRate);
}

function draw() {
  background(30);

  stroke(255, 100);
  strokeWeight(2);
  line(width / 2, 0, width / 2, height);
  noStroke();

  if (duelMode && duelMatch) {
    // Apercu webcam en coin haut-gauche (miroir)
    if (video) {
      push();
      translate(164, 84);
      scale(-1, 1);
      image(video, -160, 0, 160, 80);
      pop();
      stroke(255, 80);
      noFill();
      rect(4, 4, 160, 80);
      noStroke();
    }

    // Contrôle main -> raquette droite
    if (hands.length > 0) {
      let y = hands[0].index_finger_tip.y;
      handY = map(y, 0, 240, 0, height);
      handY = constrain(handY, duelMatch.rightPaddle.h / 2, height - duelMatch.rightPaddle.h / 2);
    }
    duelMatch.rightPaddle.y = handY;

    if (duelState === 'PLAYING') {
      // IA controle sa raquette
      duelMatch.leftPaddle.predict(duelMatch.ball);

      // Deplacement balle + rebonds murs
      duelMatch.ball.update();

      let lp = duelMatch.leftPaddle;
      let rp = duelMatch.rightPaddle;
      let b  = duelMatch.ball;

      // Collision raquette gauche
      if (b.x - b.r < lp.x + lp.w / 2 &&
          b.y > lp.y - lp.h / 2 &&
          b.y < lp.y + lp.h / 2) {
        let diff = b.y - lp.y;
        let angle = map(diff, -lp.h / 2, lp.h / 2, -PI / 4, PI / 4);
        b.vx = b.speed * cos(angle);
        b.vy = b.speed * sin(angle);
        b.x = lp.x + lp.w / 2 + b.r;
      }

      // Collision raquette droite
      if (b.x + b.r > rp.x - rp.w / 2 &&
          b.y > rp.y - rp.h / 2 &&
          b.y < rp.y + rp.h / 2) {
        let diff = b.y - rp.y;
        let angle = map(diff, -rp.h / 2, rp.h / 2, -PI / 4, PI / 4);
        b.vx = -b.speed * cos(angle);
        b.vy = b.speed * sin(angle);
        b.x = rp.x - rp.w / 2 - b.r;
      }

      // Point marque
      if (b.x < 0) {
        duelScoreHuman++;
        duelState = 'WAITING';
      } else if (b.x > width) {
        duelScoreAI++;
        duelState = 'WAITING';
      }
    } else {
      // En attente : l'IA garde sa position, balle figee
      duelMatch.leftPaddle.predict(duelMatch.ball);
    }

    // Affichage raquettes et balle (toujours visible, independant de alive)
    stroke(255, 60);
    noFill();
    duelMatch.leftPaddle.show();
    duelMatch.rightPaddle.show();
    if (duelState === 'PLAYING') duelMatch.ball.show();

    // Scores
    noStroke();
    fill(255);
    textSize(48);
    textAlign(CENTER, CENTER);
    text(duelScoreAI, width / 4, 50);
    text(duelScoreHuman, 3 * width / 4, 50);
    textSize(14);
    fill(180);
    text("IA", width / 4, 95);
    text("Vous", 3 * width / 4, 95);

    if (duelState === 'WAITING') {
      fill(255, 220, 0);
      textSize(20);
      text("Appuyez sur ESPACE pour lancer la balle", width / 2, height / 2);
    }
    return;
  }

  if (!population) return;

  // Accélération x3 pour l'entraînement
  for (let s = 0; s < 3; s++) {
    let anyAlive = population.update();
    
    let currentMax = population.getBestTime();
    if (currentMax > recordTime) recordTime = currentMax;

    if (recordTime >= lifetime) {
      victoryMsg.style.display = 'block';
      population.show();
      noLoop(); 
      return;
    }

    if (!anyAlive) {
      population.evolve();
      break; 
    }
  }

  population.show();

  genCountSpan.innerText = population.generation;
  recordTimeSpan.innerText = (recordTime / 60).toFixed(1);
  recordFramesSpan.innerText = recordTime;
}

function getBestDNA() {
  if (!population) return null;
  let paddles = [];
  for (let m of population.matches) {
    paddles.push(m.leftPaddle);
    paddles.push(m.rightPaddle);
  }
  let best = paddles[0];
  for (let p of paddles) {
    if (p.fitness > best.fitness) best = p;
  }
  return best.dna;
}

function exportModel() {
  let dna = loadedDNA || getBestDNA();
  if (dna) {
    saveJSON(dna.genes, 'best_pong_model.json');
  } else {
    alert("Aucun modèle entraîné à exporter !");
  }
}

function importModel(event) {
  let file = event.target.files[0];
  if (!file) return;
  let reader = new FileReader();
  reader.onload = function(e) {
    let genes = JSON.parse(e.target.result);
    loadedDNA = new DNA(genes);
    alert("Modèle importé avec succès ! Vous pouvez lancer le Mode Duel.");
  };
  reader.readAsText(file);
}

function toggleDuelMode() {
  duelMode = !duelMode;
  if (duelMode) {
    duelBtn.innerText = "Arrêter le Mode Duel";
    victoryMsg.style.display = 'block';
    victoryMsg.innerText = "MODE DUEL - Chargement caméra...";
    
    nnTopology = {
      inputs: parseInt(inputsSelect.value),
      hidden: parseInt(neuronsSlider.value),
      activation: actSelect.value
    };
    
    let dnaToUse = loadedDNA || getBestDNA();
    if (!dnaToUse) dnaToUse = new DNA();
    
    duelMatch = new Match(nnTopology, dnaToUse, null);
    duelMatch.rightPaddle.isHuman = true; // Droite = Humain
    
    duelScoreAI = 0;
    duelScoreHuman = 0;
    duelState = 'WAITING';
    
    if (!video) {
      video = createCapture(VIDEO);
      video.size(320, 240);
      video.hide();
      handPose = ml5.handPose(video, () => {
        victoryMsg.innerText = "MODE DUEL - Bougez votre main (index) !";
        handPose.detectStart(video, results => {
          hands = results;
        });
      });
    } else {
        victoryMsg.innerText = "MODE DUEL - Bougez votre main (index) !";
    }
    loop();
  } else {
    duelBtn.innerText = "Lancer le Mode Duel (Webcam)";
    duelBtn.innerText = "Lancer le Mode Duel (Webcam)";
    initSimulation();
  }
}

function keyPressed() {
  if (duelMode && duelState === 'WAITING' && key === ' ') {
    duelMatch.ball.reset();
    // La balle doit aller 2x plus vite en duel car l'entraînement
    // tourne à 3x la vitesse (for s < 3). On recalcule vx/vy.
    duelMatch.ball.speed = 12;
    duelMatch.ball.vx *= 2;
    duelMatch.ball.vy *= 2;
    duelState = 'PLAYING';
  }
}
