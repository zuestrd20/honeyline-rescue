/** Deterministic fixed-step simulation, independent of browser and rendering. */
export const WIDTH = 720;
export const HEIGHT = 600;
export const TARGET_RADIUS = 19;
export const HIVE_RADIUS = 25;
export const BEE_RADIUS = 8;
export const LINE_RADIUS = 5;
export const FIXED_STEP = 1 / 120;
const EPS = 1e-7;
const GRID = 12;
const COLS = WIDTH / GRID;
const ROWS = HEIGHT / GRID;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const sq = n => n * n;
const dist2 = (a, b) => sq(a.x - b.x) + sq(a.y - b.y);

export function strokeLength(stroke) {
  let total = 0;
  for (let i = 1; i < stroke.length; i++) total += Math.hypot(stroke[i].x - stroke[i - 1].x, stroke[i].y - stroke[i - 1].y);
  return total;
}
export const totalInk = strokes => strokes.reduce((total, stroke) => total + strokeLength(stroke), 0);

export function closestPoint(point, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const t = clamp(((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy || 1), 0, 1);
  return { x: a.x + t * dx, y: a.y + t * dy };
}
const pointSegmentDistance2 = (p, a, b) => dist2(p, closestPoint(p, a, b));
const pointRectDistance2 = (p, r) => sq(p.x - clamp(p.x, r.x, r.x + r.w)) + sq(p.y - clamp(p.y, r.y, r.y + r.h));

// Liang–Barsky segment/rectangle clipping, including long strokes whose endpoints lie outside.
function segmentInRect(a, b, r, margin = 0) {
  const xmin = r.x - margin, xmax = r.x + r.w + margin;
  const ymin = r.y - margin, ymax = r.y + r.h + margin;
  const dx = b.x - a.x, dy = b.y - a.y;
  let enter = 0, leave = 1;
  for (const [p, q] of [[-dx, a.x - xmin], [dx, xmax - a.x], [-dy, a.y - ymin], [dy, ymax - a.y]]) {
    if (Math.abs(p) < EPS) { if (q < 0) return false; }
    else {
      const t = q / p;
      if (p < 0) enter = Math.max(enter, t);
      else leave = Math.min(leave, t);
      if (enter > leave) return false;
    }
  }
  return true;
}
function cross(a, b, c) { return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x); }
function segmentsDistance2(a, b, c, d) {
  const abC = cross(a, b, c), abD = cross(a, b, d), cdA = cross(c, d, a), cdB = cross(c, d, b);
  if (abC * abD < 0 && cdA * cdB < 0) return 0;
  return Math.min(pointSegmentDistance2(a, c, d), pointSegmentDistance2(b, c, d), pointSegmentDistance2(c, a, b), pointSegmentDistance2(d, a, b));
}

export function validateStroke(level, existing = [], input = []) {
  const remaining = Math.max(0, level.ink - totalInk(existing));
  const fail = reason => ({ ok: false, reason, stroke: [], length: 0, remaining });
  if (!Array.isArray(input) || input.some(p => !p || !Number.isFinite(p.x) || !Number.isFinite(p.y))) return fail('這條線無法辨識，請再試一次。');
  const stroke = input.filter((p, i) => !i || dist2(p, input[i - 1]) > .01).map(p => ({ x: p.x, y: p.y }));
  if (stroke.length < 2 || strokeLength(stroke) < 4) return fail('再畫長一點，就能留下防線。');
  if (stroke.some(p => p.x < LINE_RADIUS || p.x > WIDTH - LINE_RADIUS || p.y < LINE_RADIUS || p.y > HEIGHT - LINE_RADIUS)) return fail('請把防線畫在草地範圍內。');
  for (let i = 1; i < stroke.length; i++) {
    const a = stroke[i - 1], b = stroke[i];
    if (level.targets.some(t => pointSegmentDistance2(t, a, b) < sq(TARGET_RADIUS + LINE_RADIUS + 2))) return fail('留一點空間給糯米兔喔。');
    if (level.hives.some(h => pointSegmentDistance2(h, a, b) < sq(HIVE_RADIUS + LINE_RADIUS + 2))) return fail('請避開蜂巢再畫線。');
    // A 5px edge band forgives finger overshoot while still rejecting through-stone paths.
    if (level.terrain.some(r => { const inset = Math.min(5, r.w / 2 - .1, r.h / 2 - .1); return segmentInRect(a, b, { x: r.x + inset, y: r.y + inset, w: r.w - 2 * inset, h: r.h - 2 * inset }); })) return fail('可以接上石牆邊緣，但別穿過石牆。');
  }
  const length = strokeLength(stroke);
  if (length > remaining + .01) return fail('墨水不夠了，試著畫短一點或復原上一筆。');
  return { ok: true, reason: '', stroke, length, remaining: Math.max(0, remaining - length) };
}

