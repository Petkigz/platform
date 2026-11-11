import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import type { SupabaseClient } from '@supabase/supabase-js';

import {
  COURSEWORK_ACCEPT,
  COURSEWORK_MAX_BYTES,
  COURSEWORK_MAX_FILES,
  courseworkFileHref,
  countAttachedCourseworkFiles,
  confirmCourseworkFile,
  courseworkMimeAllowed,
  describeCourseworkFile,
  describeFileKind,
  describeFileSize,
  parseCourseworkFiles,
  parseCourseworkFilesStrict,
  parseCourseworkFilePage,
  parseFirstCourseworkFilePage,
  appendCourseworkFilePage,
  removeCourseworkFile,
  postLearnerAssignmentAction,
  PHASE_LABEL,
  uploadCourseworkFile,
  validateCourseworkFile,
} from './coursework.ts';

const file = (over: Partial<{ name: string; size: number; type: string }> = {}) => ({
  name: over.name ?? 'page-one.jpg',
  size: over.size ?? 1_800_000,
  type: over.type ?? 'image/jpeg',
});

test('the caps are the database’s caps, and they are one number each', () => {
  // Both of these are pinned in `coursework_files.test.mjs` on the database side
  // and here on the browser side: a screen that allows a 30 MB page and a
  // database that refuses it is a learner who finds out after the upload.
  assert.equal(COURSEWORK_MAX_BYTES, 26_214_400);
  assert.equal(COURSEWORK_MAX_FILES, 10);
  assert.match(COURSEWORK_ACCEPT, /application\/pdf/);
  assert.match(COURSEWORK_ACCEPT, /image\/jpeg/);
  assert.doesNotMatch(COURSEWORK_ACCEPT, /video/);
});

test('a file over the cap is refused in the picker, with the size it had', () => {
  const check = validateCourseworkFile(file({ size: COURSEWORK_MAX_BYTES + 1 }));
  assert.equal(check.ok, false);
  assert.ok(!check.ok);
  assert.match(check.message, /25\.0 MiB/);
  assert.match(check.message, /photo of each page/);
  assert.equal(validateCourseworkFile(file({ size: COURSEWORK_MAX_BYTES })).ok, true);
});

test('video, empty files and a full submission are refused before anything is hashed', () => {
  const video = validateCourseworkFile(file({ type: 'video/mp4' }));
  assert.equal(video.ok, false);
  assert.ok(!video.ok);
  assert.match(video.message, /PDF, a photo/);

  assert.equal(validateCourseworkFile(file({ size: 0 })).ok, false);
  assert.equal(validateCourseworkFile(file({ name: '   ' })).ok, false);

  assert.equal(validateCourseworkFile(file(), COURSEWORK_MAX_FILES - 1).ok, true);
  const full = validateCourseworkFile(file(), COURSEWORK_MAX_FILES);
  assert.equal(full.ok, false);
  assert.ok(!full.ok);
  assert.match(full.message, /already has that many/);
});

test('the type list is the database’s, in both directions', () => {
  for (const mime of ['application/pdf', 'image/png', 'image/webp', 'audio/mpeg', 'audio/x-m4a', 'audio/opus']) {
    assert.equal(courseworkMimeAllowed(mime), true, `${mime} should be allowed`);
  }
  for (const mime of ['video/mp4', 'application/zip', 'image/svg+xml', 'text/html', '']) {
    assert.equal(courseworkMimeAllowed(mime), false, `${mime} should be refused`);
  }
  // Case is not a reason to refuse a file a phone produced.
  assert.equal(courseworkMimeAllowed('IMAGE/PNG'), true);
});

test('a file reads as a size and a kind, never as a byte count', () => {
  assert.equal(describeFileSize('1800000'), '1.7 MiB');
  assert.equal(describeFileSize(0), 'empty');
  assert.equal(describeFileSize('not a number'), 'empty');
  assert.equal(describeFileKind('application/pdf'), 'PDF');
  assert.equal(describeFileKind('image/webp'), 'image');
  assert.equal(describeFileKind('audio/mpeg'), 'audio');
});

