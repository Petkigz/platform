#!/usr/bin/env node
// Render the Apple touch icon from the mark's geometry.
//
// `app/icon.svg` is the favicon and the source of truth for the star; iOS wants
// a 180x180 PNG with no transparency, and the system applies its own corner
// mask, so this draws the same star on a full-bleed green square.
//
//   node --experimental-strip-types scripts/make-apple-icon.mjs
//
// Sharp comes with Next (it is what optimises images at build time), so this
// adds no dependency. Run it whenever `MARK_POINTS` changes; `brand.test.ts`
// keeps the header and the favicon in step, and this keeps the third copy a
// render rather than a redrawing.

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

import { markSvg } from '../web/src/lib/brand.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const svg = markSvg({ size: 180, tile: true, radius: 0 });

const png = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
writeFileSync(join(root, 'web/src/app/apple-icon.png'), png);
process.stdout.write(`apple-icon.png: ${png.length} bytes, 180x180\n`);
