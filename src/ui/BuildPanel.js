import { BUILDINGS, buildingsForSlot, getBuilding } from '../data/Buildings.js';
import { FACTION_PLAYER } from '../data/Factions.js';

// Панель строительства справа: список доступных построек для выбранного слота.
export class BuildPanel {
    constructor({ bus, state }) {
        this.bus = bus;
        this.state = state;
        this.selectedSlot = null;

        this.el = document.createElement('div');
        this.el.id = 'build-panel';
        Object.assign(this.el.style, {
            position: 'absolute',
            right: '12px', top: '64px', bottom: '70px',
            width: 'min(280px, 40vw)',
            background: 'rgba(22, 27, 34, 0.96)',
            border: '1px solid #2d333b',
            borderRadius: '10px',
            padding: '12px',
            overflowY: 'auto',
            display: 'none',
            fontSize: '13px',
            color: '#adbac7',
        });
        document.getElementById('ui-overlay').appendChild(this.el);

        this.bus.on('build:slotSelected', ({ slot }) => {
            this.selectedSlot = slot;
            this._render();
        });
        this.bus.on('build:updated', () => this._render());
        this.bus.on('mode:changed', ({ name }) => {
            if (name !== 'build') this.hide();
        });
        this.bus.on('resources:changed', () => this._render());

        this._bindClick();
    }

    show() { this.el.style.display = 'block'; this._render(); }
    hide() { this.el.style.display = 'none'; this.selectedSlot = null; }

    _bindClick() {
        this.el.addEventListener('click', (e) => {
            const buildId = e.target.getAttribute?.('data-build');
            const removeId = e.target.getAttribute?.('data-remove');
            if (buildId) {
                this.bus.emit('build:requestBuild', { buildingId: buildId });
            } else if (removeId) {
                this.bus.emit('build:requestRemove', { slotId: removeId });
            }
        });
    }

    _render() {
        const loc = this.state.build.activeLocation;
        if (!loc) { this.hide(); return; }

        const res = this.state.resources[FACTION_PLAYER];

        let html = `
      <div style="font-weight:600;color:#e6e6e6;font-size:14px;margin-bottom:8px">
        Строительство
      </div>
      <div style="margin-bottom:10px;font-size:12px">
        💰 ${res.credits}  🔩 ${res.material}  ⚡ ${res.energy}
      </div>
    `;

        if (!this.selectedSlot) {
            html += `<div style="padding:12px 0;color:#6e7681">
        Выберите слот на канвасе, чтобы увидеть доступные постройки.
      </div>`;
        } else {
            const slot = this.selectedSlot;
            html += `<div style="margin-bottom:8px">
        Слот: <b style="color:#e6e6e6">${slot.type}</b>
      </div>`;

            if (slot.buildingId) {
                const b = getBuilding(slot.buildingId);
                html += `
          <div style="padding:8px;border:1px solid #2d333b;border-radius:6px;margin-bottom:8px">
            <div style="color:#e6e6e6;font-weight:600">${b.name}</div>
            <div style="font-size:12px;margin-top:4px">${b.desc}</div>
          </div>
          <button class="btn" data-remove="${slot.id}" style="width:100%">Снести</button>
        `;
            } else {
                const available = buildingsForSlot(slot.type);
                for (const b of available) {
                    const affordable =
                        res.credits >= b.cost.credits &&
                        res.material >= b.cost.material &&
                        res.energy >= b.cost.energy;
                    html += `
            <div style="padding:8px;border:1px solid #2d333b;border-radius:6px;margin-bottom:8px">
              <div style="color:#e6e6e6;font-weight:600">${b.name}</div>
              <div style="font-size:12px;margin-top:2px">${b.desc}</div>
              <div style="font-size:11px;margin-top:4px;color:#8b949e">
                💰 ${b.cost.credits} · 🔩 ${b.cost.material} · ⚡ ${b.cost.energy}
              </div>
              <button class="btn" data-build="${b.id}"
                ${affordable ? '' : 'disabled'}
                style="width:100%;margin-top:6px">
                ${affordable ? 'Построить' : 'Не хватает ресурсов'}
              </button>
            </div>
          `;
                }
            }
        }

        this.el.innerHTML = html;
    }
}