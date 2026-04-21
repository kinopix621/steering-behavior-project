class Match {
  constructor(nnTopology, leftDNA, rightDNA) {
    this.leftPaddle = new Paddle(true, nnTopology, leftDNA);
    this.rightPaddle = new Paddle(false, nnTopology, rightDNA);
    this.ball = new Ball(width / 2, height / 2);
    
    this.alive = true;
    this.framesSurvived = 0;
  }

  update() {
    if (!this.alive) return;

    this.leftPaddle.predict(this.ball);
    this.rightPaddle.predict(this.ball);

    this.ball.update();
    this.framesSurvived++;

    // Vérification collision gauche
    if (this.ball.x - this.ball.r < this.leftPaddle.x + this.leftPaddle.w / 2 &&
        this.ball.y > this.leftPaddle.y - this.leftPaddle.h / 2 &&
        this.ball.y < this.leftPaddle.y + this.leftPaddle.h / 2) {
      
      this.ball.vx *= -1.05;
      this.ball.x = this.leftPaddle.x + this.leftPaddle.w / 2 + this.ball.r;
      this.leftPaddle.score++;
    }

    // Vérification collision droite
    if (this.ball.x + this.ball.r > this.rightPaddle.x - this.rightPaddle.w / 2 &&
        this.ball.y > this.rightPaddle.y - this.rightPaddle.h / 2 &&
        this.ball.y < this.rightPaddle.y + this.rightPaddle.h / 2) {
      
      this.ball.vx *= -1.05;
      this.ball.x = this.rightPaddle.x - this.rightPaddle.w / 2 - this.ball.r;
      this.rightPaddle.score++;
    }

    // Victoire ou balle qui sort
    if (this.ball.isOut() || this.framesSurvived >= lifetime) {
      this.alive = false;
      this.calculateFitnesses();
    }
  }

  calculateFitnesses() {
    let leftDist = constrain(abs(this.ball.y - this.leftPaddle.y), 1, height);
    let rightDist = constrain(abs(this.ball.y - this.rightPaddle.y), 1, height);

    this.leftPaddle.fitness = this.framesSurvived + (this.leftPaddle.score * 1000) + (1000 / leftDist);
    this.rightPaddle.fitness = this.framesSurvived + (this.rightPaddle.score * 1000) + (1000 / rightDist);
  }

  show() {
    stroke(255, 50);
    if (this.alive) {
      this.leftPaddle.show();
      this.rightPaddle.show();
      this.ball.show();
    }
  }
}
