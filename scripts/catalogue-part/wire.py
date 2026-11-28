#!/usr/bin/env python3
"""Register a new catalogue part everywhere it is counted.

usage (from web/): wire.py <section> <CONST> <file-stem> <keys> "<what it is>" "<words for the count>"

Run it ONCE for a part. Each replacement must match exactly once or the
script stops; it may then have changed some of the five files already, so
look at `git status` before running it again. Kept in the repository since
2026-11-27 because the copy outside it did not survive a new workspace.
"""
import re, sys
section, const, stem, n, what, words = sys.argv[1:7]
n = int(n)
# The day written into the count's comment. Set it to the day of the unit.
DAY = '2026-11-28'
def edit(path, fn):
    s = open(path, encoding='utf8').read(); t = fn(s); assert t != s, path; open(path, 'w', encoding='utf8').write(t)
def last_import(s, pat, line):
    m = list(re.finditer(pat, s, re.M)); assert m; e = m[-1].end(); return s[:e] + '\n' + line + s[e:]
# catalogues.ts
def cat(s):
    s = last_import(s, r"^import \{ [A-Z_]+ \} from '\./[a-z-]+\.ts';$", f"import {{ {const} }} from './{stem}.ts';")
    m = re.search(r"\n\);\n\n/\*\*\n \* What readers are served", s); assert m
    return s[:m.start()] + f"\n  // {what}, on the same rule.\n  {const}," + s[m.start():]
edit('src/lib/i18n/messages/catalogues.ts', cat)
# index.ts
def idx(s):
    m = re.search(r"const SERVER_ONLY_PREFIXES: readonly string\[\] = \[[^\]]*\];", s); assert m
    block = m.group(0); new = block[:-2].rstrip()
    new = (new if new.endswith(',') else new + ',') + f" '{section}.',\n];"
    return s.replace(block, new)
edit('src/lib/i18n/index.ts', idx)
# held.ts
def held(s):
    m = re.search(r"export const UNWRITTEN_WHILE_HELD: readonly string\[\] = \[[^\]]*\];", s); assert m
    block = m.group(0); return s.replace(block, block[:-2] + f"  '{section}',\n];")
edit('src/lib/i18n/messages/held.ts', held)
# companion test
def comp(s):
    m = re.search(r"'\]\.some\(\(prefix\) => k\.startsWith\(prefix\)\);", s); assert m
    s = s[:m.start()] + f"', '{section}." + s[m.start():]
    m = re.search(r"Object\.keys\(serverOnly\)\.length, (\d+)\)", s); assert m
    return s[:m.start(1)] + str(int(m.group(1)) + n) + s[m.end(1):]
edit('src/lib/companion-i18n.test.ts', comp)
# held-translations test
def ht(s):
    s = last_import(s, r"^import \{ [A-Z_]+ \} from '\./i18n/messages/(?:about|saved|paths|downloads|ask|panel|review|review-assignment|support|course-parts|teacher-page)\.ts';$", f"import {{ {const} }} from './i18n/messages/{stem}.ts';")
    m = re.search(r"assert\.deepEqual\(\[\.\.\.UNWRITTEN_WHILE_HELD\], \[[^\]]*'\]\);", s); assert m
    block = m.group(0); s = s.replace(block, block[:-3] + f", '{section}']);")
    m = re.search(r"  assert\.equal\(unwrittenKeys\.length, (\d+)\);\n", s); assert m
    total = int(m.group(1)) + n
    s = s[:m.start()] + f"  // ({words} more on {DAY}: {what[0].lower() + what[1:]}.)\n  assert.equal(unwrittenKeys.length, {total});\n  assert.equal(unwrittenKeys.filter((key) => key.startsWith('{section}.')).length, {n});\n" + s[m.end():]
    m = list(re.finditer(r"^  assert\.deepEqual\(Object\.keys\([A-Z_]+\)\.sort\(\), written\);\n", s, re.M)); e = m[-1].end()
    s = s[:e] + f"  assert.deepEqual(Object.keys({const}).sort(), written);\n" + s[e:]
    m = re.search(r"(      \.\.\.[A-Z_]+\[code\],\n)    \};\n    assert\.deepEqual\(Object\.keys\(own\)", s); assert m
    s = s[:m.end(1)] + f"      ...{const}[code],\n" + s[m.end(1):]
    m = re.search(r"assert\.equal\(coverageOf\(code\)\.translated, (\d+), code\);\n    assert\.equal\(coverageOf\(code\)\.total, (\d+)\);\n    assert\.equal\(coverageOf\(code\)\.percent, (\d+), code\);", s); assert m
    tr, tot, pc = int(m.group(1)), int(m.group(2)) + n, int(m.group(3))
    exact = 100 * tr / tot; newpc = round(exact)
    s = s[:m.start()] + f"assert.equal(coverageOf(code).translated, {tr}, code);\n    assert.equal(coverageOf(code).total, {tot});\n    assert.equal(coverageOf(code).percent, {newpc}, code);" + s[m.end():]
    m = re.search(r"\.\n  // What they are shown did not get smaller; what is counted got bigger\.", s); assert m
    note = f"{exact:.2f}%, " + ("still " if newpc == pc else "now ") + f"{newpc}%"
    s = s[:m.start()] + f", then\n  // {words.lower()} for {what[0].lower() + what[1:]} ({note})" + s[m.start():]
    m = re.search(r"  // 192 of (\d+) sentences, which is (\d+)%\.", s); assert m
    s = s[:m.start()] + f"  // 192 of {tot} sentences, which is {newpc}%." + s[m.end():]
    print('unwritten', total, 'total', tot, 'percent', f'{exact:.2f}')
    return s
edit('src/lib/held-translations.test.ts', ht)
