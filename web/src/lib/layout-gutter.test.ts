import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// `.section { padding: 2.5rem 0 }` came after `.container` in the stylesheet,
// so on every `container section` page the `0` replaced the container's side
// padding and the content touched the edge of the screen. A browser sweep
// (`scripts/edge-sweep.mjs`) is what proves pages have a gutter; this is the
// cheap half that runs everywhere and names the cause.
const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '');

function declarations(selector: string): string[] {
  const out: string[] = [];
  const rule = new RegExp(`(?:^|[}\\s,])${selector.replace('.', '\\.')}\\s*\\{([^}]*)\\}`, 'g');
  for (const match of css.matchAll(rule)) out.push(match[1]!.trim());
  return out;
}

test('a section sets only its vertical padding, so it cannot erase a container\'s gutter', () => {
  for (const selector of ['.section', '.section-sm']) {
    const rules = declarations(selector);
    assert.ok(rules.length > 0, `${selector} is no longer defined`);
    for (const body of rules) {
      assert.match(body, /padding-block:/, `${selector} must space itself vertically`);
      assert.doesNotMatch(body, /(?:^|;)\s*padding\s*:/, `${selector} uses the padding shorthand, which resets the sides`);
      assert.doesNotMatch(body, /padding-inline|padding-left|padding-right/, `${selector} must leave the sides to the container`);
    }
  }
});

test('the container is what keeps content off the edge of the screen', () => {
  const [body] = declarations('.container');
  assert.ok(body, '.container is no longer defined');
  assert.match(body, /padding-inline:\s*clamp\(1\.25rem/);
});

test('pages allowed the full window width keep the gutter', () => {
  // These drop the container's max-width. None of them may drop its padding.
  for (const selector of ['.learner-dashboard', '.course-workspace', '.companion-page']) {
    const [body] = declarations(selector);
    assert.ok(body, `${selector} is no longer defined`);
    assert.match(body, /max-width:\s*none/);
    assert.doesNotMatch(body, /(?:^|;)\s*padding\s*:/, `${selector} resets the container's side padding`);
  }
});
