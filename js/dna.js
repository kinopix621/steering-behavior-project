class DNA {
  constructor(genes) {
    if (genes) {
      this.genes = genes;
    } else {
      this.genes = [];
    }
  }

  extractFromNN(nn) {
    this.genes = [];
    for (let i = 0; i < nn.weightMatrices.length; i++) {
      for (let v of nn.weightMatrices[i].toArray()) this.genes.push(v);
      for (let v of nn.biases[i].toArray()) this.genes.push(v);
    }
  }

  injectToNN(nn) {
    let index = 0;
    for (let wi = 0; wi < nn.weightMatrices.length; wi++) {
      let W = nn.weightMatrices[wi];
      for (let i = 0; i < W.rows; i++) {
        for (let j = 0; j < W.cols; j++) {
          W.data[i][j] = this.genes[index++];
        }
      }
      let B = nn.biases[wi];
      for (let i = 0; i < B.rows; i++) {
        for (let j = 0; j < B.cols; j++) {
          B.data[i][j] = this.genes[index++];
        }
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