function segmentsOf(strokes) {
  const out = [];
  for (const stroke of strokes) for (let i = 1; i < stroke.length; i++) out.push({ a: stroke[i - 1], b: stroke[i] });
  return out;
}
function clearPath(game, a, b, radius = BEE_RADIUS + .5) {
  if (game.level.terrain.some(r => segmentInRect(a, b, r, radius))) return false;
  return !game.segments.some(s => segmentsDistance2(a, b, s.a, s.b) < sq(radius + LINE_RADIUS));
}
function gridCenter(index) { return { x: (index % COLS + .5) * GRID, y: (Math.floor(index / COLS) + .5) * GRID }; }
function gridIndex(p) { return clamp(Math.floor(p.y / GRID), 0, ROWS - 1) * COLS + clamp(Math.floor(p.x / GRID), 0, COLS - 1); }

// A static flow field makes bees find real routes around stone walls and open line ends.
// Completely sealed shelters intentionally have no route; those bees buzz against the shield.
function buildNavigation(game) {
  const size = COLS * ROWS;
  const blocked = new Uint8Array(size);
  const radius = BEE_RADIUS + 1;
  for (let i = 0; i < size; i++) {
    const p = gridCenter(i);
    blocked[i] = p.x < radius || p.x > WIDTH - radius || p.y < radius || p.y > HEIGHT - radius ||
      game.level.terrain.some(r => pointRectDistance2(p, r) <= radius * radius) ||
      game.segments.some(s => pointSegmentDistance2(p, s.a, s.b) <= sq(radius + LINE_RADIUS)) ? 1 : 0;
  }
  const dirs = [[0, -1], [-1, 0], [1, 0], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]];
  return game.level.targets.map(target => {
    const distance = new Int32Array(size).fill(-1), next = new Int32Array(size).fill(-1);
    let start = -1, best = Infinity;
    for (let i = 0; i < size; i++) if (!blocked[i]) {
      const d = dist2(gridCenter(i), target);
      if (d < best) { start = i; best = d; }
    }
    if (start < 0) return { distance, next };
    const queue = new Int32Array(size); let head = 0, tail = 1;
    queue[0] = start; distance[start] = 0;
    while (head < tail) {
      const cell = queue[head++], x = cell % COLS, y = Math.floor(cell / COLS);
      for (const [dx, dy] of dirs) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) continue;
        const neighbor = ny * COLS + nx;
        if (blocked[neighbor] || distance[neighbor] >= 0) continue;
        if (dx && dy && (blocked[y * COLS + nx] || blocked[ny * COLS + x])) continue;
        if (!clearPath(game, gridCenter(cell), gridCenter(neighbor), radius)) continue;
        distance[neighbor] = distance[cell] + 1;
        next[neighbor] = cell;
        queue[tail++] = neighbor;
      }
    }
    return { distance, next };
  });
}

export function createGame(level, strokes = []) {
  const clean = [];
  for (const stroke of strokes) {
    const result = validateStroke(level, clean, stroke);
    if (!result.ok) throw new Error(result.reason);
    clean.push(result.stroke);
  }
  const game = {
    level, strokes: clean, segments: segmentsOf(clean), bees: [], elapsed: 0,
    status: 'running', accumulator: 0, tick: 0, hitTarget: null,
    spawned: level.hives.map(() => 0), nextSpawn: 0, inkUsed: totalInk(clean),
  };
  game.navigation = buildNavigation(game);
  spawnWave(game);
  return game;
}