test('each file line says whether it has arrived', () => {
  const base = {
    attachmentId: 'a1',
    assetId: 'x',
    name: 'page.jpg',
    mimeType: 'image/jpeg',
    byteSize: '1800000',
    status: 'available',
    uploadedAt: '2026-11-01T10:00:00.000Z',
    // Review state is present only for a caller who may review, and an absent key
    // parses to "nobody has looked" rather than to a clean bill of health.
    review: 'none' as const,
    reviewedAt: null,
  };
  assert.equal(describeCourseworkFile(base), 'image · 1.7 MiB');
  assert.match(describeCourseworkFile({ ...base, status: 'pending' }), /arrival not confirmed/);
  // A quarantined file is said out loud rather than rendered as a working link.
  assert.match(describeCourseworkFile({ ...base, status: 'quarantined' }), /held for review/);
});

test('a list from the database is parsed without trusting any row', () => {
  const files = parseCourseworkFiles([
    { assetId: 'a', name: 'one.pdf', mimeType: 'application/pdf', byteSize: '10', status: 'available', attachmentId: 'x' },
    { assetId: 'b', name: null, mimeType: 'image/png', byteSize: '20', status: 'pending', attachmentId: null },
    { name: 'no asset id', mimeType: 'image/png' },
    null,
  ]);
  assert.equal(files.length, 2, 'a row with no asset id was rendered');
  assert.equal(files[0]?.name, 'one.pdf');
  assert.equal(files[1]?.name, null, 'an empty name became the string "null"');
  assert.equal(files[1]?.attachmentId, null);

  assert.deepEqual(parseCourseworkFiles(null), []);
  assert.deepEqual(parseCourseworkFiles({}), []);
});

test('a file is opened through the route that checks who may look', () => {
  // Never a storage URL: the address in the page is an endpoint that re-decides
  // permission every time it is asked.
  assert.equal(courseworkFileHref('abc-123'), '/api/media/open?asset=abc-123');
});

test('the phases are sentences, because a silent spinner is a closed tab', () => {
  for (const label of Object.values(PHASE_LABEL)) {
    assert.ok(label.length > 0);
  }
  assert.match(PHASE_LABEL.hashing, /Reading/);
  assert.match(PHASE_LABEL.confirming, /Checking/);
});

// ---------------------------------------------------------------------------
// The sequence
// ---------------------------------------------------------------------------

type Call = { url: string; body: Record<string, unknown> };

function harness(options: {
  register?: { ok: boolean; body: Record<string, unknown> };
  confirm?: { ok: boolean; body: Record<string, unknown> };
}) {
  const calls: Call[] = [];
  const puts: { url: string; headers: Record<string, string>; size: number }[] = [];

  const fetchImpl = (async (url: string, init?: { body?: string }) => {
    const body = JSON.parse(init?.body ?? '{}') as Record<string, unknown>;
    calls.push({ url, body });
    const scripted = body.action === 'request_coursework_upload' || body.action === 'retry_coursework_upload' ? options.register : options.confirm;
    return {
      ok: scripted?.ok ?? false,
      json: async () => scripted?.body ?? {},
    } as unknown as Response;
  }) as unknown as typeof fetch;

  const putImpl = async (
    url: string,
    headers: Record<string, string>,
    blob: Blob,
    onPercent: (percent: number) => void,
  ) => {
    puts.push({ url, headers, size: blob.size });
    onPercent(50);
    onPercent(100);
  };

  return { calls, puts, fetchImpl, putImpl };
}

const blobFile = (bytes: number, type = 'image/jpeg') =>
  new File([new Uint8Array(bytes)], 'page-one.jpg', { type }) as File & { size: number };

const client = () => ({} as SupabaseClient);

