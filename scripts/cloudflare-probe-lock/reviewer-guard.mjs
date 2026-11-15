// Reject GitHub's automatically-created, unprotected environments before any
// Cloudflare token is exposed. This check is not atomic with later admin changes.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
export function checkReviewer(environment) {
  const rules = environment?.protection_rules?.filter((r) => r.type === 'required_reviewers');
  const reviewers = rules?.length === 1 ? rules[0].reviewers : null;
  if (environment?.name !== 'ayahspring-worker-test' || !Array.isArray(reviewers) || reviewers.length !== 1 || reviewers[0].type !== 'User' || reviewers[0].reviewer?.id !== 112956517 || reviewers[0].reviewer?.login !== 'Petkigz') {
    throw new Error('The preview environment must have Petkigz as its sole required reviewer');
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  checkReviewer(JSON.parse(readFileSync(process.argv[2], 'utf8')));
  console.log('Preview environment required-reviewer configuration verified.');
}
