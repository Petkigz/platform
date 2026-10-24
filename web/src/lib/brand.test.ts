import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { MARK_POINTS, markSvg } from './brand.ts';

type Point = { x: number; y: number };

const points = (value: string): Point[] =>
  value
    .trim()
    .split(/\s+/)
    .map((pair) => {
      const [rawX = '', rawY = ''] = pair.split(',');
      return { x: Number(rawX), y: Number(rawY) };
    });

const iconFile = () =>
  readFileSync(new URL('../app/icon.svg', import.meta.url), 'utf8');

test('the mark is two squares rotated through each other', () => {
  const parsed = points(MARK_POINTS);
  assert.equal(parsed.length, 16);

  // Eight outer and eight inner vertices, alternating: the star is two squares
  // turned 45 degrees, which is why the diagonal outer points sit at 49.5 and
  // the axial ones at 50 rather than on one circle.
  const radii = parsed.map(({ x, y }) => Math.hypot(x - 50, y - 50));
  const outer = radii.filter((r) => Math.abs(r - 50) < 1);
  const inner = radii.filter((r) => Math.abs(r - 32) < 1);

  assert.equal(outer.length, 8, `outer radii: ${radii.map((r) => r.toFixed(1)).join(' ')}`);
  assert.equal(inner.length, 8, `inner radii: ${radii.map((r) => r.toFixed(1)).join(' ')}`);
  parsed.forEach((_, i) => {
    assert.equal(Math.abs(radii[i]! - 50) < 1, i % 2 === 0, `vertex ${i} is on the wrong ring`);
  });

  // Every vertex is on one of eight spokes, 45 degrees apart — sixteen spokes
  // of 22.5 degrees once the inner points are counted.
  const spokes = new Set(
    parsed.map(({ x, y }) => {
      const degrees = (Math.atan2(x - 50, 50 - y) * 180) / Math.PI;
      return (Math.round(degrees / 22.5) * 22.5 + 360) % 360;
    }),
  );
  assert.equal(spokes.size, 16, 'the star is not symmetric about eight spokes');
});

test('the favicon draws the same star as the header', () => {
  const svg = iconFile();
  const drawn = svg.match(/<polygon points="([^"]+)"/)?.[1] ?? '';
  assert.notEqual(drawn, '', 'icon.svg has no polygon');

  assert.deepEqual(points(drawn), points(MARK_POINTS));
});

test('the favicon tile is the brand green, not a different green', () => {
  assert.match(iconFile(), /<rect[^>]*fill="#0b6b3a"/);
});

test('markSvg produces a standalone document at the size asked for', () => {
  const plain = markSvg({ size: 32 });
  assert.match(plain, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.match(plain, /width="32" height="32"/);
  assert.match(plain, /fill="#0b6b3a"/);
  assert.doesNotMatch(plain, /<rect/, 'the bare mark has no tile');

  const tiled = markSvg({ tile: true });
  assert.match(tiled, /<rect[^>]*rx="22"/);
  assert.match(tiled, /fill="#ffffff"/);
});

test('a scaled star stays inside its box', () => {
  const svg = markSvg({ tile: true, starScale: 0.62 });
  const transform = svg.match(/translate\(([\d.]+) ([\d.]+)\) scale\(([\d.]+)\)/);
  assert.ok(transform);

  const dx = Number(transform[1]);
  const scale = Number(transform[3]);
  assert.ok(dx + 100 * scale <= 100.001, 'the star overflows the tile');
});
