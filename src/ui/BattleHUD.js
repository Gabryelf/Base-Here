// HUD боя: заголовок, индикатор хода, кнопки.
export class BattleHUD {
    constructor({ bus, state }) {
        this.bus = bus;
        this.state = state;
        this.el = document.createElement('div');
        this.el.id = 'battle-hud';
        Object.assign(this.el.style, {
            position: 'absolute',
            left: '0', right: '0', bottom: '0',
            padding: '10px 12px',
            paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
            display: 'none',
            gap: '8px',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'linear-gradient(to top, rgba(0,0,0,0.7), rgba(0,0,0,0))',
        });
        document.getElementById('ui-overlay').appendChild(this.el);

        this.bus.on('battle:started', () => this.show());
        this.bus.on('battle:finished', () => this.hide());
        this.bus.on('battle:updated', () => this._render());
        this.bus.on('mode:changed', ({ name }) => {
            if (name !== 'tactical') this.hide();
        });

        this._bindClick();
    }

    show() {
        this.el.style.display = 'flex';
        this._render();
    }

    hide() {
        this.el.style.display = 'none';
    }

    _bindClick() {
        this.el.addEventListener('click', (e) => {
            const action = e.target.getAttribute?.('data-action');
            if (!action) return;
            this.bus.emit('battle:action', { action });
        });
    }

    _render() {
        const battle = this.state.tactical.battle;
        if (!battle) return;

        const isPlayer = battle.isPlayerTurn;
        const attackers = battle.grid.unitsOf(battle.attackerFaction).length;
        const defenders = battle.grid.unitsOf(battle.defenderFaction).length;

        this.el.innerHTML = `
        <div style="display:flex;gap:14px;align-items:center;font-size:13px;color:#adbac7">
          <b style="color:#e6e6e6;font-size:14px">Бой за локацию</b>
          <span>Ход ${battle.turn}</span>
          <span>Вы: <b style="color:#58a6ff">${attackers}</b></span>
          <span>Враг: <b style="color:#f85149">${defenders}</b></span>
          <span style="color:${isPlayer ? '#3fb950' : '#d29922'}">
            ${isPlayer ? '● ваш ход' : '● ход противника'}
          </span>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn" data-action="end-turn" ${isPlayer ? '' : 'disabled'}>Завершить ход</button>
          <button class="btn" data-action="retreat">Отступить</button>
        </div>
      `;
    }
}