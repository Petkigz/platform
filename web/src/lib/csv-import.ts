/**
 * A teacher's outline, read out of a spreadsheet.
 *
 * The platform can already create a section and a lesson one at a time, through
 * a form. A teacher arrives with thirty lesson titles already written, and typing
 * them one form submission at a time is the difference between publishing this
 * month and not publishing at all. This reads the file they already have.
 *
 * **It imports the outline, and only the outline.** Section titles, lesson
 * titles, an optional description of each lesson, and whether a lesson is a free
 * preview. Not media, not attachments, not assessments — a CSV column is not a
 * place to carry a video, and an import that appeared to bring one would be a
 * promise broken on the first use.
 *
 * **Nothing is guessed.** The header row names the columns; a column nobody
 * recognises is a refusal rather than a silent drop, because a teacher who
 * imported a `duration` column and found it gone would have no way to know
 * whether the platform ignored it or lost it. Every problem carries the line
 * number out of the file, which is the only coordinate the teacher has.
 *
 * **All or nothing.** Problems are collected for the whole file and the write is
 * refused while any remain. A half-imported outline would have to be reconciled
 * by hand against a spreadsheet, which is worse than not importing.
 *
 * The parse happens on the server, in the route that also performs the write, so
 * there is exactly one reading of what a CSV means and the browser cannot hand
 * the database a structure it did not derive itself.
 */

export type ImportLesson = {
  title: string;
  description: string | null;
  preview: boolean;
};

export type ImportSection = {
  title: string;
  /** The line the section was first named on, for an error that points at it. */
  line: number;
  lessons: ImportLesson[];
};

/** A problem with one line of the file, or with the file as a whole. */
export type ImportProblem = {
  /** 0 means the file itself — a missing header, a limit — not a line. */
  line: number;
  message: string;
};

export type OutlineImport = {
  sections: ImportSection[];
  problems: ImportProblem[];
};

/**
 * The same numbers the SQL function enforces, named once.
 *
 * They are limits on one file, not a judgement about a curriculum: a
 * mis-pasted spreadsheet must not create ten thousand rows in a single request.
 * The database refuses first if these and it ever disagree; the point of having
 * them here is that the teacher is told which line is the problem instead of
 * getting a dialog from a database.
 */
export const IMPORT_LIMITS = {
  sections: 50,
  lessonsPerSection: 100,
  lessons: 300,
  title: 200,
  description: 2000,
} as const;

/** The columns this file understands, and what each one is for. */
export const IMPORT_COLUMNS = [
  { name: 'section', required: true, note: 'The section a lesson belongs to. Repeat it on every row.' },
  { name: 'lesson', required: true, note: 'The lesson title. One row per lesson.' },
  { name: 'description', required: false, note: 'Optional. A sentence or two about the lesson.' },
  { name: 'preview', required: false, note: 'Optional. yes or no — whether this lesson is a free preview.' },
] as const;

/**
 * The file to hand a teacher who has not made one yet.
 *
 * Two rows, because a template with one row does not show what a second lesson
 * in the same section looks like — and repeating the section title is the one
 * thing about this format that is easy to get wrong.
 */
export const IMPORT_TEMPLATE = [
  'section,lesson,description,preview',
  'Foundations,What tajweed means,An introduction to the word and its scope,no',
  'Foundations,The three lengths,A first look at the madd letters,yes',
  'Application,Reading Surah Al-Fatihah,Applying the rules to the opening surah,no',
  '',
].join('\n');

type Row = { line: number; cells: string[] };

/**
 * CSV, read properly.
 *
 * Quotes, doubled quotes inside quotes, commas and newlines inside quotes, CRLF,
 * and a byte-order mark at the front — the four things that turn a spreadsheet
 * export into mojibake if a parser assumes a comma is always a separator. A
 * teacher's file comes out of Excel or Google Sheets on a phone, and both of those
 * will quote a description containing the comma.
 */
