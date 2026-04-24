class Ball {
  constructor(x, y, gameConfig) {
    this.gameConfig = gameConfig;
    this.x = x;
    this.y = y;
    this.r = gameConfig.ballRadius;
    this.reset();
  }

  reset() {
    let gc = this.gameConfig;
    this.x = width / 2;
    this.y = height / 2;
    this.r = gc.ballRadius;
    let angle = random(-PI / 4, PI / 4);
    while (abs(angle) < 0.15) {
      angle = random(-PI / 4, PI / 4);
    }

    let dir = random(1) > 0.5 ? 1 : -1;
    this.speed = gc.ballSpeed;
    this.vx = cos(angle) * this.speed * dir;
    this.vy = sin(angle) * this.speed;
  }

  update(obstacles) {
    this.x += this.vx;
    this.y += this.vy;

    if (this.y - this.r < 0 || this.y + this.r > height) {
      this.vy *= -1;
      this.y = constrain(this.y, this.r, height - this.r);
    }

    this.resolveObstacleCollisions(obstacles || []);
  }

  /**
   * Obstacles : centre (x,y), largeur w, hauteur h (rectMode CENTER).
   * Normale = du point le plus proche sur le bord vers le centre de la balle ; séparation puis rebond spéculaire (v' = v - 2(v·n)n) si v·n < 0.
   */
  resolveObstacleCollisions(obstacles) {
    let r = this.r;
    let sepEps = 0.35;
    for (let pass = 0; pass < 5; pass++) {
      for (let o of obstacles) {
        if (!o || o.w == null) continue;
        let hw = o.w * 0.5;
        let hh = o.h * 0.5;
        let minX = o.x - hw;
        let maxX = o.x + hw;
        let minY = o.y - hh;
        let maxY = o.y + hh;

        let qx = constrain(this.x, minX, maxX);
        let qy = constrain(this.y, minY, maxY);
        let dx = this.x - qx;
        let dy = this.y - qy;
        let dSq = dx * dx + dy * dy;

        let nx, ny;

        if (dSq < 1e-10) {
          let dL = this.x - minX;
          let dR = maxX - this.x;
          let dT = this.y - minY;
          let dB = maxY - this.y;
          let m = min(dL, dR, dT, dB);
          if (m === dL) {
            nx = -1;
            ny = 0;
            this.x = minX - r - sepEps;
          } else if (m === dR) {
            nx = 1;
            ny = 0;
            this.x = maxX + r + sepEps;
          } else if (m === dT) {
            nx = 0;
            ny = -1;
            this.y = minY - r - sepEps;
          } else {
            nx = 0;
            ny = 1;
            this.y = maxY + r + sepEps;
          }
        } else {
          let d = sqrt(dSq);
          if (d >= r - 1e-5) continue;
          nx = dx / d;
          ny = dy / d;
          let pen = r - d + sepEps;
          this.x += nx * pen;
          this.y += ny * pen;
        }

        let vn = this.vx * nx + this.vy * ny;
        if (vn < -1e-4) {
          this.vx -= 2 * vn * nx;
          this.vy -= 2 * vn * ny;
        }
      }
    }
  }

  show() {
    fill(255);
    noStroke();
    ellipse(this.x, this.y, this.r * 2);
  }

  isOut() {
    return this.x < 0 || this.x > width;
  }
}
