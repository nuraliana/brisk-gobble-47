// The simulation: three stages of rising danger, the farmer's hunt, and every hazard.
// The turkey flees from the bottom of the map to the exit at the top; the farmer patrols,
// spots the turkey inside his vision cone, chases, and searches the last place he saw it.
// Haystacks and bushes hide the turkey; corn is points; the oven burns and knives fly.
import { FARMER, FIELD, KNIFE, LIVES, STAGES, TURKEY, CORN_POINTS, STAGE_POINTS, ESCAPE_POINTS } from './config.js';

export const EVENT_NONE = 0;
export const EVENT_PICKUP = 1 << 0;
export const EVENT_SPOTTED = 1 << 1;
export const EVENT_HIT = 1 << 2;
export const EVENT_CAUGHT = 1 << 3;
export const EVENT_ESCAPED = 1 << 4;
export const EVENT_STAGE = 1 << 5;
export const EVENT_GOBBLE = 1 << 6;
export const EVENT_FOOTSTEP = 1 << 7;
export const EVENT_THROW = 1 << 8;
export const EVENT_BURN = 1 << 9;

const START = { x: 640, y: 655 };
const EXIT = { x: 560, y: 0, w: 160, h: 30 };
const TAU = Math.PI * 2;

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= TAU;
  while (d < -Math.PI) d += TAU;
  return d;
}

function circleHitsRect(cx, cy, r, rect) {
  const nx = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const ny = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy < r * r;
}

function pushCircleOutOfRect(circle, rect) {
  const nx = Math.max(rect.x, Math.min(circle.x, rect.x + rect.w));
  const ny = Math.max(rect.y, Math.min(circle.y, rect.y + rect.h));
  let dx = circle.x - nx;
  let dy = circle.y - ny;
  const d2 = dx * dx + dy * dy;
  if (d2 >= circle.radius * circle.radius) return;
  if (d2 > 0.0001) {
    const d = Math.sqrt(d2);
    circle.x = nx + (dx / d) * circle.radius;
    circle.y = ny + (dy / d) * circle.radius;
    return;
  }
  // Centre inside the rect: push out along the smallest penetration.
  const left = circle.x - rect.x;
  const right = rect.x + rect.w - circle.x;
  const top = circle.y - rect.y;
  const bottom = rect.y + rect.h - circle.y;
  const min = Math.min(left, right, top, bottom);
  if (min === left) circle.x = rect.x - circle.radius;
  else if (min === right) circle.x = rect.x + rect.w + circle.radius;
  else if (min === top) circle.y = rect.y - circle.radius;
  else circle.y = rect.y + rect.h + circle.radius;
}

/** True when the segment a->b crosses any wall rect (for the farmer's line of sight). */
function segmentBlocked(ax, ay, bx, by, walls) {
  for (const wall of walls) {
    // Slab test against the rect, expanded by nothing: a sight line is a thin ray.
    const dx = bx - ax;
    const dy = by - ay;
    let tmin = 0;
    let tmax = 1;
    if (dx === 0) {
      if (ax < wall.x || ax > wall.x + wall.w) continue;
    } else {
      let t1 = (wall.x - ax) / dx;
      let t2 = (wall.x + wall.w - ax) / dx;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) continue;
    }
    if (dy === 0) {
      if (ay < wall.y || ay > wall.y + wall.h) continue;
    } else {
      let t1 = (wall.y - ay) / dy;
      let t2 = (wall.y + wall.h - ay) / dy;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) continue;
    }
    return true;
  }
  return false;
}

