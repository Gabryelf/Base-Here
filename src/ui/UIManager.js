import { ResourceBar } from './ResourceBar.js';
import { TilePanel } from './TilePanel.js';
import { BattleHUD } from './BattleHUD.js';

export class UIManager {
  constructor({ state, bus }) {
    this.resourceBar = new ResourceBar(
      document.getElementById('resource-bar'),
      { state, bus },
    );
    this.tilePanel = new TilePanel(
      document.getElementById('side-panel'),
      { state, bus },
    );
    this.battleHUD = new BattleHUD({ state, bus });
  }
}