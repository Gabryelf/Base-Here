// Полноэкранный канвас + адаптация под DPR и resize.
export class Screen {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d', { alpha: false });
      this.width = 0;
      this.height = 0;
      this.dpr = 1;
  
      this._onResize = this._onResize.bind(this);
      window.addEventListener('resize', this._onResize);
      window.addEventListener('orientationchange', this._onResize);
  
      this._onResize();
    }
  
    _onResize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.width = w;
      this.height = h;
      this.dpr = dpr;
      this.canvas.width = Math.floor(w * dpr);
      this.canvas.height = Math.floor(h * dpr);
      this.canvas.style.width = w + 'px';
      this.canvas.style.height = h + 'px';
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  
    clear(color = '#0b0d10') {
      this.ctx.save();
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this.ctx.fillStyle = color;
      this.ctx.fillRect(0, 0, this.width, this.height);
      this.ctx.restore();
    }
  }