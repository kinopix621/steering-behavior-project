import {
  normalizeNnTopology,
  expectedGeneCount,
  buildNnTopologyFromUi,
  applyNnTopologyToUi,
  getActiveGameConfig,
  getCurriculumConfigForPhase,
  getCircuitConfigForExport,
  updateCurriculumUi,
  parsePresetPayload,
  getBestDNA,
  updateTournamentCircuitHint,
  renderTournamentList,
  renderTournamentResults,
  parseTournamentBrainEntry,
  runTournamentSimulation
} from './functions.js';
import { cloneGameConfig, normalizeImportedGameConfig, gameConfigsEqual, getBuiltinPreset } from './gameConfig.js';

const gameConfigApi = { cloneGameConfig, getBuiltinPreset };

let population;
let recordTime = 0;

let nnTopology = null;
let currentGameConfig = null;

let genCountSpan;
let recordTimeSpan;
let recordFramesSpan;
let victoryMsg;

let inputsSelect, neuronsSlider, neuronsVal, hiddenLayersSlider, hiddenLayersVal, actSelect;
let popSlider, popVal;
let mutationSlider, mutationVal;
let resetBtn;
let exportBtn, exportBundleBtn, fileInput, duelBtn;

let presetSelect;
let presetFileInput;

let popStopEnabled;
let popStopThreshold;
let popStopThresholdVal;
let popStopProportion;
let popStopPropVal;

let curriculumAutoCheckbox;
let curriculumSelectA;
let curriculumSelectB;
let curriculumPhaseLabel;
/** 'A' = circuit départ, 'B' = circuit cible (neuroévo continue avec les mêmes ADN). */
let curriculumPhase = 'A';

/** Circuit importé ; utilisé quand le preset « Personnalisé » est choisi. */
let customGameConfig = null;

let loadedDNA = null;
let duelMode = false;
let duelMatch = null;
let video, handPose, hands = [];
let handY = 200;

let duelScoreAI = 0;
let duelScoreHuman = 0;
let duelState = 'WAITING';

/** { name, genes, nnTopology } — nnTopology null = utiliser l’UI courante au lancement. */
let tournamentEntries = [];

let obstaclePlaceCheckbox;
let clearObstaclesBtn;
let hybridNnSlider;
let hybridNnVal;

/** Si true, le prochain initSimulation ne reprend pas les obstacles du circuit précédent. */
window.__skipObsPreserve = false;

function nnUiRefs() {
  return {
    inputsSelect,
    hiddenLayersSlider,
    neuronsSlider,
    neuronsVal,
    hiddenLayersVal,
    actSelect,
    hybridNnSlider,
    hybridNnVal
  };
}

function curriculumUiRefs() {
  return {
    curriculumAutoCheckbox,
    presetSelect,
    curriculumPhaseLabel,
    curriculumPhase,
    curriculumSelectA,
    curriculumSelectB
  };
}

