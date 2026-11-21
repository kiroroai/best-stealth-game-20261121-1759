// input.js — one job: keyboard and mouse state for the game.
// Tracks held keys by code, converts canvas clicks into world coordinates,
// and calls back once per gesture so the audio system can unlock.

export class Input {
  constructor(canvas, onGesture) {
    this.keys = new Set();
    this.click = null;
    this.onGesture = onGesture || (() => {});
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
      if (!e.repeat) this.onGesture();
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
    canvas.addEventListener('mousedown', (e) => {
      this.onGesture();
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      this.click = {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    });
  }

  isDown(code) {
    return this.keys.has(code);
  }

  // Consume the pending click target, if any.
  takeClick() {
    const c = this.click;
    this.click = null;
    return c;
  }
}
