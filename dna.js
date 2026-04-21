class DNA {
  constructor(genes) {
    if (genes) {
      this.genes = genes;
    } else {
      this.genes = [];
    }
  }

  // Extrait tous les poids d'un réseau Vanilla
  extractFromNN(nn) {
    this.genes = [];
    let arrays = [
      nn.weights_ih.toArray(),
      nn.weights_ho.toArray(),
      nn.bias_h.toArray(),
      nn.bias_o.toArray()
    ];
    for (let arr of arrays) {
      for (let val of arr) {
        this.genes.push(val);
      }
    }
  }

  // Ré-injecte les modifications dans le modèle
  injectToNN(nn) {
    let index = 0;
    
    // weights_ih
    for (let i = 0; i < nn.weights_ih.rows; i++) {
      for (let j = 0; j < nn.weights_ih.cols; j++) {
        nn.weights_ih.data[i][j] = this.genes[index++];
      }
    }
    // weights_ho
    for (let i = 0; i < nn.weights_ho.rows; i++) {
      for (let j = 0; j < nn.weights_ho.cols; j++) {
        nn.weights_ho.data[i][j] = this.genes[index++];
      }
    }
    // bias_h
    for (let i = 0; i < nn.bias_h.rows; i++) {
      for (let j = 0; j < nn.bias_h.cols; j++) {
        nn.bias_h.data[i][j] = this.genes[index++];
      }
    }
    // bias_o
    for (let i = 0; i < nn.bias_o.rows; i++) {
      for (let j = 0; j < nn.bias_o.cols; j++) {
        nn.bias_o.data[i][j] = this.genes[index++];
      }
    }
  }

  crossover(partner) {
    let childGenes = [];
    let midpoint = floor(random(this.genes.length));
    for (let i = 0; i < this.genes.length; i++) {
      if (i > midpoint) childGenes[i] = this.genes[i];
      else childGenes[i] = partner.genes[i];
    }
    return new DNA(childGenes);
  }

  mutate(mutationRate) {
    for (let i = 0; i < this.genes.length; i++) {
      if (random(1) < mutationRate) {
        this.genes[i] += randomGaussian() * 0.5;
      }
    }
  }
}
