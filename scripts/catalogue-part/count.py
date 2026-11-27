#!/usr/bin/env python3
"""usage: count.py <lines> <data files...>: says whether each '### <code>' block has that many lines."""
import sys
for f in sys.argv[2:]:
    code = None; n = {}
    for line in open(f, encoding='utf-8').read().split('\n'):
        if line.startswith('### '): code = line[4:].strip(); n[code] = 0
        elif line.strip(): n[code] += 1
    print(f, n, 'BAD' if any(v != int(sys.argv[1]) for v in n.values()) else 'ok')