test('a file is declared, sent to storage, then confirmed — in that order', async () => {
  const { calls, puts, fetchImpl, putImpl } = harness({
    register: {
      ok: true,
      body: {
        ok: true,
        data: {
          assetId: 'a1',
          uploadUrl: 'https://storage.test/put',
          requiredHeaders: { 'content-type': 'image/jpeg', 'if-none-match': '*' },
        },
      },
    },
    confirm: { ok: true, body: { ok: true, data: { assetId: 'a1', attachmentId: 'att-1' } } },
  });

  const phases: string[] = [];
  const outcome = await uploadCourseworkFile(blobFile(1024), {
    submissionId: 'sub-1',
    fetchImpl,
    putImpl,
    onProgress: (phase) => phases.push(phase),
  });

  assert.equal(outcome.ok, true);
  assert.equal(outcome.ok === true ? outcome.attachmentId : '', 'att-1');
  assert.deepEqual(calls.map((c) => c.body.action), ['request_coursework_upload', 'confirm_coursework_upload']);
  // Declared before a byte moved: the submission id travelled with the row.
  assert.equal(calls[0]?.body.submissionId, 'sub-1');
  assert.equal(puts.length, 1);
  assert.equal(puts[0]?.url, 'https://storage.test/put');
  assert.equal(puts[0]?.headers['content-type'], 'image/jpeg');
  assert.equal(puts[0]?.headers['if-none-match'], '*');
  // Hashing reports at zero and then as it reads, so the phase repeats; what
  // matters is the order the four steps happen in.
  assert.deepEqual([...new Set(phases)], ['hashing', 'registering', 'uploading', 'confirming', 'done']);
  assert.equal(phases.at(-1), 'done');
});

test('a file that never arrives is not reported as handed in', async () => {
  const { calls, fetchImpl } = harness({
    register: { ok: true, body: { ok: true, data: { assetId: 'a1', uploadUrl: 'https://storage.test/put' } } },
    confirm: { ok: true, body: { ok: true, data: { assetId: 'a1', attachmentId: 'att-1' } } },
  });

  const outcome = await uploadCourseworkFile(blobFile(1024), {
    submissionId: 'sub-1',
    fetchImpl,
    putImpl: async () => {
      throw new Error('The upload could not reach storage.');
    },
  });

  assert.equal(outcome.ok, false);
  assert.ok(!outcome.ok);
  assert.match(outcome.message, /could not reach storage/);
  // Confirmation is never attempted after a failed transfer: the object is not
  // there, and asking would only produce a second, more confusing refusal.
  assert.deepEqual(calls.map((c) => c.body.action), ['request_coursework_upload']);
});

test('a refusal from the database is passed through in its own words', async () => {
  const { calls, fetchImpl, putImpl } = harness({
    register: {
      ok: false,
      body: { ok: false, message: 'an assignment file cannot exceed 25 MiB' },
    },
    confirm: { ok: false, body: {} },
  });

  const outcome = await uploadCourseworkFile(blobFile(1024), {
    submissionId: 'sub-1',
    fetchImpl,
    putImpl,
  });
  assert.equal(outcome.ok, false);
  assert.ok(!outcome.ok);
  assert.match(outcome.message, /an assignment file cannot exceed 25 MiB/);
  assert.match(outcome.message, /may have been registered/);
  assert.equal(calls.length, 1);
});

test('a confirmation that answers with nothing is a failure, not a success', async () => {
  const { fetchImpl, putImpl } = harness({
    register: { ok: true, body: { ok: true, data: { assetId: 'a1', uploadUrl: 'https://storage.test/put' } } },
    confirm: { ok: true, body: { ok: true, data: {} } },
  });

  const outcome = await uploadCourseworkFile(blobFile(1024), {
    submissionId: 'sub-1',
    fetchImpl,
    putImpl,
  });
  // The route said ok, but no attachment came back: the caller must not show
  // "handed in" for a file the database did not attach.
  assert.equal(outcome.ok, false);
  if (!outcome.ok) assert.match(outcome.message, /incomplete/);
  void client;
});


