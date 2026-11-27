#!/usr/bin/env python3
"""Turn blocks of translated lines into a catalogue part.

usage (from web/): gen.py <prefix> <CONST> <out.ts> <header.txt> <data files...>

Each data file holds '### <code>' and then one line for each key of that
prefix, in the order `messages/en.ts` has them. The script stops, writing
nothing, if a language has the wrong number of lines or a line lost a
`{gap}`. Kept in the repository since 2026-11-27 because the copy outside
it did not survive a new workspace.
"""
import re, sys
prefix, const, out, header = sys.argv[1:5]
files = sys.argv[5:]
en = open('src/lib/i18n/messages/en.ts', encoding='utf-8').read()
pairs = re.findall(r"^  '(" + re.escape(prefix) + r"[A-Za-z0-9]+)':\s*\n?\s*(?:'((?:[^'\\]|\\.)*)'|\"((?:[^\"\\]|\\.)*)\"),?\s*$", en, re.M)
keys = [p[0] for p in pairs]
english = {p[0]: (p[1] or p[2]) for p in pairs}
ORDER = ['ar','ur','fa','fa-af','tr','id','ms','bn','hi','fr','es','pt','sw','af','zh-hans','zh-hant','vi','th','fil','uz','kk','az','tg','ky','tk','ta','ne']
blocks = {}
for f in files:
    code = None
    for line in open(f, encoding='utf-8').read().split('\n'):
        if line.startswith('### '):
            code = line[4:].strip(); blocks[code] = []
        elif line.strip() and code:
            blocks[code].append(line.strip())
gaps = lambda t: sorted(re.findall(r'\{([a-zA-Z]+)\}', t))
bad = False
for code, lines in blocks.items():
    if len(lines) != len(keys):
        print(f'{code}: {len(lines)} lines for {len(keys)} keys'); bad = True; continue
    for k, v in zip(keys, lines):
        if gaps(v) != gaps(english[k]): print(f'{code} {k}: gaps {gaps(v)} != {gaps(english[k])}'); bad = True
        if v == english[k]: print(f'{code} {k}: same as English')
missing = [c for c in ORDER if c not in blocks]
print('keys', len(keys), 'languages', len(blocks), 'missing', ' '.join(missing))
if bad: sys.exit(1)
q = lambda v: "'" + v.replace('\\', '\\\\').replace("'", "\\'") + "'"
body = [open(header, encoding='utf-8').read().rstrip('\n'),
        f"export const {const}: Partial<Record<LocaleCode, Partial<Messages>>> = {{"]
for code in ORDER:
    if code not in blocks: continue
    name = code if re.fullmatch(r'[a-z]+', code) else f"'{code}'"
    body.append(f"  {name}: {{")
    for k, v in zip(keys, blocks[code]):
        one = f"    '{k}': {q(v)},"
        body.append(one if len(one) <= 100 else f"    '{k}':\n      {q(v)},")
    body.append("  },")
body.append("};")
open(out, 'w', encoding='utf-8').write('\n'.join(body) + '\n')
