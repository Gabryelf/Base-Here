// Единый ввод: мышь + тач. Транслирует в события mode через колбэки.
export class InputManager {
    constructor({ canvas, camera, onPointerDown, onPointerUp, onPointerMove }) {
      this.canvas = canvas;
      this.camera = camera;
      this.onPointerDown = onPointerDown;
      this.onPointerUp = onPointerUp;
      this.onPointerMove = onPointerMove;
  
      this._pointers = new Map(); // pointerId -> {x, y}
      this._dragStart = null;
      this._dragging = false;
      this._pinch = null;
  
      this._bind();
    }
  
    _bind() {
      const c = this.canvas;
      c.addEventListener('pointerdown', this._onDown, { passive: false });
      c.addEventListener('pointermove', this._onMove, { passive: false });
      c.addEventListener('pointerup', this._onUp, { passive: false });
      c.addEventListener('pointercancel', this._onUp, { passive: false });
      c.addEventListener('wheel', this._onWheel, { passive: false });
      c.addEventListener('contextmenu', (e) => e.preventDefault());
    }
  
    _getLocal(e) {
      const rect = this.canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
  
    _onDown = (e) => {
      e.preventDefault();
      this.canvas.setPointerCapture?.(e.pointerId);
      const p = this._getLocal(e);
      this._pointers.set(e.pointerId, p);
  
      if (this._pointers.size === 1) {
        this._dragStart = { ...p, world: this.camera.screenToWorld(p.x, p.y) };
        this._dragging = false;
      } else if (this._pointers.size === 2) {
        this._pinch = this._computePinch();
      }
    };
  
    _onMove = (e) => {
      const p = this._getLocal(e);
      if (!this._pointers.has(e.pointerId)) return;
      const prev = this._pointers.get(e.pointerId);
      this._pointers.set(e.pointerId, p);
  
      if (this._pointers.size === 2) {
        // pinch-zoom
        const pinch = this._computePinch();
        if (this._pinch) {
          const delta = this._pinch.distance - pinch.distance;
          this.camera.zoomAtScreen(pinch.cx, pinch.cy, delta * 2);
        }
        this._pinch = pinch;
        return;
      }
  
      if (this._pointers.size === 1 && this._dragStart) {
        const dx = p.x - prev.x;
        const dy = p.y - prev.y;
        if (Math.hypot(p.x - this._dragStart.x, p.y - this._dragStart.y) > 6) {
          this._dragging = true;
        }
        if (this._dragging) {
          this.camera.panByScreen(dx, dy);
        }
      }
    };
  
    _onUp = (e) => {
      const p = this._getLocal(e);
      const wasDragging = this._dragging;
      this._pointers.delete(e.pointerId);
      this.canvas.releasePointerCapture?.(e.pointerId);
  
      if (this._pointers.size < 2) this._pinch = null;
  
      if (this._pointers.size === 0) {
        const world = this.camera.screenToWorld(p.x, p.y);
        if (!wasDragging) {
          this.onPointerDown?.(world, p);
          this.onPointerUp?.(world, p);
        } else {
          this.onPointerUp?.(world, p);
        }
        this._dragStart = null;
        this._dragging = false;
      }
    };
  
    _onWheel = (e) => {
      e.preventDefault();
      const p = this._getLocal(e);
      this.camera.zoomAtScreen(p.x, p.y, e.deltaY);
    };
  
    _computePinch() {
      const [a, b] = [...this._pointers.values()];
      const cx = (a.x + b.x) / 2;
      const cy = (a.y + b.y) / 2;
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      return { cx, cy, distance };
    }
  }