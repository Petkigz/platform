// What older keys say in each language, to keep a new unit's words the same.
// Run from `web/`: node --experimental-strip-types ../scripts/catalogue-part/voc.mts <key> [<key>…] [--only <code>,<code>]
import { WRITTEN } from '../../web/src/lib/i18n/messages/catalogues.ts';

const args = process.argv.slice(2);
const at = args.indexOf('--only');
const only = at >= 0 ? (args[at + 1] ?? '').split(',') : null;
const keys = at >= 0 ? args.slice(0, at) : args;
const ORDER = ['ar', 'ur', 'fa', 'fa-af', 'tr', 'id', 'ms', 'bn', 'hi', 'fr', 'es', 'pt', 'sw', 'af', 'zh-hans', 'zh-hant', 'vi', 'th', 'fil', 'uz', 'kk', 'az', 'tg', 'ky', 'tk', 'ta', 'ne'];
for (const code of ORDER) {
  if (only && !only.includes(code)) continue;
  console.log(`### ${code}`);
  const part = (WRITTEN as Record<string, Record<string, string>>)[code] ?? {};
  for (const key of keys) console.log(part[key] ?? `?? ${key}`);
}
