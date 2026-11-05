/** Keep only the newest asynchronous request eligible to update a view.
 * Aborting is best-effort: `isCurrent` also handles clients that ignore signals.
 */
export class LatestRequest {
  private controller: AbortController | null = null;

  start(): { signal: AbortSignal; isCurrent: () => boolean } {
    this.cancel();
    const controller = new AbortController();
    this.controller = controller;
    return {
      signal: controller.signal,
      isCurrent: () => this.controller === controller && !controller.signal.aborted,
    };
  }

  cancel(): void {
    this.controller?.abort();
    this.controller = null;
  }
}
