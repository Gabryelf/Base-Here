import { hexToPixel, hexCorners } from '../utils/hex.js';
import { getFaction } from '../data/Factions.js';
import { TILE_TYPES } from '../data/Tile.js';
import { getBuilding } from '../data/Buildings.js';

const TYPE_COLORS = {
  [TILE_TYPES.PLAINS]:   '#2a3a2c',
  [TILE_TYPES.FOREST]:   '#1e3322',
  [TILE_TYPES.MOUNTAIN]: '#3a3a3a',
  [TILE_TYPES.WATER]:    '#1a2c44',
  [TILE_TYPES.URBAN]:    '#3a3140',
  [TILE_TYPES.RUINS]:    '#322b26',
};

const BUILDING_COLORS = {
  solar_plant: '#d29922', fusion_reactor: '#d29922',
  factory: '#a371f7', mine: '#a371f7',
  arcology: '#58a6ff', housing: '#58a6ff',
  barracks: '#f85149', bunker: '#f85149',
  data_hub: '#3fb950', shield_array: '#3fb950',
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
      if (i === 0) ctx.moveTo(x + c.x, y + c.y);
      else ctx.lineTo(x + c.x, y + c.y);
    }
    ctx.closePath();
  }

  render() {
    const { screen, camera, state } = this;
    const ctx = screen.ctx;
    const size = state.strategy.hexSize;
    const corners = this._corners(size);

    const topLeft = camera.screenToWorld(0, 0);
    const bottomRight = camera.screenToWorld(screen.width, screen.height);
    const minX = Math.min(topLeft.x, bottomRight.x) - size * 2;
    const maxX = Math.max(topLeft.x, bottomRight.x) + size * 2;
    const minY = Math.min(topLeft.y, bottomRight.y) - size * 2;
    const maxY = Math.max(topLeft.y, bottomRight.y) + size * 2;

    ctx.save();
    camera.apply(ctx);

    // 1) Заливка и обводка
    for (const tile of state.strategy.tiles.values()) {
      const { x, y } = hexToPixel(tile.q, tile.r, size);
      if (x < minX || x > maxX || y < minY || y > maxY) continue;

      this._pathHex(ctx, x, y, corners);
      ctx.fillStyle = TYPE_COLORS[tile.type] || '#222';
      ctx.fill();

      if (tile.owner !== 'neutral') {
        ctx.strokeStyle = getFaction(tile.owner).color;
        ctx.lineWidth = Math.max(2, 3 / camera.zoom);
      } else {
        ctx.strokeStyle = '#2d333b';
        ctx.lineWidth = 1 / camera.zoom;
      }
      ctx.stroke();
    }

    // 2) Иконки построек по периметру гекса
    for (const tile of state.strategy.tiles.values()) {
      const { x, y } = hexToPixel(tile.q, tile.r, size);
      if (x < minX || x > maxX || y < minY || y > maxY) continue;
      const summary = tile.getBuildingSummary();
      if (summary.length === 0) continue;

      const iconR = size * 0.13;
      const radius = size * 0.75;
      for (let i = 0; i < summary.length; i++) {
        const angle = (Math.PI * 2 * i) / summary.length - Math.PI / 2;
        const bx = x + Math.cos(angle) * radius;
        const by = y + Math.sin(angle) * radius;
        const col = BUILDING_COLORS[summary[i].id] || '#6e7681';

        ctx.beginPath();
        ctx.arc(bx, by, iconR, 0, Math.PI * 2);
        ctx.fillStyle = col;
        ctx.fill();
        ctx.strokeStyle = '#0b0d10';
        ctx.lineWidth = 1.5 / camera.zoom;
        ctx.stroke();
      }
    }

    // 3) Столицы, гарнизоны нейтралов, численность войск фракций
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const tile of state.strategy.tiles.values()) {
      const { x, y } = hexToPixel(tile.q, tile.r, size);
      if (x < minX || x > maxX || y < minY || y > maxY) continue;

      if (tile.capital) {
        ctx.fillStyle = '#e6e6e6';
        ctx.font = `bold ${Math.round(size * 0.6)}px system-ui`;
        ctx.fillText('★', x, y - size * 0.15);
      }

      if (tile.owner !== 'neutral') {
        const count = state.countUnitsAt(tile.owner, tile.key);
        if (count > 0) {
          const label = `⚔${count}`;
          ctx.font = `bold ${Math.round(size * 0.4)}px system-ui`;
          ctx.fillStyle = 'rgba(0,0,0,0.6)';
          const w = ctx.measureText(label).width + 8;
          const yy = y + size * 0.35;
          ctx.fillRect(x - w / 2, yy - size * 0.22, w, size * 0.38);
          ctx.fillStyle = getFaction(tile.owner).color;
          ctx.fillText(label, x, yy);
        }
      } else if (tile.garrison > 0) {
        ctx.fillStyle = 'rgba(230,230,230,0.75)';
        ctx.font = `${Math.round(size * 0.5)}px system-ui`;
        ctx.fillText(String(tile.garrison), x, y);
      }
    }

    // 4) Подсветка выбранного
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