function handleBrainImport(parsed) {
  let genes = null;
  let embeddedConfig = null;
  let embeddedTopo = null;

  if (Array.isArray(parsed)) {
    genes = parsed;
    alert('Ancien format (tableau de gènes uniquement). Circuit d\'entraînement inconnu — gardez le preset actuel pour le duel.');
    loadedDNA = new DNA(genes);
    return;
  }

  if (
    parsed &&
    (parsed.kind === 'pong_neuro_brain' || parsed.kind === 'pong_neuro_bundle') &&
    Array.isArray(parsed.genes)
  ) {
    genes = parsed.genes;
    embeddedConfig = parsed.gameConfig ? normalizeImportedGameConfig(parsed.gameConfig) : null;
    embeddedTopo = parsed.nnTopology || null;
  } else if (parsed && Array.isArray(parsed.genes)) {
    genes = parsed.genes;
    embeddedConfig = parsed.gameConfig ? normalizeImportedGameConfig(parsed.gameConfig) : null;
    embeddedTopo = parsed.nnTopology || null;
  } else {
    alert('Fichier cerveau non reconnu (attendu : gènes ou enveloppe avec "genes").');
    return;
  }

  if (embeddedTopo) {
    let tpre = normalizeNnTopology(embeddedTopo);
    if (tpre === null) {
      alert(
        'Topologie invalide : couches cachées de tailles différentes (non supporté par les curseurs).'
      );
      return;
    }
    applyNnTopologyToUi(embeddedTopo, nnUiRefs());
  }

  let topoCheck = normalizeNnTopology(embeddedTopo || buildNnTopologyFromUi(nnUiRefs()));
  if (genes.length !== expectedGeneCount(topoCheck)) {
    alert(
      'Nombre de gènes incompatible avec la topologie (' +
        genes.length +
        ' vs ' +
        expectedGeneCount(topoCheck) +
        ' attendus). Vérifiez le fichier ou les curseurs.'
    );
    return;
  }

  if (embeddedConfig) {
    if (
      !gameConfigsEqual(
        embeddedConfig,
        getCircuitConfigForExport(currentGameConfig, presetSelect.value, customGameConfig, gameConfigApi)
      )
    ) {
      if (confirm('Ce cerveau a été enregistré avec un autre circuit. Appliquer le circuit embarqué ?')) {
        customGameConfig = cloneGameConfig(embeddedConfig);
        presetSelect.value = 'custom';
        window.__skipObsPreserve = true;
      }
    }
  }

  loadedDNA = new DNA(genes);
  initSimulation();
}

function setup() {
  let canvas = createCanvas(800, 400);
  canvas.parent('canvas-container');

  genCountSpan = document.getElementById('gen-count');
  recordTimeSpan = document.getElementById('record-time');
  recordFramesSpan = document.getElementById('record-frames');
  victoryMsg = document.getElementById('victory-msg');

  presetSelect = document.getElementById('preset-select');
  presetSelect.onchange = initSimulation;

  document.getElementById('export-preset-btn').onclick = exportPresetFile;
  document.getElementById('import-preset-btn').onclick = () =>
    document.getElementById('preset-file-input').click();
  presetFileInput = document.getElementById('preset-file-input');
  presetFileInput.addEventListener('change', importPresetFile);

  inputsSelect = document.getElementById('inputs-select');
  hiddenLayersSlider = document.getElementById('hidden-layers-slider');
  hiddenLayersVal = document.getElementById('hidden-layers-val');
  neuronsSlider = document.getElementById('neurons-slider');
  neuronsVal = document.getElementById('neurons-val');
  actSelect = document.getElementById('activation-select');

  hiddenLayersSlider.oninput = () =>
    (hiddenLayersVal.innerText = hiddenLayersSlider.value);
  hiddenLayersVal.innerText = hiddenLayersSlider.value;

  inputsSelect.onchange = initSimulation;
  actSelect.onchange = initSimulation;
  neuronsSlider.addEventListener('change', initSimulation);
  hiddenLayersSlider.addEventListener('change', initSimulation);

  popSlider = document.getElementById('pop-slider');
  popVal = document.getElementById('pop-val');
  mutationSlider = document.getElementById('mutation-slider');
  mutationVal = document.getElementById('mutation-val');
  resetBtn = document.getElementById('reset-btn');

  neuronsSlider.oninput = () => (neuronsVal.innerText = neuronsSlider.value);
  popSlider.oninput = () => (popVal.innerText = popSlider.value);
  mutationSlider.oninput = () => (mutationVal.innerText = mutationSlider.value);
  resetBtn.onclick = initSimulation;

  popStopEnabled = document.getElementById('pop-stop-enabled');
  popStopThreshold = document.getElementById('pop-stop-threshold');
  popStopThresholdVal = document.getElementById('pop-stop-threshold-val');
  popStopProportion = document.getElementById('pop-stop-proportion');
  popStopPropVal = document.getElementById('pop-stop-prop-val');
  popStopThreshold.oninput = () =>
    (popStopThresholdVal.innerText = popStopThreshold.value);
  popStopProportion.oninput = () =>
    (popStopPropVal.innerText = parseFloat(popStopProportion.value).toFixed(2));

  exportBtn = document.getElementById('export-btn');
  exportBundleBtn = document.getElementById('export-bundle-btn');
  fileInput = document.getElementById('file-input');
  duelBtn = document.getElementById('duel-btn');

  exportBtn.onclick = exportModel;
  exportBundleBtn.onclick = exportBundleFile;
  fileInput.addEventListener('change', importModel);
  duelBtn.onclick = toggleDuelMode;

  curriculumAutoCheckbox = document.getElementById('curriculum-auto');
  curriculumSelectA = document.getElementById('curriculum-select-a');
  curriculumSelectB = document.getElementById('curriculum-select-b');
  curriculumPhaseLabel = document.getElementById('curriculum-phase-label');
  curriculumAutoCheckbox.onchange = initSimulation;
  curriculumSelectA.onchange = initSimulation;
  curriculumSelectB.onchange = initSimulation;

  obstaclePlaceCheckbox = document.getElementById('obstacle-place-check');
  clearObstaclesBtn = document.getElementById('clear-obstacles-btn');
  hybridNnSlider = document.getElementById('hybrid-nn-slider');
  hybridNnVal = document.getElementById('hybrid-nn-val');
  if (hybridNnSlider) {
    if (hybridNnVal) hybridNnVal.innerText = parseFloat(hybridNnSlider.value).toFixed(2);
    hybridNnSlider.oninput = function () {
      if (hybridNnVal) hybridNnVal.innerText = parseFloat(hybridNnSlider.value).toFixed(2);
    };
    hybridNnSlider.addEventListener('change', initSimulation);
  }
  if (clearObstaclesBtn) {
    clearObstaclesBtn.onclick = clearAllObstacles;
  }

  document.getElementById('tournament-add-btn').onclick = () =>
    document.getElementById('tournament-file-input').click();
  document.getElementById('tournament-file-input').addEventListener('change', onTournamentFilesSelected);
  document.getElementById('tournament-clear-btn').onclick = clearTournamentList;
  document.getElementById('tournament-run-btn').onclick = runTournamentClick;

  initSimulation();
}