function spawnWave(game) {
  game.level.hives.forEach((hive, hiveIndex) => {
    const count = game.spawned[hiveIndex];
    if (count >= (game.level.beeCount || 7)) return;
    const id = game.bees.length;
    const targetIndex = (hiveIndex + count) % game.level.targets.length;
    const target = game.level.targets[targetIndex];
    const angle = Math.atan2(target.y - hive.y, target.x - hive.x) + Math.sin(id * 2.399) * .42;
    game.bees.push({ id, x: hive.x + Math.cos(angle) * 15, y: hive.y + Math.sin(angle) * 15,
      vx: Math.cos(angle) * 24, vy: Math.sin(angle) * 24, angle, hiveIndex, targetIndex, wobble: id * 2.399, collisions: 0 });
    game.spawned[hiveIndex]++;
  });
  game.nextSpawn += .43;
}

function heading(game, bee) {
  const target = game.level.targets[bee.targetIndex];
  if (clearPath(game, bee, target)) return target;
  const nav = game.navigation[bee.targetIndex];
  let cell = gridIndex(bee);
  if (nav.distance[cell] < 0) {
    // Contact may nudge a bee into a blocked boundary cell. Recover a nearby navigable cell.
    const x = cell % COLS, y = Math.floor(cell / COLS);
    let best = Infinity, choice = -1;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) continue;
      const i = ny * COLS + nx, p = gridCenter(i);
      if (nav.distance[i] >= 0 && clearPath(game, bee, p) && nav.distance[i] + Math.hypot(p.x - bee.x, p.y - bee.y) / GRID < best) {
        best = nav.distance[i] + Math.hypot(p.x - bee.x, p.y - bee.y) / GRID; choice = i;
      }
    }
    if (choice < 0) return target;
    cell = choice;
  }
  let goal = gridCenter(cell);
  for (let i = 0; i < 7 && nav.next[cell] >= 0; i++) {
    const next = nav.next[cell], p = gridCenter(next);
    if (!clearPath(game, bee, p)) break;
    goal = p; cell = next;
  }
  return goal;
}

function removeInwardVelocity(bee, nx, ny) {
  const into = bee.vx * nx + bee.vy * ny;
  if (into < 0) { bee.vx -= into * nx; bee.vy -= into * ny; }
}
function resolveContacts(game, bee) {
  let touched = false;
  for (let pass = 0; pass < 3; pass++) {
    for (const r of game.level.terrain) {
      let px = clamp(bee.x, r.x, r.x + r.w), py = clamp(bee.y, r.y, r.y + r.h);
      let dx = bee.x - px, dy = bee.y - py, d = Math.hypot(dx, dy);
      if (d >= BEE_RADIUS) continue;
      if (d < EPS) {
        const faces = [{ d: bee.x - r.x, x: -1, y: 0 }, { d: r.x + r.w - bee.x, x: 1, y: 0 }, { d: bee.y - r.y, x: 0, y: -1 }, { d: r.y + r.h - bee.y, x: 0, y: 1 }].sort((a, b) => a.d - b.d);
        const f = faces[0]; bee.x += f.x * (f.d + BEE_RADIUS + .02); bee.y += f.y * (f.d + BEE_RADIUS + .02);
        removeInwardVelocity(bee, f.x, f.y);
      } else {
        const nx = dx / d, ny = dy / d;
        bee.x += nx * (BEE_RADIUS - d + .02); bee.y += ny * (BEE_RADIUS - d + .02);
        removeInwardVelocity(bee, nx, ny);
      }
      touched = true;
    }
    for (const s of game.segments) {
      const p = closestPoint(bee, s.a, s.b), dx = bee.x - p.x, dy = bee.y - p.y, d = Math.hypot(dx, dy);
      const radius = BEE_RADIUS + LINE_RADIUS;
      if (d >= radius) continue;
      let nx, ny;
      if (d > EPS) { nx = dx / d; ny = dy / d; }
      else { const length = Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y) || 1; nx = -(s.b.y - s.a.y) / length; ny = (s.b.x - s.a.x) / length; if (nx * bee.vx + ny * bee.vy > 0) { nx *= -1; ny *= -1; } }
      bee.x += nx * (radius - d + .02); bee.y += ny * (radius - d + .02);
      removeInwardVelocity(bee, nx, ny); touched = true;
    }
    if (bee.x < BEE_RADIUS) { bee.x = BEE_RADIUS; removeInwardVelocity(bee, 1, 0); }
    if (bee.x > WIDTH - BEE_RADIUS) { bee.x = WIDTH - BEE_RADIUS; removeInwardVelocity(bee, -1, 0); }
    if (bee.y < BEE_RADIUS) { bee.y = BEE_RADIUS; removeInwardVelocity(bee, 0, 1); }
    if (bee.y > HEIGHT - BEE_RADIUS) { bee.y = HEIGHT - BEE_RADIUS; removeInwardVelocity(bee, 0, -1); }
  }
  if (touched) bee.collisions++;
}

