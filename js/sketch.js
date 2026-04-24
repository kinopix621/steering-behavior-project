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

function normalizeNnTopology(topo) {
  if (!topo || typeof topo !== 'object') {
    return { inputs: 5, hiddenSizes: [16], activation: 'sigmoid', hybridNnWeight: 1 };
  }
  let inputs = parseInt(topo.inputs, 10);
  if (inputs !== 3 && inputs !== 5) inputs = 5;
  let activation = topo.activation === 'relu' ? 'relu' : 'sigmoid';
  let hybridNnWeight = 1;
  if (topo.hybridNnWeight != null && Number.isFinite(Number(topo.hybridNnWeight))) {
    hybridNnWeight = constrain(Number(topo.hybridNnWeight), 0, 1);
  }
  let hiddenSizes;
  if (Array.isArray(topo.hiddenSizes) && topo.hiddenSizes.length > 0) {
    hiddenSizes = topo.hiddenSizes.map((n) => {
      let v = parseInt(n, 10);
      if (!Number.isFinite(v) || v < 4) v = 8;
      return Math.min(128, v);
    });
    if (!hiddenSizes.every((h) => h === hiddenSizes[0])) return null;
  } else if (topo.hidden != null) {
    let h = parseInt(topo.hidden, 10) || 16;
    hiddenSizes = [Math.min(128, Math.max(4, h))];
  } else {
    hiddenSizes = [16];
  }
  return { inputs, hiddenSizes, activation, hybridNnWeight };
}

function expectedGeneCount(topo) {
  let t = normalizeNnTopology(topo);
  if (t == null) return 0;
  let n = 0;
  let prev = t.inputs;
  for (let h of t.hiddenSizes) {
    n += h * prev + h;
    prev = h;
  }
  n += 3 * prev + 3;
  return n;
}

function buildNnTopologyFromUi() {
  let nLayers = parseInt(hiddenLayersSlider.value, 10);
  let nPer = parseInt(neuronsSlider.value, 10);
  let hiddenSizes = [];
  for (let i = 0; i < nLayers; i++) hiddenSizes.push(nPer);
  let hybridNnWeight = 1;
  if (hybridNnSlider) {
    hybridNnWeight = parseFloat(hybridNnSlider.value);
    if (!Number.isFinite(hybridNnWeight)) hybridNnWeight = 1;
    hybridNnWeight = constrain(hybridNnWeight, 0, 1);
  }
  return {
    inputs: parseInt(inputsSelect.value),
    hiddenSizes,
    hidden: nPer,
    activation: actSelect.value,
    hybridNnWeight
  };
}

function getActiveGameConfig() {
  let sel = presetSelect.value;
  if (sel === 'custom') {
    if (customGameConfig) return cloneGameConfig(customGameConfig);
    return getBuiltinPreset('medium');
  }
  return getBuiltinPreset(sel);
}

function getCurriculumConfigForPhase(phase) {
  let sel = phase === 'A' ? curriculumSelectA.value : curriculumSelectB.value;
  return getBuiltinPreset(sel);
}

/** Circuit actuel pour export (entraînement curriculum = phase en cours). */
function getCircuitConfigForExport() {
  if (currentGameConfig) return cloneGameConfig(currentGameConfig);
  return cloneGameConfig(getActiveGameConfig());
}

function updateCurriculumUi() {
  if (!curriculumAutoCheckbox || !presetSelect) return;
  let on = curriculumAutoCheckbox.checked;
  presetSelect.disabled = on;
  if (curriculumPhaseLabel) {
    curriculumPhaseLabel.style.display = on ? 'block' : 'none';
    if (on) {
      let aName = curriculumSelectA.options[curriculumSelectA.selectedIndex].text;
      let bName = curriculumSelectB.options[curriculumSelectB.selectedIndex].text;
      curriculumPhaseLabel.textContent =
        curriculumPhase === 'A'
          ? 'Phase A (départ) — ' + aName
          : 'Phase B (cible) — ' + bName;
    }
  }
}

function applyNnTopologyToUi(topo) {
  if (!topo) return;
  let t = normalizeNnTopology(topo);
  if (t == null) return;
  if (t.inputs != null) inputsSelect.value = String(t.inputs);
  if (t.hiddenSizes.length > 0) {
    let first = t.hiddenSizes[0];
    neuronsSlider.value = String(first);
    neuronsVal.innerText = String(first);
    hiddenLayersSlider.value = String(t.hiddenSizes.length);
    hiddenLayersVal.innerText = String(t.hiddenSizes.length);
  }
  if (t.activation) actSelect.value = t.activation;
  if (t.hybridNnWeight != null && hybridNnSlider) {
    hybridNnSlider.value = String(constrain(t.hybridNnWeight, 0, 1));
    if (hybridNnVal) hybridNnVal.innerText = parseFloat(hybridNnSlider.value).toFixed(2);
  }
}

