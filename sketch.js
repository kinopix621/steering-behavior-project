let population;
let lifetime = 1800; // 30 sec à 60FPS
let recordTime = 0;

let genCountSpan;
let recordTimeSpan;
let recordFramesSpan;
let victoryMsg;
let popSlider, popVal;
let mutationSlider, mutationVal;
let resetBtn;

function setup() {
  let canvas = createCanvas(800, 400);
  canvas.parent('canvas-container');

  genCountSpan = document.getElementById('gen-count');
  recordTimeSpan = document.getElementById('record-time');
  recordFramesSpan = document.getElementById('record-frames');
  victoryMsg = document.getElementById('victory-msg');
  
  popSlider = document.getElementById('pop-slider');
  popVal = document.getElementById('pop-val');
  mutationSlider = document.getElementById('mutation-slider');
  mutationVal = document.getElementById('mutation-val');
  resetBtn = document.getElementById('reset-btn');

  popSlider.oninput = () => popVal.innerText = popSlider.value;
  mutationSlider.oninput = () => mutationVal.innerText = mutationSlider.value;
  resetBtn.onclick = initSimulation;

  initSimulation();
}

function initSimulation() {
  recordTime = 0;
  victoryMsg.style.display = 'none';

  let popSize = parseInt(popSlider.value);
  let mutationRate = parseFloat(mutationSlider.value);
  
  population = new Population(popSize, mutationRate);
}

function draw() {
  background(30);

  stroke(255, 100);
  strokeWeight(2);
  line(width / 2, 0, width / 2, height);
  noStroke();

  if (!population) return;

  // Accélération de la simulation avec une boucle for, ex factor = 3
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

  // Affichage (3 fois plus rapide pour nous)
  population.show();

  genCountSpan.innerText = population.generation;
  recordTimeSpan.innerText = (recordTime / 60).toFixed(1);
  recordFramesSpan.innerText = recordTime;
}
