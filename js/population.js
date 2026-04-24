class Population {
  constructor(size, nnTopology, mutationRate, gameConfig) {
    this.size = size;
    this.nnTopology = nnTopology;
    this.mutationRate = mutationRate;
    this.gameConfig = gameConfig;
    this.matches = [];
    this.generation = 1;

    for (let i = 0; i < this.size; i++) {
        this.matches.push(new Match(this.nnTopology, null, null, this.gameConfig));
    }
  }

  update() {
    let allDead = true;
    for (let i = 0; i < this.size; i++) {
      this.matches[i].update();
      if (this.matches[i].alive) {
        allDead = false;
      }
    }
    return !allDead;
  }

  show() {
    for (let i = 0; i < this.size; i++) {
      if (this.matches[i].alive) {
        this.matches[i].show();
      }
    }
  }

  evolve() {
    let paddles = [];
    for (let i = 0; i < this.size; i++) {
      paddles.push(this.matches[i].leftPaddle);
      paddles.push(this.matches[i].rightPaddle);
    }

    let maxFit = 0;
    for (let p of paddles) {
      if (p.fitness > maxFit) maxFit = p.fitness;
    }

    for (let p of paddles) {
      p.fitness /= maxFit;
      p.fitness = pow(p.fitness, 4);
    }

    let matingPool = [];
    for (let i = 0; i < paddles.length; i++) {
      let n = paddles[i].fitness * 100; 
      for (let j = 0; j < n; j++) {
        matingPool.push(paddles[i].dna);
      }
    }

    let newMatches = [];
    if (matingPool.length === 0) {
      for (let i = 0; i < this.size; i++) {
        newMatches.push(new Match(this.nnTopology, null, null, this.gameConfig));
      }
    } else {
      for (let i = 0; i < this.size; i++) {
        let parentA = random(matingPool);
        let parentB = random(matingPool);
        let childLeftDNA = parentA.crossover(parentB);
        childLeftDNA.mutate(this.mutationRate);
        
        let parentC = random(matingPool);
        let parentD = random(matingPool);
        let childRightDNA = parentC.crossover(parentD);
        childRightDNA.mutate(this.mutationRate);

        newMatches.push(new Match(this.nnTopology, childLeftDNA, childRightDNA, this.gameConfig));
      }
    }

    this.matches = newMatches;
    this.generation++;
  }

  getBestTime() {
    let maxT = 0;
    for (let m of this.matches) {
      if (m.framesSurvived > maxT) maxT = m.framesSurvived;
    }
    return maxT;
  }

  /** Fraction des matchs dont la survie (frames) a atteint au moins le seuil (vivants ou dernier épisode). */
  fractionWithSurvivalAtLeast(thresholdFrames) {
    if (this.matches.length === 0) return 0;
    let ok = 0;
    for (let m of this.matches) {
      if (m.framesSurvived >= thresholdFrames) ok++;
    }
    return ok / this.matches.length;
  }
}