/** Lay out one stage: walls, hides, corn, patrol route, oven and the sweeping knife. */
function buildStage(index, random) {
  const border = [
    { x: 0, y: 0, w: 560, h: 26 }, // farmhouse / barn / kitchen top wall, left of the door
    { x: 720, y: 0, w: 560, h: 26 },
    { x: 0, y: 0, w: 26, h: 720 },
    { x: 1254, y: 0, w: 26, h: 720 },
    { x: 0, y: 694, w: 1280, h: 26 },
  ];
  const stage = {
    walls: [...border],
    hides: [],
    corn: [],
    patrol: [],
    ovens: [],
    sweeper: null,
  };
  if (index === 0) {
    // Farmyard: the old barn on the left, a fence run, pumpkins, open grass.
    stage.walls.push(
      { x: 70, y: 110, w: 230, h: 150 }, // barn
      { x: 980, y: 130, w: 220, h: 26 }, // fence run
      { x: 980, y: 130, w: 26, h: 150 }, // fence corner
      { x: 420, y: 420, w: 180, h: 26 }, // low fence
    );
    stage.hides = [
      { x: 350, y: 180, r: 52, kind: 'hay' },
      { x: 900, y: 480, r: 52, kind: 'hay' },
      { x: 1080, y: 330, r: 46, kind: 'bush' },
      { x: 180, y: 520, r: 46, kind: 'bush' },
    ];
    stage.patrol = [
      { x: 350, y: 330 },
      { x: 950, y: 330 },
      { x: 950, y: 590 },
      { x: 350, y: 590 },
    ];
  } else if (index === 1) {
    // Barn: stalls along both sides, hay bales to hide behind.
    stage.walls.push(
      { x: 70, y: 90, w: 180, h: 90 }, // stall
      { x: 1030, y: 90, w: 180, h: 90 },
      { x: 70, y: 480, w: 180, h: 90 }, // stall
      { x: 1030, y: 480, w: 180, h: 90 },
      { x: 560, y: 300, w: 160, h: 60 }, // feed trough
    );
    stage.hides = [
      { x: 330, y: 170, r: 50, kind: 'hay' },
      { x: 950, y: 170, r: 50, kind: 'hay' },
      { x: 330, y: 560, r: 50, kind: 'hay' },
      { x: 950, y: 560, r: 50, kind: 'hay' },
      { x: 640, y: 430, r: 44, kind: 'hay' },
    ];
    stage.patrol = [
      { x: 640, y: 150 },
      { x: 950, y: 330 },
      { x: 640, y: 600 },
      { x: 330, y: 330 },
    ];
  } else {
    // Kitchen: the oven glows on the right, a table in the middle, counters up top.
    stage.walls.push(
      { x: 150, y: 280, w: 260, h: 110 }, // kitchen table
      { x: 900, y: 60, w: 160, h: 60 }, // counter
      { x: 220, y: 60, w: 160, h: 60 }, // counter
      { x: 1060, y: 180, w: 170, h: 170 }, // the oven itself
    );
    stage.ovens = [{ x: 900, y: 180, w: 160, h: 170 }]; // hot zone in front of the oven
    stage.sweeper = { x: 640, y: 470, dir: 1, speed: 150, minX: 300, maxX: 980, radius: 26 };
    stage.hides = [
      { x: 330, y: 600, r: 48, kind: 'bush' }, // potted herbs by the door
      { x: 950, y: 600, r: 48, kind: 'bush' },
      { x: 640, y: 170, r: 44, kind: 'hay' }, // a sack of flour? no — a hay bale dragged in
    ];
    stage.patrol = [
      { x: 500, y: 200 },
      { x: 850, y: 420 },
      { x: 500, y: 600 },
      { x: 850, y: 150 },
    ];
  }
  // Scatter corn, clear of walls, hides and the exit lane.
  let placed = 0;
  let guard = 0;
  while (placed < 10 && guard < 400) {
    guard += 1;
    const x = random.range(70, 1210);
    const y = random.range(90, 650);
    if (y < 80 && x > 520 && x < 760) continue;
    const probe = { x, y, radius: 16 };
    if (stage.walls.some((w) => circleHitsRect(x, y, 20, w))) continue;
    if (stage.hides.some((h) => Math.hypot(x - h.x, y - h.y) < h.r + 24)) continue;
    if (stage.corn.some((c) => Math.hypot(x - c.x, y - c.y) < 70)) continue;
    stage.corn.push({ x, y, taken: false, bob: random.range(0, TAU) });
    placed += 1;
  }
  return stage;
}

