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
    if (hands.length > 0) {
      let y = hands[0].index_finger_tip.y;
      handY = map(y, 0, 240, 0, height);
    }
    
    duelMatch.rightPaddle.y = handY;
    duelMatch.update();
    duelMatch.show();
    
    if (duelMatch.ball.isOut()) {
      duelMatch.ball.reset();
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
    initSimulation();
  }
}
