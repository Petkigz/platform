/** Mark a response carrying private data or a bearer URL as non-cacheable. */
export function privateNoStore<T extends Response>(response: T): T {
  response.headers.set('cache-control', 'private, no-store');
  return response;
}
