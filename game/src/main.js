// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s
// steps (several in a slow frame, none in a fast one), and the renderer paints what is
// there. The game moves between five screens: title, play, paused, caught and escaped.
//
// ?seed=N fixes the layout. ?shot=start|play|caught|escaped (with &seed=N) stages that
// scene instead of running the loop, paints it twice and sets window.__shotReady.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import {
  createWorld,
  EVENT_BURN,
  EVENT_CAUGHT,
  EVENT_ESCAPED,
  EVENT_FOOTSTEP,
  EVENT_GOBBLE,
  EVENT_HIT,
  EVENT_PICKUP,
  EVENT_SPOTTED,
  EVENT_STAGE,
  EVENT_THROW,
} from './world.js';
import { ACTION_CONFIRM, ACTION_GOBBLE, ACTION_MUTE, ACTION_PAUSE, ACTION_RESTART, createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, hitButton, SCREEN_CAUGHT, SCREEN_ESCAPED, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function announce(message) {
  status.textContent = message;
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, performance.now() / 1000);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  world.reset(); // a world to draw behind the title screen, before the first run
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let endSoundPlayed = false;

  function startRun() {
    world.reset();
    screen = SCREEN_PLAY;
    endSoundPlayed = false;
    announce('Run! Reach the door at the top. Hide in the hay, grab corn, dodge the farmer.');
  }

  function playEvents(events) {
    if (events & EVENT_PICKUP) audio.pickup();
    if (events & EVENT_SPOTTED) audio.alarm();
    if (events & EVENT_HIT) audio.hurt();
    if (events & EVENT_GOBBLE) audio.gobble();
    if (events & EVENT_FOOTSTEP) audio.footstep(world.state.turkey.sprinting);
    if (events & EVENT_THROW) audio.whoosh();
    if (events & EVENT_BURN) audio.hurt();
    if (events & EVENT_STAGE) audio.stageClear();
    if (events & EVENT_ESCAPED) {
      audio.fanfare();
      screen = SCREEN_ESCAPED;
      announce(`Escaped! Score ${world.state.score}. Press R to run again.`);
    }
    if (events & EVENT_CAUGHT) {
      audio.caught();
      screen = SCREEN_CAUGHT;
      announce(`Caught! Score ${world.state.score}. Press R to try again.`);
    }
  }

  function frame(now) {
    const elapsed = Math.min(MAX_FRAME, (now - last) / 1000);
    last = now;
    const time = now / 1000;

    if (input.consume(ACTION_MUTE)) {
      const muted = audio.toggleMute();
      announce(muted ? 'Sound off.' : 'Sound on.');
    }

    const click = input.consumeClick();
    if (click) {
      audio.unlock();
      const action = hitButton(screen, click.x, click.y);
      if (screen === SCREEN_TITLE && action === 'start') startRun();
      else if ((screen === SCREEN_CAUGHT || screen === SCREEN_ESCAPED) && action === 'restart') startRun();
      else if (screen === SCREEN_PAUSED && action === 'resume') screen = SCREEN_PLAY;
      else if (screen === SCREEN_PAUSED && action === 'restart') startRun();
    }

    if (screen === SCREEN_TITLE) {
      if (input.consume(ACTION_CONFIRM) || input.consume(ACTION_GOBBLE)) {
        audio.unlock();
        startRun();
      }
    } else if (screen === SCREEN_PLAY) {
      if (input.consume(ACTION_PAUSE)) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      } else if (input.consume(ACTION_RESTART)) {
        startRun();
      } else {
        const gobblePressed = input.consume(ACTION_GOBBLE);
        if (gobblePressed) audio.unlock();
        accumulator += elapsed;
        let gobble = gobblePressed;
        while (accumulator >= STEP) {
          accumulator -= STEP;
          if (world.state.status === 'stageclear') {
            // The banner counts down outside the simulation, then play resumes.
            world.state.banner.t -= STEP;
            if (world.state.banner.t <= 0) world.state.status = 'playing';
            continue;
          }
          const events = world.step(STEP, {
            mx: input.move().x,
            my: input.move().y,
            sprint: input.sprinting(),
            gobble,
          });
          gobble = false;
          playEvents(events);
          if (world.state.status === 'caught' || world.state.status === 'escaped') {
            if (world.state.score > best) {
              best = world.state.score;
              saveBest(best);
            }
            break;
          }
        }
      }
    } else if (screen === SCREEN_PAUSED) {
      if (input.consume(ACTION_PAUSE)) screen = SCREEN_PLAY;
      else if (input.consume(ACTION_RESTART)) startRun();
    } else if (screen === SCREEN_CAUGHT || screen === SCREEN_ESCAPED) {
      if (!endSoundPlayed) {
        endSoundPlayed = true;
        if (screen === SCREEN_ESCAPED) audio.fanfare();
        else audio.caught();
      }
      if (input.consume(ACTION_RESTART) || input.consume(ACTION_CONFIRM) || input.consume(ACTION_GOBBLE)) {
        startRun();
      }
    }

    renderer.draw(world.state, screen, best, time);
    input.endFrame();
    requestAnimationFrame(frame);
  }

  // Exposed for automated play-testing only.
  window.__farmyard = {
    world,
    get screen() {
      return screen;
    },
    startRun,
  };

  announce('Farmyard Dash. Press Enter to start the escape.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
