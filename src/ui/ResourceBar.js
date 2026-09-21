import { FACTION_PLAYER } from '../data/Factions.js';

// Верхняя панель ресурсов игрока.
export class ResourceBar {
  constructor(el, { state, bus }) {
    this.el = el;
    this.state = state;
    this.bus = bus;
    this._render();

    this.bus.on('resources:changed', () => this._render());
    this.bus.on('tile:captured', () => this._render());
  }

  _render() {
    const r = this.state.resources[FACTION_PLAYER];
    this.el.innerHTML = `
      <div class="res" title="Credits">
        <span class="dot" style="background:#d29922"></span>
        <b>${r.credits}</b>
      </div>
      <div class="res" title="Material">
        <span class="dot" style="background:#a371f7"></span>
        <b>${r.material}</b>
      </div>
      <div class="res" title="Energy">
        <span class="dot" style="background:#3fb950"></span>
        <b>${r.energy}</b>
      </div>
    `;
  }
}