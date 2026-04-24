class Match {
  constructor(nnTopology, leftDNA, rightDNA, gameConfig, matchOpts) {
    matchOpts = matchOpts || {};
    this.gameConfig = gameConfig;
    this.leftPaddle = new Paddle(true, nnTopology, leftDNA, gameConfig);
    if (matchOpts.rightBaselineTrack) {
      this.rightPaddle = new Paddle(false, nnTopology, null, gameConfig, {
        controlMode: 'track_ball'
      });
    } else {
      this.rightPaddle = new Paddle(false, nnTopology, rightDNA, gameConfig);
    }
    this.ball = new Ball(width / 2, height / 2, gameConfig);
    
    this.alive = true;
    this.framesSurvived = 0;
  }

  update() {
    if (!this.alive) return;

    this.leftPaddle.predict(this.ball);
    this.rightPaddle.predict(this.ball);

    this.ball.update(this.gameConfig.obstacles || []);
    this.framesSurvived++;

    // Vérification collision gauche
    if (this.ball.x - this.ball.r < this.leftPaddle.x + this.leftPaddle.w / 2 &&
        this.ball.y > this.leftPaddle.y - this.leftPaddle.h / 2 &&
        this.ball.y < this.leftPaddle.y + this.leftPaddle.h / 2) {
      let diff = this.ball.y - this.leftPaddle.y;
      let angle = map(diff, -this.leftPaddle.h / 2, this.leftPaddle.h / 2, -PI / 4, PI / 4);
      this.ball.vx = this.ball.speed * cos(angle);
      this.ball.vy = this.ball.speed * sin(angle);
      
      this.ball.x = this.leftPaddle.x + this.leftPaddle.w / 2 + this.ball.r;
      this.leftPaddle.score++;
    }

    // Vérification collision droite
    if (this.ball.x + this.ball.r > this.rightPaddle.x - this.rightPaddle.w / 2 &&
        this.ball.y > this.rightPaddle.y - this.rightPaddle.h / 2 &&
        this.ball.y < this.rightPaddle.y + this.rightPaddle.h / 2) {
      let diff = this.ball.y - this.rightPaddle.y;
      let angle = map(diff, -this.rightPaddle.h / 2, this.rightPaddle.h / 2, -PI / 4, PI / 4);
      this.ball.vx = -this.ball.speed * cos(angle);
      this.ball.vy = this.ball.speed * sin(angle);
      
      this.ball.x = this.rightPaddle.x - this.rightPaddle.w / 2 - this.ball.r;
      this.rightPaddle.score++;
    }

    // Victoire ou balle qui sort
    if (this.ball.isOut() || this.framesSurvived >= this.gameConfig.lifetime) {
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
