class Paddle {
  constructor(isLeft, nnTopology, dnaInfo) {
    this.isLeft = isLeft;
    this.w = 15;
    this.h = 80;
    this.y = height / 2;
    this.x = this.isLeft ? this.w : width - this.w * 2;
    this.speed = 8;
    
    this.score = 0;
    this.fitness = 0;

    // Création du réseau
    // Outputs: 3 (Haut, Bas, Rien)
    this.brain = new NeuralNetwork(nnTopology.inputs, nnTopology.hidden, 3, nnTopology.activation);

    if (dnaInfo) {
      this.dna = dnaInfo;
      // Injecte les poids de l'ADN dans le réseau de neurones
      this.dna.injectToNN(this.brain);
    } else {
      // Pas d'ADN donné, on génère l'ADN à partir du réseau fraichement randomisé
      this.dna = new DNA();
      this.dna.extractFromNN(this.brain);
    }
  }

  // Voici les capteurs demandés (position balle, position paddle, etc.)
  predict(ball) {
    if (this.isHuman) return;

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
    
    // Extrait la décision
    let maxOutput = 0;
    let action = 0;
    for (let i = 0; i < output.length; i++) {
      if (output[i] > maxOutput) {
        maxOutput = output[i];
        action = i;
      }
    }

    if (action === 0) this.move(-1);
    else if (action === 1) this.move(1);
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