export function parseCsv(text: string): { rows: Row[]; problem: ImportProblem | null } {
  const rows: Row[] = [];
  const source = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  let cells: string[] = [];
  let cell = '';
  let quoted = false;
  let line = 1;
  let rowLine = 1;
  let started = false;

  const endRow = () => {
    cells.push(cell);
    rows.push({ line: rowLine, cells });
    cells = [];
    cell = '';
    rowLine = line;
    started = false;
  };

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i]!;

    if (quoted) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else if (char === '\r' && source[i + 1] === '\n') {
        // CRLF inside a quoted cell: the newline is kept, the carriage return is
        // not, or every description written on Windows ends in an invisible one.
      } else {
        if (char === '\n') line += 1;
        cell += char;
      }
      continue;
    }

    if (char === '"' && !started) {
      quoted = true;
      started = true;
      continue;
    }

    if (char === ',') {
      cells.push(cell);
      cell = '';
      // A new cell, so a quote opening it is an opening quote. Leaving `started`
      // true here would read `a,"b,c"` as a cell containing the quote marks.
      started = false;
      continue;
    }

    if (char === '\r') continue;

    if (char === '\n') {
      endRow();
      line += 1;
      rowLine = line;
      continue;
    }

    cell += char;
    started = true;
  }

  if (quoted) {
    // The quote was opened and never closed, so the rest of the file is inside
    // it and nothing below can be trusted. Report the line the quote opened on
    // rather than the end of the file.
    return {
      rows,
      problem: { line: rowLine, message: 'A quotation mark is opened here and never closed.' },
    };
  }

  // A file that does not end in a newline still has a last row.
  if (started || cell !== '' || cells.length > 0) endRow();

  return { rows, problem: null };
}

const YES = new Set(['yes', 'y', 'true', '1']);
const NO = new Set(['no', 'n', 'false', '0', '']);

