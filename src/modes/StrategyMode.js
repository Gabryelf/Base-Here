import { Mode } from '../core/Mode.js';
import { hexToPixel, pixelToHex, hexCorners, hexKey } from '../utils/hex.js';

export class StrategyMode extends Mode {
  constructor(ctx) {
    super(ctx);
    this._corners = null; // кэш формы гекса
  }

  onEnter() {
    this.ctx.state.mode = 'strategy';
  }

  update(_dt) {
    // TODO: логика хода, ИИ, ресурсы
  }

  render(_dt) {
    const { screen, camera, state } = this.ctx;
    const ctx2d = screen.ctx;
    const size = state.strategy.hexSize;
    const radius = state.strategy.gridRadius;

    if (!this._corners) this._corners = hexCorners(size);

    ctx2d.save();
    camera.apply(ctx2d);

    // Определяем видимую область в мировых координатах — грубый frustum
    const topLeft = camera.screenToWorld(0, 0);
    const bottomRight = camera.screenToWorld(screen.width, screen.height);
    const minX = Math.min(topLeft.x, bottomRight.x) - size * 2;
    const maxX = Math.max(topLeft.x, bottomRight.x) + size * 2;
    const minY = Math.min(topLeft.y, bottomRight.y) - size * 2;
    const maxY = Math.max(topLeft.y, bottomRight.y) + size * 2;

    ctx2d.lineWidth = 1 / camera.zoom;
    ctx2d.strokeStyle = '#2d333b';
    ctx2d.fillStyle = '#12161b';

    for (let q = -radius; q <= radius; q++) {
      const rMin = Math.max(-radius, -q - radius);
      const rMax = Math.min(radius, -q + radius);
      for (let r = rMin; r <= rMax; r++) {
        const { x, y } = hexToPixel(q, r, size);
        if (x < minX || x > maxX || y < minY || y > maxY) continue;

        ctx2d.beginPath();
        for (let i = 0; i < 6; i++) {
          const c = this._corners[i];
          const px = x + c.x;
          const py = y + c.y;
          if (i === 0) ctx2d.moveTo(px, py);
          else ctx2d.lineTo(px, py);
        }
        ctx2d.closePath();
        ctx2d.fill();
        ctx2d.stroke();
      }
    }

    // Подсветка выбранной ячейки
    const sel = state.strategy.selected;
    if (sel) {
      const { x, y } = hexToPixel(sel.q, sel.r, size);
      ctx2d.beginPath();
      for (let i = 0; i < 6; i++) {
        const c = this._corners[i];
        const px = x + c.x;
        const py = y + c.y;
        if (i === 0) ctx2d.moveTo(px, py);
        else ctx2d.lineTo(px, py);
      }
      ctx2d.closePath();
      ctx2d.fillStyle = 'rgba(88, 166, 255, 0.25)';
      ctx2d.fill();
      ctx2d.strokeStyle = '#58a6ff';
      ctx2d.lineWidth = 2 / camera.zoom;
      ctx2d.stroke();
    }

    ctx2d.restore();
  }

  onPointerDown(worldPos, _screenPos) {
    const { state } = this.ctx;
    const size = state.strategy.hexSize;
    const { q, r } = pixelToHex(worldPos.x, worldPos.y, size);
    if (Math.abs(q) > state.strategy.gridRadius) return;
    if (Math.abs(r) > state.strategy.gridRadius) return;
    if (Math.abs(q + r) > state.strategy.gridRadius) return;

    state.strategy.selected = { q, r };
    this.ctx.bus.emit('strategy:tileSelected', { q, r, key: hexKey(q, r) });
  }
}