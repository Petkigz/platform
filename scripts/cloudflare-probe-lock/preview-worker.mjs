// Copied into the isolated Next app after the OpenNext build, never into the
// production application. run_worker_first must be enabled for all requests.
import app from './.open-next/worker.js';
import { guardedPreview } from './preview-gate.mjs';
export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from './.open-next/worker.js';
export default guardedPreview(app);
