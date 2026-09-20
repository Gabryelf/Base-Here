// Управляет активным режимом. Режимы регистрируются по имени.
export class ModeManager {
    constructor(context) {
      this._context = context;
      this._modes = new Map();
      this._current = null;
      this._currentName = null;
    }
  
    register(name, modeInstance) {
      this._modes.set(name, modeInstance);
    }
  
    get currentName() {
      return this._currentName;
    }
  
    switchTo(name) {
      if (!this._modes.has(name)) {
        console.warn(`[ModeManager] mode "${name}" not registered`);
        return;
      }
      if (this._current) {
        this._current.active = false;
        this._current.onExit();
      }
      this._current = this._modes.get(name);
      this._currentName = name;
      this._current.active = true;
      this._current.onEnter();
      this._context.bus.emit('mode:changed', { name });
    }
  
    update(dt) { this._current?.update(dt); }
    render(dt) { this._current?.render(dt); }
  
    onPointerDown(world, screen) { this._current?.onPointerDown(world, screen); }
    onPointerUp(world, screen)   { this._current?.onPointerUp(world, screen); }
    onPointerMove(world, screen) { this._current?.onPointerMove(world, screen); }
  }