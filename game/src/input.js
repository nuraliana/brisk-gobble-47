// Keyboard and mouse input. Keys are tracked by code so WASD and arrows both work;
// the canvas also reports clicks (menu buttons) as logical 1280x720 points.
export const ACTION_CONFIRM = 'confirm';
export const ACTION_PAUSE = 'pause';
export const ACTION_RESTART = 'restart';
export const ACTION_GOBBLE = 'gobble';
export const ACTION_MUTE = 'mute';

const KEY_ACTIONS = {
  Enter: ACTION_CONFIRM,
  Space: ACTION_GOBBLE,
  KeyP: ACTION_PAUSE,
  Escape: ACTION_PAUSE,
  KeyR: ACTION_RESTART,
  KeyM: ACTION_MUTE,
};

export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set();
  const clicks = [];

  function onKeyDown(event) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
    if (!event.repeat) pressed.add(event.code);
    keys.add(event.code);
  }
  function onKeyUp(event) {
    keys.delete(event.code);
  }
  function onBlur() {
    keys.clear();
  }
  function onPointerDown(event) {
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 1280;
    const y = ((event.clientY - rect.top) / rect.height) * 720;
    clicks.push({ x, y });
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('pointerdown', onPointerDown);

  return {
    /** Movement vector from held keys, normalised. */
    move() {
      let x = 0;
      let y = 0;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
      if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1;
      if (x !== 0 && y !== 0) {
        const inv = 1 / Math.hypot(x, y);
        x *= inv;
        y *= inv;
      }
      return { x, y };
    },
    sprinting() {
      return keys.has('ShiftLeft') || keys.has('ShiftRight');
    },
    /** True once for each fresh key press of the action, until consumed. */
    consume(action) {
      for (const code of pressed) {
        if (KEY_ACTIONS[code] === action) {
          pressed.delete(code);
          return true;
        }
      }
      return false;
    },
    consumeClick() {
      return clicks.shift() ?? null;
    },
    /** Clear one-frame presses at the end of the frame. */
    endFrame() {
      pressed.clear();
    },
  };
}
