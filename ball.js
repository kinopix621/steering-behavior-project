class Ball {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.r = 10;
    this.reset();
  }

  reset() {
    this.x = width / 2;
    this.y = height / 2;
    // Serve toujours la balle avec un angle aléatoire, MAIS on évite la ligne droite
    let angle = random(-PI/4, PI/4);
    while (abs(angle) < 0.15) { // Angle minimal d'environ 8.5 degrés
      angle = random(-PI/4, PI/4);
    }
    
    let dir = random(1) > 0.5 ? 1 : -1;
    this.speed = 6;
    this.vx = cos(angle) * this.speed * dir;
    this.vy = sin(angle) * this.speed;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;

    if (this.y - this.r < 0 || this.y + this.r > height) {
      this.vy *= -1;
      this.y = constrain(this.y, this.r, height - this.r);
    }
  }

  show() {
    fill(255);
    noStroke();
    ellipse(this.x, this.y, this.r * 2);
  }

  isOut() {
    return (this.x < 0 || this.x > width);
  }
}