function fixedStep(game) {
  const dt = FIXED_STEP;
  if (game.elapsed + EPS >= game.nextSpawn) spawnWave(game);
  // Steering is calculated from the same pre-move positions for each fixed step.
  const desired = game.bees.map(bee => {
    const goal = heading(game, bee), dx = goal.x - bee.x, dy = goal.y - bee.y;
    const distance = Math.hypot(dx, dy) || 1, speed = game.level.speed || 108;
    let vx = dx / distance * speed, vy = dy / distance * speed;
    const flutter = Math.sin(game.elapsed * 5.4 + bee.wobble) * 11;
    vx += -dy / distance * flutter; vy += dx / distance * flutter;
    for (const other of game.bees) {
      if (bee === other) continue;
      const sx = bee.x - other.x, sy = bee.y - other.y, d = Math.hypot(sx, sy);
      if (d < 23 && d > .01) { const force = (23 - d) * 4; vx += sx / d * force; vy += sy / d * force; }
    }
    return { vx, vy };
  });
  game.bees.forEach((bee, i) => {
    bee.vx += (desired[i].vx - bee.vx) * dt * 5;
    bee.vy += (desired[i].vy - bee.vy) * dt * 5;
    // Adaptive conservative movement: a bee can never jump through a capsule or stone.
    const subdivisions = Math.max(1, Math.ceil(Math.hypot(bee.vx, bee.vy) * dt / (BEE_RADIUS * .4)));
    const slice = dt / subdivisions;
    for (let j = 0; j < subdivisions; j++) {
      bee.x += bee.vx * slice; bee.y += bee.vy * slice;
      resolveContacts(game, bee);
      for (let k = 0; k < game.level.targets.length; k++) {
        if (dist2(bee, game.level.targets[k]) < sq(BEE_RADIUS + TARGET_RADIUS - 2)) {
          game.status = 'lost'; game.hitTarget = k;
        }
      }
    }
    if (Math.hypot(bee.vx, bee.vy) > 1) bee.angle = Math.atan2(bee.vy, bee.vx);
  });
  game.tick++;
  game.elapsed = Math.min(game.level.seconds, game.tick * FIXED_STEP);
  if (game.status === 'running' && game.elapsed + EPS >= game.level.seconds) game.status = 'won';
}

/** dt is in seconds. Frame batching does not change the resulting simulation. */
export function stepGame(game, dt) {
  if (game.status !== 'running' || !Number.isFinite(dt) || dt <= 0) return game;
  game.accumulator += Math.min(dt, game.level.seconds + FIXED_STEP);
  while (game.accumulator + EPS >= FIXED_STEP && game.status === 'running') {
    fixedStep(game);
    game.accumulator = Math.max(0, game.accumulator - FIXED_STEP);
  }
  return game;
}