export function createWorld(random) {
  const state = {
    stageIndex: 0,
    stage: null,
    turkey: { x: START.x, y: START.y, angle: -Math.PI / 2, radius: TURKEY.radius, stamina: TURKEY.staminaMax, gobbleCd: 0, invuln: 0, hidden: false, moving: false, sprinting: false },
    farmer: { x: 640, y: 330, angle: Math.PI / 2, radius: FARMER.radius, mode: 'patrol', patrolIndex: 0, waitT: 0, lastSeen: { x: 640, y: 330 }, loseT: 0, throwCd: 1.5, target: null },
    knives: [],
    score: 0,
    lives: LIVES,
    distanceMeters: 0,
    cornEaten: 0,
    status: 'playing', // playing | stageclear | caught | escaped
    banner: null, // { title, sub, t }
    spottedT: 0, // counts down the SPOTTED! banner
    burnT: 0,
    stepT: 0,
    stageTime: 0,
  };

  function loadStage(index) {
    state.stageIndex = index;
    state.stage = buildStage(index, random);
    state.turkey.x = START.x;
    state.turkey.y = START.y;
    state.turkey.angle = -Math.PI / 2;
    state.turkey.invuln = 1;
    state.turkey.gobbleCd = 0;
    state.knives = [];
    state.burnT = 0;
    state.stageTime = 0;
    const patrol = state.stage.patrol;
    state.farmer.x = patrol[0].x;
    state.farmer.y = patrol[0].y;
    state.farmer.mode = 'patrol';
    state.farmer.patrolIndex = 1;
    state.farmer.waitT = 0;
    state.farmer.throwCd = 1.5;
  }

  function reset() {
    state.score = 0;
    state.lives = LIVES;
    state.distanceMeters = 0;
    state.cornEaten = 0;
    state.status = 'playing';
    state.banner = null;
    state.spottedT = 0;
    state.stepT = 0;
    loadStage(0);
  }

  function turkeyHidden() {
    const t = state.turkey;
    for (const hide of state.stage.hides) {
      if (Math.hypot(t.x - hide.x, t.y - hide.y) < hide.r) return true;
    }
    return false;
  }

  function farmerSeesTurkey() {
    const f = state.farmer;
    const t = state.turkey;
    const dx = t.x - f.x;
    const dy = t.y - f.y;
    const dist = Math.hypot(dx, dy);
    if (dist > FARMER.visionRange) return false;
    if (t.hidden && dist > 70) return false;
    const angleTo = Math.atan2(dy, dx);
    if (Math.abs(angleDiff(angleTo, f.angle)) > FARMER.visionHalfAngle && dist > 55) return false;
    if (segmentBlocked(f.x, f.y, t.x, t.y, state.stage.walls)) return false;
    return true;
  }

  function moveCircle(circle, dx, dy) {
    circle.x += dx;
    for (const wall of state.stage.walls) pushCircleOutOfRect(circle, wall);
    circle.y += dy;
    for (const wall of state.stage.walls) pushCircleOutOfRect(circle, wall);
    circle.x = Math.max(26 + circle.radius, Math.min(FIELD.width - 26 - circle.radius, circle.x));
    circle.y = Math.max(26 + circle.radius, Math.min(FIELD.height - 26 - circle.radius, circle.y));
  }

  function hurtPlayer(events, sourceX, sourceY) {
    const t = state.turkey;
    if (t.invuln > 0 || state.status !== 'playing') return events;
    state.lives -= 1;
    t.invuln = TURKEY.invulnerable;
    // Knock the turkey away from whatever hit it.
    const dx = t.x - sourceX;
    const dy = t.y - sourceY;
    const d = Math.hypot(dx, dy) || 1;
    moveCircle(t, (dx / d) * 46, (dy / d) * 46);
    events |= EVENT_HIT;
    if (state.lives <= 0) {
      state.status = 'caught';
      events |= EVENT_CAUGHT;
    }
    return events;
  }

  function throwKnife() {
    const f = state.farmer;
    const t = state.turkey;
    const angle = Math.atan2(t.y - f.y, t.x - f.x);
    state.knives.push({
      x: f.x + Math.cos(angle) * 30,
      y: f.y + Math.sin(angle) * 30,
      vx: Math.cos(angle) * KNIFE.speed,
      vy: Math.sin(angle) * KNIFE.speed,
      angle,
      spin: 0,
    });
    f.throwCd = FARMER.throwCooldown;
  }

  function step(dt, input) {
    if (state.status !== 'playing') return EVENT_NONE;
    let events = EVENT_NONE;
    const t = state.turkey;
    const f = state.farmer;
    const stage = state.stage;
    state.stageTime += dt;
    if (t.invuln > 0) t.invuln -= dt;
    if (t.gobbleCd > 0) t.gobbleCd -= dt;
    if (state.spottedT > 0) state.spottedT -= dt;
    if (f.throwCd > 0) f.throwCd -= dt;

    // --- Turkey movement, sprint and stamina ---
    const sprintWanted = input.sprint && t.stamina > 1 && (input.mx !== 0 || input.my !== 0);
    const speed = sprintWanted ? TURKEY.sprintSpeed : TURKEY.walkSpeed;
    t.sprinting = sprintWanted;
    t.moving = input.mx !== 0 || input.my !== 0;
    if (t.moving) {
      t.angle = Math.atan2(input.my, input.mx);
      moveCircle(t, input.mx * speed * dt, input.my * speed * dt);
      if (sprintWanted) t.stamina = Math.max(0, t.stamina - TURKEY.staminaDrain * dt);
      state.stepT += dt;
      const stepEvery = sprintWanted ? 0.2 : 0.3;
      if (state.stepT >= stepEvery) {
        state.stepT = 0;
        events |= EVENT_FOOTSTEP;
      }
    } else {
      t.stamina = Math.min(TURKEY.staminaMax, t.stamina + TURKEY.staminaRegen * dt);
    }
    if (!sprintWanted && !t.moving) t.stamina = Math.min(TURKEY.staminaMax, t.stamina + TURKEY.staminaRegen * dt);
    t.hidden = turkeyHidden();

    // --- Gobble: distract the farmer to this spot ---
    if (input.gobble && t.gobbleCd <= 0) {
      t.gobbleCd = TURKEY.gobbleCooldown;
      events |= EVENT_GOBBLE;
      if (f.mode !== 'chase') {
        f.mode = 'suspicious';
        f.waitT = FARMER.suspiciousSeconds;
        f.target = { x: t.x, y: t.y };
      }
    }

    // --- Distance escaped: how far up the farm the turkey has got, in metres ---
    const stageProgress = Math.max(0, Math.min(1, (START.y - t.y) / (START.y - 40)));
    const metres = state.stageIndex * 100 + Math.round(stageProgress * 100);
    if (metres > state.distanceMeters) state.distanceMeters = metres;

    // --- Corn ---
    for (const cob of stage.corn) {
      if (cob.taken) continue;
      if (Math.hypot(t.x - cob.x, t.y - cob.y) < TURKEY.radius + 14) {
        cob.taken = true;
        state.score += CORN_POINTS;
        state.cornEaten += 1;
        events |= EVENT_PICKUP;
      }
    }

    // --- The farmer's hunt ---
    const sees = farmerSeesTurkey();
    if (sees && f.mode !== 'chase') {
      f.mode = 'chase';
      f.loseT = 0;
      state.spottedT = 1.6;
      events |= EVENT_SPOTTED;
    }
    if (f.mode === 'chase') {
      if (sees) {
        f.lastSeen = { x: t.x, y: t.y };
        f.loseT = 0;
      } else {
        f.loseT += dt;
        if (f.loseT > FARMER.loseSightSeconds) {
          f.mode = 'search';
          f.waitT = 0;
        }
      }
      const target = sees ? t : f.lastSeen;
      const dx = target.x - f.x;
      const dy = target.y - f.y;
      const d = Math.hypot(dx, dy);
      if (d > 4) {
        f.angle = Math.atan2(dy, dx);
        moveCircle(f, (dx / d) * FARMER.chaseSpeed * dt, (dy / d) * FARMER.chaseSpeed * dt);
      }
      if (STAGES[state.stageIndex].knives && f.throwCd <= 0 && d < 400 && d > 90) {
        throwKnife();
        events |= EVENT_THROW;
      }
      if (d < FARMER.catchRadius + TURKEY.radius - 8) {
        events = hurtPlayer(events, f.x, f.y);
        if (state.status === 'playing') {
          // Caught but still alive: the farmer is shoved back and loses the trail.
          f.mode = 'search';
          f.lastSeen = { x: f.x, y: f.y };
          f.x -= Math.cos(f.angle) * 60;
          f.y -= Math.sin(f.angle) * 60;
        }
      }
    } else if (f.mode === 'suspicious') {
      f.waitT -= dt;
      if (f.target) f.angle = Math.atan2(f.target.y - f.y, f.target.x - f.x);
      if (f.waitT <= 0) f.mode = 'investigate';
    } else if (f.mode === 'investigate') {
      const target = f.target ?? f.lastSeen;
      const dx = target.x - f.x;
      const dy = target.y - f.y;
      const d = Math.hypot(dx, dy);
      if (d < 12) {
        f.mode = 'search';
        f.waitT = FARMER.searchSeconds;
      } else {
        f.angle = Math.atan2(dy, dx);
        moveCircle(f, (dx / d) * FARMER.searchSpeed * dt, (dy / d) * FARMER.searchSpeed * dt);
      }
    } else if (f.mode === 'search') {
      const dx = f.lastSeen.x - f.x;
      const dy = f.lastSeen.y - f.y;
      const d = Math.hypot(dx, dy);
      if (d > 10) {
        f.angle = Math.atan2(dy, dx);
        moveCircle(f, (dx / d) * FARMER.searchSpeed * dt, (dy / d) * FARMER.searchSpeed * dt);
      } else {
        f.waitT -= dt;
        f.angle += dt * 1.8; // look around
        if (f.waitT <= 0) f.mode = 'patrol';
      }
    } else {
      // Patrol: walk the route, pausing a beat at each post.
      const post = stage.patrol[f.patrolIndex];
      const dx = post.x - f.x;
      const dy = post.y - f.y;
      const d = Math.hypot(dx, dy);
      if (d < 10) {
        f.patrolIndex = (f.patrolIndex + 1) % stage.patrol.length;
      } else {
        f.angle = Math.atan2(dy, dx);
        moveCircle(f, (dx / d) * FARMER.patrolSpeed * dt, (dy / d) * FARMER.patrolSpeed * dt);
      }
    }

    // --- Thrown knives ---
    for (const knife of state.knives) {
      knife.x += knife.vx * dt;
      knife.y += knife.vy * dt;
      knife.angle += KNIFE.spin * dt;
      knife.spin += dt;
      if (knife.x < 20 || knife.x > FIELD.width - 20 || knife.y < 20 || knife.y > FIELD.height - 20) {
        knife.dead = true;
        continue;
      }
      if (stage.walls.some((w) => circleHitsRect(knife.x, knife.y, KNIFE.radius, w))) {
        knife.dead = true;
        continue;
      }
      if (Math.hypot(t.x - knife.x, t.y - knife.y) < TURKEY.radius + KNIFE.radius - 4) {
        knife.dead = true;
        events = hurtPlayer(events, knife.x - knife.vx * 0.05, knife.y - knife.vy * 0.05);
      }
    }
    state.knives = state.knives.filter((k) => !k.dead);

    // --- The oven's hot zone (kitchen) ---
    for (const oven of stage.ovens) {
      if (t.x > oven.x && t.x < oven.x + oven.w && t.y > oven.y && t.y < oven.y + oven.h) {
        state.burnT += dt;
        if (state.burnT > 0.55) {
          state.burnT = 0;
          events = hurtPlayer(events, oven.x + oven.w / 2, oven.y + oven.h / 2);
          events |= EVENT_BURN;
        }
      } else {
        state.burnT = Math.max(0, state.burnT - dt * 2);
      }
    }

    // --- The sweeping carving knife (kitchen) ---
    const sweeper = stage.sweeper;
    if (sweeper) {
      sweeper.x += sweeper.dir * sweeper.speed * dt;
      if (sweeper.x > sweeper.maxX) {
        sweeper.x = sweeper.maxX;
        sweeper.dir = -1;
      } else if (sweeper.x < sweeper.minX) {
        sweeper.x = sweeper.minX;
        sweeper.dir = 1;
      }
      if (Math.hypot(t.x - sweeper.x, t.y - sweeper.y) < TURKEY.radius + sweeper.radius - 6) {
        events = hurtPlayer(events, sweeper.x, sweeper.y);
      }
    }

    // --- The exit: through the door, into the next stage, or free ---
    if (t.x > EXIT.x && t.x < EXIT.x + EXIT.w && t.y < EXIT.y + EXIT.h + 14) {
      if (state.stageIndex >= 2) {
        state.score += ESCAPE_POINTS;
        state.status = 'escaped';
        events |= EVENT_ESCAPED;
      } else {
        state.score += STAGE_POINTS;
        state.stageIndex += 1;
        loadStage(state.stageIndex);
        state.status = 'stageclear';
        state.banner = {
          title: STAGES[state.stageIndex - 1].name + ' — CLEAR!',
          sub: STAGES[state.stageIndex].name + ': ' + STAGES[state.stageIndex].sub,
          t: 1.6,
        };
        events |= EVENT_STAGE;
      }
    }
    return events;
  }

  /** Stage a caught scene for a screenshot: farmer on top of the turkey, one life left. */
  function stageCaughtScene() {
    reset();
    state.lives = 1;
    state.score = 1240;
    state.distanceMeters = 187;
    state.cornEaten = 9;
    state.turkey.x = 545;
    state.turkey.y = 430;
    state.turkey.angle = Math.PI / 2;
    state.farmer.x = 640;
    state.farmer.y = 340;
    state.farmer.angle = Math.PI / 2;
    state.farmer.mode = 'chase';
    // The carving knife that just flew: mid-flight between farmer and turkey.
    state.knives.push({ x: 585, y: 390, vx: 0, vy: 0, angle: 2.4, spin: 0 });
    state.status = 'caught';
    state.spottedT = 0;
  }

  /** Stage an escaped scene for a screenshot: past the kitchen door, free at last. */
  function stageEscapedScene() {
    reset();
    loadStage(2);
    state.score = 3420;
    state.distanceMeters = 300;
    state.cornEaten = 24;
    // Top-left, clear of the EXIT door and of the ESCAPED! title: the old spot
    // (640, 40) sat right on top of the door sign.
    state.turkey.x = 180;
    state.turkey.y = 100;
    state.turkey.angle = -Math.PI / 2;
    state.farmer.x = 900;
    state.farmer.y = 300;
    state.farmer.mode = 'search';
    // Sweeping knife clear of the big hero turkey, out by the oven.
    state.stage.sweeper.x = 850;
    state.status = 'escaped';
  }

  return { state, reset, step, loadStage, stageCaughtScene, stageEscapedScene, EXIT };
}
