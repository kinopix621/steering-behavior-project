class Paddle {
  constructor(isLeft, nnTopology, dnaInfo, gameConfig, opts) {
    opts = opts || {};
    this.controlMode = opts.controlMode || 'nn';
    this.gameConfig = gameConfig;
    this.isLeft = isLeft;
    this.w = gameConfig.paddleWidth;
    this.h = gameConfig.paddleHeight;
    this.y = height / 2;
    this.x = this.isLeft ? this.w : width - this.w * 2;
    this.speed = gameConfig.paddleMoveSpeed;

    this.score = 0;
    this.fitness = 0;

    if (this.controlMode === 'track_ball') {
      this.brain = null;
      this.dna = null;
      this.hybridNnWeight = 1;
      return;
    }

    // Création du réseau — Outputs: 3 (Haut, Bas, Rien)
    let hiddenSizes = nnTopology.hiddenSizes;
    if (!hiddenSizes || !hiddenSizes.length) {
      hiddenSizes = [nnTopology.hidden != null ? nnTopology.hidden : 16];
    }
    this.brain = new NeuralNetwork(nnTopology.inputs, hiddenSizes, 3, nnTopology.activation);

    if (dnaInfo) {
      this.dna = dnaInfo;
      this.dna.injectToNN(this.brain);
    } else {
      this.dna = new DNA();
      this.dna.extractFromNN(this.brain);
    }

    let hw = nnTopology.hybridNnWeight;
    this.hybridNnWeight =
      hw !== undefined && hw !== null && Number.isFinite(Number(hw)) ? constrain(Number(hw), 0, 1) : 1;
  }

  // Voici les capteurs demandés (position balle, position paddle, etc.)
  predict(ball) {
    if (this.isHuman) return;

    if (this.controlMode === 'track_ball') {
      this.y = lerp(this.y, ball.y, 0.12);
      this.y = constrain(this.y, this.h / 2, height - this.h / 2);
      return;
    }

    let inputs = [];
    // 1. Distance Y relative (Balle - Raquette)
    inputs[0] = (ball.y - this.y) / height; 
    
    // 2. Position Y absolue de la raquette (pour éviter de sortir de l'écran)
    inputs[1] = this.y / height;
    
    // 3. Distance X absolue jusqu'à la balle
    inputs[2] = abs(this.x - ball.x) / width;
    
    // Si on a configuré 5 inputs au lieu de 3
    if (this.brain.input_nodes === 5) {
      // 4. Vitesse X relative (positive = la balle s'approche de la raquette)
      let relativeVx = this.isLeft ? ball.vx : -ball.vx;
      inputs[3] = (relativeVx + 10) / 20;
      
      // 5. Vitesse Y (normalisée)
      inputs[4] = (ball.vy + 10) / 20;
    }

    let output = this.brain.predict(inputs);

    let maxOutput = 0;
    let action = 0;
    for (let i = 0; i < output.length; i++) {
      if (output[i] > maxOutput) {
        maxOutput = output[i];
        action = i;
      }
    }

    let nnDir = 0;
    if (action === 0) nnDir = -1;
    else if (action === 1) nnDir = 1;

    let dead = max(8, this.h * 0.1);
    let heurDir = 0;
    if (ball.y < this.y - dead) heurDir = -1;
    else if (ball.y > this.y + dead) heurDir = 1;

    let wNn = this.hybridNnWeight;
    let blended = wNn * nnDir + (1 - wNn) * heurDir;
    if (blended > 0.25) this.move(1);
    else if (blended < -0.25) this.move(-1);
  }

  move(dir) {
    this.y += dir * this.speed;
    this.y = constrain(this.y, this.h / 2, height - this.h / 2);
  }

  show() {
    fill(255);
    rectMode(CENTER);
    rect(this.x, this.y, this.w, this.h);
  }
}