function initSimulation() {
  let obsCopy = [];
  if (!window.__skipObsPreserve && currentGameConfig && currentGameConfig.obstacles) {
    obsCopy = currentGameConfig.obstacles.map(function (o) {
      return { x: o.x, y: o.y, w: o.w, h: o.h };
    });
  }
  window.__skipObsPreserve = false;

  duelMode = false;
  duelMatch = null;
  if (handPose && typeof handPose.detectStop === 'function') {
    handPose.detectStop();
  }
  hands = [];
  if (duelBtn) duelBtn.innerText = 'Lancer le Mode Duel (Webcam)';
  recordTime = 0;
  victoryMsg.style.display = 'none';
  victoryMsg.style.color = 'lime';
  victoryMsg.innerText = 'Victoire absolue !';
  loop();

  curriculumPhase = 'A';

  if (curriculumAutoCheckbox && curriculumAutoCheckbox.checked) {
    currentGameConfig = cloneGameConfig(
      getCurriculumConfigForPhase('A', curriculumSelectA.value, curriculumSelectB.value, getBuiltinPreset)
    );
  } else {
    currentGameConfig = cloneGameConfig(getActiveGameConfig(presetSelect.value, customGameConfig, gameConfigApi));
  }

  if (obsCopy.length > 0) {
    currentGameConfig.obstacles = obsCopy;
  }

  updateCurriculumUi(curriculumUiRefs());

  if (popStopThreshold) {
    popStopThreshold.max = String(currentGameConfig.lifetime);
    let cap = currentGameConfig.lifetime;
    let v = parseInt(popStopThreshold.value, 10);
    if (v > cap) {
      popStopThreshold.value = String(cap);
      popStopThresholdVal.innerText = String(cap);
    }
  }

  nnTopology = buildNnTopologyFromUi(nnUiRefs());

  let popSize = parseInt(popSlider.value);
  let mutationRate = parseFloat(mutationSlider.value);

  population = new Population(popSize, nnTopology, mutationRate, currentGameConfig);

  updateTournamentCircuitHint(currentGameConfig);
}

