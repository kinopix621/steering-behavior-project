class Population {
  constructor(size, mutationRate) {
    this.size = size;
    this.mutationRate = mutationRate;
    this.matches = [];
    this.generation = 1;

    for (let i = 0; i < this.size; i++) {
        this.matches.push(new Match(null, null));
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

    // Normalisation de la fitness et préparation à la reproduction
    let maxFit = 0;
    for (let p of paddles) {
      if (p.fitness > maxFit) {
        maxFit = p.fitness;
      }
    }

    // Pour éviter de croiser du vent, on normalise (0 -> 1)
    for (let p of paddles) {
      // Rend exponentiel pour décupler les chances des meilleurs
      // Typique de 10-missiles : this.fitness = pow(this.fitness, 4)
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
    // Si la mating pool est vide (cas très rares), on recommence from scratch
    if (matingPool.length === 0) {
      for (let i = 0; i < this.size; i++) {
        newMatches.push(new Match(null, null));
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

        newMatches.push(new Match(childLeftDNA, childRightDNA));
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
}
