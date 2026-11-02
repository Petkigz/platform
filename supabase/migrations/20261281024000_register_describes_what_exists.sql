-- Two switches that describe a platform that no longer exists.
--
-- This is the same defect class as `20261281022000`, where a refusal still said
-- the promotions policy was undecided three days after the owner decided it. A
-- register row is read as a description of the software, not as a note about the
-- month it was written — and the two below had drifted far enough to be false.
--
-- ONE. `platform.cost_controls` says **"Nothing exists."** That was true in
-- October. Since `20261229000100` a teacher's accumulation *is* metered: 50 GB of
-- master bytes per account (`media.upload_quota_gb_per_teacher`, admin-editable),
-- `media_upload_allowance()` answers whether one more upload fits, `my_media_storage()`
-- reports what an account already holds, `/api/media` refuses a `request_upload`
-- or `initiate_multipart` that would not fit and names the space left, and
-- `/admin/media` shows the allowance. Uploads in flight count from initiation, so
-- a stalled transfer cannot be used to slip past the ceiling.
--
--   What is still not built is the **spend alert** — and it cannot be built
--   honestly without a number the owner has not given. An alert needs a price per
--   gigabyte or a monthly budget in a currency, and inventing either would be the
--   platform deciding what the owner is willing to spend. So the row now says the
--   quota exists, the alert does not, and why not.
--
-- TWO. `platform.search` says the flag waits on an index over **lesson bodies**.
-- The index is the small half of that and it is not the reason the feature is
-- unbuilt: a lesson has a **title, a description and media**, and no body text at
-- all. The words of a lesson are inside a video, an audio file or a PDF; nothing
-- in this schema stores them as text, and nothing has ever decided that they
-- should be transcribed. So "search inside lessons" is really "search
-- transcripts", which is a content model — an owner's decision about whether
-- every lesson must carry a transcript, and whether the transcript of a paid
-- lesson may be matched for somebody who has not bought it. `learning.lesson_search`
-- already covers everything that *is* text (titles and descriptions), and it is
-- honest about only matching descriptions the caller may read.
--
--   The correction matters because the previous sentence invited the wrong work:
--   a session reading it would have built an FTS index over a column that does not
--   exist, found nothing to index, and either invented a body field to search or
--   quietly dropped the flag. Naming the missing decision is what stops that.

update public.platform_settings
   set preconditions =
        'The quota exists (2026-10-22, `20261229000100`): 50 GB of master bytes per account, '
        || 'editable at `media.upload_quota_gb_per_teacher`, checked at initiate and at multipart '
        || 'start by `media_upload_allowance()` — so a refused upload is refused before a byte '
        || 'moves, and names the space left. `my_media_storage()` reports what an account holds '
        || 'and `/admin/media` shows it; uploads in flight count from initiation. **What is not '
        || 'built is the spend alert**, and it needs a number only the owner can give: a price per '
        || 'gigabyte, or a monthly budget in a currency. Setting that threshold is what turning '
        || 'this on does; until then the ceiling is enforced without a warning at 80%.'
 where key = 'platform.cost_controls';

update public.platform_settings
   set preconditions =
        'Catalogue search is built and deliberately not gated (2026-10-22): `search_catalogue()` '
        || 'ranks the title, the subject, a public teacher''s name and the description, requires '
        || 'every word, and is security invoker so it shows only what the caller may read. '
        || '`learning.lesson_search` covers the rest of the text there is — lesson titles and '
        || 'descriptions, with a description matched only where the caller may study the lesson. '
        || '**What this flag was waiting for does not exist yet, and it is not an index:** a lesson '
        || 'has a title, a description and media, and no body text at all — the words of a lesson '
        || 'are inside a video, an audio file or a PDF. Searching them means transcribing them '
        || 'first, which is a content model nobody has decided: whether every lesson must carry a '
        || 'transcript, and whether the transcript of a lesson somebody has not bought may be '
        || 'matched. Both are the owner''s calls, and neither is code.'
 where key = 'platform.search';

-- The two rows are corrected, not reinterpreted: gate and value are untouched,
-- because nothing about who may switch them changed.
comment on column public.platform_settings.preconditions is
  'What must be true before a switch can be turned on, written as a description of the software as it is today. A precondition that names work already done is worse than none: it sends the next reader to rebuild something that exists.';
