import { buildingsForSlot, getBuilding } from '../data/Buildings.js';
import { activeSynergies, nearlyActiveSynergies } from '../data/Synergies.js';
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
    this.bus.on('ap:changed', () => this._render());

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
    const ap = this.state.ap;

    let html = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <b style="color:#e6e6e6;font-size:14px">Строительство</b>
        <button class="btn" data-close style="padding:4px 10px">Закрыть</button>
      </div>
      <div style="margin-bottom:10px;font-size:12px">
        💰 ${res.credits}  🔩 ${res.material}  ⚡ ${res.energy} · <b style="color:#58a6ff">${ap}AP</b>
      </div>
    `;

    if (!this.selectedSlot) {
      html += `<div style="padding:10px 0;color:#6e7681">Выберите слот на канвасе.</div>`;
    } else {
      const slot = this.selectedSlot;
      html += `<div style="margin-bottom:8px">Слот: <b style="color:#e6e6e6">${this._slotLabel(slot.type)}</b></div>`;

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
        const currentIds = loc.getBuildings();
        const currentActive = activeSynergies(currentIds).map((s) => s.id);
        const available = buildingsForSlot(slot.type);

        for (const b of available) {
          const testIds = [...currentIds, b.id];
          const testActive = activeSynergies(testIds);

          // Синергии, которые активируются от этой постройки
          const activates = testActive.filter((s) => !currentActive.includes(s.id));

          // Синергии, до которых один шаг (показываем иконки/название намёком)
          const near = nearlyActiveSynergies(testIds).map(({ synergy, missing }) => {
            const isHidden = synergy.hidden;
            return {
              name: isHidden ? '???' : synergy.name,
              missingName: isHidden ? '???' : (getBuilding(missing)?.name || missing),
              hidden: isHidden,
            };
          });

          const affordable = this.state.canAfford(b.cost);
          const canAP = this.state.canSpendAP(1);

          const activateHtml = activates.map((s) => {
            const label = s.hidden ? '??? (скрытая синергия)' : s.name;
            return `<div style="color:#3fb950;font-size:11px;margin-top:2px">✔ Активирует: ${label}</div>`;
          }).join('');

          const nearHtml = near.length
            ? `<div style="color:#d29922;font-size:11px;margin-top:2px">…Ближе к синергии: ${near.map((n) => n.hidden ? '???' : `«${n.name}»`).join(', ')}</div>`
            : '';

          html += `
            <div style="padding:8px;border:1px solid #2d333b;border-radius:6px;margin-bottom:8px">
              <div style="color:#e6e6e6;font-weight:600">${b.name}</div>
              <div style="font-size:12px;margin-top:2px">${b.desc}</div>
              <div style="font-size:11px;margin-top:4px;color:#8b949e">
                💰 ${b.cost.credits} · 🔩 ${b.cost.material} · ⚡ ${b.cost.energy} · 1AP
              </div>
              ${activateHtml}
              ${nearHtml}
              <button class="btn" data-build="${b.id}" ${(affordable && canAP) ? '' : 'disabled'}
                style="width:100%;margin-top:6px">
                ${(affordable && canAP) ? 'Построить' : (!canAP ? 'Нет AP' : 'Не хватает ресурсов')}
              </button>
            </div>
          `;
        }
      }
    }

    const current = activeSynergies(loc.getBuildings());
    if (current.length) {
      html += `<div style="margin-top:12px;padding-top:8px;border-top:1px solid #2d333b">
        <div style="font-size:12px;color:#3fb950;margin-bottom:4px">Активные синергии:</div>
        ${current.map((s) => `<div style="font-size:11px;color:#adbac7">• ${s.hidden ? '???' : s.name}: ${s.desc}</div>`).join('')}
      </div>`;
    }

    this.el.innerHTML = html;
  }

  _slotLabel(type) {
    return {
      energy: 'Энергия', industrial: 'Промышленность',
      residential: 'Жильё', military: 'Военный',
      special: 'Особый',
    }[type] || type;
  }
}