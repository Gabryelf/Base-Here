import { EventBus } from './core/EventBus.js';
import { GameLoop } from './core/GameLoop.js';
import { GameState } from './core/GameState.js';
import { ModeManager } from './core/ModeManager.js';
import { TurnManager } from './core/TurnManager.js';
import { Screen } from './render/Screen.js';
import { Camera } from './render/Camera.js';
import { InputManager } from './input/InputManager.js';
import { StrategyMode } from './modes/StrategyMode.js';
import { TacticalMode } from './modes/TacticalMode.js';
import { BuildMode } from './modes/BuildMode.js';
import { UIManager } from './ui/UIManager.js';
import { FACTION_PLAYER } from './data/Factions.js';
import { UNIT_TYPES } from './data/UnitTypes.js';
import { Unit } from './data/Unit.js';
import { SYNERGIES, activeSynergies } from './data/Synergies.js';

const AP_COST_CAPTURE = 1;
const AP_COST_ATTACK = 2;
const AP_COST_MOVE_UNIT = 1;
const AP_COST_RECRUIT = 1;

function boot() {
  const canvas = document.getElementById('game-canvas');
  const debugPanel = document.getElementById('debug-panel');
  const turnBanner = document.getElementById('turn-banner');
  const apBadge = document.getElementById('ap-badge');
  const armyModal = document.getElementById('army-modal');
  const armyModalContent = document.getElementById('army-modal-content');

  const bus = new EventBus();
  const state = new GameState({ seed: Date.now() & 0xffff, radius: 8 });
  const screen = new Screen(canvas);
  const camera = new Camera(screen);

  const modeContext = { bus, state, screen, camera };
  const modeManager = new ModeManager(modeContext);

  const strategyMode = new StrategyMode(modeContext);
  const tacticalMode = new TacticalMode(modeContext);
  const buildMode = new BuildMode(modeContext);
  modeManager.register('strategy', strategyMode);
  modeManager.register('tactical', tacticalMode);
  modeManager.register('build', buildMode);

  const turnManager = new TurnManager({ state, bus });

  new InputManager({
    canvas, camera,
    onPointerDown: (w, s) => modeManager.onPointerDown(w, s),
    onPointerUp:   (w, s) => modeManager.onPointerUp(w, s),
    onPointerMove: (w, s) => modeManager.onPointerMove(w, s),
  });

  new UIManager({ state, bus });

  // Центрируем камеру на столице
  const playerCapital = [...state.strategy.tiles.values()]
    .find((t) => t.owner === FACTION_PLAYER && t.capital);
  if (playerCapital) {
    const size = state.strategy.hexSize;
    const SQRT3 = Math.sqrt(3);
    camera.x = size * (SQRT3 * playerCapital.q + (SQRT3 / 2) * playerCapital.r);
    camera.y = size * (1.5 * playerCapital.r);
  }

  // ===== Обновление бейджа AP =====
  function refreshAP() {
    apBadge.textContent = `AP: ${state.ap}/${state.apMax}`;
    apBadge.style.opacity = state.ap === 0 ? '0.5' : '1';
  }
  bus.on('ap:changed', refreshAP);
  bus.on('turn:started', refreshAP);
  refreshAP();

  // ===== Кнопки верхнего уровня =====
  document.getElementById('btn-mode-strategy').addEventListener('click', () => {
    modeManager.switchTo('strategy');
  });
  document.getElementById('btn-army').addEventListener('click', () => openArmyModal());
  document.getElementById('btn-synergies').addEventListener('click', () => openSynergiesModal());

  // ===== Кнопка конца хода =====
  const btnEndTurn = document.getElementById('btn-end-turn');
  btnEndTurn.addEventListener('click', () => {
    if (!turnManager.isPlayerTurn()) return;
    turnManager.endTurn();
  });

  function refreshEndTurnButton() {
    const isPlayer = turnManager.isPlayerTurn();
    btnEndTurn.disabled = !isPlayer;
    btnEndTurn.textContent = isPlayer ? 'Конец хода' : 'Ход противника…';
    btnEndTurn.classList.toggle('primary', isPlayer);
  }

  let bannerTimer = 0;
  bus.on('turn:started', ({ faction }) => {
    refreshEndTurnButton();
    const isPlayer = faction === FACTION_PLAYER;
    turnBanner.textContent = isPlayer ? `Ваш ход — ${state.turn}` : 'Ход противника';
    turnBanner.classList.add('visible');
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => turnBanner.classList.remove('visible'), 800);

    if (!isPlayer) {
      setTimeout(() => {
        if (!turnManager.isPlayerTurn()) turnManager.endTurn();
      }, 900);
    }
  });

  bus.on('turn:newRound', ({ turn }) => {
    // Починка: юниты восстанавливают 1 HP в начале нового круга (если не в бою)
    for (const u of state.getArmy(FACTION_PLAYER)) {
      if (u.alive && u.hp < u.maxHp) u.heal(1);
    }
  });

  bus.on('mode:requestSwitch', ({ name }) => modeManager.switchTo(name));

  // ===== ИИ атакует игрока =====
  bus.on('ai:attackPlayer', ({ faction, targetKey, unitId }) => {
    const tile = state.strategy.tiles.get(targetKey);
    if (!tile || tile.owner !== FACTION_PLAYER) return;
    // Открываем бой, но атакует ИИ — то есть игрок становится защитником
    state.tactical.config = {
      locationKey: targetKey,
      defenderFaction: faction,
      aiAttacker: true,
      aiUnitId: unitId,
    };
    modeManager.switchTo('tactical');
  });

  // ===== Действия с ячейкой =====
  bus.on('ui:tileAction', ({ action, tile }) => {
    if (action === 'build') {
      state.build.locationKey = tile.key;
      modeManager.switchTo('build');
    } else if (action === 'attack') {
      if (!state.canSpendAP(AP_COST_ATTACK)) return;
      state.tactical.config = {
        locationKey: tile.key,
        defenderFaction: tile.owner === 'neutral' ? 'neutral' : tile.owner,
        aiAttacker: false,
      };
      modeManager.switchTo('tactical');
    } else if (action === 'capture') {
      if (!state.canSpendAP(AP_COST_CAPTURE)) return;
      if (tile.owner === 'neutral' && tile.garrison === 0) {
        tile.owner = FACTION_PLAYER;
        tile.defense = tile.getTotalDefense();
        state.spendAP(AP_COST_CAPTURE);
        bus.emit('ap:changed');
        bus.emit('tile:captured', { faction: FACTION_PLAYER, q: tile.q, r: tile.r });
      }
    }
  });

  bus.on('ui:info', ({ text }) => {
    turnBanner.textContent = text;
    turnBanner.classList.add('visible');
    setTimeout(() => turnBanner.classList.remove('visible'), 1000);
  });

  // ===== Модальное окно «Армия» =====
  let armyTab = 'units'; // 'units' | 'recruit' | 'move'

  function openArmyModal() {
    armyTab = 'units';
    renderArmyModal();
    armyModal.classList.add('visible');
  }
  function closeArmyModal() { armyModal.classList.remove('visible'); }

  armyModal.addEventListener('click', (e) => {
    if (e.target === armyModal) closeArmyModal();
    const tab = e.target.getAttribute?.('data-tab');
    if (tab) { armyTab = tab; renderArmyModal(); return; }
    const close = e.target.getAttribute?.('data-close');
    if (close) { closeArmyModal(); return; }
    const recruit = e.target.getAttribute?.('data-recruit');
    if (recruit) { tryRecruit(recruit); return; }
    const moveUnit = e.target.getAttribute?.('data-move-unit');
    if (moveUnit) { startMoveUnit(parseInt(moveUnit, 10)); return; }
    const moveTo = e.target.getAttribute?.('data-move-to');
    if (moveTo) { doMoveUnit(moveTo); return; }
  });

  let moveUnitId = null;

  function renderArmyModal() {
    const units = state.getArmy(FACTION_PLAYER).filter((u) => u.alive);
    const tabsHtml = `
      <div class="tabs">
        <div class="tab ${armyTab === 'units' ? 'active' : ''}" data-tab="units">Мои войска (${units.length})</div>
        <div class="tab ${armyTab === 'recruit' ? 'active' : ''}" data-tab="recruit">Найм</div>
      </div>
    `;

    let body = '';
    if (armyTab === 'units') {
      if (units.length === 0) {
        body = `<div style="color:#6e7681;padding:12px 0">У вас нет войск. Откройте вкладку «Найм».</div>`;
      } else {
        body = units.map((u) => {
          const tile = state.strategy.tiles.get(u.locationKey);
          const locName = tile
            ? `${tile.q},${tile.r} ${tile.capital ? '★' : ''}`
            : '—';
          const hpFrac = Math.round((u.hp / u.maxHp) * 100);
          return `
            <div class="unit-card">
              <div class="icon" style="background:${u.def.color}22;color:${u.def.color};border:1px solid ${u.def.color}">${u.def.icon}</div>
              <div class="meta">
                <div class="name">${u.def.name}</div>
                <div class="sub">Локация: ${locName} · HP ${u.hp}/${u.maxHp}</div>
                <div class="hp-bar"><div style="width:${hpFrac}%"></div></div>
              </div>
              <button class="btn" data-move-unit="${u.id}">Переместить</button>
            </div>
          `;
        }).join('');
      }
    } else if (armyTab === 'recruit') {
      // Показываем все owned-локации и типы войск для найма
      const owned = state.getPlayerTiles().filter((t) => t.hasLocation);
      if (owned.length === 0) {
        body = `<div style="color:#6e7681">Нет локаций для найма.</div>`;
      } else {
        body = '';
        for (const type of Object.values(UNIT_TYPES)) {
          const affordable = state.canAfford(type.cost);
          const canAp = state.canSpendAP(AP_COST_RECRUIT);
          body += `
            <div style="padding:8px;border:1px solid #2d333b;border-radius:6px;margin-bottom:8px">
              <div style="color:#e6e6e6;font-weight:600">${type.name}</div>
              <div style="font-size:12px;margin-top:2px">${type.desc}</div>
              <div style="font-size:11px;color:#8b949e;margin-top:4px">
                HP ${type.hp} · ATK ${type.attack} · RNG ${type.range} · MOV ${type.move}
              </div>
              <div style="font-size:11px;color:#8b949e;margin-top:2px">
                Стоимость: 💰${type.cost.credits} 🔩${type.cost.material} ⚡${type.cost.energy} · ${AP_COST_RECRUIT}AP
              </div>
              <div style="margin-top:6px;display:flex;gap:4px;flex-wrap:wrap">
                ${owned.map((t) => `
                  <button class="btn" data-recruit="${type.id}" data-at="${t.key}"
                    ${(!affordable || !canAp) ? 'disabled' : ''}>
                    ${t.q},${t.r}${t.capital ? ' ★' : ''}
                  </button>
                `).join('')}
              </div>
            </div>
          `;
        }
      }
    }

    armyModalContent.innerHTML = `
      <h2>Армия <button class="btn" data-close>×</button></h2>
      ${tabsHtml}
      ${body}
    `;
  }

  // data-at не обрабатывался в общем клике — добавим
  armyModalContent.addEventListener('click', (e) => {
    const recruitBtn = e.target.closest?.('[data-recruit]');
    if (recruitBtn) {
      tryRecruit(recruitBtn.getAttribute('data-recruit'), recruitBtn.getAttribute('data-at'));
    }
  });

  function tryRecruit(typeId, atKey) {
    if (!atKey) return;
    const def = UNIT_TYPES[typeId];
    if (!def) return;
    if (!state.canAfford(def.cost)) {
      bus.emit('ui:info', { text: 'Не хватает ресурсов' }); return;
    }
    if (!state.canSpendAP(AP_COST_RECRUIT)) {
      bus.emit('ui:info', { text: 'Недостаточно AP' }); return;
    }
    const tile = state.strategy.tiles.get(atKey);
    if (!tile || tile.owner !== FACTION_PLAYER) return;

    state.spendCost(def.cost);
    state.spendAP(AP_COST_RECRUIT);
    state.addUnit(new Unit({ type: typeId, faction: FACTION_PLAYER, locationKey: atKey }));
    bus.emit('resources:changed', { faction: FACTION_PLAYER });
    bus.emit('ap:changed');
    renderArmyModal();
  }

  function startMoveUnit(unitId) {
    moveUnitId = unitId;
    // Переключаем вкладку на "выбор локации"
    const unit = state.getArmy(FACTION_PLAYER).find((u) => u.id === unitId);
    if (!unit) return;
    const owned = state.getPlayerTiles().filter((t) => t.hasLocation);
    armyModalContent.innerHTML = `
      <h2>Переместить «${unit.def.name}» <button class="btn" data-close>×</button></h2>
      <div style="color:#adbac7;font-size:12px;margin-bottom:8px">
        Стоимость: ${AP_COST_MOVE_UNIT}AP + 2💰
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        ${owned.map((t) => `
          <button class="btn" data-move-to="${t.key}" ${state.canSpendAP(AP_COST_MOVE_UNIT) ? '' : 'disabled'}>
            ${t.q},${t.r}${t.capital ? ' ★' : ''}
          </button>
        `).join('')}
      </div>
      <button class="btn" data-tab="units" style="margin-top:12px">← Назад</button>
    `;
  }

  function doMoveUnit(targetKey) {
    if (!moveUnitId) return;
    const unit = state.getArmy(FACTION_PLAYER).find((u) => u.id === moveUnitId);
    if (!unit) return;
    if (!state.canSpendAP(AP_COST_MOVE_UNIT)) return;
    const res = state.resources[FACTION_PLAYER];
    if (res.credits < 2) {
      bus.emit('ui:info', { text: 'Нужно 2💰 за перемещение' }); return;
    }
    res.credits -= 2;
    state.spendAP(AP_COST_MOVE_UNIT);
    unit.locationKey = targetKey;
    moveUnitId = null;
    bus.emit('resources:changed', { faction: FACTION_PLAYER });
    bus.emit('ap:changed');
    renderArmyModal();
  }

  // ===== Модальное окно «Синергии» =====
  function openSynergiesModal() {
    const all = SYNERGIES;
    const discovered = new Set();
    // Собираем все активные синергии у игрока
    for (const t of state.getPlayerTiles()) {
      if (!t.location) continue;
      for (const s of activeSynergies(t.location.getBuildings())) discovered.add(s.id);
    }
    const items = all.map((s) => {
      const isHidden = s.hidden && !discovered.has(s.id);
      const isActive = discovered.has(s.id);
      const title = isHidden ? '???' : s.name;
      const desc = isHidden ? 'Скрытая синергия. Постройте подходящие здания, чтобы открыть.' : s.desc;
      const hint = s.hint ? `<div style="font-size:11px;color:#8b949e;margin-top:4px">Намёк: ${s.hint}</div>` : '';
      const color = isActive ? '#3fb950' : isHidden ? '#6e7681' : '#d29922';
      return `
        <div style="padding:8px;border:1px solid ${isActive ? '#238636' : '#2d333b'};border-radius:6px;margin-bottom:6px">
          <div style="color:${color};font-weight:600">${title} ${isActive ? '✔' : ''}</div>
          <div style="font-size:12px;color:#adbac7;margin-top:2px">${desc}</div>
          ${hint}
        </div>
      `;
    }).join('');

    armyModalContent.innerHTML = `
      <h2>Синергии <button class="btn" data-close>×</button></h2>
      <div style="font-size:12px;color:#8b949e;margin-bottom:10px">
        Синергии активируются, когда на одной локации стоят определённые постройки.
      </div>
      ${items}
    `;
    armyModal.classList.add('visible');
  }

  // Кнопка «Отступить» из боя обрабатывается в BattleHUD через battle:action

  // ===== Игровой цикл =====
  const loop = new GameLoop({
    update: (dt) => modeManager.update(dt),
    render: (dt) => {
      screen.clear('#0b0d10');
      modeManager.render(dt);
      updateDebug();
    },
  });

  let fps = 0, fpsFrames = 0, fpsTimer = 0, lastT = performance.now();
  function updateDebug() {
    const now = performance.now();
    fpsFrames++;
    fpsTimer += (now - lastT) / 1000;
    lastT = now;
    if (fpsTimer >= 0.5) {
      fps = Math.round(fpsFrames / fpsTimer);
      fpsFrames = 0; fpsTimer = 0;
    }
    const s = state.strategy.selected;
    const army = state.getArmy(FACTION_PLAYER).filter((u) => u.alive).length;
    debugPanel.textContent =
      `mode:  ${modeManager.currentName}\n` +
      `turn:  ${state.turn}  (${state.currentFaction})\n` +
      `ap:    ${state.ap}/${state.apMax}\n` +
      `army:  ${army}\n` +
      `fps:   ${fps}`;
  }

  modeManager.switchTo('strategy');
  turnManager.start();
  loop.start();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}