test('a lost confirmation response is uncertain and directs the learner to refresh', async () => {
  const result = await confirmCourseworkFile('a1', async () => { throw new Error('offline'); });
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.message, /may already be attached/);
});

test('confirmation rejects a response naming a different file', async () => {
  const result = await confirmCourseworkFile('a1', async () => new Response(JSON.stringify({ ok: true, data: { assetId: 'a2', attachmentId: 'att' } }), { status: 200 }));
  assert.equal(result.ok, false);
});


test('a missing or malformed file list is unknown rather than empty', () => {
  const entry = { assetId:'2b1c7a9e-0000-4000-8000-000000000001', attachmentId:null,
    name:null, mimeType:'image/png', byteSize:'42', status:'pending', uploadedAt:'2026-11-02T09:15:00Z' };
  assert.equal(parseCourseworkFilesStrict([entry])?.length, 1);
  assert.deepEqual(parseCourseworkFilesStrict([]), []);
  for (const value of [null, {}, [null], [{...entry, assetId:''}], [{...entry, status:'other'}],
    [{...entry, byteSize:'-3'}], [{...entry, uploadedAt:'bad'}], [entry, entry]]) {
    assert.equal(parseCourseworkFilesStrict(value), null);
  }
  assert.equal(parseCourseworkFilesStrict([{...entry, byteSize:'0', status:'quarantined'}])?.length, 1);
  const page = readFileSync(new URL('../app/learn/[enrolmentId]/assignment/[assignmentId]/page.tsx', import.meta.url), 'utf8');
  const component = readFileSync(new URL('../app/learn/[enrolmentId]/assignment/[assignmentId]/assignment-files.tsx', import.meta.url), 'utf8');
  const api = readFileSync(new URL('../app/api/assignments/route.ts', import.meta.url), 'utf8');
  assert.match(page, /files=\{fileResult.error \? null : fileResult.data\}/);
  assert.match(component, /file list could not be checked/i);
  assert.match(component, /locked && files !== null && files.length === 0/);
  assert.match(api, /if \(!Array.isArray\(data\)\) return fail/);
});

test('a lost or malformed removal response never claims that the file stayed put', async () => {
  const lost = await removeCourseworkFile('s', 'a', async () => { throw new Error('lost reply'); });
  assert.equal(lost.ok, false);
  if (!lost.ok) assert.match(lost.message, /may already have been removed/);
  for (const response of [new Response('broken', {status:200}),
    new Response(JSON.stringify({ok:false, message:'The request could not be completed.'}), {status:503}),
    new Response(JSON.stringify({ok:true}), {status:500}),
    new Response(JSON.stringify({ok:true}), {status:200}),
    new Response(JSON.stringify({ok:true,submissionId:'other',assetId:'a'}), {status:200}),
    new Response(JSON.stringify({ok:true,submissionId:'s',assetId:'other'}), {status:200})]) {
    const result = await removeCourseworkFile('s', 'a', async () => response);
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.message, /check the file list/);
  }
  const good = await removeCourseworkFile('s', 'a', async (_url, init) => {
    assert.deepEqual(JSON.parse(String(init?.body)), {action:'remove_file',submissionId:'s',mediaAssetId:'a'});
    return new Response(JSON.stringify({ok:true,submissionId:'s',assetId:'a'}), {status:200});
  });
  assert.deepEqual(good, {ok:true});
});


test('uncertain registration and confirmation tell the learner to check before retrying', async () => {
  const lost = await uploadCourseworkFile(blobFile(5), { submissionId:'sub', fetchImpl:async () => { throw new Error('lost'); } });
  assert.equal(lost.ok, false);
  if (!lost.ok) assert.match(lost.message, /may have been registered/);
  const bad = await confirmCourseworkFile('a1', async () => new Response(JSON.stringify({ok:false,message:'The server could not confirm the result.'}), {status:500}));
  assert.equal(bad.ok, false);
  if (!bad.ok) assert.match(bad.message, /may already be attached/);
});


