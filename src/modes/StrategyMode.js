import { Mode } from '../core/Mode.js';
import { pixelToHex, hexKey } from '../utils/hex.js';
import { StrategyRenderer } from '../render/StrategyRenderer.js';

export class StrategyMode extends Mode {
  constructor(ctx) {
    super(ctx);
    this.renderer = new StrategyRenderer(ctx);
  }

  onEnter() { this.ctx.state.mode = 'strategy'; }
  render() { this.renderer.render(); }

  onPointerDown(worldPos) {
    const { state } = this.ctx;
    const size = state.strategy.hexSize;
    const { q, r } = pixelToHex(worldPos.x, worldPos.y, size);
    const key = hexKey(q, r);
    const tile = state.strategy.tiles.get(key);
    if (!tile) {
      state.strategy.selected = null;
      this.ctx.bus.emit('strategy:tileSelected', { key: null });
      return;
    }
    state.strategy.selected = { q, r };
    this.ctx.bus.emit('strategy:tileSelected', { q, r, key, tile });
  }
}