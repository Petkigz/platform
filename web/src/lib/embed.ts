/**
 * The one row an embedded to-one relation carries.
 *
 * `select('id, courses ( title )')` on a table holding `course_id` returns
 * `{ id, courses: { title } }` — an object, because an enrolment has one
 * course. Without generated database types the client library types that
 * relation as an array, and code written to satisfy the type
 * (`row.courses?.[0]?.title`) reads `undefined` from the object at run time:
 * the course name goes missing and nothing fails.
 *
 * Until 2026-11-17 nothing here spoke to a real PostgREST, the stand-in
 * servers in the smokes returned arrays because the pages expected arrays, and
 * about twenty reads were wrong in that way. Every to-one relation is now read
 * through this, which takes either shape, and
 * `postgrest-select-contract.test.ts` refuses `[0]` on a relation the schema
 * says is to-one.
 */
export function one<T>(value: T | readonly T[] | null | undefined): T | null {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) return (value[0] as T | undefined) ?? null;
  return value as T;
}

/** How to type a to-one relation on a row read from the API. Read it with one(). */
export type Embedded<T> = T | T[] | null;
