'use client';

/** The label is the server's, in the reader's language: this file carries no sentences. */
export function PrintCertificateButton({ label }: { label: string }) {
  return (
    <button type="button" className="btn no-print" onClick={() => window.print()}>
      {label}
    </button>
  );
}