test('marked work still shows its files without making them editable', () => {
  const work = readFileSync(new URL('../app/learn/[enrolmentId]/assignment/[assignmentId]/assignment-work.tsx', import.meta.url), 'utf8');
  const files = work.indexOf('<AssignmentFiles');
  const textSectionEnd = work.indexOf('      <AssignmentFiles');
  const gradedStart = work.indexOf("{status !== 'graded' && (");
  assert.ok(files > gradedStart && textSectionEnd > gradedStart);
  assert.match(work.slice(gradedStart, textSectionEnd), /<\/>\s*\)\}/);
  assert.match(work, /const locked = status === 'submitted' \|\| status === 'graded'/);
});


test('learner assignment actions distinguish a confirmed write from an uncertain result', async () => {
  const id = '2b1c7a9e-0000-4000-8000-000000000001';
  const response = (body: unknown, status=200) => async () => new Response(JSON.stringify(body), {status});
  assert.deepEqual(await postLearnerAssignmentAction({action:'save_draft'}, response({ok:true,id})), {ok:true,id});
  assert.deepEqual(await postLearnerAssignmentAction({action:'submit'}, response({ok:true,id:null})), {ok:true});
  assert.deepEqual(await postLearnerAssignmentAction({action:'reopen'}, response({ok:true,revisionNumber:2})), {ok:true,revisionNumber:2});
  const checks: [Record<string, unknown>, typeof fetch][] = [
    [{action:'submit'}, async () => { throw new Error('reply lost'); }],
    [{action:'save_draft'}, response({ok:true,id:null})],
    [{action:'save_draft'}, response({ok:true,id:'not-a-uuid'})],
    [{action:'reopen'}, response({ok:true,revisionNumber:1})],
    [{action:'reopen'}, response({ok:true,revisionNumber:2.5})],
    [{action:'submit'}, response({ok:true}, 500)],
    [{action:'submit'}, async () => new Response('broken', {status:200})],
    [{action:'submit'}, response({ok:false,message:'A conflict occurred.'}, 409)],
  ];
  for (const [payload, fetcher] of checks) {
    const result = await postLearnerAssignmentAction(payload, fetcher);
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.message, /copy any unsaved text.*reload.*check/i);
  }
});

test('earlier file references are openable and a failed marker list is not empty', () => {
  const learner = readFileSync(new URL('../app/learn/[enrolmentId]/assignment/[assignmentId]/assignment-work.tsx', import.meta.url), 'utf8');
  const marker = readFileSync(new URL('../app/teach/[courseId]/assignments/assignment-manager.tsx', import.meta.url), 'utf8');
  const page = readFileSync(new URL('../app/teach/[courseId]/assignments/page.tsx', import.meta.url), 'utf8');
  const links = readFileSync(new URL('../components/revision-files.tsx', import.meta.url), 'utf8');
  assert.match(learner, /<RevisionFiles assetIds=\{version.assetIds\}/);
  assert.match(marker, /<RevisionFiles assetIds=\{version.assetIds\}/);
  assert.match(links, /courseworkFileHref\(id\)/);
  assert.match(links, /file may no longer be available/);
  assert.match(marker, /parseFirstCourseworkFilePage\(files\)/);
  assert.match(marker, /file list could not be checked/i);
  assert.match(page, /error \? null : data/);
  assert.doesNotMatch(page, /fetchAssignmentFileReferences/);
});


test('unfinished declarations do not use the attached-file limit', () => {
  const rows = parseCourseworkFiles([
    ...Array.from({ length: 12 }, (_, index) => ({ assetId: `pending-${index}`, attachmentId: null, status: 'pending' })),
    { assetId: 'attached', attachmentId: 'attachment', status: 'available' },
    { assetId: 'held', attachmentId: 'held-attachment', status: 'quarantined' },
    { assetId: 'unattached-held', attachmentId: null, status: 'quarantined' },
  ]);
  assert.equal(countAttachedCourseworkFiles(rows), 2);
  assert.equal(validateCourseworkFile(file(), countAttachedCourseworkFiles(rows)).ok, true);
  const page = readFileSync(new URL('../app/learn/[enrolmentId]/assignment/[assignmentId]/assignment-files.tsx', import.meta.url), 'utf8');
  assert.match(page, /filePage\?\.attachedCount/);
  assert.match(page, /attachedCount \?\? 0/);
});


