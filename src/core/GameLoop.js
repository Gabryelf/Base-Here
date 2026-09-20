// Игровой цикл с requestAnimationFrame, разделяет update и render.
export class GameLoop {
    constructor({ update, render }) {
      this._update = update;
      this._render = render;
      this._running = false;
      this._last = 0;
      this._rafId = 0;
      this._tick = this._tick.bind(this);
    }
  
    start() {
      if (this._running) return;
      this._running = true;
      this._last = performance.now();
      this._rafId = requestAnimationFrame(this._tick);
    }
  
    stop() {
      this._running = false;
      cancelAnimationFrame(this._rafId);
    }
  
    _tick(now) {
      if (!this._running) return;
      const dt = Math.min((now - this._last) / 1000, 0.1); // clamp для таб-свапов
      this._last = now;
  
      try {
        this._update(dt);
        this._render(dt);
      } catch (err) {
        console.error('[GameLoop] error:', err);
      }
  
      this._rafId = requestAnimationFrame(this._tick);
    }
  }