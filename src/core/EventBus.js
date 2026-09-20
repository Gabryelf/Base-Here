// Простая шина событий. Слабая связность между модулями.
export class EventBus {
    constructor() {
      this._handlers = new Map();
    }
  
    on(type, handler) {
      if (!this._handlers.has(type)) this._handlers.set(type, new Set());
      this._handlers.get(type).add(handler);
      return () => this.off(type, handler);
    }
  
    off(type, handler) {
      const set = this._handlers.get(type);
      if (set) set.delete(handler);
    }
  
    emit(type, payload) {
      const set = this._handlers.get(type);
      if (!set) return;
      for (const handler of set) {
        try {
          handler(payload);
        } catch (err) {
          console.error(`[EventBus] handler error on "${type}"`, err);
        }
      }
    }
  }