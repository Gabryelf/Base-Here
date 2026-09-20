import { EventBus } from './core/EventBus.js';
import { GameLoop } from './core/GameLoop.js';
import { GameState } from './core/GameState.js';
import { ModeManager } from './core/ModeManager.js';
import { Screen } from './render/Screen.js';
import { Camera } from './render/Camera.js';
import { InputManager } from './input/InputManager.js';
import { StrategyMode } from './modes/StrategyMode.js';
import { PlaceholderMode } from './modes/PlaceholderMode.js';

function boot() {
  const canvas = document.getElementById('game-canvas');
  const debugPanel = document.getElementById('debug-panel');

  const bus = new EventBus();
  const state = new GameState();
  const screen = new Screen(canvas);
  const camera = new Camera(screen);

  const modeContext = { bus, state, screen, camera };
  const modeManager = new ModeManager(modeContext);

  const strategyMode = new StrategyMode(modeContext);
  const tacticalMode = new PlaceholderMode(modeContext, 'tactical', '#3fb950');
  const buildMode = new PlaceholderMode(modeContext, 'build', '#d29922');

  modeManager.register('strategy', strategyMode);
  modeManager.register('tactical', tacticalMode);
  modeManager.register('build', buildMode);

  const input = new InputManager({
    canvas,
    camera,
    onPointerDown: (world, screenPos) => modeManager.onPointerDown(world, screenPos),
    onPointerUp: (world, screenPos) => modeManager.onPointerUp(world, screenPos),
    onPointerMove: (world, screenPos) => modeManager.onPointerMove(world, screenPos),
  });

  // UI
  document.getElementById('btn-mode-strategy').addEventListener('click', () => {
    modeManager.switchTo('strategy');
  });
  document.getElementById('btn-mode-tactical').addEventListener('click', () => {
    modeManager.switchTo('tactical');
  });
  document.getElementById('btn-mode-build').addEventListener('click', () => {
    modeManager.switchTo('build');
  });
  document.getElementById('btn-end-turn').addEventListener('click', () => {
    state.turn += 1;
    bus.emit('turn:ended', { turn: state.turn });
  });

  // Реакции на события
  bus.on('mode:changed', ({ name }) => {
    console.log('[mode]', name);
  });
  bus.on('strategy:tileSelected', ({ q, r }) => {
    console.log('[tile]', q, r);
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

  let fps = 0;
  let fpsAcc = 0;
  let fpsFrames = 0;
  let fpsTimer = 0;
  function updateDebug() {
    // Простой счётчик FPS без раскачки
    fpsFrames++;
    fpsTimer += 1 / 60;
    if (fpsTimer >= 0.5) {
      fps = Math.round(fpsFrames / fpsTimer);
      fpsFrames = 0;
      fpsTimer = 0;
    }
    const s = state.strategy.selected;
    debugPanel.textContent =
      `mode: ${modeManager.currentName}\n` +
      `turn: ${state.turn}\n` +
      `fps:  ${fps}\n` +
      `zoom: ${camera.zoom.toFixed(2)}\n` +
      `cam:  ${camera.x.toFixed(0)}, ${camera.y.toFixed(0)}\n` +
      (s ? `sel:  ${s.q}, ${s.r}` : 'sel:  —');
  }

  modeManager.switchTo('strategy');
  loop.start();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}