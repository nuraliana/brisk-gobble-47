// The screenshot scenes behind ?shot=start|play|caught|escaped. The play scene stages
// the kitchen (stage 3) through the real rules: the turkey walks for the door while
// the farmer chases and throws a carving knife, so the frame shows the glowing oven,
// the sweeping knife, a thrown knife in flight and the chase at once — the same seed
// always gives the same frame. The caught and escaped scenes stage the real end
// states through the world's own scene builders.
import { STEP } from './config.js';
import { createWorld, EVENT_CAUGHT, EVENT_ESCAPED } from './world.js';
import { SCREEN_CAUGHT, SCREEN_ESCAPED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const SAMPLE = STEP;

/**
 * Stage the play shot in the kitchen: turkey in open ground, farmer chasing from
 * behind, a thrown knife in flight, the sweeping knife and the glowing oven all in
 * frame. Runs the real simulation briefly (the farmer's throw is the game's own
 * throwKnife), then freezes a live mid-run frame: score below the best, stamina
 * near full, no hit taken.
 */
function stagePlayShot(world) {
  world.reset();
  world.loadStage(2); // the kitchen: oven, sweeping knife, thrown knives
  const s = world.state;
  // Open tiles, centre-left: clear of the table, the counters and every hide.
  s.turkey.x = 520;
  s.turkey.y = 430;
  s.turkey.angle = -Math.PI / 2;
  s.turkey.stamina = 100;
  // Farmer behind and below, already chasing, about to throw.
  s.farmer.x = 320;
  s.farmer.y = 580;
  s.farmer.mode = 'chase';
  s.farmer.angle = Math.atan2(s.turkey.y - s.farmer.y, s.turkey.x - s.farmer.x);
  s.farmer.lastSeen = { x: s.turkey.x, y: s.turkey.y };
  s.farmer.throwCd = 0;
  // Sweeping knife mid-sweep, right of the turkey.
  s.stage.sweeper.x = 820;
  s.stage.sweeper.dir = -1;
  // Walk for the door, no sprint: the farmer closes in and throws on the first step.
  for (let t = 0; t < 0.35; t += SAMPLE) {
    if (s.status !== 'playing') break;
    world.step(SAMPLE, { mx: 0, my: -1, sprint: false, gobble: false });
  }
  // Freeze a live mid-run frame. Score below the best (cover BEST 300), stamina
  // near full, no hit taken (invulnerability off so the turkey draws solid).
  s.score = 250;
  s.cornEaten = 5;
  s.turkey.stamina = 96;
  s.turkey.invuln = 0;
  s.burnT = 0;
  return { screen: SCREEN_PLAY, best: 300 };
}

/**
 * Set `world` to the named scene and return the screen to draw over it and the best
 * score to show. Unknown names stage the title.
 */
export function stageShot(name, world) {
  if (name === 'caught') {
    world.stageCaughtScene();
    return { screen: SCREEN_CAUGHT, best: 1240 };
  }
  if (name === 'escaped') {
    world.stageEscapedScene();
    return { screen: SCREEN_ESCAPED, best: 3420 };
  }
  if (name === 'play') {
    return stagePlayShot(world);
  }
  world.reset();
  return { screen: SCREEN_TITLE, best: 300 };
}

export { EVENT_CAUGHT, EVENT_ESCAPED };
