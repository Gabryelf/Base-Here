// Камера: мировые координаты <-> экранные. Пан и зум.
export class Camera {
    constructor(screen) {
      this.screen = screen;
      this.x = 0;      // смещение мира (в мировых единицах)
      this.y = 0;
      this.zoom = 1;
      this.minZoom = 0.3;
      this.maxZoom = 3;
    }
  
    worldToScreen(wx, wy) {
      return {
        x: (wx - this.x) * this.zoom + this.screen.width / 2,
        y: (wy - this.y) * this.zoom + this.screen.height / 2,
      };
    }
  
    screenToWorld(sx, sy) {
      return {
        x: (sx - this.screen.width / 2) / this.zoom + this.x,
        y: (sy - this.screen.height / 2) / this.zoom + this.y,
      };
    }
  
    panByScreen(dx, dy) {
      this.x -= dx / this.zoom;
      this.y -= dy / this.zoom;
    }
  
    zoomAtScreen(screenX, screenY, delta) {
      const before = this.screenToWorld(screenX, screenY);
      const nextZoom = Math.max(
        this.minZoom,
        Math.min(this.maxZoom, this.zoom * Math.pow(1.0015, -delta)),
      );
      this.zoom = nextZoom;
      const after = this.screenToWorld(screenX, screenY);
      // Сдвигаем так, чтобы точка под курсором осталась на месте
      this.x += before.x - after.x;
      this.y += before.y - after.y;
    }
  
    // Применяет трансформацию камеры к контексту канваса.
    apply(ctx) {
      ctx.translate(this.screen.width / 2, this.screen.height / 2);
      ctx.scale(this.zoom, this.zoom);
      ctx.translate(-this.x, -this.y);
    }
  }