function draw() {
  background(30);

  stroke(255, 100);
  strokeWeight(2);
  line(width / 2, 0, width / 2, height);
  noStroke();

  if (duelMode && duelMatch) {
    drawObstaclesFromConfig(duelMatch.gameConfig);
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

    if (hands.length > 0) {
      let y = hands[0].index_finger_tip.y;
      handY = map(y, 0, 240, 0, height);
      handY = constrain(handY, duelMatch.rightPaddle.h / 2, height - duelMatch.rightPaddle.h / 2);
    }
    duelMatch.rightPaddle.y = handY;

    if (duelState === 'PLAYING') {
      duelMatch.leftPaddle.predict(duelMatch.ball);

      duelMatch.ball.update(duelMatch.gameConfig.obstacles || []);

      let lp = duelMatch.leftPaddle;
      let rp = duelMatch.rightPaddle;
      let b = duelMatch.ball;

      if (
        b.x - b.r < lp.x + lp.w / 2 &&
        b.y > lp.y - lp.h / 2 &&
        b.y < lp.y + lp.h / 2
      ) {
        let diff = b.y - lp.y;
        let angle = map(diff, -lp.h / 2, lp.h / 2, -PI / 4, PI / 4);
        b.vx = b.speed * cos(angle);
        b.vy = b.speed * sin(angle);
        b.x = lp.x + lp.w / 2 + b.r;
      }

      if (
        b.x + b.r > rp.x - rp.w / 2 &&
        b.y > rp.y - rp.h / 2 &&
        b.y < rp.y + rp.h / 2
      ) {
        let diff = b.y - rp.y;
        let angle = map(diff, -rp.h / 2, rp.h / 2, -PI / 4, PI / 4);
        b.vx = -b.speed * cos(angle);
        b.vy = b.speed * sin(angle);
        b.x = rp.x - rp.w / 2 - b.r;
      }

      if (b.x < 0) {
        duelScoreHuman++;
        duelState = 'WAITING';
      } else if (b.x > width) {
        duelScoreAI++;
        duelState = 'WAITING';
      }
    } else {
      duelMatch.leftPaddle.predict(duelMatch.ball);
    }

    stroke(255, 60);
    noFill();
    duelMatch.leftPaddle.show();
    duelMatch.rightPaddle.show();
    if (duelState === 'PLAYING') duelMatch.ball.show();

    noStroke();
    fill(255);
    textSize(48);
    textAlign(CENTER, CENTER);
    text(duelScoreAI, width / 4, 50);
    text(duelScoreHuman, (3 * width) / 4, 50);
    textSize(14);
    fill(180);
    text('IA', width / 4, 95);
    text('Vous', (3 * width) / 4, 95);

    if (duelState === 'WAITING') {
      fill(255, 220, 0);
      textSize(20);
      text('Appuyez sur ESPACE pour lancer la balle', width / 2, height / 2);
    }
    return;
  }

  if (!population) return;

  for (let s = 0; s < 3; s++) {
    let anyAlive = population.update();

    let currentMax = population.getBestTime();
    if (currentMax > recordTime) recordTime = currentMax;

    if (popStopEnabled && popStopEnabled.checked) {
      let T = parseInt(popStopThreshold.value, 10);
      let p = parseFloat(popStopProportion.value);
      let frac = population.fractionWithSurvivalAtLeast(T);
      let curriculumBlocksStop =
        curriculumAutoCheckbox &&
        curriculumAutoCheckbox.checked &&
        curriculumPhase === 'A';
      if (frac >= p && !curriculumBlocksStop) {
        victoryMsg.style.display = 'block';
        victoryMsg.style.color = '#5ec8ff';
        victoryMsg.innerText =
          'Arrêt entraînement (population) : ' +
          (frac * 100).toFixed(0) +
          '% des matchs ont atteint au moins ' +
          T +
          ' frames (objectif ≥ ' +
          (p * 100).toFixed(0) +
          '%).';
        drawObstaclesFromConfig(currentGameConfig);
        population.show();
        noLoop();
        return;
      }
    }

    if (recordTime >= currentGameConfig.lifetime) {
      victoryMsg.style.display = 'block';
      victoryMsg.style.color = 'lime';
      victoryMsg.innerText = 'Victoire absolue !';
      drawObstaclesFromConfig(currentGameConfig);
      population.show();
      noLoop();
      return;
    }

    if (!anyAlive) {
      if (
        curriculumAutoCheckbox &&
        curriculumAutoCheckbox.checked &&
        curriculumPhase === 'A'
      ) {
        let Tc = parseInt(popStopThreshold.value, 10);
        let pc = parseFloat(popStopProportion.value);
        let fracEnd = population.fractionWithSurvivalAtLeast(Tc);
        if (fracEnd >= pc) {
          curriculumPhase = 'B';
          let obsKeep = (currentGameConfig && currentGameConfig.obstacles
            ? currentGameConfig.obstacles.map(function (o) {
                return { x: o.x, y: o.y, w: o.w, h: o.h };
              })
            : []);
          currentGameConfig = cloneGameConfig(
            getCurriculumConfigForPhase('B', curriculumSelectA.value, curriculumSelectB.value, getBuiltinPreset)
          );
          if (obsKeep.length > 0) currentGameConfig.obstacles = obsKeep;
          population.gameConfig = currentGameConfig;
          recordTime = 0;
          if (popStopThreshold) {
            popStopThreshold.max = String(currentGameConfig.lifetime);
            let cap = currentGameConfig.lifetime;
            let v = parseInt(popStopThreshold.value, 10);
            if (v > cap) {
              popStopThreshold.value = String(cap);
              popStopThresholdVal.innerText = String(cap);
            }
          }
          updateCurriculumUi(curriculumUiRefs());
        }
      }
      population.evolve();
      break;
    }
  }

  drawObstaclesFromConfig(currentGameConfig);
  population.show();

  genCountSpan.innerText = population.generation;
  recordTimeSpan.innerText = (recordTime / 60).toFixed(1);
  recordFramesSpan.innerText = recordTime;
}

