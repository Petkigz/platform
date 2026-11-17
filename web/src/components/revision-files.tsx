import { courseworkFileHref } from '@/lib/coursework';
import { fill, formatNumber } from '@/lib/i18n/format';
import type { LocaleCode } from '@/lib/i18n/locales';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** The three sentences, for a page that has them in the reader's language. */
export type RevisionFileWords = {
  note: string;
  /** `{number}` */
  open: string;
  /** `{number}` */
  invalid: string;
};

const ENGLISH: RevisionFileWords = {
  note: 'Files recorded with this version. Opening a file checks your current access; a file may no longer be available.',
  open: 'Try opening file {number}',
  invalid: 'File reference {number} is invalid and needs individual review.',
};

/**
 * References are not proof that the file or stored bytes still exist.
 *
 * The teacher's screen passes no words and reads English. The learner's page
 * passes its own.
 */
export function RevisionFiles({
  assetIds,
  words = ENGLISH,
  locale = 'en',
}: {
  assetIds: string[];
  words?: RevisionFileWords;
  locale?: LocaleCode;
}) {
  if (assetIds.length === 0) return null;
  const number = (index: number) => ({ number: formatNumber(locale, index + 1) });
  return <div>
    <p className="muted">{words.note}</p>
    <ul>
      {assetIds.map((id, index) => <li key={`${id}-${index}`}>
        {UUID.test(id)
          ? <a href={courseworkFileHref(id)} target="_blank" rel="noreferrer">{fill(words.open, number(index))}</a>
          : <span>{fill(words.invalid, number(index))}</span>}
      </li>)}
    </ul>
  </div>;
}
