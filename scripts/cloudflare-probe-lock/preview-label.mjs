// Applied only to the disposable, data-free preview build, never the app source.
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const PREVIEW_NOTICE = 'PRIVATE TEST PREVIEW — no real accounts or data. Sign-in and payments are unavailable.';
export function labelPreview(source) {
  const marker = '      <body>';
  if (source.split(marker).length !== 2 || source.includes(PREVIEW_NOTICE)) {
    throw new Error('Preview layout marker is missing, duplicated, or already labelled');
  }
  return source.replace(marker, `${marker}\n        <div role="status" style={{background:'#fff3cd',color:'#202020',padding:'12px',textAlign:'center',fontWeight:700}}>${PREVIEW_NOTICE}</div>`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const file = process.argv[2];
  if (!file) throw new Error('Expected a disposable preview layout path');
  const source = readFileSync(file, 'utf8');
  writeFileSync(file, labelPreview(source));
  console.log('Added the data-free preview label to the disposable layout.');
}
