import { buildingsForSlot, getBuilding } from '../data/Buildings.js';
import { activeSynergies, nearlyActiveSynergies, SYNERGIES } from '../data/Synergies.js';
import { FACTION_PLAYER } from '../data/Factions.js';

export class BuildPanel {
  constructor({ bus, state }) {
    this.bus = bus;
    this.state = state;
    this.selectedSlot = null;

    this.el = document.createElement('div');
    this.el.id = 'build-panel';
    Object.assign(this.el.style, {
      position: 'absolute', right: '10px', top: '56px', bottom: '70px',
      width: 'min(320px, calc(100vw - 20px))',
      background: 'rgba(22, 27, 34, 0.97)',
      border: '1px solid #2d333b', borderRadius: '10px',
      padding: '12px', overflowY: 'auto', display: 'none',
      fontSize: '13px', color: '#adbac7',
    });
    document.getElementById('ui-overlay').appendChild(this.el);

    this.bus.on('build:slotSelected', ({ slot }) => { this.selectedSlot = slot; this._render(); });
    this.bus.on('build:updated', () => this._render());
    this.bus.on('mode:changed', ({ name }) => { if (name !== 'build') this.hide(); });
    this.bus.on('resources:changed', () => this._render());

    this.el.addEventListener('click', (e) => {
      const buildId = e.target.getAttribute?.('data-build');
      const removeId = e.target.getAttribute?.('data-remove');
      const close = e.target.getAttribute?.('data-close');
      if (close) this.bus.emit('mode:requestSwitch', { name: 'strategy' });
      else if (buildId) this.bus.emit('build:requestBuild', { buildingId: buildId });
      else if (removeId) this.bus.emit('build:requestRemove', { slotId: removeId });
    });
  }

  show() { this.el.style.display = 'block'; this._render(); }
  hide() { this.el.style.display = 'none'; this.selectedSlot = null; }

  _render() {
    const loc = this.state.build.activeLocation;
    if (!loc) { this.hide(); return; }
    const res = this.state.resources[FACTION_PLAYER];

    let html = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <b style="color:#e6e6e6;font-size:14px">Строительство</b>
        <button class="btn" data-close style="padding:4px 10px">Закрыть</button>
      </div>
      <div style="margin-bottom:10px;font-size:12px">
        💰 ${res.credits}  🔩 ${res.material}  ⚡ ${res.energy}
      </div>
    `;

    if (!this.selectedSlot) {
      html += `<div style="padding:10px 0;color:#6e7681">Выберите слот на канвасе.</div>`;
    } else {
      const slot = this.selectedSlot;
      html += `<div style="margin-bottom:8px">Слот: <b style="color:#e6e6e6">${slot.type}</b></div>`;

      if (slot.buildingId) {
        const b = getBuilding(slot.buildingId);
        html += `
          <div style="padding:8px;border:1px solid #2d333b;border-radius:6px;margin-bottom:8px">
            <div style="color:#e6e6e6;font-weight:600">${b.name}</div>
            <div style="font-size:12px;margin-top:4px">${b.desc}</div>
          </div>
          <button class="btn" data-remove="${slot.id}" style="width:100%">Снести (+50% ресурсов)</button>
        `;
      } else {
        // Покажем, какие синергии активируются от каждой постройки
        const currentIds = loc.getBuildings();
        const available = buildingsForSlot(slot.type);
        for (const b of available) {
          const wouldActivate = [];
          const wouldProgress = [];
          const testIds = [...currentIds, b.id];
          for (const s of activeSynergies(testIds)) {
            if (!activeSynergies(currentIds).find(x => x.id === s.id)) {
              wouldActivate.push(s);
            }
          }
          // Прогресс на 1 шаг
          for (const ns of nearlyActiveSynergies(testIds)) {
            wouldProgress.push(ns);
          }

          const affordable = this.state.canAfford(b.cost);
          const synergyHtml = wouldActivate
            .map(s => `<div style="color:#3fb950;font-size:11px;margin-top:2px">✔ Активирует: ${s.name}</div>`)
            .join('');
          const progressHtml = wouldProgress.length
            ? `<div style="color:#8b949e;font-size:11px;margin-top:2px">…Ближе к синергии (${wouldProgress.length})</div>`
            : '';

          html += `
            <div style="padding:8px;border:1px solid #2d333b;border-radius:6px;margin-bottom:8px">
              <div style="color:#e6e6e6;font-weight:600">${b.name}</div>
              <div style="font-size:12px;margin-top:2px">${b.desc}</div>
              <div style="font-size:11px;margin-top:4px;color:#8b949e">
                💰 ${b.cost.credits} · 🔩 ${b.cost.material} · ⚡ ${b.cost.energy}
              </div>
              ${synergyHtml}
              ${progressHtml}
              <button class="btn" data-build="${b.id}" ${affordable ? '' : 'disabled'}
                style="width:100%;margin-top:6px">
                ${affordable ? 'Построить' : 'Не хватает ресурсов'}
              </button>
            </div>
          `;
        }
      }
    }

    // Общий блок про синергии локации
    const current = activeSynergies(loc.getBuildings());
    if (current.length) {
      html += `<div style="margin-top:12px;padding-top:8px;border-top:1px solid #2d333b">
        <div style="font-size:12px;color:#3fb950;margin-bottom:4px">Активные синергии:</div>
        ${current.map(s => `<div style="font-size:11px;color:#adbac7">• ${s.name}: ${s.desc}</div>`).join('')}
      </div>`;
    }

    this.el.innerHTML = html;
  }
}