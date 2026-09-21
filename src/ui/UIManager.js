import { ResourceBar } from './ResourceBar.js';
import { TilePanel } from './TilePanel.js';

// Собирает все HTML-панели вместе.
export class UIManager {
  constructor({ state, bus }) {
    this.resourceBar = new ResourceBar(
      document.getElementById('resource-bar'),
      { state, bus },
    );
    this.tilePanel = new TilePanel(
      document.getElementById('tile-panel'),
      { state, bus },
    );
  }
}