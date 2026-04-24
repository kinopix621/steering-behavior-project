/**
 * Logique partagée (topologie NN, circuit, tournoi, rendu liste tournoi).
 * Dépend de p5 uniquement via globalThis pour randomSeed / millis (après chargement des scripts classiques).
 */
import { normalizeImportedGameConfig } from './gameConfig.js';

function constrain(v, lo, hi) {
  return Math.min(Math.max(v, lo), hi);
}

export function normalizeNnTopology(topo) {
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

export function expectedGeneCount(topo) {
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

/** @param {object} refs — éléments UI : inputsSelect, hiddenLayersSlider, neuronsSlider, actSelect, hybridNnSlider */
export function buildNnTopologyFromUi(refs) {
  let nLayers = parseInt(refs.hiddenLayersSlider.value, 10);
  let nPer = parseInt(refs.neuronsSlider.value, 10);
  let hiddenSizes = [];
  for (let i = 0; i < nLayers; i++) hiddenSizes.push(nPer);
  let hybridNnWeight = 1;
  if (refs.hybridNnSlider) {
    hybridNnWeight = parseFloat(refs.hybridNnSlider.value);
    if (!Number.isFinite(hybridNnWeight)) hybridNnWeight = 1;
    hybridNnWeight = constrain(hybridNnWeight, 0, 1);
  }
  return {
    inputs: parseInt(refs.inputsSelect.value, 10),
    hiddenSizes,
    hidden: nPer,
    activation: refs.actSelect.value,
    hybridNnWeight
  };
}

export function getActiveGameConfig(presetSelectValue, customGameConfig, { cloneGameConfig, getBuiltinPreset }) {
  if (presetSelectValue === 'custom') {
    if (customGameConfig) return cloneGameConfig(customGameConfig);
    return getBuiltinPreset('medium');
  }
  return getBuiltinPreset(presetSelectValue);
}

export function getCurriculumConfigForPhase(phase, curriculumSelectAValue, curriculumSelectBValue, getBuiltinPreset) {
  let sel = phase === 'A' ? curriculumSelectAValue : curriculumSelectBValue;
  return getBuiltinPreset(sel);
}

/** Circuit actuel pour export (entraînement curriculum = phase en cours). */
export function getCircuitConfigForExport(
  currentGameConfig,
  presetSelectValue,
  customGameConfig,
  { cloneGameConfig, getBuiltinPreset }
) {
  if (currentGameConfig) return cloneGameConfig(currentGameConfig);
  return cloneGameConfig(getActiveGameConfig(presetSelectValue, customGameConfig, { cloneGameConfig, getBuiltinPreset }));
}

export function updateCurriculumUi({
  curriculumAutoCheckbox,
  presetSelect,
  curriculumPhaseLabel,
  curriculumPhase,
  curriculumSelectA,
  curriculumSelectB
}) {
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

/** @param {object} refs — inputsSelect, neuronsSlider, neuronsVal, hiddenLayersSlider, hiddenLayersVal, actSelect, hybridNnSlider?, hybridNnVal? */
export function applyNnTopologyToUi(topo, refs) {
  if (!topo) return;
  let t = normalizeNnTopology(topo);
  if (t == null) return;
  if (t.inputs != null) refs.inputsSelect.value = String(t.inputs);
  if (t.hiddenSizes.length > 0) {
    let first = t.hiddenSizes[0];
    refs.neuronsSlider.value = String(first);
    refs.neuronsVal.innerText = String(first);
    refs.hiddenLayersSlider.value = String(t.hiddenSizes.length);
    refs.hiddenLayersVal.innerText = String(t.hiddenSizes.length);
  }
  if (t.activation) refs.actSelect.value = t.activation;
  if (t.hybridNnWeight != null && refs.hybridNnSlider) {
    refs.hybridNnSlider.value = String(constrain(t.hybridNnWeight, 0, 1));
    if (refs.hybridNnVal) refs.hybridNnVal.innerText = parseFloat(refs.hybridNnSlider.value).toFixed(2);
  }
}

export function parsePresetPayload(parsed) {
  if (!parsed || typeof parsed !== 'object') return null;
  if (parsed.kind === 'pong_neuro_preset') return normalizeImportedGameConfig(parsed);
  if (parsed.gameConfig) return normalizeImportedGameConfig(parsed.gameConfig);
  return normalizeImportedGameConfig(parsed);
}

export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function parseTournamentBrainEntry(parsed, fileName, rawUiTopo, uiGeneCount) {
  if (Array.isArray(parsed)) {
    if (parsed.length !== uiGeneCount) {
      alert(
        fileName +
          ' : nombre de gènes incompatible avec la topologie actuelle des curseurs (' +
          parsed.length +
          ' vs ' +
          uiGeneCount +
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
  let topo = normalizeNnTopology(embedded != null ? embedded : rawUiTopo);
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

export function getBestDNA(population) {
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

export function updateTournamentCircuitHint(currentGameConfig) {
  let el = document.getElementById('tournament-circuit-hint');
  if (!el || !currentGameConfig) return;
  el.textContent =
    (currentGameConfig.presetId || 'circuit') +
    ' — v' +
    currentGameConfig.ballSpeed +
    ' / raq.' +
    currentGameConfig.paddleHeight;
}

export function renderTournamentList(entries) {
  let ul = document.getElementById('tournament-list');
  if (!ul) return;
  ul.innerHTML = '';
  for (let e of entries) {
    let li = document.createElement('li');
    li.textContent = e.name + (e.nnTopology ? ' (topo fichier)' : ' (topo UI)');
    ul.appendChild(li);
  }
}

export function renderTournamentResults(results) {
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

export function simulateOneTournamentEpisode(nnTopology, dna, gameConfig) {
  const Match = globalThis.Match;
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

export function runTournamentSimulation(entries, gameConfig, episodesPerBrain, uiRefs) {
  const g = globalThis;
  const DNA = g.DNA;
  let results = [];
  let idx = 0;
  const rawUi = buildNnTopologyFromUi(uiRefs);
  for (let entry of entries) {
    let topo = entry.nnTopology ? normalizeNnTopology(entry.nnTopology) : normalizeNnTopology(rawUi);
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
      g.randomSeed(9000 + idx * 7919 + e * 131);
      let r = simulateOneTournamentEpisode(topo, dna, gameConfig);
      totalFrames += r.frames;
      totalScore += r.leftScore;
    }
    g.randomSeed(g.floor(g.millis()) % 100000000);
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
