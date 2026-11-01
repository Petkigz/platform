/**
 * A presigned PUT with progress.
 *
 * `fetch` cannot report upload progress, and somebody on a slow connection
 * watching a file go up with no feedback would reasonably assume it had stalled
 * and close the tab. XMLHttpRequest can, so this is the one place it is worth the
 * older API.
 *
 * Shared rather than copied: the teacher's media library and a learner handing in
 * coursework both send one presigned PUT and both need the same progress, the same
 * refusal sentence, and the same timeout behaviour. Two copies would drift in the
 * one thing that matters — what the person is told when it fails.
 *
 * Client-only. Nothing on the server imports this, and nothing here touches
 * credentials: the URL is a signature that expires, minted by a route that has
 * already decided the caller may write this one key.
 */
export function putWithProgress(
  url: string,
  headers: Record<string, string>,
  body: Blob,
  onProgress: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('PUT', url);
    for (const [header, value] of Object.entries(headers)) {
      request.setRequestHeader(header, value);
    }
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) resolve();
      else
        reject(
          new Error(
            `Storage refused the upload (HTTP ${String(request.status)}). The file is still ` +
              'marked as not sent, so it can be tried again.',
          ),
        );
    };
    request.onerror = () =>
      reject(new Error('The upload could not reach storage. Check the connection and try again.'));
    request.ontimeout = () => reject(new Error('The upload timed out.'));
    request.send(body);
  });
}