function normaliseHeader(cell: string): string {
  return cell.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Read an outline out of CSV text.
 *
 * The result is either usable — `problems` empty — or not usable at all. The
 * caller must check `problems` before showing a confirm button; this function
 * always returns whatever it managed to read, because the preview screen is more
 * useful showing the sections it *would* create beside the errors than showing
 * nothing.
 */
export function parseOutline(text: string): OutlineImport {
  const problems: ImportProblem[] = [];
  const { rows, problem } = parseCsv(text);

  if (problem) {
    return { sections: [], problems: [problem] };
  }

  const meaningful = rows.filter((row) => row.cells.some((cell) => cell.trim() !== ''));
  if (meaningful.length === 0) {
    return { sections: [], problems: [{ line: 0, message: 'The file is empty.' }] };
  }

  const header = meaningful[0]!;
  const columns = header.cells.map(normaliseHeader);

  const known = new Set<string>(IMPORT_COLUMNS.map((c) => c.name));
  const unknown = columns.filter((c) => c !== '' && !known.has(c));
  if (unknown.length > 0) {
    return {
      sections: [],
      problems: [{
        line: header.line,
        message:
          `The file has ${unknown.length === 1 ? 'a column' : 'columns'} this import does not ` +
          `understand: ${unknown.join(', ')}. Keep section, lesson, description and preview, ` +
          'and rename or remove the rest.',
      }],
    };
  }

  const index = (name: string) => columns.indexOf(name);
  const sectionAt = index('section');
  const lessonAt = index('lesson');
  const descriptionAt = index('description');
  const previewAt = index('preview');

  if (sectionAt < 0 || lessonAt < 0) {
    const missing = [sectionAt < 0 ? 'section' : null, lessonAt < 0 ? 'lesson' : null]
      .filter(Boolean)
      .join(' and ');
    return {
      sections: [],
      problems: [{
        line: header.line,
        message: `The first row must name the columns, and ${missing} is missing.`,
      }],
    };
  }

  const sections: ImportSection[] = [];
  let current: ImportSection | null = null;
  /** Sections whose real problem is already reported on a specific line. */
  const explained = new Set<ImportSection>();
  /** Sections that were opened and have no lesson, so the error points at them. */
  let lessons = 0;

  for (const row of meaningful.slice(1)) {
    const cell = (at: number) => (at >= 0 ? (row.cells[at] ?? '').trim() : '');

    const sectionTitle = cell(sectionAt);
    const lessonTitle = cell(lessonAt);
    const description = cell(descriptionAt);
    const previewText = cell(previewAt);

    if (sectionTitle !== '') {
      // A spreadsheet cannot merge cells, so a teacher's file repeats the
      // section title on every row. Repeating the title we are already in
      // therefore continues that section; a *different* title starts a new one.
      // The one thing this cannot express is two adjacent sections with the same
      // name, which is why the form still exists for that.
      if (!current || current.title !== sectionTitle) {
        current = { title: sectionTitle, line: row.line, lessons: [] };
        sections.push(current);
      }
    }

    if (sectionTitle === '' && lessonTitle === '') {
      if (description !== '') {
        problems.push({
          line: row.line,
          message: 'This row has a description but no lesson title, so there is nothing to attach it to.',
        });
      }
      continue;
    }

    if (lessonTitle === '') {
      // The section was opened on this row; it is checked for lessons below.
      continue;
    }

    if (!current) {
      problems.push({
        line: row.line,
        message: 'This lesson has no section above it. Put a section title in the first column.',
      });
      continue;
    }

    if (lessonTitle.length > IMPORT_LIMITS.title) {
      problems.push({
        line: row.line,
        message: `This lesson title is ${lessonTitle.length} characters; the limit is ${IMPORT_LIMITS.title}.`,
      });
      explained.add(current);
      continue;
    }

    if (description.length > IMPORT_LIMITS.description) {
      problems.push({
        line: row.line,
        message:
          `This description is ${description.length} characters; the limit is ` +
          `${IMPORT_LIMITS.description}. Move the long text into the lesson itself.`,
      });
      explained.add(current);
      continue;
    }

    const preview = previewText.toLowerCase();
    if (!YES.has(preview) && !NO.has(preview)) {
      problems.push({
        line: row.line,
        message: `"${previewText}" is not a yes or a no in the preview column.`,
      });
      explained.add(current);
      continue;
    }

    current.lessons.push({
      title: lessonTitle,
      description: description === '' ? null : description,
      preview: YES.has(preview),
    });
    lessons += 1;
  }

  // A section with nothing under it: the database would create it happily, and
  // the teacher would be left with an empty heading in their outline and no
  // explanation of why. Naming the line is more useful than creating the row.
  for (const section of sections) {
    if (section.lessons.length === 0 && !explained.has(section)) {
      problems.push({
        line: section.line,
        message: `"${section.title}" has no lessons under it. Add one, or remove the section title.`,
      });
    } else if (section.lessons.length > IMPORT_LIMITS.lessonsPerSection) {
      problems.push({
        line: section.line,
        message:
          `"${section.title}" has ${section.lessons.length} lessons; the limit is ` +
          `${IMPORT_LIMITS.lessonsPerSection} in one section.`,
      });
    }
  }

  if (sections.length === 0) {
    // Only when nothing more specific is already known: a file whose lessons are
    // all above the first section has an error on every one of those lines, and
    // "no sections were found" adds nothing to them.
    if (problems.length === 0) {
      problems.push({ line: 0, message: 'No sections were found. The first column is the section.' });
    }
  } else if (sections.length > IMPORT_LIMITS.sections) {
    problems.push({
      line: 0,
      message:
        `The file has ${sections.length} sections; the limit is ${IMPORT_LIMITS.sections}. ` +
        'Import the rest in a second file into the same draft.',
    });
  }

  if (lessons > IMPORT_LIMITS.lessons) {
    problems.push({
      line: 0,
      message:
        `The file has ${lessons} lessons; the limit is ${IMPORT_LIMITS.lessons}. ` +
        'Import the rest in a second file into the same draft.',
    });
  }

  return { sections, problems };
}

/** How many sections and lessons a file would create, and how many are previews. */
export function outlineCounts(result: OutlineImport): {
  sections: number;
  lessons: number;
  previews: number;
} {
  let lessons = 0;
  let previews = 0;
  for (const section of result.sections) {
    lessons += section.lessons.length;
    previews += section.lessons.filter((lesson) => lesson.preview).length;
  }
  return { sections: result.sections.length, lessons, previews };
}

/**
 * What the confirm button will do, in one sentence.
 *
 * It says *appended*, because that is the fact a teacher cannot see from the
 * preview: the import goes after whatever is already in the draft, and an
 * outline they have half typed is not overwritten.
 */
export function importSentence(result: OutlineImport): string {
  const { sections, lessons, previews } = outlineCounts(result);
  if (sections === 0 || lessons === 0) return 'There is nothing to add yet.';

  const sectionWord = sections === 1 ? '1 section' : `${sections} sections`;
  const lessonWord = lessons === 1 ? '1 lesson' : `${lessons} lessons`;
  const previewNote =
    previews === 0
      ? ''
      : previews === 1
        ? ' — one of them a free preview —'
        : ` — ${previews} of them free previews —`;

  return `This will add ${sectionWord} and ${lessonWord}${previewNote} to the end of this draft.`;
}

/**
 * The payload the database function takes.
 *
 * Named separately from the parse so the shape crossing into SQL is written down
 * in one place, next to the function that reads it — a field renamed here and not
 * there would fail as a null title rather than as a type error.
 */
export function outlinePayload(result: OutlineImport): Array<{
  title: string;
  lessons: Array<{ title: string; description: string | null; preview: boolean }>;
}> {
  return result.sections.map((section) => ({
    title: section.title,
    lessons: section.lessons.map((lesson) => ({
      title: lesson.title,
      description: lesson.description,
      preview: lesson.preview,
    })),
  }));
}

/**
 * A short description of what was read, for the screen that confirms it.
 *
 * Truncated on purpose: a preview of three hundred lesson titles is a wall, and
 * the teacher already has the file. What they need to check is that the sections
 * landed in the right order and that the lesson counts look like their plan.
 */
export function summariseOutline(
  result: OutlineImport,
  options: { sections?: number; lessons?: number } = {},
): Array<{ title: string; line: number; lessons: string[]; more: number }> {
  const maxSections = options.sections ?? 12;
  const maxLessons = options.lessons ?? 4;

  return result.sections.slice(0, maxSections).map((section) => ({
    title: section.title,
    line: section.line,
    lessons: section.lessons.slice(0, maxLessons).map((lesson) => lesson.title),
    more: Math.max(0, section.lessons.length - maxLessons),
  }));
}

/**
 * What a teacher reads when the database refuses the write.
 *
 * The function raises named reasons (`teaching:version_frozen` and friends)
 * rather than sentences, because SQL messages are for developers and end up in
 * front of a person anyway. Every one of these is written as an answer to the
 * question the teacher will ask: *what do I do now?*
 */
export function importErrorMessage(raw: string): string {
  const text = raw ?? '';
  const known: Array<[RegExp, string]> = [
    [/teaching:not_allowed/,
      'You can only import into a course you are the author of.'],
    [/teaching:not_found/,
      'That draft no longer exists. Open the course again and start a new version.'],
    [/teaching:version_frozen/,
      'This version has been published or sent for review, so it cannot change. ' +
      'Start a new version and import into that.'],
    [/teaching:import_malformed/,
      'The file could not be read as a list of sections. Start from the template.'],
    [/teaching:import_empty/,
      'The file has no sections in it.'],
    [/teaching:import_section_empty/,
      'Every section needs at least one lesson under it.'],
    [/teaching:import_title_required/,
      'A section or lesson is missing its title.'],
    [/teaching:import_title_too_long/,
      `A title is longer than ${IMPORT_LIMITS.title} characters.`],
    [/teaching:import_description_too_long/,
      `A description is longer than ${IMPORT_LIMITS.description} characters.`],
    [/teaching:import_too_large/,
      'That file is bigger than one import allows. Split it in two and import ' +
      'the second half into the same draft.'],
  ];

  for (const [pattern, sentence] of known) {
    if (pattern.test(text)) return sentence;
  }

  // Nothing matched, so say what actually happened rather than inventing a
  // friendlier reason. A blank message means the request never reached the
  // database, and that is worth distinguishing from a refusal.
  return text === '' ? 'The import did not reach the database.' : text;
}