function parsePresetPayload(parsed) {
  if (!parsed || typeof parsed !== 'object') return null;
  if (parsed.kind === 'pong_neuro_preset') return normalizeImportedGameConfig(parsed);
  if (parsed.gameConfig) return normalizeImportedGameConfig(parsed.gameConfig);
  return normalizeImportedGameConfig(parsed);
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
    applyNnTopologyToUi(embeddedTopo);
  }

  let topoCheck = normalizeNnTopology(embeddedTopo || buildNnTopologyFromUi());
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
    if (!gameConfigsEqual(embeddedConfig, getCircuitConfigForExport())) {
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
    currentGameConfig = cloneGameConfig(getCurriculumConfigForPhase('A'));
  } else {
    currentGameConfig = cloneGameConfig(getActiveGameConfig());
  }

  if (obsCopy.length > 0) {
    currentGameConfig.obstacles = obsCopy;
  }

  updateCurriculumUi();

  if (popStopThreshold) {
    popStopThreshold.max = String(currentGameConfig.lifetime);
    let cap = currentGameConfig.lifetime;
    let v = parseInt(popStopThreshold.value, 10);
    if (v > cap) {
      popStopThreshold.value = String(cap);
      popStopThresholdVal.innerText = String(cap);
    }
  }

  nnTopology = buildNnTopologyFromUi();

  let popSize = parseInt(popSlider.value);
  let mutationRate = parseFloat(mutationSlider.value);

  population = new Population(popSize, nnTopology, mutationRate, currentGameConfig);

  updateTournamentCircuitHint();
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
          currentGameConfig = cloneGameConfig(getCurriculumConfigForPhase('B'));
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
          updateCurriculumUi();
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

function exportPresetFile() {
  let c = getCircuitConfigForExport();
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
  let dna = loadedDNA || getBestDNA();
  if (!dna) {
    alert('Aucun cerveau à exporter !');
    return;
  }
  let payload = {
    kind: 'pong_neuro_brain',
    formatVersion: 1,
    gameConfig: getCircuitConfigForExport(),
    nnTopology: buildNnTopologyFromUi(),
    genes: dna.genes
  };
  saveJSON(payload, 'best_pong_brain.json');
}

function exportBundleFile() {
  let dna = loadedDNA || getBestDNA();
  if (!dna) {
    alert('Aucun cerveau à exporter !');
    return;
  }
  let payload = {
    kind: 'pong_neuro_bundle',
    formatVersion: 1,
    gameConfig: getCircuitConfigForExport(),
    nnTopology: buildNnTopologyFromUi(),
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

    nnTopology = buildNnTopologyFromUi();
    currentGameConfig = cloneGameConfig(currentGameConfig);

    let dnaToUse = loadedDNA || getBestDNA();
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

function updateTournamentCircuitHint() {
  let el = document.getElementById('tournament-circuit-hint');
  if (!el || !currentGameConfig) return;
  el.textContent =
    (currentGameConfig.presetId || 'circuit') +
    ' — v' +
    currentGameConfig.ballSpeed +
    ' / raq.' +
    currentGameConfig.paddleHeight;
}

function parseTournamentBrainEntry(parsed, fileName) {
  if (Array.isArray(parsed)) {
    let topo = normalizeNnTopology(buildNnTopologyFromUi());
    if (parsed.length !== expectedGeneCount(topo)) {
      alert(
        fileName +
          ' : nombre de gènes incompatible avec la topologie actuelle des curseurs (' +
          parsed.length +
          ' vs ' +
          expectedGeneCount(topo) +
          ').'
      );
      return null;
    }
    return { name: fileName, genes: parsed, nnTopology: null };
  }
  if (!parsed || !Array.isArray(parsed.genes)) {
    alert(fileName + ' : fichier non reconnu (attendu : enveloppe avec "genes" ou tableau de gènes).');
    return null;
  }
  let embedded = parsed.nnTopology || null;
  let topo = normalizeNnTopology(embedded || buildNnTopologyFromUi());
  if (topo === null) {
    alert(fileName + ' : topologie invalide (couches non uniformes).');
    return null;
  }
  if (parsed.genes.length !== expectedGeneCount(topo)) {
    alert(
      fileName +
        ' : gènes/topo incompatible (' +
        parsed.genes.length +
        ' vs ' +
        expectedGeneCount(topo) +
        ').'
    );
    return null;
  }
  return { name: fileName, genes: parsed.genes, nnTopology: embedded };
}

function renderTournamentList() {
  let ul = document.getElementById('tournament-list');
  if (!ul) return;
  ul.innerHTML = '';
  for (let e of tournamentEntries) {
    let li = document.createElement('li');
    li.textContent = e.name + (e.nnTopology ? ' (topo fichier)' : ' (topo UI)');
    ul.appendChild(li);
  }
}

function clearTournamentList() {
  tournamentEntries = [];
  renderTournamentList();
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
          let entry = parseTournamentBrainEntry(parsed, row.name);
          if (entry) tournamentEntries.push(entry);
        } catch (err) {
          alert(row.name + ' : ' + err.message);
        }
      }
      renderTournamentList();
    })
    .catch(function () {
      alert('Erreur de lecture de fichier.');
    });
}

