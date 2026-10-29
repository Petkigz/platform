/**
 * A person's data, as a spreadsheet they can actually open.
 *
 * `export_my_data()` already answers with one JSON document, and JSON is an
 * export for a developer. A parent who wants to check what the platform holds
 * about their family opens a spreadsheet, so the same document is offered as CSV
 * as well — assembled here, in the browser-facing layer, so the database keeps
 * one answer rather than two that can disagree.
 *
 * Three decisions worth stating.
 *
 * **The document is shaped, not guessed.** `export_my_data()` returns an object
 * whose top-level keys are sections: `account` is one record, `learners` and
 * `families` are lists of flat records. A section is rendered as a two-column
 * key/value table or as a list, and a key this code has never seen is still
 * exported. That matters more than tidiness: a field added to the export must
 * appear in the CSV without anybody remembering to add it here, or the "complete
 * copy" quietly stops being complete.
 *
 * **One file, several sections.** Spreadsheets have one grid per file, and the
 * honest options were a zip of files (which most phones cannot open) or one
 * document with a section header per block. This is the second, with a blank line
 * between sections, because it opens anywhere and reads top to bottom.
 *
 * **A cell is data, never a formula.** A display name of `=HYPERLINK(...)` is a
 * name — but Excel and Sheets will run it. Every value that starts with `=`, `+`,
 * `-`, `@`, tab or carriage return is prefixed with an apostrophe, which those
 * applications treat as "this is text" and do not show. The export is a read-only
 * copy of somebody's own data, so there is no reason to hand them a file that can
 * execute.
 */

export type CsvSection = {
  /** The top-level key, as a heading. */
  title: string;
  /** Column names, in the order they will appear. */
  columns: string[];
  /** One row per record; a single-column section is one value per row. */
  rows: string[][];
};

/** Values that spreadsheets treat as the start of a formula. */
const RISKY_START = /^[=+\-@\t\r]/;

/**
 * One cell: quoted when it has to be, and never left looking like a formula.
 *
 * The prefix is an apostrophe rather than a leading space, because Excel trims a
 * leading space back off and the formula works again.
 */
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  let text =
    typeof value === 'string'
      ? value
      : typeof value === 'number' || typeof value === 'boolean'
        ? String(value)
        : JSON.stringify(value) ?? '';

  if (RISKY_START.test(text)) text = `'${text}`;

  // A tab is not a separator here, but it is whitespace a reader cannot see,
  // so a cell carrying one is quoted rather than left to look empty.
  if (/[",\t\r\n]/.test(text) || text !== text.trim()) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function cellText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value) ?? '';
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Turn the export document into sections.
 *
 * Order is preserved as it arrives, because `export_my_data()` puts the account
 * first and a person reading the file expects to see themselves at the top.
 */
export function exportSections(document: unknown): CsvSection[] {
  if (!isPlainObject(document)) return [];
  const sections: CsvSection[] = [];

  for (const [title, value] of Object.entries(document)) {
    if (value === null || value === undefined) {
      sections.push({ title, columns: ['value'], rows: [] });
      continue;
    }

    if (Array.isArray(value)) {
      const objects = value.filter(isPlainObject);
      if (objects.length > 0 && objects.length === value.length) {
        // Union of keys across every record, so a row that is missing a field
        // does not shift the columns for the rows below it.
        const columns: string[] = [];
        for (const record of objects) {
          for (const key of Object.keys(record)) {
            if (!columns.includes(key)) columns.push(key);
          }
        }
        const rows = objects.map((record) => columns.map((key) => cellText(record[key])));
        sections.push({ title, columns, rows });
        continue;
      }
      sections.push({ title, columns: ['value'], rows: value.map((entry) => [cellText(entry)]) });
      continue;
    }

    if (isPlainObject(value)) {
      const rows = Object.entries(value).map(([key, entry]) => [key, cellText(entry)]);
      sections.push({ title, columns: ['field', 'value'], rows });
      continue;
    }

    sections.push({ title, columns: ['value'], rows: [[cellText(value)]] });
  }

  return sections;
}

/**
 * The whole document as CSV text.
 *
 * `\r\n` rather than `\n`: RFC 4180 says so, and Excel on Windows treats a lone
 * newline inside a quoted cell as a line break that breaks the row.
 */
export function csvDocument(sections: CsvSection[]): string {
  const lines: string[] = [];
  sections.forEach((section, index) => {
    if (index > 0) lines.push('');
    lines.push(csvCell(section.title));
    lines.push(section.columns.map(csvCell).join(','));
    for (const row of section.rows) {
      lines.push(row.map(csvCell).join(','));
    }
  });
  return `${lines.join('\r\n')}\r\n`;
}

/** A filename a person can find again: dated, and obviously theirs. */
export function csvFileName(now: Date = new Date()): string {
  const stamp = now.toISOString().slice(0, 10);
  return `ayahspring-my-data-${stamp}.csv`;
}

/** What the account page says about the two formats. */
export function exportFormatSentence(format: 'json' | 'csv' | 'print'): string {
  switch (format) {
    case 'csv':
      return 'A spreadsheet, one section per part of your account, with a blank line between sections. Opens in Excel, Numbers, LibreOffice or Google Sheets.';
    case 'print':
      return 'A page you can read in the browser and print or save as a PDF from your own print dialog — nothing is sent anywhere to make it.';
    default:
      return 'The complete record as one JSON file — every field, including the ones no screen shows. For a developer or for keeping a copy you can check later.';
  }
}
