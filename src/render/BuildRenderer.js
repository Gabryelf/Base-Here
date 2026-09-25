export class BuildRenderer {
    constructor({ screen, camera, state }) {
      this.screen = screen;
      this.camera = camera;
      this.state = state;
      this.selectedSlotId = null;
    }
  
    setSelected(slotId) { this.selectedSlotId = slotId; }
  
    render() {
      const { screen, camera, state } = this;
      const build = state.build;
      if (!build.activeLocation) return;
  
      const ctx = screen.ctx;
      ctx.save();
      camera.apply(ctx);
  
      const W = build.worldW, H = build.worldH;
  
      ctx.fillStyle = '#14181e';
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = '#2d333b';
      ctx.lineWidth = 2 / camera.zoom;
      ctx.strokeRect(0, 0, W, H);
  
      const r = build.slotRadius;
      for (const slot of build.activeLocation.slots) {
        const cx = slot.pos.x * W;
        const cy = slot.pos.y * H;
        const occupied = !!slot.buildingId;
        const isSel = slot.id === this.selectedSlotId;
  
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = occupied ? this._bColor(slot.buildingId) : this._sColor(slot.type);
        ctx.fill();
        ctx.lineWidth = Math.max(2, (isSel ? 4 : 2) / camera.zoom);
        ctx.strokeStyle = isSel ? '#58a6ff' : '#2d333b';
        ctx.stroke();
  
        ctx.fillStyle = '#0b0d10';
        ctx.font = `bold ${Math.round(r * 0.9)}px system-ui`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(occupied ? this._bIcon(slot.buildingId) : this._sIcon(slot.type), cx, cy);
  
        ctx.fillStyle = 'rgba(173, 186, 199, 0.9)';
        ctx.font = `${Math.round(r * 0.36)}px system-ui`;
        ctx.fillText(this._sLabel(slot.type), cx, cy + r + r * 0.45);
      }
  
      ctx.restore();
    }
  
    _sColor(t) {
      return { energy: '#2a2030', industrial: '#2a2a20',
               residential: '#202a30', military: '#2e1f1f',
               special: '#202a24' }[t] || '#222';
    }
    _sIcon(t) {
      return { energy: '⚡', industrial: '🏭', residential: '🏠',
               military: '🛡', special: '✦' }[t] || '·';
    }
    _sLabel(t) {
      return { energy: 'Энергия', industrial: 'Пром.', residential: 'Жильё',
               military: 'Воен.', special: 'Особый' }[t] || t;
    }
    _bColor(id) {
      return { solar_plant: '#d29922', fusion_reactor: '#d29922',
               factory: '#a371f7', mine: '#a371f7',
               arcology: '#58a6ff', housing: '#58a6ff',
               barracks: '#f85149', bunker: '#f85149',
               data_hub: '#3fb950', shield_array: '#3fb950' }[id] || '#6e7681';
    }
    _bIcon(id) {
      return { solar_plant: '☀', fusion_reactor: '☢',
               factory: '🏭', mine: '⛏',
               arcology: '🏙', housing: '🏠',
               barracks: '⚔', bunker: '🧱',
               data_hub: '☷', shield_array: '⌬' }[id] || '?';
    }
  
    slotAtWorld(wx, wy) {
      const b = this.state.build;
      if (!b.activeLocation) return null;
      for (const slot of b.activeLocation.slots) {
        const cx = slot.pos.x * b.worldW;
        const cy = slot.pos.y * b.worldH;
        if (Math.hypot(wx - cx, wy - cy) <= b.slotRadius) return slot;
      }
      return null;
    }
  }