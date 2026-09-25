export class BattleHUD {
    constructor({ bus, state }) {
      this.bus = bus;
      this.state = state;
      this.el = document.createElement('div');
      this.el.id = 'battle-hud';
      Object.assign(this.el.style, {
        position: 'absolute', left: '0', right: '0', bottom: '0',
        padding: '10px 12px',
        paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
        display: 'none', gap: '8px',
        justifyContent: 'space-between', alignItems: 'center',
        background: 'linear-gradient(to top, rgba(0,0,0,0.75), rgba(0,0,0,0))',
      });
      document.getElementById('ui-overlay').appendChild(this.el);
  
      this.bus.on('battle:started', () => this.show());
      this.bus.on('battle:finished', () => this.hide());
      this.bus.on('battle:updated', () => this._render());
      this.bus.on('mode:changed', ({ name }) => { if (name !== 'tactical') this.hide(); });
      this.el.addEventListener('click', (e) => {
        const action = e.target.getAttribute?.('data-action');
        if (action) this.bus.emit('battle:action', { action });
      });
    }
  
    show() { this.el.style.display = 'flex'; this._render(); }
    hide() { this.el.style.display = 'none'; }
  
    _render() {
      const b = this.state.tactical.battle;
      if (!b) return;
      const isPlayer = b.isPlayerTurn;
      const attackers = b.grid.unitsOf(b.attackerFaction).length;
      const defenders = b.grid.unitsOf(b.defenderFaction).length;
      this.el.innerHTML = `
        <div style="display:flex;gap:12px;align-items:center;font-size:12px;color:#adbac7;flex-wrap:wrap">
          <b style="color:#e6e6e6;font-size:13px">Бой</b>
          <span>Ход ${b.turn}</span>
          <span>Вы: <b style="color:#58a6ff">${attackers}</b></span>
          <span>Враг: <b style="color:#f85149">${defenders}</b></span>
          <span style="color:${isPlayer ? '#3fb950' : '#d29922'}">
            ${isPlayer ? '● ваш ход' : '● ход противника'}
          </span>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn primary" data-action="end-turn" ${isPlayer ? '' : 'disabled'}>Завершить ход</button>
          <button class="btn danger" data-action="retreat">Отступить</button>
        </div>
      `;
    }
  }