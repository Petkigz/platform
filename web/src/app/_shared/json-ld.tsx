import { serialise, type JsonLd } from '@/lib/structured-data';

/**
 * Structured data, as a script element.
 *
 * The escaping lives in `serialise()` rather than here, because this is the
 * component anything could pass a course title through and the safety has to
 * belong to the function every caller uses.
 *
 * `dangerouslySetInnerHTML` is correct here and not a shortcut: the content is
 * not markup, it is a JSON document, and React escapes text children — which
 * would put `&quot;` inside a JSON string and break the document entirely.
 */
export function JsonLdScript({ data }: { data: JsonLd }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serialise(data) }}
    />
  );
}
