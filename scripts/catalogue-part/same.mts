// Which keys of a new unit say, in English, exactly what an older key says.
// Run from `web/`: node --experimental-strip-types ../scripts/catalogue-part/same.mts <prefix.>
// Prints `new-key <tab> older keys, each with the number of languages it is written in`. A
// match is a place to look, not a sentence to copy unread: the same English
// word can be two words elsewhere ("Closed" a shop, "Closed" a case).
import { en } from '../../web/src/lib/i18n/messages/en.ts';
import { WRITTEN as CATALOGUES } from '../../web/src/lib/i18n/messages/catalogues.ts';

const prefix = process.argv[2] ?? '';
const codes = Object.keys(CATALOGUES).filter((code) => code !== 'en');
const all = en as Record<string, string>;
for (const [key, value] of Object.entries(all)) {
  if (!key.startsWith(prefix)) continue;
  const twins = Object.entries(all)
    .filter(([other, said]) => other !== key && !other.startsWith(prefix) && said.toLowerCase() === value.toLowerCase())
    .map(([other]) => `${other}(${codes.filter((code) => typeof (CATALOGUES as Record<string, Record<string, string>>)[code]?.[other] === 'string').length})`)
    .filter((entry) => !entry.endsWith('(0)'));
  if (twins.length) console.log(`${key}\t${twins.join(' ')}`);
}