function exportPresetFile() {
  let c = getCircuitConfigForExport(currentGameConfig, presetSelect.value, customGameConfig, gameConfigApi);
  let payload = { kind: 'pong_neuro_preset', formatVersion: 1, ...c };
  saveJSON(payload, 'pong_circuit.json');
}

function importPresetFile(event) {
  let file = event.target.files[0];
  if (!file) return;
  let reader = new FileReader();
  reader.onload = function (e) {
    try {
      let parsed = JSON.parse(e.target.result);
      let normalized = parsePresetPayload(parsed);
      if (!normalized) {
        alert('Preset / circuit invalide.');
        return;
      }
      customGameConfig = normalized;
      presetSelect.value = 'custom';
      window.__skipObsPreserve = true;
      initSimulation();
    } catch (err) {
      alert('JSON invalide : ' + err.message);
    }
    event.target.value = '';
  };
  reader.readAsText(file);
}

function exportModel() {
  let dna = loadedDNA || getBestDNA(population);
  if (!dna) {
    alert('Aucun cerveau à exporter !');
    return;
  }
  let payload = {
    kind: 'pong_neuro_brain',
    formatVersion: 1,
    gameConfig: getCircuitConfigForExport(currentGameConfig, presetSelect.value, customGameConfig, gameConfigApi),
    nnTopology: buildNnTopologyFromUi(nnUiRefs()),
    genes: dna.genes
  };
  saveJSON(payload, 'best_pong_brain.json');
}

