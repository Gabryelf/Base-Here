import { getFaction } from '../data/Factions.js';
import { FACTION_PLAYER } from '../data/Factions.js';
import { TILE_YIELDS } from '../data/Tile.js';

// Панель информации о выбранной ячейке + действия.
export class TilePanel {
  constructor(el, { state, bus }) {
    this.el = el;
    this.state = state;
    this.bus = bus;
    this._tileKey = null;
    this._bindActions();

    this.bus.on('strategy:tileSelected', ({ key }) => this.show(key));
    this.bus.on('tile:captured', ({ q, r }) => {
      if (`${q},${r}` === this._tileKey) this.show(this._tileKey);
    });
    this.bus.on('turn:started', () => this.show(this._tileKey));
    this.bus.on('mode:changed', ({ name }) => {
      if (name !== 'strategy') this.hide();
    });

    this._render();
  }

  hide() {
    this._tileKey = null;
    this.el.classList.remove('visible');
  }

  show(key) {
    if (!key) { this.hide(); return; }
    const tile = this.state.strategy.tiles.get(key);
    if (!tile) { this.hide(); return; }
    this._tileKey = key;
    this.el.classList.add('visible');
    this._render();
  }

  _bindActions() {
    this.el.addEventListener('click', (e) => {
      const action = e.target.getAttribute('data-action');
      if (!action || !this._tileKey) return;
      const tile = this.state.strategy.tiles.get(this._tileKey);
      if (!tile) return;
      this.bus.emit('ui:tileAction', { action, tile });
    });
  }

  _render() {
    if (!this._tileKey) return;
    const tile = this.state.strategy.tiles.get(this._tileKey);
    if (!tile) { this.hide(); return; }

    const faction = getFaction(tile.owner);
    const isPlayerTurn = this.state.currentFaction === FACTION_PLAYER;
    const isMine = tile.owner === FACTION_PLAYER;
    const isEnemy = tile.owner !== FACTION_PLAYER && tile.owner !== 'neutral';
    const isNeutral = tile.owner === 'neutral';

    const y = tile.getYield();

    // Доступные действия
    const actions = [];
    if (isNeutral && isPlayerTurn) {
      actions.push({ id: 'attack', label: 'Атаковать', disabled: tile.garrison === 0 ? true : false });
      actions.push({ id: 'capture', label: 'Захватить', disabled: tile.garrison > 0 });
    }
    if (isMine && isPlayerTurn && tile.hasLocation) {
      actions.push({ id: 'build', label: 'Строить' });
    }
    if (isEnemy && isPlayerTurn) {
      actions.push({ id: 'attack', label: 'Атаковать' });
    }

    const actionsHtml = actions.length
      ? `<div class="actions">${
          actions.map((a) => `
            <button class="btn" data-action="${a.id}" ${a.disabled ? 'disabled' : ''}>
              ${a.label}
            </button>`).join('')
        }</div>`
      : '';

    this.el.innerHTML = `
      <h3>
        <span class="swatch" style="background:${faction.color}"></span>
        ${faction.name} ${tile.capital ? '★' : ''}
      </h3>
      <div class="row"><span>Тип</span><b>${tile.type}</b></div>
      <div class="row"><span>Координаты</span><b>${tile.q}, ${tile.r}</b></div>
      ${tile.getTotalDefense()}
      ${tile.garrison > 0 ? `<div class="row"><span>Гарнизон</span><b>${tile.garrison}</b></div>` : ''}
      ${tile.hasLocation ? `<div class="row"><span>Локация</span><b>да</b></div>` : ''}
      <div class="row"><span>Доход</span><b>${y.credits}💰 / ${y.material}🔩 / ${y.energy}⚡</b></div>
      ${tile.hasLocation && tile.location
        ? `<div class="row"><span>Постройки</span><b>${tile.location.getBuildings().length}/6</b></div>`
        : ''}
      <div class="row"><span>Оборона</span><b>${tile.getTotalDefense()}</b></div>
      ${actionsHtml}
    `;
  }
}