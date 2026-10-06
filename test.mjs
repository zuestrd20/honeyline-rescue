import assert from 'node:assert/strict';
import { levels } from './levels.js';
import { createGame, stepGame, validateStroke, strokeLength, totalInk, FIXED_STEP, BEE_RADIUS, LINE_RADIUS, closestPoint } from './engine.js';
let assertions = 0;
function test(name, fn) { fn(); assertions++; console.log(`✓ ${name}`); }
const poly = (...p) => p.map(([x,y])=>({x,y}));

for (const level of levels) {
  test(`Level ${level.id}: hint is legal, stays within ink, and saves every bunny`, () => {
    const lines = [];
    for (const stroke of level.solution) {
      const result = validateStroke(level, lines, stroke);
      assert.equal(result.ok, true, result.reason);
      lines.push(result.stroke);
    }
    assert.ok(totalInk(lines) <= level.ink);
    const game = createGame(level, lines);
    stepGame(game, level.seconds + 1);
    assert.equal(game.status, 'won');
    assert.equal(game.elapsed, level.seconds);
    assert.ok(game.bees.length > 0);
    for (const bee of game.bees) assert.ok(Number.isFinite(bee.x) && Number.isFinite(bee.y));
  });
  test(`Level ${level.id}: an unprotected board loses`, () => {
    const game = createGame(level);
    stepGame(game, level.seconds + 1);
    assert.equal(game.status, 'lost');
    assert.ok(game.hitTarget >= 0);
  });
}

test('Fixed-step simulation is identical across frame rates', () => {
  const level = levels[15];
  const a = createGame(level, level.solution), b = createGame(level, level.solution);
  for (let i = 0; i < 240; i++) stepGame(a, 1 / 60);
  for (let i = 0; i < 120; i++) stepGame(b, 1 / 30);
  assert.equal(a.tick, b.tick);
  assert.deepEqual(a.bees, b.bees);
  assert.equal(a.elapsed, b.elapsed);
});

test('Ink measures the complete polyline, not endpoint distance', () => {
  assert.equal(strokeLength(poly([0,0],[30,40],[60,0])),100);
  const small = { ...levels[0], ink: 60 };
  assert.equal(validateStroke(small, [], poly([50,50],[80,90],[110,50])).ok, false);
});

test('Ink is shared across multiple legal strokes', () => {
  const level = { ...levels[0], ink: 120 };
  const first = poly([40,50],[140,50]);
  assert.equal(validateStroke(level, [], first).ok, true);
  assert.equal(validateStroke(level, [first], poly([40,70],[70,70])).ok, false);
});

test('Drawing cannot cross targets, hives, stone interiors, or meadow boundaries', () => {
  const level = levels[0];
  for (const stroke of [poly([280,420],[440,420]), poly([300,122],[420,122]), poly([200,470],[520,470]), poly([-1,20],[40,20])]) {
    assert.equal(validateStroke(level, [], stroke).ok, false);
  }
  assert.equal(validateStroke(level, [], poly([20,20],[20,20])).ok,false);
  assert.equal(validateStroke(level, [], [{x:NaN,y:20},{x:50,y:30}]).ok,false);
});

test('Long thin strokes cannot skip obstacles between samples', () => {
  const level = levels[2];
  assert.equal(validateStroke(level, [], poly([200,410],[510,410])).ok,false);
});

test('A small finger overshoot into a stone edge is legal, but a crossing is not', () => {
  const level=levels[0];
  assert.equal(validateStroke(level,[],poly([317,457],[317,377],[403,377],[403,457])).ok,true);
  assert.equal(validateStroke(level,[],poly([317,470],[317,377],[403,377],[403,470])).ok,false);
});

test('Separate strokes can touch and close a barrier', () => {
  const level = levels[0];
  const a=poly([317,454],[317,377],[360,377]);
  const b=poly([360,377],[403,377],[403,454]);
  assert.equal(validateStroke(level,[a],b).ok,true);
  const game=createGame(level,[a,b]);stepGame(game,level.seconds);assert.equal(game.status,'won');
});

test('A visible opening is genuinely unsafe, even when a partial barrier exists', () => {
  const level = levels[3];
  const game = createGame(level, [level.solution[0]]);
  stepGame(game, level.seconds);
  assert.equal(game.status, 'lost');
});

const collisionLevel = {id:99,ink:1000,seconds:20,targets:[{x:620,y:300}],hives:[{x:80,y:300}],terrain:[],beeCount:1};
test('High-speed bees do not tunnel through a drawn segment', () => {
  const wall=poly([360,100],[360,500]);
  const game=createGame(collisionLevel,[wall]);
  const bee=game.bees[0];Object.assign(bee,{x:290,y:300,vx:30000,vy:0});
  stepGame(game,FIXED_STEP);
  assert.ok(bee.x <= 360 - BEE_RADIUS - LINE_RADIUS + .1, `Bee crossed line: ${bee.x}`);
  const cp=closestPoint(bee,wall[0],wall[1]);assert.ok(Math.hypot(bee.x-cp.x,bee.y-cp.y)>=BEE_RADIUS+LINE_RADIUS-.1);
});
test('High-speed bees do not tunnel through solid terrain', () => {
  const level={...collisionLevel,terrain:[{x:360,y:100,w:12,h:400}]};
  const game=createGame(level);
  const bee=game.bees[0];Object.assign(bee,{x:290,y:300,vx:30000,vy:0});
  stepGame(game,FIXED_STEP);
  assert.ok(bee.x <= 360 - BEE_RADIUS + .1, `Bee crossed terrain: ${bee.x}`);
});

test('A finished game stays finished and does not spawn or move more bees', () => {
  const game=createGame(levels[0]);stepGame(game,10);
  const before=JSON.stringify({bees:game.bees,tick:game.tick,elapsed:game.elapsed,status:game.status});
  stepGame(game,100);assert.equal(JSON.stringify({bees:game.bees,tick:game.tick,elapsed:game.elapsed,status:game.status}),before);
});

test('Caller-owned drawing arrays are not mutated by simulation', () => {
  const lines = JSON.parse(JSON.stringify(levels[0].solution));const before=JSON.stringify(lines);
  const game=createGame(levels[0],lines);stepGame(game,8);assert.equal(JSON.stringify(lines),before);
  assert.notEqual(game.strokes[0],lines[0]);
});

console.log(`\n${assertions} checks passed across ${levels.length} levels.`);
