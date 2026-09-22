import { EventBus } from './core/EventBus.js';
import { GameLoop } from './core/GameLoop.js';
import { GameState } from './core/GameState.js';
import { ModeManager } from './core/ModeManager.js';
import { TurnManager } from './core/TurnManager.js';
import { Screen } from './render/Screen.js';
import { Camera } from './render/Camera.js';
import { InputManager } from './input/InputManager.js';
import { StrategyMode } from './modes/StrategyMode.js';
import { PlaceholderMode } from './modes/PlaceholderMode.js';
import { UIManager } from './ui/UIManager.js';
import { FACTION_PLAYER } from './data/Factions.js';
import { TacticalMode } from './modes/TacticalMode.js';

function boot() {
  const canvas = document.getElementById('game-canvas');
  const debugPanel = document.getElementById('debug-panel');
  const turnBanner = document.getElementById('turn-banner');

  const bus = new EventBus();
  const state = new GameState({ seed: Date.now() & 0xffff, radius: 8 });
  const screen = new Screen(canvas);
  const camera = new Camera(screen);

  const modeContext = { bus, state, screen, camera };
  const modeManager = new ModeManager(modeContext);

  const strategyMode = new StrategyMode(modeContext);
  const tacticalMode = new TacticalMode(modeContext);
  const buildMode = new PlaceholderMode(modeContext, 'build', '#d29922');

  modeManager.register('strategy', strategyMode);
  modeManager.register('tactical', tacticalMode);
  modeManager.register('build', buildMode);

  const turnManager = new TurnManager({ state, bus });

  // Ввод
  new InputManager({
    canvas, camera,
    onPointerDown: (world, screenPos) => modeManager.onPointerDown(world, screenPos),
    onPointerUp:   (world, screenPos) => modeManager.onPointerUp(world, screenPos),
    onPointerMove: (world, screenPos) => modeManager.onPointerMove(world, screenPos),
  });

  // UI
  new UIManager({ state, bus });

  // Центрируем камеру на столице игрока
  const playerCapital = [...state.strategy.tiles.values()]
    .find((t) => t.owner === FACTION_PLAYER && t.capital);
  if (playerCapital) {
    const size = state.strategy.hexSize;
    const SQRT3 = Math.sqrt(3);
    camera.x = size * (SQRT3 * playerCapital.q + (SQRT3 / 2) * playerCapital.r);
    camera.y = size * (1.5 * playerCapital.r);
  }

  // Кнопки режимов
  document.getElementById('btn-mode-strategy').addEventListener('click', () => {
    modeManager.switchTo('strategy');
  });
  document.getElementById('btn-mode-tactical').addEventListener('click', () => {
    modeManager.switchTo('tactical');
  });
  document.getElementById('btn-mode-build').addEventListener('click', () => {
    modeManager.switchTo('build');
  });

  // Кнопка "Конец хода"
  const btnEndTurn = document.getElementById('btn-end-turn');
  btnEndTurn.addEventListener('click', () => {
    if (!turnManager.isPlayerTurn()) return;
    turnManager.endTurn();
  });

  // Обновление состояния кнопки "Конец хода"
  function refreshEndTurnButton() {
    const isPlayer = turnManager.isPlayerTurn();
    btnEndTurn.disabled = !isPlayer;
    btnEndTurn.textContent = isPlayer ? 'Конец хода' : 'Ход противника…';
  }

  // Реакция на смену хода — баннер и обновление кнопки
  let bannerTimer = 0;
  bus.on('turn:started', ({ faction }) => {
    refreshEndTurnButton();
    // Показываем баннер "Ваш ход" / "Ход противника"
    const isPlayer = faction === FACTION_PLAYER;
    turnBanner.textContent = isPlayer ? 'Ваш ход' : 'Ход противника';
    turnBanner.classList.add('visible');
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => turnBanner.classList.remove('visible'), 900);

    // Автопрокрутка ИИ, если сейчас не ход игрока
    if (!isPlayer) {
      setTimeout(() => {
        // Проверяем актуальность, вдруг что-то изменилось
        if (!turnManager.isPlayerTurn()) turnManager.endTurn();
      }, 700);
    }
  });

  bus.on('turn:newRound', ({ turn }) => {
    console.log('[new round]', turn);
  });

  // Переключение режима по запросу из тактики
  bus.on('mode:requestSwitch', ({ name }) => {
    modeManager.switchTo(name);
  });

  // Клик по действиям из панели ячейки
  bus.on('ui:tileAction', ({ action, tile }) => {
    if (action === 'build') {
      state.build.locationKey = tile.key;
      modeManager.switchTo('build');
    } else if (action === 'attack') {
      state.tactical.locationKey = tile.key;
      modeManager.switchTo('tactical');
    } else if (action === 'capture') {
      // Нейтрал без гарнизона — захватываем сразу
      if (tile.owner === 'neutral' && tile.garrison === 0) {
        tile.owner = FACTION_PLAYER;
        tile.garrison = 1;
        bus.emit('tile:captured', { faction: FACTION_PLAYER, q: tile.q, r: tile.r });
      }
    }
  });

  // Игровой цикл
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
    debugPanel.textContent =
      `mode:  ${modeManager.currentName}\n` +
      `turn:  ${state.turn}  (${state.currentFaction})\n` +
      `fps:   ${fps}\n` +
      `zoom:  ${camera.zoom.toFixed(2)}\n` +
      `cam:   ${camera.x.toFixed(0)}, ${camera.y.toFixed(0)}\n` +
      (s ? `sel:   ${s.q}, ${s.r}` : 'sel:   —');
  }

  // Стартуем игру
  modeManager.switchTo('strategy');
  turnManager.start();
  loop.start();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}