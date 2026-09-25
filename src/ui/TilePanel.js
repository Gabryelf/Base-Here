import { getFaction, FACTION_PLAYER } from '../data/Factions.js';

const AP_COST_CAPTURE = 1;
const AP_COST_ATTACK = 2;
const AP_COST_BUILD_ENTER = 0;

export class TilePanel {
  constructor(el, { state, bus }) {
    this.el = el;
    this.state = state;
    this.bus = bus;
    this._tileKey = null;

    this.el.addEventListener('click', (e) => {
      const action = e.target.getAttribute?.('data-action');
      if (!action || !this._tileKey) return;
      const tile = this.state.strategy.tiles.get(this._tileKey);
      if (!tile) return;
      this.bus.emit('ui:tileAction', { action, tile });
    });

    this.bus.on('strategy:tileSelected', ({ key }) => this.show(key));
    this.bus.on('tile:captured', ({ q, r }) => {
      if (`${q},${r}` === this._tileKey) this.show(this._tileKey);
    });
    this.bus.on('turn:started', () => this.show(this._tileKey));
    this.bus.on('ap:changed', () => this.show(this._tileKey));
    this.bus.on('mode:changed', ({ name }) => { if (name !== 'strategy') this.hide(); });
  }

  hide() { this._tileKey = null; this.el.classList.remove('visible'); }

  show(key) {
    if (!key) { this.hide(); return; }
    const tile = this.state.strategy.tiles.get(key);
    if (!tile) { this.hide(); return; }
    this._tileKey = key;
    this.el.classList.add('visible');
    this._render();
  }

  _render() {
    if (!this._tileKey) return;
    const tile = this.state.strategy.tiles.get(this._tileKey);
    if (!tile) { this.hide(); return; }

    const state = this.state;
    const faction = getFaction(tile.owner);
    const isPlayerTurn = state.currentFaction === FACTION_PLAYER;
    const isMine = tile.owner === FACTION_PLAYER;
    const isEnemy = tile.owner !== FACTION_PLAYER && tile.owner !== 'neutral';
    const isNeutral = tile.owner === 'neutral';

    const y = tile.getYield();
    const ap = state.ap;
    const apMax = state.apMax;

    // Доступные действия
    const actions = [];
    if (isPlayerTurn) {
      if (isNeutral && tile.garrison === 0 && ap >= AP_COST_CAPTURE) {
        actions.push({ id: 'capture', label: `Захватить (${AP_COST_CAPTURE}AP)`, disabled: false });
      }
      if ((isNeutral && tile.garrison > 0) || isEnemy) {
        // Атака через бой
        const canAttack = state.getUnitsAt(FACTION_PLAYER, tile.key).length > 0 || this._hasAdjacentUnits(tile);
        actions.push({
          id: 'attack',
          label: `Атаковать (${AP_COST_ATTACK}AP)`,
          disabled: !canAttack || ap < AP_COST_ATTACK,
        });
      }
      if (isMine && tile.hasLocation) {
        actions.push({ id: 'build', label: 'Строить', disabled: false });
      }
    }

    const actionsHtml = actions.length
      ? `<div class="actions">${
          actions.map((a) => `<button class="btn" data-action="${a.id}" ${a.disabled ? 'disabled' : ''}>${a.label}</button>`).join('')
        }</div>`
      : '';

    const buildings = tile.location ? tile.location.getBuildings() : [];

    this.el.innerHTML = `
      <h3>
        <span class="swatch" style="background:${faction.color}"></span>
        ${faction.name} ${tile.capital ? '★' : ''}
      </h3>
      <div class="row"><span>Тип</span><b>${tile.type}</b></div>
      <div class="row"><span>Координаты</span><b>${tile.q}, ${tile.r}</b></div>
      ${tile.garrison > 0 && isNeutral ? `<div class="row"><span>Гарнизон</span><b>${tile.garrison}</b></div>` : ''}
      ${!isNeutral ? `<div class="row"><span>Оборона</span><b>${tile.getTotalDefense()}</b></div>` : ''}
      <div class="row"><span>Доход</span><b>${y.credits}💰 / ${y.material}🔩 / ${y.energy}⚡</b></div>
      ${tile.hasLocation ? `<div class="row"><span>Постройки</span><b>${buildings.length}/6</b></div>` : ''}
      ${isMine ? `<div class="row"><span>Войск</span><b>${state.countUnitsAt(FACTION_PLAYER, tile.key)}</b></div>` : ''}
      <div class="row"><span>AP</span><b>${ap}/${apMax}</b></div>
      ${actionsHtml}
    `;
  }

  _hasAdjacentUnits(tile) {
    // Есть ли у игрока юнит на соседнем тайле — для атаки
    const dirs = [
      {q:1,r:0},{q:1,r:-1},{q:0,r:-1},{q:-1,r:0},{q:-1,r:1},{q:0,r:1},
    ];
    for (const d of dirs) {
      const key = `${tile.q + d.q},${tile.r + d.r}`;
      if (this.state.getUnitsAt(FACTION_PLAYER, key).length > 0) return true;
    }
    return false;
  }
}