function simulateOneTournamentEpisode(nnTopology, dna, gameConfig) {
  let m = new Match(nnTopology, dna, null, gameConfig, { rightBaselineTrack: true });
  let cap = gameConfig.lifetime + 800;
  let steps = 0;
  while (m.alive && steps < cap) {
    m.update();
    steps++;
  }
  return {
    frames: m.framesSurvived,
    leftScore: m.leftPaddle.score
  };
}

function runTournamentSimulation(entries, gameConfig, episodesPerBrain) {
  let results = [];
  let idx = 0;
  for (let entry of entries) {
    let topo = entry.nnTopology
      ? normalizeNnTopology(entry.nnTopology)
      : normalizeNnTopology(buildNnTopologyFromUi());
    if (topo === null) {
      results.push({ name: entry.name, error: 'Topologie invalide' });
      idx++;
      continue;
    }
    if (entry.genes.length !== expectedGeneCount(topo)) {
      results.push({ name: entry.name, error: 'Taille ADN' });
      idx++;
      continue;
    }
    let dna = new DNA(entry.genes);
    let totalFrames = 0;
    let totalScore = 0;
    for (let e = 0; e < episodesPerBrain; e++) {
      randomSeed(9000 + idx * 7919 + e * 131);
      let r = simulateOneTournamentEpisode(topo, dna, gameConfig);
      totalFrames += r.frames;
      totalScore += r.leftScore;
    }
    randomSeed(floor(millis()) % 100000000);
    results.push({
      name: entry.name,
      avgFrames: totalFrames / episodesPerBrain,
      avgScore: totalScore / episodesPerBrain
    });
    idx++;
  }
  results.sort(function (a, b) {
    if (a.error && !b.error) return 1;
    if (!a.error && b.error) return -1;
    if (a.error && b.error) return 0;
    if (b.avgFrames !== a.avgFrames) return b.avgFrames - a.avgFrames;
    return b.avgScore - a.avgScore;
  });
  let rank = 1;
  for (let i = 0; i < results.length; i++) {
    if (!results[i].error) {
      results[i].rank = rank;
      rank++;
    }
  }
  return results;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderTournamentResults(results) {
  let div = document.getElementById('tournament-results');
  if (!div) return;
  let rows =
    '<table style="width:100%;border-collapse:collapse;color:#eee;"><thead><tr style="background:#444;">' +
    '<th style="padding:8px;text-align:left;">#</th>' +
    '<th style="padding:8px;text-align:left;">Fichier</th>' +
    '<th style="padding:8px;text-align:right;">Frames moy.</th>' +
    '<th style="padding:8px;text-align:right;">Touches moy.</th>' +
    '<th style="padding:8px;text-align:left;">Note</th></tr></thead><tbody>';
  for (let r of results) {
    if (r.error) {
      rows +=
        '<tr style="border-top:1px solid #555;"><td>—</td><td>' +
        escapeHtml(r.name) +
        '</td><td colspan="3">' +
        escapeHtml(r.error) +
        '</td></tr>';
    } else {
      rows +=
        '<tr style="border-top:1px solid #555;"><td>' +
        r.rank +
        '</td><td>' +
        escapeHtml(r.name) +
        '</td><td style="text-align:right;">' +
        r.avgFrames.toFixed(1) +
        '</td><td style="text-align:right;">' +
        r.avgScore.toFixed(2) +
        '</td><td></td></tr>';
    }
  }
  rows += '</tbody></table>';
  div.innerHTML = rows;
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

  let gc = cloneGameConfig(getCircuitConfigForExport());
  noLoop();
  try {
    let results = runTournamentSimulation(tournamentEntries, gc, episodes);
    renderTournamentResults(results);
  } catch (err) {
    alert('Tournoi : ' + err.message);
  }
  loop();
}
