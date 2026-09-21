import { hexToPixel, hexCorners } from '../utils/hex.js';
import { getFaction } from '../data/Factions.js';
import { TILE_TYPES } from '../data/Tile.js';

// Цвета по типу тайла (базовая заливка). Владелец — поверх, тонкой рамкой + затемнением.
const TYPE_COLORS = {
  [TILE_TYPES.PLAINS]:   '#2a3a2c',
  [TILE_TYPES.FOREST]:   '#1e3322',
  [TILE_TYPES.MOUNTAIN]: '#3a3a3a',
  [TILE_TYPES.WATER]:    '#1a2c44',
  [TILE_TYPES.URBAN]:    '#3a3140',
  [TILE_TYPES.RUINS]:    '#322b26',
};

export class StrategyRenderer {
  constructor({ screen, camera, state }) {
    this.screen = screen;
    this.camera = camera;
    this.state = state;
    this._cornersCache = null;
    this._cornersSize = 0;
  }

  _corners(size) {
    if (this._cornersSize !== size) {
      this._cornersCache = hexCorners(size);
      this._cornersSize = size;
    }
    return this._cornersCache;
  }

  _pathHex(ctx, x, y, corners) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const c = corners[i];
      const px = x + c.x;
      const py = y + c.y;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  render() {
    const { screen, camera, state } = this;
    const ctx = screen.ctx;
    const size = state.strategy.hexSize;
    const corners = this._corners(size);

    // Frustum: какие области мира видны сейчас
    const topLeft = camera.screenToWorld(0, 0);
    const bottomRight = camera.screenToWorld(screen.width, screen.height);
    const minX = Math.min(topLeft.x, bottomRight.x) - size * 2;
    const maxX = Math.max(topLeft.x, bottomRight.x) + size * 2;
    const minY = Math.min(topLeft.y, bottomRight.y) - size * 2;
    const maxY = Math.max(topLeft.y, bottomRight.y) + size * 2;

    ctx.save();
    camera.apply(ctx);

    const lineWidth = 1 / camera.zoom;

    // 1) Заливка по типу
    for (const tile of state.strategy.tiles.values()) {
      const { x, y } = hexToPixel(tile.q, tile.r, size);
      if (x < minX || x > maxX || y < minY || y > maxY) continue;

      this._pathHex(ctx, x, y, corners);
      ctx.fillStyle = TYPE_COLORS[tile.type] || '#222';
      ctx.fill();

      // Владельческая обводка
      if (tile.owner !== 'neutral') {
        ctx.strokeStyle = getFaction(tile.owner).color;
        ctx.lineWidth = Math.max(2, 3 / camera.zoom);
        ctx.stroke();
      } else {
        ctx.strokeStyle = '#2d333b';
        ctx.lineWidth = lineWidth;
        ctx.stroke();
      }
    }

    // 2) Столицы и гарнизоны
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const tile of state.strategy.tiles.values()) {
      const { x, y } = hexToPixel(tile.q, tile.r, size);
      if (x < minX || x > maxX || y < minY || y > maxY) continue;

      if (tile.capital) {
        ctx.fillStyle = '#e6e6e6';
        ctx.font = `bold ${Math.round(size * 0.7)}px system-ui, sans-serif`;
        ctx.fillText('★', x, y);
      } else if (tile.garrison > 0 && tile.owner === 'neutral') {
        ctx.fillStyle = 'rgba(230,230,230,0.75)';
        ctx.font = `${Math.round(size * 0.55)}px system-ui, sans-serif`;
        ctx.fillText(String(tile.garrison), x, y);
      }
    }

    // 3) Подсветка выбранной ячейки
    const sel = state.strategy.selected;
    if (sel) {
      const tile = state.getTile(sel.q, sel.r);
      if (tile) {
        const { x, y } = hexToPixel(tile.q, tile.r, size);
        this._pathHex(ctx, x, y, corners);
        ctx.fillStyle = 'rgba(88, 166, 255, 0.22)';
        ctx.fill();
        ctx.strokeStyle = '#58a6ff';
        ctx.lineWidth = Math.max(2, 3 / camera.zoom);
        ctx.stroke();
      }
    }

    ctx.restore();
  }
}