class DNA {
  constructor(newgenes) {
    if (newgenes) {
      this.genes = newgenes;
    } else {
      this.genes = [];
      // lifetime global variable in sketch.js defines maximum frames of a match
      for (let i = 0; i < lifetime; i++) {
        // La raquette bouge en 1D : un float entre -1 (Haut) et 1 (Bas)
        this.genes[i] = random(-1, 1);
      }
    }
  }

  crossover(partner) {
    let child = new Array(this.genes.length);
    // Point de pivot aléatoire au milieu de la Timeline
    let crossoverIndex = floor(random(this.genes.length));
    
    for (let i = 0; i < this.genes.length; i++) {
      if (i > crossoverIndex) child[i] = this.genes[i];
      else child[i] = partner.genes[i];
    }
    return new DNA(child);
  }

  mutate(mutationRate) {
    for (let i = 0; i < this.genes.length; i++) {
      if (random(1) < mutationRate) {
        // Change complètement l'action à cette frame
        this.genes[i] = random(-1, 1);
      }
    }
  }
}
