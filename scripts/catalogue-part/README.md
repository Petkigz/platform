# Catalogue parts

Three scripts that turn translated lines into a part of the message
catalogue and register it. Kept here since 2026-11-27, because the copies
kept outside the repository did not survive a new workspace.

Run from `web/`, in this order, for a new unit whose English keys are
already in `src/lib/i18n/messages/en.ts`:

1. `python3 ../scripts/catalogue-part/count.py <keys> <data files>`:
   every `### <code>` block has that many lines.
2. `python3 ../scripts/catalogue-part/gen.py <prefix.> <CONST> src/lib/i18n/messages/<stem>.ts <header.txt> <data files>`:
   writes the part. It stops, writing nothing, if a language has the
   wrong number of lines or a line lost a `{gap}`.
3. `python3 ../scripts/catalogue-part/wire.py <section> <CONST> <stem> <keys> "<what it is>" "<words for the count>"`:
   registers the part in the five files that count sentences. **Once per
   part.** If it stops, look at `git status` before running it again.

`data/` holds the lines a part was made from: `### <code>`, then one line
for each key in the order `en.ts` has them. Nobody who speaks these
languages has read them.