function exportBundleFile() {
  let dna = loadedDNA || getBestDNA(population);
  if (!dna) {
    alert('Aucun cerveau à exporter !');
    return;
  }
  let payload = {
    kind: 'pong_neuro_bundle',
    formatVersion: 1,
    gameConfig: getCircuitConfigForExport(currentGameConfig, presetSelect.value, customGameConfig, gameConfigApi),
    nnTopology: buildNnTopologyFromUi(nnUiRefs()),
    genes: dna.genes
  };
  saveJSON(payload, 'pong_circuit_et_cerveau.json');
}

function importModel(event) {
  let file = event.target.files[0];
  if (!file) return;
  let reader = new FileReader();
  reader.onload = function (e) {
    try {
      let parsed = JSON.parse(e.target.result);
      handleBrainImport(parsed);
    } catch (err) {
      alert('JSON invalide : ' + err.message);
    }
    event.target.value = '';
  };
  reader.readAsText(file);
}

function startDuelHandTracking() {
  if (!video || !handPose) return;
  handPose.detectStart(video, (results) => {
    hands = results;
  });
}

function toggleDuelMode() {
  duelMode = !duelMode;
  if (duelMode) {
    if (typeof ml5 === 'undefined' || typeof ml5.handPose !== 'function') {
      duelMode = false;
      alert('ml5.js est introuvable : vérifiez la connexion réseau et le chargement du script.');
      return;
    }
    duelBtn.innerText = 'Arrêter le Mode Duel';
    if (duelBtn) duelBtn.blur();
    victoryMsg.style.display = 'block';
    victoryMsg.innerText = 'MODE DUEL - Chargement caméra...';

    nnTopology = buildNnTopologyFromUi(nnUiRefs());
    currentGameConfig = cloneGameConfig(currentGameConfig);

    let dnaToUse = loadedDNA || getBestDNA(population);
    if (!dnaToUse) dnaToUse = new DNA();

    duelMatch = new Match(nnTopology, dnaToUse, null, currentGameConfig);
    duelMatch.rightPaddle.isHuman = true;

    duelScoreAI = 0;
    duelScoreHuman = 0;
    duelState = 'WAITING';

    if (!video) {
      video = createCapture(VIDEO);
      video.size(320, 240);
      video.hide();
      handPose = ml5.handPose({ flipHorizontal: true }, () => {
        victoryMsg.innerText = 'MODE DUEL - Bougez votre main (index) !';
        startDuelHandTracking();
      });
    } else {
      victoryMsg.innerText = 'MODE DUEL - Bougez votre main (index) !';
      startDuelHandTracking();
    }
    loop();
  } else {
    if (handPose && typeof handPose.detectStop === 'function') {
      handPose.detectStop();
    }
    hands = [];
    duelBtn.innerText = 'Lancer le Mode Duel (Webcam)';
    initSimulation();
  }
}

function drawObstaclesFromConfig(gc) {
  if (!gc || !gc.obstacles || !gc.obstacles.length) return;
  push();
  for (let o of gc.obstacles) {
    fill(180, 70, 70, 200);
    stroke(255, 140, 120);
    strokeWeight(2);
    rectMode(CENTER);
    rect(o.x, o.y, o.w, o.h);
  }
  pop();
}

function activeGameConfigForEditor() {
  if (duelMode && duelMatch) return duelMatch.gameConfig;
  return currentGameConfig;
}

function removeNearestObstacle(mx, my, gc) {
  if (!gc || !gc.obstacles || !gc.obstacles.length) return;
  let bestI = -1;
  let bestD = 1e18;
  for (let i = 0; i < gc.obstacles.length; i++) {
    let o = gc.obstacles[i];
    let d = dist(mx, my, o.x, o.y);
    if (d < bestD) {
      bestD = d;
      bestI = i;
    }
  }
  if (bestI >= 0 && bestD < max(80, gc.obstacles[bestI].w, gc.obstacles[bestI].h)) {
    gc.obstacles.splice(bestI, 1);
  }
}

function clearAllObstacles() {
  let gc = activeGameConfigForEditor();
  if (!gc) return;
  gc.obstacles = [];
  if (population && population.gameConfig === gc) {
    /* même référence */
  }
}

