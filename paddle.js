class Paddle {
  // isLeft permet de savoir si on est à gauche ou à droite
  constructor(isLeft, dna) {
    this.isLeft = isLeft;
    this.w = 15;
    this.h = 80;
    this.y = height / 2;
    this.x = this.isLeft ? this.w : width - this.w * 2;
    
    // Vitesse de déplacement max
    this.maxSpeed = 10;
    
    // Statistiques pour l'évolution
    this.score = 0; 
    this.fitness = 0;
    
    // Timeline
    this.geneCounter = 0;

    // Si on lui passe un ADN (cas d'un enfant)
    if (dna) {
      this.dna = dna;
    } else {
      this.dna = new DNA();
    }
  }

  // Se déplace en fonction de sa bande magnétique d'actions
  update() {
    if (this.geneCounter < this.dna.genes.length) {
      // Lit le gène de la frame actuelle (-1 à 1)
      let movement = this.dna.genes[this.geneCounter];
      
      // On peut l'appliquer comme une vitesse
      this.y += movement * this.maxSpeed;
      this.y = constrain(this.y, this.h / 2, height - this.h / 2);
      
      this.geneCounter++;
    }
  }

  show() {
    fill(255);
    rectMode(CENTER);
    rect(this.x, this.y, this.w, this.h);
  }
}
