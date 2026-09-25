import { Mode } from '../core/Mode.js';
import { BuildRenderer } from '../render/BuildRenderer.js';
import { BuildPanel } from '../ui/BuildPanel.js';
import { getBuilding } from '../data/Buildings.js';
import { FACTION_PLAYER } from '../data/Factions.js';

const AP_COST_BUILD = 1;
const AP_COST_REMOVE = 1;

export class BuildMode extends Mode {
  constructor(ctx) {
    super(ctx);
    this.renderer = new BuildRenderer(ctx);
    this.panel = new BuildPanel({ bus: ctx.bus, state: ctx.state });
    this._bound = false;
  }

  onEnter() {
    this.ctx.state.mode = 'build';
    const key = this.ctx.state.build.locationKey;
    if (!key) { this.ctx.bus.emit('mode:requestSwitch', { name: 'strategy' }); return; }
    const tile = this.ctx.state.strategy.tiles.get(key);
    if (!tile || !tile.location || tile.owner !== FACTION_PLAYER) {
      this.ctx.bus.emit('mode:requestSwitch', { name: 'strategy' });
      return;
    }

    this.ctx.state.build.activeLocation = tile.location;
    this.ctx.state.build.worldW = 800;
    this.ctx.state.build.worldH = 600;
    this.ctx.state.build.slotRadius = 56;

    const { width, height } = this.ctx.screen;
    this.ctx.camera.x = 400;
    this.ctx.camera.y = 300;
    this.ctx.camera.zoom = Math.min((width - 40) / 800, (height - 140) / 600, 1.2);

    this._bind();
    this.panel.show();
    this.ctx.bus.emit('build:updated');
  }

  onExit() {
    this.ctx.state.build.activeLocation = null;
    this.ctx.state.build.locationKey = null;
    this.panel.hide();
    this._unbind();
  }

  _bind() {
    if (this._bound) return;
    this._bound = true;
    this._onBuild = ({ buildingId }) => this._tryBuild(buildingId);
    this._onRemove = ({ slotId }) => this._tryRemove(slotId);
    this.ctx.bus.on('build:requestBuild', this._onBuild);
    this.ctx.bus.on('build:requestRemove', this._onRemove);
  }

  _unbind() {
    if (!this._bound) return;
    this._bound = false;
    this.ctx.bus.off('build:requestBuild', this._onBuild);
    this.ctx.bus.off('build:requestRemove', this._onRemove);
  }

  render() { this.renderer.render(); }

  onPointerDown(worldPos) {
    const slot = this.renderer.slotAtWorld(worldPos.x, worldPos.y);
    if (!slot) {
      this.renderer.setSelected(null);
      this.ctx.bus.emit('build:slotSelected', { slot: null });
      return;
    }
    this.renderer.setSelected(slot.id);
    this.ctx.bus.emit('build:slotSelected', { slot });
  }

  _tryBuild(buildingId) {
    const loc = this.ctx.state.build.activeLocation;
    const slot = this.renderer.selectedSlotId
      ? loc.slots.find((s) => s.id === this.renderer.selectedSlotId)
      : null;
    if (!slot) return;
    const b = getBuilding(buildingId);
    if (!b || !loc.canPlace(slot.id, b)) return;
    if (!this.ctx.state.canAfford(b.cost)) return;
    if (!this.ctx.state.canSpendAP(AP_COST_BUILD)) {
      this.ctx.bus.emit('ui:info', { text: 'Недостаточно AP' });
      return;
    }

    this.ctx.state.spendCost(b.cost);
    this.ctx.state.spendAP(AP_COST_BUILD);
    loc.place(slot.id, b.id);
    const tile = this.ctx.state.strategy.tiles.get(this.ctx.state.build.locationKey);
    if (tile) tile.defense = tile.getTotalDefense();

    this.ctx.bus.emit('resources:changed', { faction: FACTION_PLAYER });
    this.ctx.bus.emit('ap:changed', { ap: this.ctx.state.ap });
    this.ctx.bus.emit('build:updated');
    this.ctx.bus.emit('build:slotSelected', { slot });
  }

  _tryRemove(slotId) {
    const loc = this.ctx.state.build.activeLocation;
    if (!loc) return;
    const slot = loc.slots.find((s) => s.id === slotId);
    if (!slot || !slot.buildingId) return;
    if (!this.ctx.state.canSpendAP(AP_COST_REMOVE)) {
      this.ctx.bus.emit('ui:info', { text: 'Недостаточно AP' });
      return;
    }
    const b = getBuilding(slot.buildingId);
    if (b) this.ctx.state.refund(b.cost, 0.5);
    loc.remove(slotId);
    this.ctx.state.spendAP(AP_COST_REMOVE);
    const tile = this.ctx.state.strategy.tiles.get(this.ctx.state.build.locationKey);
    if (tile) tile.defense = tile.getTotalDefense();

    this.ctx.bus.emit('resources:changed', { faction: FACTION_PLAYER });
    this.ctx.bus.emit('ap:changed', { ap: this.ctx.state.ap });
    this.ctx.bus.emit('build:updated');
    this.ctx.bus.emit('build:slotSelected', { slot });
  }
}