function mousePressed() {
  if (!obstaclePlaceCheckbox || !obstaclePlaceCheckbox.checked) return;
  if (mouseX < 0 || mouseX > width || mouseY < 0 || mouseY > height) return;
  let gc = activeGameConfigForEditor();
  if (!gc) return;
  if (!gc.obstacles) gc.obstacles = [];
  if (keyIsDown(SHIFT)) {
    removeNearestObstacle(mouseX, mouseY, gc);
    return;
  }
  gc.obstacles.push({ x: mouseX, y: mouseY, w: 52, h: 22 });
}

function keyPressed() {
  if (
    duelMode &&
    duelMatch &&
    duelState === 'WAITING' &&
    (key === ' ' || keyCode === 32)
  ) {
    duelMatch.ball.reset();
    let base = duelMatch.gameConfig.ballSpeed * 2;
    duelMatch.ball.speed = base;
    let m = sqrt(duelMatch.ball.vx * duelMatch.ball.vx + duelMatch.ball.vy * duelMatch.ball.vy);
    if (m > 0) {
      duelMatch.ball.vx = (duelMatch.ball.vx / m) * duelMatch.ball.speed;
      duelMatch.ball.vy = (duelMatch.ball.vy / m) * duelMatch.ball.speed;
    }
    duelState = 'PLAYING';
    // Évite que Espace réactive un <button> encore focus (ex. « Mode duel ») → sortie du duel.
    return false;
  }
}

function clearTournamentList() {
  tournamentEntries = [];
  renderTournamentList(tournamentEntries);
  let div = document.getElementById('tournament-results');
  if (div) div.innerHTML = '';
}

function onTournamentFilesSelected(ev) {
  let files = Array.prototype.slice.call(ev.target.files || []);
  ev.target.value = '';
  if (!files.length) return;
  let reads = files.map(function (f) {
    return new Promise(function (resolve, reject) {
      let r = new FileReader();
      r.onload = function () {
        resolve({ name: f.name, text: r.result });
      };
      r.onerror = function () {
        reject(new Error(f.name));
      };
      r.readAsText(f);
    });
  });
  Promise.all(reads)
    .then(function (rows) {
      for (let row of rows) {
        try {
          let parsed = JSON.parse(row.text);
          let rawTopo = buildNnTopologyFromUi(nnUiRefs());
          let uiGeneCount = expectedGeneCount(normalizeNnTopology(rawTopo));
          let entry = parseTournamentBrainEntry(parsed, row.name, rawTopo, uiGeneCount);
          if (entry) tournamentEntries.push(entry);
        } catch (err) {
          alert(row.name + ' : ' + err.message);
        }
      }
      renderTournamentList(tournamentEntries);
    })
    .catch(function () {
      alert('Erreur de lecture de fichier.');
    });
}

function runTournamentClick() {
  if (tournamentEntries.length < 2) {
    alert('Ajoutez au moins deux fichiers cerveau (JSON).');
    return;
  }
  let epEl = document.getElementById('tournament-episodes');
  let episodes = parseInt(epEl && epEl.value ? epEl.value : '3', 10);
  if (!Number.isFinite(episodes) || episodes < 1) episodes = 3;
  if (episodes > 30) episodes = 30;

  let gc = cloneGameConfig(
    getCircuitConfigForExport(currentGameConfig, presetSelect.value, customGameConfig, gameConfigApi)
  );
  noLoop();
  try {
    let results = runTournamentSimulation(tournamentEntries, gc, episodes, nnUiRefs());
    renderTournamentResults(results);
  } catch (err) {
    alert('Tournoi : ' + err.message);
  }
  loop();
}

/* p5 mode global : les callbacks doivent être sur window pour être découverts par la librairie. */
window.setup = setup;
window.draw = draw;
window.mousePressed = mousePressed;
window.keyPressed = keyPressed;

/* p5 mode global : les callbacks doivent être sur window pour être découverts par la librairie. */
window.setup = setup;
window.draw = draw;
window.mousePressed = mousePressed;
window.keyPressed = keyPressed;