test('resending uses the original pending asset and confirms only that asset', async () => {
  const { calls, puts, fetchImpl, putImpl } = harness({
    register: { ok: true, body: { ok: true, data: { assetId: 'a1', uploadUrl: 'https://storage.test/put', requiredHeaders: { 'if-none-match': '*' } } } },
    confirm: { ok: true, body: { ok: true, data: { assetId: 'a1', attachmentId: 'att-1' } } },
  });
  const result = await uploadCourseworkFile(blobFile(1024), { submissionId: 'sub-1', retryAssetId: 'a1', fetchImpl, putImpl });
  assert.equal(result.ok, true);
  assert.deepEqual(calls.map((c) => c.body.action), ['retry_coursework_upload', 'confirm_coursework_upload']);
  assert.equal(calls[0]?.body.assetId, 'a1');
  assert.equal(puts[0]?.headers['if-none-match'], '*');
});

test('a resend response naming another asset is refused before any PUT', async () => {
  const { puts, fetchImpl, putImpl } = harness({ register: { ok: true, body: { ok: true, data: { assetId: 'other', uploadUrl: 'https://storage.test/put' } } } });
  const result = await uploadCourseworkFile(blobFile(1024), { submissionId: 'sub-1', retryAssetId: 'a1', fetchImpl, putImpl });
  assert.equal(result.ok, false);
  assert.equal(puts.length, 0);
});


test('an uncertain resend does not silently confirm the pending file', async () => {
  const { calls, fetchImpl } = harness({ register: { ok: true, body: { ok: true, data: { assetId: 'a1', uploadUrl: 'https://storage.test/put', requiredHeaders: { 'if-none-match': '*' } } } } });
  const result = await uploadCourseworkFile(blobFile(1024), { submissionId: 'sub-1', retryAssetId: 'a1', fetchImpl, putImpl: async () => { throw new Error('Storage refused the upload'); } });
  assert.equal(result.ok, false);
  assert.deepEqual(calls.map((c) => c.body.action), ['retry_coursework_upload']);
  if (!result.ok) assert.match(result.message, /check the upload/);
});


test('bounded coursework pages reject malformed, incomplete and changing lists', () => {
  const id=(n:number)=>`2b1c7a9e-0000-4000-8000-${String(n).padStart(12,'0')}`;
  const entry=(n:number)=>({assetId:id(n),attachmentId:null,name:`Page ${n}`,mimeType:'image/png',byteSize:'42',status:'pending',uploadedAt:'2026-11-02T09:15:00Z'});
  const first={files:[entry(1),entry(2)],attachedCount:0,pendingCount:3,nextCursor:`1:0:${id(2)}`};
  const last={files:[entry(3)],attachedCount:0,pendingCount:3,nextCursor:null};
  const a=parseFirstCourseworkFilePage(first); const b=parseCourseworkFilePage(last);
  assert.ok(a && b);
  assert.equal(appendCourseworkFilePage(a,b)?.files.length,3);
  assert.equal(parseFirstCourseworkFilePage({...first,nextCursor:null}),null);
  assert.equal(parseCourseworkFilePage({...first,nextCursor:`1:0:${id(1)}`}),null);
  assert.equal(parseCourseworkFilePage({...first,nextCursor:'bad'}),null);
  assert.equal(parseCourseworkFilePage({...first,files:Array(26).fill(entry(1))}),null);
  assert.equal(appendCourseworkFilePage(a,{...b,pendingCount:4}),null);
  assert.equal(appendCourseworkFilePage(a,{...b,files:[a.files[0]!] }),null);
  assert.equal(appendCourseworkFilePage(a,{...b,files:[]}),null);
});
